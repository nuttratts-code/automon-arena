# set 195 (plan step 6b): stage.gd · boss.gd · runboss.gd · runes.gd vs golden stage.jsonl
# (cd src && node lab/golden.mjs → lab/golden-stage.mjs). Every value compared exactly (golden_util.diff).
extends RefCounted

const R := preload("res://scripts/rules.gd")
const S := preload("res://scripts/stage.gd")
const B := preload("res://scripts/boss.gd")
const RB := preload("res://scripts/runboss.gd")
const RN := preload("res://scripts/runes.gd")
const JM := preload("res://scripts/jsmath.gd")
const G := preload("res://tests/golden_util.gd")
const FILE := "res://tests/golden/stage.jsonl"

var _opts := {}

func setup(opts: Dictionary) -> void:
	_opts = opts

func test_run_stage_is_derived_stage() -> String:
	var d := G.diff(RB.RUN_STAGE(), S.defaults(), "RUN_STAGE")
	return "ok" if d == "" else d

func test_js_helpers() -> String:
	var cases := [[R.js_i32(4294967297.0), 1], [R.js_i32(-2.7), -2], [R.js_i32(2147483648.0), -2147483648], [R.js_i32(null), 0], [R.js_i32(NAN), 0],
		[R.js_fixed2(24.0), 24.0], [R.js_fixed2(0.125), 0.13], [R.js_fixed2(-0.125), -0.13], [R.js_fixed2(28.799999999999997), 28.8]]
	for c in cases:
		if not (float(c[0]) == float(c[1])):
			return "helper gave %s, want %s" % [c[0], c[1]]
	return "ok"

func test_golden_stage_exact() -> String:
	if not FileAccess.file_exists(FILE):
		if _opts.get("require_golden", false):
			return "golden stage.jsonl missing (run: cd src && node lab/golden.mjs)"
		print("  skip: no golden stage.jsonl (cd src && node lab/golden.mjs)")
		return "ok"
	var fa := FileAccess.open(FILE, FileAccess.READ)
	var n := {"misc": 0, "boss": 0, "runBoss": 0, "equip": 0, "record": 0, "dummy": 0}
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
				first = "%s %s: %s" % [o["kind"], o.get("i", o.get("round", "")), d]
	print("  stage.jsonl: %s · fails %d" % [n, fails])
	for k in n:
		if n[k] == 0:
			return "stage.jsonl has no %s lines" % k
	return "ok" if fails == 0 else "%d lines differ · first: %s" % [fails, first]

func _check(o: Dictionary) -> String:
	match o["kind"]:
		"misc":
			var pbad := 0
			var pfirst := ""
			for c in o["pow"]:
				var g := JM.js_pow(c[0], c[1])
				if not (g == float(c[2]) or (is_nan(g) and is_nan(float(c[2])))):
					pbad += 1
					if pfirst == "":
						pfirst = "%s ** %s = %s, JS %s" % [c[0], c[1], g, c[2]]
			if pbad > 0:
				return "js_pow: %d of %d differ · first %s" % [pbad, o["pow"].size(), pfirst]
			var kinds := []
			for e in ["skill", "atk", "eCd", "flag", "gold", "revive", "", "nope", "addTribe"]:
				kinds.append(S.rune_kind(e))
			var act := []
			for x in [null, {}, {"on": true}, {"on": true, "del": true}, {"on": false}, {"on": 1.0, "del": 0.0}]:
				act.append(S.rune_active(x))
			var S0: Dictionary = S.defaults()["settings"]
			var sets := [S0, _with(S0, {"bossEvery": 3.0, "bossLateFrom": 9.0, "bossEveryLate": 4.0, "lastStage": 40.0}),
				_with(S0, {"bossEvery": 0.0, "bossLateFrom": 0.0, "bossEveryLate": 0.0}), _with(S0, {"bossEvery": 7.9, "bossLateFrom": 2.5, "lastStage": 30.2})]
			var rk := []
			for s in sets:
				var row := []
				for r in 45:
					row.append(S.boss_round_k(float(r - 1), s))
				rk.append(row)
			var em := []
			for st in [S0, {"growFrom": 3.0, "growPct": 8.0}, {"growFrom": 2.0, "growPct": 33.3}]:
				for s in 30:
					em.append(S.enemy_mult_at(st, float(s)))
			var T: Array = R.mod("rules")["TRIBES"]
			var fr := {"tribe": T[2]}
			var flag := [RN.rn_flag_tribes(fr, 1, null), RN.rn_flag_tribes(fr, 3, [T[1]]), RN.rn_flag_tribes(fr, 3, [T[4], "น้ำ", T[4]]),
				RN.rn_flag_tribes(fr, 2, "x"), RN.rn_flag_tribes(fr, 0, []), RN.rn_flag_tribes({"tribe": "น้ำ"}, 2, null)]
			return G.diff({"runeKind": kinds, "runeActive": act, "roundK": rk, "enemyMult": em, "flag": flag},
				{"runeKind": o["runeKind"], "runeActive": o["runeActive"], "roundK": o["roundK"], "enemyMult": o["enemyMult"], "flag": o["flag"]}, "")
		"boss":
			var b: Dictionary = o["b"]
			var k: float = o["k"]
			var x: float = o["extraPct"]
			return G.diff({"unit": B.boss_unit(b, k, x, o["g2"]), "at": S.boss_at(b, k, x, o["g2"]), "mults": S.boss_mults(b, k, x, o["g2"]), "heat": B.heat_rules(b, k, o["g2"])},
				{"unit": o["unit"], "at": o["at"], "mults": o["mults"], "heat": o["heat"]}, "")
		"runBoss":
			var p: Variant = RB.run_boss_at({"seed": o["seed"], "round": o["round"]})
			var got := {"pick": null, "team": null, "opts": null, "char": null}
			if p != null:
				got = {"pick": {"id": p["boss"]["id"], "k": p["k"]}, "team": RB.run_boss_team(p["boss"], p["k"], null, o["extra"]),
					"opts": RB.run_boss_opts(p["boss"]), "char": RB.run_boss_char(p["boss"], p["k"], null, o["extra"])}
				if R.js_seq(RB.run_boss_by_id(p["boss"]["id"]), null):
					return "run_boss_by_id lost " + str(p["boss"]["id"])
			return G.diff(got, {"pick": o["pick"], "team": o["team"], "opts": o["opts"], "char": o["char"]}, "")
		"equip":
			var res := RN.equip_runes(o["units"], o["equips"], o["ctx"])
			return G.diff(res, o["res"], "res")
		"record":
			var got := []
			for id in o["ids"]:
				got.append(RN.rune_record(o["stage"], id))
			got.append(RN.rune_record(null, "T1"))
			got.append(RN.rune_record({"custom": o["stage"]["custom"]}, "K1"))
			got.append(RN.rune_record({}, "T1"))
			return G.diff(got, o["got"], "got")
		"dummy":
			var res: Dictionary = o["res"]
			return G.diff([RB.dummy_score(res), RB.dummy_score(null), RB.dummy_score({}), RB.dummy_score({"units": []})], o["score"], "score")
	return "unknown kind " + str(o["kind"])

func _with(a: Dictionary, b: Dictionary) -> Dictionary:
	var c := a.duplicate()
	c.merge(b, true)
	return c
