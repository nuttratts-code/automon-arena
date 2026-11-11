# Set 197 (plan-set196 7b): the floating unit card (web #sidePane · unitInfo()): name + rarity + tribes + row · skill lines · Lv tabs ·
# stat row (permanent bonus in gold) · actions (shop: lock · buy · buy + merge · owned: sell). Numbers come from the ported core (team.gd unit_of),
# skill texts from data/labels.json "skills" (generated from labels.js skillLine). Glossary link added set 200 (7e). Not shown yet: the "+rune at match start" numbers.
extends PanelContainer

const TH := preload("res://scripts/ui/theme.gd")
const UV := preload("res://scripts/ui/unit_view.gd")
const SHAPE := preload("res://scripts/ui/shape.gd")
const R := preload("res://scripts/rules.gd")
const T := preload("res://scripts/team.gd")

signal act(kind: String)
signal lv_changed(lv: int)

var vl := 1 # level shown (Lv tabs)

func _init() -> void:
	name = "UnitCard"
	visible = false
	mouse_filter = Control.MOUSE_FILTER_STOP
	var st := TH.box(TH.c("panel"), TH.c("line"), 12, 1, 10, 8)
	st.shadow_color = Color(0, 0, 0, 0.3)
	st.shadow_size = 10
	add_theme_stylebox_override("panel", st)

static func _n(x: Variant) -> String:
	var f := float(x)
	return str(int(f)) if f == floorf(f) else str(snappedf(f, 0.01))

# ctx: {c (char), level, perm, paid, shop (bool), locked, gold, price, merge_ok (owned: has the copies to merge), buy_merge_ok}
func fill(ctx: Dictionary, cm: Dictionary) -> void:
	for ch in get_children():
		remove_child(ch)
		ch.queue_free()
	var c: Dictionary = ctx["c"]
	var level := int(ctx["level"])
	var perm: Dictionary = ctx.get("perm", {})
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 5)
	add_child(v)
	# header
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 8)
	var mon := UV.make(c, vl, 48)
	mon.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	head.add_child(mon)
	var hv := VBoxContainer.new()
	hv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hv.add_theme_constant_override("separation", 0)
	var t1 := HBoxContainer.new()
	t1.add_theme_constant_override("separation", 6)
	t1.add_child(TH.label("%s %s" % [c["id"], c["name"]], 15, "ink", "display_b"))
	var tok := UV.rarity_token(c)
	t1.add_child(TH.label(str(c["rarity"]), 13, tok if tok != "" else "mute", "body_b"))
	hv.add_child(t1)
	var extra := (" + " + ", ".join(PackedStringArray(c["extraTribes"]))) if c["extraTribes"].size() > 0 else ""
	var t2 := TH.label("%s%s · %s%s" % [c["tribe"], extra, TH.ui_text("row"), str(c.get("rowHint", "")).replace("+", " + ")], 13, "mute")
	t2.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hv.add_child(t2)
	head.add_child(hv)
	v.add_child(head)
	# skills (a skill that does not apply at the viewed level is shown faded)
	var groups: Variant = TH.labels().get("skills", {}).get(str(c["id"]))
	if groups is Array and groups.size() > 0:
		for g in groups:
			var on: bool = g.get("lv") == null or (g["lv"] is Array and g["lv"].has(float(vl)))
			var txts: Array = g["text"]
			var l := TH.label(str(txts[clampi(vl - 1, 0, txts.size() - 1)] if on else txts[0]), 13, "ink" if on else "mute")
			l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			l.name = "Skill"
			v.add_child(l)
	else:
		v.add_child(TH.label(TH.ui_text("no_skill"), 13, "mute"))
	# Lv tabs
	var tabs := HBoxContainer.new()
	tabs.name = "LvTabs"
	tabs.add_theme_constant_override("separation", 4)
	for L in range(1, int(R.RULES()["maxLevel"]) + 1):
		var b := Button.new()
		b.text = "Lv%d%s" % [L, TH.ui_text("lv_now") if (L == level and not bool(ctx["shop"])) else ""]
		b.toggle_mode = true
		b.button_pressed = L == vl
		b.custom_minimum_size.y = 28
		b.set_meta("lv", L)
		b.pressed.connect(func() -> void:
			vl = L
			lv_changed.emit(L))
		tabs.add_child(b)
	v.add_child(tabs)
	# stats: base value at the viewed level, then (+permanent) in gold
	var rules: Dictionary = R.RULES()
	var base := T.unit_of(c, {"id": c["id"], "level": float(vl), "row": 0.0, "lane": 0.0, "perm": {}}, rules, cm)
	var withp := T.unit_of(c, {"id": c["id"], "level": float(vl), "row": 0.0, "lane": 0.0, "perm": perm}, rules, cm)
	var pt: Dictionary = TH.labels()["tables"]["PERM_TH"]
	var rows := [["hp", "maxHp"], ["atk", "atk"], ["cd", "cdMs"], ["multi", "multi"], ["burn", "burnHit"], ["shock", "shockHit"], ["armorHit", "armorHit"], ["healHit", "healHit"]]
	var flow := HFlowContainer.new()
	flow.name = "Stats"
	flow.add_theme_constant_override("h_separation", 14)
	flow.add_theme_constant_override("v_separation", 2)
	for r in rows:
		var key: String = r[1]
		var b0 := float(base[key])
		var w0 := float(withp[key])
		if r[0] in ["burn", "shock", "armorHit", "healHit"] and b0 == 0.0 and w0 == 0.0:
			continue
		var cell := HBoxContainer.new()
		cell.add_theme_constant_override("separation", 4)
		var nm: String = TH.ui_text("cd") if r[0] == "cd" else str(pt.get(r[0], r[0]))
		cell.add_child(TH.label(nm, 13, "mute"))
		cell.add_child(TH.label((_n(b0 / 1000.0) + " " + TH.ui_text("sec")) if r[0] == "cd" else _n(b0), 13, "ink", "body_b"))
		if w0 != b0:
			var d := w0 - b0
			var sign := "+" if d > 0 else ""
			cell.add_child(TH.label("(%s%s)" % [sign, _n(d / 1000.0) if r[0] == "cd" else _n(d)], 13, "gold", "body_b"))
		flow.add_child(cell)
	if float(withp["startArmor"]) > 0.0:
		var ac := HBoxContainer.new()
		ac.add_theme_constant_override("separation", 4)
		ac.add_child(TH.label(str(pt.get("armor", "armor")), 13, "mute"))
		ac.add_child(TH.label(_n(withp["startArmor"]), 13, "gold", "body_b"))
		flow.add_child(ac)
	v.add_child(flow)
	# actions
	var acts := HBoxContainer.new()
	acts.name = "CardActs"
	acts.add_theme_constant_override("separation", 6)
	acts.alignment = BoxContainer.ALIGNMENT_END
	var gl := Button.new() # web card footer: "คำศัพท์" → glossary popup (set 200, carried from 7b)
	gl.name = "CardGloss"
	gl.text = TH.ui_text("gl_t")
	gl.flat = true
	gl.add_theme_color_override("font_color", TH.c("accent"))
	gl.pressed.connect(func() -> void: act.emit("gloss"))
	acts.add_child(gl)
	var gap := Control.new()
	gap.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	acts.add_child(gap)
	if bool(ctx["shop"]):
		var lk := Button.new()
		lk.name = "CardLock"
		lk.text = TH.ui_text("unlock" if bool(ctx["locked"]) else "lock")
		lk.pressed.connect(func() -> void: act.emit("lock"))
		acts.add_child(lk)
		var price := float(c["price"])
		var cant := price > float(ctx["gold"])
		if bool(ctx.get("buy_merge_ok", false)):
			var bm := Button.new()
			bm.name = "CardBuyMerge"
			bm.text = TH.ui_text("buy_merge", {"p": _n(price)})
			bm.disabled = cant
			TH.primary(bm)
			bm.pressed.connect(func() -> void: act.emit("buymerge"))
			acts.add_child(bm)
		var by := Button.new()
		by.name = "CardBuy"
		by.text = TH.ui_text("buy_cant", {"p": _n(price), "g": _n(ctx["gold"])}) if cant else TH.ui_text("buy_bench", {"p": _n(price)})
		by.disabled = cant
		TH.primary(by)
		by.pressed.connect(func() -> void: act.emit("buy"))
		acts.add_child(by)
	else:
		if bool(ctx.get("merge_ok", false)):
			var h := TH.label(TH.ui_text("merge_hint"), 13, "mute")
			h.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			h.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			acts.add_child(h)
		var sl := Button.new()
		sl.name = "CardSell"
		sl.text = TH.ui_text("sell", {"p": _n(ctx["paid"])})
		sl.add_theme_color_override("font_color", TH.c("bad"))
		sl.pressed.connect(func() -> void: act.emit("sell"))
		acts.add_child(sl)
	v.add_child(acts)
