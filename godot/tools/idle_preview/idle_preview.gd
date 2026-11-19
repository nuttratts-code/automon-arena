# Set 258 preview only (owner: "show them standing in Godot with the idle"): the real arena (stage3d) + the six
# PixelLab idle sheets from claude/preview-set258, 8 frames each at 150 ms (ค่าเสนอ). Not part of the game: godot/tools
# is excluded from export, and nothing in scripts/ reads this. Sheets are padded (meta.json pad_t / pad_b), so the
# creature (not the frame) is SPR_H tall and its feet sit on the slot.
extends Node3D

const ST3D := preload("res://scripts/ui/stage3d.gd")
const DIR := "res://tools/idle_preview/"
const SLOTS := {"HL-1": [0, 0], "WN-1": [0, 1], "PL-1": [1, 0], "SF-1": [1, 1], "WY-1": [2, 0], "PT-1": [2, 1]} # id → [row, lane]

var stage: Node3D
var sprites: Array = []
var t := 0.0

func _ready() -> void:
	stage = ST3D.new()
	stage.build()
	add_child(stage)
	var vs := get_viewport().get_visible_rect().size
	stage.refit(vs, Rect2(vs * Vector2(0.08, 0.12), vs * Vector2(0.84, 0.8)), Rect2(Vector2.ZERO, vs))
	stage.set_k(0.0) # prep pose: your half fills the screen
	stage.cam.make_current()
	var meta: Variant = JSON.parse_string(FileAccess.get_file_as_string(DIR + "meta.json"))
	if not (meta is Dictionary):
		push_error("idle preview: meta.json missing")
		return
	for id in SLOTS:
		var m: Variant = meta.get(id)
		var buf := FileAccess.get_file_as_bytes(DIR + id + ".png")
		var img := Image.new()
		if not (m is Dictionary) or buf.is_empty() or img.load_png_from_buffer(buf) != OK:
			push_error("idle preview: cannot read " + id)
			continue
		var fh := float(m["fh"])
		var body := fh - float(m["pad_t"]) - float(m["pad_b"])
		var s := Sprite3D.new()
		s.name = id
		s.texture = ImageTexture.create_from_image(img)
		s.hframes = 8
		# size = the owner's hub team-tab scale (screen px per picture px); WN-1 (78 px × 1.5) = 0.8 × SPR_H
		s.pixel_size = ST3D.SPR_H * 0.8 / 117.0 * float(m.get("k", 1.5))
		s.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
		s.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
		s.shaded = false
		s.double_sided = true
		s.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		s.rotation = Vector3(deg_to_rad(-ST3D.PITCH), 0, 0)
		var feet := ST3D.slot_pos(0, int(SLOTS[id][0]), int(SLOTS[id][1]))
		s.position = feet + ST3D.lean() * ((fh / 2.0 - float(m["pad_b"])) * s.pixel_size) + Vector3(0, 0.05, 0)
		stage.add_child(s)
		sprites.append([s, float(m["ms"]) / 1000.0])
	print("IDLE PREVIEW: ", sprites.size(), " creatures")
	for a in OS.get_cmdline_user_args(): # -- --shot=<dir>: save 4 frames for Claude's check, then quit
		if a.begins_with("--shot="):
			_shots(a.trim_prefix("--shot="))

func _shots(dir: String) -> void:
	for i in 4:
		await get_tree().create_timer(0.3).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(dir.path_join("idle_%d.png" % i))
	get_tree().quit()

func _process(dt: float) -> void:
	t += dt
	for it in sprites:
		it[0].frame = int(t / float(it[1])) % 8
