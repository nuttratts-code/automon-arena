# set 268 round 33 — owner after R32: "remove the white frame on the leftmost; use SIZE instead: the leftmost slot is the
# biggest, the next ones step down; show a case with 12 units of different cooldowns; smaller numbers".
# H7: group g (0 = acting first) head radius = max(10, 20 - 2 g) (all heads of a group the same size), spacing follows the
# size; no double frame; countdown label font 15 -> 11. Env S268FAKE12=1 (stills): every unit gets its own time left
# (0.3 + 0.55 i s by uid order) to show 12 separate groups. usage: python s268r33-patch-sizes.py <g268>   (after s268r32)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)
if "s268r33" not in s:
    rep('''func _draw_queue3(rows: Array) -> void:
	var y := size.y * 0.5 + 6.0
	var sorted := rows.duplicate()''', '''func _draw_queue3(rows: Array) -> void:
	var y := size.y * 0.5 + 6.0
	if OS.get_environment("S268FAKE12") == "1": # s268r33 stills: 12 different times left
		var ids := rows.map(func(q): return int(q[0])); ids.sort()
		for q in rows: q[2] = 0.3 + 0.55 * float(ids.find(int(q[0])))
	var sorted := rows.duplicate()''')
    rep('''	var xs := 60.0
	var prev_tick := -999
	var groups := [] # [x start, x end, tick]
	var placed := []
	for i in sorted.size():
		var rw: Array = sorted[i]
		var tick := int(ceil(float(rw[2]) * 10.0 - 0.0001))
		if i > 0: xs += (34.0 if tick == prev_tick else 50.0)
		if tick != prev_tick: groups.append([xs, xs, tick])
		else: groups[groups.size() - 1][1] = xs
		prev_tick = tick
		placed.append([rw, xs])''', '''	var xs := 40.0
	var prev_tick := -999
	var groups := [] # [x start, x end, tick, radius]
	var placed := [] # [row, x, radius]
	var rg := 20.0
	for i in sorted.size():
		var rw: Array = sorted[i]
		var tick := int(ceil(float(rw[2]) * 10.0 - 0.0001))
		if tick != prev_tick: # s268r33: a new group = one size step smaller
			var nr := maxf(10.0, 20.0 - 2.0 * float(groups.size()))
			xs += (rg + nr + 22.0) if i > 0 else nr
			rg = nr
			groups.append([xs, xs, tick, rg])
		else:
			xs += 2.0 * rg + 5.0
			groups[groups.size() - 1][1] = xs
		prev_tick = tick
		placed.append([rw, xs, rg])''')
    rep('''		var a := float(gr[0]) - r - 4.0; var b := float(gr[1]) + r + 4.0
		if float(gr[1]) > float(gr[0]):
			draw_rect(Rect2(a, y - r - 8.0, b - a, 2.0 * r + 16.0), Color(1, 1, 1, 0.10), true)
		draw_polyline(PackedVector2Array([Vector2(a, y - r - 8.0), Vector2(b, y - r - 8.0)]), Color(1, 1, 1, 0.8), 1.5)
		var tt := "%.1f" % (float(gr[2]) / 10.0)
		var lp := Vector2(a + 2.0, y - r - 12.0)
		draw_string_outline(bf, lp, tt, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, 4, Color(0.09, 0.13, 0.16, 0.9))
		draw_string(bf, lp, tt, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color(1, 1, 1))''', '''		var gr_r := float(gr[3])
		var a := float(gr[0]) - gr_r - 4.0; var b := float(gr[1]) + gr_r + 4.0
		if float(gr[1]) > float(gr[0]):
			draw_rect(Rect2(a, y - gr_r - 8.0, b - a, 2.0 * gr_r + 16.0), Color(1, 1, 1, 0.10), true)
		draw_polyline(PackedVector2Array([Vector2(a, y - gr_r - 8.0), Vector2(b, y - gr_r - 8.0)]), Color(1, 1, 1, 0.8), 1.5)
		var tt := "%.1f" % (float(gr[2]) / 10.0)
		var lp := Vector2(a + 1.0, y - gr_r - 11.0)
		draw_string_outline(bf, lp, tt, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, 3, Color(0.09, 0.13, 0.16, 0.9))
		draw_string(bf, lp, tt, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(1, 1, 1))''')
    rep('''		var c := Vector2(float(_qx[u]), y)
		var col := FOE_COL if int(rw[1]) == 1 else OWN_COL
		if i == 0:
			draw_colored_polygon(_diamond(c, r + 7.5), Color(0.08, 0.12, 0.19, 0.9))
			draw_polyline(_diamond(c, r + 7.0) + PackedVector2Array([c + Vector2(0, -r - 7.0)]), Color(1, 1, 1, 0.95), 2.0)
		draw_colored_polygon''', '''		var c := Vector2(float(_qx[u]), y)
		var col := FOE_COL if int(rw[1]) == 1 else OWN_COL
		r = float(placed[i][2]) # s268r33: size by slot, no double frame
		draw_colored_polygon''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
