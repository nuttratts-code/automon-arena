# set 194 (A1): golden {"$f"} bit decoding is exact · diff() finds the first difference.
# Bit strings computed with node (golden.mjs exactNums) — works without golden files.
extends RefCounted

const G := preload("res://tests/golden_util.gd")

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
