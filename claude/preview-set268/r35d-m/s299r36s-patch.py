# set 299 round 36s (sample, after s299r36r): owner "remove every add-on · make the card colours smoother, there is still a cut line"
#   S299FOOT=2 + S299FOOTV (default 2; 1 = r36r look):
#   strip: no hard top edge (10 px fade up into the art, no dark top line), 64 slices, colours blended in linear light
#   (no muddy grey middle), soft top-light inside the strip; S299CARD=1 frame drawn AFTER the strip, subdivided every 2 px
#   so its colour follows the same blend all round (no colour step on the sides), inner dark line softer
import sys, pathlib, shutil
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pp = g / "scripts/ui/s299_prep.gd"
shutil.copy(pp, g / "bak286_s299_prep.gd.s299r36r")
s = pp.read_text(encoding="utf-8")
old = """	if OS.get_environment("S299CARD") == "1":   # r36r: recess + coloured frame (whole card, before the strip)
		_card_deco(cols, rc, pw)
	draw_set_transform(Vector2(0, size.y - h))   # _ready forces full rect: draw the strip at the bottom
	if fv == 2:   # r36r: one smooth blend
"""
assert s.count(old) == 1
s = s.replace(old, """	if fv == 2 and OS.get_environment("S299FOOTV") != "1":   # r36s: smooth strip, frame after the strip
		var card := OS.get_environment("S299CARD") == "1"
		if card:
			_recess()
		draw_set_transform(Vector2(0, size.y - h))
		_foot2b(cols, rc, pw, w, h)
		draw_set_transform(Vector2.ZERO)
		if card:
			_frame2(cols, rc, pw)
		return
""" + old)
s += '''
func _col_lin(st: Array, x: float) -> Color:   # r36s: blend in linear light (no grey middle)
	for i in st.size() - 1:
		var a: Array = st[i]
		var b: Array = st[i + 1]
		if x <= float(b[0]):
			var t := clampf((x - float(a[0])) / maxf(0.001, float(b[0]) - float(a[0])), 0.0, 1.0)
			t = t * t * (3.0 - 2.0 * t)
			return (a[1] as Color).srgb_to_linear().lerp((b[1] as Color).srgb_to_linear(), t).linear_to_srgb()
	return st[st.size() - 1][1]

func _foot2b(cols: Array, rc: Color, pw: float, w: float, h: float) -> void:   # r36s
	var lw := w - pw
	var st := [[0.0, cols[0] if cols.size() > 0 else rc]]   # wide stops: tribe 1 fills the left, rarity the price end
	if cols.size() > 1:
		for i in cols.size():
			st.append([lw * (0.15 + 0.7 * i / (cols.size() - 1)), cols[i]])
	else:
		st.append([lw * 0.35, st[0][1]])
	st.append([w - pw * 0.4, rc])
	st.append([w, rc])
	var f := 10.0   # fade up into the art
	var k := 5.0    # bottom-right cut
	var ys := [-f, -f * 0.6, -f * 0.25, 0.0, h]
	var al := [0.0, 0.22, 0.6, 0.92, 0.94]
	var n := 64
	for i in n:
		var x0 := w * i / n
		var x1 := w * (i + 1) / n
		var b0 := h - maxf(0.0, x0 - (w - k))
		var b1 := h - maxf(0.0, x1 - (w - k))
		var c0 := _col_lin(st, x0)
		var c1 := _col_lin(st, x1)
		for r in ys.size() - 1:
			var ya: float = ys[r]
			var yb: float = ys[r + 1]
			var yb0 := minf(yb, b0)
			var yb1 := minf(yb, b1)
			var ca0 := _shade(c0, ya, h, al[r])
			var ca1 := _shade(c1, ya, h, al[r])
			var cb0 := _shade(c0, yb0, h, al[r + 1])
			var cb1 := _shade(c1, yb1, h, al[r + 1])
			draw_polygon(PackedVector2Array([Vector2(x0, ya), Vector2(x1, ya), Vector2(x1, yb1), Vector2(x0, yb0)]),
				PackedColorArray([ca0, ca1, cb1, cb0]))

func _shade(c: Color, y: float, h: float, a: float) -> Color:   # r36s: lit top -> darker bottom inside the strip
	var t := clampf(y / h, 0.0, 1.0)
	var o := c.darkened(lerpf(0.32, 0.52, t))
	o.a = a
	return o

func _recess() -> void:   # r36s: r36r inner shadow only
	var w := size.x
	var h := size.y
	var sh := Color(0, 0, 0, 0.6)
	var z := Color(0, 0, 0, 0)
	var d := 14.0
	draw_polygon(PackedVector2Array([Vector2(0, 0), Vector2(w, 0), Vector2(w, d), Vector2(0, d)]), PackedColorArray([sh, sh, z, z]))
	draw_polygon(PackedVector2Array([Vector2(0, 0), Vector2(d, 0), Vector2(d, h), Vector2(0, h)]), PackedColorArray([sh, z, z, sh]))
	draw_polygon(PackedVector2Array([Vector2(w - d, 0), Vector2(w, 0), Vector2(w, h), Vector2(w - d, h)]), PackedColorArray([z, sh, sh, z]))

func _frame2(cols: Array, rc: Color, pw: float) -> void:   # r36s: frame after the strip, colour every 2 px
	var lw := size.x - pw
	var st := [[0.0, cols[0] if cols.size() > 0 else rc]]
	if cols.size() > 1:
		for i in cols.size():
			st.append([lw * (0.15 + 0.7 * i / (cols.size() - 1)), cols[i]])
	else:
		st.append([lw * 0.35, st[0][1]])
	st.append([size.x - pw * 0.4, rc])
	st.append([size.x, rc])
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
		var c := _col_lin(st, v.x).lightened(0.10)
		c.a = 0.95
		cv.append(c)
	draw_polyline_colors(q, cv, 2.0)
	var pi := _pts(Rect2(Vector2.ZERO, size).grow(-3.0), 4.0, 4.0)
	pi.append(pi[0])
	draw_polyline(pi, Color(0, 0, 0, 0.35), 1.0)
'''
pp.write_text(s, encoding="utf-8")
print("ok r36s")
