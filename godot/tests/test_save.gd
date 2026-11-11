# set 195 (plan step 6f): save.gd + runlog.gd vs golden save.jsonl (cd src && node lab/golden.mjs) — data hash, run-state
# check, save read/write, run stats, history, replays, play record, run journal replay, ARUN1 code make/parse. Texts the
# game writes (save, replays, code) must be the same bytes as JS. test_arun_godot_made also writes an ARUN1 code made
# by Godot alone to tests/golden/godot-arun1.txt → CI reads it with the JS Balance Room reader (node lab/golden-save.mjs check).
extends RefCounted

const R := preload("res://scripts/rules.gd")
const T := preload("res://scripts/team.gd")
const SH := preload("res://scripts/shop.gd")
const BT := preload("res://scripts/botteams.gd")
const S := preload("res://scripts/save.gd")
const RL := preload("res://scripts/runlog.gd")
const G := preload("res://tests/golden_util.gd")
const FILE := "res://tests/golden/save.jsonl"
const OUT := "res://tests/golden/godot-arun1.txt"

var _opts := {}

func setup(opts: Dictionary) -> void:
	_opts = opts

func _chars() -> Array:
	return R.game()["derived"]["characters"]

func test_golden_save_exact() -> String:
	if not FileAccess.file_exists(FILE):
		if _opts.get("require_golden", false):
			return "golden save.jsonl missing (run: cd src && node lab/golden.mjs)"
		print("  skip: no golden save.jsonl (cd src && node lab/golden.mjs)")
		return "ok"
	var fa := FileAccess.open(FILE, FileAccess.READ)
	var n := {}
	var fails := 0
	var first := ""
	var cm := T.make_char_map(_chars())
	while not fa.eof_reached():
		var line := fa.get_line()
		if line == "":
			continue
		var o: Dictionary = G.decode(JSON.parse_string(line))
		var d := _check(o, cm)
		var k: String = o["kind"] + ("/" + o["what"] if o.has("what") else "")
		n[k] = n.get(k, 0) + 1
		if d != "":
			fails += 1
			if first == "":
				first = "%s %s: %s" % [k, o.get("i", ""), d]
	print("  save.jsonl: %s · fails %d" % [n, fails])
	for k in ["hash", "mrun", "state", "mksave", "save", "rl", "rlmisc", "code", "badcode", "check/rlcheck", "check/replay", "check/play", "check/hist", "check/stats", "json", "stats"]:
		if n.get(k, 0) == 0:
			return "save.jsonl has no %s lines" % k
	return "ok" if fails == 0 else "%d lines differ · first: %s" % [fails, first]

func _same_text(got: Variant, want: Variant) -> String:
	if typeof(got) == typeof(want) and got == want:
		return ""
	if got is String and want is String:
		var i := 0
		while i < mini(got.length(), want.length()) and got[i] == want[i]:
			i += 1
		return "text differs at %d: Godot …%s… ≠ JS …%s…" % [i, got.substr(maxi(0, i - 30), 70), want.substr(maxi(0, i - 30), 70)]
	return "Godot %s ≠ JS %s" % [var_to_str(got).left(80), var_to_str(want).left(80)]

func _check(o: Dictionary, cm: Dictionary) -> String:
	var chars := _chars()
	match o["kind"]:
		"hash":
			for i in o["cases"].size():
				var c: Dictionary = o["cases"][i]
				var rl: Dictionary = R.RULES().duplicate()
				for k in c["rules"]:
					rl[k] = c["rules"][k]
				var h := S.data_hash(c["chars"], rl)
				if h != c["h"]:
					return "case %d: Godot %s ≠ JS %s" % [i, h, c["h"]]
			return ""
		"mrun":
			var stats := S.new_stats()
			var entries := []
			for j in o["matches"].size():
				var m: Dictionary = o["matches"][j]
				var a: Dictionary = m["args"]
				var e := S.replay_entry(a["round"], a["teamA"], a["teamB"], a["res"], a["runes"], a["streak"], a["d"], a["foeRunes"], a["foeStreak"])
				entries.append(e)
				S.add_match_stats(stats, a["res"])
				var play := S.play_record(m["pin"])
				for d in [G.diff(e, m["entry"], "m%d.entry" % j), G.diff(stats, m["stats"], "m%d.stats" % j), G.diff(S.top_damage(stats), m["top"], "m%d.top" % j),
						G.diff(S.validate_stats(stats, cm), m["statsOk"], "m%d.statsOk" % j), G.diff(play, m["play"], "m%d.play" % j),
						G.diff(S.check_play_record(play, cm), m["playOk"], "m%d.playOk" % j)]:
					if d != "":
						return d
			var d := _same_text(S.make_replays(o["seed"], o["matches"][0]["pin"]["hash"], entries), o["replays"])
			if d != "":
				return "makeReplays " + d
			for r in o["reads"]:
				d = G.diff(S.read_replays(r["t"], cm, {}, r["h"], r["s"]), r["res"], "readReplays")
				if d != "":
					return d
			return G.diff(S.history_entry(o["P"], stats, 1.7e12 + float(o["i"])), o["hist"], "hist")
		"state":
			return G.diff(S.validate_run_state(o["st"], cm, {}, {"bot": true} if o["bot"] else {}), o["res"])
		"json":
			for i in o["vals"].size():
				var d := _same_text(S.js_json(o["vals"][i]), o["out"][i])
				if d != "":
					return "js_json value %d: %s" % [i, d]
			return ""
		"stats":
			for i in o["cases"].size():
				var c: Dictionary = o["cases"][i]
				var st := S.new_stats()
				S.add_match_stats(S.add_match_stats(st, c["res"]), c["res"])
				var d := G.diff(st, c["st"], "case %d" % i)
				if d != "":
					return d
			return ""
		"mksave":
			return _same_text(S.make_save(o["P"], o["B"], o["stats"], o["startedAt"], o["hash"]), o["text"])
		"save":
			return G.diff(S.read_save(o["text"], cm, {}, o["hash"]), o["res"])
		"check":
			var x: Variant = o["x"]
			var got: Variant
			match o["what"]:
				"stats": got = S.validate_stats(x, cm)
				"replay": got = S.check_replay(x, cm)
				"play": got = S.check_play_record(x, cm)
				"boss": got = S.is_boss_foe(x)
				"hist": got = S.read_history(x)
				"rlcheck": got = RL.rl_check(x)
				"push":
					var list := []
					for k in 25:
						list.append(x[0][0])
					got = float(S.push_history(list, x[0][1] if x[0].size() > 1 else x[0][0]).size())
			return G.diff(got, o["res"])
		"rl":
			var c: Variant = RL.rl_check(o["log"])
			if not R.js_seq(c, o["check"]):
				return "rlCheck Godot %s ≠ JS %s" % [c, o["check"]]
			var keep: bool = o.has("before")
			var res := RL.rl_replay(o["log"], chars, {}, keep)
			var steps := []
			for s in res["steps"]:
				steps.append([s["gold"], s["res"], s["goldOk"]])
			for d in [G.diff(steps, o["steps"], "steps"), G.diff(float(res["firstBad"]), o["firstBad"], "firstBad"), G.diff(res["st"], o["st"], "st")]:
				if d != "":
					return d
			if keep:
				var bs := []
				for s in res["steps"]:
					bs.append(s["before"])
				var d := G.diff(bs, o["before"], "before")
				if d != "":
					return d
			if o.has("bad"):
				return G.diff(float(RL.rl_replay(o["bad"]["log"], chars, {}, false)["firstBad"]), o["bad"]["firstBad"], "bad.firstBad")
			return ""
		"rlmisc":
			for p in o["names"]:
				if RL.rl_name(p[0]) != p[1]:
					return "rlName(%s) Godot %s ≠ JS %s" % [var_to_str(p[0]), var_to_str(RL.rl_name(p[0])), var_to_str(p[1])]
			for p in o["refs"]:
				if RL.rl_ref(p[0]) != p[1]:
					return "rlRef(%s) Godot %s ≠ JS %s" % [var_to_str(p[0]), RL.rl_ref(p[0]), p[1]]
			for p in o["unrefs"]:
				var u: Variant = RL.rl_unref(p[0])
				var d := G.diff("undefined" if u is bool else u, p[1], "rlUnref(%s)" % p[0])
				if d != "":
					return d
			for p in o["gains"]:
				var d := G.diff(RL.rl_gains(p[0]), p[1], "rlGains")
				if d != "":
					return d
			var L := RL.new_run_log(4294967297.0, "abcdef01", 1234.9, " n ")
			var push := []
			for q in [["st", [], 0.0, 5.0, 1300.0], ["by", [1.0, "B0"], 5.0, 2.0, 9999.0], ["nope", [], 1.0, 1.0, 1.0], ["toString", [], 1.0, 1.0, 1.0], ["en", [1.0, 0.0, []], 2.0, 2.0, 400.0]]:
				push.append(RL.rl_push(L, q[0], q[1], q[2], q[3], q[4]))
			for d in [G.diff(push, o["push"], "rlPush"), G.diff(L, o["log"], "log")]:
				if d != "":
					return d
			if o["jsThrows"] != 0:
				print("  note: %d broken inputs made JS throw (left out of the golden)" % o["jsThrows"])
			return ""
		"code":
			var a: Dictionary = o["args"]
			var code: Variant = S.make_run_code(a["replayTexts"], a["historyText"], a["pageHash"], a["at"], {}, a["logTexts"], a["name"])
			var d := _same_text(code, o["code"])
			if d != "":
				return "makeRunCode " + d
			if code == null:
				return ""
			return G.diff(S.parse_run_code(code, cm), o["parsed"], "parsed")
		"badcode":
			var p := S.parse_run_code(o["text"], cm)
			if o["err"] != null:
				return "" if p.get("error") == o["err"] else "error Godot %s ≠ JS %s" % [p.get("error"), o["err"]]
			return G.diff(p, o["parsed"], "parsed")
	return "unknown kind " + str(o["kind"])

# Godot alone: a bot run (replays + stats + history) + a scripted player run with its journal → ARUN1 code → file for the JS reader
func test_arun_godot_made() -> String:
	var chars := _chars()
	var cm := T.make_char_map(chars)
	var hash := S.data_hash(chars)
	var stats := S.new_stats()
	var entries := []
	var seed := 4242.0
	var on_match := func(m: Dictionary) -> void:
		var b: Variant = {"boss": m["boss"], "k": m["k"]} if m["boss"] != null else m["foe"]
		entries.append(S.replay_entry(m["round"], m["team"], b, m["res"], m["rn"], m["ws"], null, m["foeRn"], 0.0))
		S.add_match_stats(stats, m["res"])
	var PL := BT.sim_run(chars, R.RULES(), seed, null, on_match, null, {"runes": true, "detail": true, "extra": BT.bot_rounds()})
	var replays := S.make_replays(seed, hash, entries)
	var hist := S.js_json(S.push_history([], S.history_entry(PL, stats, 1.7e12)))
	# scripted player run: every action through rl_apply, journal by rl_push (gold before → after), like the game page
	var st := SH.new_run(chars, 777.0)
	var log := RL.new_run_log(777.0, hash, 1.7e12, "Godot ทดสอบ")
	var clock := {"now": 1.7e12}  # lambdas capture locals by value → shared state in a Dictionary
	var act := func(t: String, a: Array) -> Dictionary:
		var e := [t, 0.0, st["gold"], 0.0]
		e.append_array(a)
		var g0: float = st["gold"]
		var res := RL.rl_apply(st, e, chars)
		clock["now"] += 1500.0
		if res["ok"]:
			RL.rl_push(log, t, a, g0, st["gold"], clock["now"])
		return res
	var refs := ["F00", "F01", "F10", "F11", "F20", "F21"]
	for g in 40:
		if st["over"]:
			break
		act.call("st", [])
		for k in 5:
			act.call("by", [float(k), "-"])
		for k in 6:
			act.call("mv", ["B%d" % k, refs[k]])
		act.call("sl", ["B7"])
		act.call("en", [1.0 if g % 3 != 2 else 0.0, 0.0, []])
		if st["lastWon"] and not st["over"]:
			act.call("of", ["win"])
			act.call("tk", [0.0])
	var R2 := RL.rl_replay(log, chars, {}, false)
	if R2["firstBad"] >= 0 or log["ev"].size() < 50:
		return "Godot journal does not replay in Godot (firstBad %d, %d steps)" % [R2["firstBad"], log["ev"].size()]
	var code: Variant = S.make_run_code([replays], hist, hash, 1.7e12, {}, [S.js_json(log)], "Godot ทดสอบ")
	if code == null:
		return "make_run_code gave null"
	var p := S.parse_run_code(code, cm)
	if p.has("error"):
		return "Godot cannot read its own code: " + p["error"]
	if p["runs"].size() != 1 or p["logs"].size() != 1 or p["hist"].size() != 1:
		return "code parts missing: runs %d logs %d hist %d" % [p["runs"].size(), p["logs"].size(), p["hist"].size()]
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUT.get_base_dir()))
	var f := FileAccess.open(OUT, FileAccess.WRITE)
	if f == null:
		return "cannot write " + OUT
	f.store_string(code)
	f.close()
	print("  godot-arun1.txt: %d matches · %d journal steps · %d chars (check: cd src && node lab/golden-save.mjs check ../godot/tests/golden/godot-arun1.txt)" % [entries.size(), log["ev"].size(), code.length()])
	return "ok"

# user:// text store: round trip a save through the file, refuse other paths, refuse a too-big file, a broken file reads as 'bad'
func test_store_user_files() -> String:
	var chars := _chars()
	var cm := T.make_char_map(chars)
	var hash := S.data_hash(chars)
	var PL := SH.new_run(chars, 99.0)
	var B := SH.new_run(chars, 98.0)
	SH.start_round(PL, chars)
	SH.start_round(B, chars)
	var text := S.make_save(PL, B, S.new_stats(), 1.7e12, hash)
	var path := "user://test-save-195.json"
	if not S.store_text(path, text):
		return "store_text failed"
	var back: Variant = S.load_text(path)
	if back != text:
		return "load_text gave other text"
	var r := S.read_save(back, cm, {}, hash)
	if r["status"] != "ok":
		return "read_save of a fresh save: %s" % [r]
	var d := G.diff(r["save"]["P"], PL, "P")
	if d != "":
		return d
	for bad in ["res://x.json", "user://../x.json", "user://x.tres", "/tmp/x.json"]:
		if S.store_text(bad, "{}") or S.load_text(bad) != null:
			return "path allowed: " + bad
	if S.load_text(path, 100) != null:
		return "too-big file was read"
	S.store_text(path, text.substr(0, 500))
	if S.read_save(S.load_text(path), cm, {}, hash)["status"] != "bad":
		return "cut save not 'bad'"
	DirAccess.remove_absolute(ProjectSettings.globalize_path(path))
	if S.load_text(path) != null or S.read_save(S.load_text(path), cm, {}, hash)["status"] != "none":
		return "missing file not 'none'"
	return "ok"
