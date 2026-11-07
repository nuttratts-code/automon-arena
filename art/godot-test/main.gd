extends Node3D
# HD-2D look test: Blender rune plaza (.glb) + pixel sprites lit in 3D + post effects.
# Args after "--": --mode=full|raw  --shot=path.png (still)  --anim (attack sequence for movie maker)

var mode := "full"
var shot := ""
var anim := false
var units := {}
var board := {}
var cam: Camera3D
var t := 0.0
var frame := 0

func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--mode="): mode = a.substr(7)
		elif a.begins_with("--shot="): shot = a.substr(7)
		elif a == "--anim": anim = true
	board = JSON.parse_string(FileAccess.get_file_as_string("res://art/arena_board.json"))
	_env(); _camera(); _sun(); _arena(); _units(); _motes(); _post()

func full() -> bool: return mode == "full"

func _env() -> void:
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.16, 0.34, 0.78); sky_mat.sky_horizon_color = Color(1.0, 0.80, 0.55); sky_mat.sky_energy_multiplier = 1.15; sky_mat.sky_curve = 0.12
	sky_mat.ground_horizon_color = Color(0.70, 0.62, 0.50); sky_mat.ground_bottom_color = Color(0.25, 0.28, 0.2)
	sky_mat.sun_angle_max = 20.0
	var sky := Sky.new(); sky.sky_material = sky_mat
	var e := Environment.new()
	e.background_mode = Environment.BG_SKY; e.sky = sky
	e.ambient_light_source = Environment.AMBIENT_SOURCE_SKY; e.ambient_light_energy = 0.75
	e.tonemap_mode = Environment.TONE_MAPPER_AGX; e.tonemap_exposure = 1.0
	if full():
		e.glow_enabled = true; e.glow_intensity = 0.9; e.glow_bloom = 0.08; e.glow_strength = 1.1
		e.glow_blend_mode = Environment.GLOW_BLEND_MODE_SOFTLIGHT
		e.glow_hdr_threshold = 0.9
		e.ssao_enabled = true; e.ssao_radius = 1.2; e.ssao_intensity = 1.6
		e.fog_enabled = true; e.fog_light_color = Color(0.85, 0.80, 0.72); e.fog_density = 0.0015
		e.fog_aerial_perspective = 0.7; e.fog_sky_affect = 0.0
		e.volumetric_fog_enabled = true; e.volumetric_fog_density = 0.0035; e.volumetric_fog_sky_affect = 0.0
		e.volumetric_fog_albedo = Color(1.0, 0.93, 0.82); e.volumetric_fog_anisotropy = 0.6
		e.adjustment_enabled = true; e.adjustment_saturation = 1.22; e.adjustment_contrast = 1.05
	var we := WorldEnvironment.new(); we.environment = e
	if full():
		var ca := CameraAttributesPractical.new()
		ca.dof_blur_far_enabled = true; ca.dof_blur_far_distance = 34.0; ca.dof_blur_far_transition = 30.0
		ca.dof_blur_amount = 0.12
		we.camera_attributes = ca
	add_child(we)

func _camera() -> void:
	var c: Dictionary = board.cam
	cam = Camera3D.new()
	cam.position = Vector3(c.pos[0], c.pos[1], c.pos[2])
	cam.rotation_degrees = Vector3(-c.pitch_deg, 0, 0)
	cam.projection = Camera3D.PROJECTION_FRUSTUM
	cam.keep_aspect = Camera3D.KEEP_WIDTH
	cam.near = 0.1; cam.far = 4000.0
	cam.size = c.sensor / c.lens * cam.near
	cam.frustum_offset = Vector2(0, c.shift_y * cam.size)
	add_child(cam); cam.current = true

func _sun() -> void:
	var s := DirectionalLight3D.new()
	add_child(s)
	s.look_at_from_position(Vector3.ZERO, Vector3(0.58, -0.50, -0.64), Vector3.UP)
	s.light_color = Color(1.0, 0.85, 0.64); s.light_energy = 2.2
	s.shadow_enabled = true; s.shadow_blur = 1.5
	s.directional_shadow_max_distance = 80.0
	if full(): s.light_volumetric_fog_energy = 1.4

func _noise_tex(lo: Color, hi: Color, freq := 0.05) -> NoiseTexture2D:
	var n := FastNoiseLite.new(); n.frequency = freq; n.fractal_octaves = 5
	var g := Gradient.new(); g.set_color(0, lo); g.set_color(1, hi)
	var t2 := NoiseTexture2D.new(); t2.noise = n; t2.seamless = true; t2.color_ramp = g
	t2.width = 512; t2.height = 512
	return t2

func _mat_for(name: String) -> Material:
	var m := StandardMaterial3D.new(); m.roughness = 0.95
	match name:
		"rune":
			m.albedo_color = Color(0.5, 0.85, 1.0)
			m.emission_enabled = true; m.emission = Color(0.45, 0.85, 1.0); m.emission_energy_multiplier = 4.0
		"stone", "stone_old":
			m.albedo_texture = _noise_tex(Color(0.40, 0.40, 0.37), Color(0.66, 0.65, 0.60), 0.08)
			m.uv1_triplanar = true; m.uv1_scale = Vector3(0.6, 0.6, 0.6)
			m.detail_enabled = true
			m.detail_albedo = _noise_tex(Color(0.42, 0.55, 0.22), Color(1, 1, 1), 0.03)
			m.detail_blend_mode = BaseMaterial3D.BLEND_MODE_MUL; m.detail_uv_layer = BaseMaterial3D.DETAIL_UV_1
		_:
			m.vertex_color_use_as_albedo = true
			m.albedo_texture = _noise_tex(Color(0.80, 0.80, 0.80), Color(1.12, 1.12, 1.12), 0.06)
			m.uv1_triplanar = true; m.uv1_scale = Vector3(0.35, 0.35, 0.35)
			if name in ["grass", "flower", "tree"]:
				m.cull_mode = BaseMaterial3D.CULL_DISABLED
				m.albedo_texture = null
			if name == "grass" and full():
				m.backlight_enabled = true; m.backlight = Color(0.25, 0.3, 0.1)
	return m

var rune_spots: Array[Vector3] = []

func _arena() -> void:
	var scene: PackedScene = load("res://art/arena.glb")
	var root := scene.instantiate(); add_child(root)
	var cache := {}
	for mi in root.find_children("*", "MeshInstance3D", true, false):
		var mesh: Mesh = mi.mesh
		for i in mesh.get_surface_count():
			var sm := mesh.surface_get_material(i)
			var nm := sm.resource_name if sm else ""
			if not cache.has(nm): cache[nm] = _mat_for(nm)
			mi.set_surface_override_material(i, cache[nm])
			if nm == "rune": rune_spots.append(mi.global_transform * mi.get_aabb().get_center())
	print("materials ", cache.keys(), " rune pieces ", rune_spots.size())
	if full():
		var used := []
		for p in rune_spots:
			var near := false
			for q in used: if q.distance_to(p) < 3.0: near = true
			if near: continue
			used.append(p)
			var l := OmniLight3D.new(); l.position = p + Vector3(0, 0, 0.4)
			l.light_color = Color(0.45, 0.85, 1.0); l.light_energy = 1.6; l.omni_range = 5.0
			add_child(l)

const SPR_H := 2.27   # world height of the 64 px sprite (character ~48 px = 1.7 units)

func _sprite_mat(id: String) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_texture = load("res://sprites/%s.png" % id)
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR; m.alpha_scissor_threshold = 0.5
	m.billboard_mode = BaseMaterial3D.BILLBOARD_FIXED_Y; m.billboard_keep_scale = true
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.roughness = 0.8
	if full():
		m.normal_enabled = true; m.normal_texture = load("res://sprites/%s_n.png" % id); m.normal_scale = 1.0
		m.emission_enabled = true; m.emission_texture = load("res://sprites/%s_e.png" % id)
		m.emission = Color.WHITE; m.emission_energy_multiplier = 2.5
		m.emission_operator = BaseMaterial3D.EMISSION_OP_MULTIPLY
	return m

func _blob() -> Decal:
	var img := Image.create(64, 64, false, Image.FORMAT_RGBA8)
	for y in 64: for x in 64:
		var d := Vector2(x - 31.5, y - 31.5).length() / 32.0
		img.set_pixel(x, y, Color(0, 0, 0, clamp(1.0 - d, 0.0, 1.0) * 0.7))
	var dc := Decal.new(); dc.texture_albedo = ImageTexture.create_from_image(img)
	dc.size = Vector3(1.6, 1.0, 1.0)
	return dc

func _units() -> void:
	# side, lane, col -> sprite
	var lineup := [["P", 0, 0, "hl1"], ["P", 0, 1, "fox"], ["P", 1, 0, "owl"], ["P", 1, 2, "spirit"],
		["E", 0, 0, "brute"], ["E", 1, 0, "lizard"], ["E", 0, 2, "brute"], ["E", 1, 1, "lizard"]]
	for u in lineup:
		for c in board.cells:
			if c.side == u[0] and int(c.lane) == u[1] and int(c.col) == u[2]:
				var feet := Vector3(c.pos[0], c.pos[1], c.pos[2])
				var q := QuadMesh.new(); q.size = Vector2(SPR_H, SPR_H)
				var mi := MeshInstance3D.new(); mi.mesh = q
				mi.material_override = _sprite_mat(u[3])
				mi.position = feet + Vector3(0, SPR_H * (0.5 - 6.0 / 64.0), 0)
				mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
				add_child(mi)
				var b := _blob(); b.position = feet; add_child(b)
				units["%s%d%d" % [u[0], u[1], u[2]]] = {"node": mi, "home": mi.position, "feet": feet}

func _motes() -> void:
	if not full(): return
	var p := GPUParticles3D.new()
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX; pm.emission_box_extents = Vector3(14, 2.5, 6)
	pm.gravity = Vector3(0, 0.08, 0); pm.initial_velocity_min = 0.05; pm.initial_velocity_max = 0.25
	pm.direction = Vector3(0.3, 1, 0); pm.spread = 60
	var sm := StandardMaterial3D.new(); sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	sm.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED; sm.albedo_color = Color(1.0, 0.9, 0.6)
	sm.emission_enabled = true; sm.emission = Color(1.0, 0.85, 0.5); sm.emission_energy_multiplier = 3.0
	var q := QuadMesh.new(); q.size = Vector2(0.06, 0.06); q.material = sm
	p.process_material = pm; p.draw_pass_1 = q; p.amount = 160; p.lifetime = 8.0; p.preprocess = 8.0
	p.position = Vector3(0, 2.5, -3)
	add_child(p)

var post_rect: ColorRect
func _post() -> void:
	var cl := CanvasLayer.new(); add_child(cl)
	post_rect = ColorRect.new(); post_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	var sm := ShaderMaterial.new(); sm.shader = load("res://post.gdshader")
	sm.set_shader_parameter("enabled", full())
	post_rect.material = sm; cl.add_child(post_rect)

# ---------- attack sequence (fox casts a fire bolt at the front brute) ----------
var bolt: MeshInstance3D
var bolt_light: OmniLight3D
var dmg: Label3D

func _process(delta: float) -> void:
	frame += 1
	t += delta
	if shot != "" and frame == 12:
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(shot)
		print("SHOT ", shot); get_tree().quit()
	if not anim: return
	# idle bob
	for k in units:
		var u: Dictionary = units[k]
		if k != "P01": u.node.position.y = u.home.y + (0.04 * sin(t * 3.0 + u.home.x) if (t > 0) else 0.0)
	_attack(t)
	if t > 3.2: get_tree().quit()

func _attack(tt: float) -> void:
	var fox: Dictionary = units["P01"]; var tgt: Dictionary = units["E00"]
	# 0.0-0.4 step forward, 0.4-0.6 wind-up glow, 0.6-1.1 bolt flies, 1.1 hit, 1.1-1.5 knockback/flash, then return
	var f: Node3D = fox.node
	var fwd: float = clamp(tt / 0.4, 0.0, 1.0) - clamp((tt - 1.8) / 0.4, 0.0, 1.0)
	f.position = fox.home + Vector3(0.5 * fwd, 0.25 * sin(PI * fwd), 0)
	var start: Vector3 = f.position + Vector3(0.7, 0.4, 0)
	var endp: Vector3 = tgt.home + Vector3(-0.2, 0.0, 0)
	if bolt == null:
		bolt = MeshInstance3D.new(); var s := SphereMesh.new(); s.radius = 0.22; s.height = 0.44; bolt.mesh = s
		var m := StandardMaterial3D.new(); m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.albedo_color = Color(1, 0.7, 0.3); m.emission_enabled = true; m.emission = Color(1, 0.55, 0.15); m.emission_energy_multiplier = 8.0
		bolt.material_override = m; add_child(bolt)
		bolt_light = OmniLight3D.new(); bolt_light.light_color = Color(1, 0.6, 0.25); bolt_light.omni_range = 6.0; add_child(bolt_light)
		dmg = Label3D.new(); dmg.text = "128"; dmg.font_size = 96; dmg.outline_size = 24; dmg.modulate = Color(1, 0.92, 0.5)
		dmg.billboard = BaseMaterial3D.BILLBOARD_ENABLED; dmg.no_depth_test = true; dmg.pixel_size = 0.008; add_child(dmg)
	var charge: float = clamp((tt - 0.4) / 0.2, 0.0, 1.0)
	var fly: float = clamp((tt - 0.6) / 0.5, 0.0, 1.0)
	var visible_b: bool = tt > 0.4 and tt < 1.1
	bolt.visible = visible_b
	bolt_light.light_energy = (3.0 * charge if tt < 1.1 else max(0.0, 6.0 * (1.0 - (tt - 1.1) / 0.3)))
	var p: Vector3 = start.lerp(endp, fly * fly) + Vector3(0, 0.6 * sin(PI * fly), 0)
	bolt.position = p; bolt.scale = Vector3.ONE * (0.4 + 0.6 * charge)
	bolt_light.position = p if tt < 1.1 else endp
	# hit: white flash + knockback + camera shake + damage number
	var hit: float = tt - 1.1
	var tm: StandardMaterial3D = tgt.node.material_override
	if hit > 0.0 and hit < 0.13:
		tm.emission = Color(1, 1, 1); tm.emission_energy_multiplier = 1.6
		tm.emission_operator = BaseMaterial3D.EMISSION_OP_ADD; tm.emission_texture = null
	else:
		tm.emission = Color.WHITE; tm.emission_energy_multiplier = 2.5
		tm.emission_operator = BaseMaterial3D.EMISSION_OP_MULTIPLY
		tm.emission_texture = load("res://sprites/brute_e.png")
	var kb: float = (sin(clamp(hit / 0.4, 0.0, 1.0) * PI) * 0.5) if hit > 0 else 0.0
	tgt.node.position = tgt.home + Vector3(kb, 0, 0)
	var shake: float = (0.12 * exp(-hit * 10.0)) if hit > 0 else 0.0
	cam.h_offset = shake * sin(tt * 90.0); cam.v_offset = shake * cos(tt * 77.0)
	dmg.visible = hit > 0 and hit < 1.3
	dmg.position = tgt.home + Vector3(0, 1.5 + 0.8 * clamp(hit / 0.5, 0.0, 1.0), 0.5)
	dmg.modulate.a = clamp(1.6 - hit * 1.4, 0.0, 1.0)
