# set 217 P1 (sample copy only): review-2026-11-14 phase 1 depth blockout.
# Run inside the copy: python -I p1-patch-depth.py <g>
#  - plateau ground: the Ground plane grows (600 x 500, subdivided) and drops away 60 m between r 24 and 55 m (high meadow, art-style §8)
#  - far layers in the WORLD (parallax on the dolly): sky quad z -300 (no fog), hills z -200 (bluish) + z -110 (flipped)
#    replace the camera-locked Far cards (s217_far_fit.gd no longer runs)
#  - fog: depth 15 -> 260, curve 1.8 (thin air over the board, far layers fade)
#  - foreground rocks: _p1_fg kept but NOT called (P1 finding: a 6 vs 6 board fills the screen width; the only free
#    corners are under the speed/stop/skip buttons, so rocks either cover front-lane units or hide behind the UI)
import sys, os
g = sys.argv[1]

def patch(rel, pairs):
    p = os.path.join(g, rel)
    s = open(p, encoding="utf-8", newline="").read()
    crlf = "\r\n" in s
    s = s.replace("\r\n", "\n")
    for a, b in pairs:
        assert a in s, (rel, a[:60])
        s = s.replace(a, b, 1)
    if crlf:
        s = s.replace("\n", "\r\n")
    open(p, "w", encoding="utf-8", newline="").write(s)

T = "\t"
patch("scenes/arena_dressing_r6.tscn", [
    ('[node name="Far" type="Node3D" parent="." unique_id=498508751]\nscript = ExtResource("1_x4b1i")\n',
     '[node name="Far" type="Node3D" parent="." unique_id=498508751]\nvisible = false\n'),
    ('size = Vector2(120, 56)\n', 'size = Vector2(600, 500)\nsubdivide_width = 150\nsubdivide_depth = 125\n'),
    ('transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, -0.15, -6)\nmaterial_override = SubResource("ShaderMaterial_1vf4e")',
     'transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, -0.15, -200)\nmaterial_override = SubResource("ShaderMaterial_1vf4e")'),
    ('void vertex() { wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }',
     'void vertex() {\n' + T + 'wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;\n'
     + T + 'float r = length(vec2(wp.x * 0.85, wp.z + 2.0));\n'
     + T + 'float drop = 60.0 * smoothstep(24.0, 55.0, r); // P1: the plateau edge, land falls away behind the stones\n'
     + T + 'VERTEX.y -= drop;\n'
     + T + 'wp.y -= drop;\n}'),
])

patch("scripts/ui/stage3d.gd", [
    (T + "env.fog_depth_begin = 34.0\n" + T + "env.fog_depth_end = 110.0\n",
     T + "env.fog_depth_begin = 15.0 # P1\n" + T + "env.fog_depth_end = 260.0\n" + T + "env.fog_depth_curve = 1.8\n"),
    (T + T + T + "_s217_stone_shadows(d), CONNECT_ONE_SHOT)\n",
     T + T + T + "_s217_stone_shadows(d)\n" + T + T + T + "_p1_far(d), CONNECT_ONE_SHOT)\n"),
    (T + T + "cam.transform = lerp_pose(pose_prep, pose_battle, k)\n",
     T + T + "cam.transform = lerp_pose(pose_prep, pose_battle, k)\n" + T + "if _fg != null:\n" + T + T + "_fg.visible = k > 0.6\n"),
    ("# ---- set 217 sample R19 (owner L2 + L3)",
     '''# ---- set 217 sample P1 (review-2026-11-14 phase 1) ----
var _fg: Node3D = null

func _p1_quad(d: Node, file: String, w: float, center: Vector3, tint: Color, fog: bool, flip: bool) -> void:
	var t: Variant = load(file)
	if not (t is Texture2D):
		return
	var ts := (t as Texture2D).get_size()
	var q := QuadMesh.new()
	q.size = Vector2(w, w * ts.y / ts.x)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_texture = t
	m.albedo_color = tint
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
	m.alpha_scissor_threshold = 0.5
	m.disable_fog = not fog
	if flip:
		m.uv1_scale = Vector3(-1, 1, 1)
	var mi := MeshInstance3D.new()
	mi.mesh = q
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.position = center
	d.add_child(mi)

func _p1_far(d: Node) -> void:
	# picture rows: hill peaks sit ~42 % down the hills card. Battle camera (0, 7.6, 24.5) top-of-view ray falls 4.4 deg.
	_p1_quad(d, "res://art/s217/sky_clouds.png", 300.0, Vector3(0, -25, -300), Color(1, 1, 1), false, false)
	_p1_quad(d, "res://art/s217/far_hills_v3.png", 260.0, Vector3(0, -24.6, -200), Color(0.78, 0.86, 1.0), true, false)
	_p1_quad(d, "res://art/s217/far_hills_v3.png", 170.0, Vector3(10, -14.7, -110), Color(0.9, 0.96, 0.88), true, true)

func _p1_fg(d: Node) -> void:
	var ps: Variant = load("res://art/s217/3d/rock_cliff_hy.glb")
	if not (ps is PackedScene):
		return
	_fg = Node3D.new()
	_fg.name = "Foreground"
	d.add_child(_fg)
	for spec in [[Vector3(-7.4, -0.05, 9.0), 2.0, 40.0], [Vector3(7.8, -0.05, 8.6), 1.8, -120.0]]:
		var r: Node3D = (ps as PackedScene).instantiate()
		r.position = spec[0]
		r.scale = Vector3.ONE * float(spec[1])
		r.rotation_degrees.y = spec[2]
		_fg.add_child(r)
	_fg.visible = k > 0.6

# ---- set 217 sample R19 (owner L2 + L3)'''),
])
print("P1 patched", g)
