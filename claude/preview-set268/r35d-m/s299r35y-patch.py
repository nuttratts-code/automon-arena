# set 299 r35y: status column = buff/debuff chips only (same chip look as the cards) · multi-hit value gets "×" in front everywhere
import sys
p = sys.argv[1] if len(sys.argv) > 1 else r"D:\GitHub\automon-scratch\g286\scripts\ui\s286_team.gd"
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:60])
    s = s.replace(a, b)
# 1 multi × (every place reads _haves)
rep('if m > 1.0: out.append(["multi", R_num(m)])', 'if m > 1.0: out.append(["multi", "×" + R_num(m)])   # s299 r35y')
rep('["multi", "3"], ["burn", "100K"]', '["multi", "×3"], ["burn", "100K"]')
# 2 status column: effects only
rep('\tfor q in _row1(v): items.append(["n", String(q[0]), String(L4_NUM.get(q[0], q[0])) + " " + String(q[1]), true])\n\tfor e in _effects(v): items.append(["e", String(e[1]), _short4(e), bool(e[2])])',
    '\tfor e in _effects(v): items.append(["e", String(e[1]), _short4(e), bool(e[2]), String(e[5])])   # s299 r35y: no armour / burn / shock numbers here')
rep('''		if it[0] == "n":
			_pn_layer.draw_rect(Rect2(gx, gy + 3.0, 8.0, 8.0), Color(TAG_COL2.get(_l4_col(String(it[1])), INK), 1.0))
		else:
			_pn_layer.draw_rect(Rect2(gx, gy + 3.0, 8.0, 8.0), Color("#2f6db5") if it[3] else Color("#b8343a"))
		_dtxt(Vector2(gx + 11.0, gy + 11.0), _fit_txt(String(it[2]), 8, cw3 - 11.0), 8, ink)''',
'''		var cr := Rect2(gx, gy + 1.0, 11.0, 11.0)   # same chip as on the cards: cut 15 %, baked icon, small + / −
		var cpp := _cutpts299(cr, 11.0 * 0.15)
		_pn_layer.draw_colored_polygon(cpp, Color("#2f6db5", 0.92) if it[3] else Color("#b8343a", 0.92))
		_pn_layer.draw_polyline(cpp + PackedVector2Array([cpp[0]]), Color(OUT, 0.7), 1.0)
		var cio := icon_tex("n_" + String(it[1]) + "_o")
		var cif := icon_tex("n_" + String(it[1]))
		if cio != null: _pn_layer.draw_texture_rect(cio, cr, false, Color(OUT, OUT.a))
		if cif != null: _pn_layer.draw_texture_rect(cif, cr, false, Color(1, 1, 1, 0.97))
		if String(it[4]) != "":
			var cmk := icon_tex("n_plus" if String(it[4]) == "+" else "n_minus")
			if cmk != null: _pn_layer.draw_texture_rect(cmk, cr, false, Color(1, 1, 1, 1))
		_dtxt(Vector2(gx + 14.0, gy + 11.0), _fit_txt(String(it[2]), 8, cw3 - 14.0), 8, ink)''')
open(p, "w", encoding="utf-8").write(s)
print("ok")
