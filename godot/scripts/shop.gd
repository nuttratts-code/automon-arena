# src/core/shop.js port (set 195: fail/done/loseGuard in step 6c, the rest in step 6d) — shop, merge and the round flow,
# shared by the player and the bots. State = plain data (saved as JSON); randomness = the run seed (st.seed + st.n).
# Every command checks first: a broken rule → {ok: false, msg} and the state is not touched.
# Check: tests/test_shop.gd vs golden shop.jsonl (src/lab/golden-shop.mjs). A change in shop.js must be made here too.
# Security ③: refs / slots / battle gains from outside are checked like JS (okRef, Number.isInteger, applyBattlePerm limits).
extends RefCounted

const R := preload("res://scripts/rules.gd")
const RR := preload("res://scripts/runrunes.gd")
const RB := preload("res://scripts/runboss.gd")
const T := preload("res://scripts/team.gd")
const P := preload("res://scripts/power.gd")
const Rng := preload("res://scripts/rng.gd")

const SLOT_ORDER := [[0.0, 0.0], [0.0, 1.0], [1.0, 0.0], [1.0, 1.0], [2.0, 0.0], [2.0, 1.0]]
const SHOP_GIVE_BASE := {"hp": "HP", "atk": "พลังโจมตี", "armor": "เกราะสะสม", "burn": "ไฟ/ฮิต", "shock": "ช็อต/ฮิต", "multi": "มัลติฮิต", "cdPct": "คูลดาวน์ −%", "cdStart": "เริ่มแมตช์ลดคูลดาวน์ (มิลลิวินาที)", "shareArmor": "แบ่งเกราะ %", "healToAtk": "ฟื้นเป็นพลัง %", "armorAmp": "เกราะที่ได้รับ +%", "cdAmp": "ผลลดคูลดาวน์ที่ได้รับ +%", "shockAmp": "ดาเมจช็อต +%", "burnNoDecay": "ไฟที่ติดไม่ลด", "healHit": "ฟื้น/ฮิต", "armorHit": "เกราะ/ฮิต", "cdMs": "คูลดาวน์ − (มิลลิวินาที)", "hpPct": "HP +%", "atkPct": "พลังโจมตี +%", "burnPct": "ไฟ/ฮิต +%", "shockPct": "ช็อต/ฮิต +%", "armorHitPct": "เกราะ/ฮิต +%", "healAmp": "ฟื้น HP ที่ได้รับ +%", "hitAmp": "ดาเมจตี +%", "burnAmp": "ไฟที่ทำให้ติด +%"}
const SHARE_TH := {"frontAlly": "เพื่อนข้างหน้า", "backAlly": "เพื่อนข้างหลัง", "frontBackAlly": "เพื่อนหน้าและหลัง", "frontLaneAlly": "เพื่อนแถวหน้าเลนเดียวกัน", "backLaneAlly": "เพื่อนข้างหลังเลนเดียวกัน", "frontRowAllies": "เพื่อนแถวหน้า", "backRowAllies": "เพื่อนแถวหลัง", "allyLowest": "เพื่อน HP ต่ำสุด", "allyRandom": "เพื่อนสุ่ม 1 ตัว", "allyRandom2": "เพื่อนสุ่ม 2 ตัว", "tribeAllies": "เพื่อนเผ่าเดียวกัน"}

static var _perm_keys: Array = []
static var _give_th: Dictionary = {}
static var _give_re: RegEx = null

# PERM_KEYS = base stats + PERM_STAT2 + PERM_ABIL (from game.json)
static func PERM_KEYS() -> Array:
	if _perm_keys.is_empty():
		var M := R.mod("rules")
		_perm_keys = ["hp", "atk", "armor", "burn", "shock", "multi", "cdPct"]
		_perm_keys.append_array(M["PERM_STAT2"])
		_perm_keys.append_array(M["PERM_ABIL"])
	return _perm_keys

static func SHOP_GIVE_TH() -> Dictionary:
	if _give_th.is_empty():
		_give_th = SHOP_GIVE_BASE.duplicate()
		for t in R.mod("rules")["SHARE_TO"]:
			_give_th["share_" + t] = "แบ่งเกราะให้%s %%" % SHARE_TH.get(t, t)
	return _give_th

static func _rules(rules: Dictionary) -> Dictionary:
	return R.RULES() if rules.is_empty() else rules

static func _stage(stage: Variant) -> Dictionary:
	return RB.RUN_STAGE() if stage == null else stage

static func fail(msg: String) -> Dictionary:
	return {"ok": false, "msg": msg}

static func done(msgs: Array = []) -> Dictionary:
	return {"ok": true, "msgs": msgs}

static func _find_char(chars: Array, id: Variant) -> Variant:
	for c in chars:
		if R.js_seq(c["id"], id):
			return c
	return null

static func _tribes_of_char(c: Dictionary) -> Array:
	var ts := [c["tribe"]]
	ts.append_array(c["extraTribes"])
	return ts

# ---------- create + random ----------
static func new_run(chars: Array, seed: Variant, rules: Dictionary = {}) -> Dictionary:
	var S: Dictionary = _rules(rules)["shop"]
	var shop := []
	for k in int(S["slots"]):
		shop.append({"id": null, "locked": false})
	var bench := []
	bench.resize(int(S["bench"]))
	return {
		"v": 11.0, "op": false, "seed": float(Rng.u32(int(float(seed)))), "n": 0.0, "round": 0.0, "gold": 0.0, "wins": 0.0, "hearts": S["hearts"],
		"lastWon": false, "over": false, "shop": shop, "bench": bench, "board": [[null, null], [null, null], [null, null]], "uid": 1.0,
		"charges": [], "rn": RR.new_runes(), "bw": 0.0, "bk": 0.0, "extra": false, "ls": 0.0, "ws": 0.0, "sc": 0.0, "fp": 0.0,
	}

# random 0–1 from the seed in the state
static func draw(st: Dictionary) -> float:
	st["n"] = float(st["n"]) + 1.0
	var seed := Rng.u32(int(float(st["seed"])))
	return Rng.new((seed ^ Rng.imul(int(st["n"]), 0x9E3779B1)) & Rng.M32).next()

# ---------- shop level follows the round (set 89) ----------
static func shop_levels(rules: Dictionary = {}) -> float:
	return float(_rules(rules)["shop"]["levelOdds"].size())

static func lv_for_round(round: Variant, rules: Dictionary = {}) -> float:
	var rl := _rules(rules)
	var tb: Variant = rl["shop"].get("roundLevels")
	var r := maxf(1.0, float(R.js_i32(round)))
	var v: Variant = tb[int(minf(r, tb.size())) - 1] if tb is Array and tb.size() > 0 else r
	var vi := float(R.js_i32(v))
	return maxf(1.0, minf(shop_levels(rl), vi if vi != 0.0 else 1.0))

static func shop_lv_of(st: Dictionary, rules: Dictionary = {}) -> float:
	return lv_for_round(st["round"], rules)

static func odds_at(lv: Variant, rules: Dictionary = {}) -> Dictionary:
	var rl := _rules(rules)
	return rl["shop"]["levelOdds"][int(maxf(1.0, minf(shop_levels(rl), float(R.js_i32(lv))))) - 1]

static func base_income_at(round: Variant, rules: Dictionary = {}) -> float:
	var S: Dictionary = _rules(rules)["shop"]
	var r := maxf(1.0, float(R.js_i32(round)))
	if r == 1.0:
		return S["startGold"]
	if R.js_or0(S.get("goldStep")) != 0.0:
		return maxf(0.0, minf(S["goldPerRound"], S["startGold"] + S["goldStep"] * (r - 1.0)))
	return S["goldPerRound"]

static func income_of(st: Dictionary, rules: Dictionary = {}) -> Dictionary:
	var S: Dictionary = _rules(rules)["shop"]
	var bonus: float = S["winBonus"] if _truthy(st.get("lastWon")) else 0.0
	var base := base_income_at(float(st["round"]) + 1.0, rules)
	return {"base": base, "bonus": bonus, "total": base + bonus}

static func roll_char(st: Dictionary, chars: Array, rules: Dictionary = {}) -> Variant:
	var odds := odds_at(shop_lv_of(st, rules), rules)
	var has := func(r): return chars.any(func(c): return c["rarity"] == r)
	var rars := []
	var flat := false
	for r in R.mod("rules")["RARITIES"]:
		if R.js_or0(odds.get(r)) > 0.0 and has.call(r):
			rars.append(r)
	if rars.is_empty():
		flat = true
		for r in R.mod("rules")["RARITIES"]:
			if has.call(r):
				rars.append(r)
	if rars.is_empty():
		return null
	var total := 0.0
	for r in rars:
		total += 1.0 if flat else float(odds[r])
	var x := draw(st) * total
	var rar: Variant = rars[0]
	for r in rars:
		x -= 1.0 if flat else float(odds[r])
		if x < 0.0:
			rar = r
			break
	var pool := chars.filter(func(c): return c["rarity"] == rar)
	var lure: Dictionary = RR.rn_fx(st)["lure"]
	if not lure.is_empty():
		var wt := func(c): return float(lure[c["id"]]) if R.js_or0(lure.get(c["id"])) != 0.0 else 1.0
		var tot := 0.0
		for c in pool:
			tot += wt.call(c)
		var y := draw(st) * tot
		for c in pool:
			y -= wt.call(c)
			if y < 0.0:
				return c["id"]
		return pool[pool.size() - 1]["id"]
	return pool[int(floorf(draw(st) * pool.size()))]["id"]

static func refill(st: Dictionary, chars: Array, rules: Dictionary = {}) -> void:
	for s in st["shop"]:
		if not _truthy(s.get("locked")) or not _truthy(s.get("id")):
			s["id"] = roll_char(st, chars, rules)
			s["locked"] = false

# ---------- places ----------
# ref: {at: 'bench', i} | {at: 'board', row, lane} | {at: 'shop', i}
static func ok_ref(st: Dictionary, ref: Variant) -> bool:
	if not (ref is Dictionary):
		return false
	var at: Variant = ref.get("at")
	if R.js_seq(at, "bench"):
		return R.is_int(ref.get("i")) and float(ref["i"]) >= 0.0 and float(ref["i"]) < st["bench"].size()
	if R.js_seq(at, "board"):
		return R.is_int(ref.get("row")) and float(ref["row"]) >= 0.0 and float(ref["row"]) < 3.0 \
			and R.is_int(ref.get("lane")) and float(ref["lane"]) >= 0.0 and float(ref["lane"]) < 2.0
	if R.js_seq(at, "shop"):
		return R.is_int(ref.get("i")) and float(ref["i"]) >= 0.0 and float(ref["i"]) < st["shop"].size()
	return false

static func get_at(st: Dictionary, ref: Dictionary) -> Variant:
	if ref["at"] == "bench":
		return st["bench"][int(ref["i"])]
	if ref["at"] == "board":
		return st["board"][int(ref["row"])][int(ref["lane"])]
	return null

static func put(st: Dictionary, ref: Dictionary, u: Variant) -> void:
	if ref["at"] == "bench":
		st["bench"][int(ref["i"])] = u
	else:
		st["board"][int(ref["row"])][int(ref["lane"])] = u

static func all_units(st: Dictionary) -> Array:
	var out := []
	var b: Array = st["board"]
	for row in b.size():
		for lane in b[row].size():
			if b[row][lane] is Dictionary:
				out.append({"u": b[row][lane], "ref": {"at": "board", "row": float(row), "lane": float(lane)}})
	for i in st["bench"].size():
		if st["bench"][i] is Dictionary:
			out.append({"u": st["bench"][i], "ref": {"at": "bench", "i": float(i)}})
	return out

static func board_units(st: Dictionary) -> Array:
	return all_units(st).filter(func(x): return x["ref"]["at"] == "board")

static func first_empty_bench(st: Dictionary) -> Variant:
	var i: int = st["bench"].find(null)
	return null if i < 0 else {"at": "bench", "i": float(i)}

# ---------- permanent stats (caps from rules.permCaps) ----------
static func add_perm(u: Dictionary, key: Variant, v: Variant, rules: Dictionary) -> float:
	if not (key is String) or not PERM_KEYS().has(key) or not (R.is_num(v) and float(v) > 0.0):
		return 0.0
	var cap: Variant = rules["permCaps"].get(key)
	var before := R.js_or0(u["perm"].get(key))
	var after := before + float(v) if cap == null else minf(float(cap), before + float(v))
	if after > before:
		u["perm"][key] = after
	return after - before

static func _tribes_of(u: Dictionary, chars: Array) -> Array:
	var c: Variant = _find_char(chars, u["id"])
	return _tribes_of_char(c) if c != null else []

static func _shares(a: Array, b: Array) -> bool:
	return a.any(func(t): return b.has(t))

# shop skill targets on the board (s = the skill: allyAt place + sameTribe / skipSameId filters)
static func shop_targets(st: Dictionary, ref: Variant, to: Variant, self_u: Variant, chars: Array, s: Variant = null) -> Array:
	var r: Array
	if R.js_seq(to, "allyAt"):
		r = []
		if s is Dictionary and s.get("at") is Dictionary and ref is Dictionary and ref.get("at") == "board":
			var list := board_units(st).filter(func(x): return not is_same(x["u"], self_u) \
				and R.at_match(s["at"], float(ref["row"]), float(ref["lane"]), float(x["ref"]["row"]), float(x["ref"]["lane"])))
			list = R.sort_cmp(list, func(a, b): return (a["ref"]["row"] - b["ref"]["row"]) if a["ref"]["row"] != b["ref"]["row"] else (a["ref"]["lane"] - b["ref"]["lane"]))
			for x in list:
				r.append(x["u"])
	else:
		r = shop_targets_base(st, ref, to, self_u, chars)
	if s is Dictionary and _truthy(s.get("sameTribe")) and self_u is Dictionary:
		var mine := _tribes_of(self_u, chars)
		r = r.filter(func(u): return is_same(u, self_u) or _shares(_tribes_of(u, chars), mine))
	if s is Dictionary and _truthy(s.get("skipSameId")) and self_u is Dictionary:
		r = r.filter(func(u): return is_same(u, self_u) or not R.js_seq(u["id"], self_u["id"]))
	return r

static func _pick(st: Dictionary, list: Array, n: int) -> Array:
	var l := list.duplicate()
	var out := []
	while l.size() > 0 and out.size() < n:
		var k := int(floorf(draw(st) * l.size()))
		out.append(l[k])
		l.remove_at(k)
	return out

static func _us(list: Array) -> Array:
	return list.map(func(x): return x["u"])

static func shop_targets_base(st: Dictionary, ref: Variant, to: Variant, self_u: Variant, chars: Array) -> Array:
	var B := board_units(st)
	var at_board: bool = ref is Dictionary and ref.get("at") == "board"
	var others := B.filter(func(x): return not is_same(x["u"], self_u))
	var rr: float = float(ref["row"]) if at_board else 0.0
	var rl: float = float(ref["lane"]) if at_board else 0.0
	match to:
		"self":
			return [self_u] if self_u is Dictionary else []
		"allAllies":
			return _us(B)
		"frontAlly":
			return _us(others.filter(func(x): return x["ref"]["lane"] == rl and x["ref"]["row"] == rr - 1.0)) if at_board else []
		"backAlly":
			return _us(others.filter(func(x): return x["ref"]["lane"] == rl and x["ref"]["row"] == rr + 1.0)) if at_board else []
		"backLaneAlly":
			if not at_board:
				return []
			var l := R.sort_cmp(others.filter(func(x): return x["ref"]["lane"] == rl and x["ref"]["row"] > rr), func(a, b): return a["ref"]["row"] - b["ref"]["row"])
			return _us(l.slice(0, 1))
		"frontBackAlly":
			return _us(others.filter(func(x): return x["ref"]["lane"] == rl and absf(x["ref"]["row"] - rr) == 1.0)) if at_board else []
		"frontRowAllies":
			return _us(others.filter(func(x): return x["ref"]["row"] == 0.0))
		"backRowAllies":
			return _us(others.filter(func(x): return x["ref"]["row"] == 2.0))
		"allyRandom":
			return _us(_pick(st, others, 1))
		"allyRandom2":
			return _us(_pick(st, others, 2))
		"tribeAllies":
			var mine := _tribes_of(self_u, chars)
			return _us(others.filter(func(x): return _shares(_tribes_of(x["u"], chars), mine)))
	return []

# one perm gain as text (set 179): "HP +20%" · "คูลดาวน์ − 0.2 วิ" · "พลังโจมตี +5"
static func give_amt(k: Variant, v: Variant) -> String:
	var th := SHOP_GIVE_TH()
	var t: String = th[k] if th.has(k) else R.js_str(k)
	if R.js_seq(k, "burnNoDecay"):
		return t
	if R.js_seq(k, "cdMs") or R.js_seq(k, "cdStart"):
		return "%s %s วิ" % [t.replace(" (มิลลิวินาที)", ""), R.js_num(float(v) / 1000.0)]
	if _give_re == null:
		_give_re = RegEx.create_from_string("^(.*?) ?([+−]?)%\\z")
	var m := _give_re.search(t)
	if m != null:
		var sign := m.get_string(2)
		return "%s %s%s%%" % [m.get_string(1), sign if sign != "" else "+", R.js_str(v)]
	return "%s +%s" % [t, R.js_str(v)]

static func fire_shop_skill(st: Dictionary, u: Dictionary, ref: Variant, when: String, chars: Array, rules: Dictionary, msgs: Array) -> void:
	var c: Variant = _find_char(chars, u["id"])
	if c == null:
		return
	var skills: Array = c["skills"] if c.get("skills") is Array else []
	var D := R.DO_INFO()
	for si in skills.size():
		var s: Dictionary = skills[si]
		var info: Variant = D.get(s["do"]) if s.get("do") is String else null
		if not (s.get("when") == when and info is Dictionary and _truthy(info.get("shop"))):
			continue
		var give: String = info["shop"]
		if s.get("chance") != null and float(s["chance"]) < 100.0 and draw(st) * 100.0 >= float(s["chance"]):
			continue
		var v: Variant = s["v"][int(u["level"]) - 1]
		var name := "%s %s" % [c["id"], c["name"]]
		if s.get("to") == "nextTribeBuy":
			if not (st.get("charges") is Array):
				st["charges"] = []
			if st["charges"].any(func(x): return R.js_seq(x["id"], c["id"]) and float(x["si"]) == float(si)):
				msgs.append("%s: มีประจุรออยู่แล้ว" % name)
				continue
			st["charges"].append({"id": c["id"], "uid": u["uid"], "si": float(si)})
			msgs.append("%s: ประจุรอ → เพื่อนเผ่า%s ตัวถัดไปที่ซื้อ ได้%s ถาวร" % [name, "/".join(_tribes_of_char(c)), SHOP_GIVE_TH().get(give, give)])
			continue
		var tgs := shop_targets(st, ref, s.get("to"), u, chars, s)
		var got := 0
		for t in tgs:
			if add_perm(t, give, floorf(float(v) * RR.rn_perm_mul(st, t)), rules) > 0.0:
				got += 1
		if tgs.size() > 0:
			msgs.append("%s: %d/%d ตัวได้ %s ถาวร%s" % [name, got, tgs.size(), give_amt(give, v), " (บางตัวเต็มเพดานแล้ว)" if got < tgs.size() else ""])
		else:
			msgs.append("%s: ไม่มีเพื่อนในตำแหน่งที่สกิลให้ผล" % name)

# waiting charges (SF-7): the next bought unit of a matching tribe gets the perm stat at the owner's level now
# owner sold = charge gone · merged = the highest-level unit of the same id
static func charge_owner(st: Dictionary, x: Dictionary) -> Variant:
	var all := _us(all_units(st))
	for y in all:
		if R.js_seq(y["uid"], x["uid"]):
			return y
	var same := R.sort_cmp(all.filter(func(y): return R.js_seq(y["id"], x["id"])), func(a, b): return b["level"] - a["level"])
	return same[0] if same.size() > 0 else null

static func drop_dead_charges(st: Dictionary) -> void:
	if st.get("charges") is Array:
		st["charges"] = st["charges"].filter(func(x): return charge_owner(st, x) != null)

static func use_charges(st: Dictionary, u: Dictionary, chars: Array, rules: Dictionary, msgs: Array) -> void:
	if not (st.get("charges") is Array) or st["charges"].is_empty():
		return
	drop_dead_charges(st)
	var c: Variant = _find_char(chars, u["id"])
	var mine := _tribes_of_char(c) if c != null else []
	var D := R.DO_INFO()
	var keep := []
	for x in st["charges"]:
		var sc: Variant = _find_char(chars, x["id"])
		var s: Variant = null
		if sc != null and R.is_int(x.get("si")) and float(x["si"]) >= 0.0 and float(x["si"]) < sc["skills"].size():
			s = sc["skills"][int(x["si"])]
		var info: Variant = D.get(s["do"]) if s is Dictionary and s.get("do") is String else null
		if sc == null or not (info is Dictionary and _truthy(info.get("shop"))):
			continue
		var give: String = info["shop"]
		if not _shares(_tribes_of_char(sc), mine):
			keep.append(x)
			continue
		var owner: Dictionary = charge_owner(st, x)
		var got := add_perm(u, give, s["v"][int(owner["level"]) - 1], rules)
		msgs.append("%s %s: %s %s ได้ %s ถาวร (ใช้ประจุ Lv%s)" % [sc["id"], sc["name"], c["id"], c["name"], give_amt(give, got), R.js_num(owner["level"])])
	st["charges"] = keep

# ---------- start a shop round ----------
static func start_round(st: Dictionary, chars: Array, rules: Dictionary = {}) -> Dictionary:
	if _truthy(st.get("over")):
		return fail("run จบแล้ว")
	var rl := _rules(rules)
	var S: Dictionary = rl["shop"]
	var msgs := []
	var held: float = st["gold"]
	st["gold"] = 0.0
	if float(st["round"]) == 0.0:
		st["gold"] += S["startGold"]
	else:
		var inc := income_of(st, rl)
		st["gold"] += inc["total"]
		msgs.append("รายได้ +%s (รอบละ %s%s)" % [R.js_num(inc["total"]), R.js_num(inc["base"]), " · ชนะ +%s" % R.js_num(inc["bonus"]) if inc["bonus"] != 0.0 else ""])
	var fx := RR.rn_fx(st)
	if float(st["round"]) > 0.0:
		var it := RR.rn_interest(held, fx)
		if fx["gold"] != 0.0:
			st["gold"] += fx["gold"]
			msgs.append("รูนทอง +%s" % R.js_num(fx["gold"]))
		if it != 0.0:
			st["gold"] += it
			msgs.append("ดอกเบี้ยจากรูน +%s" % R.js_num(it))
	if st.get("rn") is Dictionary:
		st["rn"]["free"] = fx["free"]
		st["rn"]["traded"] = false
		st["rn"]["ro"] = 0.0
		var want := int(S["slots"] + fx["slots"])
		while st["shop"].size() < want:
			st["shop"].append({"id": null, "locked": false})
		if st["shop"].size() > want:
			st["shop"].resize(want)
	var lv_before := shop_lv_of(st, rl) if float(st["round"]) != 0.0 else 0.0
	st["round"] = float(st["round"]) + 1.0
	var lv := shop_lv_of(st, rl)
	if lv > lv_before and float(st["round"]) > 1.0:
		msgs.append("ร้านขึ้นเป็นระดับ %s (ขึ้นเองตามรอบ)" % R.js_num(lv))
	refill(st, chars, rl)
	for x in board_units(st):
		fire_shop_skill(st, x["u"], x["ref"], "shopStart", chars, rl, msgs)
	st["op"] = true
	var team: Variant = T.build_team(team_entries(st), T.make_char_map(chars), rl)
	st["fp"] = R.js_round(P.team_power(team, rl)) if team is Array else 0.0
	return done(msgs)

# take a rune card · while the shop round is open the round-start runes pay now (T1 gold · T4 free rerolls · T3 extra slots)
static func take_rune(st: Dictionary, i: Variant, chars: Array, rules: Dictionary = {}, tribe: Variant = null, stage: Variant = null) -> Dictionary:
	var rl := _rules(rules)
	var sg := _stage(stage)
	var o: Variant = st["rn"].get("offer") if st.get("rn") is Dictionary else null
	var id: Variant = null
	if o is Dictionary and R.is_int(i) and float(i) >= 0.0 and float(i) < o["ids"].size():
		id = o["ids"][int(i)]
	var r := RR.rn_take_offer(st, i, sg, tribe)
	if not r["ok"] or not _truthy(st.get("op")):
		return r
	var rec: Variant = RR.rn_rec(id, sg)
	if rec == null:
		return r
	var msgs: Array = r["msgs"].duplicate()
	if rec.get("eff") == "gold":
		var g: Variant = RR.rn_spec_num(rec, "gold")
		if R.js_or0(g) != 0.0:
			st["gold"] = float(st["gold"]) + float(g)
			msgs.append("รูนทอง +%s (ได้ทันทีรอบนี้)" % R.js_num(g))
	elif rec.get("eff") == "freeRoll":
		var f: Variant = RR.rn_spec_num(rec, "free")
		if R.js_or0(f) != 0.0:
			st["rn"]["free"] = float(st["rn"]["free"]) + float(f)
			msgs.append("สุ่มร้านฟรี +%s (ใช้ได้ทันทีรอบนี้)" % R.js_num(f))
	elif rec.get("eff") == "shopSlots":
		var want: float = rl["shop"]["slots"] + RR.rn_fx(st, sg)["slots"]
		var n0: int = st["shop"].size()
		while st["shop"].size() < want:
			st["shop"].append({"id": roll_char(st, chars, rl), "locked": false})
		if st["shop"].size() > n0:
			msgs.append("ร้านเพิ่ม %d ช่อง (ทันทีรอบนี้)" % (st["shop"].size() - n0))
	return done(msgs)

# ---------- buy / sell / reroll / lock ----------
static func _slot_ok(st: Dictionary, slot: Variant) -> bool:
	return R.is_int(slot) and float(slot) >= 0.0 and float(slot) < st["shop"].size()

static func buy(st: Dictionary, slot: Variant, dest: Variant, chars: Array, rules: Dictionary = {}) -> Dictionary:
	var rl := _rules(rules)
	if _truthy(st.get("over")):
		return fail("run จบแล้ว")
	if not _slot_ok(st, slot):
		return fail("ช่องร้านไม่ถูกต้อง")
	var s: Dictionary = st["shop"][int(slot)]
	if not _truthy(s.get("id")):
		return fail("ช่องนี้ว่าง")
	var c: Variant = _find_char(chars, s["id"])
	if c == null:
		return fail("ไม่มีตัวละครนี้")
	if float(st["gold"]) < float(c["price"]):
		return fail("เงินไม่พอ (ต้องใช้ %s)" % R.js_num(c["price"]))
	var to: Variant = dest if ok_ref(st, dest) and dest["at"] != "shop" and get_at(st, dest) == null else null
	if to == null:
		to = first_empty_bench(st)
	if to == null:
		return fail("ม้านั่งเต็ม ขายก่อนซื้อ")
	st["gold"] = float(st["gold"]) - float(c["price"])
	var u := {"uid": st["uid"], "id": c["id"], "level": 1.0, "perm": {}, "paid": c["price"]}
	st["uid"] = float(st["uid"]) + 1.0
	put(st, to, u)
	s["id"] = null
	s["locked"] = false
	var msgs := []
	use_charges(st, u, chars, rl, msgs)
	fire_shop_skill(st, u, to, "buy", chars, rl, msgs)
	var out := done(msgs)
	out["ref"] = to
	return out

static func sell(st: Dictionary, ref: Variant, chars: Array, rules: Dictionary = {}) -> Dictionary:
	var rl := _rules(rules)
	if _truthy(st.get("over")):
		return fail("run จบแล้ว")
	if not ok_ref(st, ref) or ref["at"] == "shop":
		return fail("ตำแหน่งไม่ถูกต้อง")
	var u: Variant = get_at(st, ref)
	if u == null:
		return fail("ช่องนี้ว่าง")
	put(st, ref, null)
	st["gold"] = float(st["gold"]) + float(u["paid"])
	var msgs := ["ขาย %s ได้คืน %s" % [u["id"], R.js_num(u["paid"])]]
	if st.get("rn") is Dictionary:
		put(st, ref, u)
		var sh: Array = RR.rn_fx(st)["shadow"].filter(func(x): return R.js_seq(x["uid"], u["uid"]))
		var times := 0.0
		for x in sh:
			times += float(x["times"])
		put(st, ref, null)
		var to: Variant = first_empty_bench(st) if sh.size() > 0 else null
		if to != null and float(st["rn"]["shadow"]) < times:
			put(st, to, {"uid": st["uid"], "id": u["id"], "level": 1.0, "perm": {}, "paid": 0.0})
			st["uid"] = float(st["uid"]) + 1.0
			st["rn"]["shadow"] = float(st["rn"]["shadow"]) + 1.0
			msgs.append("รูนเงา: ได้ %s เลเวล 1 คืนที่ม้านั่ง" % u["id"])
		RR.rn_sync(st)
	fire_shop_skill(st, u, ref, "sell", chars, rl, msgs)
	drop_dead_charges(st)
	return done(msgs)

static func reroll(st: Dictionary, chars: Array, rules: Dictionary = {}) -> Dictionary:
	var rl := _rules(rules)
	if _truthy(st.get("over")):
		return fail("run จบแล้ว")
	var cost: float = rl["shop"]["rerollCost"]
	if st.get("rn") is Dictionary and float(st["rn"]["free"]) > 0.0:
		st["rn"]["free"] = float(st["rn"]["free"]) - 1.0
		refill(st, chars, rl)
		return done(["สุ่มร้านฟรี (เหลือ %s)" % R.js_num(st["rn"]["free"])])
	if float(st["gold"]) < cost:
		return fail("เงินไม่พอ (รีโรลใช้ %s)" % R.js_num(cost))
	st["gold"] = float(st["gold"]) - cost
	refill(st, chars, rl)
	return done()

static func toggle_lock(st: Dictionary, slot: Variant) -> Dictionary:
	if not _slot_ok(st, slot) or not _truthy(st["shop"][int(slot)].get("id")):
		return fail("ล็อกช่องว่างไม่ได้")
	st["shop"][int(slot)]["locked"] = not _truthy(st["shop"][int(slot)].get("locked"))
	return done()

static func _fast_need(st: Dictionary, id: Variant, rules: Dictionary) -> float:  # rnFx(st).fast[id] || mergeCount
	var f: Variant = RR.rn_fx(st)["fast"].get(id)
	return float(f) if R.js_or0(f) != 0.0 else float(rules["shop"]["mergeCount"])

# set 106: drag a shop card onto an owned Lv1 copy = buy + merge at once
static func buy_merge(st: Dictionary, slot: Variant, to: Variant, chars: Array, rules: Dictionary = {}) -> Dictionary:
	var rl := _rules(rules)
	if _truthy(st.get("over")):
		return fail("run จบแล้ว")
	if not _slot_ok(st, slot):
		return fail("ช่องร้านไม่ถูกต้อง")
	var s: Dictionary = st["shop"][int(slot)]
	if not _truthy(s.get("id")):
		return fail("ช่องนี้ว่าง")
	var c: Variant = _find_char(chars, s["id"])
	if c == null:
		return fail("ไม่มีตัวละครนี้")
	if not ok_ref(st, to) or to["at"] == "shop":
		return fail("ตำแหน่งไม่ถูกต้อง")
	var b: Variant = get_at(st, to)
	if b == null or not R.js_seq(b["id"], c["id"]) or float(b["level"]) != 1.0 or float(rl["maxLevel"]) < 2.0:
		return fail("ซื้อแล้วรวมร่างได้เฉพาะเมื่อลากไปทับตัวชนิดเดียวกันเลเวล 1")
	var fast := _fast_need(st, c["id"], rl) <= 2.0
	var third: Variant = null
	if not fast:
		for x in all_units(st):
			if not is_same(x["u"], b) and R.js_seq(x["u"]["id"], c["id"]) and float(x["u"]["level"]) == 1.0:
				third = x
				break
	if not fast and third == null:
		return fail("รวมร่างต้องมี %s เลเวล 1 ครบ %s ตัว (มีอยู่ 1 ตัว ซื้อลงช่องว่างก่อน)" % [c["id"], R.js_num(rl["shop"]["mergeCount"])])
	if float(st["gold"]) < float(c["price"]):
		return fail("เงินไม่พอ (ต้องใช้ %s)" % R.js_num(c["price"]))
	st["gold"] = float(st["gold"]) - float(c["price"])
	var u := {"uid": st["uid"], "id": c["id"], "level": 1.0, "perm": {}, "paid": c["price"]}
	st["uid"] = float(st["uid"]) + 1.0
	s["id"] = null
	s["locked"] = false
	var msgs := []
	use_charges(st, u, chars, rl, msgs)
	fire_shop_skill(st, u, to, "buy", chars, rl, msgs)
	var r := merge(st, [third["ref"]] if third != null else [], to, chars, rl, [u])
	var all := msgs.duplicate()
	all.append_array(r["msgs"])
	r["msgs"] = all
	r["ref"] = to
	return r

# ---------- move / swap / merge ----------
static func move(st: Dictionary, from: Variant, to: Variant, chars: Array, rules: Dictionary = {}) -> Dictionary:
	var rl := _rules(rules)
	if not ok_ref(st, from) or not ok_ref(st, to) or from["at"] == "shop" or to["at"] == "shop":
		return fail("ตำแหน่งไม่ถูกต้อง")
	var a: Variant = get_at(st, from)
	var b: Variant = get_at(st, to)
	if a == null:
		return fail("ไม่มีตัวละครที่ช่องต้นทาง")
	if is_same(a, b):
		return done()
	if b != null and R.js_seq(b["id"], a["id"]) and float(b["level"]) == float(a["level"]) and float(a["level"]) < float(rl["maxLevel"]):
		if _fast_need(st, a["id"], rl) <= 2.0:
			return merge(st, [from], to, chars, rl)
		var third: Variant = null
		for x in all_units(st):
			if not is_same(x["u"], a) and not is_same(x["u"], b) and R.js_seq(x["u"]["id"], a["id"]) and float(x["u"]["level"]) == float(a["level"]):
				third = x
				break
		if third == null:
			return fail("รวมร่างต้องมี %s เลเวล %s ครบ %s ตัว" % [a["id"], R.js_num(a["level"]), R.js_num(rl["shop"]["mergeCount"])])
		return merge(st, [from, third["ref"]], to, chars, rl)
	put(st, to, a)
	put(st, from, b)
	return done()

static func merge(st: Dictionary, src_refs: Array, dest_ref: Dictionary, chars: Array, rules: Dictionary, extra: Array = []) -> Dictionary:
	var dest: Dictionary = get_at(st, dest_ref)
	var srcs := src_refs.map(func(r): return get_at(st, r))
	srcs.append_array(extra)
	var res := {"uid": dest["uid"], "id": dest["id"], "level": float(dest["level"]) + 1.0, "perm": {}, "paid": dest["paid"]}
	for k in PERM_KEYS():
		add_perm(res, k, R.js_or0(dest["perm"].get(k)), rules)
	for s in srcs:
		res["paid"] = float(res["paid"]) + float(s["paid"])
		for k in PERM_KEYS():
			add_perm(res, k, R.js_or0(s["perm"].get(k)), rules)
	var cc: Variant = _find_char(chars, res["id"])
	var cp := float(R.js_i32(cc.get("price") if cc != null else null))
	res["paid"] = maxf(0.0, float(res["paid"]) - cp)
	for r in src_refs:
		put(st, r, null)
	put(st, dest_ref, res)
	RR.rn_sync(st, {"from": srcs.map(func(x): return x["uid"]), "to": res["uid"]})
	var c: Dictionary = _find_char(chars, res["id"])
	var msgs := ["รวมร่าง %s %s → เลเวล %s" % [c["id"], c["name"], R.js_num(res["level"])]]
	fire_shop_skill(st, res, dest_ref, "merge", chars, rules, msgs)
	var out := done(msgs)
	out["merged"] = res["level"]
	return out

# ---------- team for the fight + end of match ----------
static func team_entries(st: Dictionary) -> Array:
	var out := []
	for x in board_units(st):
		var u: Dictionary = x["u"]
		var perm := {}
		for k in PERM_KEYS():
			if R.js_or0(u["perm"].get(k)) != 0.0:
				perm[k] = u["perm"][k]
		var e := {"id": u["id"], "level": u["level"], "row": x["ref"]["row"], "lane": x["ref"]["lane"]}
		if not perm.is_empty():
			e["perm"] = perm
		out.append(e)
	return out

# won: true = win or draw · gains = simulate().perm of this side · boss = this match was a boss fight
static func end_match(st: Dictionary, won: Variant, chars: Array, rules: Dictionary = {}, gains: Variant = [], boss: Variant = false, stage: Variant = null) -> Dictionary:
	var rl := _rules(rules)
	var sg := _stage(stage)
	var S: Dictionary = rl["shop"]
	var msgs := []
	var w := _truthy(won)
	st["op"] = false
	apply_battle_perm(st, gains, chars, rl, msgs)
	for x in board_units(st):
		fire_shop_skill(st, x["u"], x["ref"], "matchEnd", chars, rl, msgs)
	if w:
		for x in board_units(st):
			fire_shop_skill(st, x["u"], x["ref"], "matchWin", chars, rl, msgs)
	st["lastWon"] = w
	if w:
		st["wins"] = float(st["wins"]) + 1.0
	else:
		st["hearts"] = float(st["hearts"]) - 1.0
	var second := lose_guard(st, msgs)
	if _truthy(boss):
		st["bw"] = 0.0
		if w:
			st["bk"] = float(st["bk"]) + 1.0
	elif w:
		st["bw"] = float(st["bw"]) + 1.0
	st["ls"] = 0.0 if w else float(R.js_i32(st.get("ls")) + 1)
	st["ws"] = float(R.js_i32(st.get("ws")) + 1) if w else 0.0
	if float(st["hearts"]) <= 0.0 or (not _truthy(st.get("extra")) and float(st["wins"]) >= float(S["winsToFinish"])) \
			or float(st["round"]) >= float(R.js_i32(sg["settings"].get("lastStage"))):
		st["over"] = true
	var out := done(msgs)
	if second:
		out["second"] = true
	return out

# G1 second chance: hearts would hit 0 (once per run) → 1 heart back + a legend rune pick
static func lose_guard(st: Dictionary, msgs: Array = []) -> bool:
	if float(st.get("hearts", 0.0)) > 0.0 or _truthy(st.get("sc")):
		return false
	st["hearts"] = 1.0
	st["sc"] = 1.0
	msgs.append("โอกาสสุดท้าย! ได้หัวใจคืน 1 ดวง + เลือกรูนตำนานฟรี 1 อัน (ครั้งเดียวต่อ run)")
	return true

# set 99: after the run is cleared the player may keep playing extra matches with the hearts left
static func continue_extra(st: Dictionary, rules: Dictionary = {}) -> Dictionary:
	var rl := _rules(rules)
	if not _truthy(st.get("over")) or _truthy(st.get("extra")) or float(st["hearts"]) <= 0.0 or float(st["wins"]) < float(rl["shop"]["winsToFinish"]) \
			or float(st["round"]) >= float(R.js_i32(RB.RUN_STAGE()["settings"].get("lastStage"))):
		return fail("เล่นต่อไม่ได้")
	st["extra"] = true
	st["over"] = false
	return done(["แมตช์พิเศษ: เล่นต่อด้วยหัวใจที่เหลือ"])

# perm stats from the fight: to the unit on the same slot with the same id · over the cap is cut
static func apply_battle_perm(st: Dictionary, gains: Variant, chars: Array, rules: Dictionary, msgs: Array) -> void:
	if not (gains is Array):
		return
	var sum := {}
	for g in gains.slice(0, 200):
		if not (g is Dictionary) or not (g.get("key") is String) or not PERM_KEYS().has(g["key"]):
			continue
		if not R.is_int(g.get("row")) or not R.is_int(g.get("lane")) or float(g["row"]) < 0.0 or float(g["row"]) > 2.0 or float(g["lane"]) < 0.0 or float(g["lane"]) > 1.0:
			continue
		var amt: Variant = g.get("amount")
		if not (R.is_num(amt) and float(amt) > 0.0 and float(amt) <= float(rules["permSanityMax"])):
			continue
		var u: Variant = st["board"][int(g["row"])][int(g["lane"])]
		if not (u is Dictionary) or not R.js_seq(u["id"], g.get("id")):
			continue
		var got := add_perm(u, g["key"], floorf(float(amt) * RR.rn_perm_mul(st, u)), rules)
		if got > 0.0:
			var k := "%s|%s" % [u["id"], g["key"]]
			sum[k] = float(sum.get(k, 0.0)) + got
	for k in sum:
		var parts: PackedStringArray = k.split("|")
		var c: Variant = _find_char(chars, parts[0])
		msgs.append("%s%s: ได้ %s ถาวร (จากสกิลระหว่างสู้)" % [parts[0], " " + c["name"] if c != null else "", give_amt(parts[1], sum[k])])

static func _truthy(v: Variant) -> bool:
	if v == null:
		return false
	if v is bool:
		return v
	if v is int or v is float:
		return float(v) != 0.0 and not is_nan(float(v))
	if v is String:
		return v != ""
	return true
