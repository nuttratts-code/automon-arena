extends SceneTree
# SET 217 SAMPLE ONLY (ui-preview R6, branch ccr-882ceb4b-0ewtk1 — never merge to main as is).
# Builds scenes/arena_dressing_r6.tscn from the owner's v3 pieces (asset-prompts.md §6, 13 Nov):
#   4 Sky = sky_clouds.png · 3 Hills = far_hills_v3.png (both fitted to the live camera by scripts/ui/s217_far_fit.gd)
#   2 Ground = ground_tile.png tiled + grass cards · 1 Plaza = plaza_hy.glb (owner's Hunyuan3D plaza, 50k) + stones:
#   hero rune stone (full1k) · light bake copies turned/scaled · fallen slab = stone_fallen_hy.glb (owner's, 3k bake).
# The old plaza model (runeplaza.glb) is hidden in the sample copy (claude/preview-set217/r6-patch.py).
#   godot --headless --path godot -s res://tools/s217_make_r6.gd

const ST := preload("res://scripts/ui/stage3d.gd")
const PLAZA_K := 1.35 # R13: plaza ×1.35 so the deeper lanes (−5.2 / 3.2) stay well inside the stone
const GAME_CAM := "Transform3D(1, 0, 0, 0, 0.9702957, 0.2419219, 0, -0.2419219, 0.9702957, 0, 6.106494, 18.876345)" # battle camera R13: 14°, units 2.0
const PLAZA_TONE := Color(0.7, 0.67, 0.58) # R15 (owner C1) darker + warmer than R6's 0.74 grey; R16 = the mid tone (B)
const GROUND_SHADER := """
shader_type spatial;
render_mode specular_disabled;
uniform sampler2D tex : source_color, filter_linear_mipmap, repeat_enable;
uniform vec3 tint = vec3(0.78, 0.8, 0.72);
uniform float tile = 7.0;
varying vec3 wp;
void vertex() { wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
	vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
}
void fragment() {
	vec2 p = wp.xz / tile;
	vec2 q = mat2(vec2(0.8, 0.6), vec2(-0.6, 0.8)) * p * 0.61 + vec2(0.37, 0.11);
	float m = smoothstep(0.3, 0.7, vn(wp.xz * 0.11));
	vec3 c = mix(texture(tex, p).rgb, texture(tex, q).rgb, m);
	float pa = vn(wp.xz * 0.045 + vec2(3.0, 7.0));
	c *= mix(vec3(0.74, 0.82, 0.6), vec3(1.1, 1.05, 0.82), pa); // R17 olive shade + warm sun (= ground() in scripts/ui/s217_grass.gd — change both)
	ALBEDO = c * tint;
	ROUGHNESS = 1.0;
}
"""

var top: Node3D

func _own(n: Node, parent: Node) -> Node:
	parent.add_child(n)
	n.owner = top
	return n

func _card(parent: Node, nm: String, file: String, at: Vector3, h: float) -> Sprite3D:
	var t: Texture2D = load("res://art/s217/" + file + ".png")
	var sp := Sprite3D.new()
	sp.name = nm
	sp.texture = t
	sp.pixel_size = h / float(t.get_height())
	sp.offset = Vector2(0, t.get_height() / 2.0)
	sp.billboard = BaseMaterial3D.BILLBOARD_FIXED_Y
	sp.alpha_cut = SpriteBase3D.ALPHA_CUT_OPAQUE_PREPASS
	sp.shaded = false
	sp.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	sp.position = Vector3(at.x * PLAZA_K, at.y, at.z * PLAZA_K)
	_own(sp, parent)
	return sp

func _far(parent: Node, nm: String, file: String, opaque: bool) -> void:
	var sp := Sprite3D.new()
	sp.name = nm
	sp.texture = load("res://art/s217/" + file + ".png")
	sp.shaded = false
	sp.alpha_cut = SpriteBase3D.ALPHA_CUT_DISABLED
	sp.transparent = not opaque
	sp.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	sp.position = Vector3(0, 6, -40 if nm == "Hills" else -60) # rough spot for the editor; the game fits it every frame
	sp.pixel_size = 0.02
	_own(sp, parent)

func _model(parent: Node, nm: String, file: String, at: Vector3, sc: Vector3, rot_y: float, rot_z: float = 0.0) -> Node3D:
	var inst: Node3D = (load("res://art/s217/3d/" + file + ".glb") as PackedScene).instantiate()
	inst.name = nm
	inst.scale = sc
	inst.rotation_degrees = Vector3(0, rot_y, rot_z)
	inst.position = Vector3(at.x * PLAZA_K, at.y, at.z * PLAZA_K)
	_own(inst, parent)
	return inst

func _aabb(n: Node3D) -> AABB: # the model's box in its parent's space (model scale included)
	var box := AABB()
	var first := true
	for mi in n.find_children("*", "MeshInstance3D", true, false):
		var xf: Transform3D = n.transform
		var p: Node = mi
		var chain := Transform3D.IDENTITY
		while p != n:
			chain = (p as Node3D).transform * chain
			p = p.get_parent()
		var b: AABB = (xf * chain) * (mi as MeshInstance3D).get_aabb()
		box = b if first else box.merge(b)
		first = false
	return box

func _initialize() -> void:
	top = Node3D.new()
	top.name = "ArenaDressing"
	# ---- layers 4 + 3: the paintings (fitted to the camera at run time)
	var far := Node3D.new(); far.name = "Far"
	far.set_script(load("res://scripts/ui/s217_far_fit.gd"))
	_own(far, top)
	_far(far, "Sky", "sky_clouds", true)
	_far(far, "Hills", "far_hills_v3", false)
	# ---- layer 2: meadow ground (ends behind the plaza so the painted hills take over) + grass cards
	var mid := Node3D.new(); mid.name = "Mid"; _own(mid, top)
	var gm := MeshInstance3D.new(); gm.name = "Ground"
	var plane := PlaneMesh.new(); plane.size = Vector2(120, 56)
	gm.mesh = plane
	# R15 (owner C2): anti-tiling ground — the tile is sampled twice (second copy turned + scaled) and the two are
	# blended by soft noise, plus big sunlit / shaded meadow patches, so the repeat no longer reads as stripes.
	var sh := Shader.new()
	sh.code = GROUND_SHADER
	var mat := ShaderMaterial.new()
	mat.shader = sh
	mat.set_shader_parameter("tex", load("res://art/s217/ground_tile.png"))
	gm.material_override = mat
	gm.position = Vector3(0, -0.15, -6)
	_own(gm, mid)
	# R16 (owner): all cut-out grass cards removed ("หญ้าพุ่มที่ตัดแปะออกให้หมด"); _card() kept for later flat props.
	var blades := MultiMeshInstance3D.new(); blades.name = "GrassBlades" # R16 (owner H1): 3D blades around the plaza rim, built at load
	blades.set_script(load("res://scripts/ui/s217_grass.gd"))
	_own(blades, mid)
	# R15: slow drifting pollen motes over the meadow (life without new art)
	var motes := CPUParticles3D.new(); motes.name = "Pollen"
	motes.amount = 50
	motes.lifetime = 9.0
	motes.preprocess = 9.0
	motes.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	motes.emission_box_extents = Vector3(22, 1.6, 9)
	motes.position = Vector3(0, 1.8, -14)
	motes.direction = Vector3(1, 0.25, 0)
	motes.spread = 40.0
	motes.gravity = Vector3.ZERO
	motes.initial_velocity_min = 0.15
	motes.initial_velocity_max = 0.45
	motes.scale_amount_min = 0.6
	motes.scale_amount_max = 1.2
	var qm := QuadMesh.new(); qm.size = Vector2(0.07, 0.07)
	var pm := StandardMaterial3D.new()
	pm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	pm.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	pm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	pm.albedo_color = Color(1.0, 0.86, 0.55, 0.4) # R16 (owner G1): fainter + warmer
	qm.material = pm
	motes.mesh = qm
	_own(motes, mid)
	# ---- layer 1: the owner's 3D plaza (flattened to a low platform, top at y 0) + stones
	var near := Node3D.new(); near.name = "Near"; _own(near, top)
	var plaza := _model(near, "Plaza", "plaza_hy", Vector3.ZERO, Vector3(PLAZA_K, 0.16, PLAZA_K), 0.0)
	var box := _aabb(plaza)
	plaza.position = Vector3(-box.get_center().x, -box.end.y, -box.get_center().z)
	# the AI texture is painted bright: tone it under the sun. R16: a tiny tint script on the instance root (material
	# overrides on the glb's children are dropped by pack(); an editable instance saved the whole 50k mesh = 2.6 MB scene)
	plaza.set_script(load("res://scripts/ui/s217_tint.gd"))
	plaza.set("tone", PLAZA_TONE)
	var hero := "stone_hy_runes_full1k"
	var lite := "stone_hy_runes_bake"
	var rock := "rock_cliff_hy"
	# R16 (owner: "take the back rocks out, place the stones like the target picture"): no cliff; the ring of standing
	# stones follows the owner's target painting (rune meadow) — x / z in pre-PLAZA_K units (plaza edge ≈ 9.4).
	# R17 (owner: "rune side faces the middle of the plaza, sizes that differ"): every stone's rune face (+z of the model)
	# turns to the plaza centre + its own small extra turn; final scales are per stone (no common ×1.5 any more).
	# [name, file, x, z, scale (w, h, w), extra Y°, lean Z°]
	var stones := [
		["StoneL", lite, -10.1, -2.7, Vector3(1.1, 1.25, 1.1), 0, 0],           # tall, left of the plaza
		["StoneFrontL", lite, -10.2, 2.9, Vector3(1.0, 0.85, 1.0), 10, 7],      # near-left, leaning out
		["StoneBig", hero, -6.5, -8.3, Vector3(1.45, 1.45, 1.45), 0, 0],        # hero (biggest) back-left
		["StoneBigSide", lite, -5.0, -9.8, Vector3(0.65, 0.5, 0.65), 15, 0],    # small companion right of the hero
		["StoneMid", lite, -1.8, -10.4, Vector3(0.9, 0.8, 0.9), -8, 0],         # lone stone at the back, left of centre
		["StoneShortR", lite, 6.2, -8.8, Vector3(0.9, 0.5, 0.9), 20, 0],        # short broken stone by the slab
		["StoneR", lite, 8.0, -6.7, Vector3(1.05, 1.15, 1.05), 0, 0],          # tall, back-right
		["StoneFrontR", lite, 10.7, -1.4, Vector3(1.3, 1.35, 1.3), 0, -4],      # biggest of the right side, near-right
	]
	for r in stones:
		var face := rad_to_deg(atan2(-float(r[2]), -float(r[3]))) # model +z → plaza centre
		_model(near, r[0], r[1], Vector3(r[2], -0.05, r[3]), r[4], face + r[5], r[6])
	_model(near, "FallenSlab", "stone_fallen_hy", Vector3(4.6, -0.05, -10.6), Vector3(1.4, 1.4, 1.4), 14)      # lying on the grass, back-right
	_model(near, "FallenSlabR", "stone_fallen_hy", Vector3(8.6, -0.05, 6.0), Vector3(1.1, 1.1, 1.1), -35) # broken rune slab, front-right edge
	# small boulders like the painting (owner's rock outcrop, small): back-left far, by the slab, front-left rune rock, far right
	_model(near, "RockFarL", rock, Vector3(-15.5, -0.05, -8.0), Vector3(1.0, 0.7, 1.0), 40)
	_model(near, "RockSlab", rock, Vector3(2.8, -0.05, -10.9), Vector3(0.55, 0.4, 0.55), 110)
	_model(near, "RockFrontL", rock, Vector3(-8.0, -0.05, 6.8), Vector3(0.7, 0.5, 0.7), 200)
	_model(near, "RockFarR", rock, Vector3(16.0, -0.05, -6.5), Vector3(0.8, 0.5, 0.8), -30)
	# ---- editor-only guides (stage3d.gd deletes Guides + GameCam in the game)
	var gd := Node3D.new(); gd.name = "Guides"; _own(gd, top)
	# ---- the 12 slots (owner 13 Nov: "bring the character models, I'll adjust"): move a Slot marker in the editor and
	# the game puts that slot's unit there (stage3d.gd reads Slots, then deletes it). Each marker holds a preview unit
	# (real game sprite, game height, leaned like in the game) + a blue (you) / red (enemy) ring — editor only.
	var slots := Node3D.new(); slots.name = "Slots"; _own(slots, top)
	var TH := preload("res://scripts/ui/theme.gd")
	var ids := ["HL-1", "HL-3", "PL-1", "PL-2", "HL-5", "HL-7", "B1", "B2", "HL-2", "HL-4", "HL-6", "HL-8"]
	var i := 0
	for s in 2:
		for row in 3:
			for lane in 2:
				var mk := Marker3D.new()
				mk.name = "Slot%d_%d_%d" % [s, row, lane]
				mk.position = ST.slot_pos(s, row, lane)
				_own(mk, slots)
				var ring := MeshInstance3D.new(); ring.name = "Ring"
				var tm := TorusMesh.new(); tm.inner_radius = 0.7; tm.outer_radius = 0.84
				ring.mesh = tm
				var m := StandardMaterial3D.new()
				m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
				m.albedo_color = Color("#4fd0ff") if s == 0 else Color("#ff7a6b")
				ring.material_override = m
				ring.position = Vector3(0, 0.03, 0)
				ring.scale = Vector3(1, 0.12, 1)
				_own(ring, mk)
				var tex: Texture2D = TH.art("unit", ids[i])
				i += 1
				if tex == null:
					continue
				var sp := Sprite3D.new(); sp.name = "Preview"
				sp.texture = tex
				sp.pixel_size = ST.SPR_H / float(tex.get_height())
				sp.offset = Vector2(0, tex.get_height() / 2.0) # feet on the marker
				sp.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
				sp.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
				sp.shaded = false
				sp.double_sided = true
				sp.flip_h = s == 1
				sp.rotation = Vector3(deg_to_rad(-ST.PITCH), 0, 0)
				_own(sp, mk)
	var cam := Camera3D.new()
	cam.name = "GameCam"
	cam.fov = ST.FOV
	cam.keep_aspect = Camera3D.KEEP_HEIGHT
	cam.far = 400.0
	cam.transform = str_to_var(GAME_CAM) # the battle camera on an 844×390 phone, read from a game run
	_own(cam, top)
	var ps := PackedScene.new()
	ps.pack(top)
	print("save ", ResourceSaver.save(ps, "res://scenes/arena_dressing_r6.tscn"), " plaza box ", box)
	quit()
