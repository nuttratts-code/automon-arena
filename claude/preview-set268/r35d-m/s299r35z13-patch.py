# set 299 round 35z13 (sample, after s299r35z12): crisper burn / shock / armour symbols (env S299ICO=0 = old)
#   dark outline drawn fully opaque and 1 px wider (4 offset copies), symbol fill = the bright status hue (same as the numbers)
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"; s = p.read_text(encoding="utf-8")
old = ('\t\tif o != null: _ic_layer.draw_texture_rect(o, r, false, Color(OUT, OUT.a * a))\n'
       '\t\tif f != null: _ic_layer.draw_texture_rect(f, r, false, Color(q[2], a))\n')
assert s.count(old) == 1
new = ('\t\tif OS.get_environment("S299ICO") != "0":   # s299 r35z13: opaque, wider outline + bright status hue\n'
       '\t\t\tvar kq := String(q[1])\n'
       '\t\t\tvar fc: Color = NUM299[kq] if NUM299.has(kq) else Color(q[2]).lightened(0.15)\n'
       '\t\t\tif o != null:\n'
       '\t\t\t\tfor dv in [Vector2(-0.7, 0), Vector2(0.7, 0), Vector2(0, -0.7), Vector2(0, 0.7)]:\n'
       '\t\t\t\t\t_ic_layer.draw_texture_rect(o, Rect2(r.position + dv, r.size), false, Color(0.03, 0.04, 0.05, a))\n'
       '\t\t\tif f != null: _ic_layer.draw_texture_rect(f, r, false, Color(fc, a))\n'
       '\t\telse:\n'
       '\t\t\tif o != null: _ic_layer.draw_texture_rect(o, r, false, Color(OUT, OUT.a * a))\n'
       '\t\t\tif f != null: _ic_layer.draw_texture_rect(f, r, false, Color(q[2], a))\n')
s = s.replace(old, new)
p.write_text(s, encoding="utf-8"); print("ok")
