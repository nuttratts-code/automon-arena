# Set 206 (plan-set206 step 1 · user picks A2 B1 C1): the shared 3D arena under the prep and battle screens.
# Set 215 (J2): the floor is now the Blender rune plaza scene (see _scene); the code floor below is its stand-in when it cannot load.
# Placeholder look made only from code (B1): sky gradient, grass, a round stone plaza, 12 slot tiles with a rune rim, a midline,
# one key light from the top-left (it matches the light painted into the sprites, art-style §2). Units are Sprite3D (A2):
# Nearest filter, alpha-cut Discard, unshaded, one height for every unit, the quad leaned back so it faces camera angle A,
# a soft blob shadow under the feet. The camera keeps one angle (C1) and only dollies: prep pose = your half fills the prep field,
# battle pose = both halves fill the battle field. The 2D cells (taps, drag/drop, stars, HP bars, numbers) are placed on the
# projected slot rects — project() is the same math as Camera3D (KEEP_HEIGHT, vertical fov) so headless tests need no renderer.
# Display only: nothing here reads or changes the run or a battle result.
extends Node3D

const TH := preload("res://scripts/ui/theme.gd")
const UV := preload("res://scripts/ui/unit_view.gd")
const SHAPE := preload("res://scripts/ui/shape.gd")

# SET 217 SAMPLE BRANCH (owner 13 Nov R8 → R13 "inside the plaza, closest to the FF Resonance ref"): camera 14° · units 2.0 · two staggered lines, evenly interleaved (far lane = half a column out).
# Was: PITCH 22 · SPR_H 1.7 · COL_X 1.35/3.35/5.35 · LANE_Z ±2.3 · far-lane shift 1.0 (art-style §8, set 216 R5) —
# changing them for real = rule-change at ทำจริง; tests that pin the old numbers are not updated on this branch.
const PITCH := 14.0 # degrees the camera looks down (angle A)
const FOV := 26.0 # vertical field of view, degrees
const SPR_H := 2.0 # every unit stands this tall (world units)
const TILE := 1.8
const COL_X := [1.8, 4.2, 6.6] # row 0 front … 2 back: distance from the midline
const LANE_Z := [-5.2, 3.2] # lane 0 = far line (top of the screen), lane 1 = near line
const FAR_SHIFT := 1.2 # the far lane stands this much further from the midline (staggered: nobody hides anybody)
const S217_CLEAN := true # set 217 sample: no rune rings / foot stars / tribe marks on the field (owner: "not used yet")
static var slot_override := {} # set 217: "side:row:lane" → feet position the owner set in arena_dressing_r6.tscn (Slots)

signal moved # the camera changed: the screens put their cells on the new projected rects

var cam: Camera3D
var sun: DirectionalLight3D
var env_node: WorldEnvironment
var rims := {} # set 212 (note 12 + C1): "side:row:lane" → rim mesh · hidden unless a state lights it or a drag is on
var lit := {} # keys whose rim a state lights now
var rims_drag := false
var tiles := {} # "side:row:lane" → rim material (the rune rim shows idle / state colours)
var groups := {} # name → {id → {spr, shadow, ring, home}}
var shown := ""
var vp := Vector2(854, 480) # the app's size in canvas units (the camera covers the whole window)
var pose_prep := Transform3D()
var pose_battle := Transform3D()
var k := 0.0 # 0 = prep pose … 1 = battle pose
var built := false
var foe_tiles: Array = [] # set 207 P1: [mesh, rest y] of the enemy half's rims + tiles
const FOE_SINK := 0.3
var rim_idle := Color(0.36, 0.78, 0.84)
var _blob: Texture2D = blob_tex()

# ---------- pure helpers (tests call these) ----------
static func key(side: int, row: int, lane: int) -> String:
	return "%d:%d:%d" % [side, row, lane]

static func slot_pos(side: int, row: int, lane: int) -> Vector3:
	var o: Variant = slot_override.get(key(side, row, lane))
	if o is Vector3:
		return o
	return Vector3((-1.0 if side == 0 else 1.0) * (float(COL_X[row]) + (FAR_SHIFT if lane == 0 else 0.0)), 0.0, float(LANE_Z[lane]))

static func cam_basis() -> Basis:
	return Basis.from_euler(Vector3(deg_to_rad(-PITCH), 0.0, 0.0))

static func lean() -> Vector3: # a sprite's up direction: leaned back so the quad faces the camera
	var p := deg_to_rad(PITCH)
	return Vector3(0.0, cos(p), -sin(p))

static func project(p: Vector3, xf: Transform3D, size: Vector2) -> Vector2:
	var q := xf.affine_inverse() * p
	var z := maxf(0.001, -q.z)
	var f := 1.0 / tan(deg_to_rad(FOV) / 2.0)
	var x := q.x / z * f / (size.x / maxf(1.0, size.y))
	var y := q.y / z * f
	return Vector2((x + 1.0) / 2.0 * size.x, (1.0 - y) / 2.0 * size.y)

# the tile corners + the head of a unit standing on it: the rect that holds both on screen
static func slot_points(side: int, row: int, lane: int) -> Array:
	var c := slot_pos(side, row, lane)
	var h := TILE / 2.0
	var top := c + lean() * SPR_H
	return [c + Vector3(-h, 0, -h), c + Vector3(h, 0, -h), c + Vector3(-h, 0, h), c + Vector3(h, 0, h),
		top + Vector3(-h * 0.8, 0, 0), top + Vector3(h * 0.8, 0, 0)]

static func side_points(sides: Array) -> Array:
	var out := []
	for s in sides:
		for row in 3:
			for lane in 2:
				out.append_array(slot_points(s, row, lane))
	return out

static func rect_of(points: Array, xf: Transform3D, size: Vector2) -> Rect2:
	var r := Rect2(project(points[0], xf, size), Vector2.ZERO)
	for p in points:
		r = r.expand(project(p, xf, size))
	return r

# a camera with the fixed angle placed so the points just fit inside target (centred): dolly + slide, no turning
static func fit_pose(points: Array, target: Rect2, size: Vector2) -> Transform3D:
	var b := cam_basis()
	var fwd := -b.z
	var c := Vector3.ZERO
	for p in points:
		c += p
	c /= float(points.size())
	var pos := c - fwd * 20.0
	if target.size.x < 4.0 or target.size.y < 4.0 or size.x < 4.0 or size.y < 4.0:
		return Transform3D(b, pos)
	for i in 48:
		var r := rect_of(points, Transform3D(b, pos), size)
		var d := (c - pos).dot(fwd)
		var wpp := 2.0 * d * tan(deg_to_rad(FOV) / 2.0) / size.y # world units per screen px at the centre's depth
		var dc := target.get_center() - r.get_center()
		pos += b.x * (-dc.x * wpp) + b.y * (dc.y * wpp)
		var s := maxf(r.size.x / target.size.x, r.size.y / target.size.y)
		pos += fwd * (d - d * s)
	return Transform3D(b, pos)

static func lerp_pose(a: Transform3D, b: Transform3D, t: float) -> Transform3D:
	return Transform3D(a.basis, a.origin.lerp(b.origin, t))

# ---------- build ----------
func build() -> void:
	if built:
		return
	built = true
	name = "Stage"
	var dark := TH.dark
	var env := Environment.new()
	var sky_mat := ProceduralSkyMaterial.new()
	# set 215 (J2): day colours from the Blender scene's world ramp (art/scene/runeplaza-v5.blend); dark theme = dusk (owner C1)
	sky_mat.sky_top_color = Color("#232a55") if dark else Color("#3a6fc4")
	sky_mat.sky_horizon_color = Color("#8a6f8c") if dark else Color("#bcd0e6")
	sky_mat.ground_horizon_color = sky_mat.sky_horizon_color
	sky_mat.ground_bottom_color = Color("#2b3326") if dark else Color("#6d8a4c")
	sky_mat.sun_angle_max = 0.0
	var sky := Sky.new()
	sky.sky_material = sky_mat
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	# set 214 (find-cause): with AMBIENT_SOURCE_SKY, ambient_light_energy changed nothing (measured) — the sky alone sets
	# the ambient, so the old 0.55 / 0.8 knob is gone; ambient_light_sky_contribution is the real one (1.0 = default).
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	# a little depth haze toward the back only (art-look §1 item 4). Set 214: the old exponential fog (density 0.012) is
	# counted from the camera, which sits 20–36 units away, so the board itself got ~30 % near-white haze. Depth mode
	# starts the haze behind the board (the farthest slot is < 30 units away in both poses).
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_DEPTH
	env.fog_light_color = sky_mat.sky_horizon_color
	env.fog_depth_begin = 34.0
	env.fog_depth_end = 110.0
	env.fog_density = 0.6 # depth mode: the most haze reached at fog_depth_end
	env_node = WorldEnvironment.new()
	env_node.environment = env
	add_child(env_node)
	sun = DirectionalLight3D.new()
	sun.name = "Sun"
	sun.light_energy = 0.75 if dark else 1.15
	sun.light_color = Color("#ffb98a") if dark else Color("#fff1d6") # dusk: a low warm sun
	# set 214 (find-cause): in the gl_compatibility renderer a shadowed sun is drawn in an extra pass that is added in
	# sRGB space, not linear (measured: the added light matches sRGB addition to the unit) → 3–5× too bright, the plaza
	# went pure white. Glow / HDR 2D did not change it. Units keep their blob shadow, so the sun casts no shadow.
	sun.shadow_enabled = false
	add_child(sun)
	sun.basis = Basis.looking_at(Vector3(0.55, -0.72, -0.42).normalized(), Vector3.UP)
	cam = Camera3D.new()
	cam.name = "Cam"
	cam.fov = FOV
	cam.keep_aspect = Camera3D.KEEP_HEIGHT
	cam.near = 0.3
	cam.far = 2600.0 # set 215: the far hills of the rune plaza scene reach ~2,200 units
	add_child(cam)
	cam.transform = Transform3D(cam_basis(), Vector3(0, 9, 14))
	_floor(dark)

func _mat(col: Color, glow: float = 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = 1.0
	if glow > 0.0:
		m.emission_enabled = true
		m.emission = col
		m.emission_energy_multiplier = glow
	return m

func _box(sz: Vector3, at: Vector3, m: Material, nm: String = "") -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = sz
	mi.mesh = bm
	mi.material_override = m
	mi.position = at
	if nm != "":
		mi.name = nm
	add_child(mi)
	return mi

# set 215 (J2, owner A2 + B1): the rune plaza scene made in Blender (art/blender/export_godot.py → art/arena/runeplaza.glb +
# plaza.png). Its meshes carry their colour as vertex colours; the code gives each part its material here. When the scene
# cannot load (a headless run on a fresh checkout without the import step) the old code floor stands in — same slots.
const SCENE := "res://art/arena/runeplaza.glb"
const PLAZA_TEX := "res://art/arena/plaza.png"
const RING_R := 0.84 # rune ring around a slot (outer radius, world) — the tile is TILE wide
const RING_W := 0.09
var scene_loaded := false

func _floor(dark: bool) -> void:
	scene_loaded = _scene(dark)
	if not scene_loaded:
		_code_floor(dark)
	rim_idle = Color("#4fd0ff") if dark else Color("#5bd3e6")
	for s in 2:
		for row in 3:
			for lane in 2:
				var c := slot_pos(s, row, lane)
				var rk := key(s, row, lane)
				# the carved rune ring that always shows (owner B1: round rings like the target picture)
				var t1 := _ring(RING_R, RING_W, c + Vector3(0, 0.04, 0), _mat(rim_idle.darkened(0.25), 0.55 if dark else 0.35), "Tile" + rk.replace(":", "_"))
				# the lit ring: shows while dragging or when a state lights the slot (tint)
				var rm := _mat(rim_idle, 0.25)
				var r1 := _ring(RING_R + 0.05, RING_W * 2.0, c + Vector3(0, 0.05, 0), rm, "Rim" + rk.replace(":", "_"))
				tiles[rk] = rm
				rims[rk] = r1
				r1.set_meta("key", rk)
				r1.visible = false
				if s == 1:
					foe_tiles.append([r1, r1.position.y])
					foe_tiles.append([t1, t1.position.y])
	if not scene_loaded: # the scene's plaza picture has its own midline
		_box(Vector3(0.08, 0.04, 5.2), Vector3(0, 0.02, 0), _mat(Color("#cfc3a8") if dark else Color("#efe6d0"), 0.1), "Mid")

func _ring(r: float, w: float, at: Vector3, m: Material, nm: String) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = r - w
	tm.outer_radius = r
	tm.rings = 48
	tm.ring_segments = 6
	mi.mesh = tm
	mi.material_override = m
	mi.scale = Vector3(1, 0.12, 1) # flat, lying in the stone
	mi.position = at
	mi.name = nm
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if S217_CLEAN:
		mi.layers = 0 # no camera draws layer 0 (visible = false would be undone by _foe_rise)
	add_child(mi)
	return mi

func _scene(dark: bool) -> bool:
	if not ResourceLoader.exists(SCENE):
		return false
	var ps: Variant = ResourceLoader.load(SCENE)
	if not (ps is PackedScene):
		return false
	var root: Node3D = (ps as PackedScene).instantiate()
	root.name = "Plaza3D"
	add_child(root)
	root.visible = false # set 217 sample: the owner's Hunyuan3D plaza (arena_dressing_r6.tscn) replaces this one
	var vc := func(rough: float) -> StandardMaterial3D:
		var m := StandardMaterial3D.new()
		m.vertex_color_use_as_albedo = true
		m.roughness = rough
		return m
	var mats := {
		"Near": vc.call(1.0).duplicate(), "Far": vc.call(1.0), "Flowers": vc.call(1.0), "Rocks": vc.call(0.95),
		"Arch": vc.call(0.95), "Woods": vc.call(1.0),
	}
	mats["Near"].albedo_color = Color(1.35, 1.45, 1.0) if not dark else Color(0.9, 0.9, 1.0)
	var rune := StandardMaterial3D.new() # the carved runes on the standing stones glow (art-look §1 item 3: bright accents)
	rune.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	rune.albedo_color = Color("#8fe8ff")
	rune.emission_enabled = true
	rune.emission = Color("#5fd6ff")
	rune.emission_energy_multiplier = 2.2 if dark else 1.2
	mats["Runes"] = rune
	var plaza := StandardMaterial3D.new()
	var tex: Variant = ResourceLoader.load(PLAZA_TEX) if ResourceLoader.exists(PLAZA_TEX) else null
	if tex is Texture2D:
		plaza.albedo_texture = tex
	plaza.albedo_color = Color(0.8, 0.8, 0.78) if not dark else Color(0.62, 0.6, 0.66) # the picture is drawn unlit: tone it down under the sun + sky light
	plaza.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
	plaza.alpha_scissor_threshold = 0.5
	plaza.roughness = 1.0
	mats["Plaza"] = plaza
	for mi in root.find_children("*", "MeshInstance3D", true, false):
		var m: Variant = mats.get(String(mi.name))
		if m == null:
			m = mats.get(String(mi.get_parent().name)) # some importers wrap a mesh in a node of the object's name
		if m != null:
			mi.material_override = m
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF # set 214: no shadowed sun in Compatibility
		var nm := String(mi.name) + "|" + String(mi.get_parent().name)
		for hide in ["Far", "Rocks", "Arch", "Woods", "Runes", "Flowers"]:
			if nm.begins_with(hide) or nm.contains("|" + hide):
				mi.visible = false
	_cards(dark)
	return true

func _card(file: String, at: Vector3, h: float, flip: bool = false, tint: Color = Color.WHITE, upright: bool = true) -> Sprite3D:
	var t: Variant = load("res://art/s217/" + file + ".png")
	var sp := Sprite3D.new()
	sp.texture = t
	sp.pixel_size = h / float((t as Texture2D).get_height())
	sp.centered = true
	sp.offset = Vector2(0, (t as Texture2D).get_height() / 2.0)
	sp.billboard = BaseMaterial3D.BILLBOARD_FIXED_Y if upright else BaseMaterial3D.BILLBOARD_DISABLED
	sp.alpha_cut = SpriteBase3D.ALPHA_CUT_OPAQUE_PREPASS
	sp.shaded = false
	sp.flip_h = flip
	sp.modulate = tint
	sp.position = at
	sp.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	add_child(sp)
	return sp

func _cards(dark: bool) -> void:
	# set 217 sample: the owner places things in scenes/arena_dressing_r6.tscn (Godot editor); Guides + GameCam + Slots are editor-only
	var path := "res://scenes/arena_dressing_r6.tscn" # set 217 baseline (owner 13 Nov: R13/R14 = the base to tune from; older scenes removed)
	var ps: Variant = load(path) if ResourceLoader.exists(path) else null
	if not (ps is PackedScene):
		return
	var d: Node3D = (ps as PackedScene).instantiate()
	var slots := d.get_node_or_null("Slots") # set 217: the owner moves the 12 slot markers in the editor → units stand there
	if slots != null:
		slot_override.clear()
		for m in slots.get_children():
			var nm := String(m.name) # "Slot<side>_<row>_<lane>"
			var p := nm.trim_prefix("Slot").split("_")
			if m is Node3D and p.size() == 3:
				slot_override[key(int(p[0]), int(p[1]), int(p[2]))] = Vector3((m as Node3D).position.x, 0.0, (m as Node3D).position.z)
	for nm in ["Guides", "GameCam", "Slots"]:
		var n := d.get_node_or_null(nm)
		if n != null:
			d.remove_child(n)
			n.free()
	if dark:
		for sp in d.find_children("*", "Sprite3D", true, false):
			sp.modulate = sp.modulate * Color(0.62, 0.58, 0.72)
	add_child(d)
	if S217_CLEAN: # after the scene is in the tree: global transforms work and the plaza tint script has run
		d.ready.connect(func() -> void:
			_s217_pixel_tex(d)
			_s217_stone_shadows(d), CONNECT_ONE_SHOT)

# ---- set 217 sample R19 (owner L2 + L3), HD-2D tricks on the owner's dressing scene ----
var _px_cache := {}

func _s217_pixel_tex(d: Node) -> void:
	# L3: HD-2D sets are pixel-art textures on 3D shapes, point-sampled. Ours are smooth AI paintings → shrink each
	# albedo to about the sprites' pixel density and sample it Nearest, so the stones / plaza / ground read as pixel art.
	for mi in d.find_children("*", "MeshInstance3D", true, false):
		var m: MeshInstance3D = mi
		var mat: Material = m.material_override if m.material_override != null else (m.mesh.surface_get_material(0) if m.mesh != null and m.mesh.get_surface_count() > 0 else null)
		if mat is StandardMaterial3D:
			if (m.global_transform * m.get_aabb()).size.x > 10.0:
				continue # R21 owner: the floor stays sharp (full texture, smooth sampling) — only the props get pixel textures
			var sm := (mat as StandardMaterial3D).duplicate() as StandardMaterial3D
			var t := _px_small(sm.albedo_texture, 128)
			if t != null:
				sm.albedo_texture = t
				sm.normal_enabled = false # the 1024 normal map would bring the smooth detail back
			sm.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
			m.material_override = sm
		# R21 owner: the ground shader keeps its full tile texture (was shrunk to 64 px in R19/R20)

func _px_small(t: Texture2D, size: int) -> Texture2D:
	if t == null:
		return null
	if _px_cache.has(t):
		return _px_cache[t]
	var img := t.get_image()
	if img == null:
		return null
	if img.is_compressed():
		img.decompress()
	img.resize(size, size, Image.INTERPOLATE_LANCZOS)
	var out := ImageTexture.create_from_image(img)
	_px_cache[t] = out
	return out

func _s217_stone_shadows(d: Node) -> void:
	# L2: the shadowed sun is broken in gl_compatibility (set 214 find-cause: 3–5× too bright), so every stone / rock /
	# slab gets a soft shadow card on the ground, stretched away from the sun (HD-2D games anchor props the same way).
	var near := d.get_node_or_null("Near")
	if near == null:
		return
	var sun_dir := Vector3(0.55, -0.72, -0.42).normalized()
	var flat := Vector2(sun_dir.x, sun_dir.z).normalized()
	var reach := Vector2(sun_dir.x, sun_dir.z).length() / -sun_dir.y # shadow length per unit of height
	var gt := GradientTexture2D.new()
	gt.fill = GradientTexture2D.FILL_RADIAL
	gt.fill_from = Vector2(0.5, 0.5)
	gt.fill_to = Vector2(0.5, 0.0)
	var gr := Gradient.new()
	gr.set_color(0, Color(0, 0, 0, 0.42))
	gr.set_color(1, Color(0, 0, 0, 0))
	gt.gradient = gr
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = gt
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.render_priority = -1
	for n in near.get_children():
		var nm := String(n.name)
		if not (n is Node3D) or not (nm.begins_with("Stone") or nm.begins_with("Rock") or nm.begins_with("Fallen")):
			continue
		var box := AABB()
		var first := true
		for mi in (n as Node3D).find_children("*", "MeshInstance3D", true, false):
			var b: AABB = (mi as MeshInstance3D).global_transform * (mi as MeshInstance3D).get_aabb()
			box = b if first else box.merge(b)
			first = false
		if first:
			continue
		var h := box.size.y
		var w := maxf(box.size.x, box.size.z)
		var base := Vector2(box.get_center().x, box.get_center().z)
		var lenv := maxf(w, h * reach)
		var c := base + flat * (lenv * 0.5 - w * 0.25)
		var on_plaza := c.length() < 12.4
		var q := MeshInstance3D.new()
		q.name = "Shadow" + nm
		var pm := PlaneMesh.new()
		pm.size = Vector2(w * 1.1, lenv + w * 0.5)
		q.mesh = pm
		q.material_override = mat
		q.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		q.position = Vector3(c.x, 0.02 if on_plaza else -0.13, c.y)
		q.rotation.y = atan2(flat.x, flat.y)
		d.add_child(q)

func _code_floor(dark: bool) -> void:
	var ground := MeshInstance3D.new()
	ground.name = "Ground"
	var pm := PlaneMesh.new()
	pm.size = Vector2(160, 160)
	ground.mesh = pm
	ground.material_override = _mat(Color("#3b4a2f") if dark else Color("#6f8f4e"))
	ground.position = Vector3(0, -0.06, 0)
	add_child(ground)
	var plaza := MeshInstance3D.new()
	plaza.name = "Plaza"
	var cy := CylinderMesh.new()
	cy.top_radius = 8.8
	cy.bottom_radius = 9.0
	cy.height = 0.1
	cy.radial_segments = 48
	plaza.mesh = cy
	plaza.material_override = _mat(Color("#5d574e") if dark else Color("#a59a88"))
	plaza.position = Vector3(0, -0.05, 0)
	add_child(plaza)

func _ready() -> void:
	if cam != null:
		cam.make_current()

# ---------- camera ----------
# fit both poses: prep_target / battle_target = where the board must sit on screen (canvas rects, app space)
func refit(size: Vector2, prep_target: Variant, battle_target: Variant) -> void:
	if size.x < 4.0 or size.y < 4.0:
		return
	vp = size
	if prep_target is Rect2:
		pose_prep = fit_pose(side_points([0]), prep_target, size)
	if battle_target is Rect2:
		pose_battle = fit_pose(side_points([0, 1]), battle_target, size)
	set_k(k)

func set_k(v: float) -> void:
	k = clampf(v, 0.0, 1.0)
	if cam != null:
		cam.transform = lerp_pose(pose_prep, pose_battle, k)
	_foe_rise()
	moved.emit()

# set 207 P1: the prep pose shows only your half — the enemy tiles sit sunk under the plaza and rise in with the dolly
static func foe_rise_of(v: float) -> float: # 0 = hidden under the plaza … 1 = in place (reached halfway through the move)
	return clampf(v / 0.5, 0.0, 1.0)

func _foe_rise() -> void:
	var r := foe_rise_of(k)
	for it in foe_tiles:
		var m: MeshInstance3D = it[0]
		m.visible = r > 0.0 and (not m.name.begins_with("Rim") or _rim_on(m))
		m.position.y = float(it[1]) - FOE_SINK * (1.0 - r)

func pose() -> Transform3D:
	return lerp_pose(pose_prep, pose_battle, k)

# the screen rect (app canvas space) of a slot at the current camera — trimmed to 84 % of its width so the labels
# of neighbouring tiles keep a gap (the fit still uses the full points)
func slot_rect(side: int, row: int, lane: int) -> Rect2:
	var r := rect_of(slot_points(side, row, lane), pose(), vp)
	return r.grow_individual(-r.size.x * 0.08, 0.0, -r.size.x * 0.08, 0.0)

func on_screen(p: Vector3) -> Vector2:
	return project(p, pose(), vp)

# ---------- floor marks ----------
func tint(side: int, row: int, lane: int, col: Variant) -> void:
	var m: StandardMaterial3D = tiles.get(key(side, row, lane))
	if m == null:
		return
	var rk := key(side, row, lane)
	if col is Color:
		lit[rk] = true
	else:
		lit.erase(rk)
	_rim_show(rk)
	var c: Color = col if col is Color else rim_idle
	m.albedo_color = c
	m.emission = c
	m.emission_energy_multiplier = 0.9 if col is Color else 0.25

# own-side rims show while a unit is dragged (prep.drag_started / drag_ended); a lit rim always shows
func show_rims(on: bool) -> void:
	rims_drag = on
	for rk in rims:
		_rim_show(rk)

func _rim_on(m: MeshInstance3D) -> bool:
	var rk := str(m.get_meta("key", ""))
	return lit.has(rk) or (rims_drag and rk.begins_with("0:"))

func _rim_show(rk: String) -> void:
	var m: MeshInstance3D = rims.get(rk)
	if m == null:
		return
	m.set_meta("key", rk)
	var on := _rim_on(m)
	if rk.begins_with("1:"):
		on = on and foe_rise_of(k) > 0.0
	m.visible = on

# ---------- units ----------
static func blob_tex() -> Texture2D:
	var g := Gradient.new()
	g.set_color(0, Color(0, 0, 0, 0.42))
	g.set_color(1, Color(0, 0, 0, 0))
	var t := GradientTexture2D.new()
	t.gradient = g
	t.fill = GradientTexture2D.FILL_RADIAL
	t.fill_from = Vector2(0.5, 0.5)
	t.fill_to = Vector2(1.0, 0.5)
	t.width = 32
	t.height = 32
	return t

static func shape_tex(col: Color) -> Texture2D: # no sprite for an id → a plain tribe-coloured block (placeholder)
	var img := Image.create(16, 16, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	img.fill_rect(Rect2i(3, 2, 10, 13), col)
	return ImageTexture.create_from_image(img)

# units: [{id, side, row, lane, c (character dict), big (bool, boss), at (Vector3 feet, optional)}] — rebuilds that group
func set_units(group: String, units: Array) -> void:
	for id in (groups.get(group, {}) as Dictionary).keys():
		remove_unit(group, id)
	groups[group] = {}
	for u in units:
		add_unit(group, u)

func remove_unit(group: String, id: Variant) -> void:
	var g: Dictionary = groups.get(group, {})
	var v: Variant = g.get(id)
	if v == null:
		return
	for n in ["spr", "shadow", "ring"]:
		if v.get(n) != null and is_instance_valid(v[n]):
			v[n].queue_free()
	g.erase(id)

func add_unit(group: String, u: Dictionary) -> void:
	if not groups.has(group):
		groups[group] = {}
	remove_unit(group, u["id"])
	var c: Dictionary = u["c"]
	var side := int(u["side"])
	var big: bool = u.get("big", false) == true
	var feet := slot_pos(side, int(u["row"]), int(u["lane"]))
	if u.get("at") is Vector3:
		feet = u["at"]
	var tall := SPR_H * (1.5 if big else 1.0)
	var tex := TH.art("unit", str(c.get("id")))
	if tex == null:
		var sp: Array = TH.TRIBE_SHAPE.get(c.get("tribe"), ["square", "mute"])
		tex = shape_tex(TH.c(sp[1]))
	var s := Sprite3D.new()
	s.name = "U%s" % str(u["id"])
	s.texture = tex
	s.pixel_size = tall / float(maxi(1, tex.get_height()))
	s.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	s.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
	s.shaded = false
	s.double_sided = true
	s.flip_h = side == 1 # the sprites face right (art-style §2): the enemy turns to face you
	s.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	s.rotation = Vector3(deg_to_rad(-PITCH), 0, 0)
	var home := feet + lean() * (tall / 2.0) + Vector3(0, 0.05, 0)
	s.position = home
	add_child(s)
	var sh := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(TILE * 0.8, TILE * 0.45) * (1.4 if big else 1.0)
	sh.mesh = pm
	var sm := StandardMaterial3D.new()
	sm.albedo_texture = _blob
	sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	sh.material_override = sm
	sh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	sh.position = feet + Vector3(0, 0.065, 0)
	add_child(sh)
	var ring: MeshInstance3D = null
	var rt := UV.rarity_token(c)
	if rt != "": # rarity = a thin coloured ring on the tile around the feet (it was a 2D ring before set 206)
		ring = MeshInstance3D.new()
		var tm := TorusMesh.new()
		tm.inner_radius = 0.62
		tm.outer_radius = 0.7
		ring.mesh = tm
		ring.material_override = _mat(TH.c(rt), 0.6)
		ring.scale = Vector3(1, 0.15, 0.62) * (1.4 if big else 1.0)
		ring.position = feet + Vector3(0, 0.07, 0)
		ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(ring)
	if u.has("level") and not big: # set 212 (notes 14/16/18): tribe shape + stars at the feet, children of the sprite (depth-tested)
		foot_marks(s, c, int(u["level"]), tall)
	var vis := shown == group
	s.visible = vis
	sh.visible = vis
	if ring != null:
		ring.visible = vis
	groups[group][u["id"]] = {"spr": s, "shadow": sh, "ring": ring, "home": home, "side": side}

# set 212 foot marks (prep units pass "level"; battle units do not — they show HP bars): tribe shape (main tribe, dark outline)
# then gold stars, centred under the sprite at its feet. They are children of the sprite and depth-tested, so a unit standing
# in front hides them like it hides the unit (owner: "ของใครของมัน"). Shape side = the star glyph's height.
const FOOT_PX := 0.0058 # world size of one font pixel of the stars
const MARK := 0.34 # tribe shape side (world)
const FOOT_DY := 0.05 # shape 5 % lower to sit level with the star centres
const FOOT_Y := 0.14 # mark row above the sprite's bottom edge
const FOOT_FS := 64
const FOOT_GAP := 0.06

static func in_shape(kind: String, x: float, y: float) -> bool: # x, y in 0..1 (same shapes as shape.gd)
	if kind == "circle":
		return Vector2(x - 0.5, y - 0.5).length() <= 0.5
	if not SHAPE.POLY.has(kind):
		return x >= 0.06 and x <= 0.94 and y >= 0.06 and y <= 0.94
	var poly: Array = SHAPE.POLY[kind]
	var inside := false
	var j := poly.size() - 1
	for i in poly.size():
		var a: Array = poly[i]
		var b: Array = poly[j]
		if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
			inside = not inside
		j = i
	return inside

static var _marks := {} # "kind:colour" → texture (made once)
static func shape_mark(kind: String, col: Color, n: int = 16) -> Texture2D: # tribe shape with a 2 px dark outline
	var id := kind + ":" + col.to_html()
	if _marks.has(id):
		return _marks[id]
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var dark := Color(0.05, 0.05, 0.08, 0.95)
	var ins := 2.0 / float(n)
	for py in n:
		for px in n:
			var x := (float(px) + 0.5) / float(n)
			var y := (float(py) + 0.5) / float(n)
			if in_shape(kind, x, y):
				var inner := in_shape(kind, 0.5 + (x - 0.5) / (1.0 - 2.0 * ins), 0.5 + (y - 0.5) / (1.0 - 2.0 * ins))
				img.set_pixel(px, py, col if inner else dark)
	var t := ImageTexture.create_from_image(img)
	_marks[id] = t
	return t

func foot_marks(s: Sprite3D, c: Dictionary, level: int, tall: float) -> void:
	var sp: Array = TH.TRIBE_SHAPE.get(c.get("tribe"), ["square", "mute"])
	var n := maxi(1, level)
	var star := Label3D.new()
	star.name = "FootStars"
	star.text = "★".repeat(n)
	star.font = TH.font("body")
	star.font_size = FOOT_FS
	star.outline_size = 14
	star.modulate = UV.STAR
	star.outline_modulate = Color(0.05, 0.04, 0.02, 0.95)
	star.pixel_size = FOOT_PX
	star.shaded = false
	star.double_sided = true
	star.alpha_cut = Label3D.ALPHA_CUT_DISCARD
	star.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR
	star.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	var shp := Sprite3D.new()
	shp.name = "FootTribe"
	shp.texture = shape_mark(sp[0], TH.c(sp[1]))
	shp.pixel_size = MARK / 16.0
	shp.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	shp.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
	shp.shaded = false
	shp.double_sided = true
	star.visible = not S217_CLEAN
	shp.visible = not S217_CLEAN
	var star_w := float(FOOT_FS) * 0.82 * float(n) * FOOT_PX
	var total := MARK + FOOT_GAP + star_w
	var y := -tall / 2.0 + FOOT_Y
	shp.position = Vector3(-total / 2.0 + MARK / 2.0, y - MARK * FOOT_DY, 0.04)
	star.position = Vector3(-total / 2.0 + MARK + FOOT_GAP, y, 0.04)
	s.add_child(shp)
	s.add_child(star)

func show_group(group: String) -> void:
	shown = group
	for gn in groups:
		for v in groups[gn].values():
			for n in ["spr", "shadow", "ring"]:
				if v.get(n) != null and is_instance_valid(v[n]):
					v[n].visible = gn == group

func unit(group: String, id: Variant) -> Variant:
	return groups.get(group, {}).get(id)

func count(group: String) -> int:
	return (groups.get(group, {}) as Dictionary).size()

func set_down(group: String, id: Variant, down: bool) -> void:
	var v: Variant = unit(group, id)
	if v == null:
		return
	# alpha-cut sprites vanish below half alpha: a fallen unit is darkened instead of faded
	v["spr"].modulate = Color(0.32, 0.32, 0.36) if down else Color.WHITE
	v["shadow"].visible = not down and shown == group

func shade(group: String, id: Variant, dim: bool) -> void: # tribe highlight: the other units step back
	var v: Variant = unit(group, id)
	if v != null:
		v["spr"].modulate = Color(0.45, 0.45, 0.5) if dim else Color.WHITE

# a short step toward the target and back (the 2D card lunges with it)
func lunge(group: String, id: Variant, to_id: Variant, sec: float) -> void:
	var v: Variant = unit(group, id)
	if v == null or not is_inside_tree():
		return
	var s: Sprite3D = v["spr"]
	var dir := Vector3(0.45 if int(v["side"]) == 0 else -0.45, 0, 0)
	var t: Variant = unit(group, to_id)
	if t != null:
		var d: Vector3 = t["home"] - v["home"]
		if d.length() > 0.1:
			dir = d.normalized() * 0.45
	var tw := s.create_tween()
	tw.tween_property(s, "position", v["home"] + dir, sec * 0.4)
	tw.tween_property(s, "position", v["home"], sec * 0.6)

func flash(group: String, id: Variant) -> void: # a skill fired
	var v: Variant = unit(group, id)
	if v == null or not is_inside_tree():
		return
	var s: Sprite3D = v["spr"]
	if s.modulate != Color.WHITE:
		return
	var tw := s.create_tween()
	tw.tween_property(s, "modulate", Color(1.6, 1.6, 1.3), 0.08)
	tw.tween_property(s, "modulate", Color.WHITE, 0.25)
