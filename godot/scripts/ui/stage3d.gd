# Set 206 (plan-set206 step 1 · user picks A2 B1 C1): the shared 3D arena under the prep and battle screens.
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

const PITCH := 32.0 # degrees the camera looks down (angle A)
const FOV := 34.0 # vertical field of view, degrees
const SPR_H := 1.7 # every unit stands this tall (world units)
const TILE := 1.8
const COL_X := [1.35, 3.35, 5.35] # row 0 front … 2 back: distance from the midline
const LANE_Z := [-1.25, 1.25] # lane 0 = far line (top of the screen), lane 1 = near line

signal moved # the camera changed: the screens put their cells on the new projected rects

var cam: Camera3D
var sun: DirectionalLight3D
var env_node: WorldEnvironment
var tiles := {} # "side:row:lane" → rim material (the rune rim shows idle / state colours)
var groups := {} # name → {id → {spr, shadow, ring, home}}
var shown := ""
var vp := Vector2(854, 480) # the app's size in canvas units (the camera covers the whole window)
var pose_prep := Transform3D()
var pose_battle := Transform3D()
var k := 0.0 # 0 = prep pose … 1 = battle pose
var built := false
var rim_idle := Color(0.36, 0.78, 0.84)
var _blob: Texture2D = blob_tex()

# ---------- pure helpers (tests call these) ----------
static func key(side: int, row: int, lane: int) -> String:
	return "%d:%d:%d" % [side, row, lane]

static func slot_pos(side: int, row: int, lane: int) -> Vector3:
	return Vector3((-1.0 if side == 0 else 1.0) * float(COL_X[row]), 0.0, float(LANE_Z[lane]))

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
	sky_mat.sky_top_color = Color("#2c3a5c") if dark else Color("#5f93c4")
	sky_mat.sky_horizon_color = Color("#6f7488") if dark else Color("#cfe1e8")
	sky_mat.ground_horizon_color = sky_mat.sky_horizon_color
	sky_mat.ground_bottom_color = Color("#2e3a28") if dark else Color("#6d8a4c")
	sky_mat.sun_angle_max = 0.0
	var sky := Sky.new()
	sky.sky_material = sky_mat
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.55 if dark else 0.8
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true # a little depth haze toward the back (art-look §1 item 4)
	env.fog_light_color = sky_mat.sky_horizon_color
	env.fog_density = 0.012
	env_node = WorldEnvironment.new()
	env_node.environment = env
	add_child(env_node)
	sun = DirectionalLight3D.new()
	sun.name = "Sun"
	sun.light_energy = 0.7 if dark else 1.15
	sun.light_color = Color("#c9d4ff") if dark else Color("#fff1d6")
	sun.shadow_enabled = true
	add_child(sun)
	sun.basis = Basis.looking_at(Vector3(0.55, -0.72, -0.42).normalized(), Vector3.UP)
	cam = Camera3D.new()
	cam.name = "Cam"
	cam.fov = FOV
	cam.keep_aspect = Camera3D.KEEP_HEIGHT
	cam.near = 0.3
	cam.far = 200.0
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

func _floor(dark: bool) -> void:
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
	var stone := _mat(Color("#6e675c") if dark else Color("#bdb2a0"))
	rim_idle = Color("#3f8f9c") if dark else Color("#5bbfcf")
	for s in 2:
		for row in 3:
			for lane in 2:
				var c := slot_pos(s, row, lane)
				var rm := _mat(rim_idle, 0.25)
				_box(Vector3(TILE + 0.14, 0.03, TILE + 0.14), c + Vector3(0, 0.015, 0), rm, "Rim" + key(s, row, lane).replace(":", "_"))
				_box(Vector3(TILE - 0.08, 0.05, TILE - 0.08), c + Vector3(0, 0.03, 0), stone, "Tile" + key(s, row, lane).replace(":", "_"))
				tiles[key(s, row, lane)] = rm
	_box(Vector3(0.08, 0.04, 5.2), Vector3(0, 0.02, 0), _mat(Color("#cfc3a8") if dark else Color("#efe6d0"), 0.1), "Mid")

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
	moved.emit()

func pose() -> Transform3D:
	return lerp_pose(pose_prep, pose_battle, k)

# the screen rect (app canvas space) of a slot at the current camera
func slot_rect(side: int, row: int, lane: int) -> Rect2:
	return rect_of(slot_points(side, row, lane), pose(), vp)

func on_screen(p: Vector3) -> Vector2:
	return project(p, pose(), vp)

# ---------- floor marks ----------
func tint(side: int, row: int, lane: int, col: Variant) -> void:
	var m: StandardMaterial3D = tiles.get(key(side, row, lane))
	if m == null:
		return
	var c: Color = col if col is Color else rim_idle
	m.albedo_color = c
	m.emission = c
	m.emission_energy_multiplier = 0.9 if col is Color else 0.25

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
	var vis := shown == group
	s.visible = vis
	sh.visible = vis
	if ring != null:
		ring.visible = vis
	groups[group][u["id"]] = {"spr": s, "shadow": sh, "ring": ring, "home": home, "side": side}

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
