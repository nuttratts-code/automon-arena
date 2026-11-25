# set 299 round 35z16 (sample, after s299r35z15): S299ICO=6 = symbol matches its number
#   card symbols: drawn ink height = digit height (IBM Plex Mono cap 0.698 em; icon ink = 0.78 of its canvas),
#   centred on the digits; outline = the number's own outline (fill shape in the number-outline colour, 1 px ring, 8 offsets)
#   other symbols (panel shield …) get the same outline, size unchanged
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"; s = p.read_text(encoding="utf-8")
old1 = ('\tvar mf: Font = TH.font("mono")\n'
        '\t_ic_q.append([Rect2(x, y, isz, isz), kd, ICON_COL.get(kd, INK), a])\n')
assert s.count(old1) == 1
new1 = ('\tvar mf: Font = TH.font("mono")\n'
        '\tif OS.get_environment("S299ICO") == "6":   # s299 r35z16: symbol ink height = digit height\n'
        '\t\tvar cap := float(fs) * 0.698\n'
        '\t\tvar rs := cap / 0.78\n'
        '\t\tvar cy := y + isz * 0.5 + float(fs) * 0.36 - cap * 0.5\n'
        '\t\t_ic_q.append([Rect2(x + (isz - rs) * 0.5, cy - rs * 0.5, rs, rs), kd, ICON_COL.get(kd, INK), a])\n'
        '\telse:\n'
        '\t\t_ic_q.append([Rect2(x, y, isz, isz), kd, ICON_COL.get(kd, INK), a])\n')
s = s.replace(old1, new1)
old2 = ('\t\t\t\tif iv in ["3", "4", "5"]:\n'
        '\t\t\t\t\t_ic_layer.draw_texture_rect(o, r, false, oc)\n')
assert s.count(old2) == 1
new2 = ('\t\t\t\tif iv == "6" and f != null:   # s299 r35z16: same ring as the number outline (1 px, opaque)\n'
        '\t\t\t\t\tvar nc := Color(0.02, 0.03, 0.04, a)\n'
        '\t\t\t\t\tfor dv in [Vector2(-1, 0), Vector2(1, 0), Vector2(0, -1), Vector2(0, 1), Vector2(-0.7, -0.7), Vector2(0.7, -0.7), Vector2(-0.7, 0.7), Vector2(0.7, 0.7)]:\n'
        '\t\t\t\t\t\t_ic_layer.draw_texture_rect(f, Rect2(r.position + dv, r.size), false, nc)\n'
        '\t\t\t\telif iv in ["3", "4", "5"]:\n'
        '\t\t\t\t\t_ic_layer.draw_texture_rect(o, r, false, oc)\n')
s = s.replace(old2, new2)
p.write_text(s, encoding="utf-8"); print("ok")
