# set 299 round 36o (sample, after s299r36n): owner after the TFT study "try many versions, I pick" →
#   env S299MAT = material variant for every plate (top plate + lock tab, shop cards, bench sockets, Fight):
#   0 = r36n now (flat 1 px cream line)
#   1 = lit frames: 2-tone edge (light top/left, dark bottom/right, same light as the sprites) + thin inner shadow
#   2 = 1 + value steps: top plate solid and darker, shop cards a darker recessed well, + soft edge scrim (scene darkened under the top band and the bottom row)
#   3 = 2 + Fight = warm raised block (the one warm thing on screen) + bench slots = recessed sockets
#   4 = 3 + stronger relief (2 px light edge, brass-tinted highlight, deeper inner shadow)
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pp = g / "scripts/ui/s299_prep.gd"; s = pp.read_text(encoding="utf-8")

# 1) plate(): material per variant (k tells the role: 6 shop card · 5 bench · 9 Fight · 8 top plate)
old = """	ci.draw_polygon(p, cols)
	var po := TEAM._cutpts299(r.grow(1.0), k + 1.0)
	ci.draw_polyline(po + PackedVector2Array([po[0]]), Color(0.05, 0.05, 0.06, 0.85 * a), 1.0)
	var ec: Color = Color(pl[4], (pl[5] + 0.38 if on else pl[5]) * a) if edge == null else edge
	ci.draw_polyline(p + PackedVector2Array([p[0]]), ec, ew)
"""
new = """	var m := _mat()
	var role := "card" if k == 6.0 else ("bench" if k == 5.0 else ("fight" if k == 9.0 else "plate"))
	if m >= 2 and role == "card":   # recessed well: darker than the plate it sits in
		fill = Color(fill.darkened(0.30), maxf(fill.a, 0.92 * a))
	if m >= 3 and role == "bench":   # socket: dark, nearly solid, sunk in
		fill = Color(Color("#0b121a"), 0.82)
	if m >= 3 and role == "fight":   # the one warm block on the screen
		fill = Color(Color("#8a4518") if not on else Color("#a3561f"), 1.0)
	cols = PackedColorArray()
	for q in p:
		var t := clampf((q.y - r.position.y) / maxf(1.0, r.size.y), 0.0, 1.0)
		cols.append(Color(fill.lightened(0.16 * (1.0 - t)).darkened(0.18 * t), fill.a))
	ci.draw_polygon(p, cols)
	var po := TEAM._cutpts299(r.grow(1.0), k + 1.0)
	ci.draw_polyline(po + PackedVector2Array([po[0]]), Color(0.05, 0.05, 0.06, 0.85 * a), 1.0)
	var ec: Color = Color(pl[4], (pl[5] + 0.38 if on else pl[5]) * a) if edge == null else edge
	if m == 0 or (edge != null and role != "fight"):   # state edges (owned / picked / drop) keep their own line
		ci.draw_polyline(p + PackedVector2Array([p[0]]), ec, ew)
		if m == 0:
			return
	var sunk := (m >= 2 and role == "card") or (m >= 3 and role == "bench")
	bevel(ci, p, a, sunk, role == "fight" and m >= 3)
"""
assert s.count(old) == 1
s = s.replace(old, new)

# 2) tabplate(): same material on the top plate + lock tab
old = """	_fill299(ci, p, r.position.y, tb - r.position.y, fill)
	var po := Geometry2D.offset_polygon(p, 1.0, Geometry2D.JOIN_MITER)
	if po.size() > 0:
		var o: PackedVector2Array = po[0]
		ci.draw_polyline(o + PackedVector2Array([o[0]]), Color(0.05, 0.05, 0.06, 0.85 * a), 1.0)
	ci.draw_polyline(p + PackedVector2Array([p[0]]), Color(pl[4], pl[5] * a), 1.0)
"""
new = """	if _mat() >= 2:   # solid, darker plate (value step under the cards)
		fill = Color(fill.darkened(0.10), 0.96)
		scrim(ci, r)
	_fill299(ci, p, r.position.y, tb - r.position.y, fill)
	var po := Geometry2D.offset_polygon(p, 1.0, Geometry2D.JOIN_MITER)
	if po.size() > 0:
		var o: PackedVector2Array = po[0]
		ci.draw_polyline(o + PackedVector2Array([o[0]]), Color(0.05, 0.05, 0.06, 0.85 * a), 1.0)
	if _mat() == 0:
		ci.draw_polyline(p + PackedVector2Array([p[0]]), Color(pl[4], pl[5] * a), 1.0)
	else:
		bevel(ci, p, a, false, false)
"""
assert s.count(old) == 1
s = s.replace(old, new)

# 3) helpers
s += """
static func _mat() -> int:   # r36o (owner picks): material variant, see s299r36o-patch.py header
	return int(OS.get_environment("S299MAT")) if OS.get_environment("S299MAT") != "" else 0

# r36o: lit frame — light from the top-left like the sprites. Raised: light top/left edges, dark bottom/right.
# Sunk (well / socket): the reverse + a shadow band inside the top edge. Then a thin inner line for depth.
static func bevel(ci: CanvasItem, p: PackedVector2Array, a: float, sunk: bool, warm: bool) -> void:
	var m := _mat()
	var hi := Color("#f2e2b8") if m >= 4 else Color("#e6dcc0")
	if warm:
		hi = Color("#ffd9a0")
	var ha := (0.85 if m >= 4 else 0.62) * a
	var lo := Color(0.02, 0.03, 0.04, 0.9 * a)
	var w_hi := 2.0 if m >= 4 else 1.0
	var n := p.size()
	var cx := 0.0
	for q in p:
		cx += q.x
	for i in n:
		var p0 := p[i]
		var p1 := p[(i + 1) % n]
		var d := (p1 - p0).normalized()
		var nrm := Vector2(d.y, -d.x)   # outward for this clockwise outline
		var lit := nrm.y < -0.3 or nrm.x < -0.3
		if sunk:
			lit = not lit
		if lit:
			ci.draw_line(p0, p1, Color(hi, ha * (0.55 if sunk else 1.0)), w_hi)
		else:
			ci.draw_line(p0, p1, lo, 1.0)
	var ins := Geometry2D.offset_polygon(p, -2.0 if m < 4 else -3.0, Geometry2D.JOIN_MITER)
	if ins.size() > 0:
		var o: PackedVector2Array = ins[0]
		ci.draw_polyline(o + PackedVector2Array([o[0]]), Color(0, 0, 0, (0.30 if m < 4 else 0.42) * a), 1.0)
	if sunk:   # shadow band under the top edge
		var y0 := p[0].y
		var x0 := 1e9
		var x1 := -1e9
		for q in p:
			x0 = minf(x0, q.x)
			x1 = maxf(x1, q.x)
		var bh := 7.0 if m >= 4 else 5.0
		ci.draw_polygon(PackedVector2Array([Vector2(x0 + 6, y0 + 1), Vector2(x1 - 1, y0 + 1), Vector2(x1 - 1, y0 + bh), Vector2(x0 + 1, y0 + bh)]),
			PackedColorArray([Color(0, 0, 0, 0.45 * a), Color(0, 0, 0, 0.45 * a), Color(0, 0, 0, 0), Color(0, 0, 0, 0)]))

# r36o: soft scrim — darken the 3D scene under the top band and under the bottom row (drawn by the top plate, under every HUD part)
static func scrim(ci: CanvasItem, r: Rect2) -> void:
	var vr := ci.get_viewport_rect()
	var org := -(ci as Control).global_position if ci is Control else Vector2.ZERO
	var x0 := org.x
	var x1 := org.x + vr.size.x
	var top := org.y
	var yb := r.end.y + 46.0
	var c0 := Color(0, 0, 0, 0.55)
	var c1 := Color(0, 0, 0, 0.0)
	ci.draw_polygon(PackedVector2Array([Vector2(x0, top), Vector2(x1, top), Vector2(x1, yb), Vector2(x0, yb)]), PackedColorArray([c0, c0, c1, c1]))
	var bot := org.y + vr.size.y
	var yt := bot - 150.0
	ci.draw_polygon(PackedVector2Array([Vector2(x0, yt), Vector2(x1, yt), Vector2(x1, bot), Vector2(x0, bot)]), PackedColorArray([c1, c1, c0, c0]))
"""
pp.write_text(s, encoding="utf-8")
print("ok r36o")
