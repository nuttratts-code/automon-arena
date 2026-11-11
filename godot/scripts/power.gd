# src/core/power.js port (set 195, plan step 6a). A change in power.js must be made here too.
extends RefCounted

const R := preload("res://scripts/rules.gd")

static func _rules(rules: Dictionary) -> Dictionary:
	return R.RULES() if rules.is_empty() else rules

# basePower: { dps, ehp, points } of a character at level index L (no skills)
static func base_power(c: Dictionary, L: int = 0, rules: Dictionary = {}) -> Dictionary:
	var k: Dictionary = _rules(rules)["power"]
	var cd: float = c["cdMs"][L] / 1000.0
	var hps: float = c["multi"][L] / cd
	var dps: float = (c["atk"][L] + c["burn"][L] * k["burnStack"] + c["shock"][L] * k["shockStack"]) * hps
	var ah: float = c["armorHit"][L] if c.get("armorHit") != null else 0.0
	var hh: float = c["healHit"][L] if c.get("healHit") != null else 0.0
	var ehp: float = c["hp"][L] + (ah + hh) * hps * k["armorLifeSec"]
	return {"dps": dps, "ehp": ehp, "points": sqrt(maxf(0.0, dps * ehp))}

static func _or(v: Variant, d: float) -> float:
	return float(v) if v != null and float(v) != 0.0 else d  # JS `v || d` for numbers

# teamPower: units = build_team output (runes not counted)
static func team_power(units: Variant, rules: Dictionary = {}) -> float:
	if not (units is Array) or units.is_empty():
		return 0.0
	var rl := _rules(rules)
	var k: Dictionary = rl["power"]
	var dps := 0.0
	var ehp := 0.0
	var ids := {}
	var cnt := {}
	for u in units:
		var hps: float = _or(u.get("multi"), 1.0) / maxf(0.1, _or(u.get("cdMs"), 1000.0) / 1000.0)
		dps += (u["atk"] + _or(u.get("burnHit"), 0.0) * k["burnStack"] + _or(u.get("shockHit"), 0.0) * k["shockStack"]) * hps
		ehp += u["maxHp"] + _or(u.get("startArmor"), 0.0) + (_or(u.get("armorHit"), 0.0) + _or(u.get("healHit"), 0.0)) * hps * k["armorLifeSec"]
		if not ids.has(u["id"]):
			ids[u["id"]] = true
			var ts := [u["tribe"]]
			ts.append_array(u.get("extraTribes") if u.get("extraTribes") is Array else [])
			for t in ts:
				cnt[t] = cnt.get(t, 0.0) + 1.0
	var tiers := 0.0
	for t in cnt:
		for x in rl["tribeSteps"]:
			if cnt[t] >= x:
				tiers += 1.0
	return sqrt(maxf(0.0, dps * ehp)) * (1.0 + R.mod("power")["TEAM_POWER"]["tribeW"] * tiers)
