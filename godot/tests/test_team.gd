# set 195 (plan step 6a): team.gd · power.gd · validate.gd · characters.gd vs golden (d) teams.jsonl
# (cd src && node lab/golden.mjs → lab/golden-teams.mjs). Every value compared exactly (golden_util.diff).
extends RefCounted

const R := preload("res://scripts/rules.gd")
const T := preload("res://scripts/team.gd")
const P := preload("res://scripts/power.gd")
const V := preload("res://scripts/validate.gd")
const C := preload("res://scripts/characters.gd")
const G := preload("res://tests/golden_util.gd")
const FILE := "res://tests/golden/teams.jsonl"

var _opts := {}

func setup(opts: Dictionary) -> void:
	_opts = opts

func test_character_list_matches_derived() -> String:
	var d := G.diff(C.build_character_list(), R.game()["derived"]["characters"], "chars")
	return "ok" if d == "" else d

func test_golden_teams_exact() -> String:
	if not FileAccess.file_exists(FILE):
		if _opts.get("require_golden", false):
			return "golden teams.jsonl missing (run: cd src && node lab/golden.mjs)"
		print("  skip: no golden teams.jsonl (cd src && node lab/golden.mjs)")
		return "ok"
	var chars: Array = R.game()["derived"]["characters"]
	var cm := T.make_char_map(chars)
	var fa := FileAccess.open(FILE, FileAccess.READ)
	var n := {"basePower": 0, "config": 0, "team": 0}
	var fails := 0
	var first := ""
	while not fa.eof_reached():
		var line := fa.get_line()
		if line == "":
			continue
		var o: Dictionary = G.decode(JSON.parse_string(line))
		var d := _check(o, chars, cm)
		n[o["kind"]] += 1
		if d != "":
			fails += 1
			if first == "":
				first = "%s %s: %s" % [o["kind"], o.get("what", o.get("i", "")), d]
	print("  teams.jsonl: basePower %d · config %d · team %d · fails %d" % [n.basePower, n.config, n.team, fails])
	if n.team == 0 or n.config == 0 or n.basePower == 0:
		return "teams.jsonl has a missing kind %s" % [n]
	return "ok" if fails == 0 else "%d lines differ · first: %s" % [fails, first]

func _check(o: Dictionary, chars: Array, cm: Dictionary) -> String:
	match o["kind"]:
		"basePower":
			var got := []
			for c in chars:
				for L in 3:
					var b := P.base_power(c, L)
					got.append([c["id"], float(L), b["dps"], b["ehp"], b["points"]])
			return G.diff(got, o["rows"], "rows")
		"config":
			return G.diff(V.validate_config(o["chars"], o.get("rules", {})), o["res"], "res")
		"team":
			var rules := R.RULES()
			if o.get("caps") != null:
				rules = rules.duplicate()
				rules["permCaps"] = o["caps"]
			var check := V.validate_team(o["entries"], cm, rules)
			var d := G.diff(check, o["check"], "check")
			if d != "":
				return d
			var units: Variant = null
			var power := 0.0
			var counts: Variant = null
			var steps: Variant = null
			if check["ok"]:
				units = T.build_team(o["entries"], cm, rules)
				power = P.team_power(units, rules)
				counts = T.count_tribes(o["entries"], cm)
				steps = T.tribe_steps(counts, rules)
			else:
				var bad: Variant = T.build_team(o["entries"], cm, rules)
				if not (bad is Dictionary and bad.has("error")):
					return "build_team accepted a bad team"
			return G.diff({"units": units, "power": power, "counts": counts, "steps": steps},
				{"units": o["units"], "power": o["power"], "counts": o["counts"], "steps": o["steps"]}, "")
	return "unknown kind " + str(o["kind"])
