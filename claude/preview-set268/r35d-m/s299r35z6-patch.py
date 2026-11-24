# set 299 r35z6 (after s299r35z): status page = 2 columns x 3 rows on the values-page grid (top y+4, pitch 16):
# row 1 fixed burn | shock, rows 2-3 = 4 buff / debuff chips per page.
# env S299LONG=1 = mock a long skill (text repeated) to see skill paging · S299DUMP=1 = print skill line counts for every unit / level
import sys
p = sys.argv[1] if len(sys.argv) > 1 else r"D:\GitHub\automon-scratch\g286\scripts\ui\s286_team.gd"
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:70])
    s = s.replace(a, b)

# 4 chips per status page
rep('\tvar stp := maxi(1, int(ceil(float(effs.size()) / 2.0)))',
    '\tvar stp := maxi(1, int(ceil(float(effs.size()) / 4.0)))   # s299 r35z6: 2 x 2 chips per page')

# mock long skill + dump of line counts
rep('''			for ln in _wrap299(String(txts[clampi(lv - 1, 0, txts.size() - 1)]), 8, RT - L3 - 16.0): lines.append(ln)''',
'''			var tx299 := String(txts[clampi(lv - 1, 0, txts.size() - 1)])
			if OS.get_environment("S299LONG") == "1": tx299 = tx299 + " " + tx299   # mock: long skill
			for ln in _wrap299(tx299, 8, RT - L3 - 16.0): lines.append(ln)
	if OS.get_environment("S299DUMP") == "1" and not _dump299:
		_dump299 = true
		var allsk: Dictionary = TH.labels().get("skills", {})
		for id in allsk.keys():
			for lvq in range(1, 6):
				var n := 0
				for g in allsk[id]:
					var onq: bool = g.get("lv") == null or (g["lv"] is Array and g["lv"].has(float(lvq)))
					if not onq: continue
					var tq: Array = g["text"]
					n += _wrap299(String(tq[clampi(lvq - 1, 0, tq.size() - 1)]), 8, RT - L3 - 16.0).size()
				print("S299DUMP %s lv%d lines=%d" % [id, lvq, n])''')

# status page body: 3 rows x 2 on the values grid
a = s.index('\t_stline299(L2, y + 9.0, cwc, "burn"')
b_marker = '_dtxt(Vector2(gx + 14.0, gy + 10.0), _fit_txt(_short4(e), 8, cwc - 14.0), 8, ink)\n'
b = s.index(b_marker, a) + len(b_marker)
s = s[:a] + '''	_stline299(L2, y + 6.0, cwc, "burn", "โดนดาเมจ", bn, "/ วิ", TAG_COL3.get("burn", INK), bn != "0")   # s299 r35z6: row 1 of 3 (pitch 16, like the values)
	_stline299(L2 + cwc + 8.0, y + 6.0, cwc, "shock", "โดนดาเมจไม่สนเกราะ", sk, "", TAG_COL3.get("shock", INK), sk != "0")
	_pn_layer.draw_rect(Rect2(L2, y + 20.0, RT - 18.0 - L2, 1.0), Color(1, 1, 1, 0.08))
	if effs.is_empty(): _dtxt(Vector2(L2, y + 31.0), "ไม่มีบัฟ / ดีบัฟ", 8, mute)
	for k in 4:   # rows 2-3, left | right
		var ei := sp * 4 + k
		if ei >= effs.size(): break
		var e: Array = effs[ei]
		var gx := L2 + float(k % 2) * (cwc + 8.0)
		var gy := y + 4.0 + float(1 + k / 2) * 16.0 + 2.5
		var cr := Rect2(gx, gy, 11.0, 11.0)   # same chip as on the cards: cut 15 %, baked icon, small + / −
		var cpp := _cutpts299(cr, 11.0 * 0.15)
		_pn_layer.draw_colored_polygon(cpp, Color("#2f6db5", 0.92) if bool(e[2]) else Color("#b8343a", 0.92))
		_pn_layer.draw_polyline(cpp + PackedVector2Array([cpp[0]]), Color(OUT, 0.7), 1.0)
		var cio := icon_tex("n_" + String(e[1]) + "_o")
		var cif := icon_tex("n_" + String(e[1]))
		if cio != null: _pn_layer.draw_texture_rect(cio, cr, false, Color(OUT, OUT.a))
		if cif != null: _pn_layer.draw_texture_rect(cif, cr, false, Color(1, 1, 1, 0.97))
		if String(e[5]) != "":
			var cmk := icon_tex("n_plus" if String(e[5]) == "+" else "n_minus")
			if cmk != null: _pn_layer.draw_texture_rect(cmk, cr, false, Color(1, 1, 1, 1))
		_dtxt(Vector2(gx + 14.0, gy + 9.5), _fit_txt(_short4(e), 8, cwc - 14.0 - (18.0 if k % 2 == 1 and k / 2 == 1 else 0.0)), 8, ink)
''' + s[b:]
rep('var _pgbtn := Rect2()\n', 'var _pgbtn := Rect2()\nvar _dump299 := false\n')
s = s.replace('# status page: middle + right merged, 2 rows x 2 (left | right)', '# status page: middle + right merged, 3 rows x 2 (left | right): burn | shock, then 4 chips')
open(p, "w", encoding="utf-8").write(s)
print("ok")
