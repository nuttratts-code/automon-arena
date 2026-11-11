# Set 196 (plan-set196 7a): the screens build headless, read only generated data, and act only through the ported core.
extends RefCounted

const TH := preload("res://scripts/ui/theme.gd")
const SH := preload("res://scripts/shop.gd")
const RR := preload("res://scripts/runrunes.gd")
const R := preload("res://scripts/rules.gd")
const T := preload("res://scripts/team.gd")

var _opts := {}

func setup(opts: Dictionary) -> void:
	_opts = opts

func _src(path: String) -> String:
	return FileAccess.get_file_as_string(path)

func _ui_files() -> Array:
	var out := []
	for f in DirAccess.get_files_at("res://scripts/ui"):
		if f.ends_with(".gd"):
			out.append("res://scripts/ui/" + f)
	return out

# every ui_text("key") / c("token") used by the UI scripts exists in ui_th.json / colours.json (light + dark)
func test_keys_exist() -> String:
	var ui: Variant = JSON.parse_string(_src("res://data/ui_th.json"))
	var col: Variant = JSON.parse_string(_src("res://data/colours.json"))
	if not (ui is Dictionary and col is Dictionary):
		return "ui_th.json / colours.json unreadable"
	var rx_t := RegEx.create_from_string("ui_text\\(\"([a-z_]+)\"")
	var rx_c := RegEx.create_from_string("(?:TH\\.c|[^a-z_]c)\\(\"([a-z0-9-]+)\"\\)|\"(t-[a-z]+|r-[a-z-]+)\"")
	var miss := []
	for f in _ui_files():
		var s := _src(f)
		for m in rx_t.search_all(s):
			if not ui.has(m.get_string(1)):
				miss.append(f.get_file() + " ui:" + m.get_string(1))
		for m in rx_c.search_all(s):
			var k := m.get_string(1) if m.get_string(1) != "" else m.get_string(2)
			if not (col["light"].has(k) and col["dark"].has(k)):
				miss.append(f.get_file() + " colour:" + k)
	return "ok" if miss.is_empty() else "missing: " + ", ".join(PackedStringArray(miss))

# Thai text renders with the shipped fonts (not a fallback box)
func test_fonts_have_thai() -> String:
	for k in TH.FONT_FILES:
		var f := TH.font(k)
		if not f.has_char("ก".unicode_at(0)) and k != "mono":
			return "font %s has no Thai" % k
		if not f.has_char("A".unicode_at(0)):
			return "font %s did not load" % k
	return "ok"

# every rune a run can offer has its text in labels.json (generated from the web rnDesc)
func test_rune_texts() -> String:
	var desc: Dictionary = TH.labels().get("runeDesc", {})
	var miss := []
	for r in RR.rn_all():
		if str(desc.get(r["id"], "")).strip_edges() == "":
			miss.append(r["id"])
	return "ok" if miss.is_empty() else "no text for runes " + str(miss)

func test_art_tiles() -> String:
	for g in [["rune", "T1"], ["rune", "D"], ["ui", "gold"], ["scene", "shop-floor"], ["unit", "HL-1"]]:
		if TH.art(g[0], g[1]) == null:
			return "art missing %s/%s" % g
	return "ok" if TH.art("rune", "nope") == null else "unknown tile must give null"

func _app() -> Control:
	var app: Control = load("res://scenes/main.tscn").instantiate()
	app.set_meta("no_boot", true)
	(_opts["root"] as Window).add_child(app)
	app.build()
	return app

# name: blank / control characters only → error, no submit · a real name → submitted once, cleaned like JS rlName
func test_name_screen() -> String:
	var app := _app()
	var got := []
	var scr: Control = app.name_scr
	for c in scr.submitted.get_connections():
		scr.submitted.disconnect(c["callable"]) # keep the test away from user://prefs.json
	scr.submitted.connect(func(n: String) -> void: got.append(n))
	scr.open("")
	scr.input.text = "  \u200b "
	scr._submit()
	var err_ok: bool = scr.err.visible and got.is_empty()
	scr.input.text = "  นัท\u200b  เทส "
	scr._submit()
	app.queue_free()
	if not err_ok:
		return "blank name must show the error"
	return "ok" if got == ["นัท เทส"] else "submitted %s" % [got]

# offer popup actions = the ported core on the same state (take / flag tribe / reroll / skip)
func test_offer_actions() -> String:
	var app := _app()
	var chars: Array = R.game()["derived"]["characters"]
	var bad := ""
	for step in ["take", "reroll", "skip", "flag"]:
		app.start_new_run(777)
		app.P["rn"]["offer"] = null
		if step == "flag":
			app.P["rn"]["offer"] = {"kind": "win", "ids": ["T8", "T1", "T3"], "rr": 0.0}
		else:
			RR.rn_make_offer(app.P, "win")
		app.render()
		if not app.offer.visible:
			bad = "offer not shown (%s)" % step
			break
		var want: Dictionary = app.P.duplicate(true)
		match step:
			"take":
				SH.take_rune(want, 1, chars)
				app.offer.take.emit(1, null)
			"reroll":
				RR.rn_reroll_offer(want)
				app.offer.reroll.emit()
			"skip":
				RR.rn_skip_offer(want)
				app.offer.skip.emit()
			"flag":
				var t: String = RR.rn_flag_choices(want, T.make_char_map(chars))[2]
				SH.take_rune(want, 0, chars, {}, t)
				app.offer.flag_pick = 0
				app.render()
				if app.offer.find_child("FlagPick", true, false) == null:
					bad = "flag rune must open the tribe picker"
					break
				app.offer.take.emit(0, t)
		if JSON.stringify(app.P) != JSON.stringify(want):
			bad = "state after %s differs from the core" % step
			break
		if step != "reroll" and app.offer.visible:
			bad = "offer still open after %s" % step
			break
	app.queue_free()
	return "ok" if bad == "" else bad
