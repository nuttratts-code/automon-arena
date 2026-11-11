# src/core/runlog.js port (set 195 step 6f) — the run journal: every action that changes the player's run state, in order,
# with gold before → after. A run is deterministic from its seed, so replaying the journal on new_run(seed) rebuilds every step.
# Entry = [type, sec, goldBefore, goldAfter, ...args] · slot refs as text: "B3" bench 3 · "F10" board row 1 lane 0 · "-" none.
# Check: tests/test_save.gd vs golden save.jsonl (src/lab/golden-save.mjs). A change in runlog.js must be made here too.
# Security ③: rl_check validates a journal from outside (save, db, pasted code) entry by entry before it is replayed.
# JS undefined (rlUnref of an unknown ref) = false here (null stays null); shop functions treat both as "not a ref".
extends RefCounted

const R := preload("res://scripts/rules.gd")
const SH := preload("res://scripts/shop.gd")
const RR := preload("res://scripts/runrunes.gd")

const RLOG_VERSION := 1.0
const RLOG_MAX := 20000
const RLOG_PART := 2500
const RL_TYPES := {"st": 0, "by": 2, "sl": 1, "rr": 0, "lk": 1, "bm": 2, "mv": 2, "en": 3, "of": 1, "tk": 1, "or": 0, "sk": 0, "ht": 0, "pl": 3, "ex": 0}
const RL_TH := {"st": "เริ่มรอบ", "by": "ซื้อ", "sl": "ขาย", "rr": "สุ่มร้าน", "lk": "ล็อก/ปลดล็อก", "bm": "ซื้อ+รวมร่าง", "mv": "ย้าย/รวมร่าง", "en": "จบแมตช์", "of": "ได้การ์ดรูน", "tk": "เลือกรูน", "or": "สุ่มการ์ดรูน", "sk": "ไม่รับรูน", "ht": "แลกหัวใจ", "pl": "วางรูน", "ex": "เล่นต่อแมตช์พิเศษ"}
# JS `t in RL_TYPES` also finds what every object inherits (port trap: 'toString' in {} is true)
const OBJ_PROTO := ["constructor", "toString", "toLocaleString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "__proto__", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__"]
const RL_NAME_MAX := 20
const UNDEF := false

static var _re := {}

static func _rx(p: String) -> RegEx:
	if not _re.has(p):
		_re[p] = RegEx.create_from_string(p)
	return _re[p]

static func rx_ok(p: String, s: Variant) -> bool:
	return s is String and _rx(p).search(s) != null

static func _at(a: Array, i: int) -> Variant:
	return a[i] if i < a.size() else null

# JS property key of x (String(x) for JSON values)
static func _key(x: Variant) -> String:
	return x if x is String else R.js_str(x)

static func _rl_has(t: Variant) -> bool:
	var k := _key(t)
	return RL_TYPES.has(k) or OBJ_PROTO.has(k)

# JS String.prototype.trim: WhiteSpace + LineTerminator
const _WS := [0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0xA0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF]
static func js_trim(s: String) -> String:
	var a := 0
	var b := s.length()
	while a < b and _WS.has(s.unicode_at(a)):
		a += 1
	while b > a and _WS.has(s.unicode_at(b - 1)):
		b -= 1
	return s.substr(a, b - a)

static func rl_ref(r: Variant) -> String:
	if not (r is Dictionary):  # JS: !r → '-' · any other non-object has no .at → '-'
		return "-"
	if R.js_seq(r.get("at"), "bench"):
		return "B" + R.js_str_of(r, "i")
	if R.js_seq(r.get("at"), "board"):
		return "F" + R.js_str_of(r, "row") + R.js_str_of(r, "lane")
	return "-"

# → null ("-") · {at, ...} · UNDEF (false) when the text is not a ref
static func rl_unref(x: Variant) -> Variant:
	if R.js_seq(x, "-"):
		return null
	var s := _key(x)
	var m := _rx("^B(\\d{1,2})\\z").search(s)
	if m != null:
		return {"at": "bench", "i": float(m.get_string(1).to_int())}
	m = _rx("^F([0-2])([0-1])\\z").search(s)
	if m != null:
		return {"at": "board", "row": float(m.get_string(1).to_int()), "lane": float(m.get_string(2).to_int())}
	return UNDEF

# player name: no control / invisible / bidi marks, spaces squeezed, ≤ RL_NAME_MAX characters · '' = no name
static func rl_name(s: Variant) -> String:
	if not (s is String):
		return ""
	var t: String = _rx("[\\x{0}-\\x{1f}\\x{7f}-\\x{9f}\\x{ad}\\x{200b}-\\x{200f}\\x{2028}-\\x{202e}\\x{2060}-\\x{206f}\\x{feff}\\x{fff0}-\\x{ffff}]").sub(s, "", true)
	t = js_trim(_rx("[\\t\\n\\x{b}\\f\\r \\x{a0}\\x{1680}\\x{2000}-\\x{200a}\\x{2028}\\x{2029}\\x{202f}\\x{205f}\\x{3000}\\x{feff}]+").sub(t, " ", true))
	return js_trim(t.substr(0, RL_NAME_MAX))

static func new_run_log(seed: Variant, hash: String, at: float, name: Variant = "") -> Dictionary:
	var L := {"v": RLOG_VERSION, "seed": float(int(float(seed)) & 0xFFFFFFFF), "data": hash, "at": floorf(at), "cut": 0.0, "ev": []}
	var nm := rl_name(name)
	if nm != "":
		L["nm"] = nm
	return L

# add one entry · now = ms clock · false when the journal is full (cut set)
static func rl_push(log: Variant, type: Variant, args: Array, g0: Variant, g1: Variant, now: float) -> bool:
	if not SH._truthy(log) or not _rl_has(type):
		return false
	if log["ev"].size() >= RLOG_MAX:
		log["cut"] = 1.0
		return false
	var e := [type, maxf(0.0, floorf((now - float(log["at"])) / 1000.0)), g0, g1]
	e.append_array(args)
	log["ev"].append(e)
	return true

static func rl_gains(gains: Variant) -> Array:
	var out := []
	if gains is Array:
		for g in gains.slice(0, 200):
			var d: Dictionary = g if g is Dictionary else {}
			out.append([d.get("id"), d.get("key"), d.get("row"), d.get("lane"), d.get("amount")])
	return out

# ---------- check (external data) ----------
static func _int(x: Variant, lo: float, hi: float) -> bool:
	return R.is_int(x) and float(x) >= lo and float(x) <= hi

static func _gold(x: Variant) -> bool:
	return _int(x, -1e6, 1e7)

static func _slot(x: Variant) -> bool:
	return _int(x, 0.0, 20.0)

static func _ref(x: Variant) -> bool:
	return x is String and not (rl_unref(x) is bool)

static func _args_ok(e: Array) -> bool:
	var t: Variant = e[0]
	var a := e.slice(4)
	var n: Variant = RL_TYPES.get(_key(t))
	if (n == null or a.size() != n) and not (R.js_seq(t, "tk") and a.size() == 2 and a[1] is String and R.mod("rules")["TRIBES"].has(a[1])):
		return false
	if not (t is String):
		return true
	match t:
		"by", "bm":
			return _slot(a[0]) and _ref(a[1])
		"sl":
			return _ref(a[0]) and a[0] != "-"
		"mv":
			return _ref(a[0]) and _ref(a[1]) and a[0] != "-" and a[1] != "-"
		"lk", "tk":
			return _slot(a[0])
		"of":
			return R.js_seq(a[0], "win") or R.js_seq(a[0], "boss") or R.js_seq(a[0], "sc")
		"en":
			if not ((R.js_seq(a[0], 0.0) or R.js_seq(a[0], 1.0)) and (R.js_seq(a[1], 0.0) or R.js_seq(a[1], 1.0)) and a[2] is Array and a[2].size() <= 200):
				return false
			for g in a[2]:
				if not (g is Array and g.size() == 5 and rx_ok("^[A-Za-z0-9_-]{1,16}\\z", g[0]) and g[1] is String and SH.PERM_KEYS().has(g[1])
						and _int(g[2], 0.0, 2.0) and _int(g[3], 0.0, 1.0) and R.is_num(g[4])):
					return false
			return true
		"pl":
			return rx_ok("^[A-Za-z0-9_-]{1,24}\\z", a[0]) and _ref(a[1]) and (a[1] == "-" or a[1].substr(0, 1) == "F") and (R.js_seq(a[2], 0.0) or R.js_seq(a[2], 1.0))
	return true

const _LOG_KEYS := ["v", "seed", "data", "at", "cut", "ev", "nm"]
# true / reason text
static func rl_check(log: Variant) -> Variant:
	if not (log is Dictionary):
		return "not an object"
	for k in log:
		if not _LOG_KEYS.has(k):
			return "bad header"
	if not R.js_seq(log.get("v"), RLOG_VERSION):
		return "bad header"
	if log.has("nm") and (not (log["nm"] is String) or log["nm"] == "" or rl_name(log["nm"]) != log["nm"]):
		return "bad name"
	if not _int(log.get("seed"), 0.0, 4294967295.0) or not rx_ok("^[0-9a-f]{8}\\z", log.get("data")) or not _int(log.get("at"), 0.0, 1e15) \
			or not (R.js_seq(log.get("cut"), 0.0) or R.js_seq(log.get("cut"), 1.0)):
		return "bad header"
	if not (log.get("ev") is Array) or log["ev"].size() > RLOG_MAX:
		return "bad entries"
	var ev: Array = log["ev"]
	for i in ev.size():
		var e: Variant = ev[i]
		if not (e is Array) or e.is_empty() or not _rl_has(e[0]) or not _int(_at(e, 1), 0.0, 1e9) or not _gold(_at(e, 2)) or not _gold(_at(e, 3)) or not _args_ok(e):
			return "bad entry #%d" % (i + 1)
	return true

# ---------- replay ----------
# apply one entry to st → the action's result ({ok, msgs | msg} · 'of' → {ok, offer})
static func rl_apply(st: Dictionary, e: Array, chars: Array, rules: Dictionary = {}) -> Dictionary:
	var a := e.slice(4)
	var t: Variant = e[0]
	if not (t is String):
		return {"ok": false, "msg": "unknown"}
	match t:
		"st":
			return SH.start_round(st, chars, rules)
		"by":
			return SH.buy(st, _at(a, 0), rl_unref(_at(a, 1)), chars, rules)
		"sl":
			return SH.sell(st, rl_unref(_at(a, 0)), chars, rules)
		"rr":
			return SH.reroll(st, chars, rules)
		"lk":
			return SH.toggle_lock(st, _at(a, 0))
		"bm":
			return SH.buy_merge(st, _at(a, 0), rl_unref(_at(a, 1)), chars, rules)
		"mv":
			return SH.move(st, rl_unref(_at(a, 0)), rl_unref(_at(a, 1)), chars, rules)
		"en":
			var gains := []
			for g in a[2]:
				gains.append({"id": g[0], "key": g[1], "row": g[2], "lane": g[3], "amount": g[4], "side": 0.0})
			return SH.end_match(st, R.js_seq(a[0], 1.0), chars, rules, gains, R.js_seq(a[1], 1.0))
		"of":
			var o: Variant = RR.rn_make_offer(st, _at(a, 0))
			return {"ok": true, "msgs": [], "offer": o}
		"tk":
			return SH.take_rune(st, _at(a, 0), chars, rules, a[1] if _at(a, 1) is String else null)
		"or":
			return RR.rn_reroll_offer(st)
		"sk":
			return RR.rn_skip_offer(st)
		"ht":
			return RR.rn_heart_trade(st)
		"pl":
			var r: Variant = rl_unref(_at(a, 1))
			return RR.rn_place(st, _at(a, 0), [r.get("row"), r.get("lane")] if r is Dictionary else null, rules if not rules.is_empty() else R.RULES(), R.js_seq(_at(a, 2), 1.0))
		"ex":
			return SH.continue_extra(st, rules)
	return {"ok": false, "msg": "unknown"}

# replay a whole journal → {st, steps: [{e, before (state copy), gold, res, goldOk}], firstBad (index or -1)}
# keep = false skips the per-step state copies (fast check) · run rl_check first on a journal from outside
static func rl_replay(log: Dictionary, chars: Array, rules: Dictionary = {}, keep: bool = true) -> Dictionary:
	var st := SH.new_run(chars, log["seed"], rules)
	var steps := []
	var first_bad := -1
	var ev: Array = log["ev"]
	for i in ev.size():
		var e: Array = ev[i]
		var before: Variant = st.duplicate(true) if keep else null
		var g0: float = st["gold"]
		var res := rl_apply(st, e, chars, rules)
		var gold_ok := R.js_seq(g0, _at(e, 2)) and R.js_seq(st["gold"], _at(e, 3))
		if not gold_ok and first_bad < 0:
			first_bad = i
		steps.append({"e": e, "before": before, "gold": st["gold"], "res": res, "goldOk": gold_ok})
	return {"st": st, "steps": steps, "firstBad": first_bad}
