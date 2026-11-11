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
	# new run → prep placeholder + rune offers
	app.name_scr.visible = false
	app.player_name = "ทดสอบ"
	app.start_new_run(4242)
	await _shot("prep")
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
