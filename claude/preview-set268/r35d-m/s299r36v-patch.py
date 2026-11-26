# set 299 round 36v (sample, after s299r36u): owner (crop of r36s card 1) "start again from this look, but the name
#   background takes the SAME colour as the frame, and remove the line between frame and name background = one piece"
#   S299ONE=4 (new default): r36s look (black recess, lit frame = blend lightened 0.10) + strip in that exact frame colour
#   (no darkening, a 0.95, 10 px fade up into the art) + frame drawn on top in the same colour + the dark inner line only
#   above the strip, fading out before it (no line between frame and strip)
import sys, pathlib, shutil
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pp = g / "scripts/ui/s299_prep.gd"
shutil.copy(pp, g / "bak286_s299_prep.gd.s299r36u")
s = pp.read_text(encoding="utf-8")
old = '			one = "3"   # r36u default\n'
assert s.count(old) == 1
s = s.replace(old, '			one = "4"   # r36v default (r36u = 3)\n')
old = '		if one != "0":   # r36t: frame + strip one piece\n'
assert s.count(old) == 1
s = s.replace(old, """		if one == "4":   # r36v: strip = frame colour, one piece
			if card:
				_recess()
			_strip_one(cols, rc, pw, h, card)
			return
""" + old)
s += '''
func _fcol(st: Array, x: float, a: float) -> Color:   # r36v: the frame colour (r36s frame)
	var c := _col_lin(st, x).lightened(0.10)
	c.a = a
	return c

func _strip_one(cols: Array, rc: Color, pw: float, h: float, card: bool) -> void:   # r36v
	var st := _stops2(cols, rc, pw)
	var w := size.x
	var y0 := size.y - h
	var f := 10.0
	var k := 5.0
	var ys := [-f, -f * 0.6, -f * 0.25, 0.0, h]
	var al := [0.0, 0.22, 0.6, 0.95, 0.95]
	var n := 64
	for i in n:
		var x0 := w * i / n
		var x1 := w * (i + 1) / n
		var b0 := h - maxf(0.0, x0 - (w - k))
		var b1 := h - maxf(0.0, x1 - (w - k))
		for r in ys.size() - 1:
			var ya: float = ys[r]
			var yb: float = ys[r + 1]
			draw_polygon(PackedVector2Array([Vector2(x0, y0 + ya), Vector2(x1, y0 + ya), Vector2(x1, y0 + minf(yb, b1)), Vector2(x0, y0 + minf(yb, b0))]),
				PackedColorArray([_fcol(st, x0, al[r]), _fcol(st, x1, al[r]), _fcol(st, x1, al[r + 1]), _fcol(st, x0, al[r + 1])]))
	if not card:
		return
	var p := _pts(Rect2(Vector2.ZERO, size).grow(-1.0), 5.0, 5.0)
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
		cv.append(_fcol(st, v.x, 0.95))
	draw_polyline_colors(q, cv, 2.0)
	# dark inner line: top + sides only, fading out before the strip
	var e := 3.0
	var yf := y0 - f
	var line := PackedVector2Array([Vector2(e, yf), Vector2(e, yf - f), Vector2(e, e + 4.0), Vector2(e + 4.0, e),
		Vector2(w - e, e), Vector2(w - e, yf - f), Vector2(w - e, yf)])
	var dk := Color(0, 0, 0, 0.55)
	var lc := PackedColorArray([Color(0, 0, 0, 0), dk, dk, dk, dk, dk, Color(0, 0, 0, 0)])
	draw_polyline_colors(line, lc, 1.0)
'''
pp.write_text(s, encoding="utf-8")
print("ok r36v")
