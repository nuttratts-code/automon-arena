# set 299 round 35z15 (sample, after s299r35z14): outline variants for burn / shock / armour symbols
#   env S299ICO: 0 = old (z12) · 1 = z13 near-black opaque, 1 px wider (default) · 2 = near-black 0.55, wider
#   3 = near-black opaque, normal width · 4 = deep navy #0e1a26 opaque, normal width · 5 = own hue darkened, normal width
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"; s = p.read_text(encoding="utf-8")
old = ('\t\t\tif o != null:\n'
       '\t\t\t\tfor dv in [Vector2(-0.7, 0), Vector2(0.7, 0), Vector2(0, -0.7), Vector2(0, 0.7)]:\n'
       '\t\t\t\t\t_ic_layer.draw_texture_rect(o, Rect2(r.position + dv, r.size), false, Color(0.03, 0.04, 0.05, a))\n')
assert s.count(old) == 1
new = ('\t\t\tif o != null:   # s299 r35z15: outline variants\n'
       '\t\t\t\tvar iv := OS.get_environment("S299ICO")\n'
       '\t\t\t\tvar oc := Color(0.03, 0.04, 0.05, a)\n'
       '\t\t\t\tif iv == "2": oc.a = 0.55 * a\n'
       '\t\t\t\telif iv == "4": oc = Color("#0e1a26", a)\n'
       '\t\t\t\telif iv == "5": oc = Color(fc.darkened(0.65), a)\n'
       '\t\t\t\tif iv in ["3", "4", "5"]:\n'
       '\t\t\t\t\t_ic_layer.draw_texture_rect(o, r, false, oc)\n'
       '\t\t\t\telse:\n'
       '\t\t\t\t\tfor dv in [Vector2(-0.7, 0), Vector2(0.7, 0), Vector2(0, -0.7), Vector2(0, 0.7)]:\n'
       '\t\t\t\t\t\t_ic_layer.draw_texture_rect(o, Rect2(r.position + dv, r.size), false, oc)\n')
s = s.replace(old, new)
p.write_text(s, encoding="utf-8"); print("ok")
