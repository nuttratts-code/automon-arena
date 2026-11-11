# src/core/bot.js port (set 195, plan step 6e) — the bot shops with the same shop + rules as the player (only shop.gd commands),
# judges every buy / sell / reroll by an estimated team strength, arranges the board, takes + places runes.
# No randomness of its own (only the run seed in the shop state) → same seed, same team.
# Check: tests/test_bot.gd vs golden (c) runs.jsonl (whole bot runs) + bot.jsonl. A change in bot.js must be made here too.
# Math.log / Math.pow = jsmath.gd js_log / js_pow (V8's own, exact bits).
extends RefCounted

const R := preload("res://scripts/rules.gd")
const SH := preload("res://scripts/shop.gd")
const P := preload("res://scripts/power.gd")
const RN := preload("res://scripts/runes.gd")
const RR := preload("res://scripts/runrunes.gd")
const JM := preload("res://scripts/jsmath.gd")

const BOT_RAR := ["ธรรมดา", "ไม่ธรรมดา", "หายาก", "หายากมาก", "ตำนาน"]

static func BOT_AI() -> Dictionary:
	return R.mod("bot")["BOT_AI"]

static func BOT_HINT() -> Dictionary:
	return R.mod("bot")["BOT_HINT"]

static func _rules(rules: Dictionary) -> Dictionary:
	return R.RULES() if rules.is_empty() else rules

static func _has_same(list: Array, x: Variant) -> bool:  # JS includes() on objects = identity
	for y in list:
		if is_same(y, x):
			return true
	return false

static func _tribes(c: Dictionary) -> Array:
	var ts := [c["tribe"]]
	ts.append_array(c["extraTribes"] if c.get("extraTribes") is Array else [])
	return ts

# ---- rules.js row hints ----
static func rows_of_hint(h: Variant) -> Array:
	var M := R.mod("rules")
	if R.js_seq(h, "ที่ไหนก็ได้"):
		return [0.0, 1.0, 2.0]
	if h is String and M["ROW_HINTS"].has(h):
		return Array(h.split("+")).map(func(x): return M["ROW_IDX"].get(x))
	return []

static func pick_hint_row(h: Variant, r: float) -> Variant:
	var rs := rows_of_hint(h)
	return rs[int(minf(1.0, floorf(r * 2.0)))] if rs.size() == 2 else null

static func value(u: Dictionary, cm: Dictionary) -> float:
	return float(cm[u["id"]]["price"]) * JM.js_pow(3.0, float(u["level"]) - 1.0)

static func main_tribes(st: Dictionary, cm: Dictionary) -> Dictionary:
	var n := {}
	for x in SH.all_units(st):
		for t in _tribes(cm[x["u"]["id"]]):
			n[t] = float(n.get(t, 0.0)) + 1.0
	return n

static func try_merges(st: Dictionary, chars: Array, rules: Dictionary) -> void:
	for guard in 20:
		var groups := {}
		for x in SH.all_units(st):
			if float(x["u"]["level"]) < float(rules["maxLevel"]):
				var key := "%s:%s" % [x["u"]["id"], R.js_num(x["u"]["level"])]
				if not groups.has(key):
					groups[key] = []
				groups[key].append(x)
		var g: Variant = null
		for l in groups.values():
			if l.size() >= float(rules["shop"]["mergeCount"]):
				g = l
				break
		if g == null:
			return
		var di := 0
		for k in g.size():
			if g[k]["ref"]["at"] == "board":
				di = k
				break
		var si := 0 if di != 0 else 1
		SH.move(st, g[si]["ref"], g[di]["ref"], chars, rules)

# ---- strength estimate ----
static var _pw_chars: Array = []
static var _pw_rules: Dictionary = {}
static var _pw: Dictionary = {}
static func powers(chars: Array, rules: Dictionary) -> Dictionary:
	if not (is_same(_pw_chars, chars) and is_same(_pw_rules, rules)) or _pw.is_empty():
		var m := {}
		for c in chars:
			m[c["id"]] = [0, 1, 2].map(func(L): return P.base_power(c, L, rules)["points"])
		_pw_chars = chars
		_pw_rules = rules
		_pw = m
	return _pw

static func copies_of(units: Array) -> Dictionary:
	var n := {}
	for u in units:
		n[u["id"]] = float(n.get(u["id"], 0.0)) + JM.js_pow(3.0, float(u["level"]) - 1.0)
	return n

static func group_value(pw: Dictionary, id: Variant, copies: float, rules: Dictionary) -> float:
	var ml := float(rules["maxLevel"])
	var ai := BOT_AI()
	var l3 := JM.js_log(3.0)
	var top := minf(ml, 1.0 + floorf(JM.js_log(copies + 1e-9) / l3))
	var pot := minf(ml, 1.0 + JM.js_log(copies) / l3)
	var lo := floorf(pot)
	var f := pot - lo
	var p: Array = pw[id]
	var potV: float = p[int(ml) - 1] if lo >= ml else p[int(lo) - 1] * (1.0 - f) + p[int(lo)] * f
	return (1.0 - ai["potW"]) * p[int(top) - 1] + ai["potW"] * potV

# best 6 different characters (greedy, tribe bonus included) → {score, ids} · focus = a tribe this bot likes
static func team_strength(copies: Dictionary, cm: Dictionary, pw: Dictionary, rules: Dictionary, focus: Variant = null) -> Dictionary:
	var ai := BOT_AI()
	var ids: Array = copies.keys()
	var gv := {}
	for id in ids:
		var fm := 1.0
		if focus != null and (R.js_seq(cm[id]["tribe"], focus) or cm[id]["extraTribes"].has(focus)):
			fm = 1.0 + ai["focusW"]
		gv[id] = group_value(pw, id, copies[id], rules) * fm
	if R.js_or0(ai.get("carryW")) != 0.0:
		var c: Variant = null
		for id in ids:
			if copies[id] >= 3.0 and copies[id] < 9.0 and (c == null or copies[id] > copies[c] or (copies[id] == copies[c] and pw[id][2] > pw[c][2])):
				c = id
		if c != null:
			gv[c] += ai["carryW"] * (pw[c][2] - pw[c][1]) * (copies[c] - 3.0) / 6.0
	var pick := []
	var cnt := {}
	var sum := {}
	var steps: Array = rules["tribeSteps"]
	var tw: Array = ai["tribeW"]
	var tribe_score := func() -> float:
		var s := 0.0
		for t in cnt:
			var i := -1
			for x in steps:
				if cnt[t] >= x:
					i += 1
			if i >= 0:
				s += sum[t] * tw[mini(i, 2)]
		return s
	var base := 0.0
	while pick.size() < float(rules["maxBoard"]) and pick.size() < ids.size():
		var best: Variant = null
		var best_s := -1.0
		for id in ids:
			if pick.has(id):
				continue
			var tr := _tribes(cm[id])
			for t in tr:
				cnt[t] = float(cnt.get(t, 0.0)) + 1.0
				sum[t] = float(sum.get(t, 0.0)) + gv[id]
			var s: float = base + gv[id] + tribe_score.call()
			for t in tr:
				cnt[t] -= 1.0
				sum[t] -= gv[id]
			if s > best_s or (s == best_s and best != null and id < best):
				best_s = s
				best = id
		pick.append(best)
		base += gv[best]
		for t in _tribes(cm[best]):
			cnt[t] = float(cnt.get(t, 0.0)) + 1.0
			sum[t] = float(sum.get(t, 0.0)) + gv[best]
	return {"score": base + tribe_score.call(), "ids": pick}

static func _units_now(st: Dictionary) -> Array:
	return SH.all_units(st).map(func(x): return x["u"])

static func _strength_with(st: Dictionary, cm: Dictionary, pw: Dictionary, rules: Dictionary, add: Variant = null, drop: Variant = null, focus: Variant = null) -> float:
	var us := _units_now(st).filter(func(u): return not is_same(u, drop))
	if add != null:
		us.append({"id": add, "level": 1.0})
	return team_strength(copies_of(us), cm, pw, rules, focus)["score"]

# board (set 85 / 101): the best 6 different characters at their highest level, extra copies fill empty slots, rows by hint
static func arrange(st: Dictionary, cm: Dictionary, chars: Variant = null, rules: Dictionary = {}, focus: Variant = null) -> void:
	var rl := _rules(rules)
	var all := R.sort_cmp(_units_now(st), func(a, b):
		if a["level"] != b["level"]: return b["level"] - a["level"]
		var dv := value(b, cm) - value(a, cm)
		if dv != 0.0: return dv
		return a["uid"] - b["uid"])
	var chosen := []
	if chars is Array:
		var pw := powers(chars, rl)
		for id in team_strength(copies_of(all), cm, pw, rl, focus)["ids"]:
			for u in all:
				if u["id"] == id:
					chosen.append(u)
					break
		for u in all:
			if chosen.size() < SH.SLOT_ORDER.size() and not _has_same(chosen, u):
				chosen.append(u)
	else:
		chosen = all.slice(0, SH.SLOT_ORDER.size())
	var hint := BOT_HINT()
	var key := func(u):
		var h: Variant = cm[u["id"]]["rowHint"]
		var p: Variant = pick_hint_row(h, fmod(float(u["uid"]) * 7.0 + float(st["round"]), 2.0) / 2.0)
		if p != null:
			return float(p)
		return float(hint[h]) if hint.get(h) != null else 1.0
	var n_rows := func(h): return maxi(1, rows_of_hint(h).size())
	var idx := []
	for i in chosen.size():
		idx.append({"u": chosen[i], "i": i})
	idx = R.sort_cmp(idx, func(a, b):
		var d: int = n_rows.call(cm[a["u"]["id"]]["rowHint"]) - n_rows.call(cm[b["u"]["id"]]["rowHint"])
		return d if d != 0 else a["i"] - b["i"])
	var on_board := idx.map(func(x): return x["u"])
	var rest := all.filter(func(u): return not _has_same(on_board, u))
	st["board"] = [[null, null], [null, null], [null, null]]
	var free := func(r: int) -> int:
		var row: Array = st["board"][r]
		for k in row.size():
			if row[k] == null:
				return k
		return -1
	for u in on_board:
		var want: float = key.call(u)
		var ok := rows_of_hint(cm[u["id"]]["rowHint"])
		var order := R.sort_cmp([0.0, 1.0, 2.0], func(a, b):
			var d := (-1.0 if a == want else 0.0) - (-1.0 if b == want else 0.0)
			if d != 0.0: return d
			d = float(ok.has(b)) - float(ok.has(a))
			if d != 0.0: return d
			d = absf(a - want) - absf(b - want)
			if d != 0.0: return d
			return a - b)
		for r in order:
			var fi: int = free.call(int(r))
			if fi >= 0:
				st["board"][int(r)][fi] = u
				break
	var bench := []
	for i in st["bench"].size():
		bench.append(rest[i] if i < rest.size() else null)
	st["bench"] = bench

# carry = most copies on its way to Lv3 · ties → cheaper
static func _carry_of(st: Dictionary, cm: Dictionary, rules: Dictionary) -> Variant:
	var n := copies_of(_units_now(st))
	var mc := float(rules["shop"]["mergeCount"])
	var need := JM.js_pow(mc, float(rules["maxLevel"]) - 1.0)
	var c: Variant = null
	for id in n:
		if n[id] >= mc and n[id] < need and (c == null or n[id] > n[c] or (n[id] == n[c] and float(cm[id]["price"]) < float(cm[c]["price"]))):
			c = id
	return c

static func _free_dest(st: Dictionary) -> Variant:
	if st["bench"].has(null):
		return null
	for s in SH.SLOT_ORDER:
		if st["board"][int(s[0])][int(s[1])] == null:
			return {"at": "board", "row": s[0], "lane": s[1]}
	return null

static func _weakest(st: Dictionary, cm: Dictionary, pw: Dictionary, rules: Dictionary, F: Variant, keep: Variant) -> Variant:
	var now := _strength_with(st, cm, pw, rules, null, null, F)
	var w: Variant = null
	for x in SH.all_units(st):
		if R.js_seq(x["u"]["id"], keep):
			continue
		var loss := now - _strength_with(st, cm, pw, rules, null, x["u"], F)
		if w == null or loss < w["loss"] or (loss == w["loss"] and float(x["u"]["uid"]) < float(w["u"]["uid"])):
			w = {"u": x["u"], "ref": x["ref"], "loss": loss}
	return w

static func bot_shop(st: Dictionary, chars: Array, rules: Dictionary = {}, opts: Dictionary = {}) -> void:
	var rl := _rules(rules)
	var ai := BOT_AI()
	var cm := {}
	for c in chars:
		cm[c["id"]] = c
	var pw := powers(chars, rl)
	var max_rerolls: float = opts["maxRerolls"] if opts.get("maxRerolls") != null else ai["maxRerolls"]
	var F: Variant = opts.get("focus") if S_truthy(opts.get("focus")) else null
	var cap: float = float(rl["maxBoard"]) + st["bench"].size()
	var mc := float(rl["shop"]["mergeCount"])
	var rerolls := 0.0
	for guard in 200:
		try_merges(st, chars, rl)
		var merge_first := S_truthy(ai.get("mergeFirst"))
		var carry: Variant = _carry_of(st, cm, rl) if merge_first and float(st["round"]) >= float(ai["carryFrom"]) else null
		if merge_first:
			var own1 := func(id): return SH.all_units(st).filter(func(x): return R.js_seq(x["u"]["id"], id) and float(x["u"]["level"]) == 1.0)
			var i := -1
			for k in st["shop"].size():
				var s: Dictionary = st["shop"][k]
				if S_truthy(s.get("id")) and float(cm[s["id"]]["price"]) <= float(st["gold"]) and own1.call(s["id"]).size() >= mc - 1.0:
					i = k
					break
			if i >= 0 and SH.buy_merge(st, float(i), own1.call(st["shop"][i]["id"])[0]["ref"], chars, rl)["ok"]:
				continue
			var ci := -1
			if carry != null:
				for k in st["shop"].size():
					if R.js_seq(st["shop"][k].get("id"), carry) and float(cm[carry]["price"]) <= float(st["gold"]):
						ci = k
						break
			if ci >= 0:
				if SH.all_units(st).size() < cap:
					if SH.buy(st, float(ci), _free_dest(st), chars, rl)["ok"]:
						continue
				else:
					var w: Variant = _weakest(st, cm, pw, rl, F, carry)
					if w != null:
						SH.sell(st, w["ref"], chars, rl)
						continue
		var now := _strength_with(st, cm, pw, rl, null, null, F)
		var best: Variant = null
		for k in st["shop"].size():
			var s: Dictionary = st["shop"][k]
			if not S_truthy(s.get("id")) or float(cm[s["id"]]["price"]) > float(st["gold"]):
				continue
			var g := _strength_with(st, cm, pw, rl, s["id"], null, F) - now
			if g > float(ai["minGain"]) and (best == null or g > best["g"]):
				best = {"i": k, "g": g, "id": s["id"]}
		if best != null:
			if SH.all_units(st).size() < cap:
				var dest: Variant = null
				if not st["bench"].has(null):
					for sl in SH.SLOT_ORDER:
						if st["board"][int(sl[0])][int(sl[1])] == null:
							dest = {"at": "board", "row": sl[0], "lane": sl[1]}
							break
				if SH.buy(st, float(best["i"]), dest, chars, rl)["ok"]:
					continue
			else:
				var worst: Variant = null
				for x in SH.all_units(st):
					if R.js_seq(x["u"]["id"], carry):
						continue
					var net: float = best["g"] - (now - _strength_with(st, cm, pw, rl, null, x["u"], F))
					if worst == null or net > worst["net"] or (net == worst["net"] and float(x["u"]["uid"]) < float(worst["u"]["uid"])):
						worst = {"u": x["u"], "ref": x["ref"], "net": net}
				if worst != null and worst["net"] > float(ai["minGain"]):
					SH.sell(st, worst["ref"], chars, rl)
					continue
		if rerolls < max_rerolls and float(st["gold"]) >= float(rl["shop"]["rerollCost"]):
			SH.reroll(st, chars, rl)
			rerolls += 1.0
			continue
		break
	try_merges(st, chars, rl)
	arrange(st, cm, chars, rl, F)

# ---- runes (set 107): highest rarity, battle runes before run-only · free reroll when no legend (never paid) ----
static func _r_rank(r: Dictionary) -> float:
	return float(RR.RN_RARS.find(r.get("rarity"))) * 2.0 + (0.0 if RN.RUNE_RUN_ONLY().has(r.get("eff")) else 1.0)

# flag runes (T8) count the bot's main board tribe (most units, extra tribes count · tie = first in TRIBES order)
static func bot_flag_tribe(st: Dictionary, cm: Variant) -> Variant:
	if not (cm is Dictionary):
		return null
	var n := {}
	for row in st["board"]:
		for u in row:
			if u is Dictionary and cm.has(u["id"]):
				for t in _tribes(cm[u["id"]]):
					n[t] = float(n.get(t, 0.0)) + 1.0
	var best: Variant = null
	for t in R.mod("rules")["TRIBES"]:
		if R.js_or0(n.get(t)) != 0.0 and (best == null or n[t] > n[best]):
			best = t
	return best

static func bot_take_rune(st: Dictionary, kind: String, cm: Variant = null) -> void:
	var o: Variant = RR.rn_make_offer(st, kind)
	if o is Dictionary and kind != "boss" and not o["ids"].any(func(id): return RR.rn_rec(id)["rarity"] == "legend") and RR.rn_reroll_cost(st) == 0.0:
		RR.rn_reroll_offer(st)
		o = st["rn"]["offer"]
	if not (o is Dictionary):
		return
	var bi := 0
	for i in o["ids"].size():
		if _r_rank(RR.rn_rec(o["ids"][i])) > _r_rank(RR.rn_rec(o["ids"][bi])):
			bi = i
	RR.rn_take_offer(st, float(bi), null, bot_flag_tribe(st, cm))

static func bot_place_runes(st: Dictionary, cm: Dictionary, rules: Dictionary = {}) -> void:
	var rl := _rules(rules)
	var strength := func(u): return float(u["level"]) * 10.0 + float(BOT_RAR.find(cm[u["id"]]["rarity"]))
	var units := []
	for ri in st["board"].size():
		for li in st["board"][ri].size():
			var u: Variant = st["board"][ri][li]
			if u is Dictionary:
				units.append({"u": u, "s": [float(ri), float(li)]})
	units = R.sort_cmp(units, func(a, b): return strength.call(b["u"]) - strength.call(a["u"]))
	for id in st["rn"]["bag"].keys():
		var r: Variant = RR.rn_rec(id)
		if r == null:
			continue
		if RR.rn_needs_slot(r):
			RR.rn_place(st, id, units[0]["s"] if units.size() > 0 else null, rl)
		if RR.rn_needs_partner(r):
			RR.rn_place(st, id, units[1]["s"] if units.size() > 1 else null, rl, true)

static func S_truthy(v: Variant) -> bool:
	return SH._truthy(v)
