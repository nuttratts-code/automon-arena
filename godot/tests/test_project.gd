# P1 step 3 checks: the project loads, game.json (exported from the JS core) parses,
# and the golden fixtures match it. Real parity tests start at P1 step 4 (rng.gd).
extends RefCounted

const GAME_JSON := "res://data/game.json"
const MANIFEST := "res://tests/golden/manifest.json"

var _opts := {}

func setup(opts: Dictionary) -> void:
	_opts = opts

func _read_json(path: String) -> Variant:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return null
	return JSON.parse_string(f.get_as_text())

func test_empty() -> String:
	return "ok"

func test_game_json_shape() -> String:
	var d: Variant = _read_json(GAME_JSON)
	if not d is Dictionary:
		return "game.json missing or not a JSON object (run: cd src && node tools/exportdata.mjs)"
	for k in ["v", "hash", "modules", "derived"]:
		if not d.has(k):
			return "game.json has no key '%s'" % k
	if not d["modules"] is Dictionary or d["modules"].is_empty():
		return "game.json modules empty"
	return "ok"

func test_golden_matches_game_json() -> String:
	if not FileAccess.file_exists(MANIFEST):
		if _opts.get("require_golden", false):
			return "golden fixtures missing (run: cd src && node lab/golden.mjs)"
		print("  skip: no golden fixtures (cd src && node lab/golden.mjs)")
		return "ok"
	var m: Variant = _read_json(MANIFEST)
	var d: Variant = _read_json(GAME_JSON)
	if not m is Dictionary or not d is Dictionary:
		return "manifest.json or game.json unreadable"
	if m.get("gameHash", "") != d.get("hash", "?"):
		return "golden fixtures are stale: manifest gameHash %s ≠ game.json hash %s (rerun node lab/golden.mjs)" % [m.get("gameHash"), d.get("hash")]
	return "ok"
