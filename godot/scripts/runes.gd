# src/core/runes.js port — runes in battle (set 195, plan step 6b): equipRunes · rnFlagTribes · runeRecord · RUNE_RUN_ONLY.
# A rune becomes a normal skill on the units in its scope, or a unit field battle.gd reads. Numbers come from the rune record.
# Check: tests/test_stage.gd vs golden stage.jsonl. A change in runes.js must be made here too.
# Security ③: rune records/equips may come from a save — every value is type-checked here before use (same as JS).
extends RefCounted

const R := preload("res://scripts/rules.gd")
const S := preload("res://scripts/stage.gd")

const _AT_ROW := ["front", "mid", "back"]

static func RUNE_RUN_ONLY() -> Array:
	return R.mod("runes")["RUNE_RUN_ONLY"]

static func _tribes() -> Array:
	return R.mod("rules")["TRIBES"]

static func _same_slot(u: Dictionary, s: Variant) -> bool:
	return s is Array and s.size() >= 2 and R.js_seq(u.get("row"), s[0]) and R.js_seq(u.get("lane"), s[1])

static func _in_scope(u: Dictionary, r: Dictionary, eq: Dictionary) -> bool:
	match r.get("scope"):
		"one": return _same_slot(u, eq.get("slot")) if eq.get("slot") is Array else false
		"front": return R.js_seq(u.get("row"), 0.0)
		"mid": return R.js_seq(u.get("row"), 1.0)
		"back": return R.js_seq(u.get("row"), 2.0)
		"laneTop": return R.js_seq(u.get("lane"), 0.0)
		"laneBottom": return R.js_seq(u.get("lane"), 1.0)
		"tribe":
			var t: Variant = r.get("tribe")
			return R.js_seq(u.get("tribe"), t) or (u.get("extraTribes") is Array and u["extraTribes"].any(func(x): return R.js_seq(x, t)))
		"team": return true
	return false

static func _sk(when: Variant, do_key: Variant, to: Variant, value: Variant, extra: Dictionary = {}) -> Dictionary:
	var s := {"when": when, "do": do_key, "to": to, "value": value, "idx": null, "src": "rune"}
	s.merge(extra, true)
	return s

# Number.isFinite(v) ? clamp(floor(v)) : lo
static func _rn_int(v: Variant, lo: float, hi: float) -> float:
	return minf(hi, maxf(lo, floorf(float(v)))) if R.is_num(v) else lo

static func _stat_skill(r: Dictionary, v: Variant) -> Variant:
	var e: Variant = S.M()["RUNE_EFF"].get(r["eff"]) if r.get("eff") is String else null
	if e == null:
		return null
	var do_key: Variant = e[2] if r.get("mode") == "flat" else e[3]
	if not (do_key is String) or do_key == "":
		return null
	var foe: bool = e.size() > 4 and e[4] == "foe"
	var when := "hit" if do_key == "lifesteal" else "matchStart"
	return {"skill": _sk(when, do_key, "allEnemies" if foe else "self", v), "foe": foe}

# typeof r[q] === 'number' ? r[q] : the special's default for q (0 when none)
static func _num(key: String, r: Dictionary, q: String) -> float:
	if r.get(q) is float or r.get(q) is int:
		return float(r[q])
	for f in S.M()["RUNE_SPEC"][key]["f"]:
		if f[0] == q:
			return float(f[2]) if (f[2] is float or f[2] is int) else 0.0
	return 0.0

static func _spec_fields(key: String, r: Dictionary, n: float, eq: Dictionary, u: Dictionary) -> Variant:
	match key:
		"allyDownDmg": return {"downDmgPct": _num(key, r, "pct") * n}
		"bossDmg": return {"bossDmgPct": _num(key, r, "dmgPct") * n}
		"lastStand": return {"lastStandDmg": _num(key, r, "dmgPct") * n, "lastStandCd": minf(90.0, _num(key, r, "cdPct") * n)}
		"avoidDeath": return {"avoidLeft": _rn_int(_num(key, r, "times") * n, 0.0, 9.0)}
		"armorShare": return {"shareTribePct": _num(key, r, "pct") * n, "shareTribeN": _rn_int(_num(key, r, "count"), 1.0, 5.0)}
		"taunt": return {"taunt": true}
		"link":
			var p: Variant = eq.get("partner")
			if p is Array and not _same_slot(u, p):
				return {"linkSlot": p.duplicate(), "linkPct": minf(100.0, _num(key, r, "pct") * n)}
			return null
	return null

static func _spec_static(key: String, r: Dictionary, n: float, u: Dictionary, ws: float) -> bool:
	match key:
		"glass":
			u["maxHp"] = maxf(1.0, floorf(float(u["maxHp"]) * (1.0 - minf(90.0, _num(key, r, "hpPct") * n) / 100.0)))
			u["hitAmp"] = R.js_or0(u.get("hitAmp")) + _num(key, r, "dmgPct") * n
			return true
		"fortress":
			u["maxHp"] = R.up_mul(float(u["maxHp"]), 1.0 + _num(key, r, "hpPct") * n / 100.0)
			u["atk"] = maxf(0.0, floorf(float(u["atk"]) * (1.0 - minf(90.0, _num(key, r, "atkPct") * n) / 100.0)))
			return true
		"growth":
			u["hitAmp"] = R.js_or0(u.get("hitAmp")) + minf(_num(key, r, "maxPct") * n, _num(key, r, "stepPct") * n * ws)
			return true
		"hpToArmorHit":
			var lost := floorf(float(u["maxHp"]) * minf(90.0, _num(key, r, "hpPct")) / 100.0)
			u["maxHp"] = maxf(1.0, float(u["maxHp"]) - lost)
			u["armorHit"] = R.js_or0(u.get("armorHit")) + R.up_gain(lost, _num(key, r, "rate") * n)
			return true
	return false

static func _spec_skill(key: String, r: Dictionary, n: float, eq: Dictionary, u: Dictionary) -> Variant:
	match key:
		"taunt": return {"skill": _sk("matchStart", "armorPct", "self", _num(key, r, "armorPct") * n)}
		"revive": return {"skill": _sk("selfDown", "revive", "self", minf(100.0, _num(key, r, "hpPct")), {"lim": _rn_int(_num(key, r, "times") * n, 0.0, 9.0)})}
		"freeze": return {"skill": _sk("matchStart", "stun", "allEnemies", R.js_round(_num(key, r, "sec") * n * 1000.0), {"bossPct": _num(key, r, "bossPct")}), "foe": true}
		"regenLow": return {"skill": _sk("tick", "healPct", "allyLowest", _num(key, r, "pct") * n, {"cd": maxf(1000.0, R.js_round(_num(key, r, "sec") * 1000.0))}), "one": true}
		"regen": return {"skill": _sk("tick", "healPct", "self", _num(key, r, "pct") * n, {"cd": maxf(1000.0, R.js_round(_num(key, r, "sec") * 1000.0))})}
		"buddy":
			var p: Variant = eq.get("partner")
			if p is Array and not _same_slot(u, p):
				return {"skill": _sk("hit", "allyStrike", "allyAt", 1.0, {"at": {"row": _AT_ROW[int(p[0])], "lane": "same" if R.js_seq(p[1], u.get("lane")) else "other"}, "pow": _num(key, r, "pct") * n})}
			return null
	return null

# flag tribe per copy: the player's pick for that copy, else the rune record's tribe (first tribe when unknown)
static func rn_flag_tribes(r: Dictionary, n: float, picked: Variant) -> Array:
	var tr := _tribes()
	var fb: Variant = r.get("tribe") if tr.has(r.get("tribe")) else tr[0]
	var out := []
	for i in int(n):
		out.append(picked[i] if picked is Array and i < picked.size() and tr.has(picked[i]) else fb)
	return out

static func _flag_extra(r: Dictionary, n: float, picked: Variant) -> Array:
	var by := {}
	for t in rn_flag_tribes(r, n, picked):
		by[t] = by.get(t, 0.0) + 1.0
	var out := []
	var cnt: Variant = r.get("count")
	for t in by:
		out.append({"tribe": t, "count": _rn_int(float(cnt) * by[t] if R.is_num(cnt) else NAN, 0.0, 9.0), "maxTier": _rn_int(r.get("maxTier"), 2.0, 6.0)})
	return out

# units = build_team() output (not changed) · equips = [{r, n, slot, partner, tribes?}] → {units, tribeExtra, skipped}
static func equip_runes(units: Array, equips: Variant = [], ctx: Variant = null) -> Dictionary:
	var cx: Dictionary = ctx if ctx is Dictionary else {}
	var out := []
	for u0 in units:
		var u: Dictionary = u0.duplicate()
		u["extraTribes"] = (u0["extraTribes"] if u0.get("extraTribes") is Array else []).duplicate()
		var sks := []
		for s in (u0["skills"] if u0.get("skills") is Array else []):
			sks.append(s.duplicate())
		u["skills"] = sks
		out.append(u)
	var list := []
	if equips is Array:
		for e in equips:
			if e is Dictionary and e.get("r") is Dictionary and e["r"].has("eff"):
				list.append(e)
	var skipped := []
	var tribe_extra := []
	var tr := _tribes()
	# DNA first: later 'tribe' scope runes must see the tribes those runes added
	for e in list:
		if e["r"]["eff"] == "addTribe":
			var t: Variant = e["r"].get("gain") if tr.has(e["r"].get("gain")) else tr[0]
			for u in out:
				if _in_scope(u, e["r"], e) and not R.js_seq(u.get("tribe"), t) and not u["extraTribes"].has(t):
					u["extraTribes"].append(t)
	var run_only := RUNE_RUN_ONLY()
	var ws := _rn_int(cx.get("winStreak", 0.0) if cx.get("winStreak") != null else 0.0, 0.0, 99.0)
	for e in list:
		var r: Dictionary = e["r"]
		var n := _rn_int(e.get("n") if e.get("n") != null else 1.0, 1.0, 9.0)
		var eff: Variant = r["eff"]
		var kind := S.rune_kind(eff)
		if eff is String and eff == "addTribe":
			continue
		if eff is String and run_only.has(eff):
			skipped.append(r.get("id"))
			continue
		if eff is String and eff == "flag":
			tribe_extra.append_array(_flag_extra(r, n, e.get("tribes")))
			continue
		if kind == "stat":
			var s: Variant = _stat_skill(r, float(r["v"]) * n)
			if s == null:
				skipped.append(r.get("id"))
				continue
			if s["foe"]:
				if out.size() > 0:
					out[0]["skills"].append(s["skill"])
				continue
			for u in out:
				if _in_scope(u, r, e):
					u["skills"].append(s["skill"].duplicate())
			continue
		if kind == "skill":
			for u in out:
				if _in_scope(u, r, e):
					u["skills"].append(_sk(r.get("when"), r.get("do"), r.get("to"), float(r["v"]) * n))
			continue
		# special
		var targets := []
		if r.get("scope") == "enemy":
			if out.size() > 0:
				targets.append(out[0])
		else:
			for u in out:
				if _in_scope(u, r, e):
					targets.append(u)
		var used := false
		var key: String = eff if eff is String else ""
		for u in targets:
			if _spec_static(key, r, n, u, ws):
				used = true
				continue
			var f: Variant = _spec_fields(key, r, n, e, u)
			if f != null:
				u.merge(f, true)
				used = true
			var s: Variant = _spec_skill(key, r, n, e, u)
			if s != null:
				u["skills"].append(s["skill"])
				used = true
				if s.get("one", false):
					break
		if not used:
			skipped.append(r.get("id"))
	for u in out:
		u["hp"] = u["maxHp"]
	return {"units": out, "tribeExtra": tribe_extra, "skipped": skipped}

# rune record by id from a stage object (built-in runes first, then custom)
static func rune_record(stage: Variant, id: Variant) -> Variant:
	if not (stage is Dictionary):
		return null
	if stage.get("runes") is Dictionary and id is String and stage["runes"].get(id) is Dictionary:
		return stage["runes"][id]
	if stage.get("custom") is Array:
		for c in stage["custom"]:
			if c is Dictionary and R.js_seq(c.get("id"), id):
				return c
	return null
