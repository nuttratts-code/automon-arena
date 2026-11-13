extends SceneTree
# SET 217 SAMPLE ONLY (ui-preview R6, branch ccr-882ceb4b-0ewtk1 — never merge to main as is).
# Builds scenes/arena_dressing_r6.tscn from the owner's v3 pieces (asset-prompts.md §6, 13 Nov):
#   4 Sky = sky_clouds.png · 3 Hills = far_hills_v3.png (both fitted to the live camera by scripts/ui/s217_far_fit.gd)
#   2 Ground = ground_tile.png tiled + grass cards · 1 Plaza = plaza_hy.glb (owner's Hunyuan3D plaza, 50k) + stones:
#   hero rune stone (full1k) · light bake copies turned/scaled · fallen slab = stone_fallen_hy.glb (owner's, 3k bake).
# The old plaza model (runeplaza.glb) is hidden in the sample copy (claude/preview-set217/r6-patch.py).
#   godot --headless --path godot -s res://tools/s217_make_r6.gd

const ST := preload("res://scripts/ui/stage3d.gd")

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
	sp.position = at
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
	inst.position = at
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
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = load("res://art/s217/ground_tile.png")
	mat.uv1_scale = Vector3(120.0 / 7.0, 56.0 / 7.0, 1) # one tile = 7 units
	mat.roughness = 1.0
	mat.albedo_color = Color(0.78, 0.8, 0.72)
	gm.material_override = mat
	gm.position = Vector3(0, -0.15, -6)
	_own(gm, mid)
	var tufts := [["grass1", -9.5, -8.6, 0.9], ["grass3", 9.4, -8.4, 0.8], ["grass0", -12.0, -4.0, 1.2],
		["grass4", 12.6, -3.2, 1.2], ["grass5", -2.5, -11.0, 1.0], ["grass2", 3.5, -11.2, 1.1],
		["grass_big", -13.0, 4.5, 2.0], ["grass5", 13.0, 4.0, 1.8], ["grass1", -10.5, 7.5, 1.4], ["grass3", 10.5, 7.5, 1.3]]
	var n := 1
	for t in tufts:
		_card(mid, "Grass%d" % n, t[0], Vector3(t[1], -0.1, t[2]), t[3])
		n += 1
	# ---- layer 1: the owner's 3D plaza (flattened to a low platform, top at y 0) + stones
	var near := Node3D.new(); near.name = "Near"; _own(near, top)
	var plaza := _model(near, "Plaza", "plaza_hy", Vector3.ZERO, Vector3(1, 0.16, 1), 0.0)
	var box := _aabb(plaza)
	plaza.position = Vector3(-box.get_center().x, -box.end.y, -box.get_center().z)
	for mi in plaza.find_children("*", "MeshInstance3D", true, false): # the AI texture is painted bright: tone it under the sun
		var m: Material = (mi as MeshInstance3D).mesh.surface_get_material(0)
		if m is StandardMaterial3D:
			var d := (m as StandardMaterial3D).duplicate() as StandardMaterial3D
			d.albedo_color = Color(0.74, 0.74, 0.72)
			(mi as MeshInstance3D).material_override = d
	var hero := "stone_hy_runes_full1k"
	var lite := "stone_hy_runes_bake"
	_model(near, "StoneBig", hero, Vector3(-7.8, -0.05, -10.2), Vector3.ONE, 20)
	_model(near, "StoneBigSide", lite, Vector3(-5.6, -0.05, -11.0), Vector3(0.6, 0.5, 0.6), -40)
	_model(near, "StoneFarL", lite, Vector3(-13.0, -0.05, -6.0), Vector3(0.85, 0.8, 0.85), 60)
	_model(near, "StoneMid", lite, Vector3(0.8, -0.05, -13.0), Vector3(0.7, 0.62, 0.7), 140)
	_model(near, "StoneR", lite, Vector3(9.0, -0.05, -10.2), Vector3(0.95, 0.95, 0.95), -15)
	_model(near, "StoneFrontR", lite, Vector3(13.8, -0.05, -3.0), Vector3(1.0, 0.85, 1.0), -70)
	_model(near, "StoneFrontL", lite, Vector3(-14.4, -0.05, 1.0), Vector3(0.9, 0.75, 0.9), 100)
	_model(near, "FallenSlab", "stone_fallen_hy", Vector3(5.2, -0.05, -12.4), Vector3.ONE, 8)
	_model(near, "FallenSlabR", "stone_fallen_hy", Vector3(12.2, -0.05, 5.0), Vector3(0.8, 0.8, 0.8), -35)
	# ---- editor-only guides (stage3d.gd deletes Guides + GameCam in the game)
	var gd := Node3D.new(); gd.name = "Guides"; _own(gd, top)
	for s in 2:
		for row in 3:
			for lane in 2:
				var mi := MeshInstance3D.new()
				mi.name = "Slot%d_%d_%d" % [s, row, lane]
				var tm := TorusMesh.new(); tm.inner_radius = 0.7; tm.outer_radius = 0.84
				mi.mesh = tm
				var m := StandardMaterial3D.new()
				m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
				m.albedo_color = Color("#4fd0ff") if s == 0 else Color("#ff7a6b")
				mi.material_override = m
				mi.position = ST.slot_pos(s, row, lane) + Vector3(0, 0.02, 0)
				mi.scale = Vector3(1, 0.12, 1)
				_own(mi, gd)
	var cam := Camera3D.new()
	cam.name = "GameCam"
	cam.fov = ST.FOV
	cam.keep_aspect = Camera3D.KEEP_HEIGHT
	cam.far = 400.0
	cam.transform = str_to_var("Transform3D(1, 0, 0, 0, 0.92718387, 0.3746066, 0, -0.3746066, 0.92718387, 0, 10.876229, 21.210997)")
	_own(cam, top)
	var ps := PackedScene.new()
	ps.pack(top)
	print("save ", ResourceSaver.save(ps, "res://scenes/arena_dressing_r6.tscn"), " plaza box ", box)
	quit()
