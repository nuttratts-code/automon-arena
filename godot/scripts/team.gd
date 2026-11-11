# src/core/team.js port (set 195, plan step 6a). A change in team.js must be made here too.
# build_team: validates first (validate.gd, same checks + same error text as JS); a bad team returns
# {"error": text, "details": [errors]} instead of throwing (GDScript has no exceptions) — callers check `is Dictionary`.
extends RefCounted

const R := preload("res://scripts/rules.gd")
const V := preload("res://scripts/validate.gd")

static func _rules(rules: Dictionary) -> Dictionary:
	return R.RULES() if rules.is_empty() else rules

static func pct_of(base: float, pct: Variant) -> float:
	return R.up_mul(base, 1.0 + float(pct) / 100.0) if pct != null and float(pct) != 0.0 else base

static func make_char_map(chars: Array) -> Dictionary:
	var m := {}
	for c in chars:
		m[c["id"]] = c
	return m

static func build_team(entries: Variant, char_map: Dictionary, rules: Dictionary = {}) -> Variant:
	var rl := _rules(rules)
	var check := V.validate_team(entries, char_map, rl)
	if not check["ok"]:
		return {"error": "ทีมไม่ถูกกฎ: " + " · ".join(check["errors"]), "details": check["errors"]}
	var out := []
	for e in entries:
		out.append(unit_of(char_map[e["id"]], e, rl, char_map))
	return out

static func _n(p: Dictionary, k: String) -> float:  # JS `p.k || 0`
	var v: Variant = p.get(k)
	return float(v) if v != null else 0.0

static func _cap(rl: Dictionary, k: String) -> float:  # rules.permCaps.k ?? Infinity
	var v: Variant = rl["permCaps"].get(k)
	return float(v) if v != null else INF

static func unit_of(c: Dictionary, e: Dictionary, rules: Dictionary, char_map: Variant) -> Dictionary:
	var L := int(e["level"]) - 1
	var p: Dictionary = e["perm"] if e.get("perm") is Dictionary else {}
	var cd_pct := minf(_n(p, "cdPct"), _cap(rules, "cdPct"))
	var cd_mult := maxf(0.0, 1.0 - cd_pct / 100.0)
	var share_to := {}
	for t in R.mod("rules")["SHARE_TO"]:
		var v: Variant = p.get("share_" + t)
		if v != null and float(v) > 0.0:
			share_to[t] = v
	var shop_when: Array = R.mod("rules")["SHOP_WHEN"]
	var skills := []
	var idx := 0
	for s0 in c["skills"]:
		var s: Dictionary = s0.duplicate()
		s["idx"] = float(idx)
		idx += 1
		if shop_when.has(s.get("when")) or (s.get("lv") != null and not s["lv"].has(e["level"])):
			continue
		s["value"] = s["v"][L]
		if s.get("do") == "summon" and char_map is Dictionary and s.get("summon") is String and char_map.has(s["summon"]):
			var t: Dictionary = char_map[s["summon"]]
			if t["id"] != c["id"]:
				var u := unit_of(t, {"id": t["id"], "level": e["level"], "row": e["row"], "lane": e["lane"]}, rules, null)
				u["skills"] = u["skills"].filter(func(y): return y.get("do") != "summon")
				s["unit"] = u
		skills.append(s)
	return {
		"id": c["id"], "name": c["name"], "tribe": c["tribe"], "extraTribes": c["extraTribes"].duplicate(), "level": e["level"],
		"row": e["row"], "lane": e["lane"],
		"maxHp": pct_of(c["hp"][L] + _n(p, "hp"), p.get("hpPct")),
		"atk": pct_of(c["atk"][L] + _n(p, "atk"), p.get("atkPct")),
		"startArmor": minf(_n(p, "armor"), _cap(rules, "armor")),
		"burnHit": pct_of(c["burn"][L] + minf(_n(p, "burn"), _cap(rules, "burn")), p.get("burnPct")),
		"shockHit": pct_of(c["shock"][L] + minf(_n(p, "shock"), _cap(rules, "shock")), p.get("shockPct")),
		"cdStart": _n(p, "cdStart"), "shareArmor": _n(p, "shareArmor"), "healToAtk": _n(p, "healToAtk"),
		"armorAmp": _n(p, "armorAmp"), "cdAmp": _n(p, "cdAmp"), "shockAmp": _n(p, "shockAmp"), "burnNoDecay": _n(p, "burnNoDecay") > 0.0,
		"healAmp": _n(p, "healAmp"), "hitAmp": _n(p, "hitAmp"), "burnAmp": _n(p, "burnAmp"),
		"shareTo": share_to,
		"armorHit": pct_of((c["armorHit"][L] if c.get("armorHit") != null else 0.0) + _n(p, "armorHit"), p.get("armorHitPct")),
		"healHit": (c["healHit"][L] if c.get("healHit") != null else 0.0) + _n(p, "healHit"),
		"multi": c["multi"][L] + minf(_n(p, "multi"), _cap(rules, "multi")),
		"cdMs": maxf(0.0, R.js_round((c["cdMs"][L] - _n(p, "cdMs")) * cd_mult)),
		"skills": skills,
	}

# Tribe count on the board: same id counts once · extra tribes count · downed units still count
static func count_tribes(entries: Array, char_map: Dictionary) -> Dictionary:
	var counts := {}
	for t in R.mod("rules")["TRIBES"]:
		counts[t] = 0.0
	var ids := {}
	for e in entries:
		ids[e["id"]] = true
	for id in ids:
		if not char_map.has(id):
			continue
		var c: Dictionary = char_map[id]
		var ts := [c["tribe"]]
		ts.append_array(c["extraTribes"])
		for t in ts:
			counts[t] = counts.get(t, NAN) + 1.0  # unknown tribe → NaN like JS undefined++
	return counts

static func tribe_steps(counts: Dictionary, rules: Dictionary = {}) -> Dictionary:
	var rl := _rules(rules)
	var out := {}
	for t in counts:
		var step := 0.0
		for s in rl["tribeSteps"]:
			if counts[t] >= s:
				step = s
		if step != 0.0:
			out[t] = step
	return out
