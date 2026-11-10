# Seeded RNG — exact port of src/core/rng.js (set 193, plan P1 step 4).
# JS works on 32-bit ints (Math.imul, >>> 0); GDScript ints are 64-bit, so every value is
# kept as an unsigned 32-bit int (masked with 0xFFFFFFFF) and imul is emulated.
# Parity check: tests/test_rng.gd vs golden rng.json (5 seeds × 10,000 values, exact).
extends RefCounted

const M32 := 0xFFFFFFFF

var _a: int

# seed: any int; the JS core does (seed >>> 0) || 1.
func _init(seed: int) -> void:
	_a = u32(seed)
	if _a == 0:
		_a = 1

# Same as JS `x >>> 0` for an int.
static func u32(x: int) -> int:
	return x & M32

# Same as JS `Math.imul(a, b) >>> 0` (low 32 bits of the product, unsigned).
# Split b into 16-bit halves so no product exceeds 2^48 (no 64-bit overflow).
static func imul(a: int, b: int) -> int:
	a &= M32
	b &= M32
	var lo := a * (b & 0xFFFF)
	var hi := (a * (b >> 16)) & 0xFFFF
	return (lo + (hi << 16)) & M32

# Same as JS next(): float in [0, 1).
func next() -> float:
	_a = (_a + 0x6D2B79F5) & M32
	var x := _a
	x = imul(x ^ (x >> 15), x | 1)
	x = (x ^ ((x + imul(x ^ (x >> 7), x | 61)) & M32)) & M32
	return float((x ^ (x >> 14)) & M32) / 4294967296.0

# Same as JS int(n): floor(next() * n).
func int_below(n: int) -> int:
	return int(floor(next() * n))

# Same as JS pick(arr).
func pick(arr: Array) -> Variant:
	return arr[int(floor(next() * arr.size()))]
