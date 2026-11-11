# Set 196 (7a): the win → pick 1 free rune popup = web #offerDlg (js/60-runes-enemy-tribes.js renderRunes · runeCard · flagPicker).
# Blocking: no close button and Esc does nothing (web: cancel → preventDefault). Pick / reroll / skip go back to the app,
# which runs the ported core (shop.gd take_rune · runrunes.gd rn_reroll_offer / rn_skip_offer) and calls show_offer() again.
extends Control

signal take(i: int, tribe: Variant)
signal reroll
signal skip

const TH := preload("res://scripts/ui/theme.gd")
const SHAPE := preload("res://scripts/ui/shape.gd")
const RR := preload("res://scripts/runrunes.gd")
const RN := preload("res://scripts/runes.gd")
const T := preload("res://scripts/team.gd")
const SH := preload("res://scripts/shop.gd")
const RAR_COL := {"common": "mute", "rare": "r-rare", "legend": "r-legend"}

var flag_pick: Variant = null # offer card index while asking which tribe (web flagPick)
var _panel: PanelContainer
var _body: VBoxContainer

func _init() -> void:
	name = "RuneOffer"
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new()
	dim.color = Color(20 / 255.0, 16 / 255.0, 12 / 255.0, 0.45)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	_panel = PanelContainer.new()
	var st := TH.box(TH.c("panel"), TH.c("gold"), 14, 3, 14, 14)
	st.shadow_color = Color(0, 0, 0, 0.35)
	st.shadow_size = 16
	_panel.add_theme_stylebox_override("panel", st)
	center.add_child(_panel)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_panel.add_child(scroll)
	_body = VBoxContainer.new()
	_body.add_theme_constant_override("separation", 10)
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_body)
	resized.connect(_fit)

# web: dialog width min(600px, 100vw − 24px) · max-height 100dvh − 24px (scrolls inside)
func _fit() -> void:
	var w := minf(600.0, size.x - 24.0)
	var h := minf(_body.get_combined_minimum_size().y + 28.0, size.y - 24.0)
	_panel.custom_minimum_size = Vector2(w, h)
	(_panel.get_child(0) as ScrollContainer).custom_minimum_size = Vector2(w - 28.0, h - 28.0)

func show_offer(st: Dictionary, cm: Dictionary) -> void:
	var o: Variant = st.get("rn", {}).get("offer")
	if not (o is Dictionary):
		visible = false
		flag_pick = null
		return
	for ch in _body.get_children():
		_body.remove_child(ch)
		ch.queue_free()
	var kind: String = str(o.get("kind", ""))
	var title := TH.label(TH.ui_text("offer_sc" if kind == "sc" else "offer_boss" if kind == "boss" else "offer_win"), TH.SIZE["h2"] + 2, "ink", "display_b")
	title.name = "OfferTitle"
	_body.add_child(title)
	var ids: Array = o.get("ids", [])
	var fr: Variant = RR.rn_rec(ids[flag_pick]) if flag_pick != null and int(flag_pick) < ids.size() else null
	if fr is Dictionary and fr.get("eff") == "flag":
		_body.add_child(_flag_picker(st, cm, int(flag_pick), fr))
	else:
		flag_pick = null
		var grid := GridContainer.new()
		grid.name = "Offer"
		grid.columns = clampi(int((minf(600.0, size.x - 24.0) - 28.0) / 156.0), 1, 3)
		grid.add_theme_constant_override("h_separation", 6)
		grid.add_theme_constant_override("v_separation", 6)
		for i in ids.size():
			grid.add_child(_card(st, ids[i], i, grid.columns))
		_body.add_child(grid)
	var acts := HBoxContainer.new()
	acts.alignment = BoxContainer.ALIGNMENT_END
	acts.add_theme_constant_override("separation", 8)
	var cost := RR.rn_reroll_cost(st)
	var rr := Button.new()
	rr.name = "OfferReroll"
	rr.text = TH.ui_text("offer_reroll_cost", {"cost": _n(cost), "gold": _n(st.get("gold", 0))}) if cost > 0.0 else TH.ui_text("offer_reroll_free")
	rr.disabled = float(st.get("gold", 0)) < cost
	rr.visible = kind != "sc" and flag_pick == null
	rr.pressed.connect(func() -> void: reroll.emit())
	var sk := Button.new()
	sk.name = "OfferSkip"
	sk.text = TH.ui_text("offer_skip")
	sk.pressed.connect(func() -> void: skip.emit())
	acts.add_child(rr)
	acts.add_child(sk)
	_body.add_child(acts)
	visible = true
	_fit.call_deferred()

static func _n(x: Variant) -> String:
	var f := float(x)
	return str(int(f)) if f == floorf(f) else str(f)

func _card(st: Dictionary, id: Variant, i: int, cols: int) -> Control:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", TH.box(TH.c("soft"), TH.c("line"), 8, 1, 7, 7))
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.custom_minimum_size.x = (minf(600.0, size.x - 24.0) - 28.0 - 6.0 * (cols - 1)) / cols
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	card.add_child(v)
	var r: Variant = RR.rn_rec(id)
	if not (r is Dictionary):
		v.add_child(TH.label(str(id), TH.SIZE["body"], "mute"))
		return card
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 4)
	var key := str(id)[0] if RegEx.create_from_string("^[DF][1-6]$").search(str(id)) else str(id)
	var tex := TH.art("rune", key)
	if tex:
		var ic := TextureRect.new()
		ic.texture = tex
		ic.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		ic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		ic.custom_minimum_size = Vector2(24, 24)
		ic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		if TH.TRIBE_SHAPE.has(r.get("tribe")):
			var fr := PanelContainer.new()
			fr.add_theme_stylebox_override("panel", TH.box(Color(0, 0, 0, 0), TH.c(TH.TRIBE_SHAPE[r["tribe"]][1]), 4, 2, 1, 1))
			fr.add_child(ic)
			head.add_child(fr)
		else:
			head.add_child(ic)
	var nm := TH.label(str(r.get("name", id)), TH.SIZE["body"], "ink", "body_b")
	nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	nm.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	head.add_child(nm)
	var rar := str(r.get("rarity", "common"))
	var rl := TH.label(_rarity_th(rar), TH.SIZE["hint"], RAR_COL.get(rar, "mute"), "body_b")
	if rar == "legend":
		var pill := PanelContainer.new()
		pill.add_theme_stylebox_override("panel", TH.box(TH.c("r-legend-bg"), TH.c("r-legend-bg"), 99, 0, 6, 0))
		pill.add_child(rl)
		pill.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
		head.add_child(pill)
	else:
		head.add_child(rl)
	v.add_child(head)
	var desc := TH.label(str(TH.labels().get("runeDesc", {}).get(str(id), "")), TH.SIZE["hint"], "mute")
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(desc)
	var held := RR.rn_held(st, id)
	if held > 0.0:
		v.add_child(_hint(TH.ui_text("rune_held", {"n": _n(held), "max": _n(r.get("max", 1))})))
		if r.get("eff") == "flag":
			v.add_child(_hint(TH.ui_text("rune_flag_tribes", {"list": ", ".join(PackedStringArray(RN.rn_flag_tribes(r, held, RR.rn_flag_picks(st, id))))})))
		if held > 1.0 and r.get("eff") == "growth":
			v.add_child(_hint(TH.ui_text("rune_growth", {"n": _n(held), "a": _n(float(r["stepPct"]) * held), "b": _n(float(r["maxPct"]) * held)})))
	var b := Button.new()
	b.text = TH.ui_text("offer_pick_flag" if r.get("eff") == "flag" else "offer_pick")
	b.add_theme_font_size_override("font_size", 13)
	b.pressed.connect(func() -> void:
		if r.get("eff") == "flag":
			flag_pick = i
			take.emit(-1, null) # app re-renders → tribe picker
		else:
			take.emit(i, null))
	v.add_child(b)
	return card

func _hint(t: String) -> Label:
	var l := TH.label(t, TH.SIZE["hint"], "mute")
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l

static func _rarity_th(r: String) -> String:
	for p in R_RARITY():
		if p[0] == r:
			return p[1]
	return r

static func R_RARITY() -> Array:
	return preload("res://scripts/rules.gd").mod("stage")["RUNE_RARITY"]

func _flag_picker(st: Dictionary, cm: Dictionary, i: int, r: Dictionary) -> Control:
	var box := VBoxContainer.new()
	box.name = "FlagPick"
	box.add_theme_constant_override("separation", 8)
	var counts := T.count_tribes(SH.team_entries(st), cm)
	var have := RR.rn_flag_picks(st, r["id"])
	var head := TH.ui_text("flag_head", {"name": r.get("name", ""), "count": _n(r.get("count", 1))})
	if have.size() > 0:
		head += TH.ui_text("flag_have", {"list": ", ".join(PackedStringArray(have))})
	box.add_child(_hint(head))
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 6)
	grid.add_theme_constant_override("v_separation", 6)
	for t in RR.rn_flag_choices(st, cm):
		var b := Button.new()
		b.set_meta("tribe", t)
		b.custom_minimum_size = Vector2(170, 44)
		var h := HBoxContainer.new()
		h.mouse_filter = Control.MOUSE_FILTER_IGNORE
		h.set_anchors_preset(Control.PRESET_FULL_RECT)
		h.offset_left = 8
		h.add_theme_constant_override("separation", 8)
		var sp: Array = TH.TRIBE_SHAPE.get(t, ["square", "mute"])
		var shp := SHAPE.make(sp[0], sp[1], 20)
		shp.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		h.add_child(shp)
		var tv := VBoxContainer.new()
		tv.add_theme_constant_override("separation", 0)
		tv.add_child(TH.label(str(t), TH.SIZE["body"], "ink", "body_b"))
		var n := float(counts.get(t, 0))
		tv.add_child(TH.label(TH.ui_text("flag_on_board", {"n": _n(n)}) if n > 0.0 else TH.ui_text("flag_none"), TH.SIZE["hint"], "mute"))
		h.add_child(tv)
		b.add_child(h)
		b.pressed.connect(func() -> void:
			flag_pick = null
			take.emit(i, t))
		grid.add_child(b)
	box.add_child(grid)
	var back := Button.new()
	back.text = TH.ui_text("offer_back")
	back.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	back.pressed.connect(func() -> void:
		flag_pick = null
		take.emit(-1, null))
	box.add_child(back)
	return box
