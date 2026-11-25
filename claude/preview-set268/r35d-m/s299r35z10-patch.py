# set 299 round 35z10 (sample, after s299r35z9c): plate colour variants for the bottom cards + detail panel — env S299PL
#   0/empty = now (teal #18262f 0.60, cool edge) · 1 warm shadow brown · 2 same teal, opaque · 3 scene navy + cream edge
#   4 dark moss (scene green) + pale edge · 5 warm stone + cream edge + dark outer line · 6 = 3 + lit from the top (gradient) + dark outer line
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")
old = ('\tvar fill := Color(Color("#1f5266"), 0.72 * a) if on else Color(Color("#18262f"), 0.60 * a)   # r35w2: a bit more see-through\n'
       '\tci.draw_colored_polygon(p, fill)\n'
       '\tci.draw_polyline(p + PackedVector2Array([p[0]]), Color(Color("#d6e8ee"), (0.75 if on else 0.34) * a), 1.0)\n')
assert old in s and "_pl299" not in s
new = ('\tvar pl := _pl299()\n'
       '\tvar fill: Color = Color(pl[1], pl[3] * a) if on else Color(pl[0], pl[2] * a)\n'
       '\tif pl[6]:   # lit from the top: top edge lighter, bottom darker\n'
       '\t\tvar cols := PackedColorArray()\n'
       '\t\tfor q in p:\n'
       '\t\t\tvar t := clampf((q.y - r.position.y) / maxf(1.0, r.size.y), 0.0, 1.0)\n'
       '\t\t\tcols.append(Color(fill.lightened(0.16 * (1.0 - t)).darkened(0.18 * t), fill.a))\n'
       '\t\tci.draw_polygon(p, cols)\n'
       '\telse:\n'
       '\t\tci.draw_colored_polygon(p, fill)\n'
       '\tif pl[7]:   # dark outer line 1 px outside the light edge (pixel-style double border)\n'
       '\t\tvar po := _cutpts299(r.grow(1.0), 6.0)\n'
       '\t\tci.draw_polyline(po + PackedVector2Array([po[0]]), Color(0.05, 0.05, 0.06, 0.85 * a), 1.0)\n'
       '\tci.draw_polyline(p + PackedVector2Array([p[0]]), Color(pl[4], (pl[5] + 0.38 if on else pl[5]) * a), 1.0)\n')
s = s.replace(old, new)
old2 = '\t_pn_layer.draw_colored_polygon(bp, Color("#1f5266", 0.92))\n\t_pn_layer.draw_polyline(bp + PackedVector2Array([bp[0]]), Color("#d6e8ee", 0.8), 1.0)\n'
assert old2 in s
s = s.replace(old2, '\t_pn_layer.draw_colored_polygon(bp, Color(_pl299()[1], 0.92))\n\t_pn_layer.draw_polyline(bp + PackedVector2Array([bp[0]]), Color(_pl299()[4], 0.8), 1.0)\n')
s = s.rstrip("\n") + '''

# ---------- s299 r35z10: S299PL plate colour variants ----------
# [fill, fill picked, alpha, alpha picked, edge colour, edge alpha, top-lit gradient, dark outer line]
static func _pl299() -> Array:
\tmatch OS.get_environment("S299PL"):
\t\t"1": return [Color("#2a241c"), Color("#4a3b26"), 0.82, 0.88, Color("#e6dcc0"), 0.40, false, false]
\t\t"2": return [Color("#18262f"), Color("#1f5266"), 0.86, 0.90, Color("#d6e8ee"), 0.34, false, false]
\t\t"3": return [Color("#16283a"), Color("#24425a"), 0.82, 0.88, Color("#e6dcc0"), 0.40, false, false]
\t\t"4": return [Color("#1f2a22"), Color("#2f4636"), 0.82, 0.88, Color("#dfe6c8"), 0.40, false, false]
\t\t"5": return [Color("#2e2b25"), Color("#4d473a"), 0.86, 0.90, Color("#f0e6cc"), 0.45, false, true]
\t\t"6": return [Color("#16283a"), Color("#24425a"), 0.84, 0.90, Color("#e6dcc0"), 0.45, true, true]
\treturn [Color("#18262f"), Color("#1f5266"), 0.60, 0.72, Color("#d6e8ee"), 0.34, false, false]
'''
p.write_text(s, encoding="utf-8")
print("ok")
