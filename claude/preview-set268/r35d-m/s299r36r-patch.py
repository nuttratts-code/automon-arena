# set 299 round 36r (sample, after s299r36q): owner picked ข (soft) → "blend smoother · the card frame takes the colours too ·
#   the creature looks set deeper inside, like a card"
#   S299FOOT=2 now = one smooth horizontal blend through every shade (stops at each shade's centre) + light-top/dark-bottom overlay
#   env S299CARD=1 = coloured inner frame (same blend, full colour, 2 px, cut corners) + recess (inner shadow on all four sides)
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pp = g / "scripts/ui/s299_prep.gd"; s = pp.read_text(encoding="utf-8")
old = "	draw_set_transform(Vector2(0, size.y - h))   # _ready forces full rect: draw the strip at the bottom\n"
assert s.count(old) == 1
s = s.replace(old, """	if OS.get_environment("S299CARD") == "1":   # r36r: recess + coloured frame (whole card, before the strip)
		_card_deco(cols, rc, pw)
""" + old + """	if fv == 2:   # r36r: one smooth blend
		_foot2(cols, rc, pw, w, h)
		draw_set_transform(Vector2.ZERO)
		return
""")
s += '''
func _stops(cols: Array, rc: Color, pw: float, w: float) -> Array:   # r36r: [x, colour] at each shade's centre
	var lw := w - pw
	var st := [[0.0, cols[0] if cols.size() > 0 else rc]]
	for i in cols.size():
		st.append([lw * (i + 0.5) / cols.size(), cols[i]])
	st.append([lw + pw * 0.5, rc])
	st.append([w, rc])
	return st

func _col_at(st: Array, x: float) -> Color:
	for i in st.size() - 1:
		var a: Array = st[i]
		var b: Array = st[i + 1]
		if x <= float(b[0]):
			var t := clampf((x - float(a[0])) / maxf(0.001, float(b[0]) - float(a[0])), 0.0, 1.0)
			t = t * t * (3.0 - 2.0 * t)   # smoothstep: no hard seam
			return (a[1] as Color).lerp(b[1] as Color, t)
	return st[st.size() - 1][1]

func _foot2(cols: Array, rc: Color, pw: float, w: float, h: float) -> void:   # r36r: smooth blend strip
	var st := _stops(cols, rc, pw, w)
	var k := 5.0
	var n := 24
	for i in n:
		var x0 := w * i / n
		var x1 := w * (i + 1) / n
		var c0 := _col_at(st, x0).darkened(0.42)
		var c1 := _col_at(st, x1).darkened(0.42)
		c0.a = 0.94
		c1.a = 0.94
		var p := PackedVector2Array([Vector2(x0, 0), Vector2(x1, 0)])
		var cc := PackedColorArray([c0, c1])
		if x1 > w - k:   # the card's bottom-right cut
			var yb := h - (x1 - (w - k))
			p.append_array([Vector2(x1, yb)])
			cc.append(c1)
			if x0 > w - k:
				p.append(Vector2(x0, h - (x0 - (w - k))))
				cc.append(c0)
			else:
				p.append_array([Vector2(w - k, h), Vector2(x0, h)])
				cc.append_array([_col_at(st, w - k).darkened(0.42), c0])
		else:
			p.append_array([Vector2(x1, h), Vector2(x0, h)])
			cc.append_array([c1, c0])
		draw_polygon(p, cc)
	draw_polygon(PackedVector2Array([Vector2(0, 0), Vector2(w, 0), Vector2(w, h * 0.5), Vector2(0, h * 0.5)]),
		PackedColorArray([Color(1, 1, 1, 0.10), Color(1, 1, 1, 0.10), Color(1, 1, 1, 0), Color(1, 1, 1, 0)]))
	draw_line(Vector2(0, 0.5), Vector2(w, 0.5), Color(0, 0, 0, 0.55), 1.0)

func _card_deco(cols: Array, rc: Color, pw: float) -> void:   # r36r: creature sits deeper + frame in the card's colours
	var w := size.x
	var h := size.y
	var sh := Color(0, 0, 0, 0.6)
	var z := Color(0, 0, 0, 0)
	var d := 14.0
	draw_polygon(PackedVector2Array([Vector2(0, 0), Vector2(w, 0), Vector2(w, d), Vector2(0, d)]), PackedColorArray([sh, sh, z, z]))
	draw_polygon(PackedVector2Array([Vector2(0, 0), Vector2(d, 0), Vector2(d, h), Vector2(0, h)]), PackedColorArray([sh, z, z, sh]))
	draw_polygon(PackedVector2Array([Vector2(w - d, 0), Vector2(w, 0), Vector2(w, h), Vector2(w - d, h)]), PackedColorArray([z, sh, sh, z]))
	var st := _stops(cols, rc, pw, w)
	var p := _pts(Rect2(Vector2.ZERO, size).grow(-1.0), 5.0, 5.0)
	p.append(p[0])
	var cv := PackedColorArray()
	for q in p:
		var c := _col_at(st, q.x).lightened(0.10)
		c.a = 0.95
		cv.append(c)
	draw_polyline_colors(p, cv, 2.0)
	var pi := _pts(Rect2(Vector2.ZERO, size).grow(-3.0), 4.0, 4.0)
	pi.append(pi[0])
	draw_polyline(pi, Color(0, 0, 0, 0.55), 1.0)
'''
pp.write_text(s, encoding="utf-8")
print("ok r36r")
