# set 268 round 32 — owner after R31 (crop of the r29 H3 queue): "remove the frame countdown gauge and go back to this look
# (heads side by side in a bracket), but put the countdown number where 'พร้อมกัน' was; and when cooldowns change during
# the fight the units must move to the right slot correctly".
# Env S268H=7: every living unit, sorted by REAL time left; units acting in the same 0.1 s tick sit side by side under one
# bracket whose label is that group's countdown (seconds, 1 decimal); single units get the same label; no numbers under
# heads, plain side-colour frames, first group's first head = double frame; heads slide smoothly to new slots.
# Correct time left: battle.gd logs every unit's real cdLeft each tick ("cdl" event, sample-only) and battle_view stores it,
# so cooldown cuts / adds, freeze, stun and speed changes reorder the queue exactly (the old display guessed from
# lastAct + stat cd). usage: python s268r32-patch-groupqueue.py <g268>   (after s268r31)
import os, sys
g = sys.argv[1]

def patch(rel, pairs, mark):
    p = os.path.join(g, rel)
    s = open(p, encoding="utf-8").read()
    if mark in s: return
    for a, b in pairs:
        assert a in s, (rel, a[:70])
        s = s.replace(a, b, 1)
    open(p, "w", encoding="utf-8").write(s)

patch("scripts/battle.gd", [('''	# ---------- tick loop ----------
	while true:
''', '''	# ---------- tick loop ----------
	while true:
		if detail_on and OS.get_environment("S268H") == "7": # s268r32 sample: real time left of every unit, once per tick
			var cdl := {}
			for f in F:
				if _up(f) and f.cdLeft < 1.0e9: cdl[str(f.uid)] = f.cdLeft + f.stunLeft
			_log("cdl", {"m": cdl})
''')], "s268r32")

patch("scripts/ui/battle_view.gd", [('''		"set":
			var a: Variant = units.get(int(e["who"]))''', '''		"cdl": # s268r32 sample: real cooldown left per unit
			var m: Dictionary = e.get("m", {})
			for kk in m:
				var cu: Variant = units.get(int(kk))
				if cu != null:
					cu["cdl"] = float(m[kk]); cu["cdlT"] = float(e["t"])
		"set":
			var a: Variant = units.get(int(e["who"]))''')], "s268r32")

CODE = r'''
# ---- s268r32: H7 = grouped queue, countdown label per group, real cdLeft --------------------------------------------
func _rows_real() -> Array:
	var out := []
	if view == null: return out
	var clock: float = float(view.clock)
	for v in view.units.values():
		if v.get("down") == true or float(v["hp"]) <= 0.0: continue
		var cd := _cd_of(v)
		if not v.has("cdl"): continue
		var rem := maxf(0.0, float(v["cdl"]) - maxf(0.0, clock - float(v["cdlT"]))) / 1000.0
		out.append([int(v["uid"]), int(v["side"]), rem, maxf(cd / 1000.0, rem)])
	return out

func _draw_queue3(rows: Array) -> void:
	var y := size.y * 0.5 + 6.0
	var sorted := rows.duplicate()
	sorted.sort_custom(func(a, b): return float(a[2]) < float(b[2]) or (float(a[2]) == float(b[2]) and int(a[0]) < int(b[0])))
	var r := 14.0
	var bf := ThemeDB.fallback_font
	var xs := 60.0
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
		placed.append([rw, xs])
	for gi in groups.size(): # bracket + countdown label (where "พร้อมกัน" was)
		var gr: Array = groups[gi]
		var a := float(gr[0]) - r - 4.0; var b := float(gr[1]) + r + 4.0
		if float(gr[1]) > float(gr[0]):
			draw_rect(Rect2(a, y - r - 8.0, b - a, 2.0 * r + 16.0), Color(1, 1, 1, 0.10), true)
		draw_polyline(PackedVector2Array([Vector2(a, y - r - 8.0), Vector2(b, y - r - 8.0)]), Color(1, 1, 1, 0.8), 1.5)
		var tt := "%.1f" % (float(gr[2]) / 10.0)
		var lp := Vector2(a + 2.0, y - r - 12.0)
		draw_string_outline(bf, lp, tt, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, 4, Color(0.09, 0.13, 0.16, 0.9))
		draw_string(bf, lp, tt, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color(1, 1, 1))
	var dt := clampf(get_process_delta_time() * 12.0, 0.0, 1.0)
	var seen := {}
	for i in range(placed.size() - 1, -1, -1):
		var rw: Array = placed[i][0]
		var u := int(rw[0])
		seen[u] = true
		_qx[u] = lerpf(float(_qx.get(u, size.x * 0.5)), float(placed[i][1]), dt)
		var c := Vector2(float(_qx[u]), y)
		var col := FOE_COL if int(rw[1]) == 1 else OWN_COL
		if i == 0:
			draw_colored_polygon(_diamond(c, r + 7.5), Color(0.08, 0.12, 0.19, 0.9))
			draw_polyline(_diamond(c, r + 7.0) + PackedVector2Array([c + Vector2(0, -r - 7.0)]), Color(1, 1, 1, 0.95), 2.0)
		draw_colored_polygon(_diamond(c, r + 2.5), col)
		draw_colored_polygon(_diamond(c, r), Color(0.16, 0.22, 0.30))
		var ic: Texture2D = _icon(u)
		if ic != null:
			var s2 := 2.0 * r * ICON_K
			draw_texture_rect(ic, Rect2(c - Vector2(s2, s2) * 0.5, Vector2(s2, s2)), false)
	for k in _qx.keys():
		if not seen.has(k): _qx.erase(k)
'''

p = os.path.join(g, "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()
if "s268r32" not in s:
    s = s.rstrip("\n") + "\n" + CODE
    a = '''		if hm == "6": # s268r31: every unit, smaller, no feet bars'''
    assert a in s
    s = s.replace(a, '''		if hm == "7": _draw_queue3(_rows_real()) # s268r32
''' + a, 1)
    open(p, "w", encoding="utf-8").write(s)
print("ok")
