# Set 197 (plan-set196 7b): the prep / shop screen = web #app (non-fighting): top bar · message line · board 3×2 · bench · shop dock.
# Every change goes through app.gd (journal + core call + save); this file only draws P and turns drags / taps into those calls.
# User picks (set 197): A1 drag only (+ tap = card) · B1 drag an own unit onto the shop dock = sell · C1 one message line under the top bar.
extends Control

const TH := preload("res://scripts/ui/theme.gd")
const SH := preload("res://scripts/shop.gd")
const BT := preload("res://scripts/botteams.gd")
const RR := preload("res://scripts/runrunes.gd")
const T := preload("res://scripts/team.gd")
const R := preload("res://scripts/rules.gd")
const UV := preload("res://scripts/ui/unit_view.gd")
const SHAPE := preload("res://scripts/ui/shape.gd")
const Cell := preload("res://scripts/ui/slot_cell.gd")
const Card := preload("res://scripts/ui/unit_card.gd")

signal fight
signal open_runes
signal open_tribes
signal clear_highlight
signal open_diff
signal open_replays
signal open_legend # 7e: ? = symbols (web #legendBtn)
signal menu_pick(k: String) # 7e: ⋯ menu (web #menu) · new | log | rename | credits

var app: Control # app.gd: P · cm · chars · do_*() commands
var hi_tribe: Variant = null
var sel: Variant = null # {uid} (owned) | {at:'shop', i, id} while the card is open
var cells := {} # ref key → cell
var _msg_token := 0
var _drag_from: Variant = null

var hud_title: Label
var chip_hearts: Label
var chip_gold: Label
var btn_tribes: Button
var btn_runes: Button
var btn_hi: Button
var btn_diff: Button
var btn_replay: Button
var msg_bar: PanelContainer
var msg_label: Label
var board_grid: GridContainer
var bench_row: HBoxContainer
var bench_lbl: Label
var dock: PanelContainer
var shop_row: HBoxContainer
var btn_reroll: Button
var btn_shoplv: Button
var btn_fight: Button
var fight_t: Label
var fight_n: Label
var card: Card
var btn_legend: Button
var btn_menu: Button
var menu: PanelContainer # ⋯ menu panel under the button (web .menu)
var menu_new: Button
var _new_confirm := 0 # web #newRun two-step: a second press within 3 s starts the new run (no confirm once the run is over)

func setup(a: Control) -> void:
	app = a
	name = "Prep"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var m := MarginContainer.new()
	m.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for k in ["left", "right", "top", "bottom"]:
		m.add_theme_constant_override("margin_" + k, 8)
	add_child(m)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 5)
	m.add_child(v)
	v.add_child(_build_hud())
	v.add_child(_build_msg())
	v.add_child(_build_field())
	v.add_child(_build_bench())
	v.add_child(_build_dock())
	card = Card.new()
	card.act.connect(_on_card_act)
	card.lv_changed.connect(func(_l: int) -> void: _refresh_card())
	add_child(card)
	_build_menu()

# ---------- build ----------
func _chip(bg: String, ink: String, art: String) -> Array:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", TH.box(TH.c(bg), TH.c(bg), 20, 0, 12, 3))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	var tex := TH.art("ui", art)
	if tex != null:
		var ic := TextureRect.new()
		ic.texture = tex
		ic.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		ic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		ic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		ic.custom_minimum_size = Vector2(20, 20)
		ic.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		h.add_child(ic)
	var l := TH.label("0", 20, ink, "display")
	h.add_child(l)
	p.add_child(h)
	return [p, l]

func _hudbtn(text: String, nm: String) -> Button:
	var b := Button.new()
	b.name = nm
	b.text = text
	b.custom_minimum_size = Vector2(0, 36)
	return b

func _build_hud() -> Control:
	var h := HBoxContainer.new()
	h.name = "Hud"
	h.custom_minimum_size.y = 40
	h.add_theme_constant_override("separation", 8)
	hud_title = TH.label("", 14, "ink", "display")
	hud_title.name = "HudTitle"
	hud_title.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(hud_title)
	var c1 := _chip("heart-bg", "heart-ink", "heart")
	c1[0].name = "ChipHearts"
	chip_hearts = c1[1]
	h.add_child(c1[0])
	var c2 := _chip("gold-bg", "gold-ink", "gold")
	c2[0].name = "ChipGold"
	chip_gold = c2[1]
	h.add_child(c2[0])
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(sp)
	btn_hi = _hudbtn("", "HiBar")
	btn_hi.visible = false
	btn_hi.pressed.connect(func() -> void: clear_highlight.emit())
	h.add_child(btn_hi)
	btn_tribes = _hudbtn("", "TribeBtn")
	btn_tribes.pressed.connect(func() -> void: open_tribes.emit())
	h.add_child(btn_tribes)
	btn_runes = _hudbtn("", "RuneBtn")
	btn_runes.pressed.connect(func() -> void: open_runes.emit())
	h.add_child(btn_runes)
	btn_replay = _hudbtn("", "ReplayBtn")
	btn_replay.visible = false
	btn_replay.pressed.connect(func() -> void: open_replays.emit())
	h.add_child(btn_replay)
	btn_diff = _hudbtn("", "DiffBtn")
	btn_diff.pressed.connect(func() -> void: open_diff.emit())
	h.add_child(btn_diff)
	btn_legend = _hudbtn("?", "LegendBtn")
	btn_legend.custom_minimum_size.x = 36
	btn_legend.tooltip_text = TH.ui_text("lg_t")
	btn_legend.pressed.connect(func() -> void: open_legend.emit())
	h.add_child(btn_legend)
	btn_menu = _hudbtn("⋯", "MenuBtn")
	btn_menu.custom_minimum_size.x = 36
	btn_menu.pressed.connect(func() -> void: show_menu(not menu.visible))
	h.add_child(btn_menu)
	return h

func _build_menu() -> void:
	menu = PanelContainer.new()
	menu.name = "Menu"
	menu.visible = false
	var st := TH.box(TH.c("panel"), TH.c("line"), 10, 1, 6, 6)
	st.shadow_color = Color(0, 0, 0, 0.3)
	st.shadow_size = 10
	menu.add_theme_stylebox_override("panel", st)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	menu.add_child(v)
	menu_new = _menu_btn(v, "MenuNew", TH.ui_text("menu_new"), _on_menu_new)
	_menu_btn(v, "MenuLog", TH.ui_text("menu_log"), func() -> void: _pick("log"))
	_menu_btn(v, "MenuRename", TH.ui_text("rename"), func() -> void: _pick("rename"))
	if ResourceLoader.exists("res://scripts/ui/credits.gd"): # 7f1 (another chat) adds the credits screen
		_menu_btn(v, "MenuCredits", TH.ui_text("g_menu_credits"), func() -> void: _pick("credits"))
	add_child(menu)

func _menu_btn(v: VBoxContainer, nm: String, t: String, fn: Callable) -> Button:
	var b := Button.new()
	b.name = nm
	b.text = t
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.custom_minimum_size = Vector2(170, 36)
	b.pressed.connect(fn)
	v.add_child(b)
	return b

func show_menu(on: bool) -> void:
	menu.visible = on
	_new_confirm = 0
	menu_new.text = TH.ui_text("menu_new")
	if on:
		menu.reset_size()
		var r := btn_menu.get_global_rect()
		menu.global_position = Vector2(clampf(r.end.x - menu.size.x, 4.0, get_viewport_rect().size.x - menu.size.x - 4.0), r.end.y + 4.0)

func _pick(k: String) -> void:
	show_menu(false)
	menu_pick.emit(k)

func _on_menu_new() -> void:
	var over := bool(P().get("over", false)) if app.P != null else true
	if _new_confirm == 0 and not over:
		_new_confirm = 1
		menu_new.text = TH.ui_text("menu_confirm")
		var tok := maxi(1, Time.get_ticks_msec())
		_new_confirm = tok
		if is_inside_tree():
			get_tree().create_timer(3.0).timeout.connect(func() -> void:
				if _new_confirm == tok:
					_new_confirm = 0
					menu_new.text = TH.ui_text("menu_new"))
		return
	_pick("new")

func _build_msg() -> Control:
	msg_bar = PanelContainer.new()
	msg_bar.name = "MsgBar"
	msg_bar.custom_minimum_size.y = 24
	msg_label = TH.label("", 13, "ink")
	msg_label.name = "Msg"
	msg_label.clip_text = true
	msg_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	msg_label.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	msg_bar.add_child(msg_label)
	_msg_style(false)
	msg_label.visible = false
	return msg_bar

func _msg_style(on: bool, err: bool = false) -> void:
	if on:
		msg_bar.add_theme_stylebox_override("panel", TH.box(TH.c("hi-bg") if err else TH.c("soft"), TH.c("bad") if err else TH.c("line"), 8, 1, 10, 2))
	else:
		msg_bar.add_theme_stylebox_override("panel", TH.box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 8, 0, 10, 2))

func _build_field() -> Control:
	var f := PanelContainer.new()
	f.name = "Field"
	f.size_flags_vertical = Control.SIZE_EXPAND_FILL
	f.add_theme_stylebox_override("panel", TH.box(TH.c("arena"), TH.c("arena-line"), 12, 1, 10, 6))
	board_grid = GridContainer.new()
	board_grid.name = "Board"
	board_grid.columns = 3
	board_grid.add_theme_constant_override("h_separation", 8)
	board_grid.add_theme_constant_override("v_separation", 6)
	board_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	board_grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	f.add_child(board_grid)
	for t in ["col_back", "col_mid", "col_front"]:
		var l := TH.label(TH.ui_text(t), 13, "mute", "body_b")
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		board_grid.add_child(l)
	for lane in 2:
		for row in [2, 1, 0]:
			var c := _new_cell({"at": "board", "row": float(row), "lane": float(lane)})
			c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			c.size_flags_vertical = Control.SIZE_EXPAND_FILL
			c.custom_minimum_size = Vector2(80, 60)
			board_grid.add_child(c)
	return f

func _build_bench() -> Control:
	var b := HBoxContainer.new()
	b.name = "BenchBar"
	b.custom_minimum_size.y = 66
	b.add_theme_constant_override("separation", 6)
	var lab := VBoxContainer.new()
	lab.custom_minimum_size.x = 64
	lab.alignment = BoxContainer.ALIGNMENT_CENTER
	lab.add_child(TH.label(TH.ui_text("bench"), 13, "ink", "body_b"))
	bench_lbl = TH.label("0/5", 13, "mute")
	bench_lbl.name = "BenchCnt"
	lab.add_child(bench_lbl)
	b.add_child(lab)
	bench_row = HBoxContainer.new()
	bench_row.name = "Bench"
	bench_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bench_row.add_theme_constant_override("separation", 6)
	b.add_child(bench_row)
	for i in int(R.RULES()["shop"]["bench"]):
		var c := _new_cell({"at": "bench", "i": float(i)})
		c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		c.size_flags_vertical = Control.SIZE_EXPAND_FILL
		bench_row.add_child(c)
	return b

func _build_dock() -> Control:
	dock = PanelContainer.new()
	dock.name = "Dock"
	dock.custom_minimum_size.y = 96
	dock.add_theme_stylebox_override("panel", TH.box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 10, 2, 2, 2))
	# dropping an own unit anywhere on the dock sells it (web dropAt → {sell})
	dock.set_drag_forwarding(Callable(), _dock_can_drop, _dock_drop)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	dock.add_child(h)
	var left := VBoxContainer.new()
	left.custom_minimum_size.x = 150
	left.add_theme_constant_override("separation", 6)
	btn_reroll = Button.new()
	btn_reroll.name = "Reroll"
	btn_reroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	btn_reroll.pressed.connect(func() -> void: app.do_reroll())
	left.add_child(btn_reroll)
	btn_shoplv = Button.new()
	btn_shoplv.name = "ShopLv"
	btn_shoplv.size_flags_vertical = Control.SIZE_EXPAND_FILL
	btn_shoplv.add_theme_font_size_override("font_size", 13)
	btn_shoplv.pressed.connect(func() -> void: app.open_shop_pop())
	left.add_child(btn_shoplv)
	h.add_child(left)
	shop_row = HBoxContainer.new()
	shop_row.name = "Shop"
	shop_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	shop_row.add_theme_constant_override("separation", 6)
	h.add_child(shop_row)
	for i in int(R.RULES()["shop"]["slots"]):
		var c := _new_cell({"at": "shop", "i": float(i)})
		c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		c.size_flags_vertical = Control.SIZE_EXPAND_FILL
		shop_row.add_child(c)
	btn_fight = Button.new()
	btn_fight.name = "Fight"
	btn_fight.custom_minimum_size.x = 190
	btn_fight.size_flags_vertical = Control.SIZE_EXPAND_FILL
	TH.primary(btn_fight, false)
	var fv := VBoxContainer.new()
	fv.set_anchors_preset(Control.PRESET_FULL_RECT)
	fv.alignment = BoxContainer.ALIGNMENT_CENTER
	fv.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fight_t = TH.label("", 20, "on-accent", "display")
	fight_t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	fight_t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fight_n = TH.label("", 13, "on-accent")
	fight_n.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	fight_n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fv.add_child(fight_t)
	fv.add_child(fight_n)
	btn_fight.add_child(fv)
	btn_fight.pressed.connect(func() -> void: fight.emit())
	h.add_child(btn_fight)
	return dock

func _new_cell(ref: Dictionary) -> Control:
	var c: Control = Cell.new()
	c.ref = ref
	c.prep = self
	c.name = _key(ref)
	cells[_key(ref)] = c
	return c

static func _key(ref: Dictionary) -> String:
	var at := str(ref["at"])
	if at == "board":
		return "b_%d_%d" % [int(ref["row"]), int(ref["lane"])]
	return ("n_%d" if at == "bench" else "s_%d") % int(ref["i"])

# ---------- state helpers ----------
func P() -> Dictionary:
	return app.P

func unit_at(ref: Dictionary) -> Variant:
	if ref["at"] == "shop":
		return null
	return SH.get_at(P(), ref)

func has_thing(ref: Dictionary) -> bool:
	if ref["at"] == "shop":
		var s: Dictionary = P()["shop"][int(ref["i"])]
		return s.get("id") != null
	return unit_at(ref) != null

func shop_id(ref: Dictionary) -> Variant:
	return P()["shop"][int(ref["i"])].get("id")

func merge_need(id: Variant) -> float:
	var f: Variant = RR.rn_fx(P())["fast"].get(id)
	return float(f) if R.js_or0(f) != 0.0 else float(R.RULES()["shop"]["mergeCount"])

# refs of the Lv1 copies a shop card can be dropped on (buy + merge)
func shop_merge_targets(id: Variant) -> Array:
	var lv1 := SH.all_units(P()).filter(func(x): return x["u"]["id"] == id and float(x["u"]["level"]) == 1.0)
	return lv1.map(func(x): return x["ref"]) if lv1.size() >= maxi(1, int(merge_need(id)) - 1) else []

func merge_targets(u: Dictionary) -> Array:
	if float(u["level"]) >= float(R.RULES()["maxLevel"]):
		return []
	var same := SH.all_units(P()).filter(func(x): return x["u"]["id"] == u["id"] and float(x["u"]["level"]) == float(u["level"]))
	return same.map(func(x): return x["ref"]) if same.size() >= int(merge_need(u["id"])) else []

# ---------- drag ----------
func drag_preview(ref: Dictionary) -> Control:
	var u: Variant = unit_at(ref)
	var id: Variant = u["id"] if u != null else shop_id(ref)
	var c: Dictionary = app.cm[id]
	var w := Control.new()
	var mon := UV.make(c, int(u["level"]) if u != null else 0, 48)
	mon.position = Vector2(-24, -24)
	mon.modulate = Color(1, 1, 1, 0.85)
	w.add_child(mon)
	return w

func drag_started(ref: Dictionary) -> void:
	_drag_from = ref
	card.visible = false
	sel = null
	var u: Variant = unit_at(ref)
	var targets: Array = merge_targets(u) if u != null else shop_merge_targets(shop_id(ref))
	for t in targets:
		var cell: Control = cells.get(_key(t))
		if cell != null and not (t["at"] == ref["at"] and _key(t) == _key(ref)):
			cell.mergeable = true
			restyle(cell)

func drag_ended() -> void:
	_drag_from = null
	for k in cells:
		var cell: Control = cells[k]
		if cell.mergeable or cell.drop_ok:
			cell.mergeable = false
			cell.drop_ok = false
			restyle(cell)
	_dock_style(false)

func can_drop(from: Dictionary, to: Dictionary) -> bool:
	if from["at"] == "shop":
		return to["at"] != "shop"
	return true # own unit: board/bench = move/swap/merge · shop = sell

func drop_on(from: Dictionary, to: Dictionary) -> void:
	_dock_style(false)
	if from["at"] == to["at"] and _key(from) == _key(to):
		return
	if from["at"] == "shop":
		if to["at"] == "shop":
			return
		var sid: Variant = shop_id(from)
		var t: Variant = unit_at(to)
		if t != null and t["id"] == sid:
			app.do_buy_merge(int(from["i"]), to)
		elif t != null:
			app.say_err(TH.ui_text("buy_occupied"))
		else:
			app.do_buy(int(from["i"]), to)
		return
	if to["at"] == "shop":
		app.do_sell(from)
		return
	app.do_move(from, to)

func _dock_can_drop(_at: Vector2, data: Variant) -> bool:
	var ok: bool = data is Dictionary and data.get("ref") is Dictionary and data["ref"]["at"] != "shop"
	_dock_style(ok)
	return ok

func _dock_drop(_at: Vector2, data: Variant) -> void:
	_dock_style(false)
	if data is Dictionary and data.get("ref") is Dictionary and data["ref"]["at"] != "shop":
		app.do_sell(data["ref"])

func _dock_style(sell_over: bool) -> void:
	dock.add_theme_stylebox_override("panel", TH.box(Color(0, 0, 0, 0), TH.c("bad") if sell_over else Color(0, 0, 0, 0), 10, 2, 2, 2))

func restyle(cell: Control) -> void:
	var ref: Dictionary = cell.ref
	if ref["at"] == "shop":
		_dock_style(cell.drop_ok)
		return
	cell.look(unit_at(ref) != null)

# ---------- tap = card ----------
func tapped(ref: Dictionary, node: Control) -> void:
	if not has_thing(ref):
		card.visible = false
		sel = null
		render()
		return
	var u: Variant = unit_at(ref)
	sel = {"uid": u["uid"]} if u != null else {"at": "shop", "i": ref["i"], "id": shop_id(ref)}
	hide_msg()
	card.vl = int(u["level"]) if u != null else 1
	_refresh_card()
	render()
	_place_card.call_deferred(node, ref["at"] == "shop")

func sel_ref() -> Variant:
	if sel == null:
		return null
	if sel.has("uid"):
		for x in SH.all_units(P()):
			if float(x["u"]["uid"]) == float(sel["uid"]):
				return x["ref"]
		return null
	var s: Dictionary = P()["shop"][int(sel["i"])]
	return {"at": "shop", "i": sel["i"]} if s.get("id") == sel["id"] else null

func _refresh_card() -> void:
	var ref: Variant = sel_ref()
	if ref == null:
		card.visible = false
		sel = null
		return
	var st := P()
	var ctx := {}
	if ref["at"] == "shop":
		var s: Dictionary = st["shop"][int(ref["i"])]
		var c: Dictionary = app.cm[s["id"]]
		ctx = {"c": c, "level": 1, "perm": {}, "paid": 0, "shop": true, "locked": bool(s.get("locked", false)), "gold": st["gold"], "buy_merge_ok": shop_merge_targets(s["id"]).size() > 0}
	else:
		var u: Dictionary = unit_at(ref)
		ctx = {"c": app.cm[u["id"]], "level": int(u["level"]), "perm": u["perm"], "paid": u["paid"], "shop": false, "merge_ok": merge_targets(u).size() > 0}
	card.fill(ctx, app.cm)
	card.visible = true

func _place_card(anchor: Control, up: bool) -> void:
	var win := size
	var w := minf(330.0, win.x - 16.0)
	card.custom_minimum_size = Vector2(w, 0)
	card.reset_size()
	var r := anchor.get_global_rect()
	var h := minf(card.get_combined_minimum_size().y, win.y - 16.0)
	var g := 10.0
	var m := 8.0
	var x := 0.0
	var y := 0.0
	var side_fits := win.x - r.end.x - g >= w + m or r.position.x - g >= w + m
	var up_fits := r.position.y - g >= h + m
	if (up and up_fits) or (not side_fits and up_fits):
		y = r.position.y - g - h
		x = clampf(r.position.x + r.size.x / 2.0 - w / 2.0, m, maxf(m, win.x - w - m))
	else:
		var right := win.x - r.end.x >= r.position.x
		x = clampf(r.end.x + g if right else r.position.x - g - w, m, maxf(m, win.x - w - m))
		y = clampf(r.position.y + r.size.y / 2.0 - h / 2.0, m, maxf(m, win.y - h - m))
	card.position = Vector2(x, y)
	card.size = Vector2(w, h)

func _on_card_act(kind: String) -> void:
	if kind == "gloss": # web card footer "คำศัพท์"
		app.popups.open("gloss")
		return
	var ref: Variant = sel_ref()
	if ref == null:
		return
	card.visible = false
	var saved: Variant = sel
	sel = null
	match kind:
		"lock":
			app.do_lock(int(ref["i"]))
		"buy":
			app.do_buy(int(ref["i"]), null)
		"buymerge":
			var mt := shop_merge_targets(shop_id(ref))
			if mt.size() > 0:
				app.do_buy_merge(int(ref["i"]), mt[0])
		"sell":
			app.do_sell(ref)
	if kind == "lock" and saved != null: # the card stays for the lock toggle (web re-renders it)
		sel = saved
		_refresh_card()

# tap anywhere else (not the card, not another place) closes the card (web document pointerdown)
func _input(e: InputEvent) -> void:
	if menu != null and menu.visible: # click outside / Esc closes the menu (web)
		if e is InputEventKey and e.pressed and e.keycode == KEY_ESCAPE:
			show_menu(false)
		elif e is InputEventMouseButton and e.pressed and not menu.get_global_rect().has_point(e.global_position) and not btn_menu.get_global_rect().has_point(e.global_position):
			show_menu(false)
	if card != null and card.visible and e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		if not card.get_global_rect().has_point(e.global_position):
			for k in cells:
				var cell: Control = cells[k]
				if cell.is_visible_in_tree() and cell.get_global_rect().has_point(e.global_position) and has_thing(cell.ref):
					return
			card.visible = false
			sel = null
			render()

# ---------- messages (C1) ----------
func show_msg(list: Array, err: bool) -> void:
	if list.is_empty():
		return
	msg_label.text = " · ".join(PackedStringArray(list.map(func(x): return str(x))))
	msg_label.visible = true
	_msg_style(true, err)
	_msg_token += 1
	var tok := _msg_token
	if is_inside_tree():
		await get_tree().create_timer(3.5 if err else 2.6).timeout
		if tok == _msg_token:
			hide_msg()

func hide_msg() -> void:
	_msg_token += 1
	msg_label.visible = false
	msg_label.text = ""
	_msg_style(false)

# ---------- draw P ----------
static func _n(x: Variant) -> String:
	var f := float(x)
	return str(int(f)) if f == floorf(f) else str(f)

func render() -> void:
	var st := P()
	var S: Dictionary = R.RULES()["shop"]
	var rb: Variant = app.run_boss_at()
	hud_title.text = TH.ui_text("round_boss" if rb != null else "round", {"n": _n(st["round"])}) + " · " + (TH.ui_text("wins_extra", {"w": _n(st["wins"])}) if bool(st["extra"]) else TH.ui_text("wins", {"w": _n(st["wins"]), "t": _n(S["winsToFinish"])}))
	chip_hearts.text = _n(st["hearts"])
	chip_gold.text = _n(st["gold"])
	# tribes button: mini shapes of the 3 biggest + active/total · rune button: count + warning when a held rune does nothing
	var entries := SH.team_entries(st)
	var counts := T.count_tribes(entries, app.cm)
	var steps := T.tribe_steps(counts)
	var have := counts.keys().filter(func(t): return float(counts[t]) > 0.0)
	have.sort_custom(func(a, b): return float(counts[a]) > float(counts[b]))
	var active := have.filter(func(t): return float(steps.get(t, 0)) > 0.0).size()
	btn_tribes.text = "%s %d/%d" % [TH.ui_text("tribe"), active, have.size()]
	var held := 0
	for id in st["rn"]["bag"]:
		if float(st["rn"]["bag"][id]) > 0.0:
			held += 1
	var unworn := RR.rn_unworn(st).size()
	btn_runes.text = "%s %d" % [TH.ui_text("rune"), held] + (" · " + TH.ui_text("not_worn_n", {"n": unworn}) if unworn > 0 else "")
	# enemy strength / boss chip (web diffInfo) · replay count (web replayBtn, shown once a match was played)
	btn_diff.text = TH.ui_text("foe_boss", {"b": str(rb["boss"]["name"])}) if rb != null else TH.ui_text("foe_lbl") + _n(BT.foe_want_pct(bool(st["extra"]))) + "%"
	btn_replay.visible = app.replays.size() > 0
	btn_replay.text = "▶ %d" % app.replays.size()
	btn_hi.visible = hi_tribe != null
	if hi_tribe != null:
		btn_hi.text = TH.ui_text("hi_on", {"t": str(hi_tribe)}) + " ✕"
	# shop dock
	var free: float = float(st["rn"]["free"])
	btn_reroll.text = TH.ui_text("reroll") + " " + (TH.ui_text("reroll_free", {"n": _n(free)}) if free > 0.0 else TH.ui_text("reroll_cost", {"c": _n(S["rerollCost"])}))
	btn_reroll.disabled = (free <= 0.0 and float(st["gold"]) < float(S["rerollCost"])) or bool(st["over"])
	var lv := SH.shop_lv_of(st)
	var nx := SH.lv_for_round(float(st["round"]) + 1.0)
	btn_shoplv.text = "%s %s/%s%s\n%s+%s" % [TH.ui_text("shop_lv"), _n(lv), _n(SH.shop_levels()), (" → " + _n(nx)) if nx > lv else "", TH.ui_text("shop_next"), _n(SH.base_income_at(float(st["round"]) + 1.0))]
	for i in st["shop"].size():
		_fill_shop(cells["s_%d" % i], i)
	for row in 3:
		for lane in 2:
			_fill_unit(cells["b_%d_%d" % [row, lane]], {"at": "board", "row": float(row), "lane": float(lane)}, 50.0)
	var bn := 0
	for i in st["bench"].size():
		_fill_unit(cells["n_%d" % i], {"at": "bench", "i": float(i)}, 34.0)
		if st["bench"][i] != null:
			bn += 1
	bench_lbl.text = "%d/%d" % [bn, st["bench"].size()]
	# fight button
	fight_t.text = TH.ui_text("fight_confirm") if app.confirm_empty or app.confirm_runes else TH.ui_text("fight_boss") if rb != null else TH.ui_text("fight")
	var cue := ""
	if entries.is_empty():
		var bench_has := false
		for u in st["bench"]:
			if u != null:
				bench_has = true
		cue = TH.ui_text("cue_drag") if bench_has else TH.ui_text("cue_buy")
	fight_n.text = TH.ui_text("fight_n", {"n": str(entries.size())}) + cue
	btn_fight.disabled = bool(st["over"])
	btn_fight.modulate = Color(1, 1, 1, 0.7) if entries.is_empty() else Color.WHITE
	if card.visible:
		_refresh_card()

func _clear(cell: Control) -> void:
	for ch in cell.get_children():
		cell.remove_child(ch)
		ch.queue_free()

func _fill_unit(cell: Control, ref: Dictionary, px: float) -> void:
	_clear(cell)
	var u: Variant = unit_at(ref)
	cell.picked = sel != null and u != null and sel.has("uid") and float(sel["uid"]) == float(u["uid"])
	cell.hi = 0
	if u != null and hi_tribe != null:
		var c0: Dictionary = app.cm[u["id"]]
		var ts := [c0["tribe"]]
		ts.append_array(c0["extraTribes"])
		cell.hi = 1 if ts.has(hi_tribe) else -1
	cell.look(u != null)
	if u == null:
		return
	var c: Dictionary = app.cm[u["id"]]
	var v := VBoxContainer.new()
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 1)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var mon := UV.make(c, int(u["level"]), px)
	mon.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(mon)
	var nm := TH.label(str(c["name"]), 13, "ink")
	nm.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	nm.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(nm)
	cell.add_child(v)
	var ov := Control.new()
	ov.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cell.add_child(ov)
	if not (u["perm"] as Dictionary).is_empty():
		var pd := TH.label(TH.ui_text("perm_dot"), 13, "gold-ink", "body_b")
		pd.position = Vector2(4, 0)
		pd.mouse_filter = Control.MOUSE_FILTER_IGNORE
		ov.add_child(pd)
	var worn: Array = app.runes_on(u)
	if worn.size() > 0:
		var rm := TH.label("◆%d" % worn.size(), 13, "r-epic" if ref["at"] == "board" else "mute", "body_b")
		rm.tooltip_text = ", ".join(PackedStringArray(worn))
		rm.set_anchors_preset(Control.PRESET_TOP_RIGHT)
		rm.offset_left = -26
		rm.offset_top = 0
		rm.offset_right = -3
		rm.mouse_filter = Control.MOUSE_FILTER_IGNORE
		ov.add_child(rm)

func _fill_shop(cell: Control, i: int) -> void:
	_clear(cell)
	var s: Dictionary = P()["shop"][i]
	var id: Variant = s.get("id")
	cell.picked = sel != null and sel.has("at") and int(sel["i"]) == i and sel.get("id") == id and id != null
	cell.hi = 0
	if id == null:
		cell.look(false, true)
		var l := TH.label(TH.ui_text("sold"), 13, "mute")
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		cell.add_child(l)
		return
	var c: Dictionary = app.cm[id]
	var cant := float(c["price"]) > float(P()["gold"])
	cell.look(true, true, bool(s.get("locked", false)), cant)
	var v := VBoxContainer.new()
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 1)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var mon := UV.make(c, 0, 34)
	mon.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(mon)
	var nm := TH.label(str(c["name"]), 13, "ink")
	nm.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	nm.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(nm)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 3)
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var ts := [c["tribe"]]
	ts.append_array(c["extraTribes"])
	for t in ts:
		var sp: Array = TH.TRIBE_SHAPE.get(t, ["square", "mute"])
		var sh := SHAPE.make(sp[0], sp[1], 11)
		sh.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(sh)
	var pr := TH.label(_n(c["price"]), 14, "gold-ink", "display")
	pr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(pr)
	v.add_child(row)
	var mine := SH.all_units(P()).filter(func(x): return x["u"]["id"] == id)
	if mine.size() > 0:
		var lv1 := mine.filter(func(x): return float(x["u"]["level"]) == 1.0).size()
		var ready := float(lv1) >= merge_need(id) - 1.0
		var ol := TH.label(TH.ui_text("own_ready", {"n": str(lv1)}) if ready else TH.ui_text("own_have", {"n": str(mine.size())}), 13, "gold-ink" if ready else "mute")
		ol.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		ol.mouse_filter = Control.MOUSE_FILTER_IGNORE
		v.add_child(ol)
	cell.add_child(v)
	if bool(s.get("locked", false)):
		var ov := Control.new()
		ov.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var lk := TH.label(TH.ui_text("lock"), 13, "gold-ink", "body_b")
		lk.position = Vector2(4, 0)
		lk.mouse_filter = Control.MOUSE_FILTER_IGNORE
		ov.add_child(lk)
		cell.add_child(ov)
