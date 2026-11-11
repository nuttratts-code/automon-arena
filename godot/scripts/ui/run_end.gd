# Set 199 (plan-set196 7d): the run end screen (web #runEnd / renderRunEnd): how the run ended · actions right under it
# (extra matches when offered · new run · copy the run code) · final team laid out like the board · run stats ·
# run history on this device · this run's replays. Text only (labels), nothing computed here but the layout.
extends Control

const TH := preload("res://scripts/ui/theme.gd")
const UV := preload("res://scripts/ui/unit_view.gd")
const SH := preload("res://scripts/shop.gd")
const SV := preload("res://scripts/save.gd")
const R := preload("res://scripts/rules.gd")
const RB := preload("res://scripts/runboss.gd")

signal new_run
signal extra
signal copy_code
signal watch(i: int)
signal rename # 7e: web .nameEdit on the run end screen

var app: Control
var title: Label
var summary: Label
var extra_hint: Label
var btn_extra: Button
var btn_new: Button
var btn_code: Button
var team: GridContainer
var stats_box: VBoxContainer
var hist_box: VBoxContainer
var rep_box: VBoxContainer
var code_msg: Label
var player: Label

static func _n(x: Variant) -> String:
	var f := float(x)
	return str(int(f)) if f == floorf(f) else str(f)

func _h3(t: String) -> Label:
	return TH.label(t, 15, "ink", "display_b")

func _wrap(t: String, col: String = "ink") -> Label:
	var l := TH.label(t, 13, col)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l

func setup(a: Control) -> void:
	app = a
	name = "RunEnd"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var sc := ScrollContainer.new()
	sc.name = "Scroll"
	sc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(sc)
	var m := MarginContainer.new()
	m.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for k in ["left", "right"]:
		m.add_theme_constant_override("margin_" + k, 14)
	for k in ["top", "bottom"]:
		m.add_theme_constant_override("margin_" + k, 10)
	sc.add_child(m)
	var cols := HBoxContainer.new()
	cols.add_theme_constant_override("separation", 18)
	m.add_child(cols)
	# left: outcome + actions + final team
	var left := VBoxContainer.new()
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.size_flags_stretch_ratio = 1.15
	left.add_theme_constant_override("separation", 6)
	cols.add_child(left)
	title = TH.label("", 24, "ink", "display_b")
	title.name = "EndTitle"
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	left.add_child(title)
	summary = _wrap("", "mute")
	summary.name = "EndSummary"
	left.add_child(summary)
	extra_hint = _wrap("", "bad")
	extra_hint.name = "EndExtraHint"
	left.add_child(extra_hint)
	var acts := HFlowContainer.new()
	acts.name = "EndActs"
	acts.add_theme_constant_override("h_separation", 8)
	acts.add_theme_constant_override("v_separation", 6)
	btn_extra = Button.new()
	btn_extra.name = "EndExtra"
	btn_extra.text = TH.ui_text("end_extra")
	btn_extra.custom_minimum_size = Vector2(0, 44)
	TH.primary(btn_extra)
	btn_extra.pressed.connect(func() -> void: extra.emit())
	acts.add_child(btn_extra)
	btn_new = Button.new()
	btn_new.name = "EndNew"
	btn_new.text = TH.ui_text("end_new")
	btn_new.custom_minimum_size = Vector2(0, 44)
	btn_new.pressed.connect(func() -> void: new_run.emit())
	acts.add_child(btn_new)
	btn_code = Button.new()
	btn_code.name = "EndCode"
	btn_code.text = TH.ui_text("code_copy")
	btn_code.custom_minimum_size = Vector2(0, 44)
	btn_code.pressed.connect(func() -> void: copy_code.emit())
	acts.add_child(btn_code)
	left.add_child(acts)
	code_msg = _wrap(TH.ui_text("end_code_hint"), "mute")
	code_msg.name = "EndCodeMsg"
	left.add_child(code_msg)
	left.add_child(_h3(TH.ui_text("end_team")))
	team = GridContainer.new()
	team.name = "EndTeam"
	team.columns = 3
	team.add_theme_constant_override("h_separation", 6)
	team.add_theme_constant_override("v_separation", 6)
	left.add_child(team)
	var prow := HBoxContainer.new()
	prow.add_theme_constant_override("separation", 8)
	player = TH.label("", 13, "mute")
	player.name = "EndPlayer"
	player.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	prow.add_child(player)
	var rn := Button.new()
	rn.name = "EndRename"
	rn.text = TH.ui_text("rename")
	rn.pressed.connect(func() -> void: rename.emit())
	prow.add_child(rn)
	left.add_child(prow)
	# right: stats · history · replays
	var right := VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.add_theme_constant_override("separation", 5)
	cols.add_child(right)
	right.add_child(_h3(TH.ui_text("end_stats")))
	stats_box = VBoxContainer.new()
	stats_box.name = "EndStats"
	stats_box.add_theme_constant_override("separation", 1)
	right.add_child(stats_box)
	right.add_child(_h3(TH.ui_text("rep_title", {"n": "0"})))
	right.get_child(right.get_child_count() - 1).name = "EndRepTitle"
	rep_box = VBoxContainer.new()
	rep_box.name = "EndReplays"
	rep_box.add_theme_constant_override("separation", 3)
	right.add_child(rep_box)
	right.add_child(_h3(TH.ui_text("end_hist")))
	hist_box = VBoxContainer.new()
	hist_box.name = "EndHistory"
	hist_box.add_theme_constant_override("separation", 2)
	right.add_child(hist_box)

func _clear(b: Node) -> void:
	for c in b.get_children():
		b.remove_child(c)
		c.queue_free()

func _name_of(id: Variant) -> String:
	var c: Variant = app.cm.get(id)
	return "%s %s" % [id, c["name"]] if c is Dictionary else str(id)

# web permText(): "พลังโจมตี +4" · "เริ่มแมตช์ลดคูลดาวน์ 1.5 วิ" · "HP +20%" · "ไฟที่ติดไม่ลด"
func _perm_text(k: String, v: float) -> String:
	var pt: Dictionary = TH.labels()["tables"]["PERM_TH"]
	var t := str(pt.get(k, k))
	if k == "burnNoDecay":
		return t
	if k == "cdStart" or k == "cdMs":
		return "%s %s %s" % [t, _n(v / 1000.0), TH.ui_text("sec")]
	if t.ends_with("%"):
		var head := t.left(t.length() - 1)
		var sg := "+"
		if head.ends_with("+") or head.ends_with("−"):
			sg = head.right(1)
			head = head.left(head.length() - 1)
		return "%s %s%s%%" % [head.strip_edges(false, true), sg, _n(v)]
	return "%s +%s" % [t, _n(v)]

func render() -> void:
	var P: Dictionary = app.P
	var S: Dictionary = R.RULES()["shop"]
	var last := float(R.js_i32(RB.RUN_STAGE()["settings"].get("lastStage")))
	var won := float(P["wins"]) >= float(S["winsToFinish"])
	var is_extra := SH._truthy(P.get("extra"))
	var can_extra := won and not is_extra and float(P["hearts"]) > 0.0 and float(P["round"]) < last
	var all_rounds := float(P["hearts"]) > 0.0 and float(P["round"]) >= last
	title.text = TH.ui_text("end_all", {"n": _n(P["round"])}) if all_rounds else TH.ui_text("end_extra_done", {"n": _n(P["wins"])}) if is_extra \
		else TH.ui_text("end_won", {"n": _n(S["winsToFinish"])}) if won else TH.ui_text("end_lost")
	summary.text = TH.ui_text("end_sum", {"w": _n(P["wins"]), "n": _n(S["winsToFinish"]), "h": _n(P["hearts"]), "m": _n(S["hearts"]), "r": _n(P["round"])}) \
		+ (TH.ui_text("r_dummy", {"n": _n(app.dummy_dmg)}) if app.dummy_dmg > 0.0 else "")
	btn_extra.visible = can_extra
	player.text = TH.ui_text("player", {"n": app.player_name if app.player_name != "" else TH.ui_text("no_name")})
	extra_hint.visible = can_extra
	extra_hint.text = TH.ui_text("end_extra_warn", {"p": _n(float(R.js_i32(RB.RUN_STAGE()["settings"].get("foeExtraPct")))), "l": _n(last)})
	# one main button: extra matches first when offered
	for k in ["normal", "hover", "pressed", "disabled"]:
		btn_new.remove_theme_stylebox_override(k)
	for k in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		btn_new.remove_theme_color_override(k)
	if not can_extra:
		TH.primary(btn_new)
	code_msg.text = TH.ui_text("end_code_hint")
	code_msg.add_theme_color_override("font_color", TH.c("mute"))
	# final team as pictures, laid out like the board (back · mid · front × 2 lanes)
	_clear(team)
	if SH.board_units(P).is_empty():
		team.columns = 1
		team.add_child(TH.label(TH.ui_text("end_no_team"), 13, "mute"))
	else:
		team.columns = 3
		for lane in 2:
			for row in [2, 1, 0]:
				var u: Variant = P["board"][row][lane]
				var card := PanelContainer.new()
				card.name = "ECard"
				card.custom_minimum_size = Vector2(118, 58)
				card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				card.add_theme_stylebox_override("panel", TH.box(TH.c("card") if u != null else Color(0, 0, 0, 0), TH.c("line"), 10, 1, 6, 4))
				if u != null:
					var c: Variant = app.cm.get(u["id"])
					var cv := VBoxContainer.new()
					cv.add_theme_constant_override("separation", 1)
					var h := HBoxContainer.new()
					h.add_theme_constant_override("separation", 6)
					if c is Dictionary:
						var mon := UV.make(c, int(u["level"]), 36)
						mon.size_flags_vertical = Control.SIZE_SHRINK_CENTER
						h.add_child(mon)
					var v := VBoxContainer.new()
					v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
					v.add_theme_constant_override("separation", 0)
					var nm := TH.label(str(c["name"]) if c is Dictionary else str(u["id"]), 13, "ink", "body_b")
					nm.clip_text = true
					nm.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
					v.add_child(nm)
					v.add_child(TH.label(TH.ui_text("end_unit", {"id": str(u["id"]), "l": _n(u["level"])}), 13, "mute"))
					h.add_child(v)
					cv.add_child(h)
					var perm := []
					for k in (u["perm"] as Dictionary):
						if float(u["perm"][k]) > 0.0:
							perm.append(_perm_text(k, float(u["perm"][k])))
					if not perm.is_empty(): # under the picture, the card's full width
						var pl := TH.label(TH.ui_text("end_perm", {"l": " · ".join(PackedStringArray(perm))}), 13, "gold")
						pl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
						cv.add_child(pl)
					card.add_child(cv)
				team.add_child(card)
	# run stats
	_clear(stats_box)
	var st: Dictionary = app.stats
	var avg := float(st["timeMs"]) / float(st["matches"]) / 1000.0 if float(st["matches"]) > 0.0 else 0.0
	var lines := [TH.ui_text("end_st1", {"m": _n(st["matches"]), "w": _n(st["w"]), "d": _n(st["d"]), "l": _n(st["l"])}),
		TH.ui_text("end_st2", {"b": _n(st["best"]), "a": "%.1f" % avg})]
	var ranked: Array = (st["dmg"] as Dictionary).keys()
	ranked.sort_custom(func(a, b): return float(st["dmg"][a]) > float(st["dmg"][b]))
	if ranked.is_empty():
		lines.append(TH.ui_text("end_nodmg"))
	else:
		lines.append(TH.ui_text("end_top", {"n": _name_of(ranked[0]), "v": _n(st["dmg"][ranked[0]])}))
		for i in range(1, mini(3, ranked.size())):
			lines.append(TH.ui_text("end_rank", {"i": str(i + 1), "n": _name_of(ranked[i]), "v": _n(st["dmg"][ranked[i]])}))
	for t in lines:
		stats_box.add_child(_wrap("• " + t))
	# replays of this run
	(get_node("Scroll").find_child("EndRepTitle", true, false) as Label).text = TH.ui_text("rep_title", {"n": str(app.replays.size())})
	_clear(rep_box)
	if app.replays.is_empty():
		rep_box.add_child(TH.label(TH.ui_text("rep_none"), 13, "mute"))
	for i in app.replays.size():
		var x: Dictionary = app.replays[i]
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 8)
		var res := TH.ui_text("res_w" if R.js_seq(x["w"], 0.0) else "res_l" if R.js_seq(x["w"], 1.0) else "res_d")
		var l := TH.label(TH.ui_text("rep_row", {"r": _n(x["r"]), "res": res, "t": "%.1f" % (float(x["t"]) / 1000.0)}), 13, "ink")
		l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(l)
		var b := Button.new()
		b.name = "EndWatch%d" % i
		b.text = TH.ui_text("rep_watch")
		b.custom_minimum_size.y = 32
		b.pressed.connect(func() -> void: watch.emit(i))
		h.add_child(b)
		rep_box.add_child(h)
	# history on this device
	_clear(hist_box)
	var hist: Array = SV.read_history(SV.load_text(app.history_file))
	if hist.is_empty():
		hist_box.add_child(TH.label(TH.ui_text("end_hist_none"), 13, "mute"))
	for hh in hist:
		var d := Time.get_datetime_dict_from_unix_time(int(float(hh["at"]) / 1000.0) + Time.get_time_zone_from_system()["bias"] * 60)
		var tm := []
		for u in hh["team"]:
			tm.append("%s★%s" % [u["id"], _n(u["level"])])
		var line := TH.ui_text("end_hrow", {"d": "%d/%d/%d" % [d["day"], d["month"], d["year"] + 543], "res": TH.ui_text("end_h_won" if bool(hh["won"]) else "end_h_lost"),
			"w": _n(hh["wins"]), "r": _n(hh["rounds"]), "t": " ".join(PackedStringArray(tm)) if not tm.is_empty() else "-"})
		if hh.get("top") != null:
			line += TH.ui_text("end_htop", {"n": str(hh["top"])})
		hist_box.add_child(_wrap(line))

func say_code(t: String, err: bool = false) -> void:
	code_msg.text = t
	code_msg.add_theme_color_override("font_color", TH.c("bad" if err else "ok"))
