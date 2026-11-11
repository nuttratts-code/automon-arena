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
	return app

func _cleanup() -> void:
	for f in ["test-save.json", "test-runlog.json", "test-runlog_prev.json", "test-replays.json", "test-replays_prev.json", "test-history.json"]:
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
