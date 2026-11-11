# Set 196 (plan-set196 7a): the screens build headless, read only generated data, and act only through the ported core.
extends RefCounted

const TH := preload("res://scripts/ui/theme.gd")
const SH := preload("res://scripts/shop.gd")
const RR := preload("res://scripts/runrunes.gd")
const R := preload("res://scripts/rules.gd")
const T := preload("res://scripts/team.gd")

var _opts := {}

func setup(opts: Dictionary) -> void:
	_opts = opts

func _src(path: String) -> String:
	return FileAccess.get_file_as_string(path)

func _ui_files() -> Array:
	var out := []
	for f in DirAccess.get_files_at("res://scripts/ui"):
		if f.ends_with(".gd"):
			out.append("res://scripts/ui/" + f)
	return out

# every ui_text("key") / c("token") used by the UI scripts exists in ui_th.json / colours.json (light + dark)
func test_keys_exist() -> String:
	var ui: Variant = JSON.parse_string(_src("res://data/ui_th.json"))
	var col: Variant = JSON.parse_string(_src("res://data/colours.json"))
	if not (ui is Dictionary and col is Dictionary):
		return "ui_th.json / colours.json unreadable"
	var rx_t := RegEx.create_from_string("ui_text\\(\"([a-z_]+)\"")
	var rx_c := RegEx.create_from_string("(?:TH\\.c|[^a-z_]c)\\(\"([a-z0-9-]+)\"\\)|\"(t-[a-z]+|r-[a-z-]+)\"")
	var miss := []
	for f in _ui_files():
		var s := _src(f)
		for m in rx_t.search_all(s):
			if not ui.has(m.get_string(1)):
				miss.append(f.get_file() + " ui:" + m.get_string(1))
		for m in rx_c.search_all(s):
			var k := m.get_string(1) if m.get_string(1) != "" else m.get_string(2)
			if not (col["light"].has(k) and col["dark"].has(k)):
				miss.append(f.get_file() + " colour:" + k)
	return "ok" if miss.is_empty() else "missing: " + ", ".join(PackedStringArray(miss))

# Thai text renders with the shipped fonts (not a fallback box)
func test_fonts_have_thai() -> String:
	for k in TH.FONT_FILES:
		var f := TH.font(k)
		if not f.has_char("ก".unicode_at(0)) and k != "mono":
			return "font %s has no Thai" % k
		if not f.has_char("A".unicode_at(0)):
			return "font %s did not load" % k
	return "ok"

# every rune a run can offer has its text in labels.json (generated from the web rnDesc)
func test_rune_texts() -> String:
	var desc: Dictionary = TH.labels().get("runeDesc", {})
	var miss := []
	for r in RR.rn_all():
		if str(desc.get(r["id"], "")).strip_edges() == "":
			miss.append(r["id"])
	return "ok" if miss.is_empty() else "no text for runes " + str(miss)

func test_art_tiles() -> String:
	for g in [["rune", "T1"], ["rune", "D"], ["ui", "gold"], ["scene", "shop-floor"], ["unit", "HL-1"]]:
		if TH.art(g[0], g[1]) == null:
			return "art missing %s/%s" % g
	return "ok" if TH.art("rune", "nope") == null else "unknown tile must give null"

func _app() -> Control:
	var app: Control = load("res://scenes/main.tscn").instantiate()
	app.set_meta("no_boot", true)
	(_opts["root"] as Window).add_child(app)
	app.build()
	return app

# name: blank / control characters only → error, no submit · a real name → submitted once, cleaned like JS rlName
func test_name_screen() -> String:
	var app := _app()
	var got := []
	var scr: Control = app.name_scr
	for c in scr.submitted.get_connections():
		scr.submitted.disconnect(c["callable"]) # keep the test away from user://prefs.json
	scr.submitted.connect(func(n: String) -> void: got.append(n))
	scr.open("")
	scr.input.text = "  \u200b "
	scr._submit()
	var err_ok: bool = scr.err.visible and got.is_empty()
	scr.input.text = "  นัท\u200b  เทส "
	scr._submit()
	app.queue_free()
	if not err_ok:
		return "blank name must show the error"
	return "ok" if got == ["นัท เทส"] else "submitted %s" % [got]

# offer popup actions = the ported core on the same state (take / flag tribe / reroll / skip)
func test_offer_actions() -> String:
	var app := _app()
	var chars: Array = R.game()["derived"]["characters"]
	var bad := ""
	for step in ["take", "reroll", "skip", "flag"]:
		app.start_new_run(777)
		app.P["rn"]["offer"] = null
		if step == "flag":
			app.P["rn"]["offer"] = {"kind": "win", "ids": ["T8", "T1", "T3"], "rr": 0.0}
		else:
			RR.rn_make_offer(app.P, "win")
		app.render()
		if not app.offer.visible:
			bad = "offer not shown (%s)" % step
			break
		var want: Dictionary = app.P.duplicate(true)
		match step:
			"take":
				SH.take_rune(want, 1, chars)
				app.offer.take.emit(1, null)
			"reroll":
				RR.rn_reroll_offer(want)
				app.offer.reroll.emit()
			"skip":
				RR.rn_skip_offer(want)
				app.offer.skip.emit()
			"flag":
				var t: String = RR.rn_flag_choices(want, T.make_char_map(chars))[2]
				SH.take_rune(want, 0, chars, {}, t)
				app.offer.flag_pick = 0
				app.render()
				if app.offer.find_child("FlagPick", true, false) == null:
					bad = "flag rune must open the tribe picker"
					break
				app.offer.take.emit(0, t)
		if JSON.stringify(app.P) != JSON.stringify(want):
			bad = "state after %s differs from the core" % step
			break
		if step != "reroll" and app.offer.visible:
			bad = "offer still open after %s" % step
			break
	app.queue_free()
	return "ok" if bad == "" else bad

# ---------- 7b: the prep / shop screen (set 197) ----------
const RL := preload("res://scripts/runlog.gd")
const SV := preload("res://scripts/save.gd")

func _app_tmp() -> Control:
	var app := _app()
	app.save_file = "user://test-save.json"
	app.log_file = "user://test-runlog.json"
	app.replays_file = "user://test-replays.json"
	app.history_file = "user://test-history.json"
	app.runcodes_file = "user://test-runcodes.json"
	return app

func _cleanup() -> void:
	for f in ["test-save.json", "test-runlog.json", "test-runlog_prev.json", "test-replays.json", "test-replays_prev.json", "test-history.json", "test-runcodes.json", "test-prefs.json"]:
		if FileAccess.file_exists("user://" + f):
			DirAccess.remove_absolute("user://" + f)

# a scripted run through the app commands = the same calls on the core (same state), the journal replays to it, the save reads back
func test_prep_scripted_run() -> String:
	var app := _app_tmp()
	var chars: Array = R.game()["derived"]["characters"]
	app.start_new_run(4242)
	var want := SH.new_run(chars, 4242.0)
	SH.start_round(want, chars)
	var b0 := {"at": "bench", "i": 0.0}
	var b1 := {"at": "bench", "i": 1.0}
	var f00 := {"at": "board", "row": 0.0, "lane": 0.0}
	app.do_buy(0, null)
	SH.buy(want, 0.0, null, chars)
	app.do_buy(1, b1)
	SH.buy(want, 1.0, b1, chars)
	app.do_move(b0, f00)
	SH.move(want, b0, f00, chars)
	app.do_lock(2)
	SH.toggle_lock(want, 2.0)
	app.do_reroll()
	SH.reroll(want, chars)
	app.do_sell(b1)
	SH.sell(want, b1, chars)
	app.do_move(f00, b1)
	SH.move(want, f00, b1, chars)
	var bad := ""
	if JSON.stringify(app.P) != JSON.stringify(want):
		bad = "state after the scripted run differs from the core"
	elif RL.rl_check(app.RLOG) != true:
		bad = "the journal is not valid"
	else:
		var rep: Dictionary = RL.rl_replay(app.RLOG, chars)
		var k := func(x: Dictionary) -> String: return JSON.stringify([x["gold"], x["round"], x["n"], x["uid"], x["hearts"], x["wins"], x["shop"], x["bench"], x["board"], x["rn"]])
		if float(rep["firstBad"]) >= 0.0 or k.call(rep["st"]) != k.call(app.P):
			bad = "the journal does not replay to the shown state (firstBad %s)" % rep["firstBad"]
	if bad == "":
		var txt: Variant = SV.load_text(app.save_file)
		var rd := SV.read_save(txt, app.cm, R.RULES(), app.data_hash)
		if rd["status"] != "ok":
			bad = "save after every action must read back: %s" % [rd]
		elif JSON.stringify(rd["save"]["P"]) != JSON.stringify(want):
			bad = "saved state is not the last state"
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# drag: shop → bench = buy · own unit → shop dock = sell · shop → shop refused · a refused action shows its reason (C1 line) · tap opens the card
func test_prep_drag_sell_msg() -> String:
	var app := _app_tmp()
	app.start_new_run(11)
	var prep: Control = app.prep
	var gold0 := float(app.P["gold"])
	var slot := -1
	for i in app.P["shop"].size():
		var id: Variant = app.P["shop"][i]["id"]
		if id != null and float(app.cm[id]["price"]) <= gold0:
			slot = i
			break
	var bad := ""
	if slot < 0:
		bad = "no affordable shop card on seed 11"
	else:
		var sref: Dictionary = prep.cells["s_%d" % slot].ref
		var sid: Variant = app.P["shop"][slot]["id"]
		if prep.cells["s_0"]._can_drop_data(Vector2.ZERO, {"ref": sref}):
			bad = "a shop card must not drop on the shop"
		prep.cells["n_2"]._drop_data(Vector2.ZERO, {"ref": sref})
		if bad == "" and (app.P["bench"][2] == null or app.P["bench"][2]["id"] != sid or float(app.P["gold"]) != gold0 - float(app.cm[sid]["price"])):
			bad = "drop shop → bench must buy into that slot"
		if bad == "" and not prep.cells["s_0"]._can_drop_data(Vector2.ZERO, {"ref": {"at": "bench", "i": 2.0}}):
			bad = "an own unit must be droppable on the shop (sell)"
		if bad == "":
			prep.tapped({"at": "bench", "i": 2.0}, prep.cells["n_2"])
			prep._place_card(prep.cells["n_2"], false)
			if not prep.card.visible or prep.card.find_child("CardSell", true, false) == null:
				bad = "tap on an own unit must open the card with a sell button"
		if bad == "":
			prep._dock_drop(Vector2.ZERO, {"ref": {"at": "bench", "i": 2.0}})
			if app.P["bench"][2] != null or float(app.P["gold"]) != gold0:
				bad = "drop on the dock must sell and give the price back"
		if bad == "":
			app.P["gold"] = 0.0
			var other := 0
			for i in app.P["shop"].size():
				if app.P["shop"][i]["id"] != null:
					other = i
					break
			app.do_buy(other, null)
			if not prep.msg_label.visible or not prep.msg_label.text.contains("เงินไม่พอ"):
				bad = "refused buy must show its reason on the message line (got '%s')" % prep.msg_label.text
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# a rune that must be worn → the rune popup opens right after taking it · wearing it through the picker = the core call
func test_prep_rune_popup() -> String:
	var app := _app_tmp()
	app.start_new_run(5)
	var chars: Array = R.game()["derived"]["characters"]
	var rid := ""
	for r in RR.rn_all():
		if RR.rn_needs_slot(r) and r.get("eff") != "flag":
			rid = r["id"]
			break
	if rid == "":
		app.queue_free()
		return "no rune that needs a slot"
	app.P["rn"]["offer"] = {"kind": "win", "ids": [rid], "rr": 0.0}
	app.render()
	app._on_take(0, null)
	var bad := ""
	if app.popups.kind != "rune" or not app.pop.visible:
		bad = "must-wear rune must open the rune popup (kind '%s')" % app.popups.kind
	elif app.pop.find_child("SlotPick_s", true, false) == null:
		bad = "rune popup has no unit picker"
	else:
		app.do_buy(0, null)
		app.do_move({"at": "bench", "i": 0.0}, {"at": "board", "row": 1.0, "lane": 1.0})
		var want: Dictionary = app.P.duplicate(true)
		RR.rn_place(want, rid, [1.0, 1.0], R.RULES())
		if app.P["board"][1][1] == null:
			bad = "setup: no unit on the board (cannot afford the first card?)"
		else:
			want = app.P.duplicate(true)
			RR.rn_place(want, rid, [1.0, 1.0], R.RULES())
			app.do_place_rune(rid, [1.0, 1.0], false)
			if JSON.stringify(app.P) != JSON.stringify(want) or RR.rn_wear(app.P, rid) != "ok":
				bad = "wearing through the app differs from the core"
	for k in ["runes", "tribes", "shop"]:
		if bad == "":
			app.popups.open(k)
			if not app.pop.visible or app.pop.find_child("Acts", true, false) == null:
				bad = "popup %s did not open" % k
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad


# ---------- 7c: the fight ----------
func _board_one(app: Control) -> void:
	app.do_buy(0, null)
	app.do_move({"at": "bench", "i": 0.0}, {"at": "board", "row": 0.0, "lane": 0.0})

# plays the picture to its end through advance() (what _process does each frame) · false = it never ended
func _play_out(app: Control) -> bool:
	for i in 4000:
		if app.battle.view.is_ended:
			return true
		app.battle.view.advance(100.0)
	return app.battle.view.is_ended

# every unit's HP on the picture after the last event = the simulate() result (the view applies events, never rules)
func _hp_match(app: Control, res: Dictionary) -> String:
	for ru in res["units"]:
		var v: Variant = app.battle.view.units.get(int(ru["uid"]))
		if v == null:
			return "unit %s missing on the picture" % ru["uid"]
		if absf(maxf(0.0, float(v["hp"])) - float(ru["hp"])) > 0.001 or bool(v["down"]) != bool(ru["down"]):
			return "unit %s: picture hp %s down %s, result hp %s down %s" % [ru["uid"], v["hp"], v["down"], ru["hp"], ru["down"]]
	return ""

func test_fight_flow() -> String:
	var app := _app_tmp()
	var chars: Array = R.game()["derived"]["characters"]
	app.start_new_run(4242)
	var bad := ""
	# an empty board needs a second press (web confirmEmpty)
	app._on_fight()
	if app.screen != "prep" or not app.confirm_empty:
		bad = "empty board: the first press must only ask to confirm"
	if bad == "":
		_board_one(app)
		var w0: float = app.P["wins"]
		var h0: float = app.P["hearts"]
		app._on_fight()
		if app.screen != "battle" or not app.battle.visible or app.prep.visible:
			bad = "fight did not open the battle screen"
		elif app.replays.size() != 1 or app.pending_end == null:
			bad = "the match was not counted at once (replays %d)" % app.replays.size()
		elif float(app.P["wins"]) + (h0 - float(app.P["hearts"])) != w0 + 1.0:
			bad = "exactly one of wins +1 / hearts −1 must happen"
		elif RL.rl_check(app.RLOG) != true:
			bad = "the journal after a fight is not valid"
	if bad == "":
		var rep: Dictionary = RL.rl_replay(app.RLOG, chars)
		var k := func(x: Dictionary) -> String: return JSON.stringify([x["gold"], x["round"], x["wins"], x["hearts"], x["board"], x["bench"], x["rn"]])
		if float(rep["firstBad"]) >= 0.0 or k.call(rep["st"]) != k.call(app.P):
			bad = "the journal (with the fight) does not replay to the shown state (firstBad %s)" % rep["firstBad"]
	if bad == "":
		var rd := SV.read_save(SV.load_text(app.save_file), app.cm, R.RULES(), app.data_hash)
		if rd["status"] != "ok":
			bad = "save after a fight must read back: %s" % [rd["status"]]
	if bad == "":
		var res: Dictionary = app.battle.view.result
		if not _play_out(app):
			bad = "the picture never reached its end event"
		elif not app.battle.result_box.visible:
			bad = "no outcome card at the end of the match"
		else:
			bad = _hp_match(app, res)
	if bad == "":
		var snap := JSON.stringify(app.P)
		app.watch_replay(0)
		if app.replay_mode == null or app.screen != "battle" or not app.battle.replay_tag.visible:
			bad = "replay did not open"
		else:
			app.battle.skip_now()
			bad = _hp_match(app, app.battle.view.result)
			if bad == "" and JSON.stringify(app.P) != snap:
				bad = "watching a replay changed the run"
	if bad == "":
		app._on_next() # leaves the replay
		if app.screen != "prep" or app.battle.visible:
			bad = "next after a replay must go back to the prep screen"
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# skip jumps to the result · auto-skip = every match opens already finished · speed + auto-skip are remembered
func test_fight_skip_prefs() -> String:
	var old: Variant = SV.load_text("user://prefs.json") # the test writes the real prefs file: put it back afterwards
	var app := _app_tmp()
	app.start_new_run(777)
	_board_one(app)
	app.set_auto_skip(true)
	app.set_speed(16)
	app._on_fight()
	var bad := ""
	if not app.battle.view.is_ended or not app.battle.result_box.visible:
		bad = "auto-skip must open the match already finished"
	else:
		bad = _hp_match(app, app.battle.view.result)
	if bad == "":
		app._load_prefs()
		if app.speed != 16 or not app.auto_skip:
			bad = "speed / auto-skip were not remembered (%s %s)" % [app.speed, app.auto_skip]
	if bad == "":
		app._on_next()
		if app.screen != "prep" and not bool(app.P.get("over", false)):
			bad = "next must open the next round"
	if old is String:
		SV.store_text("user://prefs.json", old)
	elif FileAccess.file_exists("user://prefs.json"):
		DirAccess.remove_absolute("user://prefs.json")
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# an unfinished offer blocks the fight · a rune that does nothing is warned once
func test_fight_guards() -> String:
	var app := _app_tmp()
	app.start_new_run(5)
	_board_one(app)
	app.P["rn"]["offer"] = {"kind": "win", "ids": ["x"], "rr": 0.0}
	app._on_fight()
	var bad := ""
	if app.screen != "prep" or app.pending_end != null:
		bad = "an open rune offer must block the fight"
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# ---------- set 199 (plan-set196 7d): result card · live pane · match details · run end ----------
const MX := preload("res://scripts/matchcalc.gd")
const RB := preload("res://scripts/runboss.gd")
const UI_CODE := "res://tests/golden/godot-ui-arun1.txt"

func _find_all(n: Node, nm: String, out: Array) -> Array:
	if String(n.name).begins_with(nm) or str(n.get_meta("tag", "")) == nm: # repeated rows carry a "tag" meta (a repeated sibling name becomes "@Class@12")
		out.append(n)
	for c in n.get_children():
		_find_all(c, nm, out)
	return out

# the result card shows the run state after the match (chips), the match's own facts (recap = result.units) and the match
# details numbers add up to what simulate() counted (dealt / taken per unit)
func test_result_card_details() -> String:
	var app := _app_tmp()
	app.start_new_run(4242)
	_board_one(app)
	app._on_fight()
	var bad := ""
	var res: Dictionary = app.battle.view.result
	if not (res["units"][0].get("ini") is Dictionary):
		bad = "the shown match must be the detailed one (ini / fin stats)"
	app.battle.skip_now()
	var S: Dictionary = R.RULES()["shop"]
	if bad == "" and not app.battle.result_box.visible:
		bad = "no result card"
	if bad == "":
		var w: Variant = app.last_result["winner"]
		var lost := R.js_seq(w, 1.0)
		var want_title := TH.ui_text("r_lose" if lost else "r_win" if R.js_seq(w, 0.0) else "r_draw")
		if app.battle.res_title.text != want_title:
			bad = "title %s, want %s" % [app.battle.res_title.text, want_title]
		elif app.battle.chip_wins.text != TH.ui_text("r_wins", {"w": R.js_num(float(app.P["wins"])), "n": R.js_num(float(S["winsToFinish"]))}):
			bad = "wins chip: " + app.battle.chip_wins.text
		elif not app.battle.chip_hearts.text.begins_with(R.js_num(float(app.P["hearts"]))) or app.battle.chip_hearts.text.contains("(") != lost:
			bad = "hearts chip: " + app.battle.chip_hearts.text
		elif app.battle.chip_gold_box.visible != (not lost and float(S["winBonus"]) > 0.0):
			bad = "win-bonus chip shown wrongly"
		elif app.battle.res_msgs.get_child_count() != mini(6, (app.pending_end["r"]["msgs"] as Array).size()):
			bad = "messages on the card do not match the match's messages"
	if bad == "":
		var us: Array = (res["units"] as Array).filter(func(u): return int(u["side"]) == 0 and float(u["dealt"]) > 0.0)
		var rows := _find_all(app.battle.recap, "RecapRow", [])
		if rows.size() != mini(3, us.size()):
			bad = "recap rows %d, want %d" % [rows.size(), mini(3, us.size())]
		elif not us.is_empty():
			us.sort_custom(func(a, b): return float(a["dealt"]) > float(b["dealt"]))
			var num: Label = rows[0].get_child(2)
			if num.text != app.battle.fmt_n(float(us[0]["dealt"])):
				bad = "recap top damage %s, want %s" % [num.text, app.battle.fmt_n(float(us[0]["dealt"]))]
	if bad == "" and app.battle.fmt_n(1234567.4) != "1,234,567":
		bad = "fmt_n: " + app.battle.fmt_n(1234567.4)
	# match details: per-unit totals = what the battle itself counted
	if bad == "":
		var m := MX.model(res)
		var owner := {}
		for u in m["units"]:
			owner[int(u["uid"])] = int(u["uid"])
		var sum := [0.0, 0.0]
		for u in m["units"]:
			sum[int(u["side"])] += m["per"][int(u["uid"])]["out_t"]
		if absf(sum[0] - m["tot"][0]) > 0.01 or absf(sum[1] - m["tot"][1]) > 0.01:
			bad = "match details: side totals do not add up"
		for ru in res["units"]:
			var p: Variant = m["per"].get(int(ru["uid"]))
			if bad != "" or p == null:
				continue
			if absf(float(p["in_t"]) - float(ru["taken"])) > 0.5:
				bad = "match details: unit %s took %s, the battle says %s" % [ru["uid"], p["in_t"], ru["taken"]]
			elif absf(float(p["out_t"]) - float(ru["dealt"])) > 0.5:
				bad = "match details: unit %s dealt %s, the battle says %s" % [ru["uid"], p["out_t"], ru["dealt"]]
	if bad == "":
		app.battle.details_pressed.emit()
		if app.popups.kind != "mx" or not app.pop.visible:
			bad = "the match details popup did not open"
		for tab in 4:
			if bad != "":
				break
			app.popups.mx_state["tab"] = tab
			app.popups.refresh()
			var rows := _find_all(app.pop, "MxRow", [])
			if rows.size() != MX.units_of(res).size():
				bad = "details tab %d: %d rows for %d units" % [tab, rows.size(), MX.units_of(res).size()]
		if bad == "":
			app.popups.mx_state["log_open"] = true
			app.popups.refresh()
			var lg := _find_all(app.pop, "MxLog", [])
			var all_lines: int = (lg[0] as Label).text.split("\n").size() if lg.size() == 1 else -1
			if all_lines != app.battle.view.log.size() or all_lines < 2:
				bad = "battle log: %d lines shown, the match has %d" % [all_lines, app.battle.view.log.size()]
			else:
				# a unit that is in some lines but not all of them (4 units fight here, so one exists)
				var uid := -1
				var own := 0
				for ru in res["units"]:
					var c: int = app.battle.view.log.filter(func(l): return (l["ids"] as Array).has(int(ru["uid"]))).size()
					if c > 0 and c < all_lines:
						uid = int(ru["uid"])
						own = c
				if uid < 0:
					bad = "battle log: no unit with only a part of the lines (cannot check the filter)"
				else:
					app.popups.mx_state["who"] = uid
					app.popups.refresh()
					var shown: int = (_find_all(app.pop, "MxLog", [])[0] as Label).text.split("\n").size()
					if shown != own:
						bad = "battle log filter: %d lines for one unit (want %d of %d)" % [shown, own, all_lines]
	if bad == "":
		app._on_next()
		if app.pop.visible or app.screen != "prep":
			bad = "next must close the details and go back to the shop"
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# tapping a unit in the fight opens its live details (state on the picture + start stats) · the same unit again / an empty cell closes it
func test_live_pane() -> String:
	var app := _app_tmp()
	app.start_new_run(4242)
	_board_one(app)
	app.set_speed(1, false)
	app._on_fight()
	app.battle.view.advance(2500.0)
	var bad := ""
	var mine: Variant = null
	for v in app.battle.view.units.values():
		if v["side"] == 0:
			mine = v
	if mine == null:
		bad = "no unit of yours on the picture"
	if bad == "":
		app.battle._on_unit_tapped(mine["uid"])
		var ttl := _find_all(app.battle.live, "LiveTitle", [])
		if not app.battle.live.visible or app.battle.view.picked == null:
			bad = "tap did not open the live pane"
		elif ttl.size() != 1 or not (ttl[0] as Label).text.contains(str(app.cm[mine["id"]]["name"])):
			bad = "live pane title does not name the unit"
		elif _find_all(app.battle.live, "LiveStats", []).size() != 1:
			bad = "live pane has no stats (the shown match must carry live stats)"
		elif not _find_all(app.battle.live, "LiveNow", [])[0].get_child(0).get_child(1).text.begins_with(str(int(maxf(0.0, mine["hp"])))):
			bad = "live HP is not the picture's HP"
	if bad == "":
		app.battle.skip_now() # the end of the match repaints the pane
		if app.battle.live.shown_ver != app.battle.view.ver:
			bad = "the live pane was not repainted at the end of the match"
	if bad == "":
		app.battle._on_unit_tapped(mine["uid"])
		if app.battle.live.visible or app.battle.view.picked != null:
			bad = "tapping the same unit again must close the pane"
		app.battle._on_unit_tapped(mine["uid"])
		app.battle._on_unit_tapped(-1)
		if bad == "" and app.battle.live.visible:
			bad = "tapping an empty cell must close the pane"
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# the last heart lost → run end screen (title, history entry, save gone) · run code by hand when there is no clipboard, and it
# reads back · replay from the run end comes back to it · a cleared run can go on with extra matches (journal still replays)
func test_run_end() -> String:
	var app := _app_tmp()
	var chars: Array = R.game()["derived"]["characters"]
	app.player_name = "ทดสอบ"
	app.clip_ok = false
	app.start_new_run(77)
	_board_one(app)
	app._on_fight() # match 1 (kept as a replay)
	app.battle.skip_now()
	app._on_next()
	if app.P["rn"].get("offer") is Dictionary:
		app._on_offer_skip()
	var bad := ""
	# force the end: one heart left, the second chance already used, an empty board loses at once
	app.P["hearts"] = 1.0
	app.P["sc"] = 1.0
	app.P["board"] = [[null, null], [null, null], [null, null]]
	app._on_fight()
	app._on_fight()
	if app.screen != "battle" or not bool(app.P["over"]):
		bad = "losing the last heart must end the run (over %s)" % [app.P["over"]]
	if bad == "":
		app.battle.skip_now()
		if app.battle.btn_next.text != TH.ui_text("n_end"):
			bad = "next button on the last match: " + app.battle.btn_next.text
		app._on_next()
		if bad == "" and (app.screen != "runEnd" or not app.run_end.visible or app.battle.visible or app.prep.visible):
			bad = "the run end screen did not open"
		elif bad == "" and app.run_end.title.text != TH.ui_text("end_lost"):
			bad = "run end title: " + app.run_end.title.text
		elif bad == "" and app.run_end.btn_extra.visible:
			bad = "extra matches offered on a lost run"
		elif bad == "" and FileAccess.file_exists(app.save_file):
			bad = "the save must be removed when the run is over"
		elif bad == "" and SV.read_history(SV.load_text(app.history_file)).size() != 1:
			bad = "the run must be in the history once"
		elif bad == "" and _find_all(app.run_end, "EndWatch", []).size() != app.replays.size():
			bad = "replay rows on the run end screen"
	if bad == "":
		app.run_end.copy_code.emit()
		var box := _find_all(app.pop, "RunCodeText", [])
		if app.popups.kind != "runcode" or box.size() != 1:
			bad = "no clipboard: the run code must open in a box"
		else:
			var code: String = (box[0] as TextEdit).text
			var rd := SV.parse_run_code(code, app.cm, R.RULES())
			if rd.has("error"):
				bad = "the run code does not read back: " + str(rd["error"])
			elif (rd["runs"] as Array).size() != 1 or (rd["runs"][0]["list"] as Array).size() != app.replays.size() or str(rd.get("nm", "")) != "ทดสอบ" or (rd["logs"] as Array).size() != 1:
				bad = "run code content: runs %d · logs %d · name %s" % [(rd["runs"] as Array).size(), (rd["logs"] as Array).size(), rd.get("nm")]
			elif DirAccess.dir_exists_absolute(ProjectSettings.globalize_path(UI_CODE.get_base_dir())):
				var f := FileAccess.open(UI_CODE, FileAccess.WRITE) # CI reads it with the JS Balance Room reader
				if f != null:
					f.store_string(code)
					f.close()
		app.popups.close()
	if bad == "":
		app.run_end.watch.emit(0)
		if app.screen != "battle" or app.replay_mode == null:
			bad = "replay from the run end did not open"
		else:
			app.battle.skip_now()
			app._on_next()
			if app.screen != "runEnd" or not app.run_end.visible:
				bad = "leaving a replay must come back to the run end screen"
	if bad == "":
		app.run_end.new_run.emit()
		if app.screen != "prep" or app.run_end.visible or bool(app.P["over"]) or float(app.P["round"]) != 1.0:
			bad = "new run from the run end screen"
	# a cleared run: extra matches
	if bad == "":
		var S: Dictionary = R.RULES()["shop"]
		app.start_new_run(78)
		_board_one(app)
		# the state right after the clearing win (set directly: which seed wins is not this test's business)
		app.P["wins"] = float(S["winsToFinish"])
		app.P["round"] = 9.0
		app.P["over"] = true
		app.clear_at = 123456.0
		SV.store_text(app.history_file, SV.js_json(SV.push_history([], SV.history_entry(app.P, app.stats, app.clear_at))))
		app.screen = "runEnd"
		app.render()
		if app.run_end.title.text != TH.ui_text("end_won", {"n": R.js_num(float(S["winsToFinish"]))}) or not app.run_end.btn_extra.visible or not app.run_end.extra_hint.visible:
			bad = "a cleared run must offer extra matches (title %s)" % app.run_end.title.text
		else:
			app.run_end.extra.emit()
			if app.screen != "prep" or not app.prep.visible or app.run_end.visible or bool(app.P["over"]) or not SH._truthy(app.P.get("extra")):
				bad = "extra matches did not continue the run"
			elif not FileAccess.file_exists(app.save_file) or SV.read_save(SV.load_text(app.save_file), app.cm, R.RULES(), app.data_hash)["status"] != "ok":
				bad = "the continued run must be saved again"
			elif not SV.read_history(SV.load_text(app.history_file)).is_empty():
				bad = "the cleared run's history entry must wait until the run really ends"
			elif app.RLOG["ev"][-2][0] != "ex" and app.RLOG["ev"][-1][0] != "ex" and app.RLOG["ev"][-3][0] != "ex":
				bad = "the journal has no 'ex' entry for the extra matches"
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# ---------- set 200 (plan-set196 7e) ----------
# a saved run opens the resume screen; เล่นต่อ = the same state (mid-round save → that round as it was, set 184) with its journal and replays;
# after a match (op false) เล่นต่อ starts the next round · a broken save → new run + notice · rename on the resume screen goes on the journal
func test_resume() -> String:
	var a1 := _app_tmp()
	a1.player_name = "ผู้ทดสอบ"
	a1.start_new_run(91)
	_board_one(a1)
	var want := SV.js_json(a1.P)
	var ev_n: int = (a1.RLOG["ev"] as Array).size()
	a1.queue_free()
	var app := _app_tmp()
	app.prefs_file = "user://test-prefs.json"
	app.player_name = "ผู้ทดสอบ"
	app.boot()
	var bad := ""
	if app.screen != "resume" or not app.resume_scr.visible or app.prep.visible:
		bad = "a saved run must open the resume screen (screen %s)" % app.screen
	elif app.resume_scr.info.text != TH.ui_text("rs_info_open", {"r": "1", "w": "0", "t": R.js_num(float(R.RULES()["shop"]["winsToFinish"])),
			"h": R.js_num(float(R.RULES()["shop"]["hearts"])), "g": R.js_num(float(app.resume_save["P"]["gold"])), "l": R.js_num(SH.lv_for_round(1.0))}):
		bad = "resume line: " + app.resume_scr.info.text
	if bad == "":
		app.resume_scr.rename.emit()
		if not app.name_scr.visible:
			bad = "rename on the resume screen must open the name screen"
		else:
			app._on_name("ชื่อใหม่")
			if not app.resume_scr.visible or app.name_scr.visible or app.resume_scr.player.text != TH.ui_text("player", {"n": "ชื่อใหม่"}):
				bad = "after rename the resume screen must come back with the new name"
	if bad == "":
		app.resume_scr.go.emit()
		if app.screen != "prep" or not app.prep.visible or app.resume_scr.visible:
			bad = "เล่นต่อ must open the prep screen"
		elif SV.js_json(app.P) != want:
			bad = "เล่นต่อ (mid-round save) must give the same state, not a new round"
		elif app.RLOG == null or (app.RLOG["ev"] as Array).size() != ev_n:
			bad = "the journal must be picked up again (it replays to the saved state)"
		elif str(app.RLOG.get("nm", "")) != "ชื่อใหม่":
			bad = "the new name must go on the run's journal"
	# after a match: the save has op false → เล่นต่อ starts the next round
	if bad == "":
		app._on_fight()
		app.battle.skip_now()
		var rnd := float(app.P["round"])
		var app2 := _app_tmp()
		app2.player_name = "x"
		app2.boot()
		if app2.screen != "resume" or not app2.resume_scr.info.text.begins_with(TH.ui_text("rs_info_closed", {"r": R.js_num(rnd + 1.0), "w": "", "t": "", "h": "", "g": "", "l": ""}).split(" · ")[0]):
			bad = "after a match the resume line must name the next round: " + app2.resume_scr.info.text
		else:
			app2.resume_scr.go.emit()
			if float(app2.P["round"]) != rnd + 1.0 or not SH._truthy(app2.P.get("op")):
				bad = "เล่นต่อ after a match must start round %s (got %s)" % [rnd + 1.0, app2.P["round"]]
		app2.queue_free()
	# a broken save: removed, new run, red notice
	if bad == "":
		SV.store_text(app.save_file, "{broken")
		var app3 := _app_tmp()
		app3.player_name = "x"
		app3.boot()
		if app3.screen != "prep" or float(app3.P["round"]) != 1.0 or app3.prep.msg_label.text.find(TH.ui_text("nt_save_bad")) < 0:
			bad = "a broken save must start a new run with the notice (msg %s)" % app3.prep.msg_label.text
		app3.queue_free()
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# ⋯ menu: new run asks twice (once the run is over, once) · Log / rename open · ? = symbols with every tribe + rarity · card คำศัพท์ = glossary
func test_menu_legend_gloss() -> String:
	var app := _app_tmp()
	app.prefs_file = "user://test-prefs.json"
	app.player_name = "x"
	app.start_new_run(93)
	var seed0 := float(app.P["seed"])
	var bad := ""
	app.prep.btn_menu.pressed.emit()
	if not app.prep.menu.visible:
		bad = "⋯ must open the menu"
	if bad == "":
		app.prep.menu_new.pressed.emit()
		if float(app.P["seed"]) != seed0 or app.prep.menu_new.text != TH.ui_text("menu_confirm"):
			bad = "the first press must only ask to confirm"
		else:
			app.prep.menu_new.pressed.emit()
			if float(app.P["seed"]) == seed0 or app.prep.menu.visible:
				bad = "the second press must start a new run and close the menu"
	if bad == "":
		app.prep.show_menu(true)
		app.prep._pick("rename")
		if not app.name_scr.visible:
			bad = "menu rename must open the name screen"
		else:
			app._on_name("ชื่อเมนู")
			if app.name_scr.visible or app.screen != "prep" or str(app.RLOG.get("nm", "")) != "ชื่อเมนู":
				bad = "rename from the menu must go back to the run and onto its journal"
	if bad == "":
		app.prep.btn_legend.pressed.emit()
		var t := _find_all(app.pop, "LegendTribes", [])
		var r := _find_all(app.pop, "LegendRarity", [])
		if app.popups.kind != "legend" or t.size() != 1 or t[0].get_child_count() != TH.TRIBE_SHAPE.size() or r.size() != 1 or r[0].get_child_count() != 5:
			bad = "symbols popup: every tribe and rarity"
	if bad == "":
		app.popups.close()
		app.do_buy(0, null)
		app.prep.tapped({"at": "bench", "i": 0.0}, app.prep.cells["bench:0"] if app.prep.cells.has("bench:0") else app.prep)
		var gl := _find_all(app.prep.card, "CardGloss", [])
		if gl.is_empty():
			bad = "the unit card has no คำศัพท์ button"
		else:
			(gl[0] as Button).pressed.emit()
			var lst := _find_all(app.pop, "GlossList", [])
			if app.popups.kind != "gloss" or lst.size() != 1 or lst[0].get_child_count() != (TH.labels()["tables"]["GLOSSARY"] as Array).size():
				bad = "คำศัพท์ must list the whole glossary"
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# Log (offline): a left run goes into runcodes.json with its own code · copy = one code per run on this game's values, newest first,
# each reads back with the Balance Room reader · a broken runcodes.json is ignored
func test_log_codes() -> String:
	var app := _app_tmp()
	app.player_name = "ล็อก"
	app.clip_ok = false
	app.start_new_run(95)
	_board_one(app)
	var at1 := float(app.RLOG["at"])
	app.start_new_run(96) # run 95 is left → archived
	_board_one(app)
	var bad := ""
	var rows: Array = app.log_rows()
	if rows.size() != 2:
		bad = "Log must list the left run and the live one (got %d)" % rows.size()
	elif float(rows[1]["at"]) != at1 or float(rows[1]["round"]) != 1.0 or bool(rows[1]["over"]):
		bad = "archived row: at %s round %s" % [rows[1]["at"], rows[1]["round"]]
	if bad == "":
		app._on_menu("log")
		var tbl := _find_all(app.pop, "LogList", [])
		if app.popups.kind != "log" or tbl.size() != 1 or tbl[0].get_child_count() != 8 * 3:
			bad = "Log popup table: header + 2 rows"
	if bad == "":
		app.copy_all_codes()
		var box := _find_all(app.pop, "LogAllOut", [])
		if box.size() != 1:
			bad = "no clipboard: the codes must open in a box"
		else:
			var codes := (box[0] as TextEdit).text.split("\n\n")
			if codes.size() != 2:
				bad = "2 codes expected, got %d" % codes.size()
			for c in codes:
				var rd := SV.parse_run_code(c, app.cm, R.RULES())
				if bad == "" and (rd.has("error") or (rd["logs"] as Array).size() != 1 or str(rd.get("nm", "")) != "ล็อก"):
					bad = "a Log code does not read back as one run: " + str(rd.get("error", ""))
	if bad == "":
		SV.store_text(app.runcodes_file, "[{\"at\":\"x\"},5,{broken")
		if app._read_runcodes().size() != 0:
			bad = "a broken runcodes.json must read as empty"
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# rune ทำนาย: the diff popup shows the next enemy as a mini board — every unit of next_foe() in its cell
func test_diff_foe_mini() -> String:
	var app := _app_tmp()
	app.player_name = "x"
	app.start_new_run(97)
	_board_one(app)
	app.P["rn"]["bag"]["X9"] = 1.0 # set 128: rune ทำนาย (scout)
	var bad := ""
	if not RR.rn_fx(app.P).get("scout", false):
		bad = "test setup: X9 must give scout"
	var foe: Variant = app.next_foe()
	if bad == "" and foe != null:
		app.popups.open("diff")
		var mini := _find_all(app.pop, "FoeMini", [])
		if mini.size() != 1:
			bad = "no enemy mini board with scout"
		else:
			for e in foe["team"]:
				var cell := _find_all(mini[0], "Fm%d%d" % [int(e["row"]), int(e["lane"])], [])
				var c: Dictionary = app.cm[e["id"]]
				if cell.size() != 1 or _find_text(cell[0], str(c["name"])) == false:
					bad = "enemy %s missing in its cell" % e["id"]
	app.popups.close()
	app.P["rn"]["bag"].erase("X9")
	app.popups.open("diff")
	if bad == "" and not _find_all(app.pop, "FoeMini", []).is_empty():
		bad = "no scout rune → text line, no mini board"
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

func _find_text(n: Node, t: String) -> bool:
	if n is Label and (n as Label).text == t:
		return true
	for c in n.get_children():
		if _find_text(c, t):
			return true
	return false

# 7f2 (set 202): the card shows what the held runes add at match start (web runeBonusAt) · merge targets of the open card get the gold frame ·
# a drag leaves the picked-up cell faint and a cancelled drag brings it back
func test_card_rune_merge_drag() -> String:
	var app := _app_tmp()
	app.start_new_run(7)
	var prep: Control = app.prep
	var ids := []
	for c in app.chars:
		if float(c["price"]) <= 3.0:
			ids.append(c["id"])
	var id: Variant = ids[0]
	var uid := 900.0
	for row in 3:
		for lane in 2:
			app.P["board"][row][lane] = {"uid": uid, "id": id, "level": 1.0, "perm": {}, "paid": 3.0}
			uid += 1.0
	app.P["uid"] = uid
	app.P["rn"]["bag"] = {"X5": 1.0} # ป้อมปราการ: front row HP +% · attack −%
	app.render()
	var bad := ""
	var hit: Variant = null
	for row in 3:
		for lane in 2:
			var rb: Variant = app.rune_bonus_at({"at": "board", "row": float(row), "lane": float(lane)})
			if rb is Dictionary and float(rb["maxHp"]) > 0.0 and float(rb["atk"]) < 0.0:
				hit = {"at": "board", "row": float(row), "lane": float(lane)}
	if hit == null:
		bad = "rune X5 must show HP + and attack − on a front unit (rune_bonus_at)"
	if bad == "" and app.rune_bonus_at({"at": "bench", "i": 0.0}) != null:
		bad = "bench units get no rune numbers (runes work on the board only)"
	if bad == "":
		prep.tapped(hit, prep.cells[prep._key(hit)])
		if prep.card.find_children("RuneAdd", "", true, false).size() < 2 or prep.card.find_child("AddKey", true, false) == null:
			bad = "the card of that unit must show the purple (+rune) numbers and the colour key"
	if bad == "":
		# every board unit is the same Lv1 kind → the open card's unit has merge targets → gold frames on the others
		var framed := 0
		for k in prep.cells:
			if prep.cells[k].mergeable:
				framed += 1
		if framed == 0 or prep.cells[prep._key(hit)].mergeable:
			bad = "open card of a mergeable unit must frame its merge targets in gold (not itself) · framed %d" % framed
	if bad == "":
		prep.tapped({"at": "bench", "i": 4.0}, prep.cells["n_4"]) # empty cell closes the card
		for k in prep.cells:
			if prep.cells[k].mergeable:
				bad = "closing the card must clear the gold frames"
				break
	if bad == "":
		var src: Control = prep.cells[prep._key(hit)]
		var m0: Color = src.modulate
		prep.drag_started(hit)
		if src.modulate.a > 0.5:
			bad = "the dragged cell must turn faint"
		prep.drag_ended()
		if bad == "" and src.modulate != m0:
			bad = "a cancelled drag must restore the cell"
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# set 207 P0 (owner bug after set 206): while dragging, only the cell under the pointer shows "drop ok";
# arena cells draw no 2D frame (the tile rim shows it); the picked-up unit's sprite is dimmed until drop / cancel
func test_drag_one_hover() -> String:
	var app := _app_tmp()
	app.start_new_run(4242)
	_board_one(app)
	app.prep.render()
	var prep: Control = app.prep
	var bad := ""
	var from := {"at": "board", "row": 0.0, "lane": 0.0}
	var data := {"ref": from}
	prep.drag_started(from)
	var spr: Variant = app.stage.unit("prep", "b_0_0")
	if spr == null or spr["spr"].modulate == Color.WHITE:
		bad = "the picked-up unit's sprite must dim while dragging"
	var a: Control = prep.cells["b_1_0"]
	var b: Control = prep.cells["b_2_1"]
	a._can_drop_data(Vector2.ZERO, data)
	b._can_drop_data(Vector2.ZERO, data)
	if bad == "" and (a.drop_ok or not b.drop_ok):
		bad = "only the last hovered cell may show drop ok (a %s · b %s)" % [a.drop_ok, b.drop_ok]
	if bad == "":
		var st: StyleBoxFlat = b.get_theme_stylebox("panel")
		if st != null and (st.border_width_top > 0 or st.draw_center and st.bg_color.a > 0.0):
			bad = "arena cells draw no 2D frame (the tile rim shows the state)"
	if bad == "":
		prep._unhover_if_left(Vector2(-500, -500))
		if b.drop_ok:
			bad = "leaving the cell (pointer elsewhere) must clear its drop ok"
	prep.drag_ended()
	if bad == "" and spr != null and spr["spr"].modulate != Color.WHITE:
		bad = "a cancelled drag must undim the sprite"
	for k in prep.cells:
		if bad == "" and prep.cells[k].drop_ok:
			bad = "no cell keeps drop ok after the drag (%s)" % k
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# set 207 (user B2): the prep layout lives in scenes/prep_layout.tscn (owner edits it in the Godot editor);
# the app loads it, and a part the owner deleted only disappears (stand-in), the screen still renders and plays
func test_prep_layout_scene() -> String:
	var ps: Variant = load("res://scenes/prep_layout.tscn")
	if not ps is PackedScene:
		return "scenes/prep_layout.tscn must exist (tools/make_prep_layout.gd)"
	var src := FileAccess.get_file_as_string("res://scenes/prep_layout.tscn")
	if src.contains("FontFile") or src.contains("ImageTexture") or src.contains("font_color"):
		return "the layout scene must not store fonts, icons or colours (light/dark come from metas)"
	var app := _app_tmp()
	app.start_new_run(4242)
	var bad := ""
	for nm in ["Top", "Field", "Tray", "Hud", "TribeCol", "Bench", "ShopOdds", "Reroll", "Dock", "Shop", "Fight"]:
		if bad == "" and app.prep.find_child(nm, true, false) == null:
			bad = "the loaded layout lost %s" % nm
	if bad == "" and app.prep.chip_gold.get_theme_color("font_color") != TH.c("gold-ink"):
		bad = "metas must colour the labels (gold chip)"
	# a copy with parts deleted
	var Prep := load("res://scripts/ui/prep.gd")
	var p2: Control = Prep.new()
	var lay: Control = p2.build_layout()
	for nm in ["Reroll", "TribeCol", "ShopOdds", "DiffBtn"]:
		var n: Node = lay.find_child(nm, true, false)
		n.get_parent().remove_child(n)
		n.free()
	p2.app = app
	p2.add_child(lay)
	p2._style_tree(lay)
	p2._bind(lay)
	p2.card = load("res://scripts/ui/unit_card.gd").new()
	p2.add_child(p2.card)
	p2._build_menu()
	p2.render()
	if bad == "" and (p2.btn_reroll.get_parent() != null or p2.tribe_col.get_parent() != null):
		bad = "deleted parts get stand-ins outside the tree"
	if bad == "" and p2.cells.size() != 6 + 5 + 5:
		bad = "cells are still made without those parts (%d)" % p2.cells.size()
	p2.free()
	app.queue_free()
	_cleanup()
	return "ok" if bad == "" else bad

# set 205 (user E1/A1) · set 206 (3D, C1): the shared arena camera move — pure helpers + the screens still hold their named parts
func test_arena_move() -> String:
	var AR := load("res://scripts/ui/arena.gd")
	if AR.ease_k(0.0) != 0.0 or AR.ease_k(1.0) != 1.0 or absf(AR.ease_k(0.5) - 0.5) > 0.0001 or AR.ease_k(2.0) != 1.0:
		return "ease_k must run 0 → 1, half at the middle, clamped"
	var inner := VBoxContainer.new()
	var h: Control = AR.hold(inner, "Top")
	AR.slide(h, 30.0)
	if inner.position.y != 30.0 or float(h.get_meta("dy")) != 30.0:
		h.free()
		return "slide must move the held part"
	h.free()
	var app := _app()
	var bad := ""
	if app.world == null or app.world.blocker.get_parent() != app or app.world.visible or app.world.blocker.visible:
		bad = "World + its blocker must be in the app and hidden while idle"
	elif app.zoom_s != 0.0:
		bad = "headless runs must move instantly (zoom_s 0)"
	elif app.prep.top_hold.name != "Top" or app.prep.tray_hold.name != "Tray" or app.prep.find_child("Board", true, false) == null \
			or app.prep.find_child("Bench", true, false) == null or app.prep.find_child("Dock", true, false) == null or app.prep.field.name != "Field":
		bad = "prep lost a named part (Top/Tray/Board/Bench/Dock/Field)"
	elif app.battle.field.name != "Field" or app.battle.top_hold.find_child("Clock", true, false) == null or app.battle.tray_hold.find_child("Skip", true, false) == null:
		bad = "battle lost a named part (Field / Clock in Top / Skip in Tray)"
	app.queue_free()
	return "ok" if bad == "" else bad

# set 206 (user A2/C1): the 3D arena — projection = Camera3D math, the fitted camera frames the board inside its target,
# prep pose shows your half (enemy off to the right), battle pose shows both; units become sprites; cells sit on projected slots
func test_stage3d() -> String:
	var ST := load("res://scripts/ui/stage3d.gd")
	var vp := Vector2(854, 480)
	var xf := Transform3D(ST.cam_basis(), Vector3(0, 9, 14))
	var fwd: Vector3 = -ST.cam_basis().z
	var mid: Vector2 = ST.project(xf.origin + fwd * 10.0, xf, vp)
	if mid.distance_to(vp / 2.0) > 0.01:
		return "a point straight ahead must land in the screen centre (%s)" % str(mid)
	var near: Vector2 = ST.project(ST.slot_pos(0, 0, 1), xf, vp)
	var far: Vector2 = ST.project(ST.slot_pos(0, 0, 0), xf, vp)
	if not (near.y > far.y):
		return "lane 1 (near) must draw below lane 0 (far)"
	if not (ST.project(ST.slot_pos(0, 2, 0), xf, vp).x < ST.project(ST.slot_pos(0, 0, 0), xf, vp).x):
		return "your back column must sit left of your front column"
	var tgt := Rect2(10, 60, 834, 300)
	var pr: Transform3D = ST.fit_pose(ST.side_points([0]), tgt, vp)
	var r: Rect2 = ST.rect_of(ST.side_points([0]), pr, vp)
	if not tgt.grow(1.5).encloses(r) or (absf(r.size.x - tgt.size.x) > 2.0 and absf(r.size.y - tgt.size.y) > 2.0):
		return "fit_pose must fill the target on one axis and stay inside it: %s in %s" % [str(r), str(tgt)]
	if pr.basis != ST.cam_basis():
		return "the camera never turns (angle A, user C1)"
	var foe: Rect2 = ST.rect_of(ST.side_points([1]), pr, vp)
	if foe.get_center().x < tgt.end.x:
		return "in the prep pose the enemy half sits right of your half, mostly past the board target: foe %s mine %s" % [str(foe), str(r)]
	var bt: Transform3D = ST.fit_pose(ST.side_points([0, 1]), tgt, vp)
	if not tgt.grow(1.5).encloses(ST.rect_of(ST.side_points([0, 1]), bt, vp)):
		return "the battle pose must hold both halves"
	if (bt.origin - ST.side_points([0, 1])[0]).length() <= (pr.origin - ST.side_points([0])[0]).length() * 0.9 and bt.origin.z <= pr.origin.z:
		return "the battle pose must stand farther back than the prep pose (dolly out)"
	var app := _app_tmp()
	var bad := ""
	app.start_new_run(4242)
	_board_one(app)
	app.prep.render()
	if app.stage == null or app.stage.get_parent() != app or app.stage.cam == null:
		bad = "the app must hold the Stage with its camera"
	elif app.stage.count("prep") != 1:
		bad = "one board unit = one sprite in the prep group (got %d)" % app.stage.count("prep")
	elif app.prep.cells["b_0_0"].find_child("Mon", true, false) == null or app.prep.cells["b_0_0"].find_child("TextureRect", true, false) != null:
		bad = "a board cell keeps badges only (the picture is the 3D sprite)"
	elif app.prep.cells["n_0"].stage_slot.size() != 0:
		bad = "bench cells stay 2D (no stage slot)"
	if bad == "":
		app.refit_stage()
		app.stage.set_k(0.0)
		var c0: Control = app.prep.cells["b_0_0"]
		var want: Rect2 = app.stage.slot_rect(0, 0, 0)
		if app.size.x > 4.0 and c0.get_global_rect().position.distance_to(want.position) > 1.0:
			bad = "the board cell must sit on its projected slot rect"
	if bad == "": # set 207 P1: prep pose = only your half; the enemy tiles rise in with the dolly
		if app.stage.foe_tiles.size() != 12 or app.stage.foe_tiles.any(func(it): return it[0].visible):
			bad = "at the prep pose the 6 enemy rims + 6 tiles must be hidden (%d)" % app.stage.foe_tiles.size()
		app.stage.set_k(1.0)
		if bad == "" and app.stage.foe_tiles.any(func(it): return not it[0].visible or absf(it[0].position.y - float(it[1])) > 0.0001):
			bad = "at the battle pose the enemy tiles stand in place"
		app.stage.set_k(0.0)
	if bad == "":
		app._on_fight()
		var n_battle: int = app.stage.count("battle")
		var n_units: int = app.battle.view.units.size()
		if n_battle != n_units or n_battle < 2:
			bad = "every battle unit (both sides) needs a sprite (%d sprites, %d units)" % [n_battle, n_units]
		elif app.stage.shown != "battle":
			bad = "the battle screen shows the battle group"
	app.queue_free()
	return "ok" if bad == "" else bad
