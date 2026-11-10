# set 194 (A1): golden {"$f"} bit decoding is exact · diff() finds the first difference.
# Bit strings computed with node (golden.mjs exactNums) — works without golden files.
extends RefCounted

const G := preload("res://tests/golden_util.gd")

var _opts := {}

func setup(opts: Dictionary) -> void:
	_opts = opts

func test_bits_exact() -> String:
	var cases := [["3fee666666666666", 0.95], ["406719999999999a", 184.8], ["bff8000000000000", -1.5]]
	for c in cases:
		var got := G.bits_to_float(c[0])
		if got != c[1]:
			return "bits %s → %s, want %s" % [c[0], var_to_str(got), var_to_str(c[1])]
	# 0.1 + 0.2 = 0.30000000000000004 (bits 3fd3333333333334) ≠ 0.3: exact, not rounded
	if G.bits_to_float("3fd3333333333334") != 0.1 + 0.2 or G.bits_to_float("3fd3333333333334") == 0.3:
		return "0.1+0.2 bits not exact"
	return "ok"

func test_decode_and_diff() -> String:
	var want: Variant = G.decode(JSON.parse_string('{"a":[1,{"$f":"3fee666666666666"}],"b":"x"}'))
	if G.diff({"b": "x", "a": [1, 0.95]}, want) != "":
		return "equal values reported different: " + G.diff({"b": "x", "a": [1, 0.95]}, want)
	var d := G.diff({"b": "x", "a": [1, G.bits_to_float("3fee666666666667")]}, want)  # 1 ulp above 0.95 (a literal would itself parse imprecisely)
	if not d.begins_with(".a[1]"):
		return "1-ulp difference not found at .a[1]: " + d
	if G.diff({"a": [1, 0.95]}, want) == "" or G.diff({"a": [1], "b": "x"}, want) == "":
		return "missing key / short array not reported"
	return "ok"

# A1 guard: every non-integer value in data/game.json must parse to the exact JS double
# (golden gamefloats.json = [[path, bits]]). Short decimals parse fine today (519/519, set 194);
# this catches a future value Godot's parser misreads by 1 ulp.
func test_game_json_floats_exact() -> String:
	var gf_path := "res://tests/golden/gamefloats.json"
	if not FileAccess.file_exists(gf_path):
		if _opts.get("require_golden", false):
			return "golden gamefloats.json missing (run: cd src && node lab/golden.mjs)"
		print("  skip: no golden gamefloats.json (cd src && node lab/golden.mjs)")
		return "ok"
	var gd: Variant = JSON.parse_string(FileAccess.open("res://data/game.json", FileAccess.READ).get_as_text())
	var list: Variant = JSON.parse_string(FileAccess.open(gf_path, FileAccess.READ).get_as_text())
	if not gd is Dictionary or not list is Array or list.is_empty():
		return "game.json / gamefloats.json has the wrong shape"
	for p in list:
		var v: Variant = gd
		for k in p[0]:
			v = v[int(k)] if v is Array else v.get(k)
		if not (v is float) or v != G.bits_to_float(p[1]):
			return "game.json %s = %s, JS bits %s = %s (parse not exact → write it as bits)" % ["/".join(p[0]), var_to_str(v), p[1], var_to_str(G.bits_to_float(p[1]))]
	return "ok"
