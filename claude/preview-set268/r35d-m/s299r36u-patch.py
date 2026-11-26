# set 299 round 36u (sample, after s299r36t): owner on r36t "edge colour darker, and black inner edge"
#   S299ONE=3 (new default): ก (black recess) + frame darker (strip shade darkened a further 0.35) + solid black inner line (1.5 px, a 0.9)
import sys, pathlib, shutil
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pp = g / "scripts/ui/s299_prep.gd"
shutil.copy(pp, g / "bak286_s299_prep.gd.s299r36t")
s = pp.read_text(encoding="utf-8")
old = '		var one := OS.get_environment("S299ONE")\n'
assert s.count(old) == 1
s = s.replace(old, '		var one := OS.get_environment("S299ONE")\n		if one == "":\n			one = "3"   # r36u default\n')
old = """			if card:
				_frame_one(cols, rc, pw, h)
			return
"""
assert s.count(old) == 1
s = s.replace(old, """			if card:
				if one == "3":
					_frame_dark(cols, rc, pw, h)
				else:
					_frame_one(cols, rc, pw, h)
			return
""")
s += '''
func _frame_dark(cols: Array, rc: Color, pw: float, h: float) -> void:   # r36u: darker frame + black inner line
	var st := _stops2(cols, rc, pw)
	var y0 := size.y - h
	var p := _pts(Rect2(Vector2.ZERO, size).grow(-1.5), 5.0, 5.0)
	p.append(p[0])
	var q := PackedVector2Array()
	for i in p.size() - 1:
		var a: Vector2 = p[i]
		var b: Vector2 = p[i + 1]
		var m := maxi(1, int(a.distance_to(b) / 2.0))
		for j in m:
			q.append(a.lerp(b, float(j) / m))
	q.append(p[p.size() - 1])
	var cv := PackedColorArray()
	for v in q:
		var c := _shade(_col_lin(st, v.x), v.y - y0, h, 1.0).darkened(0.35)
		cv.append(c)
	draw_polyline_colors(q, cv, 3.0)
	var pi := _pts(Rect2(Vector2.ZERO, size).grow(-3.75), 4.0, 4.0)
	pi.append(pi[0])
	draw_polyline(pi, Color(0, 0, 0, 0.9), 1.5)
'''
pp.write_text(s, encoding="utf-8")
print("ok r36u")
