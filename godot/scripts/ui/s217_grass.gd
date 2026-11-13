@tool
extends MultiMeshInstance3D
# SET 217 SAMPLE ONLY. R18 (owner: "3D blades eat the spec — other games use 2D grass that sways"):
# grass = flat tuft cards (one quad = 2 tris each) facing the battle camera, like HD-2D billboards / GPU Gems ch.7 grass
# objects — ideas only, our own code. Cheap tricks:
#   · only where the battle camera looks (back half + the sides of the plaza rim); nothing in front of the plaza
#   · one tuft texture DRAWN BY THIS SCRIPT at load (no outside art), alpha scissor (no sorting), no shadows
#   · wind: only the top of each card moves (by UV.y), per-card phase from its world position
#   · root colour = the ground colour under it (same maths as GROUND_SHADER in tools/s217_make_r6.gd — change both);
#     normals point up so the cards are lit like the ground
# ~650 cards ≈ 1.3k tris (R17 3D blades: 43k).

@export var cards := 650
@export var rim := 12.7        # plaza edge radius (post-PLAZA_K units)
@export var spread := 10.0     # band width behind the rim
@export var cam_pos := Vector3(0, 6.1, 18.9) # battle camera (cards turn to face it)
@export var seed_value := 21718

const SHADER := """
shader_type spatial;
render_mode cull_disabled, specular_disabled;
uniform sampler2D tuft : source_color, filter_linear_mipmap;
uniform sampler2D ground_tex : source_color, filter_linear_mipmap, repeat_enable;
uniform vec3 ground_tint = vec3(0.78, 0.8, 0.72);
varying vec3 root_col;
varying float shade;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
	vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 ground(vec2 xz) { // = GROUND_SHADER fragment (keep the same)
	vec2 p = xz / 7.0;
	vec2 q = mat2(vec2(0.8, 0.6), vec2(-0.6, 0.8)) * p * 0.61 + vec2(0.37, 0.11);
	float m = smoothstep(0.3, 0.7, vn(xz * 0.11));
	vec3 c = mix(textureLod(ground_tex, p, 4.0).rgb, textureLod(ground_tex, q, 4.0).rgb, m);
	float pa = vn(xz * 0.045 + vec2(3.0, 7.0));
	c *= mix(vec3(0.74, 0.82, 0.6), vec3(1.1, 1.05, 0.82), pa);
	return c * ground_tint;
}
void vertex() {
	vec3 w = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
	root_col = ground(w.xz);
	shade = INSTANCE_CUSTOM.r;
	float top = 1.0 - UV.y; // UV.y = 0 at the top of the card
	float s = sin(TIME * 1.5 + w.x * 0.3 + w.z * 0.2) * 0.12 + sin(TIME * 2.6 + w.z) * 0.03;
	VERTEX.x += s * top * top;
	NORMAL = normalize(inverse(mat3(MODEL_MATRIX)) * vec3(0.0, 1.0, 0.0));
}
void fragment() {
	vec4 t = texture(tuft, UV);
	ALPHA = t.a;
	ALPHA_SCISSOR_THRESHOLD = 0.5;
	float up = 1.0 - UV.y;
	// the drawn tuft carries light/dark per blade in t.rgb; tint it from the ground colour (root) to a warm tip
	vec3 tip = root_col * vec3(1.35, 1.3, 1.0) * (0.9 + 0.25 * shade);
	ALBEDO = mix(root_col * 0.85, tip, smoothstep(0.0, 0.9, up)) * (0.75 + 0.45 * t.r);
	ROUGHNESS = 1.0;
}
"""

func _ready() -> void:
	_build()

func _tuft_texture() -> ImageTexture:
	# a painterly grass tuft drawn blade by blade: R = per-blade light (0..1), A = shape
	var W := 128
	var img := Image.create(W, W, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	for b in 34:
		var x0 := W * 0.5 + rng.randfn(0.0, W * 0.16)
		var hgt := rng.randf_range(0.45, 0.97) * W
		var bend := rng.randf_range(-0.5, 0.5) * W * 0.45 + (x0 - W * 0.5) * 0.6 # outer blades lean out
		var w0 := rng.randf_range(2.2, 4.2)
		var lit := rng.randf_range(0.2, 1.0)
		var steps := int(hgt)
		for s in steps:
			var t := float(s) / float(steps)
			var cx := x0 + bend * t * t
			var y := W - 1 - int(t * hgt)
			var half := w0 * (1.0 - t) * 0.5 + 0.35
			for xx in range(int(cx - half - 1), int(cx + half + 2)):
				if xx < 0 or xx >= W or y < 0:
					continue
				var cov := clampf(half + 0.5 - absf(xx + 0.5 - cx), 0.0, 1.0)
				if cov <= 0.0:
					continue
				var old := img.get_pixel(xx, y)
				var a := maxf(old.a, cov)
				var r := lerpf(old.r, lit * (0.6 + 0.4 * t), cov) if old.a > 0.0 else lit * (0.6 + 0.4 * t)
				img.set_pixel(xx, y, Color(r, r, r, a))
	img.generate_mipmaps()
	return ImageTexture.create_from_image(img)

func _card_mesh() -> QuadMesh:
	var q := QuadMesh.new()
	q.size = Vector2(1, 1)
	q.center_offset = Vector3(0, 0.5, 0) # root at y 0
	var sm := ShaderMaterial.new()
	var sh := Shader.new(); sh.code = SHADER
	sm.shader = sh
	sm.set_shader_parameter("tuft", _tuft_texture())
	sm.set_shader_parameter("ground_tex", load("res://art/s217/ground_tile.png"))
	q.material = sm
	return q

func _build() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_custom_data = true
	mm.mesh = _card_mesh()
	mm.instance_count = cards
	var i := 0
	while i < cards:
		var a := rng.randf_range(PI * 0.95, PI * 2.05) # back half + a little of each side (angle from +x, -z = back)
		var r := rim - 0.7 + pow(rng.randf(), 1.6) * spread
		var p := Vector3(cos(a) * r, 0.0, sin(a) * r)
		p.y = 0.0 if r < rim else -0.15 # plaza top = 0, meadow = -0.15
		var near_rim := r < rim + 1.2
		var sz := rng.randf_range(0.7, 1.3) * (0.8 if near_rim else 1.0 + (r - rim) / spread * 0.8)
		var yaw := atan2(cam_pos.x - p.x, cam_pos.z - p.z) + rng.randf_range(-0.35, 0.35)
		var b := Basis(Vector3.UP, yaw) * Basis.from_scale(Vector3(sz * rng.randf_range(0.9, 1.4), sz, 1.0))
		mm.set_instance_transform(i, Transform3D(b, p))
		mm.set_instance_custom_data(i, Color(rng.randf(), 0, 0, 0))
		i += 1
	multimesh = mm
	cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
