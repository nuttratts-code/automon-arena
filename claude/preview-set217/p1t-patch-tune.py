# set 217 P1-tune (sample copy only), run AFTER p1-patch-depth.py: python -I p1t-patch-tune.py <g>
# owner picked T1 + T2 + T3 + T4:
#  T1 fog: blue-grey haze (#a9bccd light) at 0.45 instead of the pale sky-horizon colour at 0.6 -> far hills keep their shape
#  T2 more sky: plateau drop starts at r 20 (was 24) and ends at 45 (was 55); hill peaks lowered to 15 % / 20 % from the top
#  T3 cliff lip: rock_cliff_hy pieces along the plateau edge (r ~22), tops just above the slope = a rocky rim
#  T4 landmark: the hidden "Arch" mesh of the old Blender plaza (runeplaza.glb, own work set 215) on the near hill line
import sys, os
g = sys.argv[1]

def patch(rel, pairs):
    p = os.path.join(g, rel)
    s = open(p, encoding="utf-8", newline="").read()
    crlf = "\r\n" in s
    s = s.replace("\r\n", "\n")
    for a, b in pairs:
        assert a in s, (rel, a[:70])
        s = s.replace(a, b, 1)
    if crlf:
        s = s.replace("\n", "\r\n")
    open(p, "w", encoding="utf-8", newline="").write(s)

patch("scenes/arena_dressing_r6.tscn", [
    ("60.0 * smoothstep(24.0, 55.0, r)", "60.0 * smoothstep(20.0, 45.0, r)"),
])
patch("scripts/ui/stage3d.gd", [
    ("\tenv.fog_light_color = sky_mat.sky_horizon_color\n",
     "\tenv.fog_light_color = sky_mat.sky_horizon_color if dark else Color(\"#a9bccd\") # P1t T1\n"),
    ("\tenv.fog_density = 0.6 #", "\tenv.fog_density = 0.6 if dark else 0.45 # P1t T1 ·"),
    ('Vector3(0, -24.6, -200)', 'Vector3(0, -28.3, -200)'),
    ('Vector3(10, -14.7, -110)', 'Vector3(10, -16.6, -110)'),
    ("\t\t\t_p1_far(d), CONNECT_ONE_SHOT)\n",
     "\t\t\t_p1_far(d)\n\t\t\t_p1t_rim(d)\n\t\t\t_p1t_arch(d), CONNECT_ONE_SHOT)\n"),
    ("func _p1_fg(d: Node) -> void:",
     '''static func p1_drop(x: float, z: float) -> float: # = the ground shader in arena_dressing_r6.tscn (change both)
	var r := Vector2(x * 0.85, z + 2.0).length()
	return 60.0 * smoothstep(20.0, 45.0, r)

func _p1t_rim(d: Node) -> void:
	var ps: Variant = load("res://art/s217/3d/rock_cliff_hy.glb")
	if not (ps is PackedScene):
		return
	var rim := Node3D.new()
	rim.name = "CliffRim"
	d.add_child(rim)
	var i := 0
	for a in [-64.0, -46.0, -30.0, -15.0, 0.0, 14.0, 29.0, 45.0, 62.0]:
		var rr := 22.5 + 1.2 * float(i % 3)
		var x := sin(deg_to_rad(a)) * rr / 0.85
		var z := -2.0 - cos(deg_to_rad(a)) * rr
		var r: Node3D = (ps as PackedScene).instantiate()
		r.position = Vector3(x, -0.15 - p1_drop(x, z) - 1.2, z)
		r.scale = Vector3(4.2 + 0.6 * float(i % 2), 3.2 + 0.8 * float(i % 3), 4.2)
		r.rotation_degrees.y = a + 90.0 + 37.0 * float(i)
		rim.add_child(r)
		i += 1

func _p1t_arch(d: Node) -> void:
	var p3 := get_node_or_null("Plaza3D")
	if p3 == null:
		return
	var src: MeshInstance3D = null
	for mi in p3.find_children("*", "MeshInstance3D", true, false):
		var nm := String(mi.name) + "|" + String(mi.get_parent().name)
		if nm.begins_with("Arch") or nm.contains("|Arch"):
			src = mi
			break
	if src == null:
		print("P1T no Arch mesh")
		return
	var arch := MeshInstance3D.new()
	arch.name = "LandmarkArch"
	arch.mesh = src.mesh
	arch.material_override = src.material_override
	arch.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var bb := src.mesh.get_aabb()
	var ks := 4.0 / maxf(bb.size.y, 0.01) # about 4 m tall, standing on the near hill line right of centre
	arch.scale = Vector3.ONE * ks
	arch.position = Vector3(22.0, -15.2 - bb.position.y * ks, -104.0) - Vector3(bb.get_center().x, 0, bb.get_center().z) * ks
	d.add_child(arch)
	print("P1T arch ", bb, " k ", ks)

func _p1_fg(d: Node) -> void:'''),
])
print("P1t patched", g)
