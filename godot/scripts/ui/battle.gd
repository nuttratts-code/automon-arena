# Set 198 (plan-set196 7c): the battle screen = web #battle: title + clock · the field (battle_view.gd) · rune counts · dock
# (speed 1–16 · ticker · stop · skip · auto-skip) · a small result card with the next button.
# 7d adds the full result screen (chips, messages, recap, match details, run end). Display only: the match was decided and
# applied to the run state before this screen opens (set 22 rule), so closing the app mid-fight still counts it.
extends Control

const TH := preload("res://scripts/ui/theme.gd")
const BV := preload("res://scripts/ui/battle_view.gd")

signal next_pressed
signal replay_pressed
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
var res_msgs: Label
var btn_next: Button
var btn_again: Button
var rune_text := ["", ""]
var _msg_token := 0

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
	v.add_child(hud)
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
	v.add_child(rr)
	# the field
	var f := PanelContainer.new()
	f.name = "Field"
	f.size_flags_vertical = Control.SIZE_EXPAND_FILL
	f.add_theme_stylebox_override("panel", TH.box(TH.c("arena"), TH.c("arena-line"), 12, 1, 10, 6))
	view = BV.new()
	view.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	view.size_flags_vertical = Control.SIZE_EXPAND_FILL
	view.custom_minimum_size = Vector2(0, 150)
	view.time_changed.connect(_on_time)
	view.log_line.connect(_on_log)
	view.ended.connect(func(_w: Variant, _t: float) -> void: _finished())
	f.add_child(view)
	v.add_child(f)
	v.add_child(_build_dock())
	result_box = _build_result()
	add_child(result_box)
	result_box.visible = false

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
	p.add_theme_stylebox_override("panel", TH.box(TH.c("panel"), TH.c("line"), 16, 1, 22, 16))
	cc.add_child(p)
	var vb := VBoxContainer.new()
	vb.custom_minimum_size.x = 320
	vb.add_theme_constant_override("separation", 6)
	p.add_child(vb)
	res_title = TH.label("", 34, "ink", "display_b")
	res_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	res_title.name = "ResTitle"
	vb.add_child(res_title)
	res_sub = TH.label("", 14, "mute")
	res_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	res_sub.name = "ResSub"
	vb.add_child(res_sub)
	res_msgs = TH.label("", 13, "ink")
	res_msgs.name = "ResMsgs"
	res_msgs.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vb.add_child(res_msgs)
	res_next = TH.label("", 13, "mute")
	res_next.name = "ResNext"
	res_next.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vb.add_child(res_next)
	var acts := HBoxContainer.new()
	acts.alignment = BoxContainer.ALIGNMENT_CENTER
	acts.add_theme_constant_override("separation", 8)
	btn_again = Button.new()
	btn_again.name = "ReplayThis"
	btn_again.text = TH.ui_text("r_replay")
	btn_again.custom_minimum_size = Vector2(0, 44)
	btn_again.pressed.connect(func() -> void: replay_pressed.emit())
	acts.add_child(btn_again)
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

func _on_log(line: String) -> void:
	# web: the newest event shown on the first line, the one before it dimmed below
	if tick_cur != "":
		tick2.text = tick_cur
	tick_cur = line
	tick.text = line

func _finished() -> void:
	btn_stop.set_pressed_no_signal(false)
	btn_stop.text = TH.ui_text("b_stop")
	app.on_battle_finished()

# 7c: a small card with the outcome and the next button (7d replaces it with the full result screen)
func show_result(win: int, sub: String, msgs: Array, next_line: String, next_text: String, replay: bool) -> void:
	res_title.text = TH.ui_text("r_win" if win == 0 else "r_lose" if win == 1 else "r_draw") if not replay else ""
	res_title.add_theme_color_override("font_color", TH.c("bad" if win == 1 else "ok"))
	res_sub.text = sub
	res_msgs.text = "\n".join(PackedStringArray(msgs))
	res_msgs.visible = not msgs.is_empty()
	res_next.text = next_line
	btn_next.text = next_text
	btn_again.visible = view.result != null
	result_box.visible = true

# ---------- rune strips ----------
func _place_runes(runes: Array) -> void:
	for i in 2:
		var d: Dictionary = runes[i] if i < runes.size() and runes[i] is Dictionary else {"team": [], "slot": {}}
		var team: Array = d["team"]
		rune_text[i] = TH.ui_text("b_runes_full", {"who": TH.ui_text("b_who_foe" if i == 1 else "b_who_you"), "list": " · ".join(PackedStringArray(team))}) if not team.is_empty() else ""
		var b: Button = rn_r if i == 1 else rn_l
		b.visible = not team.is_empty()
		b.text = TH.ui_text("b_runes", {"who": TH.ui_text("b_who_foe" if i == 1 else "b_who_you"), "n": str(team.size())})
		for key in d["slot"]:
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
