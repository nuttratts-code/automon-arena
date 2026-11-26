# set 299 round 36z (sample, after s299r36w): owner picked shine v1 (r36y) + "tidy: the black line at the corner pokes out ·
#   the light must not run over the top coloured edge"
#   cause: the card plate (col/strip) cuts its corners at k = 6, the r36w overlay used 5 (+ its own extra outer dark line at a
#   different diagonal) -> a second dark diagonal showed outside the frame. Fix (S299ONE=5): every overlay cut = 6, inset lines
#   follow the same 45 deg cut (c(e) = 6 + e*0.4142), the extra outer dark line removed (the plate already draws one)
import sys, pathlib, shutil
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pp = g / "scripts/ui/s299_prep.gd"
shutil.copy(pp, g / "bak286_s299_prep.gd.s299r36w")
s = pp.read_text(encoding="utf-8")
i0 = s.index("func _card_shine(")
body = s[i0:]
reps = [
	("	var k := 5.0\n	var n := 64\n	var rows := 6\n", "	var k := 6.0   # r36z: = the plate's cut\n	var n := 64\n	var rows := 6\n"),
	("	var p := _pts(Rect2(Vector2.ZERO, size).grow(-1.5), 5.0, 5.0)\n	p.append(p[0])\n	var q := PackedVector2Array()\n	for i in p.size() - 1:\n		var a: Vector2 = p[i]\n		var b: Vector2 = p[i + 1]\n		var m := maxi(1, int(a.distance_to(b) / 2.0))\n		for j in m:\n			q.append(a.lerp(b, float(j) / m))\n	q.append(p[p.size() - 1])\n	var cv := PackedColorArray()\n	for v in q:\n		cv.append(_cs(st, v.x, v.y))",
	 "	var p := _pts(Rect2(Vector2.ZERO, size).grow(-1.5), 6.0 - 1.5 * 0.4142 * 0.0 + 1.5 * 0.4142 - 1.5, 6.0 + 1.5 * 0.4142 - 1.5)\n	p.append(p[0])\n	var q := PackedVector2Array()\n	for i in p.size() - 1:\n		var a: Vector2 = p[i]\n		var b: Vector2 = p[i + 1]\n		var m := maxi(1, int(a.distance_to(b) / 2.0))\n		for j in m:\n			q.append(a.lerp(b, float(j) / m))\n	q.append(p[p.size() - 1])\n	var cv := PackedColorArray()\n	for v in q:\n		cv.append(_cs(st, v.x, v.y))"),
	("	draw_polyline(PackedVector2Array([Vector2(3.5, y0), Vector2(3.5, 8.0), Vector2(8.0, 3.5), Vector2(w - 3.5, 3.5)]), Color(1, 1, 1, 0.35), 1.0)\n	var o := _pts(Rect2(Vector2.ZERO, size).grow(-0.5), 5.0, 5.0)\n	draw_polyline(PackedVector2Array([Vector2(w - 0.5, 0.5), Vector2(w - 0.5, size.y - 5.5), Vector2(w - 5.5, size.y - 0.5), Vector2(0.5, size.y - 0.5)]), Color(0, 0, 0, 0.6), 1.0)\n	var pi := PackedVector2Array([Vector2(5, y0 - 1), Vector2(5, 9.5), Vector2(9.5, 5), Vector2(w - 5, 5), Vector2(w - 5, y0 - 1)])",
	 "	var c3 := 6.0 + 3.5 * 0.4142   # r36z: inset lines follow the plate's 45 deg cut\n	draw_polyline(PackedVector2Array([Vector2(3.5, y0), Vector2(3.5, c3), Vector2(c3, 3.5), Vector2(w - 3.5, 3.5)]), Color(1, 1, 1, 0.35), 1.0)\n	var c5 := 6.0 + 5.0 * 0.4142\n	var pi := PackedVector2Array([Vector2(5, y0 - 1), Vector2(5, c5), Vector2(c5, 5), Vector2(w - 5, 5), Vector2(w - 5, y0 - 1)])"),
]
for a, b in reps:
	assert body.count(a) == 1, a[:60]
	body = body.replace(a, b)
s = s[:i0] + body
pp.write_text(s, encoding="utf-8")
print("ok r36z")
# --- r36z step 2 (after a probe run: foot = hold299 = cell inset 3 px left/right, 2 px top/bottom; cell PanelContainer cut 6)
# in hold coords the cell's cut line is x'+y' = 1, so every overlay corner follows c(f) = 4.54 + 0.414 f
# (f = inset from the hold edge; keeps the same ~2.5 px gap to the plate edge as the sides): strip cut 4.54, frame _pts 3.66,
# bevel c(3.5), inner line c(5). Probe line removed.
s = pp.read_text(encoding="utf-8")
i0 = s.index("func _card_shine(")
body = s[i0:]
reps2 = [
	('	if OS.get_environment("S299PROBE") == "1":\n		var hc := get_parent() as Control\n		var cl := hc.get_parent() as Control\n		print("PROBE foot ", position, size, " hold ", hc.position, hc.size, " cell ", cl.size, " cls ", cl.get_class())\n', ""),
	("	var k := 6.0   # r36z: = the plate's cut\n", "	var k := 4.54   # r36z: follows the cell's cut (hold is inset 3/2 px in the cell)\n"),
	("6.0 - 1.5 * 0.4142 * 0.0 + 1.5 * 0.4142 - 1.5, 6.0 + 1.5 * 0.4142 - 1.5)", "3.66, 3.66)"),
	("	var c3 := 6.0 + 3.5 * 0.4142   # r36z: inset lines follow the plate's 45 deg cut\n", "	var c3 := 4.54 + 3.5 * 0.4142   # r36z: inset lines follow the cell's 45 deg cut\n"),
	("	var c5 := 6.0 + 5.0 * 0.4142\n", "	var c5 := 4.54 + 5.0 * 0.4142\n"),
]
for a, b in reps2:
	if a.startswith("	if OS.get_environment(\"S299PROBE\")") and body.count(a) == 0:
		continue
	assert body.count(a) == 1, a[:60]
	body = body.replace(a, b)
pp.write_text(s[:i0] + body, encoding="utf-8")
print("ok r36z step 2")
