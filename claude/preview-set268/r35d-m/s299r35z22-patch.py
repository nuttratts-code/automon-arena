# set 299 round 35z22 (sample, after s299r35z21): pause button + HP bar in our 2-cut-corner shape, colours kept (owner B2)
#   env S299PZ (default on, 0 = old): pause || = two bars cut top-left + bottom-right (own polygons, white fill + dark rim)
#   env S299HB (default on, 0 = old): HP bar frame cut top-left + bottom-right; green / orange fill cut at its top-left
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pi = g / "scripts/ui/s268_icon.gd"; s = pi.read_text(encoding="utf-8")
old = '\tfor i in keys.size():\n\t\tvar r := Rect2(x0 + step * float(i), y0, s, s)\n\t\tvar o := TEAM.icon_tex(String(keys[i]) + "_o")\n'
assert s.count(old) == 1
new = ('\tif kind == "pause" and OS.get_environment("S299PZ") != "0":   # s299 r35z22: cut-corner pause bars\n'
       '\t\tvar bh := roundf(s * 0.64)
		var bw := roundf(s * 0.20)\n'
       '\t\tvar gap := roundf(s * 0.12)\n'
       '\t\tvar bx := roundf((size.x - (bw * 2.0 + gap)) * 0.5)\n'
       '\t\tvar k := roundf(bw * 0.45)\n'
       '\t\tfor j in 2:\n'
       '\t\t\tvar br := Rect2(bx + float(j) * (bw + gap), roundf((size.y - bh) * 0.5), bw, bh)\n'
       '\t\t\tvar ro := TEAM._cutpts299(br.grow(1.5), k + 1.0)\n'
       '\t\t\tdraw_colored_polygon(ro, Color(OUT, OUT.a * a))\n'
       '\t\t\tdraw_colored_polygon(TEAM._cutpts299(br, k), Color(fillc, a))\n'
       '\t\t_word(on, a)\n'
       '\t\treturn\n') + old
s = s.replace(old, new)
pi.write_text(s, encoding="utf-8")
pt = g / "scripts/ui/s286_team.gd"; t = pt.read_text(encoding="utf-8")
if "\nfunc _cutpts299(" in t and "\nstatic func _cutpts299(" not in t:
	t = t.replace("\nfunc _cutpts299(", "\nstatic func _cutpts299(")   # callable from the icon script
old2 = ('\t_soft_rect(Rect2(x0 - 1.0, y0 - 1.0, BAR_W + 2.0, full + 2.0), Color(0.07, 0.06, 0.05, 0.62))\n')
assert t.count(old2) == 1
new2 = ('\tvar HB299 := OS.get_environment("S299HB") != "0"   # s299 r35z22: cut-corner HP bar\n'
        '\tif HB299: draw_colored_polygon(_cutpts299(Rect2(x0 - 1.0, y0 - 1.0, BAR_W + 2.0, full + 2.0), 2.5), Color(0.07, 0.06, 0.05, 0.62))\n'
        '\telse: _soft_rect(Rect2(x0 - 1.0, y0 - 1.0, BAR_W + 2.0, full + 2.0), Color(0.07, 0.06, 0.05, 0.62))\n')
t = t.replace(old2, new2)
old3 = ('\tif hw > 0.0: _soft_rect(Rect2(x0, y0, hw, HP_H), Color("#5e9a45", 0.97) if fr > 0.3 else Color("#bf8530", 0.97))\n')
assert t.count(old3) == 1
new3 = ('\tif hw > 0.0:\n'
        '\t\tvar hc := Color("#5e9a45", 0.97) if fr > 0.3 else Color("#bf8530", 0.97)\n'
        '\t\tif HB299 and hw >= 3.0: draw_colored_polygon(PackedVector2Array([Vector2(x0 + 1.5, y0), Vector2(x0 + hw, y0), Vector2(x0 + hw, y0 + HP_H), Vector2(x0, y0 + HP_H), Vector2(x0, y0 + 1.5)]), hc)\n'
        '\t\telse: _soft_rect(Rect2(x0, y0, hw, HP_H), hc)\n')
t = t.replace(old3, new3)
pt.write_text(t, encoding="utf-8"); print("ok")
