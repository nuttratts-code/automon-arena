# Set 199 (plan-set196 7d): live details of a unit tapped during a match (web #bPane / renderBInfo): what stands on it right now
# (HP, armour, burn, shock) · its skills with the times each fired so far · every stat with +/− against the start of the match.
# Display only: reads the battle view's unit record (events applied so far) and the result's start stats (ini).
extends PanelContainer

const TH := preload("res://scripts/ui/theme.gd")
const UV := preload("res://scripts/ui/unit_view.gd")
const R := preload("res://scripts/rules.gd")

signal close_pressed

# [key, text key, colour, format ("" number · "s" seconds · "x" ×n · "%"), lower is better]
const LIVE_STATS := [["atk", "ls_atk", "n-hit", "", false], ["cd", "ls_cd", "n-skill", "s", true], ["multi", "ls_multi", "n-cnt", "x", false],
	["burnHit", "ls_burn_hit", "n-burn", "", false], ["shockHit", "ls_shock_hit", "n-shock", "", false], ["armorHit", "ls_armor_hit", "n-armor", "", false],
	["healHit", "ls_heal_hit", "n-heal", "", false], ["maxHp", "ls_max_hp", "hp", "", false],
	["hitAmp", "ls_hit_amp", "n-hit", "%", false], ["shockAmp", "ls_shock_amp", "n-shock", "%", false], ["burnAmp", "ls_burn_amp", "n-burn", "%", false],
	["healAmp", "ls_heal_amp", "n-heal", "%", false], ["armorAmp", "ls_armor_amp", "n-armor", "%", false], ["cdAmp", "ls_cd_amp", "n-skill", "%", false],
	["healToAtk", "ls_heal_to_atk", "n-heal", "%", false],
	["dmgTaken", "ls_dmg_taken", "n-hit", "%", true], ["burnTaken", "ls_burn_taken", "n-burn", "%", true], ["shockTaken", "ls_shock_taken", "n-shock", "%", true]]
const LIVE_ALWAYS := ["atk", "cd", "multi", "burnHit", "shockHit", "armorHit", "healHit", "maxHp"]

var uid: Variant = null
var shown_ver := -1
var _body: VBoxContainer

func _init() -> void:
	name = "LivePane"
	var st := TH.box(TH.c("panel"), TH.c("line"), 12, 1, 10, 8)
	st.shadow_color = Color(0, 0, 0, 0.3)
	st.shadow_size = 10
	add_theme_stylebox_override("panel", st)
	var sc := ScrollContainer.new()
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(sc)
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 4)
	sc.add_child(_body)
	visible = false

static func _r2(v: float) -> float:
	return roundf(v * 100.0) / 100.0

static func _n(v: float) -> String:
	return str(int(v)) if v == floorf(v) else str(_r2(v))

static func _fmt(kind: String, v: float) -> String:
	match kind:
		"s":
			return "%.2f %s" % [v / 1000.0, TH.ui_text("sec")]
		"x":
			return "×" + _n(v)
		"%":
			return _n(v) + "%"
	return _n(v)

func _wrap(t: String, size: int = 13, col: String = "ink", fkey: String = "body") -> Label:
	var l := TH.label(t, size, col, fkey)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l

# view = battle_view.gd · rune_names = names of the runes worn on this unit's slot
func fill(view: Control, id: Variant, rune_names: Array) -> void:
	uid = id
	shown_ver = view.ver
	for ch in _body.get_children():
		_body.remove_child(ch)
		ch.queue_free()
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 8)
	_body.add_child(head)
	var x := Button.new()
	x.name = "LiveClose"
	x.text = "✕"
	x.custom_minimum_size = Vector2(36, 32)
	x.tooltip_text = TH.ui_text("li_close")
	x.pressed.connect(func() -> void: close_pressed.emit())
	var v: Variant = view.units.get(int(id)) if id != null else null
	if v != null and not (v.has("card") and is_instance_valid(v["card"]) and not v["card"].is_queued_for_deletion()):
		# replaced by a summon → show the one standing there now
		v = view.unit_at_cell("%d:%d:%d" % [v["side"], v["row"], v["lane"]])
		if v != null:
			uid = v["uid"]
	if v == null:
		var gone := _wrap(TH.ui_text("li_gone"), 13, "mute")
		gone.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		head.add_child(gone)
		head.add_child(x)
		visible = true
		return
	var c: Dictionary = view.cm[v["id"]] if view.cm.get(v["id"]) is Dictionary else {"id": v["id"], "name": v["name"], "tribe": "", "extraTribes": []}
	var known: bool = view.cm.get(v["id"]) is Dictionary and c.has("rarity")
	if known:
		var mon := UV.make(c, maxi(1, int(v["level"])), 40)
		mon.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		head.add_child(mon)
	var hv := VBoxContainer.new()
	hv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hv.add_theme_constant_override("separation", 0)
	head.add_child(hv)
	var rows: Array = TH.labels()["tables"]["ROW_TH"]
	var pos := "%s%d" % [str(rows[clampi(int(v["row"]), 0, rows.size() - 1)]), int(v["lane"]) + 1]
	var ttl := "%s %s · %s %s" % [TH.ui_text("side_you") if v["side"] == 0 else TH.ui_text("side_foe"), pos, str(c["id"]), str(c["name"])]
	if int(v["level"]) > 0:
		ttl += TH.ui_text("li_level", {"n": str(int(v["level"]))})
	var t1 := _wrap(ttl, 14, "ink", "display_b")
	t1.name = "LiveTitle"
	hv.add_child(t1)
	var extra: Array = c.get("extraTribes", [])
	var tribe := str(c.get("tribe", "")) + ((" + " + ", ".join(PackedStringArray(extra))) if not extra.is_empty() else "")
	if tribe != "":
		hv.add_child(_wrap(tribe, 13, "mute"))
	if not rune_names.is_empty():
		hv.add_child(_wrap(TH.ui_text("li_runes", {"l": " · ".join(PackedStringArray(rune_names))}), 13, "r-epic"))
	head.add_child(x)
	# what is on the unit right now
	var now := HFlowContainer.new()
	now.name = "LiveNow"
	now.add_theme_constant_override("h_separation", 12)
	for pr in [["li_hp", "%s/%s" % [_n(maxf(0.0, float(v["hp"]))), _n(float(v["maxHp"]))], "hp"], ["li_armor", _n(float(v["armor"])), "n-armor"],
			["li_burn", _n(float(v["burn"])), "n-burn"], ["li_shock", _n(float(v["shock"])), "n-shock"]]:
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 4)
		h.add_child(TH.label(TH.ui_text(pr[0]), 13, "mute"))
		h.add_child(TH.label(pr[1], 13, pr[2], "body_b"))
		now.add_child(h)
	if bool(v["down"]):
		now.add_child(TH.label(TH.ui_text("li_down"), 13, "bad", "body_b"))
	_body.add_child(now)
	# skills + times fired so far
	var groups: Variant = TH.labels().get("skills", {}).get(str(c["id"]))
	var lv := maxi(1, int(v["level"]))
	if groups is Array and groups.size() > 0:
		for g in groups:
			var on: bool = g.get("lv") == null or (g["lv"] is Array and g["lv"].has(float(lv)))
			var txts: Array = g["text"]
			var n := 0
			for si in (g["si"] if g.get("si") is Array else []):
				n += int(v["procs"].get(int(si), 0))
			var line := str(txts[clampi(lv - 1, 0, txts.size() - 1)] if on else txts[0])
			if g.get("shop") != true:
				line += "  — " + (TH.ui_text("li_fired", {"n": str(n)}) if on else TH.ui_text("li_notlv", {"n": str(lv)}))
			var l := _wrap(line, 13, "ink" if on else "mute")
			l.name = "LiveSkill"
			_body.add_child(l)
	elif known:
		_body.add_child(TH.label(TH.ui_text("no_skill"), 13, "mute"))
	# every stat, +/− against the start
	var st: Variant = v["stat"]
	if st is Dictionary:
		var ini: Variant = null
		for ru in (view.result["units"] if view.result.get("units") is Array else []):
			if int(ru["uid"]) == int(v["uid"]):
				ini = ru.get("ini")
		var base: Variant = null
		if ini is Dictionary:
			base = (ini as Dictionary).duplicate()
			base["cd"] = maxf(float(R.js_or0(R.RULES().get("minCooldownMs"))), roundf(float(ini["cdMs"]) * float(ini["cdMult"])))
		var grid := HFlowContainer.new()
		grid.name = "LiveStats"
		grid.add_theme_constant_override("h_separation", 12)
		grid.add_theme_constant_override("v_separation", 1)
		for row in LIVE_STATS:
			var k: String = row[0]
			if st.get(k) == null:
				continue
			var val := float(st[k])
			var d := _r2(val - float(base[k])) if base is Dictionary and base.get(k) != null else 0.0
			if not LIVE_ALWAYS.has(k) and val == 0.0 and d == 0.0:
				continue
			var cell := HBoxContainer.new()
			cell.add_theme_constant_override("separation", 4)
			cell.add_child(TH.label(TH.ui_text(row[1]), 13, "mute"))
			cell.add_child(TH.label(_fmt(row[3], _r2(val)), 13, row[2], "body_b"))
			if d != 0.0:
				var good: bool = d < 0.0 if row[4] else d > 0.0
				var ds := "%.2f %s" % [absf(d) / 1000.0, TH.ui_text("sec")] if k == "cd" else _n(absf(d)) + ("%" if row[3] == "%" else "")
				cell.add_child(TH.label(("+" if d > 0.0 else "−") + TH.ui_text("li_from", {"d": ds}), 13, "ok" if good else "bad"))
			grid.add_child(cell)
		_body.add_child(grid)
	else:
		_body.add_child(TH.label(TH.ui_text("li_nolive"), 13, "mute"))
	_body.add_child(_wrap(TH.ui_text("li_hint"), 13, "mute"))
	visible = true
