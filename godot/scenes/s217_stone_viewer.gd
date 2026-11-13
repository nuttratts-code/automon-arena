extends Node3D
# SET 217 SAMPLE ONLY (branch ccr-882ceb4b-0ewtk1, never merge as is).
# Stone viewer: open scenes/s217_stone_viewer.tscn and press F6. Shows every 3D stone in art/s217/3d/ turning slowly
# next to its old flat card, in the game's daylight. Mouse wheel = zoom · left/right arrows = turn by hand · Space = pause.

var turn := true
var models: Array[Node3D] = []
var cam: Camera3D
var dist := 9.0

func _ready() -> void:
	var env := Environment.new()
	var sky := ProceduralSkyMaterial.new()
	sky.sky_top_color = Color("#3a6fc4")
	sky.sky_horizon_color = Color("#bcd0e6")
	sky.ground_horizon_color = Color("#bcd0e6")
	sky.ground_bottom_color = Color("#6d8a4c")
	env.background_mode = Environment.BG_SKY
	env.sky = Sky.new()
	env.sky.sky_material = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new() # same sun as the game (stage3d.gd)
	sun.light_energy = 1.15
	sun.light_color = Color("#fff1d6")
	add_child(sun)
	sun.basis = Basis.looking_at(Vector3(0.55, -0.72, -0.42).normalized(), Vector3.UP)
	var ground := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(40, 40)
	ground.mesh = pm
	var gm := StandardMaterial3D.new()
	gm.albedo_color = Color("#7f9a58")
	ground.material_override = gm
	add_child(ground)
	var x := 0.0
	var d := DirAccess.open("res://art/s217/3d")
	var files: Array[String] = []
	if d != null:
		for f in d.get_files():
			if f.ends_with(".glb"):
				files.append(f)
	files.sort()
	for f in files:
		var ps: Variant = load("res://art/s217/3d/" + f)
		if ps is PackedScene:
			var m: Node3D = (ps as PackedScene).instantiate()
			m.position = Vector3(x, 0, 0)
			add_child(m)
			models.append(m)
			var lab := Label3D.new()
			lab.text = f.get_basename() + " (3D)"
			lab.position = Vector3(x, 0.35, 2.2)
			lab.pixel_size = 0.006
			lab.billboard = BaseMaterial3D.BILLBOARD_ENABLED
			add_child(lab)
			x += 4.0
	# the old flat card of the first stone, for comparison
	var t: Variant = load("res://art/s217/stone_tall.png") if ResourceLoader.exists("res://art/s217/stone_tall.png") else null
	if t is Texture2D:
		var sp := Sprite3D.new()
		sp.texture = t
		sp.pixel_size = 4.4 / float((t as Texture2D).get_height())
		sp.offset = Vector2(0, (t as Texture2D).get_height() / 2.0)
		sp.alpha_cut = SpriteBase3D.ALPHA_CUT_OPAQUE_PREPASS
		sp.position = Vector3(x, 0, 0)
		add_child(sp)
		var lab2 := Label3D.new()
		lab2.text = "stone_tall (old flat card)"
		lab2.position = Vector3(x, 0.35, 2.2)
		lab2.pixel_size = 0.006
		lab2.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		add_child(lab2)
		x += 4.0
	cam = Camera3D.new()
	cam.fov = 40
	add_child(cam)
	dist = maxf(9.0, x * 1.1)
	_place_cam(x - 4.0)
	var help := Label.new()
	help.text = "Wheel = zoom · ←/→ = turn · Space = pause turning · Esc = quit"
	help.position = Vector2(12, 8)
	var cl := CanvasLayer.new()
	cl.add_child(help)
	add_child(cl)

var _mid := 0.0
func _place_cam(span: float) -> void:
	_mid = span / 2.0
	cam.position = Vector3(_mid, 3.4, dist)
	cam.look_at(Vector3(_mid, 2.0, 0))

func _process(delta: float) -> void:
	var r := 0.0
	if turn:
		r = 0.5 * delta
	if Input.is_key_pressed(KEY_LEFT):
		r -= 1.5 * delta
	if Input.is_key_pressed(KEY_RIGHT):
		r += 1.5 * delta
	for m in models:
		m.rotate_y(r)

func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed:
		if e.keycode == KEY_SPACE:
			turn = not turn
		elif e.keycode == KEY_ESCAPE:
			get_tree().quit()
	if e is InputEventMouseButton and e.pressed:
		if e.button_index == MOUSE_BUTTON_WHEEL_UP:
			dist = maxf(3.0, dist * 0.9)
		elif e.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			dist = minf(40.0, dist * 1.1)
		cam.position = Vector3(_mid, 3.4, dist)
		cam.look_at(Vector3(_mid, 2.0, 0))
