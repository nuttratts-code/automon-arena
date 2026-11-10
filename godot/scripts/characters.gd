# src/core/characters.js buildCharacterList port (set 195, plan step 6a). ROWS/SKILLS come from game.json.
# Check: equals game.json derived.characters (tests/test_team.gd). A change in characters.js must be made here too.
extends RefCounted

const R := preload("res://scripts/rules.gd")

static func build_character_list(rules: Dictionary = {}) -> Array:
	var rl := R.RULES() if rules.is_empty() else rules
	var M := R.mod("characters")
	var out := []
	for r in M["ROWS"]:
		var cd: Array = r[9] if r[9] is Array else [r[9], r[9], r[9]]
		var cdms := []
		for x in cd:
			cdms.append(R.js_round(x * 1000.0))
		var skills := []
		for s in M["SKILLS"].get(r[0], []):
			skills.append(s.duplicate(true))
		var price: Variant = rl["shop"]["prices"].get(r[4])
		out.append({"id": r[0], "name": r[1], "tribe": r[2], "extraTribes": [r[3]] if r[3] != "" else [],
			"rarity": r[4], "price": price if price != null else r[5], "rowHint": r[6],
			"hp": r[7].duplicate(), "atk": r[8].duplicate(), "cdMs": cdms, "multi": r[10].duplicate(),
			"burn": r[11].duplicate(), "shock": r[12].duplicate(),
			"armorHit": (r[13] if r.size() > 13 and r[13] != null else [0.0, 0.0, 0.0]).duplicate(),
			"healHit": (r[14] if r.size() > 14 and r[14] != null else [0.0, 0.0, 0.0]).duplicate(),
			"skills": skills})
	return out
