# Set 199 (plan-set196 7d): match detail numbers = src/lab/matchcalc.js (mxRecords / mxFxGiven / mxModel), totals only
# (user pick B1: one row per unit, no drill-down). No UI here, so tests check exactly what the popup shows.
# Reads a simulate() result that was made with detail on; without detail the armour / overkill parts are simply 0.
extends RefCounted

const SV := preload("res://scripts/save.gd")

const MX_SRC := ["hit", "counter", "shock", "burn", "skill", "downSkill", "armorBreak", "reflect", "execute", "storm"]

static func why(w: Variant) -> String:
	return str(w) if w is String and MX_SRC.has(w) else "skill"

# start units + summoned (web unitsOf)
static func units_of(r: Dictionary) -> Array:
	var out := []
	var ev: Array = r["events"]
	if not ev.is_empty() and ev[0].get("units") is Array:
		out.append_array(ev[0]["units"])
	for e in ev:
		if e["k"] == "summon" and e.get("unit") is Dictionary:
			out.append(e["unit"])
	return out

static func _new_unit() -> Dictionary:
	return {"out": {}, "out_t": 0.0, "ally_t": 0.0, "in": {}, "in_t": 0.0, "in_n": 0.0, "in_from": {}, "abs": 0.0, "over": 0.0,
		"hits": 0.0, "subs": 0.0, "burnU": 0.0, "shockU": 0.0, "heal": 0.0, "armor": 0.0, "heals": 0.0, "armors": 0.0, "skills": 0.0}

# → {units, side: {uid: side}, per: {uid: totals}, tot: [left dealt, right dealt], alive: [left, right], max: {out, in, fx}}
# per.out / per.in = {source: amount} (burn damage split by who applied it, same tracker as the battle's u.dealt)
static func model(r: Dictionary) -> Dictionary:
	var units := units_of(r)
	var side := {}
	var per := {}
	for u in units:
		side[int(u["uid"])] = int(u["side"])
		per[int(u["uid"])] = _new_unit()
	var share := {}
	var tot := [0.0, 0.0]
	for e in r["events"]:
		var k: String = e["k"]
		if k == "burn" or k == "cleanse" or k == "down":
			SV._bs_see(share, k, e)
		var to: Variant = int(e["to"]) if e.get("to") != null else null
		var from: Variant = int(e["from"]) if e.get("from") != null else null
		if k == "dmg" and to != null:
			var d: Dictionary = e["d"] if e.get("d") is Dictionary else {}
			var over := float(d.get("over", 0.0)) if d.get("over") != null else 0.0
			var parts: Array = SV._bs_split(share, float(to)) if e.get("why") == "burn" else [[float(from) if from != null else -1.0, 1.0]]
			for p in parts:
				var src: Variant = int(p[0]) if float(p[0]) >= 0.0 else null
				var f: float = p[1]
				var amt := float(e["amount"]) * f
				var w := why(e.get("why"))
				var t: Variant = per.get(to)
				if t != null:
					t["in"][w] = float(t["in"].get(w, 0.0)) + amt
					t["in_t"] += amt
					t["in_n"] += f
					t["in_from"][src] = true
					t["abs"] += float(e.get("absorbed", 0.0)) * f
					t["over"] += over * f
				var g: Variant = per.get(src) if src != null else null
				if g != null:
					if side.get(src) != side.get(to):
						g["out"][w] = float(g["out"].get(w, 0.0)) + amt
						g["out_t"] += amt
						tot[side[src]] += amt
					else:
						g["ally_t"] += amt
		# what the unit did to enemies: hits · burn / shock it applied
		if from != null and to != null and per.has(from) and side.get(from) != side.get(to):
			var a: Dictionary = per[from]
			if k == "dmg" and e.get("why") == "hit":
				if e.get("sub") == true:
					a["subs"] += 1.0
				else:
					a["hits"] += 1.0
			elif k == "burn":
				a["burnU"] += float(e["amount"])
			elif k == "shock":
				a["shockU"] += float(e["amount"])
		# other effects given (web mxFxGiven): heal / armour → the giver (from, else the receiver) · skill effects → from
		var si: Variant = e["d"].get("si") if e.get("d") is Dictionary else null
		if k == "heal" or k == "armor":
			var giver: Variant = from if from != null else to
			var q: Variant = per.get(giver) if giver != null else null
			if q != null:
				q[k] += float(e.get("amount", 0.0))
				q["heals" if k == "heal" else "armors"] += 1.0
		elif k == "reflectDebuff" and e.get("si") != null and from != null:
			if per.has(from):
				per[from]["skills"] += 1.0
		elif si != null and k != "dmg" and from != null and per.has(from):
			per[from]["skills"] += 1.0
	var down := {}
	for x in (r["units"] if r.get("units") is Array else []):
		down[int(x["uid"])] = bool(x["down"])
	var alive := [0, 0]
	var mx := {"out": 1.0, "in": 1.0, "fx": 1.0}
	for u in units:
		var id := int(u["uid"])
		if not bool(down.get(id, false)):
			alive[int(u["side"])] += 1
		mx["out"] = maxf(mx["out"], per[id]["out_t"])
		mx["in"] = maxf(mx["in"], per[id]["in_t"])
		mx["fx"] = maxf(mx["fx"], per[id]["heal"] + per[id]["armor"])
	return {"units": units, "side": side, "per": per, "tot": tot, "alive": alive, "max": mx}

# real HP lost = amount − armour − overkill (web mxLoss)
static func loss(p: Dictionary) -> float:
	return maxf(0.0, float(p["in_t"]) - float(p["abs"]) - float(p["over"]))
