# Screenshots + layout audit of the Godot screens (set 196, plan-set196 7a). Never exported (tests/ is excluded) and not a test_*.gd file.
# Needs a display (Xvfb). From the repo root:
#   xvfb-run -a -s "-screen 0 1400x900x24" <godot> --rendering-driver opengl3 --audio-driver Dummy --path godot \
#     --resolution 844x390 -s res://tests/shots.gd -- --out <dir> [--dark]
# Writes <dir>/<WxH>[-dark]-<screen>.png and prints one AUDIT line per screen (JSON):
#   small = buttons / inputs under 24 px on screen · tiny = text under 10 px · clip = a label's text wider than its box
#   (no wrap) · off = a visible control outside the window (inside a scroll box it is fine).
extends SceneTree

const RR := preload("res://scripts/runrunes.gd")

var out := "."
var tag := ""
var app: Control

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var i := args.find("--out")
	if i >= 0 and i + 1 < args.size():
		out = args[i + 1]
	DirAccess.make_dir_recursive_absolute(out)
	var dark := args.has("--dark")
	await process_frame
	var ws := root.get_visible_rect().size
	tag = "%dx%d%s" % [DisplayServer.window_get_size().x, DisplayServer.window_get_size().y, "-dark" if dark else ""]
	app = load("res://scenes/main.tscn").instantiate()
	app.set_meta("no_boot", true)
	if dark:
		app.set_meta("force_dark", true)
	root.add_child(app)
	await _frames()
	# name screen
	app.name_scr.open("")
	await _shot("name")
	app.name_scr.input.text = "   "
	app.name_scr._submit()
	await _shot("name-err")
	# new run → prep (7b) in its states
	app.name_scr.visible = false
	app.player_name = "ทดสอบ"
	app.save_file = "user://shots-save.json"
	app.log_file = "user://shots-runlog.json"
	app.replays_file = "user://shots-replays.json"
	app.history_file = "user://shots-history.json"
	app.runcodes_file = "user://shots-runcodes.json"
	app.prefs_file = "user://shots-prefs.json"
	app.start_new_run(4242)
	await _shot("prep")
	app.do_buy(0, null)
	app.do_buy(1, null)
	await _shot("prep-bought")
	app.say_err("เงินไม่พอ (ต้องใช้ 5)")
	await _shot("prep-msg-err")
	app.prep.hide_msg()
	# late-game: full board + bench, perm bonus, a rune worn, locked card
	var ids: Array = []
	for c in app.chars:
		ids.append(c["id"])
	var uid := 100.0
	var k := 3
	for row in 3:
		for lane in 2:
			app.P["board"][row][lane] = {"uid": uid, "id": ids[k * 7 % ids.size()], "level": float(1 + (k % 3)), "perm": {"hp": 12.0} if k % 2 == 0 else {}, "paid": 3.0}
			uid += 1.0
			k += 1
	for bi in 5:
		app.P["bench"][bi] = {"uid": uid, "id": ids[k * 5 % ids.size()], "level": 1.0, "perm": {}, "paid": 3.0}
		uid += 1.0
		k += 1
	app.P["uid"] = uid
	app.P["round"] = 12.0
	app.P["gold"] = 31.0
	app.P["wins"] = 7.0
	app.P["shop"][3]["locked"] = true
	app.P["rn"]["bag"]["T1"] = 1.0
	app.render()
	await _shot("prep-late")
	app.prep.tapped({"at": "shop", "i": 2.0}, app.prep.cells["s_2"])
	await _frames()
	await _shot("card-shop")
	app.prep.tapped({"at": "board", "row": 1.0, "lane": 0.0}, app.prep.cells["b_1_0"])
	await _frames()
	await _shot("card-board")
	app.P["rn"]["bag"]["X5"] = 1.0 # 7f2: (+rune at match start) numbers on a front unit
	app.prep.tapped({"at": "board", "row": 0.0, "lane": 0.0}, app.prep.cells["b_0_0"])
	await _frames()
	await _shot("card-board-rune")
	app.P["rn"]["bag"].erase("X5")
	app.prep.card.visible = false
	app.prep.sel = null
	app.prep.hi_tribe = "เหล็กกล้า"
	app.render()
	await _shot("prep-highlight")
	app.prep.hi_tribe = null
	app.render()
	# 7e: ⋯ menu · symbols · glossary
	app.prep.show_menu(true)
	await _shot("prep-menu")
	app.prep.show_menu(false)
	# 7f2: credits screen (7f1 credits.gd, opened from the ⋯ menu) · closed + with the first licence text open
	app._on_menu("credits")
	await _frames()
	await _shot("credits")
	var cr: Node = app.get_child(app.get_child_count() - 1)
	for b in cr.find_children("*", "Button", true, false):
		if b != cr.get("close_btn"):
			(b as Button).pressed.emit()
			break
	await _frames()
	await _shot("credits-licence")
	cr.call("close")
	await _frames()
	for kind in ["legend", "gloss"]:
		app.popups.open(kind)
		await _frames()
		await _shot("pop-" + kind)
	for kind in ["runes", "tribes", "shop"]:
		app.popups.open(kind)
		await _frames()
		await _shot("pop-" + kind)
	app.popups.open("tribe", "เหล็กกล้า")
	await _frames()
	await _shot("pop-tribe")
	app.popups.open("rune", "T1")
	await _frames()
	await _shot("pop-rune")
	app.popups.close()
	app.P["bench"] = [null, null, null, null, null]
	app.P["board"] = [[null, null], [null, null], [null, null]]
	app.render()
	app.popups.open("tribes")
	await _frames()
	await _shot("pop-tribes-empty")
	app.popups.close()
	app.P["rn"]["bag"] = {}
	app.render()
	app.popups.open("runes")
	await _frames()
	await _shot("pop-runes-empty")
	app.popups.close()
	for kind in ["win", "boss", "sc"]:
		app.P["rn"]["offer"] = null
		RR.rn_make_offer(app.P, kind)
		app.render()
		await _shot("offer-" + kind)
	# flag rune (T8) in the offer → tribe picker
	app.P["rn"]["offer"] = {"kind": "win", "ids": ["T8", "T11", "T1"], "rr": 0.0}
	app.render()
	await _shot("offer-flag")
	app.offer.flag_pick = 0
	app.render()
	await _shot("offer-flagpick")
	# 7c: the fight on a fresh run · mid-match · finished (outcome card) · enemy + replays popups
	app.P["rn"]["offer"] = null
	app.start_new_run(4242)
	app.do_buy(0, null)
	app.do_buy(1, null)
	app.do_move({"at": "bench", "i": 0.0}, {"at": "board", "row": 0.0, "lane": 0.0})
	app.do_move({"at": "bench", "i": 1.0}, {"at": "board", "row": 1.0, "lane": 1.0})
	app.popups.open("diff")
	await _frames()
	await _shot("pop-diff")
	app.P["rn"]["bag"]["X9"] = 1.0 # 7e: rune ทำนาย → enemy mini board
	app.popups.open("diff")
	await _frames()
	await _shot("pop-diff-mini")
	app.P["rn"]["bag"].erase("X9")
	app.popups.close()
	app.set_speed(1, false)
	app._on_fight()
	await _frames()
	app.battle.view.advance(4000.0)
	await _frames()
	await _shot("battle-mid")
	# 7d: live details of a tapped unit (yours → pane on the right · enemy → pane on the left)
	for v in app.battle.view.units.values():
		if v["side"] == 0:
			app.battle._on_unit_tapped(v["uid"])
			break
	await _shot("battle-live-you")
	for v in app.battle.view.units.values():
		if v["side"] == 1:
			app.battle._on_unit_tapped(v["uid"])
			break
	await _shot("battle-live-foe")
	app.battle.unpick()
	app.battle.skip_now()
	await _frames()
	await _shot("battle-end")
	# 7d: match details, every tab + the battle log
	for tab in 4:
		app.popups.mx_state["tab"] = tab
		app.popups.open("mx")
		await _frames()
		await _shot("pop-mx-%d" % tab)
	app.popups.mx_state["log_open"] = true
	app.popups.refresh()
	await _frames()
	app.pop._scroll.scroll_vertical = 100000
	await _shot("pop-mx-log")
	app.popups.close()
	app._on_next()
	app.popups.open("replays")
	await _frames()
	await _shot("pop-replays")
	app.popups.close()
	# 7d: run end — a cleared run (extra matches offered) with a full late-game team · the run code box · a lost run
	if app.P["rn"].get("offer") is Dictionary:
		app._on_offer_skip()
	var u2 := 300.0
	var k2 := 5
	for row in 3:
		for lane in 2:
			if row == 2 and lane == 1:
				continue
			app.P["board"][row][lane] = {"uid": u2, "id": ids[k2 * 7 % ids.size()], "level": float(1 + (k2 % 3)), "perm": {"atk": 4.0, "hpPct": 20.0} if k2 % 2 == 0 else {}, "paid": 3.0}
			u2 += 1.0
			k2 += 1
	app.P["uid"] = u2
	app.P["wins"] = R_wins()
	app.P["round"] = 14.0
	app.P["hearts"] = 2.0
	app.P["over"] = true
	app.stats["matches"] = 14.0
	app.stats["w"] = 10.0
	app.stats["l"] = 3.0
	app.stats["d"] = 1.0
	app.stats["best"] = 5.0
	app.stats["timeMs"] = 14.0 * 21500.0
	app.stats["dmg"] = {ids[3]: 18234.0, ids[9]: 9120.0, ids[14]: 4410.0}
	var SVs = load("res://scripts/save.gd")
	var hl := []
	for hi in 3:
		hl = SVs.push_history(hl, SVs.history_entry(app.P, app.stats, 1.7626e12 + hi * 8.64e7))
	SVs.store_text(app.history_file, SVs.js_json(hl))
	app.screen = "runEnd"
	app.render()
	await _shot("runend-won")
	app.run_end.get_node("Scroll").scroll_vertical = 100000
	await _shot("runend-won-bottom")
	app.run_end.get_node("Scroll").scroll_vertical = 0
	app.clip_ok = false
	app.copy_run_code()
	await _frames()
	await _shot("pop-runcode")
	app.popups.close()
	app.P["wins"] = 4.0
	app.P["hearts"] = 0.0
	app.P["board"] = [[null, null], [null, null], [null, null]]
	app.render()
	await _shot("runend-lost")
	# 7e: offline Log (the runs left above are archived) · resume screen from a saved mid-round run
	app.start_new_run(4243)
	app.do_buy(0, null)
	app.screen = "prep"
	app.render()
	app.clip_ok = false
	app._on_menu("log")
	await _frames()
	await _shot("pop-log")
	app.copy_all_codes()
	await _frames()
	await _shot("pop-log-box")
	app.popups.close()
	app.boot()
	await _shot("resume")
	app.P["over"] = false
	for f in ["shots-save.json", "shots-runlog.json", "shots-replays.json", "shots-history.json", "shots-runlog_prev.json", "shots-replays_prev.json", "shots-runcodes.json", "shots-prefs.json"]:
		if FileAccess.file_exists("user://" + f):
			DirAccess.remove_absolute("user://" + f)
	print("SHOTS: done ", tag, " viewport ", ws)
	quit()

func R_wins() -> float:
	return float(load("res://scripts/rules.gd").RULES()["shop"]["winsToFinish"])

func _frames() -> void:
	for k in 4:
		await process_frame
	await RenderingServer.frame_post_draw

func _shot(nm: String) -> void:
	await _frames()
	var img := root.get_texture().get_image()
	img.save_png(out.path_join("%s-%s.png" % [tag, nm]))
	print("AUDIT ", tag, " ", nm, " ", JSON.stringify(_audit()))

func _audit() -> Dictionary:
	var o := {"small": [], "tiny": [], "clip": [], "off": []}
	var win := root.get_visible_rect()
	var scale: float = root.get_final_transform().get_scale().y
	# portrait: the rotate notice covers everything, so only it counts
	_walk(app.rotate_box if app.rotate_box.visible else app, o, win, scale, false)
	return o

func _walk(n: Node, o: Dictionary, win: Rect2, scale: float, in_scroll: bool) -> void:
	if n is CanvasItem and not (n as CanvasItem).is_visible_in_tree():
		return
	if n is Control:
		var c := n as Control
		var r := c.get_global_rect()
		var nm := "%s:%s" % [c.get_class(), c.name]
		if (c is BaseButton or c is LineEdit) and (r.size.x * scale < 24.0 or r.size.y * scale < 24.0):
			o["small"].append("%s %dx%d" % [nm, r.size.x * scale, r.size.y * scale])
		if c is Label and (c as Label).text.strip_edges() != "":
			var l := c as Label
			var fs: int = l.get_theme_font_size("font_size")
			if fs * scale < 10.0:
				o["tiny"].append("%s %.1fpx" % [l.text.left(12), fs * scale])
			if l.autowrap_mode == TextServer.AUTOWRAP_OFF and l.get_theme_font("font").get_string_size(l.text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x > r.size.x + 1.0:
				o["clip"].append(l.text.left(12))
		if not in_scroll and r.size.x >= 1.0 and (r.end.x > win.end.x + 1.0 or r.end.y > win.end.y + 1.0 or r.position.x < -1.0 or r.position.y < -1.0):
			o["off"].append(nm)
		if c is ScrollContainer:
			in_scroll = true
	for ch in n.get_children():
		_walk(ch, o, win, scale, in_scroll)
