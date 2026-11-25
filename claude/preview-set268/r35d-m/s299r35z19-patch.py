# set 299 round 35z19 (sample, after s299r35z18): with S299ARM on
#   card chips back to the pre-z18 grid (chip column measured with the old 7 px symbol + 7 px digits)
#   HP bar: no white armour part (bar scaled by max HP only); the shield + number at the bar end shows armour
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"; s = p.read_text(encoding="utf-8")
old1 = '\t\t\t\tvar c0 := L + isz + 1.0 + mf.get_string_size("8.8M", HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x\n'
assert s.count(old1) == 1
s = s.replace(old1, '\t\t\t\tvar c0 := L + (7.0 if ARM299 else isz) + 1.0 + mf.get_string_size("8.8M", HORIZONTAL_ALIGNMENT_LEFT, -1, 7 if ARM299 else fs).x   # s299 r35z19: old chip grid\n')
old2 = '\tvar sc287 := BAR_W * (1.0 - cut) / maxf(mx, hp + arm287)'
assert s.count(old2) == 1
s = s.replace(old2, '\tvar sc287 := BAR_W * (1.0 - cut) / (mx if ARM299 else maxf(mx, hp + arm287))')
old3 = '\tif aw287 > 0.0: draw_rect(Rect2(x0 + hw, y0, aw287, HP_H), Color(0.93, 0.93, 0.9, 0.95))\n'
assert s.count(old3) == 1
s = s.replace(old3, '\tif aw287 > 0.0 and not ARM299: draw_rect(Rect2(x0 + hw, y0, aw287, HP_H), Color(0.93, 0.93, 0.9, 0.95))   # s299 r35z19: no white part\n')
p.write_text(s, encoding="utf-8"); print("ok")
