# Set 197 (plan-set196 7b): a unit picture = web unitShape(): CC0 sprite (data/art.json unit/<id>) + rarity ring + tribe badge + star level.
# No sprite for an id → the tribe shape (square / triangle / …) instead. Purely drawing; no game rules here.
extends RefCounted

const TH := preload("res://scripts/ui/theme.gd")
const SHAPE := preload("res://scripts/ui/shape.gd")
const RING := {"ธรรมดา": 0, "ไม่ธรรมดา": 1, "หายาก": 2, "หายากมาก": 3, "ตำนาน": 4}
const RING_TOKEN := ["", "r-unc", "r-rare", "r-epic", "r-legend"]

static func rarity_token(c: Dictionary) -> String:
	return RING_TOKEN[int(RING.get(c.get("rarity"), 0))]

# set 212 (note 3): stars everywhere = gold glyph with a thin dark outline, no background pill
const STAR := Color(1.0, 0.85, 0.3)
static func stars(level: int, fs: int) -> Label:
	var l := TH.label("★".repeat(level), fs, "ink")
	l.name = "StarText"
	l.add_theme_color_override("font_color", STAR)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	l.add_theme_constant_override("outline_size", 4)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

# px = side of the picture (stars sit on its lower edge, like the web .lv badge) · badge = false: no tribe badge (set 212 bench / shop)
static func make(c: Dictionary, level: int, px: float, badge: bool = true) -> Control:
	var box := Control.new()
	box.name = "Mon"
	box.custom_minimum_size = Vector2(px, px)
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var tok := rarity_token(c)
	var sp: Array = TH.TRIBE_SHAPE.get(c.get("tribe"), ["square", "mute"])
	var tex := TH.art("unit", str(c.get("id")))
	if tex != null:
		if tok != "":
			var ring := Panel.new()
			ring.set_anchors_preset(Control.PRESET_FULL_RECT)
			ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
			ring.add_theme_stylebox_override("panel", TH.box(Color(0, 0, 0, 0), TH.c(tok), 8, 2 if tok != "r-legend" else 3, 0, 0))
			box.add_child(ring)
		var tr := TextureRect.new()
		tr.texture = tex
		tr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.set_anchors_preset(Control.PRESET_FULL_RECT)
		tr.offset_left = 3
		tr.offset_top = 3
		tr.offset_right = -3
		tr.offset_bottom = -3
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		box.add_child(tr)
		if badge:
			var b := SHAPE.make(sp[0], sp[1], maxf(10.0, px * 0.3))
			b.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
			b.offset_left = -b.custom_minimum_size.x
			b.offset_top = -b.custom_minimum_size.y
			b.offset_right = 0
			b.offset_bottom = 0
			box.add_child(b)
	else:
		var s := SHAPE.make(sp[0], sp[1], px)
		s.set_anchors_preset(Control.PRESET_FULL_RECT)
		box.add_child(s)
	if level > 0:
		var pill := PanelContainer.new()
		pill.name = "Stars"
		pill.mouse_filter = Control.MOUSE_FILTER_IGNORE
		pill.add_theme_stylebox_override("panel", StyleBoxEmpty.new())
		pill.add_child(stars(level, 13))
		pill.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
		pill.grow_horizontal = Control.GROW_DIRECTION_BOTH
		pill.grow_vertical = Control.GROW_DIRECTION_BEGIN
		pill.offset_bottom = 4
		box.add_child(pill)
	return box

# set 212 (notes 1/10): bench row line 2 = tribe shapes (main first) then plain stars (right-aligned when stars_right)
static func tribes_stars(c: Dictionary, level: int, px: float, stars_right: bool = false) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.name = "TribesStars"
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 3)
	var ts := [c.get("tribe")]
	ts.append_array(c.get("extraTribes", []))
	for t in ts:
		var sp: Array = TH.TRIBE_SHAPE.get(t, ["square", "mute"])
		var b := SHAPE.make(sp[0], sp[1], px)
		b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(b)
	if level > 0:
		if stars_right:
			var gap := Control.new()
			gap.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
			row.add_child(gap)
		row.add_child(stars(level, 13))
	return row
