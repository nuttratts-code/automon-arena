# set 299 round 35z23 (sample, after s299r35z22): speed button ▶ in our cut-corner shape, to match the pause bars (owner A4)
#   env S299FF (default 0 = old texture, owner kept it; 1–3 = variants): own triangle polygons, same height / white fill / dark rim 1.5 px as the pause bars
#     1 = top-left corner cut · 2 = top-left cut + tip cut flat · 3 = top-left + bottom-left cut (left side cut like the bars)
#   2x = 1 triangle, 4x = 2, 8x = 3 (same rule as before), overlapping like the old ff texture
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pi = g / "scripts/ui/s268_icon.gd"; s = pi.read_text(encoding="utf-8")
old = '\tfor i in keys.size():\n\t\tvar r := Rect2(x0 + step * float(i), y0, s, s)\n\t\tvar o := TEAM.icon_tex(String(keys[i]) + "_o")\n'
assert s.count(old) == 1
new = '''\tvar ff299 := OS.get_environment("S299FF")
\tif kind == "ff" and ff299 in ["1", "2", "3"]:   # s299 r35z23: cut-corner speed triangles
\t\tvar v := int(ff299)
\t\tvar n := {1: 1, 2: 1, 4: 2, 8: 3, 16: 4}.get(speed, 1) as int
\t\tvar th := roundf(s * 0.64)
\t\tvar fw := roundf(s * 0.52)
\t\tvar pitch := roundf(fw * 0.62)
\t\tvar all := fw + pitch * float(n - 1)
\t\tvar tx := roundf((size.x - all) * 0.5)
\t\tvar ty := roundf((size.y - th) * 0.5)
\t\tvar k := roundf(s * 0.20 * 0.45) + 0.5
\t\tvar polys: Array = []
\t\tfor j in n:
\t\t\tvar A := Vector2(tx + pitch * float(j), ty)
\t\t\tvar B := Vector2(A.x + fw, ty + th * 0.5)
\t\t\tvar C := Vector2(A.x, ty + th)
\t\t\tvar p := PackedVector2Array()
\t\t\tp.append(A + Vector2(0, k))
\t\t\tp.append(A + (B - A).normalized() * k * 1.4)
\t\t\tif v == 2:
\t\t\t\tp.append(B + (A - B).normalized() * k)
\t\t\t\tp.append(B + (C - B).normalized() * k)
\t\t\telse:
\t\t\t\tp.append(B)
\t\t\tif v == 3:
\t\t\t\tp.append(C + (B - C).normalized() * k * 1.4)
\t\t\t\tp.append(C - Vector2(0, k))
\t\t\telse:
\t\t\t\tp.append(C)
\t\t\tpolys.append(p)
\t\tfor p in polys:
\t\t\tfor ro in Geometry2D.offset_polygon(p, 1.5, Geometry2D.JOIN_MITER):
\t\t\t\tdraw_colored_polygon(ro, Color(OUT, OUT.a * a))
\t\tfor p in polys:
\t\t\tdraw_colored_polygon(p, Color(fillc, a))
\t\t_word(on, a)
\t\treturn
''' + old
s = s.replace(old, new)
pi.write_text(s, encoding="utf-8")
print("ok z23")
