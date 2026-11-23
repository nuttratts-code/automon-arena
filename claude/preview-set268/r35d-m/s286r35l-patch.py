# R35l (owner after R35k): card = flat values only, 2 rows + "+N" (N1) · every % boost and every debuff OUTSIDE the card as an
# icon chip without numbers: buff = blue plate, debuff = red plate, white icon, "+" mark on the boost icons, ring counting down for
# timed ones (stun, M1) · row rule (L): burn / shock (with numbers) always take row 1; buffs/debuffs follow in arrival order,
# starting on row 1 only when the unit has no burn/shock, wrapping upward inside the card width · max HP cut = black part eating
# the HP bar from the right · cooldown slower = hourglass on red · hover (PC) or tap the chip (touch) = detail tooltip.
import sys, io
T = sys.argv[1] + '/scripts/ui/s286_team.gd'
s = io.open(T, encoding='utf-8').read()


def func_span(name):
    i = s.find('func ' + name + '(')
    if i < 0: raise SystemExit('func not found: ' + name)
    ends = [e for e in (s.find('\nfunc ', i + 5), s.find('\nconst ', i + 5), s.find('\nstatic func ', i + 5)) if e > 0]
    return i, min(ends) + 1


def replace_func(name, body):
    global s
    i, j = func_span(name)
    s = s[:i] + body + '\n' + s[j:]


def rep(a, b):
    global s
    if a not in s: raise SystemExit('anchor not found: %r' % a[:70])
    s = s.replace(a, b, 1)


rep("var _cw := {}", "var _seen := {}   # r35l: uid -> {effect key: clock first seen} (arrival order)\n"
    "var _mx0 := {}    # r35l: uid -> highest max HP seen (max HP cut = black part of the bar)\n"
    "var _tips: Array = []   # r35l: [Rect2, text] hover / tap targets, rebuilt every draw\n"
    "var _pin_tip := \"\"\nvar _pin_r := Rect2()\nvar _pin_t := 0.0\nvar _cw := {}")
rep("func _sort_units() -> void:\n\t_cw.clear()\n", "func _sort_units() -> void:\n\t_cw.clear()\n\t_seen.clear()\n\t_mx0.clear()\n")
rep("\t_ic_q.clear()\n\tif _ic_layer != null: _ic_layer.queue_redraw()\n",
    "\t_ic_q.clear()\n\t_tips.clear()\n\tif _ic_layer != null: _ic_layer.queue_redraw()\n")
rep("\tvar rows := 2\n\tfor uid in _order:\n\t\tif view.units.has(uid): rows = maxi(rows, _rows_for(view.units[uid], w))\n",
    "\tvar rows := 2   # r35l (N1): fixed 2 rows; more values -> \"+N\"\n")

# --- HP bar: max HP cut drawn black from the right
rep("\tvar mx := maxf(1.0, float(v[\"maxHp\"]))\n",
    "\tvar mx := maxf(1.0, float(v[\"maxHp\"]))\n"
    "\tvar uidb := int(v[\"uid\"])\n"
    "\t_mx0[uidb] = maxf(float(_mx0.get(uidb, 0.0)), mx)\n"
    "\tvar cut := 1.0 - mx / float(_mx0[uidb])\n"
    "\tif OS.get_environment(\"S286FAKESTAT\") == \"1\" and _order.find(uidb) == 0: cut = 0.3   # stills: max HP cut 30 %\n")
rep("\tvar hw := roundf(BAR_W * fr)\n", "\tvar hw := roundf(BAR_W * fr * (1.0 - cut))\n")
rep("\tif hw > 2.0: draw_rect(Rect2(x0 + 1.0, y0, hw - 2.0, 1.0), Color(1.0, 0.98, 0.85, 0.22))   # sun-lit top edge\n",
    "\tif hw > 2.0: draw_rect(Rect2(x0 + 1.0, y0, hw - 2.0, 1.0), Color(1.0, 0.98, 0.85, 0.14))   # sun-lit top edge\n"
    "\tif cut > 0.001:   # r35l: max HP cut = black part eating the bar from the right\n"
    "\t\tvar cw := roundf(BAR_W * cut)\n"
    "\t\tdraw_rect(Rect2(x0 + BAR_W - cw, y0, cw, HP_H), Color(0.02, 0.02, 0.02, 0.95))\n") if "0.22))   # sun-lit" in s else rep(
    "\tif hw > 2.0: draw_rect(Rect2(x0 + 1.0, y0, hw - 2.0, 1.0), Color(1.0, 0.98, 0.85, 0.14))   # sun-lit top edge\n",
    "\tif hw > 2.0: draw_rect(Rect2(x0 + 1.0, y0, hw - 2.0, 1.0), Color(1.0, 0.98, 0.85, 0.14))   # sun-lit top edge\n"
    "\tif cut > 0.001:   # r35l: max HP cut = black part eating the bar from the right\n"
    "\t\tvar cw := roundf(BAR_W * cut)\n"
    "\t\tdraw_rect(Rect2(x0 + BAR_W - cw, y0, cw, HP_H), Color(0.02, 0.02, 0.02, 0.95))\n")

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
	var c := r.position + Vector2(14.0, r.size.y * 0.5)
	var dr := 10.0
	var dia := PackedVector2Array([c + Vector2(0, -dr), c + Vector2(dr, 0), c + Vector2(0, dr), c + Vector2(-dr, 0)])
	draw_colored_polygon(dia, Color(0.08, 0.12, 0.16, 0.85 * a))
	if ic != null:
		var isz := dr * 2.0 * 1.15
		draw_texture_rect(ic, Rect2(c - Vector2(isz, isz) * 0.5, Vector2(isz, isz)), false, Color(1, 1, 1, a))
	draw_polyline(dia + PackedVector2Array([dia[0]]), Color(OWN_COL, 0.95 * a), 1.5)
	# inside = flat values only (r35l), 2 per row, 2 rows; more -> first 3 + "+N" (hover / tap the card = all values)
	var hv := _haves(v)
	var show := hv
	if hv.size() > 4:
		show = hv.slice(0, 3)
	var x0 := r.position.x + 27.0
	var colw := (r.end.x - 4.0 - x0) * 0.5
	for k in show.size():
		var it: Array = show[k]
		_chip(Vector2(x0 + float(k % 2) * colw, r.position.y + 3.5 + float(k / 2) * ROW_H), it[0], it[1], a, false)
	if hv.size() > 4:
		var mf: Font = TH.font("mono")
		var pp := Vector2(x0 + colw, r.position.y + 3.5 + ROW_H + 7.0)
		var more := "+%d" % (hv.size() - 3)
		draw_string_outline(mf, pp, more, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, 3, Color(OUT, OUT.a * a))
		draw_string(mf, pp, more, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color(INK, a))
		var lines := PackedStringArray()
		for it in hv: lines.append("%s %s" % [VAL_NAME.get(it[0], it[0]), it[1]])
		_tips.append([r, " · ".join(lines)])
	# above the card (r35l): row 1 = burn / shock with numbers, always; buffs / debuffs in arrival order after them
	var row := 0
	var hx := r.position.x + 2.0
	var st := _row1(v)
	for it in st:
		var cw := _chip_w(it[0], it[1]) + 5.0
		if hx > r.position.x + 2.0 and hx + cw > r.end.x - 1.0:
			row += 1; hx = r.position.x + 2.0
		_chip(Vector2(hx + 2.0, r.position.y - 12.0 - float(row) * ROW_H), it[0], it[1], a, true)
		_tips.append([Rect2(hx, r.position.y - 13.0 - float(row) * ROW_H, cw, 11.0), TIP_ROW1.get(it[0], "") % it[1]])
		hx += cw + 2.0
	var ef := _effects(v)
	if not ef.is_empty():
		if not st.is_empty():
			row += 1; hx = r.position.x + 2.0
		for e in ef:
			var ew := EF_SZ + 2.0
			if hx > r.position.x + 2.0 and hx + EF_SZ > r.end.x - 1.0:
				row += 1; hx = r.position.x + 2.0
			var er := Rect2(hx + 1.0, r.position.y - 13.0 - float(row) * ROW_H, EF_SZ, EF_SZ)
			_effect_chip(er, e, a)
			_tips.append([er, String(e[4])])
			hx += ew

const EF_SZ := 11.0
const VAL_NAME := {"atk": "พลังโจมตี", "armor": "เกราะ", "multi": "ตีต่อครั้ง", "burn": "ไฟต่อการตี", "shock": "สายฟ้าต่อการตี",
	"armhit": "เกราะต่อการตี", "heal": "ฮีลต่อการตี"}
const TIP_ROW1 := {"burn": "ติดไฟ %s", "shock": "ติดสายฟ้า %s"}

func _effect_chip(r: Rect2, e: Array, a: float) -> void:   # [key, icon, buff?, ring frac (-1 = none), tip, plus?]
	var buff: bool = e[2]
	var bg := Color("#2f6db5", 0.92 * a) if buff else Color("#b8343a", 0.92 * a)
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.set_corner_radius_all(2)
	sb.border_color = Color(OUT, 0.7 * a)
	sb.set_border_width_all(1)
	draw_style_box(sb, r)
	_ic_q.append([r.grow(-1.5), e[1], Color(1, 1, 1, 0.97), a])
	if e[5]:   # white "+" at the top-right corner (boost, not the plain value)
		_ic_q.append(["plus", r.position + Vector2(r.size.x - 1.5, 1.5), a])
	var fr: float = e[3]
	if fr >= 0.0:   # ring counting down (full = just applied)
		_ic_q.append(["ring", r.get_center(), r.size.x * 0.5 + 1.5, fr, a])

func _row1(v: Dictionary) -> Array:   # burn / shock on the unit (numbers)
	if OS.get_environment("S286FAKESTAT") == "1":
		var ix := _order.find(int(v["uid"]))
		if ix == 1: return [["burn", "12"], ["shock", "8"]]
		if ix == 2: return [["burn", "4"]]
		if ix in [0, 3]: return []
	var out := []
	if float(v.get("burn", 0.0)) > 0.0: out.append(["burn", R_num(float(v["burn"]))])
	if float(v.get("shock", 0.0)) > 0.0: out.append(["shock", R_num(float(v["shock"]))])
	return out

const BUFF_KEYS := [["hitAmp", "atk", "พลังโจมตีแรงขึ้น %s%%"], ["burnAmp", "burn", "ไฟแรงขึ้น %s%%"], ["shockAmp", "shock", "สายฟ้าแรงขึ้น %s%%"],
	["armorAmp", "armor", "เกราะที่ได้รับเพิ่ม %s%%"], ["healAmp", "heal", "ฮีลที่ได้รับเพิ่ม %s%%"], ["cdAmp", "cd", "ผลลดคูลดาวน์เพิ่ม %s%%"],
	["healToAtk", "h2a", "ฮีลแปลงเป็นพลังโจมตี %s%%"]]
const DEBUFF_KEYS := [["dmgTaken", "vuln", "โดนดาเมจตีแรงขึ้น %s%%", false], ["burnTaken", "burn", "โดนไฟแรงขึ้น %s%%", true],
	["shockTaken", "shock", "โดนสายฟ้าแรงขึ้น %s%%", true]]

func _effects(v: Dictionary) -> Array:   # buffs + debuffs in arrival order: [key, icon, buff?, ring, tip, plus?]
	var uid := int(v["uid"])
	if OS.get_environment("S286FAKESTAT") == "1":
		var ix := _order.find(uid)
		if ix == 0: return [["stun", "stun", false, 0.6, "มึนงง เหลือ 0.9 วิ", false]]
		if ix == 1: return [["hitAmp", "atk", true, -1.0, "พลังโจมตีแรงขึ้น 20%", true], ["shockAmp", "shock", true, -1.0, "สายฟ้าแรงขึ้น 30%", true]]
		if ix == 2: return [["stun", "stun", false, 0.3, "มึนงง เหลือ 0.4 วิ", false], ["dmgTaken", "vuln", false, -1.0, "โดนดาเมจตีแรงขึ้น 15%", false],
			["cdSlow", "cd", false, -1.0, "คูลดาวน์ช้าลง 30%", false], ["burnAmp", "burn", true, -1.0, "ไฟแรงขึ้น 50%", true],
			["healAmp", "heal", true, -1.0, "ฮีลที่ได้รับเพิ่ม 20%", true], ["armorAmp", "armor", true, -1.0, "เกราะที่ได้รับเพิ่ม 30%", true]]
		if ix == 3: return [["hitAmp", "atk", true, -1.0, "พลังโจมตีแรงขึ้น 20%", true], ["shockAmp", "shock", true, -1.0, "สายฟ้าแรงขึ้น 30%", true],
			["burnTaken", "burn", false, 0.8, "โดนไฟแรงขึ้น 25% (เหลือ 4 วิ)", true], ["cdAmp", "cd", true, -1.0, "ผลลดคูลดาวน์เพิ่ม 10%", true],
			["healToAtk", "h2a", true, -1.0, "ฮีลแปลงเป็นพลังโจมตี 25%", true]]
	var now: Array = []
	var sl := _stun_left(v)
	if sl > 0.0:
		var tot := maxf(0.001, float(v.get("stunL", 1.0)) / 1000.0)
		now.append(["stun", "stun", false, clampf(sl / tot, 0.0, 1.0), "มึนงง เหลือ %.1f วิ" % sl, false])
	var st: Variant = v.get("stat")
	if st is Dictionary:
		for bk in BUFF_KEYS:
			var val := float(st.get(bk[0], 0.0)) if st.get(bk[0]) is float or st.get(bk[0]) is int else 0.0
			if val > 0.0: now.append([bk[0], bk[1], true, -1.0, String(bk[2]) % R_num(val), true])
		for dk in DEBUFF_KEYS:
			var val := float(st.get(dk[0], 0.0)) if st.get(dk[0]) is float or st.get(dk[0]) is int else 0.0
			if val > 0.0: now.append([dk[0], dk[1], false, -1.0, String(dk[2]) % R_num(val), dk[3]])
	var seen: Dictionary = _seen.get(uid, {})
	var keep := {}
	for e in now:
		if not seen.has(e[0]): seen[e[0]] = float(view.clock) + float(seen.size()) * 0.001
		keep[e[0]] = seen[e[0]]
	_seen[uid] = keep   # an effect that ends and comes back later joins the end of the line
	now.sort_custom(func(p, q): return float(keep[p[0]]) < float(keep[q[0]]))
	return now
''')

replace_func('_haves', '''func _haves(v: Dictionary) -> Array: # r35l: flat values only (every % boost moved outside the card as a buff chip)
	var out := []
	var st: Variant = v.get("stat")
	var sd: Dictionary = st if st is Dictionary else {}
	if OS.get_environment("S286FAKESTAT") == "1" and _order.find(int(v["uid"])) == 3: # mock: busiest real flat set
		return [["atk", "100K"], ["armor", "100K"], ["multi", "3"], ["burn", "100K"], ["shock", "100K"]]
	if sd.has("atk") and float(sd["atk"]) != 0.0: out.append(["atk", R_num(float(sd["atk"]))])
	var arm := float(v.get("armor", 0.0))
	if arm > 0.0: out.append(["armor", R_num(arm)])
	var m := float(sd.get("multi", v.get("multi", 1.0)))
	if m > 1.0: out.append(["multi", R_num(m)])
	for hk in [["burnHit", "burn"], ["shockHit", "shock"], ["armorHit", "armhit"], ["healHit", "heal"]]:
		var val := float(sd.get(hk[0], 0.0)) if sd.get(hk[0]) is float or sd.get(hk[0]) is int else 0.0
		if val != 0.0: out.append([hk[1], R_num(val)])
	return out
''')

# icon layer: also draws "+" marks, rings and the tooltip (on top of everything)
replace_func('_draw_icons', '''func _draw_icons() -> void:
	for q in _ic_q:
		if q[0] is String and q[0] == "plus":
			var p: Vector2 = q[1]
			var a0: float = q[2]
			_ic_layer.draw_rect(Rect2(p.x - 3.0, p.y - 1.5, 5.0, 3.0), Color(OUT, 0.9 * a0))
			_ic_layer.draw_rect(Rect2(p.x - 2.0, p.y - 2.5, 3.0, 5.0), Color(OUT, 0.9 * a0))
			_ic_layer.draw_rect(Rect2(p.x - 2.5, p.y - 0.5, 4.0, 1.0), Color(1, 1, 1, a0))
			_ic_layer.draw_rect(Rect2(p.x - 1.0, p.y - 2.0, 1.0, 4.0), Color(1, 1, 1, a0))
			continue
		if q[0] is String and q[0] == "ring":
			var cc: Vector2 = q[1]
			var rr: float = q[2]
			var f0: float = q[3]
			_ic_layer.draw_arc(cc, rr, 0.0, TAU, 32, Color(OUT, 0.55 * float(q[4])), 1.5, true)
			_ic_layer.draw_arc(cc, rr, -PI * 0.5, -PI * 0.5 + TAU * f0, 32, Color(1, 1, 1, 0.95 * float(q[4])), 1.5, true)
			continue
		var r: Rect2 = q[0]
		var a: float = q[3]
		var o := icon_tex(String(q[1]) + "_o")
		var f := icon_tex(String(q[1]))
		if o != null: _ic_layer.draw_texture_rect(o, r, false, Color(OUT, OUT.a * a))
		if f != null: _ic_layer.draw_texture_rect(f, r, false, Color(q[2], a))
	_draw_tip()

func _draw_tip() -> void:   # r35l: hover (PC) or a tapped chip (touch, 2.5 s)
	var txt := ""
	var at := Rect2()
	var m := get_local_mouse_position()
	for i in range(_tips.size() - 1, -1, -1):
		if (_tips[i][0] as Rect2).has_point(m):
			txt = _tips[i][1]; at = _tips[i][0]; break
	var hov := OS.get_environment("S286HOVER")   # stills: show the tooltip of card N's first effect chip
	if txt == "" and hov != "" and _tips.size() > 0:
		for t in _tips:
			if String(t[1]).find(hov) >= 0: txt = t[1]; at = t[0]; break
	if txt == "" and _pin_tip != "" and Time.get_ticks_msec() / 1000.0 < _pin_t:
		txt = _pin_tip; at = _pin_r
	if txt == "": return
	var f: Font = TH.font("body")
	var fs := 10
	var tw := f.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	var box := Rect2(clampf(at.position.x, 4.0, size.x - tw - 14.0), at.position.y - 20.0, tw + 10.0, 16.0)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("#16202a", 0.94)
	sb.border_color = Color(1, 1, 1, 0.35)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(3)
	_ic_layer.draw_style_box(sb, box)
	_ic_layer.draw_string(f, box.position + Vector2(5.0, 12.0), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, INK)
''')

# tap on a chip = tooltip (touch), not a pick
rep("\tvar p := get_global_transform_with_canvas().affine_inverse() * mb.position\n\tfor uid in _rects:",
    "\tvar p := get_global_transform_with_canvas().affine_inverse() * mb.position\n"
    "\tfor i in range(_tips.size() - 1, -1, -1):   # r35l: a chip / a \\\"+N\\\" card tap shows its detail\n"
    "\t\tvar tr: Rect2 = _tips[i][0]\n"
    "\t\tif tr.has_point(p) and not _rects.values().has(tr):\n"
    "\t\t\t_pin_tip = _tips[i][1]; _pin_r = tr; _pin_t = Time.get_ticks_msec() / 1000.0 + 2.5\n"
    "\t\t\tget_viewport().set_input_as_handled()\n"
    "\t\t\treturn\n"
    "\tfor uid in _rects:")
io.open(T, 'w', encoding='utf-8', newline='\n').write(s)
print('r35l ok')
