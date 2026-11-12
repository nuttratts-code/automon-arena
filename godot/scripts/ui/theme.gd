# Set 196 (plan-set196 7a, user picks B1 + C1): the web game v132 look in Godot.
# Colours = data/colours.json (generated from src/game/run/css/10-base.css by src/tools/exportdata.mjs)
#   + data/tone.json on top (set 212: Godot-only cool UI tone, owner pick R5-A2; hand-written).
# Fonts = data/fonts/ (Mitr · IBM Plex Sans Thai · IBM Plex Mono, SIL OFL 1.1 — licence files beside them, credits in godot/README).
# Texts = data/ui_th.json (screen captions) + data/labels.json (generated from src/game/labels.js).
#   ui_th.json is copied from the web game v132 (src/game/run): src/tests/run.js checks every text still appears in the web source
#   ({x} = a value filled in at run time) — change both. Keys starting with g_ are Godot-only texts (set 200), not checked.
#   No "_note" keys in shipped data files (set 212, security part 4): dev notes live in these comments.
# Everything is read at run time with FileAccess + JSON (data only; a bad file falls back to defaults, never runs code).
extends RefCounted

const FONT_FILES := {
	"display": "res://data/fonts/Mitr-Medium.ttf",
	"display_b": "res://data/fonts/Mitr-SemiBold.ttf",
	"body": "res://data/fonts/IBMPlexSansThai-Regular.ttf",
	"body_b": "res://data/fonts/IBMPlexSansThai-SemiBold.ttf",
	"mono": "res://data/fonts/IBMPlexMono-Medium.ttf",
}
# web font sizes (1rem = 16 px, body 14 px) — one logical px = one CSS px at the 854×480 base
const SIZE := {"body": 14, "hint": 13, "btn": 14, "h2": 15, "big": 20, "title": 44, "tagline": 20}

static var dark := false
static var _col := {}
static var _tone := {}
static var _fonts := {}
static var _ui := {}
static var _labels := {}
static var _tex := {}

static func _json(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		return null
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null or f.get_length() > 4000000:
		return null
	return JSON.parse_string(f.get_as_text())

static func colours() -> Dictionary:
	if _col.is_empty():
		var d: Variant = _json("res://data/colours.json")
		_col = d if d is Dictionary and d.get("light") is Dictionary and d.get("dark") is Dictionary else {"light": {}, "dark": {}}
	return _col

static func tone() -> Dictionary:
	if _tone.is_empty():
		var d: Variant = _json("res://data/tone.json")
		_tone = d if d is Dictionary and d.get("light") is Dictionary and d.get("dark") is Dictionary else {"light": {}, "dark": {}}
	return _tone

# c("bg") → the token's colour in the current mode (magenta = missing token, easy to spot in screenshots)
static func c(name: String) -> Color:
	var mode := "dark" if dark else "light"
	var v: Variant = tone()[mode].get(name)
	if not (v is String and Color.html_is_valid(v)):
		v = colours()[mode].get(name)
	return Color.html(v) if v is String and Color.html_is_valid(v) else Color.MAGENTA

static func font(key: String) -> Font:
	if not _fonts.has(key):
		var f := FontFile.new()
		var path: String = FONT_FILES.get(key, FONT_FILES["body"])
		var bytes := FileAccess.get_file_as_bytes(path)
		if bytes.size() > 0:
			f.data = bytes
		else: # exported build: the .ttf may only exist as an imported resource
			var r: Variant = ResourceLoader.load(path) if ResourceLoader.exists(path) else null
			if r is FontFile:
				f = r
		if key != "body":
			f.fallbacks = [font("body")]
		_fonts[key] = f
	return _fonts[key]

static func ui_text(key: String, args: Dictionary = {}) -> String:
	if _ui.is_empty():
		var d: Variant = _json("res://data/ui_th.json")
		_ui = d if d is Dictionary else {"_": ""}
	var s: Variant = _ui.get(key)
	if not (s is String):
		return key
	return (s as String).format(args)

# key built at run time (wear_<state>, tl_<bonus>) — '' when missing
static func ui_dyn(key: String) -> String:
	ui_text("title")
	var v: Variant = _ui.get(key)
	return v if v is String else ""

static func has_ui(key: String) -> bool:
	ui_text("title") # loads the table
	return _ui.get(key) is String

static func labels() -> Dictionary:
	if _labels.is_empty():
		var d: Variant = _json("res://data/labels.json")
		_labels = d if d is Dictionary else {"tables": {}, "runeDesc": {}}
	return _labels

# art(group, key) → texture from data/art.json (CC0 tiles, Dungeon Crawl Stone Soup), null when missing
static func art(group: String, key: String) -> Texture2D:
	var id := group + "/" + key
	if not _tex.has(id):
		if not _tex.has("_all"):
			var d: Variant = _json("res://data/art.json")
			_tex["_all"] = d["art"] if d is Dictionary and d.get("art") is Dictionary else {}
		var all: Dictionary = _tex["_all"]
		var b64: Variant = all.get(group, {}).get(key) if all.get(group) is Dictionary else null
		var tex: Texture2D = null
		if b64 is String:
			var img := Image.new()
			if img.load_png_from_buffer(Marshalls.base64_to_raw(b64)) == OK:
				if group == "ui": # set 212 (note 7): the 32 px ui tiles hold a small picture → crop to the used part, squared
					img = crop_square(img)
				tex = ImageTexture.create_from_image(img)
		_tex[id] = tex
	return _tex[id]

static func crop_square(img: Image) -> Image:
	img.convert(Image.FORMAT_RGBA8)
	var ur := img.get_used_rect()
	if ur.size.x <= 0 or ur.size.y <= 0:
		return img
	var side := maxi(ur.size.x, ur.size.y)
	var sq := Image.create(side, side, false, Image.FORMAT_RGBA8)
	sq.blit_rect(img, ur, Vector2i((side - ur.size.x) / 2, (side - ur.size.y) / 2))
	return sq

# set 212 (owner B1): every box has cut corners (chamfer, radius ≤ 7, no anti-alias) = the UI shape motif (echoes the
# arena floor slabs). cut = false keeps a smooth rounded box (tribe shapes are game symbols, not boxes).
const CUT_MAX := 7
static func box(bg: Color, line: Color, radius: int = 8, border: int = 1, pad_x: int = 12, pad_y: int = 7, cut: bool = true) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = line
	s.set_border_width_all(border)
	s.set_corner_radius_all(mini(radius, CUT_MAX) if cut else radius)
	if cut:
		s.corner_detail = 1
	s.content_margin_left = pad_x
	s.content_margin_right = pad_x
	s.content_margin_top = pad_y
	s.content_margin_bottom = pad_y
	s.anti_aliasing = not cut
	return s

# The app theme: body font 14 px, ink on bg, web buttons (panel + 1 px line, radius 8) and inputs.
static func build() -> Theme:
	var t := Theme.new()
	t.default_font = font("body")
	t.default_font_size = SIZE["body"]
	t.set_color("font_color", "Label", c("ink"))
	t.set_font("font", "Button", font("body_b"))
	t.set_font_size("font_size", "Button", SIZE["btn"])
	for st in ["normal", "hover", "pressed", "disabled", "focus"]:
		var b := box(c("panel"), c("line"))
		if st == "hover" or st == "pressed":
			b.bg_color = c("soft")
		if st == "focus":
			b = box(Color(0, 0, 0, 0), c("accent"), 8, 3)
		t.set_stylebox(st, "Button", b)
	for k in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		t.set_color(k, "Button", c("ink"))
	t.set_color("font_disabled_color", "Button", Color(c("ink"), 0.5))
	t.set_stylebox("normal", "LineEdit", box(c("card"), c("ink"), 10, 2, 14, 10))
	t.set_stylebox("focus", "LineEdit", box(Color(0, 0, 0, 0), c("accent"), 10, 3, 14, 10))
	t.set_color("font_color", "LineEdit", c("ink"))
	t.set_color("font_placeholder_color", "LineEdit", c("mute"))
	t.set_color("caret_color", "LineEdit", c("ink"))
	t.set_stylebox("panel", "PanelContainer", box(c("panel"), c("line"), 16, 1, 24, 24))
	return t

# Button variants used by the web page (class primary / big) · set 212: a plate lit from the top-left (dark bottom 4 px / right 2 px edge)
static func primary(b: Button, big: bool = false) -> void:
	for st in ["normal", "hover", "pressed", "disabled"]:
		var s := box(c("accent"), c("accent").darkened(0.45), 10 if big else 8, 0)
		s.border_width_bottom = 4
		s.border_width_right = 2
		if st == "hover" or st == "pressed":
			s.bg_color = c("accent").darkened(0.12) if not dark else c("accent").lightened(0.12)
		b.add_theme_stylebox_override(st, s)
	for k in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		b.add_theme_color_override(k, c("on-accent"))
	if big:
		b.custom_minimum_size.y = 52
		b.add_theme_font_override("font", font("display"))
		b.add_theme_font_size_override("font_size", SIZE["big"])

static func label(text: String, size: int = 14, colour: String = "ink", fkey: String = "body") -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", c(colour))
	if fkey != "body":
		l.add_theme_font_override("font", font(fkey))
	return l

# tribe shape icon (web .tshapes / tribeIco): square · triangle · diamond · circle · hexagon · pentagon
const TRIBE_SHAPE := {"เหล็กกล้า": ["square", "t-steel"], "เพลิงเผา": ["triangle", "t-fire"], "สายฟ้า": ["diamond", "t-bolt"], "วายุ": ["circle", "t-wind"], "ภูติ": ["hexagon", "t-spirit"], "อสูร": ["pentagon", "t-fiend"]}
