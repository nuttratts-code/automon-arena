# Set 201 (plan-set196 7f1): credits screen (scripts/ui/credits.gd + data/credits.json) + the web export preset ships what it needs.
extends RefCounted

const CREDITS := preload("res://scripts/ui/credits.gd")

var _opts := {}

func setup(opts: Dictionary) -> void:
	_opts = opts

func _count(n: Node, cls: String, out: Array) -> void:
	if n.is_class(cls):
		out.append(n)
	for ch in n.get_children():
		_count(ch, cls, out)

func test_data_has_every_credit() -> String:
	var d := CREDITS.load_data()
	if not d["owner"].contains("Automon Arena") or not d["owner"].contains("All rights reserved"):
		return "owner line (S-B1) missing: " + d["owner"]
	var ids := []
	for s in d["sections"]:
		ids.append(s["id"])
	for need in ["godot", "godot_thirdparty", "v8", "fdlibm", "font_mitr", "font_plex_thai", "font_plex_mono", "dcss", "kenney"]:
		if not need in ids:
			return "credits.json has no section '%s' (got %s)" % [need, ids]
	var want := {"godot": "Permission is hereby granted", "godot_thirdparty": "FreeType", "v8": "Redistributions in binary form",
		"fdlibm": "this notice\nis preserved", "font_mitr": "Mitr Project Authors", "font_plex_thai": "Plex", "font_plex_mono": "Plex", "kenney": "Creative Commons Zero"}
	for s in d["sections"]:
		if want.has(s["id"]):
			var t := CREDITS.licence_of(s)
			if not t.contains(want[s["id"]]):
				return "licence text of %s lacks '%s'" % [s["id"], want[s["id"]]]
			if s["id"].begins_with("font_") and not t.contains("SIL OPEN FONT LICENSE Version 1.1"):
				return "font %s: OFL text not shipped" % s["id"]
	return "ok"

func test_clean_rejects_bad_data() -> String:
	var d := CREDITS.clean({"title": 5, "sections": [
		{"id": "x", "title": "X", "lines": ["a", 3, {"b": 1}], "licence_file": "res://../../etc/passwd.txt"},
		{"id": "x", "title": "dup"}, {"id": "bad id!"}, "junk",
		{"id": "y", "licence_file": "user://evil.txt", "engine": "shell"}]})
	if d["title"] != "เครดิต" or not d["owner"].contains("Automon Arena"):
		return "fallback title / owner wrong"
	var ids := []
	for s in d["sections"]:
		ids.append(s["id"])
	if ids != ["godot", "godot_thirdparty", "x", "y"]:
		return "sections after clean: %s" % [ids]
	if d["sections"][2]["lines"] != ["a"] or d["sections"][2]["licence_file"] != "" or d["sections"][3]["licence_file"] != "" or d["sections"][3]["engine"] != "":
		return "bad lines / licence_file / engine kept: %s" % [d["sections"]]
	if CREDITS.clean(null)["sections"].size() != 2 or CREDITS.load_data("res://no/such.json")["sections"].size() != 2:
		return "null / missing file must still give the 2 engine sections"
	return "ok"

func test_screen_builds_toggles_and_closes() -> String:
	var root: Window = _opts["root"]
	var c: Control = CREDITS.new()
	root.add_child(c)
	var labels := []
	_count(c, "Label", labels)
	var texts := ""
	for l in labels:
		texts += (l as Label).text + "\n"
	for need in ["© 2026 Automon Arena", "Godot Engine", "V8", "fdlibm", "Mitr", "IBM Plex Sans Thai", "IBM Plex Mono", "Dungeon Crawl Stone Soup"]:
		if not texts.contains(need):
			c.free()
			return "screen does not show '%s'" % need
	var v8: Node = c.find_child("S_v8", true, false)
	var t: Button = v8.get_node("Toggle") if v8 != null else null
	if t == null:
		c.free()
		return "no licence toggle on the V8 section"
	t.pressed.emit()
	var lic: Label = v8.get_node_or_null("Licence")
	if lic == null or not lic.visible or not lic.text.contains("BSD") and not lic.text.contains("Redistribution"):
		c.free()
		return "toggle did not show the V8 licence"
	t.pressed.emit()
	if lic.visible:
		c.free()
		return "second tap did not hide the licence"
	var got := [false]
	c.closed.connect(func() -> void: got[0] = true)
	c.close_btn.pressed.emit()
	c.free()
	return "ok" if got[0] else "close button did not emit closed"

# HARD RULE 9 ④ + 7f1: the web preset ships data/*.json (credits.json too) + fonts + OFL texts, and never tests/tools/docs.
func test_export_preset_ships_data() -> String:
	var cfg := ConfigFile.new()
	if cfg.load("res://export_presets.cfg") != OK:
		return "export_presets.cfg unreadable"
	var inc: String = cfg.get_value("preset.0", "include_filter", "")
	var exc: String = cfg.get_value("preset.0", "exclude_filter", "")
	for need in ["data/*.json", "data/fonts/*.ttf", "data/fonts/*.txt"]:
		if not inc.contains(need):
			return "include_filter lacks " + need
	for need in ["tests/*", "tools/*", "*.md"]:
		if not exc.contains(need):
			return "exclude_filter lacks " + need
	if cfg.get_value("preset.0", "platform", "") != "Web" or cfg.get_value("preset.0.options", "variant/thread_support", true) != false:
		return "preset.0 must be Web, no threads (works without COOP/COEP headers)"
	return "ok"
