# set 299 round 35z20 (sample, after s299r35z19): thinner ring on the S299ICO=6 symbols (env S299OW = ring radius px, default 0.5; z16 = 1)
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"; s = p.read_text(encoding="utf-8")
old = ('\t\t\t\t\tvar nc := Color(0.02, 0.03, 0.04, a)\n'
       '\t\t\t\t\tfor dv in [Vector2(-1, 0), Vector2(1, 0), Vector2(0, -1), Vector2(0, 1), Vector2(-0.7, -0.7), Vector2(0.7, -0.7), Vector2(-0.7, 0.7), Vector2(0.7, 0.7)]:\n'
       '\t\t\t\t\t\t_ic_layer.draw_texture_rect(f, Rect2(r.position + dv, r.size), false, nc)\n')
assert s.count(old) == 1
new = ('\t\t\t\t\tvar nc := Color(0.02, 0.03, 0.04, a)\n'
       '\t\t\t\t\tvar ow := float(OS.get_environment("S299OW")) if OS.get_environment("S299OW") != "" else 0.5   # s299 r35z20\n'
       '\t\t\t\t\tfor dv in [Vector2(-1, 0), Vector2(1, 0), Vector2(0, -1), Vector2(0, 1), Vector2(-0.7, -0.7), Vector2(0.7, -0.7), Vector2(-0.7, 0.7), Vector2(0.7, 0.7)]:\n'
       '\t\t\t\t\t\t_ic_layer.draw_texture_rect(f, Rect2(r.position + dv * ow, r.size), false, nc)\n')
s = s.replace(old, new)
p.write_text(s, encoding="utf-8"); print("ok")
