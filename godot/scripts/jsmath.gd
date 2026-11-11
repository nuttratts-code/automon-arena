# JS Math.pow / `**` exactly as V8 computes it (set 195, step 6b). Godot's pow() is the C library's (glibc: nearly
# correctly rounded); V8 uses its own fdlibm-derived pow (src/base/ieee754.cc), which differs by 1 ulp in ~4 % of cases.
# This is a line-by-line port of that V8 function, incl. V8's own bracket in r = z*t1 / ((t1 - 2) - (w + z*w)).
# Source: V8 src/base/ieee754.cc pow() (BSD-3-Clause, Copyright the V8 project authors), adapted from fdlibm e_pow.c
# (Copyright (C) 1993-2004 Sun Microsystems, Inc.: "Permission to use, copy, modify, and distribute this software is
# freely granted, provided that this notice is preserved.") — credit kept in godot/README.md + game credits.
# Check: tests/test_stage.gd test_golden_stage_exact (misc.pow) (golden stage.jsonl misc.pow, 20,000+ cases) — exact bits.
extends RefCounted

static var _b := PackedByteArray([0, 0, 0, 0, 0, 0, 0, 0])

static func _hi(x: float) -> int:  # signed high word
	_b.encode_double(0, x)
	var h := _b.decode_u32(4)
	return h - 0x100000000 if h >= 0x80000000 else h

static func _lo(x: float) -> int:  # unsigned low word
	_b.encode_double(0, x)
	return _b.decode_u32(0)

static func _mk(h: int, l: int) -> float:
	_b.encode_u32(4, h & 0xFFFFFFFF)
	_b.encode_u32(0, l & 0xFFFFFFFF)
	return _b.decode_double(0)

static func _F(h: int, l: int) -> float:
	return _mk(h, l)

static var _C := {}
static func _c() -> Dictionary:
	if _C.is_empty():
		_C = {"dp_h1": _F(0x3FE2B803, 0x40000000), "dp_l1": _F(0x3E4CFDEB, 0x43CFD006),
			"L1": _F(0x3FE33333, 0x33333303), "L2": _F(0x3FDB6DB6, 0xDB6FABFF), "L3": _F(0x3FD55555, 0x518F264D),
			"L4": _F(0x3FD17460, 0xA91D4101), "L5": _F(0x3FCD864A, 0x93C9DB65), "L6": _F(0x3FCA7E28, 0x4A454EEF),
			"P1": _F(0x3FC55555, 0x5555553E), "P2": _F(0xBF66C16C, 0x16BEBD93), "P3": _F(0x3F11566A, 0xAF25DE2C),
			"P4": _F(0xBEBBBD41, 0xC5D26BF1), "P5": _F(0x3E663769, 0x72BEA4D0),
			"lg2": _F(0x3FE62E42, 0xFEFA39EF), "lg2_h": _F(0x3FE62E43, 0x00000000), "lg2_l": _F(0xBE205C61, 0x0CA86C39),
			"ovt": _F(0x3C971547, 0x652B82FE), "cp": _F(0x3FEEC709, 0xDC3A03FD), "cp_h": _F(0x3FEEC709, 0xE0000000),
			"cp_l": _F(0xBE3E2FE0, 0x145B01F5), "ivln2": _F(0x3FF71547, 0x652B82FE), "ivln2_h": _F(0x3FF71547, 0x60000000),
			"ivln2_l": _F(0x3E54AE0B, 0xF85DDF44)}
	return _C

static func js_pow(x: float, y: float) -> float:
	var C := _c()
	var huge := 1.0e300
	var tiny := 1.0e-300
	var hx := _hi(x)
	var lx := _lo(x)
	var hy := _hi(y)
	var ly := _lo(y)
	var ix := hx & 0x7fffffff
	var iy := hy & 0x7fffffff
	if (iy | ly) == 0:
		return 1.0
	if ix > 0x7ff00000 or (ix == 0x7ff00000 and lx != 0) or iy > 0x7ff00000 or (iy == 0x7ff00000 and ly != 0):
		return x + y
	var yisint := 0
	var k := 0
	var j := 0
	if hx < 0:
		if iy >= 0x43400000:
			yisint = 2
		elif iy >= 0x3ff00000:
			k = (iy >> 20) - 0x3ff
			if k > 20:
				j = ly >> (52 - k)
				if ((j << (52 - k)) & 0xFFFFFFFF) == ly:
					yisint = 2 - (j & 1)
			elif ly == 0:
				j = iy >> (20 - k)
				if (j << (20 - k)) == iy:
					yisint = 2 - (j & 1)
	if ly == 0:
		if iy == 0x7ff00000:  # y is +-inf
			if ((ix - 0x3ff00000) | lx) == 0:
				return y - y
			elif ix >= 0x3ff00000:
				return y if hy >= 0 else 0.0
			else:
				return -y if hy < 0 else 0.0
		if iy == 0x3ff00000:
			return 1.0 / x if hy < 0 else x
		if hy == 0x40000000:
			return x * x
		if hy == 0x3fe00000 and hx >= 0:
			return sqrt(x)
	var ax := absf(x)
	var z: float
	if lx == 0 and (ix == 0x7ff00000 or ix == 0 or ix == 0x3ff00000):
		z = ax
		if hy < 0:
			z = 1.0 / z
		if hx < 0:
			if ((ix - 0x3ff00000) | yisint) == 0:
				z = NAN
			elif yisint == 1:
				z = -z
		return z
	var n := (hx >> 31) + 1
	if (n | yisint) == 0:
		return NAN
	var s := 1.0
	if (n | (yisint - 1)) == 0:
		s = -1.0
	var t: float
	var t1: float
	var t2: float
	var u: float
	var v: float
	var w: float
	var r: float
	if iy > 0x41e00000:  # |y| > 2**31
		if iy > 0x43f00000:
			if ix <= 0x3fefffff:
				return huge * huge if hy < 0 else tiny * tiny
			if ix >= 0x3ff00000:
				return huge * huge if hy > 0 else tiny * tiny
		if ix < 0x3fefffff:
			return s * huge * huge if hy < 0 else s * tiny * tiny
		if ix > 0x3ff00000:
			return s * huge * huge if hy > 0 else s * tiny * tiny
		t = ax - 1.0
		w = (t * t) * (0.5 - t * (0.3333333333333333333333 - t * 0.25))
		u = C.ivln2_h * t
		v = t * C.ivln2_l - w * C.ivln2
		t1 = _mk(_hi(u + v), 0)
		t2 = v - (t1 - u)
	else:
		n = 0
		if ix < 0x00100000:
			ax *= 9007199254740992.0
			n -= 53
			ix = _hi(ax)
		n += (ix >> 20) - 0x3ff
		j = ix & 0x000fffff
		ix = j | 0x3ff00000
		if j <= 0x3988E:
			k = 0
		elif j < 0xBB67A:
			k = 1
		else:
			k = 0
			n += 1
			ix -= 0x00100000
		ax = _mk(ix, _lo(ax))
		var bp := 1.5 if k == 1 else 1.0
		var dp_h: float = C.dp_h1 if k == 1 else 0.0
		var dp_l: float = C.dp_l1 if k == 1 else 0.0
		u = ax - bp
		v = 1.0 / (ax + bp)
		var ss := u * v
		var s_h := _mk(_hi(ss), 0)
		var t_h := _mk(((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18), 0)
		var t_l := ax - (t_h - bp)
		var s_l := v * ((u - s_h * t_h) - s_h * t_l)
		var s2 := ss * ss
		r = s2 * s2 * (C.L1 + s2 * (C.L2 + s2 * (C.L3 + s2 * (C.L4 + s2 * (C.L5 + s2 * C.L6)))))
		r += s_l * (s_h + ss)
		s2 = s_h * s_h
		t_h = _mk(_hi(3.0 + s2 + r), 0)
		t_l = r - ((t_h - 3.0) - s2)
		u = s_h * t_h
		v = s_l * t_h + t_l * ss
		var p_h0 := _mk(_hi(u + v), 0)
		var p_l0 := v - (p_h0 - u)
		var z_h: float = C.cp_h * p_h0
		var z_l: float = C.cp_l * p_h0 + p_l0 * C.cp + dp_l
		t = float(n)
		t1 = _mk(_hi(((z_h + z_l) + dp_h) + t), 0)
		t2 = z_l - (((t1 - t) - dp_h) - z_h)
	var y1 := _mk(hy, 0)
	var p_l := (y - y1) * t1 + y * t2
	var p_h := y1 * t1
	z = p_l + p_h
	j = _hi(z)
	var i := _lo(z)
	if j >= 0x40900000:
		if ((j - 0x40900000) | i) != 0:
			return s * huge * huge
		if p_l + C.ovt > z - p_h:
			return s * huge * huge
	elif (j & 0x7fffffff) >= 0x4090cc00:
		if ((j - (0xc090cc00 - 0x100000000)) | i) != 0:
			return s * tiny * tiny
		if p_l <= z - p_h:
			return s * tiny * tiny
	i = j & 0x7fffffff
	k = (i >> 20) - 0x3ff
	n = 0
	if i > 0x3fe00000:
		n = j + (0x00100000 >> (k + 1))
		k = ((n & 0x7fffffff) >> 20) - 0x3ff
		t = _mk(n & ~(0x000fffff >> k), 0)
		n = ((n & 0x000fffff) | 0x00100000) >> (20 - k)
		if j < 0:
			n = -n
		p_h -= t
	t = _mk(_hi(p_l + p_h), 0)
	u = t * C.lg2_h
	v = (p_l - (t - p_h)) * C.lg2 + t * C.lg2_l
	z = u + v
	w = v - (z - u)
	t = z * z
	t1 = z - t * (C.P1 + t * (C.P2 + t * (C.P3 + t * (C.P4 + t * C.P5))))
	r = (z * t1) / ((t1 - 2.0) - (w + z * w))  # V8's bracket (fdlibm: (z*t1)/(t1-2) - (w+z*w))
	z = 1.0 - (r - z)
	j = _hi(z) + n * 1048576
	if (j >> 20) <= 0:
		return s * (z * pow(2.0, float(n)))  # subnormal output (exact power-of-two scaling; never reached by game values)
	return s * _mk(j, _lo(z))

# JS Math.log exactly as V8 computes it (set 195, step 6e, user OK A1): line-by-line port of V8 src/base/ieee754.cc log()
# = fdlibm e_log.c (same source + licence + credit as js_pow above). Godot's log() (C library) differs by 1 ulp in ~3 % of cases.
# Check: tests/test_bot.gd (golden bot.jsonl misc.log, 250,000+ cases) — exact bits.
static var _LC := {}
static func js_log(x: float) -> float:
	if _LC.is_empty():
		_LC = {"ln2_hi": _F(0x3FE62E42, 0xFEE00000), "ln2_lo": _F(0x3DEA39EF, 0x35793C76), "two54": _F(0x43500000, 0),
			"Lg1": _F(0x3FE55555, 0x55555593), "Lg2": _F(0x3FD99999, 0x9997FA04), "Lg3": _F(0x3FD24924, 0x94229359),
			"Lg4": _F(0x3FCC71C5, 0x1D8E78AF), "Lg5": _F(0x3FC74664, 0x96CB03DE), "Lg6": _F(0x3FC39A09, 0xD078C69F),
			"Lg7": _F(0x3FC2F112, 0xDF3E5244)}
	var C := _LC
	var hx := _hi(x)
	var lx := _lo(x)
	var k := 0
	if hx < 0x00100000:  # x < 2**-1022
		if ((hx & 0x7fffffff) | lx) == 0:
			return -INF  # log(+-0) = -inf
		if hx < 0:
			return NAN  # log(-#) = NaN
		k -= 54
		x *= C["two54"]  # subnormal number, scale up x
		hx = _hi(x)
	if hx >= 0x7ff00000:
		return x + x
	k += (hx >> 20) - 1023
	hx &= 0x000fffff
	var i := (hx + 0x95f64) & 0x100000
	x = _mk(hx | (i ^ 0x3ff00000), _lo(x))  # normalize x or x/2
	k += (i >> 20)
	var f := x - 1.0
	var dk := float(k)
	if (0x000fffff & (2 + hx)) < 3:  # -2**-20 <= f < 2**-20
		if f == 0.0:
			return 0.0 if k == 0 else dk * C["ln2_hi"] + dk * C["ln2_lo"]
		var R0 := f * f * (0.5 - 0.33333333333333333 * f)
		return f - R0 if k == 0 else dk * C["ln2_hi"] - ((R0 - dk * C["ln2_lo"]) - f)
	var s := f / (2.0 + f)
	var z := s * s
	i = hx - 0x6147a
	var w := z * z
	var j := 0x6b851 - hx
	var t1: float = w * (C["Lg2"] + w * (C["Lg4"] + w * C["Lg6"]))
	var t2: float = z * (C["Lg1"] + w * (C["Lg3"] + w * (C["Lg5"] + w * C["Lg7"])))
	i |= j
	var R := t2 + t1
	if i > 0:
		var hfsq := 0.5 * f * f
		if k == 0:
			return f - (hfsq - s * (hfsq + R))
		return dk * C["ln2_hi"] - ((hfsq - (s * (hfsq + R) + dk * C["ln2_lo"])) - f)
	if k == 0:
		return f - s * (f - R)
	return dk * C["ln2_hi"] - ((s * (f - R) - dk * C["ln2_lo"]) - f)
