# R35m (owner after R35l): debuffs use "+" or "−" by the stat's direction too (armour down = −, cooldown up = +) ·
# time left = the chip fades from the top down (no ring) · even spacing everywhere: every chip 11 px tall, 2 px gaps,
# 13 px row pitch, card values flow with one gap (no wide columns).
import sys, io
T = sys.argv[1] + '/scripts/ui/s286_team.gd'
s = io.open(T, encoding='utf-8').read()


def rep(a, b, cnt=1):
    global s
    if a not in s: raise SystemExit('anchor not found: %r' % a[:80])
    s = s.replace(a, b, cnt)


# --- chips: one height (11) for value chips and status plates
rep("Rect2(p.x - 2.0, p.y - 1.0, w + 5.0, 10.0)", "Rect2(p.x - 2.0, p.y - 1.5, w + 4.0, CH)")
rep("const EF_SZ := 11.0", "const EF_SZ := 11.0\nconst CH := 11.0     # r35m: every chip 11 tall\nconst G := 2.0       # r35m: one gap between chips and rows\nconst VG := 6.0      # r35m: gap between values inside the card")

# --- card values: flow with one gap, 2 rows, overflow -> "+N"
i = s.find("\t# inside = flat values only (r35l)")
j = s.find("\t# above the card (r35l)")
if i < 0 or j < 0: raise SystemExit('card value block not found')
s = s[:i] + '''	# inside = flat values only, flowing with one gap (r35m), 2 rows; overflow -> "+N" (hover / tap the card = all values)
	var hv := _haves(v)
	var x0 := r.position.x + 27.0
	var xr := r.end.x - 4.0
	var mf: Font = TH.font("mono")
	var slots := []
	var x := x0
	var ry := 0
	for k in hv.size():
		var wv := _chip_w(hv[k][0], hv[k][1])
		if x + wv > xr and x > x0:
			ry += 1; x = x0
		slots.append([x, ry]); x += wv + VG
	var fit := hv.size()
	if ry > 1:   # does not fit in 2 rows: keep what fits, last slot becomes "+N"
		fit = 0
		for k in hv.size():
			if int(slots[k][1]) > 1: break
			fit = k + 1
		var plus_w := mf.get_string_size("+%d" % (hv.size() - fit + 1), HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x
		while fit > 0 and float(slots[fit - 1][0]) + _chip_w(hv[fit - 1][0], hv[fit - 1][1]) + VG + plus_w > xr and int(slots[fit - 1][1]) == 1:
			fit -= 1
	for k in fit:
		_chip(Vector2(float(slots[k][0]), r.position.y + 3.5 + float(slots[k][1]) * 11.5), hv[k][0], hv[k][1], a, false)
	if fit < hv.size():
		var more := "+%d" % (hv.size() - fit)
		var px := x0 if fit == 0 else float(slots[fit - 1][0]) + _chip_w(hv[fit - 1][0], hv[fit - 1][1]) + VG
		var pp := Vector2(px, r.position.y + 3.5 + 11.5 + 7.0)
		draw_string_outline(mf, pp, more, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, 3, Color(OUT, OUT.a * a))
		draw_string(mf, pp, more, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color(INK, a))
		var lines := PackedStringArray()
		for it in hv: lines.append("%s %s" % [VAL_NAME.get(it[0], it[0]), it[1]])
		_tips.append([r, " · ".join(lines)])
''' + s[j:]

# --- above the card: one gap, one row pitch, rows sit G above the card
i = s.find("\t# above the card (r35l)")
j = s.find("const EF_SZ")
if i < 0 or j < 0: raise SystemExit('above block not found')
s = s[:i] + '''	# above the card (r35m spacing): rows of 11 px chips, 2 px gaps, row 1 = burn / shock, then buffs / debuffs in arrival order
	var row := 0
	var hx := r.position.x
	var st := _row1(v)
	for it in st:
		var pw := _chip_w(it[0], it[1]) + 4.0
		if hx > r.position.x and hx + pw > r.end.x:
			row += 1; hx = r.position.x
		var top := r.position.y - G - CH - float(row) * (CH + G)
		_chip(Vector2(hx + 2.0, top + 1.5), it[0], it[1], a, true)
		_tips.append([Rect2(hx, top, pw, CH), TIP_ROW1.get(it[0], "") % it[1]])
		hx += pw + G
	var ef := _effects(v)
	if not ef.is_empty():
		if not st.is_empty():
			row += 1; hx = r.position.x
		for e in ef:
			if hx > r.position.x and hx + EF_SZ > r.end.x:
				row += 1; hx = r.position.x
			var er := Rect2(hx, r.position.y - G - CH - float(row) * (CH + G), EF_SZ, CH)
			_effect_chip(er, e, a)
			_tips.append([er, String(e[4])])
			hx += EF_SZ + G

''' + s[j:]

# --- effect chip: mark "+"/"−"/none, timer = fade from the top down
rep('''	if e[5]:   # white "+" at the top-right corner (boost, not the plain value)
		_ic_q.append(["plus", r.position + Vector2(r.size.x - 1.5, 1.5), a])
	var fr: float = e[3]
	if fr >= 0.0:   # ring counting down (full = just applied)
		_ic_q.append(["ring", r.get_center(), r.size.x * 0.5 + 1.5, fr, a])''',
'''	var mk: String = e[5]
	if mk != "":   # white "+" / "−" at the top-right corner = which way the stat goes
		_ic_q.append([mk, r.position + Vector2(r.size.x - 1.5, 1.5), a])
	var fr: float = e[3]
	if fr >= 0.0:   # r35m: time left = the chip fades from the top down (used part = dim veil on top)
		_ic_q.append(["veil", Rect2(r.position, Vector2(r.size.x, roundf(r.size.y * (1.0 - fr)))), a])''')
rep('''		if q[0] is String and q[0] == "plus":
			var p: Vector2 = q[1]
			var a0: float = q[2]
			_ic_layer.draw_rect(Rect2(p.x - 3.0, p.y - 1.5, 5.0, 3.0), Color(OUT, 0.9 * a0))
			_ic_layer.draw_rect(Rect2(p.x - 2.0, p.y - 2.5, 3.0, 5.0), Color(OUT, 0.9 * a0))
			_ic_layer.draw_rect(Rect2(p.x - 2.5, p.y - 0.5, 4.0, 1.0), Color(1, 1, 1, a0))
			_ic_layer.draw_rect(Rect2(p.x - 1.0, p.y - 2.0, 1.0, 4.0), Color(1, 1, 1, a0))
			continue''',
'''		if q[0] is String and (q[0] == "+" or q[0] == "-"):
			var p: Vector2 = q[1]
			var a0: float = q[2]
			_ic_layer.draw_rect(Rect2(p.x - 3.0, p.y - 1.5, 5.0, 3.0), Color(OUT, 0.9 * a0))
			_ic_layer.draw_rect(Rect2(p.x - 2.5, p.y - 0.5, 4.0, 1.0), Color(1, 1, 1, a0))
			if q[0] == "+":
				_ic_layer.draw_rect(Rect2(p.x - 2.0, p.y - 2.5, 3.0, 5.0), Color(OUT, 0.9 * a0))
				_ic_layer.draw_rect(Rect2(p.x - 2.5, p.y - 0.5, 4.0, 1.0), Color(1, 1, 1, a0))
				_ic_layer.draw_rect(Rect2(p.x - 1.0, p.y - 2.0, 1.0, 4.0), Color(1, 1, 1, a0))
			continue
		if q[0] is String and q[0] == "veil":
			var vr: Rect2 = q[1]
			if vr.size.y > 0.0: _ic_layer.draw_rect(vr, Color(0.06, 0.07, 0.08, 0.62 * float(q[2])))
			continue''')

# marks: true -> "+", false -> "" ; debuffs by direction
s = s.replace('"พลังโจมตีแรงขึ้น 20%", true]', '"พลังโจมตีแรงขึ้น 20%", "+"]').replace('"สายฟ้าแรงขึ้น 30%", true]', '"สายฟ้าแรงขึ้น 30%", "+"]')
s = s.replace('"ไฟแรงขึ้น 50%", true]', '"ไฟแรงขึ้น 50%", "+"]').replace('"ฮีลที่ได้รับเพิ่ม 20%", true]', '"ฮีลที่ได้รับเพิ่ม 20%", "+"]')
s = s.replace('"เกราะที่ได้รับเพิ่ม 30%", true]', '"เกราะที่ได้รับเพิ่ม 30%", "+"]').replace('"ผลลดคูลดาวน์เพิ่ม 10%", true]', '"ผลลดคูลดาวน์เพิ่ม 10%", "+"]')
s = s.replace('"ฮีลแปลงเป็นพลังโจมตี 25%", true]', '"ฮีลแปลงเป็นพลังโจมตี 25%", "+"]')
s = s.replace('"โดนไฟแรงขึ้น 25% (เหลือ 4 วิ)", true]', '"โดนไฟแรงขึ้น 25% (เหลือ 4 วิ)", "+"], ["armorCut", "armor", false, 0.5, "เกราะที่ได้รับ −30% (เหลือ 3 วิ)", "-"]')
s = s.replace('"มึนงง เหลือ 0.9 วิ", false]', '"มึนงง เหลือ 0.9 วิ", ""]').replace('"มึนงง เหลือ 0.4 วิ", false]', '"มึนงง เหลือ 0.4 วิ", ""]')
s = s.replace('"โดนดาเมจตีแรงขึ้น 15%", false]', '"โดนดาเมจตีแรงขึ้น 15%", "+"]').replace('"คูลดาวน์ช้าลง 30%", false]', '"คูลดาวน์ช้าลง 30%", "+"]')
s = s.replace('"มึนงง เหลือ %.1f วิ" % sl, false])', '"มึนงง เหลือ %.1f วิ" % sl, ""])')
s = s.replace('String(bk[2]) % R_num(val), true])', 'String(bk[2]) % R_num(val), "+"])')
s = s.replace('String(dk[2]) % R_num(val), dk[3]])', 'String(dk[2]) % R_num(val), "+"])')
s = s.replace('# [key, icon, buff?, ring frac (-1 = none), tip, plus?]', '# [key, icon, buff?, time left 0..1 (-1 = none), tip, mark "+" / "-" / ""]')
for bad in (', true]', ', false]'):
    k = s.find('func _effects(')
    seg = s[k:s.find('\nfunc ', k + 5)]
    if ('-1.0' in seg) and (bad in seg.replace(', false, -1.0', '').replace(', true, -1.0', '').replace(', false, 0.', '').replace(', true, 0.', '')):
        raise SystemExit('unconverted mark left: ' + bad)
io.open(T, 'w', encoding='utf-8', newline='\n').write(s)
print('r35m ok')
