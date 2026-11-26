# set 299 round 36t (sample, after s299r36s): owner "make the whole colour panel one piece, no cut point"
#   env S299ONE (default 1; 0 = r36s): frame + strip = ONE piece: frame takes the strip's exact shade (same blend,
#   same darkening, no lightening), 3 px, no dark inner line, so frame sides run into the strip with no seam
#   S299ONE=2 = 1 + the card's inner shadow takes the same colour (inner glow of the card's colours instead of black)
import sys, pathlib, shutil
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pp = g / "scripts/ui/s299_prep.gd"
shutil.copy(pp, g / "bak286_s299_prep.gd.s299r36s")
s = pp.read_text(encoding="utf-8")
old = """		if card:
			_recess()
		draw_set_transform(Vector2(0, size.y - h))
		_foot2b(cols, rc, pw, w, h)
		draw_set_transform(Vector2.ZERO)
		if card:
			_frame2(cols, rc, pw)
		return
"""
assert s.count(old) == 1
s = s.replace(old, """		var one := OS.get_environment("S299ONE")
		if one != "0":   # r36t: frame + strip one piece
			if card:
				if one == "2":
					_recess_col(cols, rc, pw)
				else:
					_recess()
			draw_set_transform(Vector2(0, size.y - h))
			_foot2b(cols, rc, pw, w, h)
			draw_set_transform(Vector2.ZERO)
			if card:
				_frame_one(cols, rc, pw, h)
			return
""" + old)
s += '''
func _stops2(cols: Array, rc: Color, pw: float) -> Array:   # r36t: same stops as _foot2b
	var lw := size.x - pw
	var st := [[0.0, cols[0] if cols.size() > 0 else rc]]
	if cols.size() > 1:
		for i in cols.size():
			st.append([lw * (0.15 + 0.7 * i / (cols.size() - 1)), cols[i]])
	else:
		st.append([lw * 0.35, st[0][1]])
	st.append([size.x - pw * 0.4, rc])
	st.append([size.x, rc])
	return st

func _frame_one(cols: Array, rc: Color, pw: float, h: float) -> void:   # r36t: frame in the strip's own shade
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
		var c := _shade(_col_lin(st, v.x), v.y - y0, h, 0.94)
		cv.append(c)
	draw_polyline_colors(q, cv, 3.0)

func _recess_col(cols: Array, rc: Color, pw: float) -> void:   # r36t S299ONE=2: inner shadow in the card's colours
	var st := _stops2(cols, rc, pw)
	var w := size.x
	var h := size.y
	var d := 14.0
	var n := 32
	for i in n:
		var x0 := w * i / n
		var x1 := w * (i + 1) / n
		var c0 := _col_lin(st, x0).darkened(0.45)
		var c1 := _col_lin(st, x1).darkened(0.45)
		c0.a = 0.7
		c1.a = 0.7
		var z0 := Color(c0, 0.0)
		var z1 := Color(c1, 0.0)
		draw_polygon(PackedVector2Array([Vector2(x0, 0), Vector2(x1, 0), Vector2(x1, d), Vector2(x0, d)]), PackedColorArray([c0, c1, z1, z0]))
	var cl := _col_lin(st, 0.0).darkened(0.45)
	var cr := _col_lin(st, w).darkened(0.45)
	cl.a = 0.7
	cr.a = 0.7
	draw_polygon(PackedVector2Array([Vector2(0, 0), Vector2(d, 0), Vector2(d, h), Vector2(0, h)]), PackedColorArray([cl, Color(cl, 0.0), Color(cl, 0.0), cl]))
	draw_polygon(PackedVector2Array([Vector2(w - d, 0), Vector2(w, 0), Vector2(w, h), Vector2(w - d, h)]), PackedColorArray([Color(cr, 0.0), cr, cr, Color(cr, 0.0)]))
'''
pp.write_text(s, encoding="utf-8")
print("ok r36t")
