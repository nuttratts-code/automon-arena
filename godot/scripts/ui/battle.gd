# Set 198 (plan-set196 7c): the battle screen = web #battle: title + clock · the field (battle_view.gd) · rune counts · dock
# (speed 1–16 · ticker · stop · skip · auto-skip). Set 199 (7d): the full result card (chips, messages, recap, replay / match
# details / next) and the live details of a tapped unit (live.gd). Display only: the match was decided and applied to the run
# state before this screen opens (set 22 rule), so closing the app mid-fight still counts it.
extends Control

const TH := preload("res://scripts/ui/theme.gd")
const BV := preload("res://scripts/ui/battle_view.gd")
const Live := preload("res://scripts/ui/live.gd")
const ARENA := preload("res://scripts/ui/arena.gd")

signal next_pressed
signal replay_pressed
signal details_pressed
signal speed_changed(v: int)
signal auto_skip_changed(on: bool)

const SPEEDS := [1, 2, 4, 8, 16]

var app: Control
var view: Control
var title: Label
var clock: Label
var tick: Label
var tick2: Label
var tick_cur := ""
var btn_stop: Button
var btn_skip: Button
var chk_auto: CheckBox
var speed_btns := {}
var rn_l: Button
var rn_r: Button
var replay_tag: Label
var result_box: Control
var res_title: Label
var res_sub: Label
var res_next: Label
var res_msgs: VBoxContainer
var res_chips: HBoxContainer
var chip_hearts: Label
var chip_wins: Label
var chip_gold: Label
var chip_gold_box: Control
var recap: VBoxContainer
var btn_details: Button
var live: Control # live.gd: details of the tapped unit
var btn_next: Button
var btn_again: Button
var rune_text := ["", ""]
var _msg_token := 0
var _live_at := 0
var last_runes: Array = []
var field: Control # set 205: the arena move fades it while the world draws the field
var top_hold: Control
var tray_hold: Control
var slot_runes := {} # "side:row:lane" → rune names worn there (for the live pane)

func setup(a: Control) -> void:
	app = a
	name = "Battle"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var m := MarginContainer.new()
	m.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for k in ["left", "right", "top", "bottom"]:
		m.add_theme_constant_override("margin_" + k, 8)
	add_child(m)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 5)
	m.add_child(v)
	# top: title · clock · replay tag
	var hud := HBoxContainer.new()
	hud.name = "Hud"
	hud.custom_minimum_size.y = 36
	hud.add_theme_constant_override("separation", 10)
	title = TH.label("", 15, "ink", "display")
	title.name = "Title"
	title.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	hud.add_child(title)
	replay_tag = TH.label(TH.ui_text("watching_replay"), 13, "accent", "body_b")
	replay_tag.name = "ReplayTag"
	replay_tag.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	hud.add_child(replay_tag)
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hud.add_child(sp)
	clock = TH.label(TH.ui_text("t_sec", {"t": "0.0"}), 15, "ink", "mono")
	clock.name = "Clock"
	clock.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	hud.add_child(clock)
	var tv := VBoxContainer.new() # set 205: hud + rune row slide in from the top after the arena move
	tv.add_theme_constant_override("separation", 5)
	tv.add_child(hud)
	# rune counts of both sides (tap = the full list in the message line)
	var rr := HBoxContainer.new()
	rr.name = "RuneRow"
	rn_l = _rune_btn("RnL")
	rn_r = _rune_btn("RnR")
	rn_l.pressed.connect(func() -> void: _say_runes(0))
	rn_r.pressed.connect(func() -> void: _say_runes(1))
	rr.add_child(rn_l)
	var sp2 := Control.new()
	sp2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	rr.add_child(sp2)
	rr.add_child(rn_r)
	tv.add_child(rr)
	top_hold = ARENA.hold(tv, "Top")
	v.add_child(top_hold)
	# the field
	var f := PanelContainer.new()
	f.name = "Field"
	f.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var fe := StyleBoxEmpty.new() # set 206: a window onto the 3D arena (app.stage), no box
	fe.content_margin_left = 10
	fe.content_margin_right = 10
	fe.content_margin_top = 6
	fe.content_margin_bottom = 6
	f.add_theme_stylebox_override("panel", fe)
	f.mouse_filter = Control.MOUSE_FILTER_PASS
	view = BV.new()
	view.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	view.size_flags_vertical = Control.SIZE_EXPAND_FILL
	view.custom_minimum_size = Vector2(0, 150)
	view.time_changed.connect(_on_time)
	view.log_line.connect(_on_log)
	view.ended.connect(func(_w: Variant, _t: float) -> void: _finished())
	f.add_child(view)
	field = f
	v.add_child(f)
	var dv := VBoxContainer.new() # set 205: the dock slides up from the bottom after the arena move
	dv.add_child(_build_dock())
	tray_hold = ARENA.hold(dv, "Tray")
	v.add_child(tray_hold)
	# 7d: live details of a tapped unit, floating over the half of the field the unit is NOT on
	view.unit_tapped.connect(_on_unit_tapped)
	live = Live.new()
	live.close_pressed.connect(unpick)
	add_child(live)
	result_box = _build_result()
	add_child(result_box)
	result_box.visible = false

# set 205 arena move: p = 0 in place … 1 gone (top up, dock down, past the screen edge)
func slide(p: float) -> void:
	ARENA.slide(top_hold, -p * (top_hold.size.y + 16.0))
	ARENA.slide(tray_hold, p * (tray_hold.size.y + 16.0))

func _rune_btn(nm: String) -> Button:
	var b := Button.new()
	b.name = nm
	b.flat = true
	b.add_theme_font_size_override("font_size", 13)
	b.add_theme_color_override("font_color", TH.c("mute"))
	b.visible = false
	return b

func _build_dock() -> Control:
	var d := PanelContainer.new()
	d.name = "Dock"
	d.custom_minimum_size.y = 52
	d.add_theme_stylebox_override("panel", TH.box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 10, 0, 2, 2))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	d.add_child(h)
	for sp in SPEEDS:
		var b := Button.new()
		b.name = "Speed%d" % sp
		b.text = "%d×" % sp
		b.toggle_mode = true
		b.custom_minimum_size = Vector2(44, 44)
		b.pressed.connect(func() -> void: speed_changed.emit(sp))
		h.add_child(b)
		speed_btns[sp] = b
	var tb := VBoxContainer.new()
	tb.name = "Ticker"
	tb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tb.alignment = BoxContainer.ALIGNMENT_CENTER
	tb.add_theme_constant_override("separation", 0)
	tick = TH.label("", 13, "ink")
	tick.name = "Tick"
	tick2 = TH.label("", 13, "mute")
	tick2.name = "Tick2"
	for l in [tick, tick2]:
		l.clip_text = true
		l.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		tb.add_child(l)
	h.add_child(tb)
	btn_stop = Button.new()
	btn_stop.name = "Stop"
	btn_stop.toggle_mode = true
	btn_stop.custom_minimum_size = Vector2(84, 44)
	btn_stop.text = TH.ui_text("b_stop")
	btn_stop.pressed.connect(_on_stop)
	h.add_child(btn_stop)
	btn_skip = Button.new()
	btn_skip.name = "Skip"
	btn_skip.custom_minimum_size = Vector2(96, 44)
	btn_skip.text = TH.ui_text("b_skip")
	btn_skip.pressed.connect(skip_now)
	h.add_child(btn_skip)
	chk_auto = CheckBox.new()
	chk_auto.name = "AutoSkip"
	chk_auto.text = TH.ui_text("b_auto")
	chk_auto.add_theme_font_size_override("font_size", 13)
	chk_auto.tooltip_text = TH.ui_text("b_auto_tip")
	chk_auto.toggled.connect(func(on: bool) -> void: auto_skip_changed.emit(on))
	h.add_child(chk_auto)
	return d

func _chip(bg: String, ink: String, art: String, nm: String) -> Array:
	var p := PanelContainer.new()
	p.name = nm
	p.add_theme_stylebox_override("panel", TH.box(TH.c(bg), TH.c(bg), 20, 0, 12, 4))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	var tex: Texture2D = TH.art("ui", art) if art != "" else null
	if tex != null:
		var ic := TextureRect.new()
		ic.texture = tex
		ic.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		ic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		ic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		ic.custom_minimum_size = Vector2(20, 20)
		ic.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		h.add_child(ic)
	var l := TH.label("", 15, ink, "body_b")
	h.add_child(l)
	p.add_child(h)
	return [p, l]

# 7d: the full result card (web #result): small line (round · time) · big win / lose word · chips (hearts, wins, win-bonus gold)
# · messages · recap (top 3 damage dealers of your team + who took the most) · what comes next · replay / match details / next
func _build_result() -> Control:
	var box := Control.new()
	box.name = "Result"
	box.set_anchors_preset(Control.PRESET_FULL_RECT)
	box.mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new()
	dim.color = Color(20 / 255.0, 16 / 255.0, 12 / 255.0, 0.45)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.add_child(dim)
	var cc := CenterContainer.new()
	cc.set_anchors_preset(Control.PRESET_FULL_RECT)
	cc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.add_child(cc)
	var p := PanelContainer.new()
	p.name = "ResCard"
	p.add_theme_stylebox_override("panel", TH.box(TH.c("panel"), TH.c("line"), 16, 1, 20, 14))
	cc.add_child(p)
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 8)
	p.add_child(vb)
	var cols := HBoxContainer.new()
	cols.add_theme_constant_override("separation", 20)
	vb.add_child(cols)
	# left: the outcome
	var left := VBoxContainer.new()
	left.custom_minimum_size.x = 300
	left.add_theme_constant_override("separation", 5)
	cols.add_child(left)
	res_sub = TH.label("", 13, "mute")
	res_sub.name = "ResSub"
	left.add_child(res_sub)
	res_title = TH.label("", 38, "ink", "display_b")
	res_title.name = "ResTitle"
	left.add_child(res_title)
	res_chips = HBoxContainer.new()
	res_chips.name = "ResChips"
	res_chips.add_theme_constant_override("separation", 6)
	var c1 := _chip("heart-bg", "heart-ink", "heart", "ChipHearts")
	var c2 := _chip("ok-bg", "ok", "", "ChipWins")
	var c3 := _chip("gold-bg", "gold-ink", "gold", "ChipGold")
	chip_hearts = c1[1]
	chip_wins = c2[1]
	chip_gold = c3[1]
	chip_gold_box = c3[0]
	for c in [c1[0], c2[0], c3[0]]:
		res_chips.add_child(c)
	left.add_child(res_chips)
	res_msgs = VBoxContainer.new()
	res_msgs.name = "ResMsgs"
	res_msgs.add_theme_constant_override("separation", 1)
	left.add_child(res_msgs)
	# right: recap
	recap = VBoxContainer.new()
	recap.name = "Recap"
	recap.custom_minimum_size.x = 250
	recap.add_theme_constant_override("separation", 4)
	cols.add_child(recap)
	res_next = TH.label("", 13, "mute")
	res_next.name = "ResNext"
	vb.add_child(res_next)
	var acts := HBoxContainer.new()
	acts.name = "ResActs"
	acts.alignment = BoxContainer.ALIGNMENT_END
	acts.add_theme_constant_override("separation", 8)
	btn_again = Button.new()
	btn_again.name = "ReplayThis"
	btn_again.text = TH.ui_text("r_replay")
	btn_again.custom_minimum_size = Vector2(0, 44)
	btn_again.pressed.connect(func() -> void: replay_pressed.emit())
	acts.add_child(btn_again)
	btn_details = Button.new()
	btn_details.name = "ToMx"
	btn_details.text = TH.ui_text("r_details")
	btn_details.custom_minimum_size = Vector2(0, 44)
	btn_details.pressed.connect(func() -> void: details_pressed.emit())
	acts.add_child(btn_details)
	btn_next = Button.new()
	btn_next.name = "Next"
	btn_next.custom_minimum_size = Vector2(150, 44)
	TH.primary(btn_next, false)
	btn_next.pressed.connect(func() -> void: next_pressed.emit())
	acts.add_child(btn_next)
	vb.add_child(acts)
	return box

# ---------- showing a match ----------
# res = simulate() result with events · charmap = characters (+ the boss card) · runes = [your compact list, enemy compact list]
func start(res: Dictionary, charmap: Dictionary, title_text: String, runes: Array, as_replay: bool) -> void:
	result_box.visible = false
	unpick()
	last_runes = runes
	replay_tag.visible = as_replay
	title.text = title_text
	tick_cur = title_text
	tick.text = title_text
	tick2.text = ""
	btn_stop.set_pressed_no_signal(false)
	btn_stop.text = TH.ui_text("b_stop")
	clock.text = TH.ui_text("t_sec", {"t": "0.0"})
	view.speed = float(app.speed)
	view.load_result(res, charmap)
	_place_runes(runes)
	set_speed_ui(app.speed)
	chk_auto.set_pressed_no_signal(app.auto_skip)
	view.play()

# "ดูรีเพลย์" on the result card: this match again right away (display only) with the same title and rune marks
func replay_again() -> void:
	start(view.result, view.cm, title.text, last_runes, true)

func set_speed_ui(v: int) -> void:
	view.speed = float(v)
	for sp in speed_btns:
		speed_btns[sp].set_pressed_no_signal(sp == v)

func _on_stop() -> void:
	if view.result == null or view.is_ended:
		btn_stop.set_pressed_no_signal(false)
		return
	if view.playing:
		view.pause()
		btn_stop.text = TH.ui_text("b_go")
		btn_stop.set_pressed_no_signal(true)
	else:
		btn_stop.text = TH.ui_text("b_stop")
		btn_stop.set_pressed_no_signal(false)
		view.play()

func skip_now() -> void:
	btn_stop.set_pressed_no_signal(false)
	btn_stop.text = TH.ui_text("b_stop")
	if view.result != null and not view.is_ended:
		view.skip()

func _on_time(ms: float) -> void:
	clock.text = TH.ui_text("t_sec", {"t": "%.1f" % (ms / 1000.0)})
	if live.visible and live.shown_ver != view.ver and (view.fast == false) and Time.get_ticks_msec() - _live_at >= 150:
		_show_live() # repaint ≤ ~7 times a second while the match plays

# ---------- live details of a tapped unit (web bPick / renderBInfo) ----------
func _on_unit_tapped(uid: int) -> void:
	if uid < 0 or (view.picked != null and int(view.picked) == uid):
		unpick() # the same unit again, or an empty cell = back to the field
		return
	view.set_picked(uid)
	_show_live()

func unpick() -> void:
	if view.picked != null:
		view.set_picked(null)
	live.visible = false
	live.uid = null

func _show_live() -> void:
	if view.picked == null or view.result == null:
		return
	_live_at = Time.get_ticks_msec()
	var v: Variant = view.units.get(int(view.picked))
	var names: Array = []
	if v != null:
		names = slot_runes.get("%d:%d:%d" % [v["side"], v["row"], v["lane"]], [])
	live.fill(view, view.picked, names)
	if live.uid != null and view.picked != null and int(live.uid) != int(view.picked):
		view.set_picked(live.uid)
	# the pane covers the other side's half (your unit → right half), between the top bar and the dock
	var side := int(v["side"]) if v != null else 0
	var w := minf(400.0, size.x * 0.48)
	live.position = Vector2(size.x - w - 10.0 if side == 0 else 10.0, 44.0)
	var max_h := maxf(120.0, size.y - 44.0 - 66.0)
	live.size = Vector2(w, minf(max_h, live.size.y) if live.size.y > 60.0 else max_h)
	live.fit(max_h)
	_fit_live_later(max_h)

# the wrapped text height is only known after the containers were laid out at the new width (two frames)
func _fit_live_later(max_h: float) -> void:
	if not is_inside_tree():
		return
	for k in 2:
		await get_tree().process_frame
		if live.visible:
			live.fit(max_h)

func _on_log(line: String) -> void:
	# web: the newest event shown on the first line, the one before it dimmed below
	if tick_cur != "":
		tick2.text = tick_cur
	tick_cur = line
	tick.text = line

func _finished() -> void:
	if live.visible:
		_show_live()
	btn_stop.set_pressed_no_signal(false)
	btn_stop.text = TH.ui_text("b_stop")
	app.on_battle_finished()

# d = {title, win (0 you · 1 enemy · 2 draw), sub, chips: null | {hearts, wins, gold ("" = hidden)}, msgs: [text], next_line, next_text}
func show_result(d: Dictionary) -> void:
	res_title.text = str(d["title"])
	res_title.add_theme_color_override("font_color", TH.c("bad" if int(d["win"]) == 1 else "ok"))
	res_title.add_theme_font_size_override("font_size", 38 if d.get("chips") != null else 24)
	res_sub.text = str(d["sub"])
	var ch: Variant = d.get("chips")
	res_chips.visible = ch is Dictionary
	if ch is Dictionary:
		chip_hearts.text = str(ch["hearts"])
		chip_wins.text = str(ch["wins"])
		chip_gold.text = str(ch["gold"])
		chip_gold_box.visible = str(ch["gold"]) != ""
	for c in res_msgs.get_children():
		res_msgs.remove_child(c)
		c.queue_free()
	for m in (d["msgs"] as Array).slice(0, 6):
		var l := TH.label("• " + str(m), 13, "ink")
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.custom_minimum_size.x = 300
		res_msgs.add_child(l)
	res_msgs.visible = res_msgs.get_child_count() > 0
	_fill_recap(view.result)
	res_next.text = str(d["next_line"])
	res_next.visible = res_next.text != ""
	btn_next.text = str(d["next_text"])
	btn_again.visible = view.result != null
	btn_details.visible = view.result != null
	result_box.visible = true

# web renderRecap(): facts only · your side · top 3 by damage dealt + the one who took the most damage
func _fill_recap(res: Variant) -> void:
	for c in recap.get_children():
		recap.remove_child(c)
		c.queue_free()
	var us: Array = []
	if res is Dictionary and res.get("units") is Array:
		us = (res["units"] as Array).filter(func(u): return int(u["side"]) == 0)
	var top := us.filter(func(u): return float(u["dealt"]) > 0.0)
	top.sort_custom(func(a, b): return float(a["dealt"]) > float(b["dealt"]))
	top = top.slice(0, 3)
	recap.visible = not top.is_empty()
	if top.is_empty():
		return
	recap.add_child(TH.label(TH.ui_text("recap_title"), 13, "mute", "body_b"))
	var mx := float(top[0]["dealt"])
	for u in top:
		var c: Variant = view.cm.get(u["id"])
		var row := HBoxContainer.new()
		row.name = "RecapRow"
		row.set_meta("tag", "RecapRow")
		row.add_theme_constant_override("separation", 6)
		var nm := TH.label(str(c["name"]) if c is Dictionary else str(u["id"]), 13, "ink")
		nm.custom_minimum_size.x = 96
		nm.clip_text = true
		nm.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		row.add_child(nm)
		var bar := Bar.new()
		var tok: String = TH.TRIBE_SHAPE[c["tribe"]][1] if c is Dictionary and TH.TRIBE_SHAPE.has(c.get("tribe")) else "mute"
		bar.parts = [[1.0, TH.c(tok)]]
		bar.frac = maxf(0.04, float(u["dealt"]) / mx)
		bar.under = TH.c("soft")
		bar.custom_minimum_size = Vector2(70, 10)
		bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(bar)
		var num := TH.label(fmt_n(float(u["dealt"])), 13, "ink", "mono")
		num.custom_minimum_size.x = 52
		num.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		row.add_child(num)
		recap.add_child(row)
	var tank: Variant = null
	for u in us:
		if float(u["taken"]) > 0.0 and (tank == null or float(u["taken"]) > float(tank["taken"])):
			tank = u
	if tank != null:
		var tc: Variant = view.cm.get(tank["id"])
		var t := TH.label(TH.ui_text("recap_tank", {"n": str(tc["name"]) if tc is Dictionary else str(tank["id"])}) + fmt_n(float(tank["taken"])), 13, "mute")
		t.name = "RecapTank"
		recap.add_child(t)

# 1234567 → "1,234,567" (web toLocaleString('en-US') of a rounded number)
static func fmt_n(v: float) -> String:
	var s := str(int(roundf(absf(v))))
	var out := ""
	while s.length() > 3:
		out = "," + s.right(3) + out
		s = s.left(s.length() - 3)
	return ("-" if v < -0.5 else "") + s + out

# a bar of coloured parts: frac = filled share of the width · parts = [[share of the filled part, colour]]
class Bar extends Control:
	var frac := 1.0
	var parts: Array = []
	var under := Color(0, 0, 0, 0)
	func _draw() -> void:
		draw_rect(Rect2(Vector2.ZERO, size), under)
		var x := 0.0
		var w := size.x * clampf(frac, 0.0, 1.0)
		for p in parts:
			var pw := w * float(p[0])
			draw_rect(Rect2(x, 0, pw, size.y), p[1])
			x += pw

# ---------- rune strips ----------
func _place_runes(runes: Array) -> void:
	slot_runes = {}
	for i in 2:
		var d: Dictionary = runes[i] if i < runes.size() and runes[i] is Dictionary else {"team": [], "slot": {}}
		var team: Array = d["team"]
		rune_text[i] = TH.ui_text("b_runes_full", {"who": TH.ui_text("b_who_foe" if i == 1 else "b_who_you"), "list": " · ".join(PackedStringArray(team))}) if not team.is_empty() else ""
		var b: Button = rn_r if i == 1 else rn_l
		b.visible = not team.is_empty()
		b.text = TH.ui_text("b_runes", {"who": TH.ui_text("b_who_foe" if i == 1 else "b_who_you"), "n": str(team.size())})
		for key in d["slot"]:
			slot_runes[key] = d["slot"][key]
			var cell: Variant = view.cells.get(key)
			if cell == null:
				continue
			var names: Array = d["slot"][key]
			var mk := TH.label("◆" + (str(names.size()) if names.size() > 1 else ""), 12, "r-epic", "body_b")
			mk.name = "RuneMark"
			mk.tooltip_text = " · ".join(PackedStringArray(names))
			mk.mouse_filter = Control.MOUSE_FILTER_IGNORE
			mk.set_anchors_preset(Control.PRESET_TOP_LEFT)
			cell.add_child(mk)

func _say_runes(i: int) -> void:
	if rune_text[i] != "":
		app.say_info(rune_text[i])
