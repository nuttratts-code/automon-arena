# Headless test runner (set 192). Usage, from the repo root:
#   godot --headless --path godot -s res://tests/run.gd [-- --require-golden]
#   TESTS_ONLY=ui,project … = only test_ui.gd + test_project.gd (while developing · set 196; CI runs all)
# Runs every func test_*() -> String in res://tests/test_*.gd. Pass = returns "ok" exactly;
# a reason String, a crash (a typed func returns "" / null after a runtime error) or a file
# that does not load = fail.
# Exit code 1 on any failure.
# Last line: "GODOT TESTS: PASS n/n" or "GODOT TESTS: FAIL f/n".
extends SceneTree

func _init() -> void:
	var opts := {"require_golden": OS.get_cmdline_user_args().has("--require-golden"), "root": root} # root: UI tests add scenes (set 196)
	var files: Array[String] = []
	for f in DirAccess.get_files_at("res://tests"):
		if f.begins_with("test_") and f.ends_with(".gd") and _picked(f):
			files.append(f)
	files.sort()
	var total := 0
	var fails: Array[String] = []
	for f in files:
		var script: GDScript = load("res://tests/" + f)
		if script == null or not script.can_instantiate():
			total += 1
			fails.append("%s — does not load (parse error?)" % f)
			continue
		var suite: Object = script.new()
		if suite.has_method("setup"):
			suite.call("setup", opts)
		var names: Array[String] = []
		for m in suite.get_method_list():
			var n: String = m["name"]
			if n.begins_with("test_"):
				names.append(n)
		names.sort()
		for n in names:
			total += 1
			var res: Variant = suite.call(n)
			if not (res is String and res == "ok"):
				fails.append("%s::%s — %s" % [f, n, res if res is String and res != "" else "crashed (runtime error) or returned nothing"])
	for line in fails:
		printerr("FAIL " + line)
	if fails.is_empty():
		print("GODOT TESTS: PASS %d/%d" % [total, total])
	else:
		print("GODOT TESTS: FAIL %d/%d" % [fails.size(), total])
	quit(1 if not fails.is_empty() or total == 0 else 0)

static func _picked(f: String) -> bool:
	var only := OS.get_environment("TESTS_ONLY")
	if only == "":
		return true
	for w in only.split(",", false):
		if f == "test_%s.gd" % w.strip_edges():
			return true
	return false
