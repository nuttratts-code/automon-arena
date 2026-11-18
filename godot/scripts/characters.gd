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

# ---- Godot only (no JS twin): display names from the asset hub (owner set 248 round 4, A1 + B1) ----
# tools/asset-hub "ส่งค่าเข้า Godot" writes data/unit_shadows.json "names" {ID: name}. The game screen (ui/app.gd) swaps
# them in for the game.json names; logic tests and golden replays never call this, and the save data hash keeps the old names.
const HUB_FILE := "res://data/unit_shadows.json"
const NAME_MAX := 24

static func hub_names(d: Variant = null) -> Dictionary: # d = parsed JSON (tests pass one); null = read the data file
	if d == null:
		if not FileAccess.file_exists(HUB_FILE):
			return {}
		var f := FileAccess.open(HUB_FILE, FileAccess.READ)
		if f == null or f.get_length() > 4000000:
			return {}
		d = JSON.parse_string(f.get_as_text())
	var out := {}
	if not (d is Dictionary) or not (d.get("names") is Dictionary):
		return out
	for id in d["names"]:
		var v: Variant = d["names"][id]
		if not (id is String) or not (v is String):
			continue
		var s := ""
		for ch in (v as String):
			if ch.unicode_at(0) >= 32 and ch.unicode_at(0) != 127:
				s += ch
		s = s.strip_edges().left(NAME_MAX)
		if s != "":
			out[id] = s
	return out

static func with_names(chars: Array, names: Dictionary) -> Array: # a copy; the shared game.json list is never changed
	var out := []
	for c in chars:
		var n: Dictionary = (c as Dictionary).duplicate(true)
		if names.has(n.get("id")):
			n["name"] = names[n["id"]]
		out.append(n)
	return out
