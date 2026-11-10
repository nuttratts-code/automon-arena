# Golden fixture helpers (set 194, plan P2 step 5, user pick A1).
# golden.mjs v2 writes every non-integer number in battles/runs as {"$f": "<16 hex digits>"} = the exact
# IEEE-754 bits (big-endian) of the JS double, because Godot's text→float parse can be 1 ulp off (set 193).
# decode() turns those back into the exact float; diff() compares a Godot result with the JS one exactly
# and returns "" when equal, else the path of the first difference (+ both values).
# Integers stay plain JSON numbers: Godot parses them as float, exact up to 2^53, so int == float compares are exact.
extends RefCounted

static func bits_to_float(hex: String) -> float:
	var b := hex.hex_decode()
	b.reverse()  # file is big-endian, decode_double reads little-endian
	return b.decode_double(0)

static func decode(v: Variant) -> Variant:
	if v is Dictionary:
		if v.size() == 1 and v.has("$f") and v["$f"] is String:
			return bits_to_float(v["$f"])
		var o := {}
		for k in v:
			o[k] = decode(v[k])
		return o
	if v is Array:
		var a := []
		for x in v:
			a.append(decode(x))
		return a
	return v

static func _is_num(v: Variant) -> bool:
	return v is int or v is float

# got = Godot value, want = decoded JS value. Dict key order does not matter; array order does.
static func diff(got: Variant, want: Variant, path: String = "") -> String:
	if _is_num(got) and _is_num(want):
		return "" if float(got) == float(want) else "%s: Godot %s ≠ JS %s" % [path, var_to_str(got), var_to_str(want)]
	if got is Dictionary and want is Dictionary:
		for k in want:
			if not got.has(k):
				return "%s.%s: missing in Godot (JS %s)" % [path, k, var_to_str(want[k]).left(80)]
		for k in got:
			if not want.has(k):
				return "%s.%s: extra in Godot (%s)" % [path, k, var_to_str(got[k]).left(80)]
			var d := diff(got[k], want[k], "%s.%s" % [path, k])
			if d != "":
				return d
		return ""
	if got is Array and want is Array:
		for i in mini(got.size(), want.size()):
			var d := diff(got[i], want[i], "%s[%d]" % [path, i])
			if d != "":
				return d
		return "" if got.size() == want.size() else "%s: length Godot %d ≠ JS %d" % [path, got.size(), want.size()]
	if typeof(got) == typeof(want) and got == want:
		return ""
	return "%s: Godot %s ≠ JS %s" % [path, var_to_str(got).left(80), var_to_str(want).left(80)]
