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
	app.prep.card.visible = false
	app.prep.sel = null
	app.prep.hi_tribe = "เหล็กกล้า"
	app.render()
	await _shot("prep-highlight")
	app.prep.hi_tribe = null
	app.render()
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
	app.popups.close()
	app.set_speed(1, false)
	app._on_fight()
	await _frames()
	app.battle.view.advance(4000.0)
	await _frames()
	await _shot("battle-mid")
	app.battle.skip_now()
	await _frames()
	await _shot("battle-end")
	app._on_next()
	app.popups.open("replays")
	await _frames()
	await _shot("pop-replays")
	app.popups.close()
	for f in ["shots-save.json", "shots-runlog.json", "shots-replays.json", "shots-history.json"]:
		if FileAccess.file_exists("user://" + f):
			DirAccess.remove_absolute("user://" + f)
	print("SHOTS: done ", tag, " viewport ", ws)
	quit()

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
