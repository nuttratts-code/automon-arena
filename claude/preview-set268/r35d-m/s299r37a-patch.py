# set 299 round 37a (sample, after s299r36z): owner on the r36z frame sheet: "the light never shows on the left side / top ·
#   the dark corner (top-left + bottom-right) pokes out past the frame · make everything end flush"
#   causes: (1) the coloured frame lived only inside hold299 (inset 3/2 px in the cell), so a dark ring of plate fill +
#   the plate's own black outline (sides + cut diagonals, none on top/bottom) stayed outside it -> black corners poked out;
#   (2) the r36z light mask used the cell edge, ~7 screen px off the real frame.
#   fix (S299ONE=5 + S299CARD=1): one static painter frame_cell() draws strip + coloured ring + bevel in CELL coords;
#   slot_cell draws it under everything (no plate edge, no black outline), the hold overlay draws the very same thing on top
#   (draw_set_transform(-hold offset), clipped by the hold) -> one frame from the cell's outer edge, 6 px wide, cut 6
import sys, pathlib, shutil
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
for f in ["s299_prep.gd", "slot_cell.gd", "prep.gd"]:
	shutil.copy(g / "scripts/ui" / f, g / ("bak286_" + f + ".s299r36z"))
# prep.gd: the cell knows its foot node
pp = g / "scripts/ui/prep.gd"; s = pp.read_text(encoding="utf-8")
old = '			ft299.set_meta("pw", 22.0)\n'
assert s.count(old) == 1
s = s.replace(old, old + '			cell.set_meta("ft299", ft299)   # r37a: the cell paints the outer part of the same frame\n')
pp.write_text(s, encoding="utf-8")
# slot_cell.gd: shop card with a foot node -> flush frame instead of the plate edge
pp = g / "scripts/ui/slot_cell.gd"; s = pp.read_text(encoding="utf-8")
old = '	_PZ299.plate(self, Rect2(Vector2.ZERO, size), 6.0 if _pz299["shop"] else 5.0, picked, 1.0 if f else 0.45, edge, ew)\n'
assert s.count(old) == 1
s = s.replace(old, '''	if _pz299["shop"] and has_meta("ft299") and OS.get_environment("S299CARD") == "1" and OS.get_environment("S299ONE") in ["", "5"]:   # r37a
		var ft: Control = get_meta("ft299")
		if is_instance_valid(ft):
			_PZ299.frame_cell(self, ft.get_meta("cols", []), ft.get_meta("rc", Color(0.5, 0.5, 0.5)), ft.get_meta("pw", 22.0), size, ft.get_meta("fh", 21.0) + 2.0, true)
			return
''' + old)
pp.write_text(s, encoding="utf-8")
# s299_prep.gd: the painter + the overlay uses it
pp = g / "scripts/ui/s299_prep.gd"; s = pp.read_text(encoding="utf-8")
old = '			_card_shine(cols, rc, pw, h, card, maxi(1, int(OS.get_environment("S299SHINE"))))\n			return\n'
assert s.count(old) == 1
s = s.replace(old, '''			var cl := get_parent().get_parent() as Control if get_parent() != null else null
			if card and cl != null and cl.has_meta("ft299"):   # r37a: same painter as the cell, in cell coords
				var o := (get_parent() as Control).position
				draw_set_transform(-o)
				frame_cell(self, cols, rc, pw, cl.size, h + o.y, false)
				draw_set_transform(Vector2.ZERO)
				return
''' + old)
s += '''
# r37a: one painter for the shop card's colour frame, in CELL coords (cell = slot_cell, card cut 6 like the plate)
static func _s_lin(st: Array, x: float) -> Color:
	for i in st.size() - 1:
		var a: Array = st[i]
		var b: Array = st[i + 1]
		if x <= float(b[0]):
			var t := clampf((x - float(a[0])) / maxf(0.001, float(b[0]) - float(a[0])), 0.0, 1.0)
			t = t * t * (3.0 - 2.0 * t)
			return (a[1] as Color).srgb_to_linear().lerp((b[1] as Color).srgb_to_linear(), t).linear_to_srgb()
	return st[st.size() - 1][1]

static func _s_cs(st: Array, x: float, y: float, ch: float) -> Color:   # boosted colour + one metal ramp over the card height
	var c0 := _s_lin(st, x)
	var c := Color.from_hsv(c0.h, minf(1.0, c0.s * 1.25), minf(1.0, c0.v * 1.1), 1.0)
	var t := clampf(y / ch, 0.0, 1.0)
	return c.lightened(0.12 * (1.0 - t)) if t < 0.5 else c.darkened(0.28 * (t - 0.5) * 2.0)

static func frame_cell(ci: CanvasItem, cols: Array, rc: Color, pw: float, cs: Vector2, hs: float, under: bool) -> void:
	var w := cs.x
	var ch := cs.y
	var k := 6.0
	var fw := 6.0   # ring width from the outer edge
	var lw := w - pw
	var st := [[0.0, cols[0] if cols.size() > 0 else rc]]
	if cols.size() > 1:
		for i in cols.size():
			st.append([lw * (0.15 + 0.7 * i / (cols.size() - 1)), cols[i]])
	else:
		st.append([lw * 0.35, st[0][1]])
	st.append([w - pw * 0.4, rc])
	st.append([w, rc])
	if under:   # the card body behind the art (plate fill, no edge, no outline)
		var pl := TEAM._pl299()
		_fill299(ci, _pts(Rect2(Vector2.ZERO, cs), k, k), 0.0, ch, Color(pl[0], pl[2]))
	var y0 := ch - hs
	var n := 64
	var rows := 6
	for i in n:   # strip, opaque, flush to the bottom + bottom-right cut
		var x0 := w * i / n
		var x1 := w * (i + 1) / n
		var b0 := ch - maxf(0.0, x0 - (w - k))
		var b1 := ch - maxf(0.0, x1 - (w - k))
		for r in rows:
			var ya := y0 + hs * r / rows
			var yb := y0 + hs * (r + 1) / rows
			ci.draw_polygon(PackedVector2Array([Vector2(x0, ya), Vector2(x1, ya), Vector2(x1, minf(yb, b1)), Vector2(x0, minf(yb, b0))]),
				PackedColorArray([_s_cs(st, x0, ya, ch), _s_cs(st, x1, ya, ch), _s_cs(st, x1, minf(yb, b1), ch), _s_cs(st, x0, minf(yb, b0), ch)]))
	var p := _pts(Rect2(Vector2.ZERO, cs).grow(-fw * 0.5), k - fw * 0.5 * 0.5858, k - fw * 0.5 * 0.5858)   # ring centre line
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
		cv.append(_s_cs(st, v.x, v.y, ch))
	ci.draw_polyline_colors(q, cv, fw)
	var e1 := 1.0   # light bevel on the outer top/left edge
	var a1 := k - e1 * 0.5858
	ci.draw_polyline(PackedVector2Array([Vector2(e1, y0), Vector2(e1, e1 + a1), Vector2(e1 + a1, e1), Vector2(w - e1, e1)]), Color(1, 1, 1, 0.35), 1.0)
	ci.draw_line(Vector2(fw, y0 + 0.5), Vector2(w - fw, y0 + 0.5), Color(1, 1, 1, 0.3), 1.0)   # strip top bevel
	var e2 := fw + 0.5   # dark inner line round the art window
	var a2 := maxf(0.0, k - e2 * 0.5858)
	ci.draw_polyline(PackedVector2Array([Vector2(e2, y0), Vector2(e2, e2 + a2), Vector2(e2 + a2, e2), Vector2(w - e2, e2), Vector2(w - e2, y0), Vector2(e2, y0)]), Color(0, 0, 0, 0.55), 1.0)
'''
pp.write_text(s, encoding="utf-8")
print("ok r37a")
