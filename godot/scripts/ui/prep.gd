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
const ARENA := preload("res://scripts/ui/arena.gd")
const ST3D := preload("res://scripts/ui/stage3d.gd")

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
var _hover: Control = null # set 207 P0: the one cell showing "drop ok"
var _sel_mt := {} # 7f2: merge targets of the unit / shop card whose card is open → gold frame (the card hint "กรอบสีทอง")

var hud_title: Label
var chip_hearts: Label
var chip_gold: Label
var next_gold: Label # set 213 (C)
var btn_runes: Button
var btn_hi: Button
var btn_diff: Button
var btn_replay: Button
var msg_bar: PanelContainer
var msg_label: Label
var board_grid: Control # set 206: plain holder, cells placed by place_cells()
var col_labels: Array = []
var tribe_btn: Button # set 212 (notes 2/11): row of round tribe chips (shape + count/next step) at the field's top-left; tap = tribe popup
var tribe_chips: GridContainer # one row; 3 columns at the field's top-right on a short window (_fit_bench)
var bench_row: BoxContainer # set 212 (notes 1/10/19): a vertical list of 5 rows
var dock: PanelContainer
var shop_row: HBoxContainer
var sell_hint: PanelContainer # set 213 (C)
var sell_text: Label
var _lay: Control # the layout root (safe-area insets go on it)
var btn_reroll: Button
var reroll_t: Label
var odds_btn: Button # set 207 P4: shop odds line (rarity dot + %), tap = shop popup (user C1)
var odds_row: HBoxContainer
var btn_fight: Button
var fight_t: Label
var card: Card
var btn_legend: Button
var btn_menu: Button
var menu: PanelContainer # ⋯ menu panel under the button (web .menu)
var menu_new: Button
var field: Control # set 205: the arena move fades it while the world draws the board
var top_hold: Control # set 207: the "Top" block of the layout scene (slides out during the arena move)
var tray_hold: Control # the "Tray" block
var _new_confirm := 0 # web #newRun two-step: a second press within 3 s starts the new run (no confirm once the run is over)

const LAYOUT := "res://scenes/prep_layout.tscn" # set 207 (user B2): the owner moves / resizes / deletes parts here in the Godot editor

func setup(a: Control) -> void:
	app = a
	name = "Prep"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var lay: Control = null
	if ResourceLoader.exists(LAYOUT):
		var ps: Variant = load(LAYOUT)
		if ps is PackedScene:
			lay = (ps as PackedScene).instantiate() as Control
	if lay == null:
		lay = build_layout()
	add_child(lay)
	_lay = lay
	_style_tree(lay)
	_bind(lay)
	_apply_safe()
	card = Card.new()
	card.act.connect(_on_card_act)
	card.lv_changed.connect(func(_l: int) -> void: _refresh_card())
	add_child(card)
	_build_menu()

# set 205 arena move: p = 0 in place … 1 gone (top up, tray down, past the screen edge) · set 207: Top / Tray are free nodes
# set 208: the distance counts the block's parts too (the owner may drag a part outside its block's box), from the block's resting spot
func slide(p: float) -> void:
	if top_hold != null and top_hold.get_parent() != null:
		var r := _reach(top_hold)
		_slide_node(top_hold, -p * (r.end.y + 16.0))
	if tray_hold != null and tray_hold.get_parent() != null:
		var r := _reach(tray_hold)
		_slide_node(tray_hold, p * (size.y - r.position.y + 16.0))

# the block + its visible direct parts, at the block's resting spot (parent coordinates)
static func _reach(n: Control) -> Rect2:
	var at := n.position
	if n.has_meta("base"):
		at.y -= n.offset_top - (n.get_meta("base") as Vector2).x
	var r := Rect2(at, n.size)
	for ch in n.get_children():
		if ch is Control and (ch as Control).visible:
			r = r.merge(Rect2(at + (ch as Control).position, (ch as Control).size))
	return r

static func _slide_node(n: Control, dy: float) -> void:
	if n == null or n.get_parent() == null:
		return
	if not n.has_meta("base"):
		n.set_meta("base", Vector2(n.offset_top, n.offset_bottom))
	var b: Vector2 = n.get_meta("base")
	n.offset_top = b.x + dy
	n.offset_bottom = b.y + dy
	if dy == 0.0:
		n.remove_meta("base")

# ---------- look (set 207) ----------
# The layout scene stores no colours, fonts or icons (light / dark themes and the embedded art differ): parts carry metas
#   ink = colour token of a label · font = font key · sty = how its box is drawn · art = "group/key" icon
# and get them here — unless the owner set an override on that part in the editor (then the editor value wins).
const GLASS := 0.94 # P2 → set 212: near-solid panels (see-through glass was an "AI-made" tell; owner saw it R5–R9) · slot_cell.gd GLASS = same

static func glass(col: Color) -> Color:
	return Color(col, col.a * GLASS)

static func glass_btn(b: Button) -> void:
	for st in ["normal", "hover", "pressed", "disabled"]:
		var s := TH.box(glass(TH.c("soft") if st == "hover" or st == "pressed" else TH.c("panel")), TH.c("line").darkened(0.22))
		TH.ledge(s, st == "pressed") # set 213 (H1): a plate on the table like the Fight button (hard ledge, never a soft shadow)
		b.add_theme_stylebox_override(st, s)

static func _lbl(text: String, px: int, ink: String, fkey: String = "body") -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", px)
	l.set_meta("ink", ink)
	if fkey != "body":
		l.set_meta("font", fkey)
	return l

func _style_tree(n: Node) -> void:
	if n is Control:
		var c := n as Control
		if c.has_meta("ink") and not c.has_theme_color_override("font_color"):
			c.add_theme_color_override("font_color", TH.c(str(c.get_meta("ink"))))
		if c.has_meta("font") and not c.has_theme_font_override("font"):
			c.add_theme_font_override("font", TH.font(str(c.get_meta("font"))))
		if c is TextureRect and c.has_meta("art") and (c as TextureRect).texture == null:
			var parts := str(c.get_meta("art")).split("/")
			if parts.size() == 2:
				(c as TextureRect).texture = TH.art(parts[0], parts[1])
		if c.has_meta("sty"):
			_apply_sty(c, str(c.get_meta("sty")))
	for ch in n.get_children():
		_style_tree(ch)

func _apply_sty(c: Control, sty: String) -> void:
	if sty == "glass_btn" and c is Button and not c.has_theme_stylebox_override("normal"):
		glass_btn(c as Button)
	elif sty == "primary" and c is Button and not c.has_theme_stylebox_override("normal"):
		TH.primary(c as Button, false)
	elif sty.begins_with("chip:") and not c.has_theme_stylebox_override("panel"):
		var bg := sty.substr(5)
		var cs := TH.box(glass(TH.c(bg)), TH.c(bg).darkened(0.28), 20, 0, 12, 3)
		TH.ledge(cs, false) # set 213 (H1)
		c.add_theme_stylebox_override("panel", cs)
	elif sty == "sell_hint" and not c.has_theme_stylebox_override("panel"):
		c.add_theme_stylebox_override("panel", TH.box(Color(TH.c("panel"), 0.86), TH.c("bad"), 10, 2, 2, 2))
	elif sty == "floor_label" and not c.has_theme_stylebox_override("normal"):
		c.add_theme_stylebox_override("normal", TH.box(glass(TH.c("panel")), Color(0, 0, 0, 0), 6, 0, 6, 0))

# ---------- the default layout (also what tools/make_prep_layout.gd saves as the scene) ----------
# Root = free canvas: Top (top bar + message line) · Field (the window onto the 3D board + tribe column) · Tray (bench + shop).
# set 208 (user B1): the blocks AND their parts are free boxes (plain Control, no auto rows) — the owner drags any part in the
# Godot editor. Anchors keep each part glued to its edge (left parts left, right parts right, wide parts stretch with the window).
# Only lists the code fills stay auto rows: HudButtons (buttons that hide/show), Bench / Shop cells, TribeList, the insides of a chip / reroll.
func build_layout() -> Control:
	var root := Control.new()
	root.name = "Layout"
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var top := Control.new()
	top.name = "Top"
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	top.offset_left = EDGE_X # set 213 (A1): outer margin 8 → 16 sides / 12 top+bottom (+ phone safe area on the root, _apply_safe)
	top.offset_right = -EDGE_X
	top.offset_top = EDGE_Y
	top.offset_bottom = EDGE_Y + 40 + 5 + 24
	_build_hud(top)
	var msg := _build_msg()
	_place(msg, 0, 1, 0, 0, 45, 69)
	top.add_child(msg)
	root.add_child(top)
	var f := _build_field()
	f.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	f.offset_left = EDGE_X
	f.offset_right = -EDGE_X
	f.offset_top = FIELD_TOP # set 212 (note 6): bigger arena — the field starts under the top bar (the message line floats over it)
	f.offset_bottom = -(EDGE_Y + TRAY_H - FIELD_INTO_TRAY)
	root.add_child(f)
	var tray := _build_tray()
	tray.name = "Tray"
	tray.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	tray.grow_vertical = Control.GROW_DIRECTION_BEGIN
	tray.offset_left = EDGE_X
	tray.offset_right = -EDGE_X
	tray.offset_bottom = -EDGE_Y
	tray.offset_top = -(EDGE_Y + TRAY_H)
	root.add_child(tray)
	return root

func _chip(nm: String, bg: String, ink: String, art: String) -> PanelContainer:
	var p := PanelContainer.new()
	p.name = nm
	p.set_meta("sty", "chip:" + bg)
	var h := HBoxContainer.new()
	h.name = "Row"
	h.add_theme_constant_override("separation", 6)
	var ic := TextureRect.new()
	ic.name = "Icon"
	ic.set_meta("art", "ui/" + art)
	ic.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	ic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	ic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	ic.custom_minimum_size = Vector2(20, 20)
	ic.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(ic)
	var l := _lbl("0", 20, ink, "display")
	l.name = "Value"
	h.add_child(l)
	p.add_child(h)
	return p

func _hudbtn(text: String, nm: String) -> Button:
	var b := Button.new()
	b.name = nm
	b.text = text
	b.custom_minimum_size = Vector2(0, 36)
	b.set_meta("sty", "glass_btn")
	return b

# set 208: a free box at fixed edges · anchors al/ar (0 = left edge, 1 = right edge) + offsets, top/bottom from the block's top
static func _place(c: Control, al: float, ar: float, ol: float, orr: float, ot: float, ob: float) -> void:
	c.layout_mode = 1
	c.anchor_left = al
	c.anchor_right = ar
	c.anchor_top = 0.0
	c.anchor_bottom = 0.0
	c.offset_left = ol
	c.offset_right = orr
	c.offset_top = ot
	c.offset_bottom = ob

# set 208: top bar parts sit free in Top: title · hearts · gold on the left, the button group glued to the right
func _build_hud(top: Control) -> void:
	var t := _lbl("", 14, "ink", "display")
	t.name = "HudTitle"
	t.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	t.clip_text = true
	t.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	_place(t, 0, 0, 0, 170, 0, 40)
	top.add_child(t)
	var hp := _chip("ChipHearts", "heart-bg", "heart-ink", "heart")
	_place(hp, 0, 0, 178, 248, 2, 38)
	top.add_child(hp)
	var gd := _chip("ChipGold", "gold-bg", "gold-ink", "gold")
	var ng := _lbl("", 14, "gold-ink") # set 213 (C): base income of the next round; the chip's tooltip says the rest
	ng.name = "NextGold"
	ng.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	gd.get_node("Row").add_child(ng)
	_place(gd, 0, 0, 256, 384, 2, 38)
	top.add_child(gd)
	var h := HBoxContainer.new() # buttons hide / show by state, so this one group keeps its auto row (drag the group)
	h.name = "HudButtons"
	h.alignment = BoxContainer.ALIGNMENT_END
	h.add_theme_constant_override("separation", 8)
	_place(h, 1, 1, -360, 0, 2, 38)
	h.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	top.add_child(h)
	var hb := _hudbtn("", "HiBar")
	hb.visible = false
	h.add_child(hb)
	h.add_child(_hudbtn("", "RuneBtn"))
	var rp := _hudbtn("", "ReplayBtn")
	rp.visible = false
	h.add_child(rp)
	h.add_child(_hudbtn("", "DiffBtn"))
	var lg := _hudbtn("?", "LegendBtn")
	lg.custom_minimum_size.x = 36
	h.add_child(lg)
	var mb := _hudbtn("⋯", "MenuBtn")
	mb.custom_minimum_size.x = 36
	h.add_child(mb)

func _build_msg() -> Control:
	var bar := PanelContainer.new()
	bar.name = "MsgBar"
	bar.custom_minimum_size.y = 24
	var l := _lbl("", 13, "ink")
	l.name = "Msg"
	l.clip_text = true
	l.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	l.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	bar.add_child(l)
	return bar

# set 206: the field is a window onto the 3D arena (app.stage): no box, the board cells sit on the camera's projected slot rects
func _build_field() -> Control:
	var f := Control.new()
	f.name = "Field"
	f.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var b := Control.new()
	b.name = "Board"
	b.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	f.add_child(b)
	# set 207 P6: column labels lie on the near tiles' front edge, shown only while a unit is dragged (text editable in the scene)
	for t in [["ColBack", "col_back"], ["ColMid", "col_mid"], ["ColFront", "col_front"]]:
		var l := _lbl(TH.ui_text(t[1]), 13, "ink", "body_b")
		l.name = t[0]
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.set_meta("sty", "floor_label")
		l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		l.visible = false
		b.add_child(l)
	# set 212 (notes 2/11): tribe chips in a row at the field's top-left, 12 px under its top edge = shape in a round chip +
	# count/next step under it (yellow = step reached) · only tribes on the team · tap = tribe popup (no box: the chips are the look)
	var tb := Button.new()
	tb.name = "TribeRow"
	tb.flat = true
	tb.focus_mode = Control.FOCUS_NONE
	tb.tooltip_text = TH.ui_text("tribe")
	_place(tb, 0, 0, 0, 40, 12, 12 + TRIBE_ROW_H)
	var tl := GridContainer.new()
	tl.name = "TribeChips"
	tl.columns = 99
	tl.add_theme_constant_override("h_separation", 6)
	tl.add_theme_constant_override("v_separation", 4)
	tl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tb.add_child(tl)
	f.add_child(tb)
	return f

# set 207: P7/E1 no bench label or count · P3/B1 reroll = icon + price / "ฟรี n" · P4/C1 odds line, tap = shop popup · P5/D2 fight = title only
# set 208 (user B1): every part is a free box in the Tray block (the bench / shop cells inside stay auto rows)
# set 212 (set 208 notes): bench = a 5-row list on the left, reaching up beside the arena (the owner's set 208 box) · shop cards
# fixed width, centred (dock ±282) and taller (dock top 40) · odds line centred above them · reroll bottom-left · fight bottom-right
func _build_tray() -> Control:
	var rows := Control.new()
	rows.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var y2 := TRAY_H - SHOP_H # top of reroll / fight
	var bench := VBoxContainer.new()
	bench.name = "Bench"
	bench.add_theme_constant_override("separation", 4)
	_place(bench, 0, 0, 0, BENCH_W, BENCH_TOP, BENCH_BOTTOM)
	rows.add_child(bench)
	var ob := Button.new()
	ob.name = "ShopOdds"
	ob.flat = true
	ob.custom_minimum_size.y = ODDS_H
	ob.tooltip_text = TH.ui_text("odds")
	var orow := HBoxContainer.new()
	orow.name = "OddsRow"
	orow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	orow.alignment = BoxContainer.ALIGNMENT_CENTER
	orow.add_theme_constant_override("separation", 10)
	orow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ob.add_child(orow)
	_place(ob, 0.5, 0.5, -170, 170, DOCK_TOP - ODDS_H + 4, DOCK_TOP)
	rows.add_child(ob)
	var rr := Button.new()
	rr.name = "Reroll"
	rr.tooltip_text = TH.ui_text("reroll")
	rr.set_meta("sty", "glass_btn")
	var rv := VBoxContainer.new()
	rv.name = "Col"
	rv.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	rv.alignment = BoxContainer.ALIGNMENT_CENTER
	rv.add_theme_constant_override("separation", 2)
	rv.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var ic := SHAPE.make("reroll", "ink", 26)
	ic.name = "RerollIcon"
	ic.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	rv.add_child(ic)
	var rt := _lbl("", 14, "gold-ink", "display")
	rt.name = "RerollCost"
	rt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rt.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rv.add_child(rt)
	rr.add_child(rv)
	_place(rr, 0, 0, 0, FIGHT_W, y2, y2 + SHOP_H) # set 213: reroll as wide as Fight → the centred shop row has equal gaps
	rows.add_child(rr)
	var dk := PanelContainer.new()
	dk.name = "Dock"
	var shop := HBoxContainer.new()
	shop.name = "Shop"
	shop.alignment = BoxContainer.ALIGNMENT_CENTER
	shop.add_theme_constant_override("separation", 6)
	dk.add_child(shop)
	var sh := PanelContainer.new() # set 213 (C): "drop here to sell +N", shown only while an own unit is dragged
	sh.name = "SellHint"
	sh.visible = false
	sh.mouse_filter = Control.MOUSE_FILTER_IGNORE
	sh.set_meta("sty", "sell_hint")
	var sl := _lbl("", 16, "bad", "display")
	sl.name = "SellText"
	sl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	sh.add_child(sl)
	dk.add_child(sh)
	_place(dk, 0.5, 0.5, -DOCK_HALF, DOCK_HALF, DOCK_TOP, TRAY_H)
	rows.add_child(dk)
	var fb := Button.new()
	fb.name = "Fight"
	fb.set_meta("sty", "primary")
	var ft := _lbl("", 18, "on-accent", "display")
	ft.name = "FightTitle"
	ft.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ft.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ft.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	ft.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	ft.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fb.add_child(ft)
	_place(fb, 1, 1, -FIGHT_W, 0, y2, y2 + SHOP_H)
	fb.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	rows.add_child(fb)
	return rows

const TRAY_H := 138.0 # Tray block height (reroll / fight row = its bottom SHOP_H)
const SHOP_H := 76.0
const FIGHT_W := 96.0 # reroll + fight width (set 213)
const ODDS_H := 32.0 # ≥ 24 px on the smallest phone (667×375 shows it at 0.78×)
const EDGE_X := 16.0 # set 213 (A1): outer margin, sides
const EDGE_Y := 12.0 # set 213 (A1): outer margin, top + bottom
const FIELD_TOP := 48.0
const FIELD_INTO_TRAY := -2.0 # set 213: the field ends 2 above the Tray (was 6 into it)
const BENCH_W := 150.0
const BENCH_TOP := -212.0 # bench box (Tray coordinates) = the owner's set 208 box: 5 rows of ~45 beside the arena
const BENCH_BOTTOM := 32.0 # set 213: 5 rows need ~241 → the old box (236) spilled row 5 onto the first shop card
const BENCH_PX := 42.0 # bench picture = shop picture (note 19)
const SHOP_W := 104.0 # fixed shop card width (note 4)
const SHOP_PX := 42.0
const DOCK_HALF := 282.0 # dock = ±282 around the centre (5 cards + gaps)
const DOCK_TOP := 40.0 # note 15: taller cards (room for the stats row)
const TRIBE_ROW_H := 52.0
const LOCK_TAP := 32.0 # padlock tap zone on a shop card (≥ 24 px at 667×375 = 0.78×)

# ---------- bind: find each part by name; a part the owner deleted gets a stand-in that is never shown ----------
var _spare: Array = [] # stand-ins (not in the tree; freed with the screen)

func _part(root: Node, nm: String, cls: String) -> Node:
	var n := root.find_child(nm, true, false)
	if n != null and n.is_class(cls):
		return n
	var s: Node = ClassDB.instantiate(cls)
	s.name = nm
	_spare.append(s)
	return s

func _bind(lay: Control) -> void:
	top_hold = _part(lay, "Top", "Control")
	tray_hold = _part(lay, "Tray", "Control")
	field = _part(lay, "Field", "Control")
	board_grid = _part(lay, "Board", "Control")
	hud_title = _part(lay, "HudTitle", "Label")
	chip_hearts = _part(_part(lay, "ChipHearts", "Control"), "Value", "Label")
	chip_gold = _part(_part(lay, "ChipGold", "Control"), "Value", "Label")
	next_gold = _part(_part(lay, "ChipGold", "Control"), "NextGold", "Label")
	btn_hi = _part(lay, "HiBar", "Button")
	btn_runes = _part(lay, "RuneBtn", "Button")
	btn_replay = _part(lay, "ReplayBtn", "Button")
	btn_diff = _part(lay, "DiffBtn", "Button")
	btn_legend = _part(lay, "LegendBtn", "Button")
	btn_menu = _part(lay, "MenuBtn", "Button")
	msg_bar = _part(lay, "MsgBar", "PanelContainer")
	msg_label = _part(lay, "Msg", "Label")
	tribe_btn = _part(lay, "TribeRow", "Button")
	tribe_chips = _part(lay, "TribeChips", "GridContainer")
	bench_row = _part(lay, "Bench", "BoxContainer")
	odds_btn = _part(lay, "ShopOdds", "Button")
	odds_row = _part(lay, "OddsRow", "HBoxContainer")
	btn_reroll = _part(lay, "Reroll", "Button")
	reroll_t = _part(lay, "RerollCost", "Label")
	dock = _part(lay, "Dock", "PanelContainer")
	shop_row = _part(lay, "Shop", "HBoxContainer")
	sell_hint = _part(lay, "SellHint", "PanelContainer")
	sell_text = _part(lay, "SellText", "Label")
	btn_fight = _part(lay, "Fight", "Button")
	fight_t = _part(lay, "FightTitle", "Label")
	col_labels = [_part(lay, "ColBack", "Label"), _part(lay, "ColMid", "Label"), _part(lay, "ColFront", "Label")]
	btn_hi.pressed.connect(func() -> void: clear_highlight.emit())
	btn_runes.pressed.connect(func() -> void: open_runes.emit())
	btn_replay.pressed.connect(func() -> void: open_replays.emit())
	btn_diff.pressed.connect(func() -> void: open_diff.emit())
	btn_legend.tooltip_text = TH.ui_text("lg_t")
	btn_runes.tooltip_text = TH.ui_text("rune") # set 213 (R2 note 8): the words left the buttons → tooltips keep them
	btn_diff.tooltip_text = TH.ui_text("foe_lbl").strip_edges()
	for pr in [[btn_runes, "rune"], [btn_diff, "enemy"], [btn_legend, "legend"]]: # Kenney Board Game Icons (CC0) as pixel icons
		var bb: Button = pr[0]
		if bb.icon == null:
			bb.icon = TH.uicon(str(pr[1]))
		bb.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		for k in ["icon_normal_color", "icon_hover_color", "icon_pressed_color", "icon_focus_color", "icon_disabled_color"]:
			bb.add_theme_color_override(k, TH.c("ink"))
		bb.add_theme_constant_override("h_separation", 4)
	if btn_legend.text == "?" and btn_legend.icon != null:
		btn_legend.text = ""
	btn_legend.pressed.connect(func() -> void: open_legend.emit())
	btn_menu.pressed.connect(func() -> void: show_menu(not menu.visible))
	tribe_btn.pressed.connect(func() -> void: open_tribes.emit())
	odds_btn.pressed.connect(func() -> void: app.open_shop_pop())
	btn_reroll.pressed.connect(func() -> void: app.do_reroll())
	btn_fight.pressed.connect(func() -> void: fight.emit())
	_msg_style(false)
	msg_label.visible = false
	_dock_style(false)
	# dropping an own unit anywhere on the dock sells it (web dropAt → {sell})
	dock.set_drag_forwarding(Callable(), _dock_can_drop, _dock_drop)
	# the cells are made here (they hold the run's units, not layout): board on projected slots · bench · shop
	for lane in 2: # the far line first: the near line draws (and takes taps) on top where they overlap
		for row in [2, 1, 0]:
			var c := _new_cell({"at": "board", "row": float(row), "lane": float(lane)})
			c.stage_slot = [0, row, lane]
			c.custom_minimum_size = Vector2.ZERO
			board_grid.add_child(c)
	for l in col_labels: # labels draw above the cells
		if l.get_parent() == board_grid:
			board_grid.move_child(l, -1)
	for i in int(R.RULES()["shop"]["bench"]):
		var c := _new_cell({"at": "bench", "i": float(i)})
		c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		c.size_flags_vertical = Control.SIZE_EXPAND_FILL
		bench_row.add_child(c)
	for i in int(R.RULES()["shop"]["slots"]):
		var c := _new_cell({"at": "shop", "i": float(i)})
		c.custom_minimum_size.x = SHOP_W
		c.size_flags_vertical = Control.SIZE_EXPAND_FILL
		shop_row.add_child(c)

# set 213 (A1): phone notch / rounded corners → the whole layout moves in by the safe-area inset (0 on desktop / plain web)
func _apply_safe() -> void:
	if _lay == null or not is_inside_tree():
		return
	var e: Array = TH.safe_insets(get_viewport())
	_lay.offset_left = e[0]
	_lay.offset_top = e[1]
	_lay.offset_right = -e[2]
	_lay.offset_bottom = -e[3]

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED and bench_row != null:
		_fit_bench.call_deferred()
		_apply_safe()
	if what == NOTIFICATION_PREDELETE:
		for s in _spare:
			if is_instance_valid(s) and s.get_parent() == null:
				s.free()

# set 212: a short window (400-high base, app._on_resize) leaves less height than the owner's tall bench box needs, so the bench
# would run into the tribe chip row → the chip row moves to the field's top-right (the strip beside the centred board mirrors
# the bench) as a 3-column grid; a taller window puts it back where the scene has it. The row's box counts even while hidden.
const SHORT_COLS := 3
func _fit_bench() -> void:
	if bench_row == null or tribe_btn == null or not bench_row.is_inside_tree() or not tribe_btn.is_inside_tree():
		return
	if not tribe_btn.has_meta("own"):
		tribe_btn.set_meta("own", [tribe_btn.anchor_left, tribe_btn.anchor_right, tribe_btn.offset_left, tribe_btn.offset_right, tribe_btn.offset_top, tribe_btn.offset_bottom])
	var own: Array = tribe_btn.get_meta("own")
	tribe_btn.anchor_left = own[0]
	tribe_btn.anchor_right = own[1]
	tribe_btn.offset_left = own[2]
	tribe_btn.offset_right = own[3]
	tribe_btn.offset_top = own[4]
	tribe_btn.offset_bottom = own[5] # the scene's box decides (content may be shorter / longer)
	tribe_chips.columns = 99
	var t := tribe_btn.get_global_rect()
	var b := bench_row.get_global_rect()
	if t.position.x < b.end.x and t.end.x > b.position.x and b.position.y < t.end.y + 2.0 and b.end.y > t.position.y:
		tribe_chips.columns = SHORT_COLS
		var w := maxf(tribe_chips.get_combined_minimum_size().x, 30.0)
		tribe_btn.anchor_left = 1.0
		tribe_btn.anchor_right = 1.0
		tribe_btn.offset_left = -w
		tribe_btn.offset_right = 0.0
		tribe_btn.offset_bottom = tribe_btn.offset_top + maxf(30.0, tribe_chips.get_combined_minimum_size().y)

# room the board leaves on BOTH sides (app.board_targets; set 212 note 6: the board stays centred) = clear of the bench when the
# bench reaches up beside the field at its left edge · by position, not content: the board must not jump when a unit is bought
func board_side_room() -> float:
	if bench_row == null or not bench_row.is_inside_tree() or field == null:
		return 6.0
	var f := field.get_global_rect()
	var r := bench_row.get_global_rect()
	if r.position.x - f.position.x < f.size.x * 0.25 and r.end.x > f.position.x and r.position.y < f.end.y:
		return maxf(6.0, r.end.x - f.position.x + 6.0)
	return 6.0

const STEP_ON := Color(1.0, 0.85, 0.3) # count text on the arena floor (outlined, both modes): yellow = a tribe step reached
const STEP_OFF := Color(0.92, 0.92, 0.92)

# next tribe step above n (RULES.tribeSteps 2/4/6); at the top step it stays the top step ("6/6")
static func next_step(n: float) -> float:
	var ts: Array = R.RULES()["tribeSteps"]
	for x in ts:
		if n < float(x):
			return float(x)
	return float(ts[-1])

func _fill_tribe_row(counts: Dictionary, steps: Dictionary, have: Array) -> void:
	for ch in tribe_chips.get_children():
		tribe_chips.remove_child(ch)
		ch.queue_free()
	tribe_btn.visible = not have.is_empty()
	for t in have:
		var col := VBoxContainer.new()
		col.name = "T_" + str(t)
		col.add_theme_constant_override("separation", 1)
		col.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var sp: Array = TH.TRIBE_SHAPE.get(t, ["square", "mute"])
		var ring := PanelContainer.new()
		ring.custom_minimum_size = Vector2(30, 30)
		ring.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
		ring.add_theme_stylebox_override("panel", TH.box(Color(TH.c("panel"), GLASS), TH.c(sp[1]), 15, 2, 0, 0, false))
		var sh := SHAPE.make(sp[0], sp[1], 16)
		sh.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		sh.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		ring.add_child(sh)
		col.add_child(ring)
		var on := float(steps.get(t, 0)) > 0.0
		var l := TH.label("%s/%s" % [_n(counts[t]), _n(next_step(float(counts[t])))], 13, "ink", "body_b")
		l.name = "Count"
		l.add_theme_color_override("font_color", STEP_ON if on else STEP_OFF)
		l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		l.add_theme_constant_override("outline_size", 4)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		col.add_child(l)
		tribe_chips.add_child(col)
	tribe_chips.reset_size()
	var want := tribe_chips.get_combined_minimum_size()
	tribe_btn.size = Vector2(maxf(want.x, 30.0), maxf(30.0, want.y))
	if tribe_btn.anchor_left == 1.0: # short window: keep the grid glued to the right edge
		tribe_btn.offset_left = -tribe_btn.size.x
		tribe_btn.offset_right = 0.0

# set 206: every board cell on its projected slot rect (called whenever the camera moves or the field resizes)
func place_cells() -> void:
	var st: Node3D = app.stage
	if st == null or board_grid == null:
		return
	var o: Vector2 = board_grid.get_global_rect().position
	for row in 3:
		for lane in 2:
			var cell: Control = cells["b_%d_%d" % [row, lane]]
			cell.stage = st
			var r: Rect2 = st.slot_rect(0, row, lane)
			cell.position = r.position - o
			cell.size = r.size
	for i in 3: # set 207 P6: labels back · mid · front on the floor, near the centre of their column's near tile (the front edge hides under the tray on phones)
		var row := 2 - i
		var p: Vector2 = st.on_screen(ST3D.slot_pos(0, row, 1) + Vector3(0, 0, ST3D.TILE * 0.12))
		var l: Label = col_labels[i]
		var w := maxf(l.get_combined_minimum_size().x, 10.0)
		l.size = Vector2(w, l.get_combined_minimum_size().y)
		l.position = Vector2(p.x - w / 2.0, p.y - l.size.y / 2.0) - o

func _show_col_labels(on: bool) -> void:
	for l in col_labels:
		l.visible = on

const RAR_TOK := {"ธรรมดา": "mute", "ไม่ธรรมดา": "r-unc", "หายาก": "r-rare", "หายากมาก": "r-epic", "ตำนาน": "r-legend"}

func _fill_odds(lv: float) -> void:
	for ch in odds_row.get_children():
		odds_row.remove_child(ch)
		ch.queue_free()
	var odds := SH.odds_at(lv)
	for r in odds:
		if float(odds[r]) <= 0.0:
			continue
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 3)
		h.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var dot := SHAPE.make("circle", RAR_TOK.get(r, "mute"), 10)
		dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		h.add_child(dot)
		var l := TH.label(_n(odds[r]) + "%", 13, RAR_TOK.get(r, "mute"), "body_b")
		l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		h.add_child(l)
		odds_row.add_child(h)

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
		var vw := get_viewport_rect().size.x if is_inside_tree() else 854.0
		menu.global_position = Vector2(clampf(r.end.x - menu.size.x, 4.0, vw - menu.size.x - 4.0), r.end.y + 4.0)

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

func _msg_style(on: bool, err: bool = false) -> void:
	if on:
		msg_bar.add_theme_stylebox_override("panel", TH.box(glass(TH.c("hi-bg") if err else TH.c("soft")), TH.c("bad") if err else TH.c("line"), 8, 1, 10, 2))
	else:
		msg_bar.add_theme_stylebox_override("panel", TH.box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 8, 0, 10, 2))

# set 206: the field is a window onto the 3D arena (app.stage): no box, the board cells sit on the camera's projected slot rects

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
	mon.position = Vector2(-24, -29) # web .ghost translate(-50%, -60%): a little above the finger
	mon.modulate = Color(1, 1, 1, 0.85)
	w.add_child(mon)
	return w

func drag_started(ref: Dictionary) -> void:
	_drag_from = ref
	card.visible = false
	sel = null
	var src: Control = cells.get(_key(ref))
	if src != null: # web .dragging: the picked-up thing stays faint in its place
		src.set_meta("pre_drag", src.modulate)
		src.modulate = Color(1, 1, 1, 0.35)
	_stage_dim_drag(ref, true)
	_show_col_labels(true)
	if app.stage != null: # set 212 (note 12 + C1): the tile rims show only while a unit is dragged
		app.stage.show_rims(true)
	var u: Variant = unit_at(ref)
	_sell_hint(u if ref["at"] != "shop" else null)
	var targets: Array = merge_targets(u) if u != null else shop_merge_targets(shop_id(ref))
	for t in targets:
		var cell: Control = cells.get(_key(t))
		if cell != null and not (t["at"] == ref["at"] and _key(t) == _key(ref)):
			cell.mergeable = true
			restyle(cell)

# set 207 P0: only the cell under the pointer shows "drop ok" (Godot asks _can_drop_data only of the cell under the
# pointer, so the cell it left never cleared itself → every passed cell stayed green until release)
func hover(cell: Control) -> void:
	if _hover != null and _hover != cell and is_instance_valid(_hover) and _hover.drop_ok:
		_hover.drop_ok = false
		restyle(_hover)
	_hover = cell

func _unhover_if_left(at: Vector2) -> void:
	if _hover != null and is_instance_valid(_hover) and not _hover.get_global_rect().has_point(at):
		if _hover.drop_ok:
			_hover.drop_ok = false
			restyle(_hover)
		_hover = null

func _stage_dim_drag(from: Variant, dim: bool) -> void: # the picked-up board unit's sprite stays faint until drop / cancel
	if from is Dictionary and from["at"] == "board" and app.stage != null:
		var cell: Control = cells.get(_key(from))
		app.stage.shade("prep", _key(from), dim or (cell != null and cell.hi < 0))

func _sell_hint(u: Variant) -> void:
	sell_hint.visible = u != null
	if u != null:
		sell_text.text = TH.ui_text("g_sell_hint", {"p": _n(u["paid"])})

func drag_ended() -> void:
	_sell_hint(null)
	_stage_dim_drag(_drag_from, false)
	_show_col_labels(false)
	if app.stage != null:
		app.stage.show_rims(false)
	_drag_from = null
	_hover = null
	for k in cells:
		var cell: Control = cells[k]
		if cell.has_meta("pre_drag"): # a drop re-renders the cells first (look() sets modulate) → restore only a cancelled drag
			if cell.modulate == Color(1, 1, 1, 0.35):
				cell.modulate = cell.get_meta("pre_drag")
			cell.remove_meta("pre_drag")
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
		ctx = {"c": app.cm[u["id"]], "level": int(u["level"]), "perm": u["perm"], "paid": u["paid"], "shop": false, "merge_ok": merge_targets(u).size() > 0, "rb": app.rune_bonus_at(ref)}
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
	if _drag_from != null and e is InputEventMouseMotion:
		_unhover_if_left(e.global_position)
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
	_sel_mt = {}
	var sr: Variant = sel_ref() if _drag_from == null else null
	if sr != null:
		var su: Variant = unit_at(sr)
		for t in (merge_targets(su) if su != null else shop_merge_targets(shop_id(sr))):
			if _key(t) != _key(sr):
				_sel_mt[_key(t)] = true
	var S: Dictionary = R.RULES()["shop"]
	var rb: Variant = app.run_boss_at()
	hud_title.text = TH.ui_text("round_boss" if rb != null else "round", {"n": _n(st["round"])}) + " · " + (TH.ui_text("wins_extra", {"w": _n(st["wins"])}) if bool(st["extra"]) else TH.ui_text("wins", {"w": _n(st["wins"]), "t": _n(S["winsToFinish"])}))
	chip_hearts.text = _n(st["hearts"])
	chip_gold.text = _n(st["gold"])
	var inc := _n(SH.base_income_at(float(st["round"]) + 1.0))
	next_gold.text = TH.ui_text("g_next_gold", {"g": inc})
	var gchip := chip_gold.get_parent().get_parent() as Control
	if gchip != null:
		gchip.tooltip_text = TH.ui_text("g_next_gold_tip", {"g": inc, "b": _n(S["winBonus"])})
	# set 212: tribe chip row (shape + count/next step, reached = yellow) · rune button: count + warning when a held rune does nothing
	var entries := SH.team_entries(st)
	var counts := T.count_tribes(entries, app.cm)
	var steps := T.tribe_steps(counts)
	var have := counts.keys().filter(func(t): return float(counts[t]) > 0.0)
	have.sort_custom(func(a, b): return float(counts[a]) > float(counts[b]))
	_fill_tribe_row(counts, steps, have)
	var held := 0
	for id in st["rn"]["bag"]:
		if float(st["rn"]["bag"][id]) > 0.0:
			held += 1
	var unworn := RR.rn_unworn(st).size()
	btn_runes.text = "%d" % held + (" · " + TH.ui_text("not_worn_n", {"n": unworn}) if unworn > 0 else "")
	# enemy strength / boss chip (web diffInfo) · replay count (web replayBtn, shown once a match was played)
	btn_diff.text = TH.ui_text("foe_boss", {"b": str(rb["boss"]["name"])}) if rb != null else _n(BT.foe_want_pct(bool(st["extra"]))) + "%"
	btn_replay.visible = app.replays.size() > 0
	btn_replay.text = "▶ %d" % app.replays.size()
	btn_hi.visible = hi_tribe != null
	if hi_tribe != null:
		btn_hi.text = TH.ui_text("hi_on", {"t": str(hi_tribe)}) + " ✕"
	# shop tray (set 207 P3/B1 · P4/C1)
	var free: float = float(st["rn"]["free"])
	reroll_t.text = TH.ui_text("g_reroll_free", {"n": _n(free)}) if free > 0.0 else _n(S["rerollCost"])
	btn_reroll.disabled = (free <= 0.0 and float(st["gold"]) < float(S["rerollCost"])) or bool(st["over"])
	_fill_odds(SH.shop_lv_of(st))
	for i in st["shop"].size():
		_fill_shop(cells["s_%d" % i], i)
	for row in 3:
		for lane in 2:
			_fill_unit(cells["b_%d_%d" % [row, lane]], {"at": "board", "row": float(row), "lane": float(lane)})
	_stage_units()
	for i in st["bench"].size():
		_fill_unit(cells["n_%d" % i], {"at": "bench", "i": float(i)})
	# fight button: title only (set 207 P5/D2: no unit count, no new-player cue)
	fight_t.text = TH.ui_text("fight_confirm") if app.confirm_empty or app.confirm_runes else TH.ui_text("fight_boss") if rb != null else TH.ui_text("fight")
	btn_fight.disabled = bool(st["over"])
	btn_fight.modulate = Color(1, 1, 1, 0.7) if entries.is_empty() else Color.WHITE
	if card.visible:
		_refresh_card()

func _clear(cell: Control) -> void:
	for ch in cell.get_children():
		cell.remove_child(ch)
		ch.queue_free()

# board cell = no drawing of its own (set 212 note 14: tribe + stars are 3D marks at the unit's feet, stage3d) · bench row =
# picture 42 left (no badge, no stars) · name, under it tribe shapes (main first) left + stars right (notes 1/10/19) · no "+ถาวร" (note 13)
func _fill_unit(cell: Control, ref: Dictionary) -> void:
	_clear(cell)
	var u: Variant = unit_at(ref)
	cell.picked = sel != null and u != null and sel.has("uid") and float(sel["uid"]) == float(u["uid"])
	cell.mergeable = _sel_mt.has(_key(ref))
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
	if ref["at"] == "bench":
		var h := HBoxContainer.new()
		h.name = "BenchRow"
		h.add_theme_constant_override("separation", 12)
		h.mouse_filter = Control.MOUSE_FILTER_IGNORE
		h.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		h.offset_left = 3
		h.offset_right = -6
		var mon := UV.make(c, 0, BENCH_PX, false)
		mon.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		h.add_child(mon)
		var col := VBoxContainer.new()
		col.alignment = BoxContainer.ALIGNMENT_CENTER
		col.add_theme_constant_override("separation", 0)
		col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		col.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var nm := TH.label(str(c["name"]), 13, "ink")
		nm.name = "Name"
		nm.clip_text = true # long names end in "…" (full name on the card)
		nm.set_meta("trim_ok", true) # tests/shots.gd audit: agreed trim (set 208 notes "Open")
		nm.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		nm.mouse_filter = Control.MOUSE_FILTER_IGNORE
		col.add_child(nm)
		col.add_child(UV.tribes_stars(c, int(u["level"]), 11.0, true))
		h.add_child(col)
		cell.add_child(h)
	var ov := Control.new()
	ov.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ov.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	cell.add_child(ov)
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

# set 206: the board units as sprites on the stage (group "prep"), dimmed like their cells when a tribe is highlighted
func _stage_units() -> void:
	var st: Node3D = app.stage
	if st == null:
		return
	var list := []
	for row in 3:
		for lane in 2:
			var u: Variant = unit_at({"at": "board", "row": float(row), "lane": float(lane)})
			if u != null:
				list.append({"id": "b_%d_%d" % [row, lane], "side": 0, "row": row, "lane": lane, "c": app.cm[u["id"]], "level": int(u["level"])})
	st.set_units("prep", list)
	for it in list:
		var cell: Control = cells[it["id"]]
		st.shade("prep", it["id"], cell.hi < 0)

# set 207 P9 (user G2) → set 212 (notes 4/15/17): fixed card, nothing moves with state — tribe shapes stacked on the left (main
# first) · picture 42 (no badge) · padlock top-right (gold closed = locked, grey open; tap = lock / unlock) · stats row (level-1
# attack · HP · cooldown) · name bottom-left · price bottom-right. Own a copy → yellowish card · buying it completes a star-up → "อัปดาว" top centre.
func _fill_shop(cell: Control, i: int) -> void:
	_clear(cell)
	var s: Dictionary = P()["shop"][i]
	var id: Variant = s.get("id")
	cell.picked = sel != null and sel.has("at") and int(sel["i"]) == i and sel.get("id") == id and id != null
	cell.hi = 0
	cell.owned = false
	if id == null:
		cell.look(false, true)
		var l := TH.label(TH.ui_text("sold"), 13, "mute")
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		cell.add_child(l)
		return
	var c: Dictionary = app.cm[id]
	var locked := bool(s.get("locked", false))
	var cant := float(c["price"]) > float(P()["gold"])
	var mine := SH.all_units(P()).filter(func(x): return x["u"]["id"] == id)
	var lv1 := mine.filter(func(x): return float(x["u"]["level"]) == 1.0).size()
	var ready := lv1 > 0 and float(lv1) >= merge_need(id) - 1.0
	cell.owned = mine.size() > 0
	cell.look(true, true, locked, cant)
	var v := VBoxContainer.new()
	v.name = "ShopCard"
	v.add_theme_constant_override("separation", 1)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var top := HBoxContainer.new()
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var tr := VBoxContainer.new()
	tr.name = "Tribes"
	tr.add_theme_constant_override("separation", 3)
	tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var ts := [c["tribe"]]
	ts.append_array(c["extraTribes"])
	for t in ts:
		var sp: Array = TH.TRIBE_SHAPE.get(t, ["square", "mute"])
		tr.add_child(SHAPE.make(sp[0], sp[1], 12))
	top.add_child(tr)
	var mon := UV.make(c, 0, SHOP_PX, false)
	mon.size_flags_horizontal = Control.SIZE_EXPAND | Control.SIZE_SHRINK_CENTER
	top.add_child(mon)
	var pad := Control.new() # keeps the picture centred against the tribe column (the padlock sits over this corner)
	pad.custom_minimum_size = Vector2(12, 0)
	pad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(pad)
	v.add_child(top)
	var gap := Control.new()
	gap.size_flags_vertical = Control.SIZE_EXPAND_FILL
	gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(gap)
	v.add_child(stats_row(c, 1, 14))
	var bot := HBoxContainer.new()
	bot.add_theme_constant_override("separation", 3)
	bot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var nm := TH.label(str(c["name"]), 13, "ink")
	nm.name = "Name"
	nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	nm.clip_text = true
	nm.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	nm.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bot.add_child(nm)
	var pr := TH.label(_n(c["price"]), 14, "gold-ink", "display")
	pr.name = "Price"
	pr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bot.add_child(pr)
	v.add_child(bot)
	v.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	cell.add_child(v)
	var ov := Control.new()
	ov.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ov.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	cell.add_child(ov)
	# padlock: slot_cell turns a tap inside this zone into lock / unlock (lock_tapped) instead of opening the card
	var lk := SHAPE.make("lock" if locked else "unlock", "gold" if locked else "mute", LOCK_TAP)
	lk.name = "LockTap"
	lk.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	lk.offset_left = -LOCK_TAP + 4
	lk.offset_right = 4
	lk.offset_top = -4
	lk.offset_bottom = LOCK_TAP - 4
	ov.add_child(lk)
	if ready:
		var rib := TH.label(TH.ui_text("g_upstar"), 13, "on-accent", "body_b")
		rib.name = "UpStar"
		rib.add_theme_stylebox_override("normal", TH.box(TH.c("gold"), TH.c("gold"), 6, 0, 5, 0))
		rib.mouse_filter = Control.MOUSE_FILTER_IGNORE
		rib.set_anchors_preset(Control.PRESET_CENTER_TOP)
		rib.position = Vector2(-rib.get_combined_minimum_size().x / 2.0, -8)
		ov.add_child(rib)

# padlock tapped on a shop card (slot_cell) — same command as the card's lock button
func lock_tapped(ref: Dictionary) -> void:
	if ref["at"] != "shop" or not has_thing(ref):
		return
	app.do_lock(int(ref["i"]))
	if card.visible:
		_refresh_card()

# set 212 (note 15): attack · HP · cooldown at that level — icons drawn in code (shape.gd), cooldown in seconds (".0" dropped)
const STAT_TOK := {"atk": "n-burn", "hp": "hp", "cd": "accent"}
func stats_row(c: Dictionary, level: int, fs: int) -> HBoxContainer:
	var li := clampi(level, 1, 3) - 1
	var row := HBoxContainer.new()
	row.name = "Stats"
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 7)
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var cd: String = ("%.1f" % (float(c["cdMs"][li]) / 1000.0)).trim_suffix(".0")
	for it in [["atk", _n(c["atk"][li])], ["hp", _n(c["hp"][li])], ["cd", cd]]:
		var g := HBoxContainer.new()
		g.name = "S_" + str(it[0])
		g.add_theme_constant_override("separation", 2)
		g.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var ic := SHAPE.make(it[0], STAT_TOK[it[0]], 12)
		ic.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		g.add_child(ic)
		var nl := TH.label(it[1], fs, "ink", "body_b")
		nl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		g.add_child(nl)
		row.add_child(g)
	return row
