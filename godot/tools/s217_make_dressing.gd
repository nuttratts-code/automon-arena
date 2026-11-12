extends SceneTree
# SET 217 SAMPLE ONLY (ui-preview, branch ccr-882ceb4b-0ewtk1 — never merge to main as is).
# Builds scenes/arena_dressing.tscn: the painted cut-out cards (standing stones, rocks, grass, far backdrop) that stand
# around the rune plaza. The owner moves them in the Godot editor; stage3d.gd reads this scene at runtime.
# "Guides" (slot rings, plaza disc, ground) and "GameCam" (the battle camera, tick Preview to look through it) are
# for the editor only — stage3d.gd deletes them in the game.
#   godot --headless --path godot -s res://tools/s217_make_dressing.gd

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

func _initialize() -> void:
	top = Node3D.new()
	top.name = "ArenaDressing"
	# ---- far painting
	var far := Node3D.new(); far.name = "Far"; _own(far, top)
	var bd := _card(far, "Backdrop", "backdrop", Vector3(0, -2.5, -24.0), 17.0)
	bd.billboard = BaseMaterial3D.BILLBOARD_DISABLED
	bd.alpha_cut = SpriteBase3D.ALPHA_CUT_DISABLED
	# ---- standing stones + rocks (back half only: nothing in front of the units)
	var stones := Node3D.new(); stones.name = "Stones"; _own(stones, top)
	var ring := [["StoneTall", "stone_tall", -10.5, -6.5, 4.4], ["StoneRound", "stone1", -5.5, -9.6, 3.6],
		["StoneSlim", "stone0", 1.2, -10.6, 3.9], ["StonePillar", "stone3", 6.4, -9.2, 4.0],
		["StoneTwist", "stone2", 11.0, -6.0, 4.2], ["StoneFallen", "stone_fallen", 4.0, -11.6, 2.4],
		["RockL", "rock", -14.5, -2.5, 3.0], ["RockR", "rock", 15.0, -1.5, 2.6]]
	for r in ring:
		_card(stones, r[0], r[1], Vector3(r[2], -0.05, r[3]), r[4], r[2] > 8.0)
	# ---- grass + flowers
	var grass := Node3D.new(); grass.name = "Grass"; _own(grass, top)
	var tufts := [["grass1", -9.0, -7.8, 0.9], ["grass3", 8.6, -7.6, 0.8], ["grass0", -12.0, -4.0, 1.2],
		["grass4", 12.6, -3.2, 1.2], ["grass5", -2.5, -10.2, 1.0], ["grass2", 3.5, -10.0, 1.1],
		["grass_big", -13.0, 4.5, 2.0], ["grass5", 13.0, 4.0, 1.8], ["grass1", -8.5, 8.2, 1.4], ["grass3", 9.0, 8.0, 1.3]]
	var n := 1
	for t in tufts:
		_card(grass, "Grass%d" % n, t[0], Vector3(t[1], -0.05, t[2]), t[3])
		n += 1
	# ---- editor-only guides
	var gd := Node3D.new(); gd.name = "Guides"; _own(gd, top)
	var ground := PlaneMesh.new(); ground.size = Vector2(60, 40)
	_mesh(gd, "Ground", ground, Color("#5f7d3c"), Vector3(0, -0.06, 0))
	var disc := CylinderMesh.new(); disc.top_radius = 9.0; disc.bottom_radius = 9.0; disc.height = 0.05
	_mesh(gd, "PlazaDisc", disc, Color("#a9a59a"), Vector3(0, -0.03, 0))
	for s in 2:
		for row in 3:
			for lane in 2:
				var tm := TorusMesh.new(); tm.inner_radius = 0.7; tm.outer_radius = 0.84
				var mi := _mesh(gd, "Slot%d_%d_%d" % [s, row, lane], tm, Color("#4fd0ff") if s == 0 else Color("#ff7a6b"), ST.slot_pos(s, row, lane) + Vector3(0, 0.02, 0))
				mi.scale = Vector3(1, 0.12, 1)
	var cam := Camera3D.new()
	cam.name = "GameCam"
	cam.fov = ST.FOV
	cam.keep_aspect = Camera3D.KEEP_HEIGHT
	cam.far = 400.0
	# the battle camera on an 844×390 phone (measured from the game run, set 217 R1)
	cam.transform = str_to_var("Transform3D(1, 0, 0, 0, 0.92718387, 0.3746066, 0, -0.3746066, 0.92718387, 0, 10.876229, 21.210997)")
	_own(cam, top)
	var ps := PackedScene.new()
	ps.pack(top)
	print("save ", ResourceSaver.save(ps, "res://scenes/arena_dressing.tscn"))
	quit()
