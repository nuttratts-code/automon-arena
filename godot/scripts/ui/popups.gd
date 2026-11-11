# Set 197 (plan-set196 7b): the prep-screen popups = web POPS.shop · POPS.runes · POPS.rune · POPS.tribes · POPS.tribe.
# Set 200 (7e): + POPS.legend · POPS.gloss · the enemy mini board in POPS.diff (web foeMini) · the local Log (web #logScr, offline: this device's runs).
# Each builds plain controls from P (text only). Actions go to app.gd (journal + core call + save), then app re-renders the open popup.
extends RefCounted

const TH := preload("res://scripts/ui/theme.gd")
const Pop := preload("res://scripts/ui/pop.gd")
const SHAPE := preload("res://scripts/ui/shape.gd")
const SH := preload("res://scripts/shop.gd")
const RR := preload("res://scripts/runrunes.gd")
const RN := preload("res://scripts/runes.gd")
const T := preload("res://scripts/team.gd")
const R := preload("res://scripts/rules.gd")
const BT := preload("res://scripts/botteams.gd")
const RB := preload("res://scripts/runboss.gd")
const MatchPop := preload("res://scripts/ui/match_pop.gd")
const UV := preload("res://scripts/ui/unit_view.gd")

var app: Control
var pop: Control # pop.gd
var kind := ""
var arg: Variant = null
var mx_state := {"tab": 0, "who": null, "log_open": false} # match details: tab · log filter (reset per match by app)

func _init(a: Control, p: Control) -> void:
	app = a
	pop = p
	pop.closed.connect(func() -> void:
		kind = ""
		arg = null)

static func _n(x: Variant) -> String:
	var f := float(x)
	return str(int(f)) if f == floorf(f) else str(f)

func open(k: String, a: Variant = null) -> void:
	kind = k
	arg = a
	refresh()

func is_open() -> bool:
	return kind != "" and pop.visible

func close() -> void:
	pop.close()

# re-draw the open popup from the current P (called after every action)
func refresh() -> void:
	if kind == "":
		return
	var st: Dictionary = app.P
	var nodes: Array = []
	var extra: Array = []
	match kind:
		"shop":
			nodes = _shop()
		"runes":
			nodes = _runes(st, extra)
		"rune":
			if st["rn"]["bag"].get(arg, 0) == 0 or RR.rn_rec(arg) == null:
				kind = "runes"
				nodes = _runes(st, extra)
			else:
				nodes = _rune(st, str(arg), extra)
		"tribes":
			nodes = _tribes(st)
		"tribe":
			nodes = _tribe(st, str(arg), extra)
		"diff":
			nodes = _diff(st)
		"replays":
			nodes = _replays()
			extra.append(_btn(TH.ui_text("code_copy"), func() -> void: app.copy_run_code(), "CopyCode"))
		"mx":
			if app.battle.view.result == null:
				pop.close()
				return
			var keep: float = pop._scroll.scroll_vertical
			nodes = MatchPop.build(app.battle.view.result, app.battle.view.cm, app.battle.view.log, mx_state, func(k: String, v: Variant) -> void:
				mx_state[k] = v
				refresh())
			pop.show_nodes(nodes, extra, true)
			pop._scroll.set_deferred("scroll_vertical", keep)
			return
		"legend":
			nodes = _legend()
		"gloss":
			nodes = _gloss()
		"log":
			nodes = _log()
		"runcode":
			nodes = _runcode()
			if nodes.is_empty():
				pop.close()
				return
	pop.show_nodes(nodes, extra)

func _hint(t: String, col: String = "mute") -> Label:
	var l := TH.label(t, 13, col)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l

func _btn(text: String, fn: Callable, nm: String = "", disabled: bool = false) -> Button:
	var b := Button.new()
	b.text = text
	if nm != "":
		b.name = nm
	b.disabled = disabled
	b.pressed.connect(fn)
	return b

# ---------- shop ----------
func _shop() -> Array:
	var st: Dictionary = app.P
	var S: Dictionary = R.RULES()["shop"]
	var lv := SH.shop_lv_of(st)
	var nx := SH.lv_for_round(float(st["round"]) + 1.0)
	var sub := TH.ui_text("shop_lv_long", {"lv": _n(lv), "max": _n(SH.shop_levels())})
	if nx > lv:
		sub += TH.ui_text("shop_next_lv", {"n": _n(nx)})
	sub += TH.ui_text("shop_next_gold", {"g": _n(SH.base_income_at(float(st["round"]) + 1.0))})
	if float(S["winBonus"]) != 0.0:
		sub += TH.ui_text("shop_win_bonus", {"b": _n(S["winBonus"])})
	var odds := SH.odds_at(lv)
	var box := HBoxContainer.new()
	box.name = "ShopOdds"
	box.add_theme_constant_override("separation", 10)
	box.add_child(TH.label(TH.ui_text("odds"), 13, "mute"))
	var rar_tok := {"ธรรมดา": "mute", "ไม่ธรรมดา": "r-unc", "หายาก": "r-rare", "หายากมาก": "r-epic", "ตำนาน": "r-legend"}
	for r in odds:
		if float(odds[r]) > 0.0:
			box.add_child(TH.label("%s %s%%" % [r, _n(odds[r])], 13, rar_tok.get(r, "mute"), "body_b"))
	return [Pop.head(TH.ui_text("shop_title"), sub), box, _hint(TH.ui_text("shop_help", {"c": _n(S["rerollCost"])}))]

# ---------- runes ----------
func _rar_th(r: String) -> String:
	for p in R.mod("stage")["RUNE_RARITY"]:
		if p[0] == r:
			return p[1]
	return r

func scope_label(r: Dictionary) -> String:
	if r.get("scope") == "tribe":
		return "เผ่า" + str(r.get("tribe"))
	for s in R.mod("stage")["RUNE_SCOPES"]:
		if s[0] == r.get("scope"):
			return str(s[1])
	return str(r.get("scope"))

func _icon(id: String, size: float) -> Control:
	var key := id[0] if RegEx.create_from_string("^[DF][1-6]$").search(id) else id
	var tex := TH.art("rune", key)
	var ic := TextureRect.new()
	ic.texture = tex
	ic.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	ic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	ic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	ic.custom_minimum_size = Vector2(size, size)
	ic.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return ic

func _bag(st: Dictionary) -> Array:
	var out := []
	for id in st["rn"]["bag"]:
		if float(st["rn"]["bag"][id]) > 0.0:
			out.append([id, float(st["rn"]["bag"][id])])
	return out

func _runes(st: Dictionary, extra: Array) -> Array:
	var bag := _bag(st)
	var list := VBoxContainer.new()
	list.name = "RBag"
	list.add_theme_constant_override("separation", 5)
	if bag.is_empty():
		list.add_child(_hint(TH.ui_text("runes_empty")))
	for e in bag:
		var id: String = e[0]
		var r: Variant = RR.rn_rec(id)
		var b := Button.new()
		b.name = "Rune_" + id
		b.set_meta("rune", id)
		b.custom_minimum_size.y = 46
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.pressed.connect(func() -> void: open("rune", id))
		var h := HBoxContainer.new()
		h.set_anchors_preset(Control.PRESET_FULL_RECT)
		h.offset_left = 8
		h.offset_right = -8
		h.add_theme_constant_override("separation", 8)
		h.mouse_filter = Control.MOUSE_FILTER_IGNORE
		h.add_child(_icon(id, 26))
		var v := VBoxContainer.new()
		v.alignment = BoxContainer.ALIGNMENT_CENTER
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		v.add_theme_constant_override("separation", 0)
		v.mouse_filter = Control.MOUSE_FILTER_IGNORE
		if r is Dictionary:
			var nm := TH.label("%s%s %s" % [r["name"], " ×%s" % _n(e[1]) if e[1] > 1.0 else "", _rar_th(str(r["rarity"]))], 14, "ink", "body_b")
			nm.mouse_filter = Control.MOUSE_FILTER_IGNORE
			v.add_child(nm)
			var wear := RR.rn_wear(st, id)
			var on: Variant = RR.rn_unit_of(st, id)
			var sm := TH.label(TH.ui_dyn("wear_" + wear) if wear != "ok" else TH.ui_text("worn_by", {"name": app.cm[on["id"]]["name"]}) if on != null else scope_label(r), 13, "bad" if wear != "ok" else "mute")
			sm.mouse_filter = Control.MOUSE_FILTER_IGNORE
			v.add_child(sm)
		else:
			v.add_child(TH.label(id, 14, "ink"))
		h.add_child(v)
		var ar := TH.label("›", 14, "mute")
		ar.mouse_filter = Control.MOUSE_FILTER_IGNORE
		h.add_child(ar)
		b.add_child(h)
		list.add_child(b)
	var fx := RR.rn_fx(st)
	if fx.get("heart") is Dictionary and fx["heart"] != null:
		var ht: Dictionary = fx["heart"]
		var traded := bool(st["rn"].get("traded", false))
		var dis := bool(st["over"]) or traded or float(ht["left"]) <= 0.0 or float(st["hearts"]) < float(ht["min"])
		var t := _btn(TH.ui_text("heart_trade", {"g": _n(ht["gold"]), "n": _n(ht["left"])}) if float(ht["left"]) > 0.0 else TH.ui_text("heart_used"), func() -> void: app.do_heart_trade(), "RTrade", dis)
		extra.append(t)
	return [Pop.head(TH.ui_text("runes_title", {"n": str(bag.size())}), TH.ui_text("runes_hint")), list]

func _rune_card(st: Dictionary, id: String) -> Control:
	var r: Dictionary = RR.rn_rec(id)
	var card := PanelContainer.new()
	card.name = "RuneCard"
	card.add_theme_stylebox_override("panel", TH.box(TH.c("soft"), TH.c("line"), 8, 1, 8, 8))
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	card.add_child(v)
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 6)
	head.add_child(_icon(id, 28))
	var nm := TH.label(str(r["name"]), 15, "ink", "body_b")
	nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(nm)
	head.add_child(TH.label(_rar_th(str(r["rarity"])), 13, "r-legend" if r["rarity"] == "legend" else "r-rare" if r["rarity"] == "rare" else "mute", "body_b"))
	v.add_child(head)
	v.add_child(_hint(str(TH.labels().get("runeDesc", {}).get(id, "")), "ink"))
	var held := RR.rn_held(st, id)
	if held > 0.0:
		v.add_child(_hint(TH.ui_text("rune_held", {"n": _n(held), "max": _n(r.get("max", 1))})))
		if r.get("eff") == "flag":
			v.add_child(_hint(TH.ui_text("rune_flag_tribes", {"list": ", ".join(PackedStringArray(RN.rn_flag_tribes(r, held, RR.rn_flag_picks(st, id))))})))
		if held > 1.0 and r.get("eff") == "growth":
			v.add_child(_hint(TH.ui_text("rune_growth", {"n": _n(held), "a": _n(float(r["stepPct"]) * held), "b": _n(float(r["maxPct"]) * held)})))
	return card

func _slot_th(row: int, lane: int) -> String:
	return ["หน้า", "กลาง", "หลัง"][row] + ["บน", "ล่าง"][lane]

# web slotPick: worn by a unit (follows it) · the list = units on the board
func _slot_pick(st: Dictionary, id: String, partner: bool, label: String) -> Control:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	h.add_child(TH.label(label, 13, "mute"))
	var ob := OptionButton.new()
	ob.name = "SlotPick_" + ("p" if partner else "s")
	ob.add_theme_font_size_override("font_size", 13)
	ob.add_item(TH.ui_text("not_worn"))
	ob.set_item_metadata(0, null)
	var cur: Variant = RR.rn_unit_of(st, id, partner)
	var cur_slot: Variant = RR.rn_slot_of(st, id, partner)
	var sel_i := 0
	if cur != null and cur_slot == null:
		ob.add_item("%s (%s)" % [app.cm[cur["id"]]["name"], TH.ui_text("bench_off")])
		ob.set_item_disabled(ob.item_count - 1, true)
		ob.set_item_metadata(ob.item_count - 1, "bench")
		sel_i = ob.item_count - 1
	var any := false
	for row in 3:
		for lane in 2:
			var u: Variant = st["board"][row][lane]
			if u == null:
				continue
			any = true
			ob.add_item("%s Lv%s · %s" % [app.cm[u["id"]]["name"], _n(u["level"]), _slot_th(row, lane)])
			ob.set_item_metadata(ob.item_count - 1, [float(row), float(lane)])
			if cur != null and is_same(u, cur):
				sel_i = ob.item_count - 1
	if not any:
		ob.set_item_text(0, TH.ui_text("no_board"))
	ob.select(sel_i)
	ob.item_selected.connect(func(i: int) -> void:
		var m: Variant = ob.get_item_metadata(i)
		if m is String:
			return
		app.do_place_rune(id, m, partner))
	h.add_child(ob)
	return h

func _rune(st: Dictionary, id: String, extra: Array) -> Array:
	var r: Dictionary = RR.rn_rec(id)
	var n := float(st["rn"]["bag"].get(id, 0))
	var nodes: Array = [Pop.head(TH.ui_text("rune_title", {"name": r["name"]}) + (" ×%s" % _n(n) if n > 1.0 else ""), scope_label(r)), _rune_card(st, id)]
	if RR.rn_needs_slot(r):
		nodes.append(_slot_pick(st, id, false, TH.ui_text("wear_label")))
	if RR.rn_needs_partner(r):
		nodes.append(_slot_pick(st, id, true, TH.ui_text("partner_label")))
	extra.append(_btn(TH.ui_text("back"), func() -> void: open("runes"), "PopBack"))
	return nodes

# ---------- tribes ----------
func _tribe_ico(t: String, px: float = 20.0) -> Control:
	var sp: Array = TH.TRIBE_SHAPE.get(t, ["square", "mute"])
	var s := SHAPE.make(sp[0], sp[1], px)
	s.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return s

func _tribe_now(st: Dictionary) -> Array:
	var counts := T.count_tribes(SH.team_entries(st), app.cm)
	return [counts, T.tribe_steps(counts)]

func _tribes(st: Dictionary) -> Array:
	var now := _tribe_now(st)
	var counts: Dictionary = now[0]
	var steps: Dictionary = now[1]
	var tsteps: Array = R.RULES()["tribeSteps"]
	var list := VBoxContainer.new()
	list.name = "TribeList"
	list.add_theme_constant_override("separation", 5)
	var have := counts.keys().filter(func(t): return float(counts[t]) > 0.0)
	have.sort_custom(func(a, b): return float(counts[a]) > float(counts[b]))
	if have.is_empty():
		list.add_child(_hint(TH.ui_text("board_empty")))
	var top := float(tsteps[tsteps.size() - 1])
	for t in have:
		var n := float(counts[t])
		var step := float(steps.get(t, 0))
		var nxt: Variant = null
		for s in tsteps:
			if float(s) > n:
				nxt = s
				break
		var b := Button.new()
		b.name = "Tribe_" + str(t)
		b.set_meta("tribe", t)
		b.custom_minimum_size.y = 46
		b.pressed.connect(func() -> void: open("tribe", t))
		var h := HBoxContainer.new()
		h.set_anchors_preset(Control.PRESET_FULL_RECT)
		h.offset_left = 8
		h.offset_right = -8
		h.add_theme_constant_override("separation", 8)
		h.mouse_filter = Control.MOUSE_FILTER_IGNORE
		h.add_child(_tribe_ico(t))
		var v := VBoxContainer.new()
		v.alignment = BoxContainer.ALIGNMENT_CENTER
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		v.add_theme_constant_override("separation", 0)
		v.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var l1 := TH.label(TH.ui_text("tribe_n", {"t": str(t), "n": _n(n)}), 14, "ink", "body_b")
		l1.mouse_filter = Control.MOUSE_FILTER_IGNORE
		v.add_child(l1)
		var s2 := TH.ui_text("tribe_on", {"s": _n(step)}) if step > 0.0 else TH.ui_text("tribe_off")
		if nxt != null:
			s2 += TH.ui_text("tribe_more", {"d": _n(float(nxt) - n), "s": _n(nxt)})
		var l2 := TH.label(s2, 13, "mute")
		l2.mouse_filter = Control.MOUSE_FILTER_IGNORE
		v.add_child(l2)
		h.add_child(v)
		var pips := Label.new()
		pips.text = "●".repeat(int(minf(n, top))) + "○".repeat(int(maxf(0.0, top - n)))
		pips.add_theme_font_size_override("font_size", 13)
		pips.add_theme_color_override("font_color", TH.c(TH.TRIBE_SHAPE.get(t, ["square", "mute"])[1]))
		pips.mouse_filter = Control.MOUSE_FILTER_IGNORE
		h.add_child(pips)
		b.add_child(h)
		list.add_child(b)
	var steps_txt := " / ".join(PackedStringArray(tsteps.map(func(x): return _n(x))))
	return [Pop.head(TH.ui_text("tribes_title"), TH.ui_text("tribes_hint", {"steps": steps_txt})), list]

func _tribe(st: Dictionary, t: String, extra: Array) -> Array:
	var now := _tribe_now(st)
	var counts: Dictionary = now[0]
	var steps: Dictionary = now[1]
	var tsteps: Array = R.RULES()["tribeSteps"]
	var bonus: Dictionary = R.RULES()["tribeBonus"].get(t, {})
	var step := float(steps.get(t, 0))
	var grid := GridContainer.new()
	grid.name = "BonusTable"
	grid.columns = 1 + tsteps.size()
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 3)
	grid.add_child(TH.label(TH.ui_text("bonus_col"), 13, "mute", "body_b"))
	for s in tsteps:
		grid.add_child(TH.label(TH.ui_text("n_col", {"n": _n(s)}), 13, "accent" if float(s) == step else "mute", "body_b"))
	for k in bonus:
		var v: Variant = bonus[k]
		if not (v is Array):
			continue
		if not v.any(func(x): return R.js_or0(x) != 0.0):
			continue
		if k == "every" and not ["burn", "shock", "extraHit"].any(func(x): return bonus.get(x) is Array and bonus[x].any(func(y): return R.js_or0(y) != 0.0)):
			continue
		var lbl := TH.label(TH.ui_dyn("tl_" + str(k)) if TH.has_ui("tl_" + str(k)) else str(k), 13, "ink")
		lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		lbl.custom_minimum_size.x = 220
		grid.add_child(lbl)
		for i in tsteps.size():
			grid.add_child(TH.label(_n(v[i]) if i < v.size() else "", 13, "accent" if float(tsteps[i]) == step else "ink", "body_b" if float(tsteps[i]) == step else "body"))
	extra.append(_btn(TH.ui_text("back"), func() -> void: open("tribes"), "PopBack"))
	extra.append(_btn(TH.ui_text("highlight"), func() -> void:
		close()
		app.set_highlight(t), "PopHighlight"))
	return [Pop.head(TH.ui_text("tribe_name", {"t": t}), TH.ui_text("tribe_sub", {"n": _n(counts.get(t, 0))}) + (TH.ui_text("tribe_on", {"s": _n(step)}) if step > 0.0 else TH.ui_text("tribe_off")), _tribe_ico(t, 28)), grid]

# ---------- enemy of this round (web POPS.diff · renderDiff · RN_OFF_TH) ----------
# the rune-offer odds of a win (% per rarity of this round) or of a boss (cards per rarity)
func _off_th(kind: String) -> String:
	var st: Dictionary = RB.RUN_STAGE()["settings"]
	var rk := {"common": "C", "rare": "R", "legend": "L"}
	var boss := kind == "boss"
	var rl: Dictionary = R.RULES()
	var idx := clampi(R.js_i32(app.P["round"]), 1, int(rl["runeOddsRounds"])) - 1
	var ro: Dictionary = rl["runeOdds"][idx] if idx < (rl["runeOdds"] as Array).size() else {}
	var tot := 0.0
	for p in R.mod("stage")["RUNE_RARITY"]:
		tot += R.js_or0(ro.get(p[0]))
	if tot == 0.0:
		tot = 1.0
	var out := []
	for p in R.mod("stage")["RUNE_RARITY"]:
		var n: float = float(R.js_i32(st.get("offBoss" + rk.get(p[0], "C")))) if boss else R.js_round(R.js_or0(ro.get(p[0])) * 100.0 / tot)
		if n > 0.0:
			out.append("%s %s" % [p[1], _n(n)] if boss else "%s %s%%" % [p[1], _n(n)])
	return " · ".join(PackedStringArray(out))

func scout_text(st: Dictionary, rb: Variant) -> String:
	if rb != null:
		return TH.ui_text("scout_boss", {"b": str(rb["boss"]["name"])})
	if not RR.rn_fx(st).get("scout", false):
		return TH.ui_text("scout_none")
	var foe: Variant = app.next_foe()
	if foe == null:
		return TH.ui_text("scout_live")
	var rn: Array = foe["rn"] if foe.get("rn") is Array else []
	var parts := []
	for e in foe["team"]:
		var c: Variant = app.cm.get(e["id"])
		parts.append("%s %s %s Lv%s" % [_slot_th(int(e["row"]), int(e["lane"])), e["id"], str(c["name"]) if c is Dictionary else "", _n(e["level"])])
	return TH.ui_text("scout_team", {"rn": TH.ui_text("scout_rn", {"n": str(rn.size())}) if rn.size() > 0 else "", "team": " · ".join(PackedStringArray(parts))})

func _diff(st: Dictionary) -> Array:
	var rb: Variant = app.run_boss_at()
	var S: Dictionary = RB.RUN_STAGE()["settings"]
	var want := BT.foe_want_pct(bool(st["extra"]))
	var hint := ""
	if rb != null and RB.is_dummy(rb["boss"]):
		hint = TH.ui_text("diff_dummy", {"s": _n(S["dummySec"])})
	elif rb != null:
		hint = TH.ui_text("diff_boss", {"o": _off_th("boss")})
	else:
		hint = TH.ui_text("diff_foe", {"w": _n(want), "x": TH.ui_text("diff_x_extra" if bool(st["extra"]) else "diff_x_plain"), "c": _n(S["offCards"]), "o": _off_th("win")})
	var nodes := [Pop.head(TH.ui_text("diff_t_boss" if rb != null else "diff_t_foe")), _hint(hint, "ink")]
	if rb == null:
		var line := (TH.ui_text("diff_extra_pre", {"p": _n(S["foeExtraPct"])}) if bool(st["extra"]) else "") + TH.ui_text("diff_line")
		nodes.append(_hint(line))
	if rb == null and RR.rn_fx(st).get("scout", false):
		nodes.append(foe_mini(st)) # set 128: rune ทำนาย → the enemy mini board (web foeMini)
	else:
		nodes.append(_hint(scout_text(st, rb)))
	return nodes

# web foeMini(): the next enemy team laid out like the board (หน้า กลาง หลัง × 2 lanes) + the runes that work in that fight
func foe_mini(st: Dictionary) -> Control:
	var wrap := VBoxContainer.new()
	wrap.name = "FoeMini"
	wrap.add_theme_constant_override("separation", 4)
	var rb: Variant = app.run_boss_at()
	if rb != null:
		wrap.add_child(_hint(TH.ui_text("fm_boss", {"b": str(rb["boss"]["name"])})))
		return wrap
	var foe: Variant = app.next_foe()
	if foe == null:
		wrap.add_child(_hint(TH.ui_text("scout_live")))
		return wrap
	var rn := []
	for x in (foe["rn"] if foe.get("rn") is Array else []):
		var r: Variant = RR.rn_rec(x.get("id"))
		if r != null and not RN.RUNE_RUN_ONLY().has(r.get("eff")) and (not RR.rn_needs_slot(r) or x.get("s") is Array):
			rn.append({"x": x, "r": r})
	var on := func(a: Variant, row: int, lane: int) -> bool: return a is Array and int(a[0]) == row and int(a[1]) == lane
	var grid := GridContainer.new()
	grid.name = "FoeGrid"
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 4)
	grid.add_theme_constant_override("v_separation", 4)
	for row in [0, 1, 2]:
		grid.add_child(_hint(TH.ui_text(["fm_front", "col_mid", "col_back"][row])))
	for lane in [0, 1]:
		for row in [0, 1, 2]:
			var e: Variant = null
			for t in foe["team"]:
				if int(t["row"]) == row and int(t["lane"]) == lane:
					e = t
			var cell := PanelContainer.new()
			cell.name = "Fm%d%d" % [row, lane]
			cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			cell.add_theme_stylebox_override("panel", TH.box(TH.c("card") if e != null else Color(0, 0, 0, 0), TH.c("line"), 8, 1, 6, 4))
			var cv := VBoxContainer.new()
			cv.add_theme_constant_override("separation", 1)
			cell.add_child(cv)
			var c: Variant = app.cm.get(e["id"]) if e != null else null
			if c is Dictionary:
				var h := HBoxContainer.new()
				h.add_theme_constant_override("separation", 4)
				h.add_child(UV.make(c, int(e["level"]), 30))
				var nv := VBoxContainer.new()
				nv.add_theme_constant_override("separation", 0)
				nv.add_child(TH.label(str(c["name"]), 12, "ink", "body_b"))
				var perm: bool = e.get("perm") is Dictionary and not (e["perm"] as Dictionary).is_empty()
				nv.add_child(TH.label("Lv" + _n(e["level"]) + (TH.ui_text("fm_perm") if perm else ""), 11, "mute"))
				h.add_child(nv)
				cv.add_child(h)
				for o in rn:
					var mine: bool = on.call(o["x"].get("s"), row, lane)
					if mine or on.call(o["x"].get("p"), row, lane):
						cv.add_child(TH.label("◆ " + str(o["r"]["name"]) + ("" if mine else TH.ui_text("fm_pair")), 11, "gold"))
			else:
				cell.custom_minimum_size.y = 34
			grid.add_child(cell)
	wrap.add_child(grid)
	var list := HFlowContainer.new()
	list.name = "FoeRunes"
	list.add_theme_constant_override("h_separation", 8)
	list.add_child(TH.label(TH.ui_text("fm_rn", {"n": str(rn.size())}) if rn.size() > 0 else TH.ui_text("fm_rn_none"), 12, "mute"))
	for o in rn:
		var x: Dictionary = o["x"]
		var r: Dictionary = o["r"]
		if x.get("s") is Array:
			var u: Variant = null
			for t in foe["team"]:
				if on.call(x["s"], int(t["row"]), int(t["lane"])):
					u = app.cm.get(t["id"])
			list.add_child(TH.label("◆ %s → %s" % [r["name"], str(u["name"]) if u is Dictionary else _slot_th(int(x["s"][0]), int(x["s"][1]))], 12, "ink"))
		else:
			var n := float(x.get("n", 1.0))
			var t := str(r["name"]) + (" ×" + _n(n) if n > 1.0 else "")
			if r.get("eff") == "flag":
				t += " (%s)" % ", ".join(PackedStringArray(RN.rn_flag_tribes(r, n, x.get("t"))))
			list.add_child(TH.label(t, 12, "ink"))
	wrap.add_child(list)
	return wrap

# ---------- symbols (web POPS.legend): tribe shapes · rarity rings (a real character per rarity) · stars · merge · art credit + owner line ----------
func _legend() -> Array:
	var grid := func(nm: String, items: Array) -> Control:
		var g := HFlowContainer.new()
		g.name = nm
		g.add_theme_constant_override("h_separation", 14)
		g.add_theme_constant_override("v_separation", 6)
		for it in items:
			var h := HBoxContainer.new()
			h.add_theme_constant_override("separation", 6)
			h.add_child(it[0])
			var l := TH.label(it[1], 13, "ink")
			l.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			h.add_child(l)
			g.add_child(h)
		return g
	var tribes := []
	for t in TH.TRIBE_SHAPE:
		tribes.append([_tribe_ico(t, 22), t])
	var rars := []
	for r in UV.RING:
		var c: Variant = null
		for x in app.chars:
			if x.get("rarity") == r:
				c = x
				break
		if c == null:
			c = app.chars[0]
		rars.append([UV.make(c, 1, 40), r])
	return [Pop.head(TH.ui_text("lg_t")),
		_hint(TH.ui_text("lg_tribe")), grid.call("LegendTribes", tribes),
		_hint(TH.ui_text("lg_rar")), grid.call("LegendRarity", rars),
		_hint(TH.ui_text("lg_star")),
		_hint(TH.ui_text("lg_merge", {"n": _n(R.RULES()["shop"]["mergeCount"])})),
		_hint(TH.ui_text("lg_art")), _hint(TH.ui_text("lg_owner"))]

# ---------- glossary (web POPS.gloss) = labels.js GLOSSARY ----------
func _gloss() -> Array:
	var box := VBoxContainer.new()
	box.name = "GlossList"
	box.add_theme_constant_override("separation", 4)
	for kt in TH.labels()["tables"]["GLOSSARY"]:
		var l := RichTextLabel.new() # bold term + plain meaning, built from parts (no BBCode parsing of game text)
		l.fit_content = true
		l.bbcode_enabled = false
		l.scroll_active = false
		l.add_theme_font_size_override("normal_font_size", 13)
		l.add_theme_font_size_override("bold_font_size", 13)
		l.add_theme_font_override("bold_font", TH.font("body_b"))
		l.add_theme_color_override("default_color", TH.c("ink"))
		l.push_bold()
		l.add_text(str(kt[0]) + ": ")
		l.pop()
		l.add_text(str(kt[1]))
		box.add_child(l)
	return [Pop.head(TH.ui_text("gl_t"), TH.ui_text("gl_sub")), box]

# ---------- Log (web #logScr, set 200 user A1: offline = the runs played on this device) · copy the newest 60 run codes for the Balance Room ----------
func _log() -> Array:
	var rows: Array = app.log_rows()
	var tbl := GridContainer.new()
	tbl.name = "LogList"
	tbl.columns = 8
	tbl.add_theme_constant_override("h_separation", 10)
	tbl.add_theme_constant_override("v_separation", 3)
	for t in [TH.ui_text("log_h_name"), TH.ui_text("log_h_at"), TH.ui_text("log_h_upd"), TH.ui_text("log_h_round"), TH.ui_text("log_h_wins"), TH.ui_text("log_h_hearts"),
			TH.ui_text("log_h_gold"), TH.ui_text("log_h_st")]:
		tbl.add_child(TH.label(t, 12, "mute", "body_b"))
	for h in rows:
		var nm := str(h.get("nm", ""))
		for t in [nm if nm != "" else TH.ui_text("log_noname"), app.when_th(float(h["at"])), app.when_th(float(h["upd"])), _n(h["round"]), _n(h["wins"]), _n(h["hearts"]), _n(h["gold"]),
				TH.ui_text("log_over" if bool(h["over"]) else "log_live")]:
			tbl.add_child(TH.label(t, 12, "ink"))
	var msg := _hint(app.log_msg if app.log_msg != "" else TH.ui_text("log_all_hint"))
	msg.name = "LogAllMsg"
	var nodes := [Pop.head(TH.ui_text("log_t"), TH.ui_text("g_log_hint")), _hint(TH.ui_text("log_n", {"n": str(rows.size())}) if rows.size() > 0 else TH.ui_text("log_none"))]
	var b := _btn(TH.ui_text("log_all"), func() -> void: app.copy_all_codes(), "LogAllCopy", rows.is_empty())
	TH.primary(b)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	row.add_child(b)
	msg.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(msg)
	nodes.append(row)
	if app.log_box != "":
		var ta := TextEdit.new()
		ta.name = "LogAllOut"
		ta.text = app.log_box
		ta.editable = false
		ta.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
		ta.custom_minimum_size.y = 110
		ta.add_theme_font_size_override("font_size", 12)
		ta.select_all.call_deferred()
		nodes.append(ta)
	if rows.size() > 0:
		var sc := ScrollContainer.new() # wide table: sideways scroll inside the popup on a phone
		sc.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
		sc.custom_minimum_size.y = tbl.get_combined_minimum_size().y + 14
		sc.add_child(tbl)
		nodes.append(sc)
	return nodes

# ---------- replays of this run (web POPS.replays) ----------
func _replays() -> Array:
	var list := VBoxContainer.new()
	list.name = "ReplayList"
	list.add_theme_constant_override("separation", 4)
	if app.replays.is_empty():
		list.add_child(_hint(TH.ui_text("rep_none")))
	for i in app.replays.size():
		var x: Dictionary = app.replays[i]
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 8)
		var res := TH.ui_text("res_w" if R.js_seq(x["w"], 0.0) else "res_l" if R.js_seq(x["w"], 1.0) else "res_d")
		var l := TH.label(TH.ui_text("rep_row", {"r": _n(x["r"]), "res": res, "t": "%.1f" % (float(x["t"]) / 1000.0)}), 14, "ink")
		l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(l)
		h.add_child(_btn(TH.ui_text("rep_watch"), func() -> void: app.watch_replay(i), "Watch%d" % i))
		list.add_child(h)
	return [Pop.head(TH.ui_text("rep_title", {"n": str(app.replays.size())}), TH.ui_text("rep_sub")), list]

# ---------- run code in a box (web POPS.runcode): shown when the clipboard is not available, to copy by hand ----------
func _runcode() -> Array:
	var code: Variant = app.run_code()
	if not (code is String):
		return []
	var ta := TextEdit.new()
	ta.name = "RunCodeText"
	ta.text = code
	ta.editable = false
	ta.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	ta.custom_minimum_size.y = 130
	ta.add_theme_font_size_override("font_size", 13)
	ta.select_all.call_deferred()
	return [Pop.head(TH.ui_text("code_title"), TH.ui_text("code_sub")), ta]
