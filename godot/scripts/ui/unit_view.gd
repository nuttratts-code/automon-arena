# Set 197 (plan-set196 7b): a unit picture = web unitShape(): CC0 sprite (data/art.json unit/<id>) + rarity ring + tribe badge + star level.
# No sprite for an id → the tribe shape (square / triangle / …) instead. Purely drawing; no game rules here.
extends RefCounted

const TH := preload("res://scripts/ui/theme.gd")
const SHAPE := preload("res://scripts/ui/shape.gd")
const RING := {"ธรรมดา": 0, "ไม่ธรรมดา": 1, "หายาก": 2, "หายากมาก": 3, "ตำนาน": 4}
const RING_TOKEN := ["", "r-unc", "r-rare", "r-epic", "r-legend"]

static func rarity_token(c: Dictionary) -> String:
	return RING_TOKEN[int(RING.get(c.get("rarity"), 0))]

# px = side of the picture (stars sit on its lower edge, like the web .lv badge)
static func make(c: Dictionary, level: int, px: float) -> Control:
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
		pill.add_theme_stylebox_override("panel", TH.box(Color(20 / 255.0, 16 / 255.0, 12 / 255.0, 0.78), Color(0, 0, 0, 0), 4, 0, 3, 0))
		var l := TH.label("★".repeat(level), 13, "ink")
		l.add_theme_color_override("font_color", Color.WHITE)
		l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		pill.add_child(l)
		pill.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
		pill.grow_horizontal = Control.GROW_DIRECTION_BOTH
		pill.grow_vertical = Control.GROW_DIRECTION_BEGIN
		pill.offset_bottom = 4
		box.add_child(pill)
	return box
