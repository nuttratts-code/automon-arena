# set 195 (plan step 6c): runrunes.gd (+ shop.gd fail/done/lose_guard) vs golden runrunes.jsonl
# (cd src && node lab/golden.mjs → lab/golden-runrunes.mjs). Every value compared exactly (golden_util.diff).
# The board edits (move / sell / merge / toBoard) repeat src/lab/golden-runrunes.mjs applyAction — they stand in for shop.js (step 6d).
extends RefCounted

const R := preload("res://scripts/rules.gd")
const T := preload("res://scripts/team.gd")
const RR := preload("res://scripts/runrunes.gd")
const G := preload("res://tests/golden_util.gd")
const FILE := "res://tests/golden/runrunes.jsonl"

var _opts := {}
var _stages := []
var _cm := {}

func setup(opts: Dictionary) -> void:
	_opts = opts

func test_golden_runrunes_exact() -> String:
	if not FileAccess.file_exists(FILE):
		if _opts.get("require_golden", false):
			return "golden runrunes.jsonl missing (run: cd src && node lab/golden.mjs)"
		print("  skip: no golden runrunes.jsonl (cd src && node lab/golden.mjs)")
		return "ok"
	_cm = T.make_char_map(R.game()["derived"]["characters"])
	var fa := FileAccess.open(FILE, FileAccess.READ)
	var n := {"stages": 0, "all": 0, "seq": 0, "foe": 0, "compact": 0, "validate": 0}
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
	print("  runrunes.jsonl: %s · steps %d · fails %d" % [n, steps, fails])
	for k in n:
		if n[k] == 0:
			return "runrunes.jsonl has no %s lines" % k
	return "ok" if fails == 0 else "%d lines differ · first: %s" % [fails, first]

func _check(o: Dictionary) -> String:
	match o["kind"]:
		"stages":
			_stages = o["list"]
			return G.diff(_stages[0], R.mod("runboss")["RUN_STAGE"], "stage0")
		"all":
			var st2: Dictionary = _stages[2]
			var ids := []
			ids.append_array(R.mod("runboss")["RUN_STAGE"]["runes"].keys())
			ids.append_array(["K1", "K2", "ZZ", "", 5.0])
			var all := []
			var spec := []
			var needs := []
			for r in RR.rn_all():
				all.append(r["id"])
				var row := []
				for q in ["gold", "per", "cap", "mult", "pct", "nope"]:
					row.append(RR.rn_spec_num(r, q))
				spec.append(row)
				needs.append([RR.rn_needs_slot(r), RR.rn_needs_partner(r)])
			var all2 := []
			for r in RR.rn_all(st2):
				all2.append(r["id"])
			var recs := []
			var recs2 := []
			for id in ids:
				recs.append(RR.rn_rec(id))
				recs2.append(RR.rn_rec(id, st2))
			return G.diff({"all": all, "all2": all2, "recs": recs, "recs2": recs2, "spec": spec, "needs": needs},
				{"all": o["all"], "all2": o["all2"], "recs": o["recs"], "recs2": o["recs2"], "spec": o["spec"], "needs": o["needs"]}, "")
		"seq":
			var stage: Dictionary = _stages[int(o["sv"])]
			var st: Dictionary = o["st0"].duplicate(true)
			for k in o["steps"].size():
				var s: Dictionary = o["steps"][k]
				var res: Variant = _apply(st, s["a"], stage)
				var d := G.diff({"res": res, "st": _snap(st), "q": _queries(st, stage)}, {"res": s["res"], "st": s["st"], "q": s["q"]}, "step%d %s" % [k, s["a"][0]])
				if d != "":
					return d
			return ""
		"foe":
			var stage: Variant = null
			if o.get("grow") is Dictionary:
				stage = {"settings": o["grow"]}
			return G.diff(RR.rn_foe_scale(o["units"], o["pct"], stage, o["round"]), o["res"], "res")
		"compact":
			return G.diff({"ok": RR.rn_compact_ok(o["list"], R.RULES()), "from": RR.rn_from_compact(o["list"])}, {"ok": o["ok"], "from": o["from"]}, "")
		"validate":
			return G.diff(RR.rn_validate(o["rn"], R.RULES()), o["errors"], "errors")
	return "unknown kind " + str(o["kind"])

func _apply(st: Dictionary, a: Array, stage: Dictionary) -> Variant:
	var x: Variant = a[1] if a.size() > 1 else null
	var y: Variant = a[2] if a.size() > 2 else null
	var z: Variant = a[3] if a.size() > 3 else null
	var b: Array = st["board"]
	match a[0]:
		"offer": return {"offer": RR.rn_make_offer(st, x, stage, y)}
		"reroll": return RR.rn_reroll_offer(st, stage)
		"skip": return RR.rn_skip_offer(st)
		"take": return RR.rn_take_offer(st, x, stage, y)
		"place": return RR.rn_place(st, x, y, R.RULES(), z == true)
		"heart": return RR.rn_heart_trade(st, stage)
		"gold":
			st["gold"] = x
			return null
		"round":
			st["round"] = x
			st["rn"]["ro"] = 0.0
			st["rn"]["traded"] = false
			return null
		"move":
			var u: Variant = b[int(x[0])][int(x[1])]
			b[int(x[0])][int(x[1])] = b[int(y[0])][int(y[1])]
			b[int(y[0])][int(y[1])] = u
			RR.rn_sync(st)
			return null
		"sell":
			b[int(x[0])][int(x[1])] = null
			RR.rn_sync(st)
			return null
		"merge":
			var ua: Dictionary = b[int(x[0])][int(x[1])]
			var ub: Dictionary = b[int(y[0])][int(y[1])]
			b[int(y[0])][int(y[1])] = null
			var res := {"uid": st["uid"], "id": ua["id"], "level": minf(3.0, float(ua["level"]) + 1.0)}
			st["uid"] = float(st["uid"]) + 1.0
			b[int(x[0])][int(x[1])] = res
			RR.rn_sync(st, {"from": [ua["uid"], ub["uid"]], "to": res["uid"]})
			return null
		"toBoard":
			var u: Variant = st["bench"][int(x)]
			st["bench"][int(x)] = b[int(y[0])][int(y[1])]
			b[int(y[0])][int(y[1])] = u
			RR.rn_sync(st)
			return null
	return "unknown action " + str(a[0])

func _uids(row: Array) -> Array:
	var out := []
	for u in row:
		out.append(u["uid"] if u is Dictionary else null)
	return out

func _snap(st: Dictionary) -> Dictionary:
	var board := []
	for row in st["board"]:
		board.append(_uids(row))
	return {"rn": st["rn"], "gold": st["gold"], "hearts": st["hearts"], "sc": st["sc"], "board": board, "bench": _uids(st["bench"])}

func _queries(st: Dictionary, stage: Dictionary) -> Dictionary:
	var fx := RR.rn_fx(st, stage)
	var ids: Array = st["rn"]["bag"].keys()
	var perm := []
	for row in st["board"]:
		for u in row:
			if u is Dictionary:
				perm.append(RR.rn_perm_mul(st, u, stage))
	var wear := []
	var slots := []
	var held := []
	for id in ids:
		wear.append(RR.rn_wear(st, id, stage))
		slots.append([RR.rn_slot_of(st, id), RR.rn_slot_of(st, id, true)])
		held.append(RR.rn_held(st, id))
	return {"cost": RR.rn_reroll_cost(st, stage), "fx": fx,
		"intr": [RR.rn_interest(float(st["gold"]), fx), RR.rn_interest(0.0, fx), RR.rn_interest(-5.0, fx), RR.rn_interest(97.0, fx)],
		"wear": wear, "unworn": RR.rn_unworn(st, stage), "compact": RR.rn_compact(st), "equips": RR.rn_equips(st, stage),
		"perm": perm, "flag": RR.rn_flag_choices(st, _cm), "slots": slots, "held": held}
