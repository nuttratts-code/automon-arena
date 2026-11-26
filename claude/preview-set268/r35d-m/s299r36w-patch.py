# set 299 round 36w (sample, after s299r36v): owner "almost OK · show the card face on its own so it is easy to design ·
#   colours still look blurry — what colours do card games use so a card looks shiny/sparkly?"
#   S299ONE=5 (new default; 4 = r36v) + S299SHINE 1/2/3 (default 1):
#   1 ก crisp: colours boosted (sat x1.25, val x1.1), strip opaque, NO fade (hard top edge + 1 px light bevel line inside
#     the frame), one metal ramp over the whole card height shared by frame + strip (lit top -> dark bottom) so they stay
#     one piece, frame 3 px with a light inner bevel on top/left and a dark line on bottom/right
#   2 ข = ก + foil sheen: two hard diagonal light streaks across the strip
#   3 ค = ข + sparkles: small 4-point white glints on the frame (top-right + bottom-left corners)
import sys, pathlib, shutil
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pp = g / "scripts/ui/s299_prep.gd"
shutil.copy(pp, g / "bak286_s299_prep.gd.s299r36v")
s = pp.read_text(encoding="utf-8")
old = '			one = "4"   # r36v default (r36u = 3)\n'
assert s.count(old) == 1
s = s.replace(old, '			one = "5"   # r36w default (r36v = 4)\n')
old = '		if one == "4":   # r36v: strip = frame colour, one piece\n'
assert s.count(old) == 1
s = s.replace(old, """		if one == "5":   # r36w: crisp shiny card
			if card:
				_recess()
			_card_shine(cols, rc, pw, h, card, maxi(1, int(OS.get_environment("S299SHINE"))))
			return
""" + old)
s += '''
func _boost(c: Color) -> Color:   # r36w: richer colour
	return Color.from_hsv(c.h, minf(1.0, c.s * 1.25), minf(1.0, c.v * 1.1), 1.0)

func _metal(c: Color, y: float) -> Color:   # r36w: one ramp over the whole card height
	var t := clampf(y / size.y, 0.0, 1.0)
	return c.lightened(0.12 * (1.0 - t)) if t < 0.5 else c.darkened(0.28 * (t - 0.5) * 2.0)

func _cs(st: Array, x: float, y: float) -> Color:
	return _metal(_boost(_col_lin(st, x)), y)

func _card_shine(cols: Array, rc: Color, pw: float, h: float, card: bool, mode: int) -> void:   # r36w
	var st := _stops2(cols, rc, pw)
	var w := size.x
	var y0 := size.y - h
	var k := 5.0
	var n := 64
	var rows := 6
	for i in n:   # strip: opaque, hard top edge
		var x0 := w * i / n
		var x1 := w * (i + 1) / n
		var b0 := size.y - maxf(0.0, x0 - (w - k))
		var b1 := size.y - maxf(0.0, x1 - (w - k))
		for r in rows:
			var ya := y0 + h * r / rows
			var yb := y0 + h * (r + 1) / rows
			draw_polygon(PackedVector2Array([Vector2(x0, ya), Vector2(x1, ya), Vector2(x1, minf(yb, b1)), Vector2(x0, minf(yb, b0))]),
				PackedColorArray([_cs(st, x0, ya), _cs(st, x1, ya), _cs(st, x1, minf(yb, b1)), _cs(st, x0, minf(yb, b0))]))
	var bev := PackedVector2Array()
	var bc := PackedColorArray()
	for i in 33:   # light bevel line on the strip's top edge
		var x := 3.0 + (w - 6.0) * i / 32.0
		bev.append(Vector2(x, y0 + 0.5))
		var c := _cs(st, x, y0).lightened(0.45)
		c.a = 0.9
		bc.append(c)
	draw_polyline_colors(bev, bc, 1.0)
	draw_line(Vector2(3, y0 - 0.5), Vector2(w - 3, y0 - 0.5), Color(0, 0, 0, 0.5), 1.0)
	if mode >= 2:   # foil sheen: two hard diagonal streaks on the strip
		for sp in [[0.30, 7.0, 0.22], [0.30 + 0.06, 2.5, 0.38]]:
			var x := w * float(sp[0])
			var wd: float = sp[1]
			var sl := h * 0.6
			draw_polygon(PackedVector2Array([Vector2(x + sl, y0 + 1), Vector2(x + sl + wd, y0 + 1), Vector2(x + wd, size.y - 1), Vector2(x, size.y - 1)]),
				PackedColorArray([Color(1, 1, 1, sp[2]), Color(1, 1, 1, sp[2]), Color(1, 1, 1, sp[2]), Color(1, 1, 1, sp[2])]))
	if not card:
		return
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
		cv.append(_cs(st, v.x, v.y))
	draw_polyline_colors(q, cv, 3.0)
	# bevel: light inner edge top/left, dark outer edge bottom/right
	draw_polyline(PackedVector2Array([Vector2(3.5, y0), Vector2(3.5, 8.0), Vector2(8.0, 3.5), Vector2(w - 3.5, 3.5)]), Color(1, 1, 1, 0.35), 1.0)
	var o := _pts(Rect2(Vector2.ZERO, size).grow(-0.5), 5.0, 5.0)
	draw_polyline(PackedVector2Array([Vector2(w - 0.5, 0.5), Vector2(w - 0.5, size.y - 5.5), Vector2(w - 5.5, size.y - 0.5), Vector2(0.5, size.y - 0.5)]), Color(0, 0, 0, 0.6), 1.0)
	var pi := PackedVector2Array([Vector2(5, y0 - 1), Vector2(5, 9.5), Vector2(9.5, 5), Vector2(w - 5, 5), Vector2(w - 5, y0 - 1)])
	draw_polyline(pi, Color(0, 0, 0, 0.55), 1.0)
	if mode >= 3:   # sparkles
		for c in [Vector2(w - 7, 3), Vector2(4, size.y - 6)]:
			_glint(c, 4.5)

func _glint(c: Vector2, r: float) -> void:   # r36w: 4-point star
	var t := r * 0.22
	draw_polygon(PackedVector2Array([c + Vector2(0, -r), c + Vector2(t, -t), c + Vector2(r, 0), c + Vector2(t, t),
		c + Vector2(0, r), c + Vector2(-t, t), c + Vector2(-r, 0), c + Vector2(-t, -t)]), PackedColorArray([Color(1, 1, 1, 0.95)]))
	draw_circle(c, r * 0.35, Color(1, 1, 1, 0.5))
'''
pp.write_text(s, encoding="utf-8")
print("ok r36w")
