# set 195 (plan step 6e): bot.gd + botteams.gd + jsmath.gd js_log vs golden bot.jsonl and golden (c) runs.jsonl
# (cd src && node lab/golden.mjs). runs.jsonl = 200 whole bot runs (shop, runes, bosses, pickFoe / live-bot enemies,
# extra rounds, battles): every match + the final state, compared exactly. `RUNS_LIMIT=n` checks only the first n runs.
extends RefCounted

const R := preload("res://scripts/rules.gd")
const T := preload("res://scripts/team.gd")
const SH := preload("res://scripts/shop.gd")
const BOT := preload("res://scripts/bot.gd")
const BT := preload("res://scripts/botteams.gd")
const JM := preload("res://scripts/jsmath.gd")
const G := preload("res://tests/golden_util.gd")
const BOT_FILE := "res://tests/golden/bot.jsonl"
const RUNS_FILE := "res://tests/golden/runs.jsonl"

var _opts := {}
var _stages := []

func setup(opts: Dictionary) -> void:
	_opts = opts

func _missing(f: String) -> String:
	if _opts.get("require_golden", false):
		return "golden %s missing (run: cd src && node lab/golden.mjs)" % f.get_file()
	print("  skip: no golden %s (cd src && node lab/golden.mjs)" % f.get_file())
	return "ok"

func _chars() -> Array:
	return R.game()["derived"]["characters"]

func test_golden_bot_exact() -> String:
	if not FileAccess.file_exists(BOT_FILE):
		return _missing(BOT_FILE)
	var fa := FileAccess.open(BOT_FILE, FileAccess.READ)
	var n := {"log": 0, "misc": 0, "foe": 0, "pick": 0, "shop": 0}
	var fails := 0
	var first := ""
	while not fa.eof_reached():
		var line := fa.get_line()
		if line == "":
			continue
		var o: Dictionary = G.decode(JSON.parse_string(line))
		var d := _check(o)
		n[o["kind"]] += 1
		if d != "":
			fails += 1
			if first == "":
				first = "%s %s: %s" % [o["kind"], o.get("i", ""), d]
	print("  bot.jsonl: %s · fails %d" % [n, fails])
	for k in n:
		if n[k] == 0:
			return "bot.jsonl has no %s lines" % k
	return "ok" if fails == 0 else "%d lines differ · first: %s" % [fails, first]

func _check(o: Dictionary) -> String:
	var chars := _chars()
	var cm := T.make_char_map(chars)
	match o["kind"]:
		"log":
			var bad := 0
			var ex := ""
			for k in o["xs"].size():
				var g := JM.js_log(float(o["xs"][k]))
				if g != float(o["ys"][k]):
					bad += 1
					if ex == "":
						ex = "log(%s) Godot %s ≠ JS %s" % [var_to_str(o["xs"][k]), var_to_str(g), var_to_str(o["ys"][k])]
			print("  js_log: %d cases" % o["xs"].size())
			return "" if bad == 0 else "js_log: %d of %d differ · first %s" % [bad, o["xs"].size(), ex]
		"misc":
			_stages = o["stages"]
			var rc := []
			for x in [-2.0, 0.0, 1.0, 5.7, 19.0, 20.0, 99.0, "x"]:
				rc.append([float(BT.round_cell(x, 19.0)), float(BT.round_cell(x, 3.0))])
			var want := []
			var floor_ := []
			var wsp := []
			for s in _stages:
				want.append([BT.foe_want_pct(false, s), BT.foe_want_pct(true, s)])
				floor_.append([-1.0, 0.0, 1.0, 2.0, 3.0, 4.0, 6.0, 9.0, 20.0].map(func(ls): return BT.foe_floor_pct(ls, s)))
				wsp.append([-1.0, 0.0, 1.0, 2.0, 3.0, 5.0, 12.0].map(func(ws): return BT.foe_ws_pct(ws, s)))
			var tt := []
			for t in o["teams"]:
				tt.append([BT.team_tribe(t, cm), BT.team_tribe(t, cm, R.mod("rules")["TRIBES"][2]), BT.team_tribe(t, cm, "x")])
			var hints := []
			var hs: Array = R.mod("rules")["ROW_HINTS"].duplicate()
			hs.append_array(["x", ""])
			for h in hs:
				hints.append([BOT.rows_of_hint(h), [0.0, 0.25, 0.5, 0.99].map(func(x): return BOT.pick_hint_row(h, x))])
			return G.diff({"botRounds": [BT.bot_rounds(), BT.bot_rounds({}, _stages[1])], "roundCell": rc, "want": want, "floor": floor_, "wsp": wsp,
				"tribes": BT.tribe_list(chars), "teamTribe": tt, "hints": hints},
				{"botRounds": o["botRounds"], "roundCell": o["roundCell"], "want": o["want"], "floor": o["floor"], "wsp": o["wsp"],
				"tribes": o["tribes"], "teamTribe": o["teamTribe"], "hints": o["hints"]}, "")
		"foe":
			var res := BT.pick_foe(BT.BOT_TEAMS(), o["p"], o["round"], o["seed"], o["extra"], _stages[int(o["sv"])], {}, o["ls"], o["ws"])
			return G.diff(res, o["res"], "res")
		"pick":
			return G.diff(BT.pick_bot_team(BT.BOT_TEAMS(), o["round"], o["seed"], o["tier"]), o["res"], "res")
		"shop":
			var st: Dictionary = o["st0"].duplicate(true)
			BOT.bot_shop(st, chars, {}, o["opts"])
			BOT.bot_place_runes(st, cm)
			return G.diff({"st": st, "flag": BOT.bot_flag_tribe(st, cm)}, {"st": o["st"], "flag": o["flag"]}, "")
	return "unknown kind " + str(o["kind"])

# golden.mjs foeOf = the game's enemy pick (pickFoe on the shipped bot teams with the locked power st.fp)
static func _foe_of(st: Dictionary) -> Dictionary:
	return BT.pick_foe(BT.BOT_TEAMS(), float(R.js_i32(st.get("fp"))), st["round"], st["seed"], SH._truthy(st.get("extra")), null, {},
		float(R.js_i32(st.get("ls"))), float(R.js_i32(st.get("ws"))))

func test_golden_runs_exact() -> String:
	if not FileAccess.file_exists(RUNS_FILE):
		return _missing(RUNS_FILE)
	var limit := int(OS.get_environment("RUNS_LIMIT")) if OS.get_environment("RUNS_LIMIT") != "" else -1
	var chars := _chars()
	var fa := FileAccess.open(RUNS_FILE, FileAccess.READ)
	var n := 0
	var nm := 0
	var fails := 0
	var first := ""
	while not fa.eof_reached():
		var line := fa.get_line()
		if line == "":
			continue
		if limit >= 0 and n >= limit:
			break
		var o: Dictionary = G.decode(JSON.parse_string(line))
		var got := []
		var on_match := func(m: Dictionary) -> void:
			got.append({"stage": m["stage"], "round": m["round"], "gold": m["gold"], "hearts": m["hearts"], "extra": m["extra"], "second": m["second"],
				"ws": m["ws"], "team": m["team"], "rn": m["rn"], "foe": m["foe"], "foeRn": m["foeRn"], "boss": m["boss"], "k": m["k"],
				"winner": m["winner"], "timeMs": m["timeMs"], "aborted": m["aborted"], "events": float(m["res"]["events"].size())})
		var opp: Variant = null if o["foe"] == "liveBot" else (func(st): return _foe_of(st))
		var fin := BT.sim_run(chars, {}, o["seed"], opp, on_match, null, o["opts"])
		var d := G.diff({"matches": got, "final": fin}, {"matches": o["matches"], "final": o["final"]}, "run%d" % int(o["i"]))
		n += 1
		nm += o["matches"].size()
		if d != "":
			fails += 1
			if first == "":
				first = d
	print("  runs exact: %d/%d · matches %d" % [n - fails, n, nm])
	return "ok" if fails == 0 and n > 0 else "%d of %d runs differ · first: %s" % [fails, n, first]
