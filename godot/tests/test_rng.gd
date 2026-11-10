# P1 step 4 (set 193): scripts/rng.gd must match src/core/rng.js exactly.
# Golden (a) = tests/golden/rng.json (cd src && node lab/golden.mjs): 5 seeds × 10,000 next() values.
# Every next() value is exactly k / 2^32 (k = uint32), so the golden check compares k.
# Why not the floats: Godot's text→float parse (JSON, to_float, str_to_var) can be 1 ulp off
# (set 193: seed 0 #1, JS 0.002735721180215478 parsed as a different double; rng.gd itself
# gives the exact JS value). round(parsed × 2^32) recovers k exactly.
extends RefCounted

const Rng := preload("res://scripts/rng.gd")
const RNG_JSON := "res://tests/golden/rng.json"

var _opts := {}

func setup(opts: Dictionary) -> void:
	_opts = opts

# Fixed values computed with node (Math.imul(a, b) >>> 0) — works without golden files.
func test_imul_matches_js() -> String:
	var cases := [[0, 0, 0], [1, 4294967295, 4294967295], [4294967295, 4294967295, 1],
		[2654435761, 123456789, 2146089093], [2654435761, 7, 1401181143], [2246822507, 3000000000, 1900235264]]
	for c in cases:
		var got := Rng.imul(c[0], c[1])
		if got != c[2]:
			return "imul(%d, %d) = %d, JS = %d" % [c[0], c[1], got, c[2]]
	return "ok"

# int() and the (seed >>> 0) step, values from node: makeRng(4242).int(7) ×20 · makeRng(-5).next().
func test_int_and_negative_seed() -> String:
	var want := [3, 1, 6, 3, 4, 2, 1, 2, 2, 4, 5, 5, 4, 6, 2, 5, 6, 1, 4, 0]
	var r = Rng.new(4242)
	for i in want.size():
		var got: int = r.int_below(7)
		if got != want[i]:
			return "int_below(7) #%d = %d, JS = %d" % [i, got, want[i]]
	var neg := int(Rng.new(-5).next() * 4294967296.0)
	if neg != 2078107854:
		return "seed -5 first next() k = %d, JS k = 2078107854 (0.48384718922898173 × 2^32)" % neg
	return "ok"

func test_golden_rng_exact() -> String:
	if not FileAccess.file_exists(RNG_JSON):
		if _opts.get("require_golden", false):
			return "golden rng.json missing (run: cd src && node lab/golden.mjs)"
		print("  skip: no golden rng.json (cd src && node lab/golden.mjs)")
		return "ok"
	var f := FileAccess.open(RNG_JSON, FileAccess.READ)
	var d: Variant = JSON.parse_string(f.get_as_text())
	if not d is Dictionary or not d.get("seeds") is Array or not d.get("values") is Dictionary:
		return "rng.json has the wrong shape"
	var n := int(d.get("n", 0))
	if d["seeds"].size() != 5 or n < 10000:
		return "rng.json: want 5 seeds × ≥10,000 values, got %d × %d" % [d["seeds"].size(), n]
	for s in d["seeds"]:
		var vals: Variant = d["values"].get(str(int(s)))
		if not vals is Array or vals.size() != n:
			return "rng.json: seed %d has no %d values" % [int(s), n]
		var r = Rng.new(int(s))
		for i in n:
			var got := int(r.next() * 4294967296.0)  # exact: next() = k / 2^32
			var want := int(round(float(vals[i]) * 4294967296.0))
			if got != want:
				return "seed %d value #%d: Godot k=%d ≠ JS k=%d (value = k / 2^32)" % [int(s), i, got, want]
	return "ok"
