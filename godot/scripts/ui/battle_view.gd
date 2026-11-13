# Set 198 (plan-set196 7c): the battle picture = web BattleView (src/game/view.js). It only PLAYS the event list that simulate()
# already produced (the result is decided before it starts) — it never computes a rule. Two sides of 3×2 cells, one unit card per
# cell (picture · name · HP + armor bar · numbers · chips), floating damage / heal numbers, ticker lines, speed 1–16, stop, skip.
# Boss units may stand on several cells (cells[]): the card sits on the first, the others get a name tag.
# Tests drive it without a running tree through advance(ms).
extends Control

const TH := preload("res://scripts/ui/theme.gd")
const UV := preload("res://scripts/ui/unit_view.gd")
const R := preload("res://scripts/rules.gd")
const S217_CLEAN := true # set 217 sample branch: no HP bar / numbers / chips / damage numbers on the field (owner: "not used yet")

signal time_changed(ms: float)
signal log_line(text: String)
signal ended(winner: Variant, time_ms: float)
signal unit_tapped(uid: int)

const WHY_CLASS := {"reflect": "n-hit", "hit": "n-hit", "counter": "n-hit", "shock": "n-shock", "burn": "n-burn", "storm": "n-storm", "armorBreak": "n-hit", "downSkill": "n-hit"}

var cm: Dictionary = {}
var result: Variant = null
var events: Array = []
var idx := 0
var clock := 0.0
var speed := 1.0
var playing := false
var is_ended := false
var fast := false
var units := {} # uid → unit record (see _add_unit)
var cells := {} # "side:row:lane" → Control
var ver := 0 # bumps on every applied event (the live info panel repaints on change)
var picked: Variant = null
var log: Array = [] # every ticker line so far: {t, text, ids: [uid]}

var stage: Node3D = null # set 206: app.stage (the 3D arena) — null in bare tests
var _skill_tok := {}

func _init() -> void:
	name = "BattleView"
	mouse_filter = Control.MOUSE_FILTER_PASS

# ---------- load ----------
func load_result(res: Dictionary, charmap: Dictionary) -> void:
	for ch in get_children():
		ch.queue_free()
	cm = charmap
	result = res
	events = res["events"]
	idx = 0
	clock = 0.0
	is_ended = false
	playing = false
	fast = false
	ver = 0
	log = []
	picked = null
	units = {}
	cells = {}
	_skill_tok = {}
	# set 206: the cells sit on the 3D arena's projected slot rects (place_cells); the units are sprites there (group "battle")
	var row := Control.new()
	row.name = "Arena"
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(row)
	if stage != null:
		stage.set_units("battle", [])
		for s0 in 2:
			for r0 in 3:
				for l0 in 2:
					stage.tint(s0, r0, l0, null)
	for s in 2:
		for lane in 2: # far line first: the near line draws (and takes taps) on top where they overlap
			for c in 3:
				var rw := 2 - c if s == 0 else c
				var cell := PanelContainer.new()
				cell.name = "C%d_%d_%d" % [s, rw, lane]
				cell.custom_minimum_size = Vector2.ZERO
				cell.clip_contents = true
				cell.mouse_filter = Control.MOUSE_FILTER_STOP
				_cell_style(cell, false, false)
				var key := "%d:%d:%d" % [s, rw, lane]
				cell.gui_input.connect(_on_cell_input.bind(key))
				row.add_child(cell)
				cells[key] = cell
	place_cells()
	var start: Variant = null
	for e in events:
		if e["k"] == "start":
			start = e
			break
	if start != null:
		for u in start["units"]:
			_add_unit(u)
	time_changed.emit(0.0)

func _cell_style(cell: PanelContainer, filled: bool, skilling: bool, is_picked: bool = false) -> void:
	var bg := TH.c("panel") if filled else Color(0, 0, 0, 0)
	var line := TH.c("line") if filled else TH.c("arena-line")
	var bw := 1 if filled else 2
	if skilling:
		bg = TH.c("n-skill").lerp(TH.c("panel"), 0.9)
		line = TH.c("n-skill")
		bw = 2
	if is_picked:
		line = TH.c("sel")
		bw = 3
	# set 206: no box on the arena; a skill / picked unit lights its tile's rune rim and gets a thin frame
	var lit := skilling or is_picked
	var st := TH.box(Color(0, 0, 0, 0), Color(line, 0.9) if lit else Color(0, 0, 0, 0), 10, bw if lit else 0, 3, 3)
	st.draw_center = false
	cell.add_theme_stylebox_override("panel", st)
	if stage != null:
		var kp := str(cell.name).substr(1).split("_")
		if kp.size() == 3:
			stage.tint(int(kp[0]), int(kp[1]), int(kp[2]), line if lit else null)

# ---------- units ----------
func _char_of(u: Dictionary) -> Dictionary:
	var c: Variant = cm.get(u["id"])
	return c if c is Dictionary else {"id": u["id"], "name": str(u.get("name", u["id"])), "tribe": ""}

func _add_unit(u: Dictionary) -> Dictionary:
	var c := _char_of(u)
	var cell: Control = cells.get("%d:%d:%d" % [int(u["side"]), int(u["row"]), int(u["lane"])])
	var v := {"uid": int(u["uid"]), "side": int(u["side"]), "id": u["id"], "name": str(u.get("name", c["name"])), "level": int(R.js_or0(u.get("level"))), "row": int(u["row"]), "lane": int(u["lane"]),
		"hp": float(u["hp"]), "maxHp": float(u["maxHp"]), "armor": float(u.get("armor", 0.0)), "burn": 0.0, "shock": 0.0, "bars": int(R.js_or0(u.get("bars"))), "barHp": float(R.js_or0(u.get("barHp"))),
		"stat": null, "procs": {}, "down": false, "tags": [], "cells": null, "boss": u.get("boss") == true}
	var m0: Variant = c["multi"][maxi(0, v["level"] - 1)] if c.get("multi") is Array and v["level"] >= 1 and v["level"] - 1 < (c["multi"] as Array).size() else 1
	v["multi"] = float(m0) if R.is_int(m0) else 1.0
	if cell == null:
		units[v["uid"]] = v
		return v
	var card := VBoxContainer.new()
	card.name = "Unit"
	card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.alignment = BoxContainer.ALIGNMENT_CENTER
	card.add_theme_constant_override("separation", 1)
	var shape := Control.new() # set 206: the picture is the unit's sprite on the 3D tile above this spot
	shape.name = "Mon"
	shape.mouse_filter = Control.MOUSE_FILTER_IGNORE
	shape.size_flags_vertical = Control.SIZE_EXPAND_FILL
	card.add_child(shape)
	card.alignment = BoxContainer.ALIGNMENT_END
	var hp_bar := HpBar.new()
	hp_bar.custom_minimum_size = Vector2(0, 9)
	hp_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.add_child(hp_bar)
	var nums := TH.label("", 13, "ink")
	nums.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	nums.clip_text = true
	nums.mouse_filter = Control.MOUSE_FILTER_IGNORE
	nums.add_theme_stylebox_override("normal", TH.box(Color(TH.c("panel"), 0.82), Color(0, 0, 0, 0), 5, 0, 3, 0))
	card.add_child(nums)
	var chips := TH.label("", 13, "n-burn")
	chips.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	chips.clip_text = true
	chips.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chips.add_theme_stylebox_override("normal", TH.box(Color(TH.c("panel"), 0.82), Color(0, 0, 0, 0), 5, 0, 3, 0))
	card.add_child(chips)
	cell.add_child(card)
	card.visible = not S217_CLEAN
	_cell_style(cell, true, false, picked != null and int(picked) == v["uid"])
	v["card"] = card
	v["cell"] = cell
	v["bar"] = hp_bar
	v["nums"] = nums
	v["chips"] = chips
	units[v["uid"]] = v
	if u.get("cells") is Array:
		_place_cells(v, u["cells"])
	_stage_add(v)
	_paint(v)
	return v

# set 206: the unit's sprite on the arena · a boss on several cells stands in the middle of them, bigger
func _stage_add(v: Dictionary) -> void:
	if stage == null:
		return
	var u := {"id": v["uid"], "side": v["side"], "row": v["row"], "lane": v["lane"], "c": _char_of(v)}
	var cl: Variant = v.get("cells")
	if cl is Array and (cl as Array).size() > 1:
		var at := Vector3.ZERO
		for i in cl:
			at += stage.slot_pos(int(v["side"]), int(i) >> 1, int(i) & 1)
		u["at"] = at / float((cl as Array).size())
		u["big"] = true
	elif v.get("boss", false):
		u["big"] = true
	stage.add_unit("battle", u)
	stage.set_down("battle", v["uid"], v["down"])

# set 206: every cell on its projected slot rect (the camera moved or the field resized)
func place_cells() -> void:
	if stage == null or not has_node("Arena"):
		return
	var o: Vector2 = get_node("Arena").get_global_rect().position
	for key in cells:
		var kp: PackedStringArray = str(key).split(":")
		var r: Rect2 = stage.slot_rect(int(kp[0]), int(kp[1]), int(kp[2]))
		var cell: Control = cells[key]
		cell.position = r.position - o
		cell.size = r.size

# a boss standing on several cells: the card on the first, a name tag on each of the others
func _place_cells(v: Dictionary, cl: Array) -> void:
	for t in v["tags"]:
		if is_instance_valid(t):
			t.queue_free()
	v["tags"] = []
	v["cells"] = cl.duplicate()
	var at := func(i: int) -> Variant: return cells.get("%d:%d:%d" % [v["side"], i >> 1, i & 1])
	var first: Variant = at.call(int(cl[0]))
	if first != null and first != v.get("cell") and v.has("card"):
		var old: Control = v["cell"]
		old.remove_child(v["card"])
		first.add_child(v["card"])
		_cell_style(old, false, false)
		_cell_style(first, true, false)
		v["cell"] = first
		v["row"] = int(cl[0]) >> 1
		v["lane"] = int(cl[0]) & 1
	for i in cl.slice(1):
		var c: Variant = at.call(int(i))
		if c == null:
			continue
		var tag := TH.label(v["name"], 12, "ink")
		tag.name = "BossTag"
		tag.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		tag.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		tag.mouse_filter = Control.MOUSE_FILTER_IGNORE
		c.add_child(tag)
		_cell_style(c, true, false)
		v["tags"].append(tag)

static func bar_color(k: int) -> Color:
	if k == 1:
		return TH.c("hp")
	var h := fmod(float(k - 1) * 137.5, 360.0) / 360.0
	return Color.from_hsv(h, 0.7 if k % 2 == 1 else 0.6, 0.82 if k % 3 != 0 else 0.66)

static func fmt(x: float) -> String:
	return R.js_num(x)

func _paint(v: Dictionary) -> void:
	if not v.has("bar"):
		return
	var hp := maxf(0.0, v["hp"])
	var bar: Control = v["bar"]
	bar.armor_frac = minf(1.0, v["armor"] / maxf(1.0, v["maxHp"]))
	bar.down = v["down"]
	if v["bars"] > 1 and v["barHp"] > 0.0: # a boss with several bars: the bar shows the current one, a colour per bar
		var k := maxi(1, mini(v["bars"], int(ceil(hp / v["barHp"]))))
		bar.frac = clampf((hp - float(k - 1) * v["barHp"]) / v["barHp"], 0.0, 1.0) if hp > 0.0 else 0.0
		bar.fill = bar_color(k)
		bar.under = bar_color(k - 1) if k > 1 else TH.c("hp-bg")
	else:
		bar.frac = clampf(hp / maxf(1.0, v["maxHp"]), 0.0, 1.0)
		bar.fill = TH.c("hp")
		bar.under = TH.c("hp-bg")
	bar.queue_redraw()
	var t := "%s/%s" % [fmt(hp), fmt(v["maxHp"])]
	if v["armor"] > 0.0:
		t += " +%s" % fmt(v["armor"])
	if v["bars"] > 1:
		t += " " + TH.ui_text("bar_n", {"k": str(maxi(1, mini(v["bars"], int(ceil(hp / v["barHp"]))))) if hp > 0.0 else "0", "n": str(v["bars"])})
	v["nums"].text = t
	var ch := []
	if v["multi"] > 1.0:
		ch.append("×" + fmt(v["multi"]))
	if v["burn"] > 0.0:
		ch.append(TH.ui_text("burn_n", {"n": fmt(v["burn"])}))
	if v["shock"] > 0.0:
		ch.append(TH.ui_text("shock_n", {"n": fmt(v["shock"])}))
	v["chips"].text = " ".join(PackedStringArray(ch))
	v["chips"].visible = v["chips"].text != ""
	v["card"].modulate = Color(1, 1, 1, 0.35) if v["down"] else Color.WHITE
	if stage != null:
		stage.set_down("battle", v["uid"], v["down"])
	for tg in v["tags"]:
		if is_instance_valid(tg):
			tg.modulate = Color(1, 1, 1, 0.35) if v["down"] else Color.WHITE

# ---------- floats ----------
func _float(v: Dictionary, text: String, cls: String) -> void:
	if S217_CLEAN:
		return
	if fast or not v.has("cell"):
		return
	var cell: Control = v["cell"]
	var olds := cell.get_children().filter(func(n): return n.name.begins_with("Float"))
	if olds.size() >= 3: # fast speeds: at most 3 numbers per cell, they vanish quicker
		olds[0].queue_free()
	var l := TH.label(text, 14, cls, "display")
	l.name = "Float"
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	l.top_level = false
	l.set_anchors_preset(Control.PRESET_CENTER_TOP)
	l.position = Vector2(0, 8)
	l.add_theme_color_override("font_outline_color", TH.c("panel"))
	l.add_theme_constant_override("outline_size", 4)
	cell.add_child(l)
	if not is_inside_tree():
		l.queue_free()
		return
	var dur := 0.9 / minf(speed, 4.0 if speed >= 8.0 else 2.0)
	var tw := l.create_tween()
	tw.set_parallel(true)
	tw.tween_property(l, "position:y", -18.0, dur)
	tw.tween_property(l, "modulate:a", 0.0, dur)
	tw.chain().tween_callback(l.queue_free)

func _tag_proc(v: Dictionary) -> void: # a skill fired: the cell glows for a moment (web .skilling)
	if fast or not v.has("cell") or not is_inside_tree():
		return
	var cell: PanelContainer = v["cell"]
	var tok := int(_skill_tok.get(v["uid"], 0)) + 1
	_skill_tok[v["uid"]] = tok
	_cell_style(cell, true, true, picked != null and int(picked) == v["uid"])
	if stage != null:
		stage.flash("battle", v["uid"])
	await get_tree().create_timer(1.4 / minf(speed, 4.0)).timeout
	if is_instance_valid(cell) and int(_skill_tok.get(v["uid"], 0)) == tok:
		_cell_style(cell, true, false, picked != null and int(picked) == v["uid"])

# ---------- one event ----------
func _nm(uid: Variant) -> String:
	var v: Variant = units.get(int(uid)) if uid != null else null
	if v == null:
		return "?"
	var c := _char_of(v)
	return (TH.ui_text("side_you") if v["side"] == 0 else TH.ui_text("side_foe")) + " " + str(c["name"])

func _say(s: String, e: Dictionary) -> void:
	var ids := []
	for key in ["who", "to", "from", "target"]:
		if e.get(key) != null and not ids.has(int(e[key])):
			ids.append(int(e[key]))
	log.append({"t": float(e["t"]), "text": s, "ids": ids}) # 7d: the battle log of the match details popup (filter by unit)
	log_line.emit(TH.ui_text("t_sec", {"t": "%.1f" % (float(e["t"]) / 1000.0)}) + " " + s)

func _set_stat(v: Variant, k: String, val: float) -> void:
	if v != null:
		v[k] = val

func apply(e: Dictionary) -> void:
	ver += 1
	var k: String = e["k"]
	match k:
		"stat":
			var v: Variant = units.get(int(e["to"]))
			if v != null:
				var st: Dictionary = v["stat"] if v["stat"] is Dictionary else {}
				st = st.duplicate()
				st.merge(e["s"], true)
				v["stat"] = st
		"set":
			var a: Variant = units.get(int(e["who"]))
			if a != null:
				var hits: Variant = e.get("hits")
				if R.is_int(hits) and float(hits) >= 1.0 and float(hits) != a["multi"]:
					a["multi"] = float(hits)
					_paint(a)
				if e.get("target") != null:
					_say(TH.ui_text("t_set", {"a": _nm(e["who"]), "b": _nm(e["target"]), "n": fmt(float(e["n"])), "h": fmt(float(hits))}), e)
				if not fast and is_inside_tree() and a.has("card") and (a["card"] as Control).is_inside_tree():
					_lunge(a, units.get(int(e["target"])) if e.get("target") != null else null)
		"dmg":
			var v: Variant = units.get(int(e["to"]))
			if v != null:
				var amount := float(e["amount"])
				var ab := float(e.get("absorbed", 0.0))
				v["armor"] = float(v["armor"]) - ab
				v["hp"] = float(v["hp"]) - (amount - ab)
				if not fast:
					_float(v, "-" + fmt(amount), WHY_CLASS.get(e.get("why"), "n-hit"))
				_say(TH.ui_text("t_dmg", {"to": _nm(e["to"]), "why": TH.ui_dyn("why_" + str(e.get("why", ""))), "n": fmt(amount)}) + (TH.ui_text("t_absorb", {"n": fmt(ab)}) if ab > 0.0 else ""), e)
				_paint(v)
		"chainAbsorb":
			var v: Variant = units.get(int(e["to"]))
			if v != null:
				v["armor"] = maxf(0.0, float(v["armor"]) - float(e["amount"]))
				_paint(v)
		"armor":
			var v: Variant = units.get(int(e["to"]))
			if v != null:
				v["armor"] = float(v["armor"]) + float(e["amount"])
				_float(v, TH.ui_text("f_armor", {"n": fmt(float(e["amount"]))}), "n-armor")
				_say(TH.ui_text("t_armor", {"to": _nm(e["to"]), "n": fmt(float(e["amount"]))}), e)
				_paint(v)
		"burnLeft":
			var v: Variant = units.get(int(e["to"]))
			if v != null:
				v["burn"] = float(e["total"])
				_paint(v)
		"burn", "shock":
			var v: Variant = units.get(int(e["to"]))
			if v != null:
				v[k] = float(e["total"])
				_say(TH.ui_text("t_stat", {"w": TH.ui_text("burn_w" if k == "burn" else "shock_w"), "to": _nm(e["to"]), "n": fmt(float(e["amount"])), "t": fmt(float(e["total"]))}), e)
				_paint(v)
		"heal":
			var v: Variant = units.get(int(e["to"]))
			if v != null:
				v["hp"] = float(v["hp"]) + float(e["amount"])
				_float(v, "+" + fmt(float(e["amount"])), "n-heal")
				_say(TH.ui_text("t_heal", {"to": _nm(e["to"]), "n": fmt(float(e["amount"]))}), e)
				_paint(v)
		"bossMove":
			var v: Variant = units.get(int(e["who"]))
			if v != null:
				_place_cells(v, [e["slot"]])
		"phase":
			var v: Variant = units.get(int(e["who"]))
			if v != null and e.get("cells") is Array:
				_place_cells(v, e["cells"])
		"proc":
			var v: Variant = units.get(int(e["who"]))
			if v != null:
				if e.get("si") != null:
					var si := int(e["si"])
					v["procs"][si] = int(v["procs"].get(si, 0)) + 1
				_tag_proc(v)
		"maxhp":
			var v: Variant = units.get(int(e["to"]))
			if v != null:
				v["maxHp"] = float(e["maxHp"])
				v["hp"] = minf(float(v["hp"]), float(e["hp"]))
				var am := float(e["amount"])
				_float(v, TH.ui_text("f_maxhp_up" if am < 0.0 else "f_maxhp_dn", {"n": fmt(absf(am))}), "n-heal" if am < 0.0 else "n-hit")
				_paint(v)
		"cleanse":
			var v: Variant = units.get(int(e["to"]))
			if v != null:
				match str(e.get("what")):
					"pct":
						v["burn"] = float(e["burn"])
						v["shock"] = float(e["shock"])
					"bar":
						v["burn"] = 0.0
						v["shock"] = 0.0
						_float(v, TH.ui_text("f_newbar"), "n-heal")
					_:
						v["burn"] = 0.0
						if str(e.get("what")) != "burn":
							v["shock"] = 0.0
				_paint(v)
		"buff":
			if str(e.get("what")) == "hpUp":
				var v: Variant = units.get(int(e["to"]))
				if v != null:
					v["maxHp"] = float(v["maxHp"]) + float(e["amount"])
					v["hp"] = float(v["hp"]) + float(e["amount"])
					_paint(v)
		"down":
			var v: Variant = units.get(int(e["who"]))
			if v != null:
				v["down"] = true
				v["hp"] = 0.0
				v["armor"] = 0.0
				v["burn"] = 0.0
				v["shock"] = 0.0
				_say(TH.ui_text("t_down", {"who": _nm(e["who"])}), e)
				_paint(v)
		"revive":
			var v: Variant = units.get(int(e["who"]))
			if v != null:
				v["hp"] = float(e["hp"])
				v["armor"] = 0.0
				v["burn"] = 0.0
				v["shock"] = 0.0
				v["down"] = false
				_float(v, TH.ui_text("f_revive"), "n-heal")
				_say(TH.ui_text("t_revive", {"who": _nm(e["who"]), "n": fmt(float(e["hp"]))}), e)
				_paint(v)
		"summon":
			var o: Variant = units.get(int(e["from"]))
			if o != null and o.has("card") and is_instance_valid(o["card"]):
				(o["card"] as Node).queue_free()
			if o != null and stage != null:
				stage.remove_unit("battle", o["uid"])
			var nv := _add_unit(e["unit"])
			_float(nv, TH.ui_text("f_summon"), "n-heal")
			_say(TH.ui_text("t_summon", {"from": _nm(e["from"]), "who": _nm(e["who"])}), e)
		"steal":
			var v: Variant = units.get(int(e["to"]))
			if v != null:
				v["shock"] = float(e["total"])
				_paint(v)
		"end":
			is_ended = true
			playing = false
			ended.emit(e.get("winner"), float(result["timeMs"]))

# the attacker steps toward its target once per set (a multi-hit is still one lunge)
func _lunge(a: Dictionary, t: Variant) -> void:
	var card: Control = a["card"]
	var dir := Vector2(16.0 if a["side"] == 0 else -16.0, 0.0)
	if t != null and t.has("cell") and a.has("cell"):
		var d: Vector2 = (t["cell"] as Control).global_position - (a["cell"] as Control).global_position
		if d.length() > 1.0:
			dir = d.normalized() * 14.0
	var tw := card.create_tween()
	var ms := 0.26 / maxf(speed, 0.5)
	if stage != null:
		stage.lunge("battle", a["uid"], t["uid"] if t != null else null, ms)
	tw.tween_property(card, "position", dir, ms * 0.4)
	tw.tween_property(card, "position", Vector2.ZERO, ms * 0.6)

# ---------- playing ----------
func play() -> void:
	if is_ended:
		return
	playing = true
	set_process(true)

func pause() -> void:
	playing = false

func _process(delta: float) -> void:
	if playing:
		advance(delta * 1000.0 * speed)

# the clock moves ms forward (what _process does each frame)
func advance(ms: float) -> void:
	if not playing or result == null:
		return
	clock += ms
	while idx < events.size() and float(events[idx]["t"]) <= clock:
		apply(events[idx])
		idx += 1
	time_changed.emit(minf(clock, float(result["timeMs"])))

func skip() -> void:
	if result == null or is_ended:
		return
	pause()
	fast = true
	while idx < events.size():
		apply(events[idx])
		idx += 1
	fast = false
	time_changed.emit(float(result["timeMs"]))

func unit_at_cell(key: String) -> Variant:
	for v in units.values():
		if v.has("card") and is_instance_valid(v["card"]) and v["card"].is_inside_tree():
			if "%d:%d:%d" % [v["side"], v["row"], v["lane"]] == key:
				return v
			for i in (v["cells"] if v["cells"] is Array else []):
				if "%d:%d:%d" % [v["side"], int(i) >> 1, int(i) & 1] == key:
					return v
	return null

func _on_cell_input(ev: InputEvent, key: String) -> void:
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		var v: Variant = unit_at_cell(key)
		if v != null:
			unit_tapped.emit(int(v["uid"]))
		else:
			unit_tapped.emit(-1) # an empty cell: the live pane closes (web "แตะที่อื่น = ปิด")

func set_picked(uid: Variant) -> void:
	picked = uid
	for v in units.values():
		if v.has("cell") and is_instance_valid(v["cell"]):
			_cell_style(v["cell"], true, false, uid != null and int(uid) == v["uid"])

# ---------- the HP bar ----------
class HpBar extends Control:
	var frac := 1.0
	var armor_frac := 0.0
	var fill := Color.GREEN
	var under := Color.DIM_GRAY
	var down := false
	func _draw() -> void:
		var r := Rect2(Vector2.ZERO, size)
		draw_rect(r, under)
		draw_rect(Rect2(0, 0, size.x * frac, size.y), fill)
		if armor_frac > 0.0:
			draw_rect(Rect2(0, 0, size.x * armor_frac, 3), Color(0.43, 0.5, 0.57))
