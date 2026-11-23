# R35j (owner after R35i): every card the SAME size · statuses above the card: row 1 = burn + shock only (normal game, owner I2),
# every other status (stun, damage-taken-up, boss marks) from row 2 up, more rows upward as needed, never wider than the card ·
# mock: card 4 carries ALL 14 values at 100K (% values 999%) to see how many fit (env S286FAKESTAT=1).
import sys, io, re
T = sys.argv[1] + '/scripts/ui/s286_team.gd'
s = io.open(T, encoding='utf-8').read()


def func_span(name):
    i = s.find('func ' + name + '(')
    if i < 0: raise SystemExit('func not found: ' + name)
    j = s.find('\nfunc ', i + 5)
    k = s.find('\nconst ', i + 5)
    k2 = s.find('\nstatic func ', i + 5)
    ends = [e for e in (j, k, k2) if e > 0]
    return i, min(ends) + 1


def replace_func(name, body):
    global s
    i, j = func_span(name)
    s = s[:i] + body + '\n' + s[j:]


replace_func('_draw', '''func _draw() -> void:
	_rects.clear()
	_ic_q.clear()
	if _ic_layer != null: _ic_layer.queue_redraw()
	if view == null: return
	for v in view.units.values():
		_feet_bars(v)
	if _order.is_empty(): return
	var n := _order.size()
	# r35j: one size for every card: fixed width, height = rows the busiest card needs (min 2), cards packed from the left
	var w := minf(CARD_W, (size.x - PAD_L - PAD_R - GAP * float(n - 1)) / float(n))
	var rows := 2
	for uid in _order:
		if view.units.has(uid): rows = maxi(rows, _rows_for(view.units[uid], w))
	var h := 5.0 + float(rows) * ROW_H
	var y := size.y - PAD_B - h
	for i in n:
		var uid: int = _order[i]
		if not view.units.has(uid): continue
		var r := Rect2(Vector2(PAD_L + float(i) * (w + GAP), y), Vector2(w, h))
		_rects[uid] = r
		_card(r, view.units[uid], uid == picked)
''')

replace_func('_card', '''func _card(r: Rect2, v: Dictionary, on: bool) -> void:
	var dead: bool = v.get("down") == true or float(v["hp"]) <= 0.0
	var a := 0.45 if dead else 1.0
	var sb := StyleBoxFlat.new()
	sb.bg_color = PLATE_PICK if on else PLATE
	sb.set_corner_radius_all(3)
	sb.border_color = Color(1, 1, 1, 0.95) if on else LINE
	sb.set_border_width_all(2 if on else 1)
	draw_style_box(sb, r)
	var ic: Texture2D = tl._icon(int(v["uid"])) if tl != null else null
	var c := r.position + Vector2(14.0, 14.0)   # r35j: icon at the top-left (cards can be taller than 2 rows)
	var dr := 10.0
	var dia := PackedVector2Array([c + Vector2(0, -dr), c + Vector2(dr, 0), c + Vector2(0, dr), c + Vector2(-dr, 0)])
	draw_colored_polygon(dia, Color(0.08, 0.12, 0.16, 0.85 * a))
	if ic != null:
		var isz := dr * 2.0 * 1.15
		draw_texture_rect(ic, Rect2(c - Vector2(isz, isz) * 0.5, Vector2(isz, isz)), false, Color(1, 1, 1, a))
	draw_polyline(dia + PackedVector2Array([dia[0]]), Color(OWN_COL, 0.95 * a), 1.5)
	var x0 := r.position.x + 27.0
	var xr := r.end.x - 4.0
	# inside = what we HAVE (every non-zero carried value, icon + total), flowing row by row
	var x := x0
	var y := r.position.y + 3.5
	for it in _haves(v):
		var wv := _chip_w(it[0], it[1])
		if x + wv > xr and x > x0:
			x = x0; y += ROW_H
		x = _chip(Vector2(x, y), it[0], it[1], a, false) + 6.0
	# above = what HITS us (r35j): row 1 = burn + shock only; every other status from row 2 up; wrap inside the card width
	var hits := _hits(v)
	var row := 0
	for tier in [0, 1]:
		var hx := r.position.x + 2.0
		var any := false
		if tier == 1: row = maxi(row + 1, 1)
		for it in hits:
			if int(it[2]) != tier: continue
			var cw := _chip_w(it[0], it[1]) + 5.0
			if any and hx + cw > r.end.x - 1.0:
				row += 1; hx = r.position.x + 2.0
			_chip(Vector2(hx + 2.0, r.position.y - 12.0 - float(row) * ROW_H), it[0], it[1], a, true)
			hx += cw + 2.0
			any = true

func _rows_for(v: Dictionary, w: float) -> int:   # r35j: rows the values need inside a card of width w
	var x0 := 27.0
	var xr := w - 4.0
	var x := x0
	var rows := 1
	for it in _haves(v):
		var wv := _chip_w(it[0], it[1])
		if x + wv > xr and x > x0:
			rows += 1; x = x0
		x += wv + 6.0
	return rows
''')

replace_func('_hits', '''func _hits(v: Dictionary) -> Array: # [kind, text, tier]: tier 0 = burn / shock (row 1) · tier 1 = every other status (row 2 up)
	var out := []
	if OS.get_environment("S286FAKESTAT") == "1": # stills
		var ix := _order.find(int(v["uid"]))
		if ix == 0: return [["stun", "1.5", 1]]
		if ix == 1: return [["burn", "12", 0], ["shock", "8", 0]]
		if ix == 2: return [["stun", "0.8", 1], ["burn", "4", 0], ["vuln", "15%", 1]]
		if ix == 3: return [["burn", "100K", 0], ["shock", "100K", 0], ["stun", "9.9", 1], ["vuln", "999%", 1], ["burn", "999%", 1], ["shock", "999%", 1]]
	var sl := _stun_left(v)
	if sl > 0.0: out.append(["stun", "%.1f" % sl, 1])
	if float(v.get("burn", 0.0)) > 0.0: out.append(["burn", R_num(float(v["burn"])), 0])
	if float(v.get("shock", 0.0)) > 0.0: out.append(["shock", R_num(float(v["shock"])), 0])
	var st: Variant = v.get("stat")
	if st is Dictionary:
		for tk in TAKEN_KEYS:
			var val := float(st.get(tk[0], 0.0)) if st.get(tk[0]) is float or st.get(tk[0]) is int else 0.0
			if val != 0.0: out.append([tk[1], R_num(val) + tk[2], 1])
	return out
''')

# mock: card 4 = all 14 values at 100K (flat) / 999% (percent)
a = '\tif OS.get_environment("S286FAKESTAT") == "1" and _order.find(int(v["uid"])) == 3: # stills: a unit carrying everything\n'
i = s.find(a)
if i < 0: raise SystemExit('fake anchor not found')
j = s.find('\n', s.find('sd.merge(', i)) + 1
s = s[:i] + ('\tif OS.get_environment("S286FAKESTAT") == "1" and _order.find(int(v["uid"])) == 3: # r35j mock: all 14 values, 100K / 999%\n'
             '\t\treturn [["atk", "100K"], ["armor", "100K"], ["multi", "100K"], ["burn", "100K"], ["shock", "100K"], ["armhit", "100K"], ["heal", "100K"],\n'
             '\t\t\t["atk", "999%"], ["burn", "999%"], ["shock", "999%"], ["armor", "999%"], ["heal", "999%"], ["cd", "999%"], ["h2a", "999%"]]\n') + s[j:]
s = s.replace('const CARD_MIN := 60.0', 'const CARD_MIN := 60.0\nconst CARD_W := 102.0   # r35j: one width for every card (fits 2 values of "100K" per row)\nconst ROW_H := 11.5', 1)
io.open(T, 'w', encoding='utf-8', newline='\n').write(s)
print('r35j ok')
