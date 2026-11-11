# Set 199 (plan-set196 7d, user pick B1 = the short form): match details popup (web #mxDlg / renderMatch) — a summary line,
# 4 tabs (damage dealt · damage taken · other · stats), one row per unit with a bar split by source, and the battle log
# with a "this unit only" filter. Not ported (noted in plan-set196): tapping a row / bar part to drill down, jumping to a log line,
# the "skills only" / "hide attack lines" log filters. Numbers come from scripts/matchcalc.gd (no rule is computed here).
extends RefCounted

const TH := preload("res://scripts/ui/theme.gd")
const Pop := preload("res://scripts/ui/pop.gd")
const MX := preload("res://scripts/matchcalc.gd")
const BattleScr := preload("res://scripts/ui/battle.gd")
const R := preload("res://scripts/rules.gd")

const TABS := ["mx_tab_out", "mx_tab_in", "mx_tab_fx", "mx_tab_stat"]
const SRC_COL := {"hit": "n-hit", "counter": "n-cnt", "reflect": "n-reflect", "shock": "n-shock", "burn": "n-burn", "storm": "n-storm", "skill": "n-skill",
	"downSkill": "n-down", "armorBreak": "n-abrk", "execute": "n-exec"}

static func nf(v: float) -> String:
	return BattleScr.fmt_n(v)

static func _unit_name(u: Dictionary, cm: Dictionary) -> String:
	var c: Variant = cm.get(u["id"])
	var rows: Array = TH.labels()["tables"]["ROW_TH"]
	var nm := str(c["name"]) if c is Dictionary else str(u.get("name", u["id"]))
	var lv := (" Lv%d" % int(u["level"])) if c is Dictionary and c.has("rarity") and R.js_or0(u.get("level")) > 0.0 else ""
	return "%s%d · %s%s" % [str(rows[clampi(int(u["row"]), 0, rows.size() - 1)]), int(u["lane"]) + 1, nm, lv]

static func _src_name(w: String) -> String:
	return TH.ui_text("mx_src_skill") if w == "skill" else TH.ui_dyn("why_" + w)

static func _chip(lab: String, val: String) -> Control:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", TH.box(TH.c("soft"), TH.c("soft"), 8, 0, 8, 2))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 5)
	h.add_child(TH.label(lab, 13, "mute"))
	h.add_child(TH.label(val, 13, "ink", "body_b"))
	p.add_child(h)
	return p

static func _dot(tok: String, text: String) -> Control:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 4)
	var d := ColorRect.new()
	d.color = TH.c(tok)
	d.custom_minimum_size = Vector2(10, 10)
	d.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(d)
	h.add_child(TH.label(text, 13, "mute"))
	return h

# one unit row: name · value · note, then the bar
static func _row(name_text: String, lab: String, val: String, note: String, frac: float, parts: Array) -> Control:
	var v := VBoxContainer.new()
	v.name = "MxRow"
	v.set_meta("tag", "MxRow")
	v.add_theme_constant_override("separation", 2)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	var n := TH.label(name_text, 13, "ink", "body_b")
	n.custom_minimum_size.x = 170
	n.clip_text = true
	n.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	h.add_child(n)
	h.add_child(TH.label(lab, 13, "mute"))
	var vl := TH.label(val, 13, "ink", "mono")
	vl.name = "MxVal"
	h.add_child(vl)
	if note != "":
		var nt := TH.label(note, 13, "mute")
		nt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		nt.clip_text = true
		nt.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		h.add_child(nt)
	v.add_child(h)
	var bar := BattleScr.Bar.new()
	bar.frac = clampf(frac, 0.0, 1.0)
	bar.parts = parts
	bar.under = TH.c("soft")
	bar.custom_minimum_size = Vector2(0, 9)
	v.add_child(bar)
	return v

static func _src_parts(by: Dictionary, total: float) -> Array:
	var parts := []
	for w in MX.MX_SRC:
		if float(by.get(w, 0.0)) > 0.0 and total > 0.0:
			parts.append([float(by[w]) / total, TH.c(SRC_COL[w])])
	return parts

# the end-of-match stat line of one unit (web mxStatRows without HP)
static func _fin_line(x: Dictionary) -> String:
	var f: Variant = x.get("fin")
	if not (f is Dictionary):
		return ""
	var cd := maxf(float(R.js_or0(R.RULES().get("minCooldownMs"))), roundf(float(f["cdMs"]) * float(f["cdMult"])))
	var out := ["%s %s" % [TH.ui_text("ls_atk"), nf(float(f["atk"]))], "%s %.2f %s" % [TH.ui_text("cd"), cd / 1000.0, TH.ui_text("sec")], "%s ×%s" % [TH.ui_text("ls_multi"), nf(float(f["multi"]))]]
	for pr in [["burnHit", "ls_burn_hit"], ["shockHit", "ls_shock_hit"], ["armorHit", "ls_armor_hit"], ["healHit", "ls_heal_hit"]]:
		if float(R.js_or0(f.get(pr[0]))) > 0.0:
			out.append("%s %s" % [TH.ui_text(pr[1]), nf(float(f[pr[0]]))])
	return " · ".join(PackedStringArray(out))

# res = the simulate() result on screen · log = battle_view.log · state = {tab, who, log_open} (kept by popups.gd)
# on_change.call(key, value) re-opens the popup with the new state
static func build(res: Dictionary, cm: Dictionary, log: Array, state: Dictionary, on_change: Callable) -> Array:
	var m := MX.model(res)
	var tab := int(state.get("tab", 0))
	var nodes: Array = [Pop.head(TH.ui_text("r_details"))]
	var w: Variant = res.get("winner")
	var sum := HFlowContainer.new()
	sum.name = "MxHead"
	sum.add_theme_constant_override("h_separation", 6)
	sum.add_theme_constant_override("v_separation", 4)
	var win := TH.label(TH.ui_text("mx_win_l" if R.js_seq(w, 0.0) else "mx_win_r" if R.js_seq(w, 1.0) else "r_draw"), 15, "bad" if R.js_seq(w, 1.0) else "ok", "display_b")
	sum.add_child(win)
	sum.add_child(_chip(TH.ui_text("mx_time"), TH.ui_text("t_sec", {"t": "%.1f" % (float(res["timeMs"]) / 1000.0)})))
	sum.add_child(_chip(TH.ui_text("mx_l_did"), nf(m["tot"][0])))
	sum.add_child(_chip(TH.ui_text("mx_r_did"), nf(m["tot"][1])))
	sum.add_child(_chip(TH.ui_text("mx_alive"), "%d / %d" % [m["alive"][0], m["alive"][1]]))
	nodes.append(sum)
	# tabs
	var tabs := HBoxContainer.new()
	tabs.name = "MxTabs"
	tabs.add_theme_constant_override("separation", 4)
	for i in TABS.size():
		var b := Button.new()
		b.name = "MxTab%d" % i
		b.text = TH.ui_text(TABS[i])
		b.toggle_mode = true
		b.button_pressed = i == tab
		b.custom_minimum_size.y = 36
		b.pressed.connect(func() -> void: on_change.call("tab", i))
		tabs.add_child(b)
	nodes.append(tabs)
	# legend: the sources that appear in this match
	var leg := HFlowContainer.new()
	leg.name = "MxLegend"
	leg.add_theme_constant_override("h_separation", 10)
	if tab <= 1:
		var seen := {}
		for id in m["per"]:
			for k in m["per"][id]["in"]:
				seen[k] = true
		for k in MX.MX_SRC:
			if seen.has(k):
				leg.add_child(_dot(SRC_COL[k], _src_name(k)))
	elif tab == 2:
		leg.add_child(_dot("n-heal", TH.ui_text("mx_heal")))
		leg.add_child(_dot("n-armor", TH.ui_text("mx_armor")))
	if leg.get_child_count() > 0:
		nodes.append(leg)
	var fin := {}
	for x in (res["units"] if res.get("units") is Array else []):
		fin[int(x["uid"])] = x
	var units := VBoxContainer.new()
	units.name = "MxUnits"
	units.add_theme_constant_override("separation", 6)
	for sd in 2:
		units.add_child(TH.label(TH.ui_text("side_you" if sd == 0 else "side_foe"), 13, "accent", "body_b"))
		for u in m["units"]:
			if int(u["side"]) != sd:
				continue
			var p: Dictionary = m["per"][int(u["uid"])]
			var nm := _unit_name(u, cm)
			match tab:
				0:
					var parts := []
					if p["hits"] > 0.0:
						parts.append(TH.ui_text("mx_hits", {"n": nf(p["hits"])}))
					if p["shockU"] > 0.0:
						parts.append(TH.ui_text("mx_shock_u", {"n": nf(p["shockU"])}))
					if p["burnU"] > 0.0:
						parts.append(TH.ui_text("mx_burn_u", {"n": nf(p["burnU"])}))
					units.add_child(_row(nm, TH.ui_text("mx_did"), nf(p["out_t"]), " · ".join(PackedStringArray(parts)), p["out_t"] / m["max"]["out"], _src_parts(p["out"], p["out_t"])))
				1:
					var note := TH.ui_text("mx_in_note", {"a": nf(float(p["in_from"].size())), "n": nf(p["in_n"])}) if p["in_n"] > 0.0 else TH.ui_text("mx_in_none")
					units.add_child(_row(nm, TH.ui_text("mx_took"), nf(p["in_t"]), note, p["in_t"] / m["max"]["in"], _src_parts(p["in"], p["in_t"])))
				2:
					var tot: float = p["heal"] + p["armor"]
					var parts2 := []
					if p["heals"] > 0.0:
						parts2.append(TH.ui_text("mx_heals", {"n": nf(p["heals"])}))
					if p["armors"] > 0.0:
						parts2.append(TH.ui_text("mx_armors", {"n": nf(p["armors"])}))
					if p["skills"] > 0.0:
						parts2.append(TH.ui_text("mx_skills", {"n": nf(p["skills"])}))
					var segs := []
					if tot > 0.0:
						segs = [[p["heal"] / tot, TH.c("n-heal")], [p["armor"] / tot, TH.c("n-armor")]]
					units.add_child(_row(nm, TH.ui_text("mx_did"), nf(tot), " · ".join(PackedStringArray(parts2)), tot / m["max"]["fx"], segs))
				_:
					var x: Dictionary = fin.get(int(u["uid"]), {})
					var fd: Variant = x.get("fin")
					var mxhp := maxf(1.0, float(fd["maxHp"]) if fd is Dictionary else float(R.js_or0(x.get("maxHp"))))
					var hp := maxf(0.0, float(R.js_or0(x.get("hp"))))
					var row := _row(nm, TH.ui_text("mx_hp_end"), "%s/%s" % [nf(hp), nf(mxhp)], TH.ui_text("li_down") if x.get("down") == true else TH.ui_text("mx_alive"), hp / mxhp, [[1.0, TH.c("hp")]])
					var fl := _fin_line(x)
					if fl != "":
						var l := TH.label(fl, 13, "mute")
						l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
						row.add_child(l)
					units.add_child(row)
	nodes.append(units)
	# battle log (the ticker lines of the whole match), optionally one unit only
	var open := bool(state.get("log_open", false))
	var lb := Button.new()
	lb.name = "MxLToggle"
	lb.text = ("▾ " if open else "▸ ") + TH.ui_text("mx_log")
	lb.alignment = HORIZONTAL_ALIGNMENT_LEFT
	lb.custom_minimum_size.y = 36
	lb.pressed.connect(func() -> void: on_change.call("log_open", not open))
	nodes.append(lb)
	if open:
		var who: Variant = state.get("who")
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 6)
		h.add_child(TH.label(TH.ui_text("mx_log_who"), 13, "mute"))
		var ob := OptionButton.new()
		ob.name = "MxWho"
		ob.custom_minimum_size.y = 36
		ob.add_item(TH.ui_text("mx_log_all"))
		ob.set_item_metadata(0, null)
		var sel := 0
		for u in m["units"]:
			ob.add_item("%s %s" % [TH.ui_text("side_you" if int(u["side"]) == 0 else "side_foe"), _unit_name(u, cm)])
			ob.set_item_metadata(ob.item_count - 1, int(u["uid"]))
			if who != null and int(who) == int(u["uid"]):
				sel = ob.item_count - 1
		ob.select(sel)
		ob.item_selected.connect(func(i: int) -> void: on_change.call("who", ob.get_item_metadata(i)))
		h.add_child(ob)
		nodes.append(h)
		var lines := PackedStringArray()
		for ln in log:
			if who == null or (ln["ids"] as Array).has(int(who)):
				lines.append("%s %s" % [TH.ui_text("t_sec", {"t": "%.1f" % (float(ln["t"]) / 1000.0)}), str(ln["text"])])
		var ll := TH.label("\n".join(lines) if not lines.is_empty() else TH.ui_text("mx_log_none"), 13, "ink")
		ll.name = "MxLog"
		ll.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		nodes.append(ll)
	return nodes
