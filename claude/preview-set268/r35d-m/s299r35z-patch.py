# set 299 r35z: detail panel = left column fixed (name | tribe, HP + shield icon, cooldown) · middle + right merged into ONE box with stars on top,
# page 1 = 6 values (middle) + skill (right); "+" bottom-right flips to page 2 = middle + right merged = burn / shock + buff / debuff chips ("−" flips back)
# env S299PAGE=1 = start on page 2 (stills)
import sys
p = sys.argv[1] if len(sys.argv) > 1 else r"D:\GitHub\automon-scratch\g286\scripts\ui\s286_team.gd"
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:70])
    s = s.replace(a, b)

# input: tap the box at the bottom-right = flip page
rep('\tif OS.get_environment("S297") != "0" and _con_r.has_point(p):   # s297: the console stays, tap = nothing',
    '\tif picked >= 0 and _pgbtn.has_point(p):   # s299 r35z: page flip\n\t\t_pg299 = 1 - _pg299\n\t\tget_viewport().set_input_as_handled()\n\t\treturn\n'
    '\tif OS.get_environment("S297") != "0" and _con_r.has_point(p):   # s297: the console stays, tap = nothing')
rep('func _console4(R: Rect2) -> void:\n\tif R.size.x <= 0.0: return',
    'func _console4(R: Rect2) -> void:\n\t_pgbtn = Rect2()\n\tif R.size.x <= 0.0: return')

# column 1: name | tribe instead of stars, wider
rep('\tvar W1 := 84.0\n\tvar RT := L + W1', '\tvar W1 := 96.0 if PN299 else 84.0   # s299 r35z: room for "name | tribe"\n\tvar RT := L + W1')
a = s.index('\tvar nlv := clampi(int(v.get("level", 1)), 1, 5)\n\tvar stw := (float(nlv) * 7.0 + 2.0) if PN299 else 0.0')
b_marker = '_star299(Vector2(sx + float(i) * 7.0, y + 8.5), 3.2)\n'
b = s.index(b_marker, a) + len(b_marker)
s = s[:a] + '''\tvar nm299 := _fit_txt(str(v.get("name", v.get("id", ""))), 9, W1 * 0.62, true)   # s299 r35z: name | tribe (tribe replaces the stars)
	_dtxt(Vector2(L, y + 12.0), nm299, 9, ink, true)
	var trb299 := String(view._char_of(v).get("tribe", ""))
	if trb299 != "":
		var nx299 := L + TH.font("body_b").get_string_size(nm299, HORIZONTAL_ALIGNMENT_LEFT, -1, 9).x
		_dtxt(Vector2(nx299 + 4.0, y + 12.0), "|", 9, Color(MUTE, 0.7))
		_dtxt(Vector2(nx299 + 10.0, y + 12.0), _fit_txt(trb299, 8, W1 - (nx299 - L) - 10.0), 8, Color("#9fc7d6"))
''' + s[b:]

# HP line: shield icon instead of the word
rep('\t\t_dtxt(Vector2(L + hw, y + 30.0), "%s/%s" % [R_num(hp), R_num(mx)] + (("  เกราะ " + R_num(arm)) if arm > 0.0 else ""), 9, ink)\n\telse:',
'''\t\tvar hpt299 := "%s/%s" % [R_num(hp), R_num(mx)]
		_dtxt(Vector2(L + hw, y + 30.0), hpt299, 9, ink)
		if arm > 0.0:   # s299 r35z: shield symbol instead of the word เกราะ
			var ax299 := L + hw + TH.font("body").get_string_size(hpt299, HORIZONTAL_ALIGNMENT_LEFT, -1, 9).x + 8.0
			_dicon(Vector2(ax299, y + 27.0), "armor", 10.0, 1.0, TAG_COL3.get("armhit", INK))
			_dtxt(Vector2(ax299 + 7.0, y + 30.0), R_num(arm), 9, TAG_COL3.get("armhit", INK))
	else:''')

# columns 2 + 3 -> one box
a = s.index('\t# column 2: the 6 values, 3 rows x 2, colour swatch = kind (E hues), zero = "–"')
b_marker = '"+%d อย่าง" % (items.size() - cap), 8, mute)\n'
b = s.index(b_marker, a) + len(b_marker)
s = s[:a] + '\t_area299(R, v, RT + 10.0, ink, mute)   # s299 r35z: middle + right merged\n' + s[b:]

new_fn = '''
# ---------- s299 r35z: merged middle + right box, 2 pages ----------
var _pg299 := 1 if OS.get_environment("S299PAGE") == "1" else 0
var _pgbtn := Rect2()

func _wrap299(t: String, fs: int, maxw: float) -> Array:   # Thai has no spaces: break by measured width, never before a vowel / tone mark, never after a leading vowel
	var f: Font = TH.font("body")
	var out := []
	var cur := ""
	for i in t.length():
		var ch := t.substr(i, 1)
		var cp := ch.unicode_at(0)
		var follow := cp == 0x0E30 or cp == 0x0E31 or cp == 0x0E32 or cp == 0x0E33 or (cp >= 0x0E34 and cp <= 0x0E3A) or (cp >= 0x0E47 and cp <= 0x0E4E)
		if not follow and cur != "" and f.get_string_size(cur + ch, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x > maxw:
			var lc := cur.unicode_at(cur.length() - 1)
			if lc >= 0x0E40 and lc <= 0x0E44:   # leading vowel stays with its consonant
				out.append(cur.substr(0, cur.length() - 1))
				cur = cur.substr(cur.length() - 1) + ch
			else:
				out.append(cur)
				cur = ch
		else:
			cur += ch
	if cur != "": out.append(cur)
	return out

func _area299(R: Rect2, v: Dictionary, L2: float, ink: Color, mute: Color) -> void:
	var y := R.position.y
	var RT := R.end.x - 8.0
	_pn_layer.draw_rect(Rect2(L2 - 5.0, y + 5.0, 1.0, R.size.y - 10.0), Color(1, 1, 1, 0.08))
	var nlv := clampi(int(v.get("level", 1)), 1, 5)   # stars: top of the box
	for i in nlv: _star299(Vector2(L2 + 3.5 + float(i) * 8.0, y + 8.0), 3.4)
	var br := Rect2(R.end.x - 8.0 - 13.0, R.end.y - 4.0 - 13.0, 13.0, 13.0)   # page flip box, bottom-right
	_pgbtn = br
	var bp := _cutpts299(br, 2.0)
	_pn_layer.draw_colored_polygon(bp, Color("#1f5266", 0.92))
	_pn_layer.draw_polyline(bp + PackedVector2Array([bp[0]]), Color("#d6e8ee", 0.8), 1.0)
	var bc := br.get_center()
	_pn_layer.draw_rect(Rect2(bc.x - 3.0, bc.y - 0.5, 6.0, 1.0), Color(1, 1, 1, 1))
	if _pg299 == 0: _pn_layer.draw_rect(Rect2(bc.x - 0.5, bc.y - 3.0, 1.0, 6.0), Color(1, 1, 1, 1))   # "+" on the skill page, "−" on the stats page
	var top := y + 14.0
	var cw2 := 58.0
	var L3 := L2 + cw2 * 2.0 + 4.0 + 10.0
	if _pg299 == 0:   # page 1: middle = the 6 values (3 rows x 2) · right = the unit's skill (game text for its level)
		var sl := _slots(v)
		for i in sl.size():
			var gx := L2 + (0.0 if i % 2 == 0 else cw2 + 4.0)
			var gy := top + float(i / 2) * 13.0
			var kd := String(sl[i][0])
			_dtxt(Vector2(gx, gy + 10.0), String(PN299_W.get(kd, kd)), 8, TAG_COL3.get(kd, INK))
			_dnum(Vector2(0, gy + 10.0), String(sl[i][1]) if sl[i][2] else "-", 8, ink, gx + cw2)
		_pn_layer.draw_rect(Rect2(L3 - 5.0, y + 18.0, 1.0, R.size.y - 26.0), Color(1, 1, 1, 0.08))
		var groups: Variant = TH.labels().get("skills", {}).get(str(v.get("id")))
		var lv := maxi(1, int(v.get("level", 1)))
		var lines := []
		if groups is Array:
			for g in groups:
				var on: bool = g.get("lv") == null or (g["lv"] is Array and g["lv"].has(float(lv)))
				if not on: continue
				var txts: Array = g["text"]
				for ln in _wrap299(String(txts[clampi(lv - 1, 0, txts.size() - 1)]), 8, RT - L3 - 16.0): lines.append(ln)
		if lines.is_empty():
			_dtxt(Vector2(L3, top + 10.0), "ไม่มีสกิล", 9, mute)
		for i in mini(lines.size(), 4):
			var t: String = lines[i]
			if i == 3 and lines.size() > 4: t = _fit_txt(t + "…", 8, RT - L3 - 16.0)
			_dtxt(Vector2(L3, top + 10.0 + float(i) * 10.0), t, 8, ink)
		return
	# page 2: middle + right merged = status (burn / shock numbers, then buff / debuff chips), 3 rows x 3 columns, column-major
	var cw3 := (RT - L2 - 12.0) / 3.0
	var items := []
	for q in _row1(v):
		if String(q[0]) == "armor": continue   # owner: only burn / shock come back, armour stays on the HP line
		items.append(["n", String(q[0]), String(L4_NUM.get(q[0], q[0])), String(q[1]), true, ""])
	for e in _effects(v): items.append(["e", String(e[1]), _short4(e), "", bool(e[2]), String(e[5])])
	if items.is_empty(): _dtxt(Vector2(L2, top + 10.0), "ไม่มีสถานะ", 8, mute)
	var cap := 8   # slot 9 = the flip box
	var shown := mini(items.size(), cap if items.size() <= cap else cap - 1)
	for i in shown:
		var gx := L2 + float(i / 3) * (cw3 + 6.0)
		var gy := top + float(i % 3) * 13.0
		var it: Array = items[i]
		if it[0] == "n":   # burn / shock numbers are back: word in its kind hue + number
			var kc: Color = TAG_COL3.get(_l4_col(String(it[1])), INK)
			_dtxt(Vector2(gx, gy + 10.0), String(it[2]), 8, kc)
			_dnum(Vector2(0, gy + 10.0), String(it[3]), 8, ink, gx + cw3 - 10.0)
			continue
		var cr := Rect2(gx, gy, 11.0, 11.0)   # same chip as on the cards: cut 15 %, baked icon, small + / −
		var cpp := _cutpts299(cr, 11.0 * 0.15)
		_pn_layer.draw_colored_polygon(cpp, Color("#2f6db5", 0.92) if it[4] else Color("#b8343a", 0.92))
		_pn_layer.draw_polyline(cpp + PackedVector2Array([cpp[0]]), Color(OUT, 0.7), 1.0)
		var cio := icon_tex("n_" + String(it[1]) + "_o")
		var cif := icon_tex("n_" + String(it[1]))
		if cio != null: _pn_layer.draw_texture_rect(cio, cr, false, Color(OUT, OUT.a))
		if cif != null: _pn_layer.draw_texture_rect(cif, cr, false, Color(1, 1, 1, 0.97))
		if String(it[5]) != "":
			var cmk := icon_tex("n_plus" if String(it[5]) == "+" else "n_minus")
			if cmk != null: _pn_layer.draw_texture_rect(cmk, cr, false, Color(1, 1, 1, 1))
		_dtxt(Vector2(gx + 14.0, gy + 10.0), _fit_txt(String(it[2]), 8, cw3 - 14.0), 8, ink)
	if items.size() > cap:
		_dtxt(Vector2(L2 + 2.0 * (cw3 + 6.0), top + 10.0 + 13.0), "+%d อย่าง" % (items.size() - shown), 8, mute)

'''
rep('\nfunc _stone297(', new_fn + '\nfunc _stone297(')
open(p, "w", encoding="utf-8").write(s)
print("ok")
