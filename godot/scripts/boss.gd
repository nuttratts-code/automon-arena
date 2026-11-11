# src/core/boss.js port — bossUnit · bossV2Phases · heatRules · phaseUnitStats (set 195, plan step 6b).
# spotCells/phaseIndexAt/ruleMap/fxMap/slotsOf live in rules.gd (set 194, battle port).
# Check: tests/test_stage.gd vs golden stage.jsonl. A change in boss.js must be made here too.
extends RefCounted

const R := preload("res://scripts/rules.gd")
const S := preload("res://scripts/stage.gd")

static func slot_key(row: float, lane: float) -> float:
	return row * 2.0 + lane

# Math.max(lo, Math.floor(v) || d)
static func _floor_or(v: Variant, d: float, lo: float) -> float:
	var f := floorf(float(v)) if R.is_num(v) else 0.0
	return maxf(lo, f if f != 0.0 else d)

static func boss_unit(b: Dictionary, k: float = 1.0, extra_pct: float = 0.0, g2: Variant = null) -> Dictionary:
	if g2 == null:
		g2 = S.boss2_default()
	var si: Variant = R.spot_info(b.get("spot"))
	if si == null:
		si = {"bits": "111111", "move": false}
	var at := S.boss_at(b, k, extra_pct, g2)
	var ma: float = S.boss_mults(b, k, extra_pct, g2)["atk"]
	var slots := R.slots_of(si["bits"])
	var first: int = int(slots[0]) if slots.size() > 0 else 0
	var bars := _floor_or(b.get("bars"), 1.0, 1.0)
	var src: Array
	if S._truthy(b.get("dummy")):
		src = b["phases"] if b.get("phases") is Array else []
	else:
		src = boss_v2_phases(b, k, g2)
	var phases := []
	for p in src:
		var rules := []
		for r in (p["rules"] if p.get("rules") is Array else []):
			rules.append(r.duplicate())
		var fx := []
		for f in (p["fx"] if p.get("fx") is Array else []):
			fx.append(f.duplicate())
		var spot: Variant = p.get("spot")
		var ph := {"rules": rules, "fx": fx, "spot": spot if (spot is String and spot != "") else "", "stats": _phase_unit_stats(p.get("stats"), ma)}
		if p.has("at"):
			ph["at"] = p["at"]
		phases.append(ph)
	return {
		"id": b.get("id"), "name": b.get("name"), "tribe": b.get("tribe"), "extraTribes": [], "level": 1.0,
		"row": float(first >> 1), "lane": float(first & 1),
		"maxHp": at["hp"], "hp": at["hp"], "atk": at["atk"], "startArmor": at["armor"],
		"burnHit": R.js_or0(b.get("burn")), "shockHit": R.js_or0(b.get("shock")), "armorHit": R.js_or0(b.get("armorHit")), "healHit": R.js_or0(b.get("healHit")),
		"multi": _floor_or(b.get("multi"), 1.0, 1.0), "cdMs": maxf(1.0, R.js_round(float(b["cdMs"]))),
		"skills": [],
		"boss": true, "bars": bars, "barHp": maxf(1.0, floorf(at["hp"] / bars)),
		"slots": slots if slots.size() > 0 else [0.0], "move": si["move"], "moveSec": _floor_or(b.get("moveSec"), 8.0, 1.0),
		"phases": phases,
	}

# JS `a ?? b` for a dictionary key (missing or null → b)
static func _nn(d: Dictionary, k: String, b: Variant) -> Variant:
	var v: Variant = d.get(k)
	return b if v == null else v

# Boss v2 phases: each phase ADDS its rules to the earlier ones (+ weak/resist base + Heat for k ≥ 3).
# Dictionary keeps insertion order and a re-set key keeps its place = JS Map.
static func boss_v2_phases(b: Dictionary, k: float = 1.0, g2: Variant = null) -> Array:
	if g2 == null:
		g2 = S.boss2_default()
	var base := []
	var weak := minf(float(_nn(b, "weakPct", g2["weakPct"])), float(g2["weakCap"]))
	var bw: Variant = b.get("weak")
	if S._truthy(bw) and not R.js_seq(bw, b.get("tribe")) and weak > 0.0:
		base.append({"id": "tribeWeak", "v": weak, "tribe": bw})
	var resist := float(_nn(b, "resistPct", g2["resistPct"]))
	if resist > 0.0:
		base.append({"id": "tribeResist", "v": resist, "tribe": b.get("tribe")})
	var heat := heat_rules(b, k, g2)
	var acc := {}
	for r in base:
		acc[r["id"]] = r
	var out := []
	for p in (b["phases"] if b.get("phases") is Array else []):
		acc = acc.duplicate()  # shallow, like new Map(acc)
		for r in (p["rules"] if p.get("rules") is Array else []):
			acc[r["id"]] = r.duplicate()
		var m := acc.duplicate()
		for r in heat:
			m[r["id"]] = r
		var q: Dictionary = p.duplicate()
		q["rules"] = m.values()
		out.append(q)
	return out

# Heat rules of boss b at boss number k (k − 2 steps · kit rules skipped · past the list: steps 1–2 again, stronger).
# Same as JS: the repeat steps raise v on the first two picked rules in place (no new entries).
static func heat_rules(b: Dictionary, k: float, g2: Variant = null) -> Array:
	if g2 == null:
		g2 = S.boss2_default()
	var n := maxi(0, R.js_i32(k) - 2)
	var list: Array = g2["heat"] if g2.get("heat") is Array else []
	if n == 0 or list.is_empty():
		return []
	var kit := {}
	for p in (b["phases"] if b.get("phases") is Array else []):
		for r in (p["rules"] if p.get("rules") is Array else []):
			kit[r["id"]] = true
	var got := []
	for r in list:
		if got.size() >= n:
			break
		if not kit.has(r["id"]):
			got.append(r.duplicate())
	var rep := got.slice(0, 2)  # same Dictionaries as got[0..1]
	var e := 0
	while got.size() + e < n and rep.size() > 0:
		var r: Dictionary = rep[e % rep.size()]
		var q: Variant = S.boss_rule_def(r["id"])
		if q != null and R.is_num(q[4]) and float(q[4]) != 0.0:
			r["v"] = minf(float(q[4]), R.js_fixed2(float(r["v"]) * (1.0 + R.js_or0(g2.get("heatRepeatPct")) / 100.0)))
		e += 1
	return got

# phase stats (boss-record keys) → unit fields · atk grows with the stage like the base atk
const _PHASE_FIELD := [["atk", "atk"], ["cdMs", "cdMs"], ["multi", "multi"], ["burn", "burnHit"], ["shock", "shockHit"], ["armorHit", "armorHit"], ["healHit", "healHit"]]
static func _phase_unit_stats(st: Variant, m: float) -> Dictionary:
	var o := {}
	if not (st is Dictionary):
		return o
	for kf in _PHASE_FIELD:
		var v: Variant = st.get(kf[0])
		if not (v is float or v is int):
			continue
		var x := float(v)
		if kf[0] == "atk":
			x = R.js_round(x * m)
		elif kf[0] == "cdMs":
			x = maxf(1.0, R.js_round(x))
		elif kf[0] == "multi":
			x = maxf(1.0, floorf(x))
		o[kf[1]] = x
	return o
