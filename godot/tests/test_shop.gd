# set 195 (plan step 6d): shop.gd vs golden shop.jsonl (cd src && node lab/golden.mjs → lab/golden-shop.mjs).
# Every value compared exactly (golden_util.diff). _apply repeats src/lab/golden-shop.mjs applyAction.
extends RefCounted

const R := preload("res://scripts/rules.gd")
const SH := preload("res://scripts/shop.gd")
const RR := preload("res://scripts/runrunes.gd")
const G := preload("res://tests/golden_util.gd")
const FILE := "res://tests/golden/shop.jsonl"

var _opts := {}
var _chars := []
var _rules := []
var _stages := []

func setup(opts: Dictionary) -> void:
	_opts = opts

func test_golden_shop_exact() -> String:
	if not FileAccess.file_exists(FILE):
		if _opts.get("require_golden", false):
			return "golden shop.jsonl missing (run: cd src && node lab/golden.mjs)"
		print("  skip: no golden shop.jsonl (cd src && node lab/golden.mjs)")
		return "ok"
	var fa := FileAccess.open(FILE, FileAccess.READ)
	var n := {"vars": 0, "misc": 0, "seq": 0, "targets": 0}
	var steps := 0
	var fails := 0
	var first := ""
	while not fa.eof_reached():
		var line := fa.get_line()
		if line == "":
			continue
		var o: Dictionary = G.decode(JSON.parse_string(line))
		var d := _check(o)
		n[o["kind"]] += 1
		if o["kind"] == "seq":
			steps += o["steps"].size()
		if d != "":
			fails += 1
			if first == "":
				first = "%s %s: %s" % [o["kind"], o.get("i", ""), d]
	print("  shop.jsonl: %s · steps %d · fails %d" % [n, steps, fails])
	for k in n:
		if n[k] == 0:
			return "shop.jsonl has no %s lines" % k
	return "ok" if fails == 0 else "%d lines differ · first: %s" % [fails, first]

func _check(o: Dictionary) -> String:
	match o["kind"]:
		"vars":
			_chars = o["chars"]
			_rules = o["rules"]
			_stages = o["stages"]
			var d := G.diff(_chars[0], R.game()["derived"]["characters"], "chars0")
			if d == "":
				d = G.diff(_rules[0], R.RULES(), "rules0")
			return d if d != "" else G.diff(_stages[0], R.mod("runboss")["RUN_STAGE"], "stage0")
		"misc":
			var per := []
			var rounds := [-3.0, 0.0, 1.0, 2.0, 3.0, 2.5, 7.0, 15.0, 16.0, 30.0, "x", null]
			for r in _rules:
				var lv := []
				var inc := []
				for x in rounds:
					lv.append(SH.lv_for_round(x, r))
					inc.append(SH.base_income_at(x, r))
				var odds := []
				for x in [-1.0, 0.0, 1.0, 2.0, 7.5, 15.0, 99.0]:
					odds.append(SH.odds_at(x, r))
				var income := []
				for p in [[0.0, false], [1.0, true], [5.0, false], [30.0, true]]:
					income.append(SH.income_of({"round": p[0], "lastWon": p[1]}, r))
				per.append({"levels": SH.shop_levels(r), "lv": lv, "inc": inc, "odds": odds, "income": income})
			var keys := SH.PERM_KEYS().duplicate()
			keys.append_array(["cdMs", "cdStart", "burnNoDecay", "nope", "share_frontAlly"])
			var give := []
			for k in keys:
				var row := []
				for v in [1.0, 5.0, 250.0, 1500.0, 2.5]:
					row.append(SH.give_amt(k, v))
				give.append(row)
			var st := SH.new_run([], 1.0)
			var refs := [null, "x", {}, {"at": "bench", "i": 0.0}, {"at": "bench", "i": 5.0}, {"at": "bench", "i": -1.0}, {"at": "bench", "i": 1.5}, {"at": "board", "row": 2.0, "lane": 1.0},
				{"at": "board", "row": 3.0, "lane": 0.0}, {"at": "board", "row": 0.0, "lane": 2.0}, {"at": "board", "row": "0", "lane": 0.0}, {"at": "shop", "i": 4.0}, {"at": "shop", "i": 5.0}, {"at": "sky", "i": 0.0}]
			var okr := []
			for r in refs:
				okr.append(SH.ok_ref(st, r))
			var got := {"per": per, "give": give, "okRef": okr, "th": SH.SHOP_GIVE_TH(), "permKeys": SH.PERM_KEYS(), "slotOrder": SH.SLOT_ORDER, "newRun": SH.new_run([], 4294967297.0), "shadow": [_shadow_case(1.0), _shadow_case(2.0)]}
			var want := o.duplicate()
			want.erase("kind")
			return G.diff(got, want, "")
		"seq":
			var chars: Array = _chars[int(o["cv"])]
			var rules: Dictionary = _rules[int(o["rv"])]
			var stage: Dictionary = _stages[int(o["sv"])]
			var st := {}
			for k in o["steps"].size():
				var s: Dictionary = o["steps"][k]
				var res: Variant = null
				if s["a"][0] == "new":
					st = SH.new_run(chars, s["a"][1], rules)
				else:
					res = _apply(st, s["a"], chars, rules, stage)
				var q := {"inc": SH.income_of(st, rules), "lv": SH.shop_lv_of(st, rules), "team": SH.team_entries(st), "fe": SH.first_empty_bench(st)}
				var d := G.diff({"res": res, "st": st, "q": q}, {"res": s["res"], "st": s["st"], "q": s["q"]}, "step%d %s" % [k, s["a"][0]])
				if d != "":
					return d
			return ""
		"targets":
			var chars: Array = _chars[int(o["cv"])]
			var st: Dictionary = o["st"].duplicate(true)
			var n0 := float(st["n"])
			var self_u: Variant = SH.get_at(st, o["self"]) if o["self"] is Dictionary else null
			var res := SH.shop_targets(st, o["ref"], o["to"], self_u, chars, o["s"]).map(func(u): return u["uid"])
			return G.diff({"res": res, "n": float(st["n"]) - n0}, {"res": o["res"], "n": o["n"]}, "")
	return "unknown kind " + str(o["kind"])

func _shadow_case(held: float) -> Dictionary:
	var chars: Array = _chars[0]
	var st := SH.new_run(chars, 77.0)
	var out := []
	st["gold"] = 50.0
	st["rn"]["bag"]["U8"] = held
	for k in 4:
		st["board"][0][0] = {"uid": st["uid"], "id": chars[k]["id"], "level": 1.0, "perm": {}, "paid": 3.0}
		st["uid"] = float(st["uid"]) + 1.0
		out.append(RR.rn_place(st, "U8", [0.0, 0.0], R.RULES()))
		out.append(SH.sell(st, {"at": "board", "row": 0.0, "lane": 0.0}, chars, R.RULES()))
	return {"res": out, "st": st}

func _apply(st: Dictionary, a: Array, chars: Array, rules: Dictionary, stage: Dictionary) -> Variant:
	var x: Variant = a[1] if a.size() > 1 else null
	var y: Variant = a[2] if a.size() > 2 else null
	var z: Variant = a[3] if a.size() > 3 else null
	match a[0]:
		"start": return SH.start_round(st, chars, rules)
		"offer": return {"offer": RR.rn_make_offer(st, x, stage)}
		"take": return SH.take_rune(st, x, chars, rules, y, stage)
		"skip": return RR.rn_skip_offer(st)
		"buy": return SH.buy(st, x, y, chars, rules)
		"buyMerge": return SH.buy_merge(st, x, y, chars, rules)
		"sell": return SH.sell(st, x, chars, rules)
		"move": return SH.move(st, x, y, chars, rules)
		"reroll": return SH.reroll(st, chars, rules)
		"lock": return SH.toggle_lock(st, x)
		"end": return SH.end_match(st, x, chars, rules, y, z, stage)
		"extra": return SH.continue_extra(st, rules)
		"heart": return RR.rn_heart_trade(st, stage)
		"gold":
			st["gold"] = x
			return null
		"give":
			st["rn"]["bag"][x] = R.js_or0(st["rn"]["bag"].get(x)) + 1.0
			return null
		"place": return RR.rn_place(st, x, y, rules)
	return "unknown action " + str(a[0])
