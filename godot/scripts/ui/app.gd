# Set 196 (plan-set196 7a): the game app = web src/game/run (one page, screens + popups). Owns the run state P and the screens.
# 7a: name screen → new run · win rune offer popup · rotate notice in portrait.
# 7b (set 197): the prep / shop screen (prep.gd) + popups (popups.gd) · every action = J() journal + core call + messages + save, like the web
# J() / pushMsgs() / saveRun(). User pick: the run is saved after EVERY action (the web saved only at run start / rune actions / match end;
# a resume of a mid-round save re-opens that round as it was — P.op).
# Run rules come only from the ported core (shop.gd · runrunes.gd); this file never computes game rules itself.
# Player files: user://*.json only through save.gd store_text / load_text + JSON parse + type checks (HARD RULE 9 ③).
extends Control

const TH := preload("res://scripts/ui/theme.gd")
const R := preload("res://scripts/rules.gd")
const SH := preload("res://scripts/shop.gd")
const RR := preload("res://scripts/runrunes.gd")
const T := preload("res://scripts/team.gd")
const SV := preload("res://scripts/save.gd")
const RL := preload("res://scripts/runlog.gd")
const RB := preload("res://scripts/runboss.gd")
const BT := preload("res://scripts/botteams.gd")
const BOT := preload("res://scripts/bot.gd")
const RN := preload("res://scripts/runes.gd")
const Battle := preload("res://scripts/battle.gd")
const BattleScr := preload("res://scripts/ui/battle.gd")
const Prep := preload("res://scripts/ui/prep.gd")
const Pop := preload("res://scripts/ui/pop.gd")
const Popups := preload("res://scripts/ui/popups.gd")
const NameScreen := preload("res://scripts/ui/name_screen.gd")
const RuneOffer := preload("res://scripts/ui/rune_offer.gd")
const PREFS := "user://prefs.json"

var chars: Array = []
var cm: Dictionary = {}
var P: Variant = null # run state (shop.gd new_run shape) · null before the first run
var B: Variant = null # the bot's run state (kept in the save, web B)
var stats: Dictionary = {}
var started_at := 0.0
var RLOG: Variant = null # run journal (runlog.gd)
var data_hash := ""
var save_file := "user://save.json" # tests point these at their own files
var log_file := "user://runlog.json"
var msgs: Array = [] # newest first, max 5 (web msgs)
var confirm_empty := false # 7c: "ยืนยันสู้" two-step fight button
var speed := 4 # battle speed 1/2/4/8/16 · web default 4× · remembered in prefs.json
var auto_skip := false # every match jumps to its result (user pick set 198 B1: off by default)
var replays: Array = [] # this run's match replays (web replays) · saved to replays_file after every match
var replay_mode: Variant = null # {back, x} while a stored replay is shown (display only)
var pending_end: Variant = null # {r, w} of the match on screen: applied to the run already, shown at its end
var last_result: Variant = null
var dummy_dmg := 0.0
var clear_at := 0.0
var screen := "prep" # prep | battle (7d adds result / run end)
var replays_file := "user://replays.json"
var history_file := "user://history.json"
var confirm_runes := false
var player_name := ""
var pop: Control
var popups: RefCounted
var bg: ColorRect
var name_scr: Control
var prep: Control
var offer: Control
var battle: Control
var rotate_box: Control

var built := false

func _ready() -> void:
	build()

# builds every screen once (tests call it directly: under the headless runner the scene is not in a running tree yet)
func build() -> void:
	if built:
		return
	built = true
	TH.dark = bool(get_meta("force_dark", false)) or DisplayServer.is_dark_mode() # meta = tests/shots.gd only
	theme = TH.build()
	chars = R.game()["derived"]["characters"]
	cm = T.make_char_map(chars)
	bg = ColorRect.new()
	bg.color = TH.c("bg")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	data_hash = SV.data_hash(chars)
	prep = Prep.new()
	add_child(prep)
	prep.setup(self)
	prep.visible = false # shown by the first render() (the name screen comes first)
	prep.fight.connect(_on_fight)
	prep.open_runes.connect(func() -> void: popups.open("runes"))
	prep.open_tribes.connect(func() -> void: popups.open("tribes"))
	prep.open_diff.connect(func() -> void: popups.open("diff"))
	prep.open_replays.connect(func() -> void: popups.open("replays"))
	prep.clear_highlight.connect(func() -> void: set_highlight(null))
	pop = Pop.new()
	add_child(pop)
	popups = Popups.new(self, pop)
	battle = BattleScr.new()
	add_child(battle)
	battle.setup(self)
	battle.visible = false
	battle.next_pressed.connect(_on_next)
	battle.replay_pressed.connect(_on_replay_this)
	battle.speed_changed.connect(set_speed)
	battle.auto_skip_changed.connect(set_auto_skip)
	name_scr = NameScreen.new()
	name_scr.visible = false
	name_scr.submitted.connect(_on_name)
	add_child(name_scr)
	offer = RuneOffer.new()
	offer.visible = false
	offer.take.connect(_on_take)
	offer.reroll.connect(_on_offer_reroll)
	offer.skip.connect(_on_offer_skip)
	add_child(offer)
	rotate_box = _rotate_notice()
	add_child(rotate_box)
	if is_inside_tree():
		get_viewport().size_changed.connect(_on_resize)
		_on_resize()
	else:
		rotate_box.visible = false
	_load_prefs()
	if not has_meta("no_boot"): # tests/shots.gd drives the screens itself
		boot()

# web boot(): no name → ask first · (7e adds resume from the save)
func boot() -> void:
	if player_name == "":
		name_scr.open("")
		return
	name_scr.visible = false
	start_new_run(randi())

func start_new_run(seed: int) -> void:
	var sd := seed & 0xFFFFFFFF
	P = SH.new_run(chars, float(sd))
	B = SH.new_run(chars, float((sd ^ 0xA5A5A5A5) & 0xFFFFFFFF))
	msgs = []
	stats = SV.new_stats()
	started_at = floorf(Time.get_unix_time_from_system() * 1000.0)
	RLOG = RL.new_run_log(float(sd), data_hash, started_at, player_name)
	confirm_empty = false
	confirm_runes = false
	dummy_dmg = 0.0
	clear_at = 0.0
	pending_end = null
	replay_mode = null
	last_result = null
	_keep_prev(log_file, log_file.get_basename() + "_prev.json", '"ev":[[') # the last run's journal / replays stay for the run code (web set 105 / 109)
	_keep_prev(replays_file, replays_file.get_basename() + "_prev.json", '"list":[{')
	replays = []
	_save_replays()
	screen = "prep"
	battle.visible = false
	prep.hi_tribe = null
	prep.sel = null
	prep.card.visible = false
	save_run() # saved at the start (before the first shop round): leaving and coming back = a fresh round-1 shop
	begin_round()

# web beginRound(): startRound on the player AND on the bot state
func begin_round() -> void:
	push_msgs(J("st", [], func() -> Variant: return SH.start_round(P, chars)))
	SH.start_round(B, chars)
	render()

func render() -> void:
	if P == null:
		return
	if screen == "battle":
		return
	prep.visible = true
	prep.render()
	if popups.is_open():
		popups.refresh()
	if P.get("rn") is Dictionary and P["rn"].get("offer") is Dictionary and not bool(P.get("over", false)):
		offer.show_offer(P, cm)
	else:
		offer.visible = false

func _on_name(nm: String) -> void:
	player_name = nm
	_save_prefs()
	boot()

# prefs.json = {name, speed, autoSkip} · text only, parsed + checked (HARD RULE 9 ③) · a bad file = defaults
func _load_prefs() -> void:
	var s: Variant = SV.load_text(PREFS, 10000)
	var d: Variant = JSON.parse_string(s) if s is String else null
	player_name = ""
	if d is Dictionary:
		player_name = RL.rl_name(d.get("name"))
		var sp: Variant = d.get("speed")
		if sp is float or sp is int:
			if [1, 2, 4, 8, 16].has(int(sp)):
				speed = int(sp)
		auto_skip = d.get("autoSkip") == true

func _save_prefs() -> void:
	SV.store_text(PREFS, JSON.stringify({"name": player_name, "speed": speed, "autoSkip": auto_skip}))

func set_speed(v: int, save: bool = true) -> void:
	if not [1, 2, 4, 8, 16].has(v):
		return
	speed = v
	battle.set_speed_ui(v)
	if save:
		_save_prefs()

func set_auto_skip(on: bool, save: bool = true) -> void:
	auto_skip = on
	if save:
		_save_prefs()
	if on and screen == "battle" and battle.view.result != null and not battle.view.is_ended and replay_mode == null:
		battle.skip_now()

func _keep_prev(cur: String, prev: String, marker: String) -> void:
	var t: Variant = SV.load_text(cur)
	if t is String and (t as String).contains(marker):
		SV.store_text(prev, t)

func _save_replays() -> void:
	if P != null:
		SV.store_text(replays_file, SV.make_replays(P["seed"], data_hash, replays))

# ---------- the fight (web #fight click · set 198, plan 7c) ----------
func next_foe() -> Variant:
	return BT.pick_foe(BT.BOT_TEAMS(), float(R.js_i32(P.get("fp"))), P["round"], P["seed"], SH._truthy(P.get("extra")), null, {}, P.get("ls", 0.0), P.get("ws", 0.0))

# your team for a fight: runes equipped → {units, opts} · {error} when the team breaks a rule
func player_side(team_a: Array, runes: Array, streak: Variant) -> Dictionary:
	var bt: Variant = T.build_team(team_a, cm, R.RULES())
	if bt is Dictionary and bt.has("error"):
		return {"error": str(bt["error"])}
	var e := RN.equip_runes(bt as Array, RR.rn_from_compact(runes), {"winStreak": float(R.js_i32(streak))})
	return {"units": e["units"], "opts": {"tribeExtra": e["tribeExtra"]} if e["tribeExtra"].size() > 0 else {}}

# enemy side: a bot team (array) or a boss {boss, k, x?} · {error} for an unknown boss
func foe_units(b: Variant, d: Variant, round: Variant, fn: Array, fs: Variant) -> Dictionary:
	if b is Array:
		return BT.foe_side({"team": b, "pct": SV.replay_pct(d), "rn": fn, "s": float(R.js_i32(fs))}, cm, R.RULES(), null, round)
	var rec: Variant = RB.run_boss_by_id(b["boss"])
	if rec == null:
		return {"error": "ไม่พบบอส " + str(b["boss"])}
	return {"units": RB.run_boss_team(rec, float(b["k"]), null, b.get("x") == 1.0 or b.get("x") == 1), "opts": RB.run_boss_opts(rec)}

func _sim(ps: Dictionary, fo: Dictionary, extra: Dictionary) -> Dictionary:
	var o := {"rules": R.RULES()}
	o.merge(ps["opts"], true)
	o.merge(fo["opts"], true)
	o.merge(extra, true)
	return Battle.simulate(ps["units"], fo["units"], o)

# the screen's card data: a boss is not a character → add its card
func view_map(b: Variant) -> Dictionary:
	var rec: Variant = RB.run_boss_by_id(b["boss"]) if b is Dictionary else null
	if rec == null:
		return cm
	var m := cm.duplicate()
	m[rec["id"]] = RB.run_boss_char(rec, float(b["k"]), null, b.get("x") == 1.0 or b.get("x") == 1)
	return m

# plays the match again with detail + live stats (display only); the same teams must give the same result, else the plain one is shown
func show_result_of(team_a: Array, team_b: Variant, result: Dictionary, runes: Array, streak: Variant, d: Variant, round: Variant, fn: Array, fs: Variant) -> Dictionary:
	var ps := player_side(team_a, runes, streak)
	var fo := foe_units(team_b, d, round, fn, fs)
	if ps.has("error") or fo.has("error"):
		return result
	var r := _sim(ps, fo, {"detail": true, "live": true})
	return r if R.js_seq(r["winner"], result["winner"]) and float(r["timeMs"]) == float(result["timeMs"]) else result

func _on_fight() -> void:
	if bool(P.get("over", false)):
		return
	if P["rn"].get("offer") is Dictionary:
		say_err(TH.ui_text("m_offer_first"))
		render()
		return
	var entries := SH.team_entries(P)
	if entries.is_empty() and not confirm_empty:
		confirm_empty = true
		say_err(TH.ui_text("m_empty"))
		render()
		return
	var unworn := RR.rn_unworn(P)
	if not unworn.is_empty() and not confirm_runes and not entries.is_empty():
		confirm_runes = true
		var names := unworn.map(func(id): return str((RR.rn_rec(id) if RR.rn_rec(id) != null else {"name": id})["name"]))
		say_err(TH.ui_text("m_unworn", {"n": str(unworn.size()), "names": ", ".join(PackedStringArray(names))}))
		render()
		return
	confirm_empty = false
	confirm_runes = false
	var rb: Variant = RB.run_boss_at(P)
	var foe: Variant = null if rb != null else next_foe()
	if foe == null and rb == null:
		BOT.bot_shop(B, chars, R.RULES())
	var round: Variant = P["round"]
	var wins_before: Variant = P["wins"]
	var hearts_before: Variant = P["hearts"]
	var team_a := entries
	var team_b: Variant
	if rb != null:
		team_b = {"boss": rb["boss"]["id"], "k": rb["k"]}
		if SH._truthy(P.get("extra")):
			team_b["x"] = 1.0
	else:
		team_b = foe["team"] if foe != null else SH.team_entries(B)
	var runes := RR.rn_compact(P)
	var kind := "boss" if rb != null else "win"
	var streak: Variant = stats["streak"]
	var fd: Variant = foe["pct"] if foe != null else null
	var fr: Array = foe["rn"] if foe != null and foe.get("rn") is Array else []
	var fs: Variant = foe["s"] if foe != null else 0.0
	var ps := player_side(team_a, runes, streak)
	var fo := foe_units(team_b, fd, round, fr, fs)
	if ps.has("error") or fo.has("error"):
		say_err(str(ps.get("error", fo.get("error")))) # the core text: "ทีมไม่ถูกกฎ: …"
		render()
		return
	var result := _sim(ps, fo, {})
	last_result = result
	if rb != null and RB.is_dummy(rb["boss"]):
		dummy_dmg = RB.dummy_score(result)
	var shown := show_result_of(team_a, team_b, result, runes, streak, fd, round, fr, fs)
	# user pick (web set 22): the result counts the moment fight is pressed, then it is saved, before the picture plays
	var w: Variant = result["winner"]
	var won := not R.js_seq(w, 1.0)
	var gain := func(side: float) -> Array:
		return (result["perm"] as Array).filter(func(g): return float(g["side"]) == side) if result.get("perm") is Array else []
	var r: Dictionary = J("en", [1 if won else 0, 1 if rb != null else 0, RL.rl_gains(gain.call(0.0))], func() -> Variant: return SH.end_match(P, won, chars, R.RULES(), gain.call(0.0), rb != null))
	if foe == null and rb == null: # the live-bought bot (fallback) gets the same gold as the player
		SH.end_match(B, R.js_seq(w, 1.0), chars, R.RULES(), gain.call(1.0))
		B["over"] = false
		B["hearts"] = R.RULES()["shop"]["hearts"]
		B["lastWon"] = P["lastWon"]
	var msgs_out: Array = r["msgs"] if r.get("msgs") is Array else []
	if won and not bool(P.get("over", false)): # set 94: a win → pick 1 free rune
		var ofr: Variant = J("of", [kind], func() -> Variant: return RR.rn_make_offer(P, kind))
		if ofr == null:
			msgs_out.append(TH.ui_text("m_no_rune"))
	elif bool(r.get("second", false)) and not bool(P.get("over", false)): # set 119: second chance → a legend pick
		var of2: Variant = J("of", ["sc"], func() -> Variant: return RR.rn_make_offer(P, "sc"))
		if of2 == null:
			msgs_out.append(TH.ui_text("m_no_rune"))
	r["msgs"] = msgs_out
	SV.add_match_stats(stats, result)
	replays.append(SV.replay_entry(round, team_a, team_b, result, runes, streak, fd, fr, fs))
	_save_replays()
	pending_end = {"r": r, "w": w}
	replay_mode = null
	if bool(P.get("over", false)):
		clear_at = floorf(Time.get_unix_time_from_system() * 1000.0) if float(P["hearts"]) > 0.0 and not bool(P.get("extra", false)) else 0.0
		var now := floorf(Time.get_unix_time_from_system() * 1000.0)
		var hist := SV.push_history(SV.read_history(SV.load_text(history_file)), SV.history_entry(P, stats, clear_at if clear_at > 0.0 else now))
		SV.store_text(history_file, SV.js_json(hist))
		DirAccess.remove_absolute(save_file)
		save_run()
	else:
		save_run()
	popups.close()
	_show_battle(shown, view_map(team_b), _battle_title(rb, foe, round), [_rn_battle(runes), [] if rb != null else _rn_battle(fr)], false)

func _battle_title(rb: Variant, foe: Variant, round: Variant) -> String:
	if rb != null:
		return TH.ui_text("b_boss", {"b": str(rb["boss"]["name"]), "k": R.js_num(float(rb["k"]))})
	if foe != null:
		return TH.ui_text("b_foe", {"r": R.js_num(float(foe["round"]))})
	return TH.ui_text("b_match", {"r": R.js_num(float(round))})

# web rnBattle(): which rune names show where in a fight → {team: [names], slot: {"side:row:lane": [names]}} (side filled by the caller's list order)
func _rn_battle(list: Array) -> Dictionary:
	var team := []
	var slot := {}
	for e in RR.rn_from_compact(list):
		var r: Dictionary = e["r"]
		if RN.RUNE_RUN_ONLY().has(r.get("eff")):
			continue # money / shop runes do nothing in a fight
		var nm := str(r["name"]) + (" ×" + R.js_num(float(e["n"])) if float(R.js_or0(e.get("n"))) > 1.0 else "")
		if e["slot"] != null and RR.rn_needs_slot(r):
			var k := "%d:%d" % [int(e["slot"][0]), int(e["slot"][1])]
			slot[k] = (slot.get(k, []) as Array) + [nm]
		else:
			team.append(nm)
		if e["partner"] != null:
			var k2 := "%d:%d" % [int(e["partner"][0]), int(e["partner"][1])]
			slot[k2] = (slot.get(k2, []) as Array) + [nm + " (คู่)"]
	return {"team": team, "slot": slot}

func _show_battle(res: Dictionary, charmap: Dictionary, title: String, runes: Array, as_replay: bool) -> void:
	screen = "battle"
	prep.visible = false
	offer.visible = false
	prep.card.visible = false
	battle.visible = true
	# the slot keys carry no side yet: side 0 = your list, side 1 = the enemy's
	var full: Array = []
	for i in 2:
		var d: Dictionary = runes[i] if i < runes.size() and runes[i] is Dictionary else {"team": [], "slot": {}}
		var sl := {}
		for k in d["slot"]:
			sl["%d:%s" % [i, k]] = d["slot"][k]
		full.append({"team": d["team"], "slot": sl})
	battle.start(res, charmap, title, full, as_replay)
	if auto_skip and not as_replay:
		battle.skip_now()

func _on_replay_this() -> void:
	if battle.view.result == null:
		return
	battle.result_box.visible = false
	battle.replay_tag.visible = true
	battle.view.speed = float(speed)
	var res: Dictionary = battle.view.result
	battle.view.load_result(res, battle.view.cm)
	battle.view.play()

# the picture of a match ended: show the outcome card (7d: the full result screen)
func on_battle_finished() -> void:
	if replay_mode != null:
		var x: Dictionary = replay_mode["x"]
		battle.show_result(0 if R.js_seq(x["w"], 0.0) else 1 if R.js_seq(x["w"], 1.0) else 2,
			TH.ui_text("t_sec", {"t": "%.1f" % (float(x["t"]) / 1000.0)}), [], "", TH.ui_text("n_back"), true)
		return
	if pending_end == null:
		return
	var r: Dictionary = pending_end["r"]
	var w: Variant = pending_end["w"]
	var win := 0 if R.js_seq(w, 0.0) else 1 if R.js_seq(w, 1.0) else 2
	var sub := TH.ui_text("r_sub", {"r": R.js_num(float(P["round"])), "t": "%.1f" % (float(last_result["timeMs"]) / 1000.0)}) + (TH.ui_text("r_draw_win") if win == 2 else "")
	var offer_d: Variant = P["rn"].get("offer")
	var over := bool(P.get("over", false))
	var next_line := TH.ui_text("r_next_end") if over else TH.ui_text("r_next_offer", {"n": str((offer_d["ids"] as Array).size())}) if offer_d is Dictionary else TH.ui_text("r_next_prep")
	var next_text := TH.ui_text("n_end") if over else TH.ui_text("n_offer") if offer_d is Dictionary else TH.ui_text("n_prep")
	battle.show_result(win, sub, r.get("msgs", []), next_line, next_text, false)

# "next" on the outcome card (web #next): only once per finished match
func _on_next() -> void:
	if replay_mode != null:
		replay_mode = null
		screen = "prep"
		battle.visible = false
		render()
		return
	if pending_end == null:
		return
	pending_end = null
	battle.result_box.visible = false
	if bool(P.get("over", false)):
		say_err("สรุป run ยังไม่มีในเวอร์ชัน Godot นี้ (ขั้น 7d)") # run end summary = 7d
		return
	screen = "prep"
	battle.visible = false
	begin_round()

# web watchReplay(): plays a stored match again (display only) — it must replay to the same winner and time, else a notice
func watch_replay(i: int) -> void:
	if i < 0 or i >= replays.size():
		return
	var x: Dictionary = replays[i]
	var n: Array = x["n"] if x.get("n") is Array else []
	var fn: Array = x["fn"] if x.get("fn") is Array else []
	var ps := player_side(x["a"], n, x.get("g", 0.0))
	var fo := foe_units(x["b"], x.get("d"), x["r"], fn, x.get("fs", 0.0))
	var res: Variant = null
	if not ps.has("error") and not fo.has("error"):
		res = _sim(ps, fo, {})
	if res == null or not R.js_seq(res["winner"], x["w"]) or floorf(float(res["timeMs"])) != float(x["t"]):
		say_err(TH.ui_text("rep_bad", {"r": R.js_num(float(x["r"]))}))
		return
	popups.close()
	pending_end = null
	replay_mode = {"back": "prep", "x": x}
	var shown := show_result_of(x["a"], x["b"], res, n, x.get("g", 0.0), x.get("d"), x["r"], fn, x.get("fs", 0.0))
	_show_battle(shown, view_map(x["b"]), TH.ui_text("b_replay", {"r": R.js_num(float(x["r"]))}), [_rn_battle(n), _rn_battle(fn) if x["b"] is Array else []], true)

func say_info(t: String) -> void:
	if screen == "battle":
		battle.tick.text = t # the prep message line is hidden during a fight: the ticker line carries it
		battle.tick_cur = t
	else:
		push_msgs({"ok": true, "msgs": [t]})

# ---------- journal + save (web J() · saveRun()) ----------
# runs fn on P, and writes one journal entry (gold before → after) when it worked or changed anything
func J(type: String, args: Array, fn: Callable) -> Variant:
	var g0: Variant = P["gold"]
	var snap: String = SV.js_json(P) if RLOG != null else ""
	var r: Variant = fn.call()
	if RLOG != null and (type == "of" or (r is Dictionary and bool(r.get("ok", false))) or SV.js_json(P) != snap):
		RL.rl_push(RLOG, type, args, g0, P["gold"], floorf(Time.get_unix_time_from_system() * 1000.0))
	return r

func save_run() -> void:
	if P == null:
		return
	if not bool(P.get("over", false)):
		SV.store_text(save_file, SV.make_save(P, B, stats, started_at, data_hash))
	if RLOG != null:
		SV.store_text(log_file, SV.js_json(RLOG))

# web pushMsgs(): ok → its messages · refused → its reason (shown longer, red)
func push_msgs(r: Variant) -> void:
	if not (r is Dictionary):
		return
	var ok := bool(r.get("ok", false))
	var add: Array = (r.get("msgs", []) as Array).duplicate() if ok else [str(r.get("msg", ""))]
	if add.is_empty():
		return
	var rev := add.duplicate()
	rev.reverse()
	rev.append_array(msgs)
	msgs = rev.slice(0, 5)
	prep.show_msg(add.slice(maxi(0, add.size() - 3)), not ok)

func say_err(t: String) -> void:
	push_msgs({"ok": false, "msg": t})

# one finished action: message + save + redraw
func _done(r: Variant) -> Variant:
	push_msgs(r)
	confirm_empty = false
	confirm_runes = false
	save_run()
	render()
	return r

# ---------- commands (web doBuy / doSell / act / reroll / lock / runes) ----------
static func rf(ref: Variant) -> String:
	return RL.rl_ref(ref)

func do_buy(slot: int, dest: Variant) -> Variant:
	return _done(J("by", [slot, rf(dest)], func() -> Variant: return SH.buy(P, float(slot), dest, chars)))

func do_buy_merge(slot: int, to: Dictionary) -> Variant:
	return _done(J("bm", [slot, rf(to)], func() -> Variant: return SH.buy_merge(P, float(slot), to, chars)))

func do_sell(ref: Dictionary) -> Variant:
	return _done(J("sl", [rf(ref)], func() -> Variant: return SH.sell(P, ref, chars)))

func do_move(from: Dictionary, to: Dictionary) -> Variant:
	return _done(J("mv", [rf(from), rf(to)], func() -> Variant: return SH.move(P, from, to, chars)))

func do_reroll() -> Variant:
	return _done(J("rr", [], func() -> Variant: return SH.reroll(P, chars)))

func do_lock(slot: int) -> Variant:
	return _done(J("lk", [slot], func() -> Variant: return SH.toggle_lock(P, float(slot))))

func do_heart_trade() -> Variant:
	return _done(J("ht", [], func() -> Variant: return RR.rn_heart_trade(P)))

# slot = [row, lane] on the board, or null = not worn
func do_place_rune(id: String, slot: Variant, partner: bool) -> Variant:
	var sref := "-"
	if slot is Array:
		sref = rf({"at": "board", "row": slot[0], "lane": slot[1]})
	return _done(J("pl", [id, sref, 1 if partner else 0], func() -> Variant: return RR.rn_place(P, id, slot, R.RULES(), partner)))

func open_shop_pop() -> void:
	popups.open("shop")

func set_highlight(t: Variant) -> void:
	prep.hi_tribe = t
	render()

func run_boss_at() -> Variant:
	return RB.run_boss_at(P)

# names of the runes a unit wears (web runesOn): partner runes get " (คู่)"
func runes_on(u: Dictionary) -> Array:
	var out := []
	for id in P["rn"]["bag"]:
		for pr in [[RR.rn_unit_of(P, id), ""], [RR.rn_unit_of(P, id, true), " (คู่)"]]:
			if pr[0] != null and is_same(pr[0], u):
				var rec: Variant = RR.rn_rec(id)
				out.append((str(rec["name"]) if rec is Dictionary else str(id)) + pr[1])
	return out

# ---------- the win rune offer (7a) ----------
func _on_take(i: int, tribe: Variant) -> void:
	if i < 0: # flag rune: open / leave the tribe picker
		render()
		return
	var ids: Array = P["rn"]["offer"]["ids"]
	var id: Variant = ids[i] if i < ids.size() else null
	var args: Array = [i] if tribe == null else [i, tribe]
	var r: Variant = _done(J("tk", args, func() -> Variant: return SH.take_rune(P, float(i), chars, {}, tribe)))
	# a rune that must be worn → open it right away to pick the unit (web set 109)
	if r is Dictionary and bool(r.get("ok", false)) and id != null and RR.rn_wear(P, id) != "ok":
		popups.open("rune", id)

func _on_offer_reroll() -> void:
	_done(J("or", [], func() -> Variant: return RR.rn_reroll_offer(P)))

func _on_offer_skip() -> void:
	_done(J("sk", [], func() -> Variant: return RR.rn_skip_offer(P)))

# web #rotate: portrait phone → "turn the phone sideways" over everything
func _rotate_notice() -> Control:
	var box := ColorRect.new()
	box.name = "Rotate"
	box.color = TH.c("bg")
	box.set_anchors_preset(Control.PRESET_FULL_RECT)
	box.mouse_filter = Control.MOUSE_FILTER_STOP
	var cc := CenterContainer.new()
	cc.set_anchors_preset(Control.PRESET_FULL_RECT)
	box.add_child(cc)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	var phone := Panel.new()
	phone.custom_minimum_size = Vector2(120, 70)
	phone.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	phone.add_theme_stylebox_override("panel", TH.box(Color(0, 0, 0, 0), TH.c("ink"), 8, 3))
	v.add_child(phone)
	# only shown in portrait, where the 854-px-wide base is shrunk to ~0.46 → big logical sizes (≈ 18 / 12 px on a 390-px phone)
	for p in [[TH.ui_text("rotate"), 40, "ink", "display"], [TH.ui_text("rotate_hint"), 27, "mute", "body"]]:
		var l := TH.label(p[0], p[1], p[2], p[3])
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(l)
	cc.add_child(v)
	return box

func _on_resize() -> void:
	var s := get_viewport().get_visible_rect().size
	rotate_box.visible = s.y > s.x
	if offer.visible:
		render()
