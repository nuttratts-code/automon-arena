# src/core/runrunes.js port — runes inside the run (set 195, plan step 6c): offers (win / boss / second chance), reroll, take,
# skip, flag tribes, enemy scale, place on a unit, wear/sync, run-only effects (rnFx), heart trade, compact codes, save check.
# State lives in st["rn"] (plain data, saved with the run). Randomness = the run seed (own stream st.rn.n).
# Check: tests/test_runrunes.gd vs golden runrunes.jsonl (src/lab/golden-runrunes.mjs). A change in runrunes.js must be made here too.
# Security ③: rn_validate / rn_compact_ok check every saved / pasted value with the same rules + error text as JS.
extends RefCounted

const R := preload("res://scripts/rules.gd")
const S := preload("res://scripts/stage.gd")
const RN := preload("res://scripts/runes.gd")
const RB := preload("res://scripts/runboss.gd")
const SH := preload("res://scripts/shop.gd")
const Rng := preload("res://scripts/rng.gd")

const RN_OFFER_KEY := {"win": "Win", "boss": "Boss", "sc": "Sc"}
const RN_RARS := ["common", "rare", "legend"]
const RN_RAR_KEY := {"common": "C", "rare": "R", "legend": "L"}
const RN_MAX_HELD := 80

static func _stage(stage: Variant) -> Dictionary:
	return RB.RUN_STAGE() if stage == null else stage

static func _tribes() -> Array:
	return R.mod("rules")["TRIBES"]

static func _t(v: Variant) -> bool:
	return S._truthy(v)

# own random stream (st.rn.n) so rune rolls never shift the unit shop's rolls
static func _draw(st: Dictionary) -> float:
	st["rn"]["n"] = float(st["rn"]["n"]) + 1.0
	var seed := Rng.u32(int(float(st["seed"])))
	return Rng.new((seed ^ 0x52554E45 ^ Rng.imul(int(st["rn"]["n"]), 0x85EBCA77)) & Rng.M32).next()

static func new_runes() -> Dictionary:
	return {"n": 0.0, "bag": {}, "at": {}, "pt": {}, "ft": {}, "offer": null, "free": 0.0, "traded": false, "htu": 0.0, "shadow": 0.0, "ro": 0.0}

# rune record with its id · null = unknown / switched off / deleted
static func rn_rec(id: Variant, stage: Variant = null) -> Variant:
	if not (id is String):
		return null
	var r: Variant = RN.rune_record(_stage(stage), id)
	if r == null or not S.rune_active(r):
		return null
	var o: Dictionary = r.duplicate()
	o["id"] = id
	return o

static func rn_all(stage: Variant = null) -> Array:
	var sg := _stage(stage)
	var ids := []
	if sg.get("runes") is Dictionary:
		ids.append_array(sg["runes"].keys())
	if sg.get("custom") is Array:
		for c in sg["custom"]:
			ids.append(c.get("id"))
	var out := []
	for id in ids:
		var r: Variant = rn_rec(id, sg)
		if r != null:
			out.append(r)
	return out

static func rn_held(st: Variant, id: Variant) -> float:
	if not (st is Dictionary) or not (st.get("rn") is Dictionary) or not (id is String):
		return 0.0
	return float(R.js_i32(st["rn"]["bag"].get(id)))

static func rn_spec_num(r: Dictionary, q: String) -> Variant:
	var v: Variant = r.get(q)
	if v is float or v is int:
		return v
	var sp: Variant = S.M()["RUNE_SPEC"].get(r.get("eff")) if r.get("eff") is String else null
	if sp != null:
		for f in sp["f"]:
			if f[0] == q:
				return f[2]
	return 0.0

static func rn_needs_slot(r: Variant) -> bool:
	return r is Dictionary and r.get("scope") == "one"

static func rn_needs_partner(r: Variant) -> bool:
	return r is Dictionary and (r.get("eff") == "link" or r.get("eff") == "buddy")

static func _max_of(r: Dictionary) -> float:  # r.max || 1
	var m: Variant = r.get("max")
	return float(m) if _t(m) and R.is_num(m) else 1.0

static func _pool(st: Dictionary, rarity: Variant, stage: Dictionary, skip: Dictionary) -> Array:
	var out := []
	for r in rn_all(stage):
		if (rarity == null or r.get("rarity") == rarity) and rn_held(st, r["id"]) < _max_of(r) and not skip.has(r["id"]):
			out.append(r)
	return out

static func _pick_from(st: Dictionary, list: Array) -> Variant:
	return list[int(floorf(_draw(st) * list.size()))] if list.size() > 0 else null

# card rarity by RULES.runeOdds[round] (rounds past the table keep the last row)
static func _roll_rar(st: Dictionary) -> String:
	var rl := R.RULES()
	var T: Array = rl["runeOdds"]
	var n := maxi(1, mini(T.size(), R.js_i32(rl.get("runeOddsRounds"))))
	var i := maxi(1, mini(n, R.js_i32(st.get("round")))) - 1
	var o: Dictionary = T[i] if i < T.size() and T[i] is Dictionary else {}
	var w := []
	var tot := 0.0
	for r in RN_RARS:
		var x: Variant = o.get(r)
		var v := maxf(0.0, float(x) if R.is_num(x) else 0.0)
		w.append(v)
		tot += v
	if tot == 0.0:
		return RN_RARS[0]
	var x := _draw(st) * tot
	for j in w.size():
		if x < w[j]:
			return RN_RARS[j]
		x -= w[j]
	return RN_RARS[RN_RARS.size() - 1]

static func rn_make_offer(st: Dictionary, kind: Variant, stage: Variant = null, avoid: Variant = []) -> Variant:
	if not (st.get("rn") is Dictionary) or not (kind is String) or not RN_OFFER_KEY.has(kind):
		return null
	var sg := _stage(stage)
	var set: Dictionary = sg["settings"]
	var ids := []
	var skip := {}
	for id in (avoid if avoid is Array else []):
		skip[id] = true
	var rars := []
	if kind == "sc":
		for k in maxi(1, R.js_i32(set.get("offScL"))):
			rars.append("legend")
	elif kind == "boss":
		for rar in RN_RARS:
			for k in R.js_i32(set.get("offBoss" + RN_RAR_KEY[rar])):
				rars.append(rar)
	else:
		for k in maxi(1, R.js_i32(set.get("offCards"))):
			rars.append(_roll_rar(st))
	for rar in rars:
		var r: Variant = _pick_from(st, _pool(st, rar, sg, skip))
		if r == null:
			r = _pick_from(st, _pool(st, null, sg, skip))
		if r == null:
			var old := {}
			for id in ids:
				old[id] = true
			r = _pick_from(st, _pool(st, null, sg, old))  # reroll: old cards come back only when nothing else is left
		if r == null:
			break
		ids.append(r["id"])
		skip[r["id"]] = true
	st["rn"]["offer"] = {"kind": kind, "ids": ids} if ids.size() > 0 else null
	return st["rn"]["offer"]

static func rn_reroll_cost(st: Dictionary, stage: Variant = null) -> float:
	var set: Dictionary = _stage(stage)["settings"]
	var used := R.js_i32(st["rn"].get("ro")) if st.get("rn") is Dictionary else 0
	var free := maxi(0, R.js_i32(set.get("rrFree")))
	return 0.0 if used < free else float(maxi(0, R.js_i32(set.get("rrCost"))) + maxi(0, R.js_i32(set.get("rrStep"))) * (used - free))

static func rn_reroll_offer(st: Dictionary, stage: Variant = null) -> Dictionary:
	var o: Variant = st["rn"].get("offer") if st.get("rn") is Dictionary else null
	if not (o is Dictionary):
		return SH.fail("ไม่มีการ์ดรูนให้สุ่มใหม่")
	if o["kind"] == "sc":
		return SH.fail("การ์ดโอกาสสุดท้ายสุ่มใหม่ไม่ได้")
	var cost := rn_reroll_cost(st, stage)
	if float(st["gold"]) < cost:
		return SH.fail("เงินไม่พอ (ต้องใช้ %s)" % R.js_num(cost))
	st["gold"] = float(st["gold"]) - cost
	st["rn"]["ro"] = float(st["rn"]["ro"]) + 1.0
	if rn_make_offer(st, o["kind"], stage, o["ids"]) == null:
		st["rn"]["offer"] = o  # nothing at all left → keep the old cards
	return SH.done(["สุ่มการ์ดรูนใหม่ -%s เงิน" % R.js_num(cost) if cost != 0.0 else "สุ่มการ์ดรูนใหม่ (ฟรี)"])

# tribe = flag runes only: the tribe this copy counts · not a valid tribe = the rune record's tribe
static func rn_take_offer(st: Dictionary, i: Variant, stage: Variant = null, tribe: Variant = null) -> Dictionary:
	var o: Variant = st["rn"].get("offer") if st.get("rn") is Dictionary else null
	if not (o is Dictionary) or not R.is_int(i) or float(i) < 0.0 or float(i) >= o["ids"].size():
		return SH.fail("ไม่มีรูนให้เลือก")
	var r: Variant = rn_rec(o["ids"][int(i)], stage)
	st["rn"]["offer"] = null
	if r == null or rn_held(st, r["id"]) >= _max_of(r):
		return SH.fail("รูนนี้ใช้ไม่ได้แล้ว")
	_add(st, r)
	var tr := ""
	if r.get("eff") == "flag":
		var T := _tribes()
		var t: Variant = tribe if T.has(tribe) else (r.get("tribe") if T.has(r.get("tribe")) else T[0])
		if not _t(st["rn"].get("ft")):
			st["rn"]["ft"] = {}
		if not st["rn"]["ft"].has(r["id"]) or not _t(st["rn"]["ft"][r["id"]]):
			st["rn"]["ft"][r["id"]] = []
		st["rn"]["ft"][r["id"]].append(t)
		tr = " (เผ่า%s)" % t
	var h := rn_held(st, r["id"])
	return SH.done(["ได้รูน %s%s%s" % [R.js_str_of(r, "name"), tr, " (มี %s อัน)" % R.js_num(h) if h > 1.0 else ""]])

# tribes a flag rune may pick: tribes of the board units (extra tribes count) · empty board = every tribe
static func rn_flag_choices(st: Variant, cm: Dictionary) -> Array:
	var seen := {}
	if st is Dictionary and st.get("board") is Array:
		for row in st["board"]:
			for u in row:
				if u is Dictionary and cm.has(u.get("id")):
					var c: Dictionary = cm[u["id"]]
					seen[c["tribe"]] = true
					for t in (c["extraTribes"] if c.get("extraTribes") is Array else []):
						seen[t] = true
	var out := []
	for t in _tribes():
		if seen.has(t):
			out.append(t)
	return out if out.size() > 0 else _tribes().duplicate()

static func rn_flag_picks(st: Variant, id: Variant) -> Array:
	if st is Dictionary and st.get("rn") is Dictionary and st["rn"].get("ft") is Dictionary and st["rn"]["ft"].get(id) is Array:
		return st["rn"]["ft"][id]
	return []

static func rn_skip_offer(st: Dictionary) -> Dictionary:
	if st.get("rn") is Dictionary:
		st["rn"]["offer"] = null
	return SH.done()

static func _add(st: Dictionary, r: Dictionary) -> void:
	st["rn"]["bag"][r["id"]] = rn_held(st, r["id"]) + 1.0

# ---------- enemy scale ----------
static func rn_foe_scale(units: Array, pct: Variant = 100.0, stage: Variant = null, round: Variant = 0.0) -> Array:
	var sg := _stage(stage)
	var p := (float(pct) if (pct is float or pct is int) and float(pct) > 0.0 else 100.0) * S.enemy_mult_at(sg["settings"], float(R.js_i32(round)))
	if p == 100.0:
		return units
	var out := []
	for u in units:
		out.append(_scale(u, p))
	return out

static func _scale(u: Dictionary, p: float) -> Dictionary:
	var o: Dictionary = u.duplicate()
	o["maxHp"] = maxf(1.0, floorf(float(u["maxHp"]) * p / 100.0))
	o["atk"] = floorf(float(u["atk"]) * p / 100.0)
	var sks := []
	for k in (u["skills"] if u.get("skills") is Array else []):
		if k is Dictionary and _t(k.get("unit")):
			var k2: Dictionary = k.duplicate()
			k2["unit"] = _scale(k["unit"], p)
			sks.append(k2)
		else:
			sks.append(k)
	o["skills"] = sks
	return o

# ---------- place a "one" rune on a unit / pick the partner ----------
static func _slot_ok(s: Variant, rules: Dictionary) -> bool:
	return s is Array and s.size() == 2 and R.is_int(s[0]) and R.is_int(s[1]) and float(s[0]) >= 0.0 and float(s[0]) < float(rules["rows"]) \
		and float(s[1]) >= 0.0 and float(s[1]) < float(rules["lanes"])

static func rn_place(st: Dictionary, id: Variant, slot: Variant, rules: Dictionary, partner: bool = false) -> Dictionary:
	if not (st.get("rn") is Dictionary) or rn_held(st, id) == 0.0:
		return SH.fail("ไม่มีรูนนี้")
	var box: Dictionary = st["rn"]["pt"] if partner else st["rn"]["at"]
	if slot == null:
		box.erase(id)
		return SH.done()
	if not _slot_ok(slot, rules):
		return SH.fail("ช่องไม่ถูกต้อง")
	var u: Variant = st["board"][int(slot[0])][int(slot[1])] if int(slot[0]) < st["board"].size() else null
	if not (u is Dictionary):
		return SH.fail("ช่องนี้ว่าง · เลือกตัวบนบอร์ด")
	box[id] = u["uid"]
	return SH.done()

# unit wearing rune id (board or bench) · old saves: slot array = the unit on that slot
static func rn_unit_of(st: Variant, id: Variant, partner: bool = false) -> Variant:
	if not (st is Dictionary) or not (st.get("rn") is Dictionary):
		return null
	var box: Variant = st["rn"].get("pt" if partner else "at")
	var v: Variant = box.get(id) if box is Dictionary else null
	if v == null:
		return null
	if v is Array:
		var b: Array = st["board"]
		if v.size() > 0 and R.is_int(v[0]) and float(v[0]) >= 0.0 and float(v[0]) < b.size():
			var row: Array = b[int(v[0])]
			if v.size() > 1 and R.is_int(v[1]) and float(v[1]) >= 0.0 and float(v[1]) < row.size() and row[int(v[1])] is Dictionary:
				return row[int(v[1])]
		return null
	for row in st["board"]:
		for u in row:
			if u is Dictionary and R.js_seq(u.get("uid"), v):
				return u
	for u in st["bench"]:
		if u is Dictionary and R.js_seq(u.get("uid"), v):
			return u
	return null

static func rn_slot_of(st: Variant, id: Variant, partner: bool = false) -> Variant:
	var u: Variant = rn_unit_of(st, id, partner)
	if u == null:
		return null
	var b: Array = st["board"]
	for r in b.size():
		for l in b[r].size():
			if is_same(b[r][l], u):
				return [float(r), float(l)]
	return null

# 'ok' · 'none' (not worn) · 'bench' (worn by a bench unit) — also checks the partner
static func rn_wear(st: Dictionary, id: Variant, stage: Variant = null) -> String:
	var r: Variant = rn_rec(id, stage)
	if r == null:
		return "ok"
	for np in [[rn_needs_slot(r), false], [rn_needs_partner(r), true]]:
		if not np[0]:
			continue
		if rn_unit_of(st, id, np[1]) == null:
			return "none"
		if rn_slot_of(st, id, np[1]) == null:
			return "bench"
	return "ok"

static func rn_unworn(st: Variant, stage: Variant = null) -> Array:
	if not (st is Dictionary) or not (st.get("rn") is Dictionary):
		return []
	var out := []
	for id in st["rn"]["bag"]:
		if float(st["rn"]["bag"][id]) > 0.0 and rn_wear(st, id, stage) != "ok":
			out.append(id)
	return out

# tidy after the board changed: old slot arrays → uid · drop runes whose unit is gone · merged {from, to}: srcUids → toUid
static func rn_sync(st: Variant, merged: Variant = null) -> void:
	if not (st is Dictionary) or not (st.get("rn") is Dictionary):
		return
	for partner in [false, true]:
		var box: Dictionary = st["rn"]["pt" if partner else "at"]
		for id in box.keys():
			if merged is Dictionary and merged["from"].any(func(x): return R.js_seq(x, box[id])):
				box[id] = merged["to"]
			var u: Variant = rn_unit_of(st, id, partner)
			if u != null:
				box[id] = u["uid"]
			else:
				box.erase(id)

# ---------- effects ----------
static func rn_fx(st: Variant, stage: Variant = null) -> Dictionary:
	var fx := {"gold": 0.0, "intr": null, "slots": 0.0, "free": 0.0, "heart": null, "lure": {}, "fast": {}, "shadow": [], "permUp": [], "scout": false}
	if not (st is Dictionary) or not (st.get("rn") is Dictionary):
		return fx
	for id in st["rn"]["bag"]:
		var n := float(st["rn"]["bag"][id])
		var r: Variant = rn_rec(id, stage)
		if r == null or n < 1.0:
			continue
		var slot: Variant = rn_slot_of(st, id)
		var u: Variant = rn_unit_of(st, id) if rn_needs_slot(r) else null
		var num := func(q: String) -> float: return float(rn_spec_num(r, q))
		match r.get("eff"):
			"gold": fx["gold"] += num.call("gold") * n
			"interest": fx["intr"] = {"per": maxf(1.0, num.call("per")), "gold": num.call("gold") * n, "cap": num.call("cap") * n}
			"shopSlots": fx["slots"] = minf(3.0, fx["slots"] + num.call("slots") * n)
			"freeRoll": fx["free"] += num.call("free") * n
			"heartTrade": fx["heart"] = {"gold": num.call("gold"), "min": maxf(2.0, num.call("minHearts")), "left": maxf(0.0, n - float(R.js_i32(st["rn"].get("htu"))))}
			"lure":
				if u != null:
					var cur: Variant = fx["lure"].get(u["id"])
					fx["lure"][u["id"]] = maxf(float(cur) if _t(cur) else 1.0, num.call("mult"))
			"fastMerge":
				if u != null:
					var cur: Variant = fx["fast"].get(u["id"])
					fx["fast"][u["id"]] = minf(float(cur) if _t(cur) else 3.0, maxf(2.0, num.call("need")))
			"shadow":
				if u != null:
					fx["shadow"].append({"uid": u["uid"], "slot": slot, "times": num.call("times") * n})
			"permUp":
				if u != null:
					fx["permUp"].append({"uid": u["uid"], "slot": slot, "pct": num.call("permPct") * n})
			"scout": fx["scout"] = true
	return fx

static func rn_interest(gold: float, fx: Dictionary) -> float:
	var i: Variant = fx.get("intr")
	if not (i is Dictionary):
		return 0.0
	return minf(float(i["cap"]), floorf(maxf(0.0, gold) / float(i["per"])) * float(i["gold"]))

static func rn_perm_mul(st: Variant, u: Variant, stage: Variant = null) -> float:
	if not (st is Dictionary) or not (st.get("rn") is Dictionary) or not (u is Dictionary):
		return 1.0
	var pct := 0.0
	for p in rn_fx(st, stage)["permUp"]:
		if R.js_seq(p["uid"], u.get("uid")):
			pct += float(p["pct"])
	return 1.0 + pct / 100.0

static func rn_heart_trade(st: Dictionary, stage: Variant = null) -> Dictionary:
	if _t(st.get("over")) or not (st.get("rn") is Dictionary):
		return SH.fail("run จบแล้ว")
	var h: Variant = rn_fx(st, stage)["heart"]
	if not (h is Dictionary):
		return SH.fail("ไม่มีรูนแลกหัวใจ")
	if float(h["left"]) < 1.0:
		return SH.fail("รูนแลกหัวใจใช้ไปแล้ว (ใช้ได้ครั้งเดียวต่อรูน 1 อัน)")
	if _t(st["rn"].get("traded")):
		return SH.fail("รอบนี้แลกไปแล้ว")
	if float(st["hearts"]) < float(h["min"]):
		return SH.fail("หัวใจต้องเหลืออย่างน้อย %s ดวง" % R.js_num(h["min"]))
	st["hearts"] = float(st["hearts"]) - 1.0
	st["gold"] = float(st["gold"]) + float(h["gold"])
	st["rn"]["traded"] = true
	st["rn"]["htu"] = float(R.js_i32(st["rn"].get("htu")) + 1)
	var msgs := ["แลกหัวใจ 1 ดวง ได้เงิน %s" % R.js_num(h["gold"])]
	SH.lose_guard(st, msgs)
	return SH.done(msgs)

# battle runes → equip_runes() list
static func rn_equips(st: Variant, stage: Variant = null) -> Array:
	if not (st is Dictionary) or not (st.get("rn") is Dictionary):
		return []
	return rn_from_compact(rn_compact(st), stage)

# compact form for replays / play records: [{id, n, s?, p?, t?}]
static func rn_compact(st: Variant) -> Array:
	if not (st is Dictionary) or not (st.get("rn") is Dictionary):
		return []
	var out := []
	for id in st["rn"]["bag"]:
		var n: float = float(st["rn"]["bag"][id])
		if not (n > 0.0):
			continue
		var o := {"id": id, "n": st["rn"]["bag"][id]}
		var s: Variant = rn_slot_of(st, id)
		var p: Variant = rn_slot_of(st, id, true)
		if s != null:
			o["s"] = s
		if p != null:
			o["p"] = p
		var t := rn_flag_picks(st, id)
		if t.size() > 0:
			o["t"] = t.slice(0, maxi(0, int(n)))
		out.append(o)
	return out

static func rn_from_compact(list: Variant, stage: Variant = null) -> Array:
	var out := []
	for x in (list if list is Array else []):
		var xd: Dictionary = x if x is Dictionary else {}
		var r: Variant = rn_rec(xd.get("id"), stage)
		if r == null:
			continue
		if rn_needs_slot(r) and not _t(xd.get("s")):
			continue
		var e := {"r": r, "slot": xd["s"] if _t(xd.get("s")) else null, "partner": xd["p"] if _t(xd.get("p")) else null}
		if xd.has("n"):
			e["n"] = xd["n"]
		if xd.get("t") is Array:
			e["tribes"] = xd["t"]
		out.append(e)
	return out

static func rn_compact_ok(list: Variant, rules: Dictionary) -> bool:
	if not (list is Array) or list.size() > RN_MAX_HELD:
		return false
	var re := RegEx.create_from_string("^[A-Z]{1,2}[0-9]{1,3}\\z")
	var T := _tribes()
	for x in list:
		if not (x is Dictionary):
			return false
		for k in x:
			if not ["id", "n", "s", "p", "t"].has(k):
				return false
		if not (x.get("id") is String) or re.search(x["id"]) == null:
			return false
		if not R.is_int(x.get("n")) or float(x["n"]) < 1.0 or float(x["n"]) > 9.0:
			return false
		if x.has("s") and not _slot_ok(x["s"], rules):
			return false
		if x.has("p") and not _slot_ok(x["p"], rules):
			return false
		if x.has("t"):
			var t: Variant = x["t"]
			if not (t is Array) or t.size() < 1 or t.size() > float(x["n"]):
				return false
			for y in t:
				if not T.has(y):
					return false
	return true

# ---------- save check (st.rn) ----------
const _KEYS := ["n", "bag", "at", "pt", "ft", "offer", "free", "traded", "htu", "shadow", "ro"]

static func _int_in(v: Variant, lo: float, hi: float) -> bool:
	return R.is_int(v) and float(v) >= lo and float(v) <= hi

static func rn_validate(rn: Variant, rules: Dictionary, stage: Variant = null) -> Array:
	var errors := []
	if not (rn is Dictionary):
		return ["รูน: ผิดรูปแบบ"]
	for k in rn:
		if not _KEYS.has(k):
			return ["รูน: ผิดรูปแบบ"]
	for k in _KEYS:
		if not rn.has(k):
			return ["รูน: ผิดรูปแบบ"]
	var bag_ok: bool = rn["bag"] is Dictionary
	if not bag_ok or rn["bag"].size() > RN_MAX_HELD:
		errors.append("รูน: กระเป๋าผิด")
	else:
		for id in rn["bag"]:
			var r: Variant = rn_rec(id, stage)
			var n: Variant = rn["bag"][id]
			if r == null or not R.is_int(n) or float(n) < 1.0 or float(n) > _max_of(r):
				errors.append("รูน %s: ผิด" % id)
	for k in ["at", "pt"]:
		if not (rn[k] is Dictionary):
			errors.append("รูน: ช่องวางผิด")
			continue
		for id in rn[k]:
			var s: Variant = rn[k][id]
			if not bag_ok or not _t(rn["bag"].get(id)) or not (_slot_ok(s, rules) or _int_in(s, 1.0, 1e9)):
				errors.append("รูน %s: ช่องวางผิด" % id)
	if not (rn["ft"] is Dictionary) or rn["ft"].size() > RN_MAX_HELD:
		errors.append("รูน: เผ่าธงผิด")
	else:
		var T := _tribes()
		for id in rn["ft"]:
			var l: Variant = rn["ft"][id]
			var bad: bool = not bag_ok or not (l is Array)
			if not bad:
				bad = l.size() > R.js_i32(rn["bag"].get(id))
				for t in l:
					if not T.has(t):
						bad = true
			if bad:
				errors.append("รูน %s: เผ่าธงผิด" % id)
	var o: Variant = rn["offer"]
	if o != null:
		var ok: bool = o is Dictionary
		if ok:
			for k in o:
				if k != "kind" and k != "ids":
					ok = false
		ok = ok and o.get("kind") is String and RN_OFFER_KEY.has(o["kind"]) and o.get("ids") is Array and o["ids"].size() >= 1 and o["ids"].size() <= 15
		if ok:
			for id in o["ids"]:
				if rn_rec(id, stage) == null:
					ok = false
		if not ok:
			errors.append("รูนรางวัลผิด")
	if not _int_in(rn["n"], 0.0, 1e9):
		errors.append("รูน: ตัวนับสุ่มผิด")
	if not _int_in(rn["free"], 0.0, 99.0):
		errors.append("รูน: สุ่มฟรีผิด")
	if not _int_in(rn["ro"], 0.0, 999.0):
		errors.append("รูน: สุ่มการ์ดใหม่ผิด")
	if not (rn["traded"] is bool) or not _int_in(rn["htu"], 0.0, 9.0):
		errors.append("รูน: แลกหัวใจผิด")
	if not _int_in(rn["shadow"], 0.0, 99.0):
		errors.append("รูน: เงาผิด")
	return errors
