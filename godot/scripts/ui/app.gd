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
const RunEnd := preload("res://scripts/ui/run_end.gd")
const Resume := preload("res://scripts/ui/resume.gd")
const Arena := preload("res://scripts/ui/arena.gd")
const Stage3D := preload("res://scripts/ui/stage3d.gd")
var prefs_file := "user://prefs.json" # tests point it at their own file

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
var screen := "prep" # prep | battle | runEnd | resume
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
var run_end: Control
var clip_ok := true # tests switch the clipboard off to reach the "copy by hand" box
var last_code := "" # the last run code handed to the clipboard (tests read it)
var rotate_box: Control
var resume_scr: Control
var resume_save: Variant = null # the save read by boot(), waiting for เล่นต่อ / เริ่ม run ใหม่
var name_then: Variant = null # Callable after the name screen (rename from the resume / run end screen or the menu)
var runcodes_file := "user://runcodes.json" # set 200 (7e, user A1): this device's last 60 runs as ARUN1 codes (the offline Log)
var log_msg := "" # Log popup: message after "copy 60 runs"
var log_box := "" # Log popup: the codes in a box when there is no clipboard
const RUNCODES_MAX := 60

var stage: Node3D # set 206: the 3D arena (floor, light, camera, unit sprites) under prep + battle
var world: Control # set 205: the shared arena (camera move between prep and battle)
var zoom_s := 0.0 if DisplayServer.get_name() == "headless" else 0.6 # seconds of the move · 0 = instant (headless tests, shots.gd)
var built := false

func _ready() -> void:
	build()

# builds every screen once (tests call it directly: under the headless runner the scene is not in a running tree yet)
func build() -> void:
	if built:
		return
	built = true
	TH.dark = bool(get_meta("force_dark", false)) or (DisplayServer.is_dark_mode() and not bool(get_meta("force_light", false))) # metas = tests/shots.gd only
	theme = TH.build()
	chars = R.game()["derived"]["characters"]
	cm = T.make_char_map(chars)
	bg = ColorRect.new()
	bg.color = TH.c("bg")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	stage = Stage3D.new()
	stage.build()
	add_child(stage)
	stage.moved.connect(_place_cells)
	if Stage3D.S217_CLEAN and not TH.dark: # set 217 sample R19 (owner L1 + L4): HD-2D screen pass over the 3D, under the UI
		add_child(preload("res://scripts/ui/s217_hd2d.gd").new())
	world = Arena.new()
	world.app = self
	add_child(world) # under every screen: it draws only while the camera moves
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
	prep.open_legend.connect(func() -> void: popups.open("legend"))
	prep.menu_pick.connect(_on_menu)
	pop = Pop.new()
	popups = Popups.new(self, pop)
	battle = BattleScr.new()
	add_child(battle)
	battle.setup(self)
	battle.view.stage = stage # set 206: the battle units stand on the 3D arena
	battle.visible = false
	battle.next_pressed.connect(_on_next)
	battle.replay_pressed.connect(_on_replay_this)
	battle.speed_changed.connect(set_speed)
	battle.auto_skip_changed.connect(set_auto_skip)
	battle.details_pressed.connect(func() -> void: popups.open("mx"))
	run_end = RunEnd.new()
	add_child(run_end)
	run_end.setup(self)
	run_end.visible = false
	run_end.new_run.connect(func() -> void: start_new_run(randi()))
	run_end.extra.connect(_on_extra)
	run_end.copy_code.connect(copy_run_code)
	run_end.watch.connect(watch_replay)
	run_end.rename.connect(func() -> void: ask_name(func() -> void: render()))
	resume_scr = Resume.new()
	resume_scr.visible = false
	resume_scr.go.connect(_on_resume_go)
	resume_scr.new_run.connect(func() -> void:
		resume_save = null
		resume_scr.visible = false
		start_new_run(randi()))
	resume_scr.copy_code.connect(copy_run_code)
	resume_scr.rename.connect(func() -> void: ask_name(func() -> void:
		resume_scr.set_player(player_name)
		resume_scr.visible = true))
	add_child(resume_scr)
	add_child(pop) # above every screen: match details open over the battle, the run code box over the run end
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
	add_child(world.blocker) # over every screen while the camera moves
	prep.visibility_changed.connect(_sync_stage)
	battle.visibility_changed.connect(_sync_stage)
	prep.field.resized.connect(func() -> void: refit_stage.call_deferred())
	battle.field.resized.connect(func() -> void: refit_stage.call_deferred())
	_sync_stage()
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

# web boot(): no name → ask first · a saved run → the resume screen (7e) · a save on other game values / broken → removed, new run + notice
func boot() -> void:
	if player_name == "":
		name_scr.open("")
		return
	name_scr.visible = false
	var r := SV.read_save(SV.load_text(save_file, SV.SAVE_MAX_CHARS * 4), cm, R.RULES(), data_hash)
	if r["status"] == "ok":
		resume_save = r["save"]
		var o: Dictionary = resume_save["P"]
		var S: Dictionary = R.RULES()["shop"]
		var open := SH._truthy(o.get("op")) # set 184: saved while the shop round was open → that round as it was (no second startRound)
		var rnd := float(o["round"]) if open else float(o["round"]) + 1.0
		var info := TH.ui_text("rs_info_open" if open else "rs_info_closed", {"r": R.js_num(rnd), "w": R.js_num(float(o["wins"])), "t": R.js_num(float(S["winsToFinish"])),
			"h": R.js_num(float(o["hearts"])), "g": R.js_num(float(o["gold"])), "l": R.js_num(SH.lv_for_round(rnd))})
		screen = "resume"
		prep.visible = false
		battle.visible = false
		run_end.visible = false
		offer.visible = false
		resume_scr.open(info, player_name)
		return
	if r["status"] != "none":
		_del(save_file)
	start_new_run(randi())
	if r["status"] == "data":
		say_err(TH.ui_text("nt_save_data"))
	elif r["status"] == "bad":
		say_err(TH.ui_text("nt_save_bad"))

static func _del(path: String) -> void:
	if path.begins_with("user://") and FileAccess.file_exists(path):
		DirAccess.remove_absolute(path)

# web #resumeGo: the saved run · its replays (this run only) · its journal when it rebuilds the saved state exactly (else unlogged, never a wrong log)
func _on_resume_go() -> void:
	if resume_save == null:
		return
	var o: Dictionary = resume_save
	resume_save = null
	P = o["P"]
	B = o["B"]
	stats = o["stats"]
	started_at = float(o["startedAt"])
	msgs = []
	confirm_empty = false
	confirm_runes = false
	pending_end = null
	replay_mode = null
	last_result = null
	var rp := SV.read_replays(SV.load_text(replays_file), cm, R.RULES(), data_hash, P["seed"])
	replays = rp["list"]
	if rp["status"] != "ok":
		_save_replays()
	RLOG = resume_log()
	if RLOG != null and player_name != "" and str(RLOG.get("nm", "")) != player_name: # set 110: renamed on the resume screen
		RLOG["nm"] = player_name
		save_run()
	resume_scr.visible = false
	screen = "prep"
	prep.hi_tribe = null
	prep.sel = null
	prep.card.visible = false
	if SH._truthy(P.get("op")):
		render()
	else:
		begin_round()
	if rp["status"] == "data":
		say_err(TH.ui_text("nt_rep_data"))
	elif rp["status"] == "bad":
		say_err(TH.ui_text("nt_rep_bad"))

# web resumeLog(): the saved journal must replay to exactly the saved state
func resume_log() -> Variant:
	var t: Variant = SV.load_text(log_file)
	if not (t is String) or SV.js_len(t) > SV.RUN_CODE_MAX:
		return null
	var p := SV.js_parse(t)
	if not p["ok"]:
		return null
	var o: Variant = p["v"]
	if not R.js_seq(RL.rl_check(o), true) or not R.js_seq(o.get("seed"), P["seed"]) or not R.js_seq(o.get("data"), data_hash):
		return null
	var r := RL.rl_replay(o, chars, {}, false)
	var k := func(x: Dictionary) -> String: return SV.js_json([x["gold"], x["round"], x["n"], x["uid"], x["hearts"], x["wins"], x["shop"], x["bench"], x["board"], x["rn"]])
	return o if int(r["firstBad"]) < 0 and k.call(r["st"]) == k.call(P) else null

# web askName(then) / setName(): the name goes on this run's journal too
func ask_name(then: Variant) -> void:
	name_then = then
	popups.close()
	name_scr.open(player_name)

# ⋯ menu (web #menu: เริ่ม run ใหม่ · Godot adds Log · rename · credits)
func _on_menu(k: String) -> void:
	match k:
		"new":
			start_new_run(randi())
		"log":
			log_msg = ""
			log_box = ""
			popups.open("log")
		"rename":
			ask_name(func() -> void: render())
		"credits":
			_open_credits()

# credits screen = plan-set196 7f1 (scripts/ui/credits.gd, another chat): opened only when that file exists
func _open_credits() -> void:
	const CREDITS := "res://scripts/ui/credits.gd"
	if not ResourceLoader.exists(CREDITS):
		return
	var c: Control = load(CREDITS).new()
	add_child(c)
	if c.has_signal("closed"):
		c.closed.connect(func() -> void: c.queue_free())

# ---------- offline Log (set 200, user A1): one ARUN1 code per finished / left run on this device, newest first, max 60 ----------
# runcodes.json = [{at, upd, data, nm, round, wins, hearts, gold, over, code}] · our own file but still read as untrusted (shape + size checked)
func _read_runcodes() -> Array:
	var t: Variant = SV.load_text(runcodes_file)
	if not (t is String):
		return []
	var p := SV.js_parse(t)
	if not p["ok"] or not (p["v"] is Array):
		return []
	var out := []
	for x in p["v"]:
		if x is Dictionary and SV.sv_int_in(x.get("at"), 0, 1e15) and SV.sv_int_in(x.get("upd"), 0, 1e15) and x.get("data") is String and x.get("code") is String \
				and (x["code"] as String).begins_with(SV.RUN_CODE_TAG + " ") and SV.js_len(x["code"]) <= SV.RUN_CODE_MAX and x.get("nm", "") is String:
			for k in ["round", "wins", "hearts", "gold"]:
				if not SV.sv_int_in(x.get(k), -1e9, 1e9):
					x[k] = 0.0
			x["over"] = x.get("over") == true
			out.append(x)
	return out.slice(0, RUNCODES_MAX)

# a run's journal (+ its replays) → one Log row with its own run code · null when the journal is empty / unreadable
func _run_entry(log_text: Variant, rep_text: Variant) -> Variant:
	if not (log_text is String):
		return null
	var p := SV.js_parse(log_text)
	if not p["ok"] or not R.js_seq(RL.rl_check(p["v"]), true) or (p["v"]["ev"] as Array).is_empty():
		return null
	var L: Dictionary = p["v"]
	var code: Variant = SV.make_run_code([rep_text, ""], null, str(L["data"]), floorf(Time.get_unix_time_from_system() * 1000.0), R.RULES(), [log_text, ""], str(L.get("nm", "")))
	if not (code is String):
		return null
	var st: Dictionary = RL.rl_replay(L, chars, {}, false)["st"] if str(L["data"]) == data_hash else {}
	var last: Array = L["ev"][L["ev"].size() - 1]
	return {"at": float(L["at"]), "upd": float(L["at"]) + float(last[1]) * 1000.0, "data": str(L["data"]), "nm": str(L.get("nm", "")),
		"round": float(st.get("round", 0.0)), "wins": float(st.get("wins", 0.0)), "hearts": float(st.get("hearts", 0.0)), "gold": float(st.get("gold", 0.0)),
		"over": SH._truthy(st.get("over")), "code": code}

# called when a new run starts: the run on log_file goes into runcodes.json (whole file kept under the store cap)
func archive_run() -> void:
	var e: Variant = _run_entry(SV.load_text(log_file), SV.load_text(replays_file))
	if e == null:
		return
	var list := _read_runcodes().filter(func(x): return float(x["at"]) != float(e["at"]))
	list.push_front(e)
	list = list.slice(0, RUNCODES_MAX)
	var text := SV.js_json(list)
	while list.size() > 1 and text.to_utf8_buffer().size() > SV.STORE_MAX_BYTES - 100000:
		list.pop_back()
		text = SV.js_json(list)
	SV.store_text(runcodes_file, text)

# Log rows: the run being played (live) + the archived ones, newest save first
func log_rows() -> Array:
	var rows := _read_runcodes()
	if RLOG != null and P != null:
		var cur: Variant = _run_entry(SV.load_text(log_file), SV.load_text(replays_file))
		if cur != null:
			rows = rows.filter(func(x): return float(x["at"]) != float(cur["at"]))
			rows.push_front(cur)
	rows.sort_custom(func(a, b): return float(a["upd"]) > float(b["upd"]))
	return rows.slice(0, RUNCODES_MAX)

func when_th(ms: float) -> String:
	var d := Time.get_datetime_dict_from_unix_time(int(ms / 1000.0) + int(Time.get_time_zone_from_system().get("bias", 0)) * 60)
	return "%d/%d/%d %02d:%02d" % [d["day"], d["month"], d["year"] + 543, d["hour"], d["minute"]]

# web lgCopyAll(): the newest 60 runs on THIS game's values, one ARUN1 code each, blank line between (Balance Room ดูผล → ผู้เล่นจริง)
func copy_all_codes() -> void:
	var codes := []
	for h in log_rows():
		if h["data"] == data_hash:
			codes.append(h["code"])
	log_box = ""
	if codes.is_empty():
		log_msg = TH.ui_text("log_none")
		popups.refresh()
		return
	var text := "\n\n".join(PackedStringArray(codes))
	var note := TH.ui_text("log_n", {"n": str(codes.size())})
	last_code = text
	if clip_ok and DisplayServer.has_feature(DisplayServer.FEATURE_CLIPBOARD):
		DisplayServer.clipboard_set(text)
		log_msg = TH.ui_text("log_done", {"x": note})
	else:
		log_box = text
		log_msg = TH.ui_text("log_box", {"x": note})
	popups.refresh()

func start_new_run(seed: int) -> void:
	archive_run() # the run on log_file (finished or left) → the offline Log (set 200)
	resume_save = null
	resume_scr.visible = false
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
	run_end.visible = false
	popups.close()
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
	if screen == "battle" or screen == "resume":
		return
	if screen == "runEnd":
		prep.visible = false
		offer.visible = false
		run_end.visible = true
		run_end.render()
		if popups.is_open():
			popups.refresh()
		return
	run_end.visible = false
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
	if RLOG != null: # a rename during a run goes on this run's journal too (web setName)
		RLOG["nm"] = nm
		save_run()
	name_scr.visible = false
	var f: Variant = name_then
	name_then = null
	if f is Callable:
		f.call()
	else:
		boot()

# prefs.json = {name, speed, autoSkip} · text only, parsed + checked (HARD RULE 9 ③) · a bad file = defaults
func _load_prefs() -> void:
	var s: Variant = SV.load_text(prefs_file, 10000)
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
	SV.store_text(prefs_file, JSON.stringify({"name": player_name, "speed": speed, "autoSkip": auto_skip}))

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

# what the held runes add to each board unit at match start (web runeBonusAt, set 184 C1; ported 7f2): the battle engine stopped right
# after "match start", with and without runes, tribe bonuses off · conditional runes (per hit, last one standing, win streak) are not numbers
# here · {"row,lane": {maxHp, atk, cd, multi, burnHit, shockHit, armorHit, healHit}} (differences) · memo on team + runes + streak
var _rb_memo := {"key": "", "map": null}

func rune_bonus_at(ref: Variant) -> Variant:
	if not (ref is Dictionary) or ref.get("at") != "board" or not (P is Dictionary):
		return null
	var team := SH.team_entries(P)
	var runes := RR.rn_compact(P)
	var key := JSON.stringify([team, runes, stats.get("streak", 0.0)])
	if _rb_memo["key"] != key:
		var map: Variant = null
		var rules: Dictionary = R.RULES()
		var o := {"rules": rules, "log": false, "startOnly": true, "tribesOff": [true, true]}
		var bt: Variant = T.build_team(team, cm, rules)
		var ps := player_side(team, runes, stats.get("streak", 0.0))
		if bt is Array and not ps.has("error"):
			var at := func(r: Dictionary) -> Dictionary:
				var m := {}
				for x in r.get("units", []):
					if float(x["side"]) == 0.0:
						m["%d,%d" % [int(x["row"]), int(x["lane"])]] = x["st"]
				return m
			var a: Dictionary = at.call(Battle.simulate(bt, [], o.duplicate(true)))
			var b: Dictionary = at.call(Battle.simulate(ps["units"], [], o.duplicate(true)))
			var mcd := float(R.js_or0(rules.get("minCooldownMs")))
			var cd := func(x: Dictionary) -> float: return maxf(mcd, roundf(float(x["cdMs"]) * float(x["cdMult"])))
			map = {}
			for k in a:
				if not b.has(k):
					continue
				var x: Dictionary = a[k]
				var y: Dictionary = b[k]
				var d := {"cd": cd.call(y) - cd.call(x)}
				for s in ["maxHp", "atk", "multi", "burnHit", "shockHit", "armorHit", "healHit"]:
					d[s] = float(y[s]) - float(x[s])
				map[k] = d
		_rb_memo = {"key": key, "map": map}
	var mp: Variant = _rb_memo["map"]
	return mp.get("%d,%d" % [int(ref["row"]), int(ref["lane"])]) if mp is Dictionary else null

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
	var move := screen == "prep" and _can_move() # set 205: from the shop the camera zooms out to the whole arena
	screen = "battle"
	prep.visible = move # stays on screen until the move takes it away
	run_end.visible = false
	offer.visible = false
	popups.mx_state = {"tab": 0, "who": null, "log_open": false}
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
	var go := func() -> void:
		if auto_skip and not as_replay:
			battle.skip_now()
	if move:
		battle.view.pause() # the fight plays once the camera has arrived
		world.to_battle(func() -> void:
			battle.view.play()
			go.call())
	else:
		go.call()

func _can_move() -> bool:
	return zoom_s > 0.0 and is_inside_tree() and not world.moving

func _on_replay_this() -> void:
	if battle.view.result == null:
		return
	battle.replay_again()

# the picture of a match ended: the full result card (web finishMatch) — the outcome was applied when fight was pressed
func on_battle_finished() -> void:
	if replay_mode != null:
		var x: Dictionary = replay_mode["x"]
		var rw := 0 if R.js_seq(x["w"], 0.0) else 1 if R.js_seq(x["w"], 1.0) else 2
		battle.show_result({"title": TH.ui_text("r_replay_title", {"r": R.js_num(float(x["r"])), "res": TH.ui_text(["res_w", "res_l", "res_d"][rw])}), "win": rw,
			"sub": TH.ui_text("t_sec", {"t": "%.1f" % (float(x["t"]) / 1000.0)}), "chips": null, "msgs": [], "next_line": "", "next_text": TH.ui_text("n_back")})
		return
	if pending_end == null:
		return
	var r: Dictionary = pending_end["r"]
	var w: Variant = pending_end["w"]
	var S: Dictionary = R.RULES()["shop"]
	var win := 0 if R.js_seq(w, 0.0) else 1 if R.js_seq(w, 1.0) else 2
	var sub := TH.ui_text("r_sub", {"r": R.js_num(float(P["round"])), "t": "%.1f" % (float(last_result["timeMs"]) / 1000.0)}) + (TH.ui_text("r_draw_win") if win == 2 else "") \
		+ (TH.ui_text("r_dummy", {"n": R.js_num(dummy_dmg)}) if dummy_dmg > 0.0 else "")
	var offer_d: Variant = P["rn"].get("offer")
	var over := bool(P.get("over", false))
	var hearts := R.js_num(float(P["hearts"]))
	var chips := {
		"hearts": (TH.ui_text("r_hearts_sc", {"n": hearts}) if bool(r.get("second", false)) else TH.ui_text("r_hearts_lost", {"n": hearts})) if win == 1 else hearts,
		"wins": TH.ui_text("r_wins_extra", {"w": R.js_num(float(P["wins"]))}) if SH._truthy(P.get("extra")) else TH.ui_text("r_wins", {"w": R.js_num(float(P["wins"])), "n": R.js_num(float(S["winsToFinish"]))}),
		"gold": TH.ui_text("r_gold", {"n": R.js_num(float(S["winBonus"]))}) if win != 1 and float(R.js_or0(S.get("winBonus"))) > 0.0 and not over else ""}
	var next_line := TH.ui_text("r_next_end") if over else TH.ui_text("r_next_offer", {"n": str((offer_d["ids"] as Array).size())}) if offer_d is Dictionary else TH.ui_text("r_next_prep")
	var next_text := TH.ui_text("n_end") if over else TH.ui_text("n_offer") if offer_d is Dictionary else TH.ui_text("n_prep")
	var ml: Array = r.get("msgs", [])
	battle.show_result({"title": TH.ui_text("r_win" if win == 0 else "r_lose" if win == 1 else "r_draw"), "win": win, "sub": sub, "chips": chips,
		"msgs": ml, "next_line": next_line, "next_text": next_text})
	msgs = ml.slice(0, 5) # web: the prep message list starts from this match's messages

# "next" on the result card (web #next): only once per finished match
func _on_next() -> void:
	popups.close()
	if replay_mode != null:
		var back: String = replay_mode["back"]
		replay_mode = null
		screen = back
		var mv := back == "prep" and _can_move()
		battle.visible = mv
		render()
		if mv:
			world.to_prep(Callable())
		return
	if pending_end == null:
		return
	pending_end = null
	battle.result_box.visible = false
	battle.visible = false
	if bool(P.get("over", false)):
		screen = "runEnd"
		render()
		return
	var mv := _can_move() # set 205: back to the shop = the camera zooms into your half again
	battle.visible = mv
	screen = "prep"
	begin_round()
	if mv:
		world.to_prep(Callable())

# web #endExtra: a cleared run goes on with the hearts left (set 99) · the run's history entry is written when it really ends
func _on_extra() -> void:
	var r: Variant = J("ex", [], func() -> Variant: return SH.continue_extra(P))
	if not (r is Dictionary) or not bool(r.get("ok", false)):
		return
	if clear_at > 0.0:
		var hist := SV.read_history(SV.load_text(history_file)).filter(func(h): return float(h["at"]) != clear_at)
		SV.store_text(history_file, SV.js_json(hist))
	clear_at = 0.0
	save_run()
	screen = "prep"
	run_end.visible = false
	push_msgs(J("st", [], func() -> Variant: return SH.start_round(P, chars)))
	SH.start_round(B, chars)
	push_msgs(r)
	render()

# ---------- run code (web runCode / copyRunCode): this run + the one before · journals · history · name ----------
func run_code() -> Variant:
	var prev := func(f: String) -> String: return f.get_basename() + "_prev.json"
	return SV.make_run_code([SV.load_text(replays_file), SV.load_text(prev.call(replays_file))], SV.load_text(history_file), data_hash,
		floorf(Time.get_unix_time_from_system() * 1000.0), R.RULES(), [SV.load_text(log_file), SV.load_text(prev.call(log_file))], player_name)

func _say_code(t: String, err: bool) -> void:
	if screen == "runEnd":
		run_end.say_code(t, err)
	elif err:
		say_err(t)
	else:
		say_info(t)

# to the clipboard; when the device has none, the code opens in a box to copy by hand
func copy_run_code() -> void:
	var code: Variant = run_code()
	if not (code is String):
		_say_code(TH.ui_text("code_none"), true)
		return
	last_code = code
	if clip_ok and DisplayServer.has_feature(DisplayServer.FEATURE_CLIPBOARD):
		DisplayServer.clipboard_set(code)
		if popups.kind == "replays":
			popups.close()
		_say_code(TH.ui_text("code_done"), false)
	else:
		popups.open("runcode")

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
	replay_mode = {"back": "runEnd" if screen == "runEnd" else "prep", "x": x}
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
	if screen == "runEnd":
		run_end.say_code(t, true)
		return
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
	# set 206 D1 (user): a very short window (browser bars on a phone, e.g. 740×330) gets a 400-high base instead of 480,
	# so the text grows from ~8.9 px to ~10.7 px; the 3D board shrinks to fit the smaller field
	var w := get_window()
	if w != null:
		var want := Vector2i(854, 400) if w.size.y > 0 and w.size.y < 360 and w.size.x > w.size.y else Vector2i(854, 480)
		if w.content_scale_size != want:
			w.content_scale_size = want
	refit_stage.call_deferred()
	if offer.visible:
		render()

# ---------- set 206: the 3D arena ----------
# the flat background hides while the arena shows (prep or battle on screen); other screens keep it
func _sync_stage() -> void:
	var on := prep.visible or battle.visible
	bg.visible = not on
	stage.visible = on
	if not world.moving:
		stage.show_group("battle" if battle.visible and not prep.visible else "prep")
		stage.set_k(1.0 if battle.visible and not prep.visible else 0.0)

# where the board must sit on screen: prep = your half inside the prep field (below the column labels) · battle = both halves in the battle field
func board_targets() -> Array:
	var pr: Variant = null
	var br: Variant = null
	var pf: Rect2 = prep.field.get_global_rect()
	if pf.size.x > 40.0 and pf.size.y > 40.0:
		var side: float = prep.board_side_room() # set 212 (note 6): same room both sides — the board stays centred and clears the bench
		pr = pf.grow_individual(-side - 50.0, -120.0, -side - 50.0, -4.0) # set 207: labels lie on the floor (P6)
	var bf: Rect2 = battle.field.get_global_rect()
	if bf.size.x > 40.0 and bf.size.y > 40.0:
		br = bf.grow_individual(-10.0, -90.0, -10.0, -4.0) # set 217 sample (owner R8): frame the units, not the whole plaza (was -90/-165)
	return [pr, br]

func refit_stage() -> void:
	if stage == null:
		return
	var t := board_targets()
	stage.refit(size, t[0], t[1])

func _place_cells() -> void:
	prep.place_cells()
	battle.view.place_cells()
