# set 194 (plan P2 steps 5c–5e): scripts/battle.gd vs golden (b) = every battle in tests/golden/battles-*.jsonl
# (cd src && node lab/golden.mjs). Each line: input units a/b + opts o + the JS result res (log + detail + live).
# Godot runs the same input with the same opts as golden.mjs BATTLE_OPTS and must give the exact same result
# (golden_util.diff: numbers compared exactly after decoding {"$f": bits}).
# Env BATTLE_LIMIT=n checks only the first n battles (dev speed); the gate/CI run checks all.
extends RefCounted

const Battle := preload("res://scripts/battle.gd")
const G := preload("res://tests/golden_util.gd")
const DIR := "res://tests/golden"
const BATTLE_OPTS := {"log": true, "detail": true, "live": true}  # = src/lab/golden.mjs BATTLE_OPTS

var _opts := {}

func setup(opts: Dictionary) -> void:
	_opts = opts

func test_golden_battles_exact() -> String:
	var files: Array[String] = []
	if DirAccess.dir_exists_absolute(DIR):
		for f in DirAccess.get_files_at(DIR):
			if f.begins_with("battles-") and f.ends_with(".jsonl"):
				files.append(f)
	files.sort()
	if files.is_empty():
		if _opts.get("require_golden", false):
			return "golden battles-*.jsonl missing (run: cd src && node lab/golden.mjs)"
		print("  skip: no golden battles (cd src && node lab/golden.mjs)")
		return "ok"
	var limit := int(OS.get_environment("BATTLE_LIMIT")) if OS.get_environment("BATTLE_LIMIT") != "" else -1
	var n := 0
	var fails := 0
	var first := ""
	var by_src := {}
	for fname in files:
		var fa := FileAccess.open(DIR + "/" + fname, FileAccess.READ)
		while not fa.eof_reached():
			var line := fa.get_line()
			if line == "":
				continue
			if limit >= 0 and n >= limit:
				break
			var rec: Variant = G.decode(JSON.parse_string(line))
			var o: Dictionary = rec.o.duplicate()
			o.merge(BATTLE_OPTS, true)
			var got := Battle.simulate(rec.a, rec.b, o)
			var d := G.diff(got, rec.res, "res")
			n += 1
			var src: String = rec.src
			if not by_src.has(src):
				by_src[src] = [0, 0]
			by_src[src][1] += 1
			if d == "":
				by_src[src][0] += 1
			else:
				fails += 1
				if first == "":
					first = "battle %d (%s): %s" % [int(rec.i), src, d]
	var summary := ", ".join(by_src.keys().map(func(k): return "%s %d/%d" % [k, by_src[k][0], by_src[k][1]]))
	print("  battles exact: %d/%d (%s)" % [n - fails, n, summary])
	if fails > 0:
		return "%d/%d battles differ · first: %s" % [fails, n, first]
	return "ok"
