extends SceneTree
# SET 217 SAMPLE ONLY (ui-preview, branch ccr-882ceb4b-0ewtk1 — never merge to main as is).
# R5 (13 Nov, owner pick A1 = 1 scene, 4 depth layers): builds scenes/arena_dressing_r5.tscn from the owner's full target
# picture — 1 near = 3D stones (the owner's Hunyuan3D rune stone, scaled/turned into many) · 2 mid = ground + grass cards ·
# 3 far = hills + arch card (art/s217/far_hills.png) · 4 sky = sky + mountains card (far_sky.png). Both far cards face the
# battle camera and are sized to its view (claude/preview-set217/r5-cut-far.py cuts them). The old arena_dressing.tscn stays.
# The owner moves things in the Godot editor; in the sample copy stage3d.gd reads this scene (r5-patch-load.py).
# "Guides" (slot rings, plaza disc, ground) and "GameCam" (the battle camera, tick Preview to look through it) are
# for the editor only — stage3d.gd deletes them in the game.
#   godot --headless --path godot -s res://tools/s217_make_r5.gd

const ST := preload("res://scripts/ui/stage3d.gd")

var top: Node3D

func _own(n: Node, parent: Node) -> Node:
	parent.add_child(n)
	n.owner = top
	return n

func _card(parent: Node, nm: String, file: String, at: Vector3, h: float, flip: bool = false) -> Sprite3D:
	var t: Texture2D = load("res://art/s217/" + file + ".png")
	var sp := Sprite3D.new()
	sp.name = nm
	sp.texture = t
	sp.pixel_size = h / float(t.get_height())
	sp.offset = Vector2(0, t.get_height() / 2.0) # the node's point = the bottom middle of the picture (its feet)
	sp.billboard = BaseMaterial3D.BILLBOARD_FIXED_Y
	sp.alpha_cut = SpriteBase3D.ALPHA_CUT_OPAQUE_PREPASS
	sp.shaded = false
	sp.flip_h = flip
	sp.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	sp.position = at
	_own(sp, parent)
	return sp

func _mesh(parent: Node, nm: String, m: Mesh, col: Color, at: Vector3) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = nm
	mi.mesh = m
	var mat := StandardMaterial3D.new()
	mat.albedo_color = col
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mi.material_override = mat
	mi.position = at
	_own(mi, parent)
	return mi

const HILLS_D := 40.0 # distance of the hills card from the camera
const ROW_TOP := 250 # picture row at the screen top (rows above it = sky the camera never sees)

func _far(parent: Node, nm: String, file: String, dist: float, cam: Camera3D, opaque: bool) -> Sprite3D:
	# a flat painting square to the battle camera, as wide as a 2.4:1 screen at that distance, its top just above the screen top
	var t: Texture2D = load("res://art/s217/" + file + ".png")
	var half_h := dist * tan(deg_to_rad(ST.FOV / 2.0))
	var w := 2.0 * half_h * 2.4
	var sp := Sprite3D.new()
	sp.name = nm
	sp.texture = t
	sp.pixel_size = w / float(t.get_width())
	var h := t.get_height() * sp.pixel_size
	# the camera sees only a thin band above the plaza: picture row ROW_TOP sits at the screen top and the last row just under
	# the line where the hills card meets the ground (both cards use the same screen mapping, so their rows line up);
	# the picture is squashed up/down to fit (scale.y)
	var p := deg_to_rad(ST.PITCH)
	var hills_half := HILLS_D * tan(deg_to_rad(ST.FOV / 2.0))
	var ground_f := (HILLS_D * sin(p) - cam.position.y) / cos(p) / hills_half - 0.04 # screen spot of that line, -1 bottom … 1 top
	var top_u := half_h * 1.0
	var bot_u := half_h * ground_f
	sp.scale = Vector3(1, (top_u - bot_u) / ((t.get_height() - ROW_TOP) * sp.pixel_size), 1)
	h = t.get_height() * sp.pixel_size * sp.scale.y
	var b := cam.transform.basis
	sp.transform = Transform3D(b * Basis.from_scale(sp.scale), cam.position - b.z * dist + b.y * (bot_u + h / 2.0))
	sp.shaded = false
	sp.alpha_cut = SpriteBase3D.ALPHA_CUT_DISABLED # soft blend: the hills' bottom fades into the 3D ground
	sp.transparent = not opaque
	sp.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	_own(sp, parent)
	return sp

func _stone(parent: Node, nm: String, model: String, at: Vector3, sc: Vector3, rot: Vector3) -> void:
	var inst: Node3D = (load("res://art/s217/3d/" + model + ".glb") as PackedScene).instantiate()
	inst.name = nm
	inst.position = at
	inst.rotation_degrees = rot
	inst.scale = sc
	_own(inst, parent)

func _initialize() -> void:
	top = Node3D.new()
	top.name = "ArenaDressing"
	var cam := Camera3D.new()
	cam.name = "GameCam"
	cam.fov = ST.FOV
	cam.keep_aspect = Camera3D.KEEP_HEIGHT
	cam.far = 400.0
	# the battle camera on an 844×390 phone (measured from the game run, set 217 R1)
	cam.transform = str_to_var("Transform3D(1, 0, 0, 0, 0.92718387, 0.3746066, 0, -0.3746066, 0.92718387, 0, 10.876229, 21.210997)")
	# ---- layer 4 sky + mountains, layer 3 hills + arch (in front of it)
	var far := Node3D.new(); far.name = "Far"; _own(far, top)
	_far(far, "Sky", "far_sky", 52.0, cam, true)
	_far(far, "Hills", "far_hills", HILLS_D, cam, false)
	# ---- layer 2 ground (the meadow colour of the picture, under the plaza model) + grass cards
	var mid := Node3D.new(); mid.name = "Mid"; _own(mid, top)
	var ground := PlaneMesh.new(); ground.size = Vector2(160, 120)
	var gm := _mesh(mid, "Ground", ground, Color("#7f8c48"), Vector3(0, -0.15, -30))
	(gm.material_override as StandardMaterial3D).shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL # lit like the plaza
	(gm.material_override as StandardMaterial3D).roughness = 1.0
	var tufts := [["grass1", -9.0, -7.8, 0.9], ["grass3", 8.6, -7.6, 0.8], ["grass0", -12.0, -4.0, 1.2],
		["grass4", 12.6, -3.2, 1.2], ["grass5", -2.5, -10.2, 1.0], ["grass2", 3.5, -10.0, 1.1],
		["grass_big", -13.0, 4.5, 2.0], ["grass5", 13.0, 4.0, 1.8], ["grass1", -8.5, 8.2, 1.4], ["grass3", 9.0, 8.0, 1.3]]
	var n := 1
	for t in tufts:
		_card(mid, "Grass%d" % n, t[0], Vector3(t[1], -0.05, t[2]), t[3])
		n += 1
	# ---- layer 1 standing stones (3D): one hero stone at full detail, the rest the light 2.5k bake, turned and scaled
	var stones := Node3D.new(); stones.name = "Stones"; _own(stones, top)
	var hero := "stone_hy_runes_full1k"
	var lite := "stone_hy_runes_bake"
	_stone(stones, "StoneBig", hero, Vector3(-7.5, -0.05, -9.6), Vector3.ONE, Vector3(0, 20, 0))
	_stone(stones, "StoneBigSide", lite, Vector3(-5.3, -0.05, -10.4), Vector3(0.6, 0.5, 0.6), Vector3(0, -40, 0))
	_stone(stones, "StoneFarL", lite, Vector3(-12.8, -0.05, -5.8), Vector3(0.85, 0.8, 0.85), Vector3(0, 60, 0))
	_stone(stones, "StoneMid", lite, Vector3(0.8, -0.05, -12.5), Vector3(0.7, 0.62, 0.7), Vector3(0, 140, 0))
	_stone(stones, "StoneR", lite, Vector3(8.8, -0.05, -9.8), Vector3(0.95, 0.95, 0.95), Vector3(0, -15, 0))
	_stone(stones, "StoneFrontR", lite, Vector3(13.6, -0.05, -3.0), Vector3(1.0, 0.85, 1.0), Vector3(0, -70, 0))
	_stone(stones, "StoneFrontL", lite, Vector3(-14.2, -0.05, 1.0), Vector3(0.9, 0.75, 0.9), Vector3(0, 100, 0))
	_stone(stones, "Fallen", lite, Vector3(5.0, 0.35, -12.0), Vector3(0.7, 0.7, 0.7), Vector3(0, 10, 84))
	_stone(stones, "FallenRunes", lite, Vector3(12.0, 0.4, 4.5), Vector3(0.6, 0.6, 0.6), Vector3(0, -30, -82))
	var rocks := [[-11.0, -8.5, 0.16], [3.0, -11.5, 0.12], [10.5, -7.0, 0.14], [-9.5, 4.8, 0.18], [11.0, 6.5, 0.15], [-15.5, -2.0, 0.2]]
	var k := 1
	for r in rocks:
		_stone(stones, "Rock%d" % k, lite, Vector3(r[0], -0.25, r[1]), Vector3(r[2] * 1.6, r[2], r[2] * 1.6), Vector3(0, k * 47.0, 0))
		k += 1
	# ---- editor-only guides (stage3d.gd deletes Guides + GameCam in the game)
	var gd := Node3D.new(); gd.name = "Guides"; _own(gd, top)
	var disc := CylinderMesh.new(); disc.top_radius = 9.0; disc.bottom_radius = 9.0; disc.height = 0.05
	_mesh(gd, "PlazaDisc", disc, Color("#a9a59a"), Vector3(0, -0.03, 0))
	for s in 2:
		for row in 3:
			for lane in 2:
				var tm := TorusMesh.new(); tm.inner_radius = 0.7; tm.outer_radius = 0.84
				var mi := _mesh(gd, "Slot%d_%d_%d" % [s, row, lane], tm, Color("#4fd0ff") if s == 0 else Color("#ff7a6b"), ST.slot_pos(s, row, lane) + Vector3(0, 0.02, 0))
				mi.scale = Vector3(1, 0.12, 1)
	_own(cam, top)
	var ps := PackedScene.new()
	ps.pack(top)
	print("save ", ResourceSaver.save(ps, "res://scenes/arena_dressing_r5.tscn"))
	quit()
