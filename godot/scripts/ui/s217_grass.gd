@tool
extends MultiMeshInstance3D
# SET 217 SAMPLE ONLY (R16 owner H1, R17 owner: "the grass is not pretty — how do other games do it?").
# Field of small 3D grass blades built at load (editor too) so the scene file stays small. R17 uses the common
# stylized-grass tricks (Ghost of Tsushima GDC 2021 talk; Godot grass write-ups — ideas only, no outside code):
#   1 clumps: blades grow in clumps that share height, lean and tint (no evenly spaced spikes)
#   2 root = ground: each blade's root takes the ground colour under it (same maths as the Ground shader in
#     tools/s217_make_r6.gd GROUND_SHADER — change both), so blades melt into the meadow instead of sitting on it
#   3 normals point up: blades are lit like the ground, so from afar they read as soft texture, not separate sticks
#   4 far fade: the light tip fades toward the ground colour with distance
# Thickest around the plaza rim (like the owner's target painting), thinning into the meadow. Units = post-PLAZA_K.

@export var clumps := 900
@export var per_clump := 16
@export var rim := 12.7        # plaza edge radius
@export var spread := 8.0      # band width past the rim (back half reaches twice as far)
@export var seed_value := 21717

const SHADER := """
shader_type spatial;
render_mode cull_disabled, specular_disabled;
uniform sampler2D ground_tex : source_color, filter_linear_mipmap, repeat_enable;
uniform vec3 ground_tint = vec3(0.78, 0.8, 0.72);
uniform vec3 tip_col : source_color = vec3(0.78, 0.8, 0.42);
varying vec3 root_col;
varying float tint;
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
	tint = INSTANCE_CUSTOM.r;
	float t = UV.y;
	float s = sin(TIME * 1.4 + w.x * 0.3 + w.z * 0.2) * 0.10 + sin(TIME * 2.3 + w.z * 0.9) * 0.03;
	VERTEX.x += s * t * t;
	VERTEX.z += s * 0.5 * t * t;
	NORMAL = normalize(inverse(mat3(MODEL_MATRIX)) * vec3(0.0, 1.0, 0.0)); // lit like the ground
}
void fragment() {
	float far = smoothstep(14.0, 38.0, length(VERTEX));
	vec3 tip = mix(tip_col * (0.85 + 0.3 * tint), root_col * 1.15, far * 0.6);
	ALBEDO = mix(root_col * 0.9, tip, smoothstep(0.0, 1.0, UV.y));
	ROUGHNESS = 1.0;
}
"""

func _ready() -> void:
	_build()

func _blade_mesh() -> ArrayMesh:
	# one thin bent blade: a quad + a tip triangle (3 tris), 1 unit tall, root at y 0
	var pts := [Vector3(-0.03, 0, 0), Vector3(0.03, 0, 0), Vector3(-0.018, 0.55, 0.05), Vector3(0.018, 0.55, 0.05), Vector3(0, 1.0, 0.16)]
	var v := PackedVector3Array(); var uv := PackedVector2Array()
	for i in [0, 1, 2, 2, 1, 3, 2, 3, 4]:
		v.append(pts[i]); uv.append(Vector2(0.5, pts[i].y))
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = v
	arr[Mesh.ARRAY_TEX_UV] = uv
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	var sm := ShaderMaterial.new()
	var sh := Shader.new(); sh.code = SHADER
	sm.shader = sh
	sm.set_shader_parameter("ground_tex", load("res://art/s217/ground_tile.png"))
	m.surface_set_material(0, sm)
	return m

func _build() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_custom_data = true
	mm.mesh = _blade_mesh()
	mm.instance_count = clumps * per_clump
	var i := 0
	for c in clumps:
		var a := rng.randf() * TAU
		var back := sin(a) < 0.0 # -z half (behind the plaza, the half the camera sees)
		var r := rim - 0.8 + pow(rng.randf(), 1.8) * spread * (2.0 if back else 1.0)
		var centre := Vector2(cos(a) * r, sin(a) * r)
		var on_rim := r < rim + 1.5
		var ch := rng.randf_range(0.3, 0.75) * (0.8 if on_rim else 1.0) # clump height
		var lean := rng.randf() * TAU                                 # clump lean direction
		var tone := rng.randf()                                       # clump tint
		var size := rng.randf_range(0.25, 0.6)
		for k in per_clump:
			var off := Vector2(rng.randfn(0.0, size), rng.randfn(0.0, size))
			var p2 := centre + off
			var y := 0.0 if p2.length() < rim else -0.15 # plaza top = 0, meadow = -0.15
			var hk := ch * rng.randf_range(0.6, 1.25) * (1.0 - clampf(off.length() / (size * 3.0), 0.0, 0.5))
			var b := Basis(Vector3.UP, lean + rng.randf_range(-0.9, 0.9)) * Basis(Vector3.RIGHT, rng.randf_range(0.05, 0.4))
			mm.set_instance_transform(i, Transform3D(b.scaled(Vector3(1.0, hk, 1.0)), Vector3(p2.x, y, p2.y)))
			mm.set_instance_custom_data(i, Color(clampf(tone + rng.randf_range(-0.15, 0.15), 0.0, 1.0), 0, 0, 0))
			i += 1
	multimesh = mm
	cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
