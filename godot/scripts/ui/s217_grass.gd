@tool
extends MultiMeshInstance3D
# SET 217 SAMPLE ONLY (R16, owner H1: "thin grass blades along the plaza edge, made in code — no cut-out cards").
# Builds a field of small 3D grass blades at load (editor too), so the scene file stays small. Blades are thickest just
# around the plaza rim (like the owner's target painting, where grass creeps over the stone edge) and thin out into
# the meadow. Wind sway + dark-root / light-tip colour come from the shader below. All numbers are post-PLAZA_K units.

@export var blades := 5200
@export var rim := 12.7        # plaza edge radius
@export var spread := 7.0      # how far past the rim the band reaches (back half reaches twice as far)
@export var seed_value := 21716

const SHADER := """
shader_type spatial;
render_mode cull_disabled, specular_disabled;
uniform vec3 root_col : source_color = vec3(0.22, 0.33, 0.11);
uniform vec3 tip_col : source_color = vec3(0.66, 0.74, 0.33);
void vertex() {
	vec3 w = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
	float h = UV.y; // 0 root, 1 tip
	float s = sin(TIME * 1.6 + w.x * 0.35 + w.z * 0.22) * 0.12 + sin(TIME * 2.7 + w.x) * 0.03;
	VERTEX.x += s * h * h;
	VERTEX.z += s * 0.4 * h * h;
}
void fragment() {
	ALBEDO = mix(root_col, tip_col, UV.y) * (0.85 + 0.3 * COLOR.r);
	ROUGHNESS = 1.0;
}
"""

func _ready() -> void:
	_build()

func _blade_mesh() -> ArrayMesh:
	# one bent blade: 2 quads + a tip triangle (5 tris), 1 unit tall, root at y 0
	var pts := [Vector3(-0.05, 0, 0), Vector3(0.05, 0, 0), Vector3(-0.035, 0.45, 0.02), Vector3(0.035, 0.45, 0.02),
		Vector3(-0.015, 0.8, 0.06), Vector3(0.015, 0.8, 0.06), Vector3(0, 1.0, 0.1)]
	var v := PackedVector3Array(); var uv := PackedVector2Array()
	for i in [0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6]:
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
	m.surface_set_material(0, sm)
	return m

func _build() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = _blade_mesh()
	mm.instance_count = blades
	for i in blades:
		var a := rng.randf() * TAU
		var back := sin(a) < 0.0 # -z half (behind the plaza, seen by the camera)
		var reach := spread * (2.0 if back else 1.0)
		var r := rim - 0.6 + pow(rng.randf(), 2.2) * reach # crowd near the rim
		var p := Vector3(cos(a) * r, 0.0 if r < rim else -0.15, sin(a) * r) # plaza top = 0, meadow = -0.15
		var h := rng.randf_range(0.35, 0.8) * (1.15 if r > rim + 1.0 else 0.85)
		var b := Basis(Vector3.UP, rng.randf() * TAU) * Basis(Vector3.RIGHT, rng.randf_range(-0.25, 0.25))
		mm.set_instance_transform(i, Transform3D(b.scaled(Vector3(1.0, h, 1.0)), p))
		mm.set_instance_color(i, Color(rng.randf(), 0, 0))
	multimesh = mm
	cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
