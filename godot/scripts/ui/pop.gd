# Set 197 (plan-set196 7b): the web <dialog> popup (#dlg): dim background · a panel min(560 px, width − 24) · header + body + a "ปิด" row.
# Tap outside the panel closes it. Content is plain controls built by popups.gd (text only, never markup).
extends Control

const TH := preload("res://scripts/ui/theme.gd")

signal closed

var _panel: PanelContainer
var _scroll: ScrollContainer
var _body: VBoxContainer

func _init() -> void:
	name = "Pop"
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new()
	dim.color = Color(20 / 255.0, 16 / 255.0, 12 / 255.0, 0.45)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.gui_input.connect(func(e: InputEvent) -> void:
		if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
			close())
	add_child(dim)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)
	_panel = PanelContainer.new()
	var st := TH.box(TH.c("panel"), TH.c("line"), 14, 1, 14, 12)
	st.shadow_color = Color(0, 0, 0, 0.35)
	st.shadow_size = 16
	_panel.add_theme_stylebox_override("panel", st)
	center.add_child(_panel)
	_scroll = ScrollContainer.new()
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_panel.add_child(_scroll)
	_body = VBoxContainer.new()
	_body.add_theme_constant_override("separation", 8)
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_scroll.add_child(_body)
	visible = false
	resized.connect(_fit)

func is_open() -> bool:
	return visible

func close() -> void:
	if visible:
		visible = false
		closed.emit()

func _fit() -> void:
	var w := minf(560.0, size.x - 24.0)
	var h := minf(_body.get_combined_minimum_size().y + 24.0, size.y - 24.0)
	_panel.custom_minimum_size = Vector2(w, h)
	_scroll.custom_minimum_size = Vector2(w - 28.0, h - 24.0)
	_body.custom_minimum_size.x = w - 28.0

# nodes = the content (header, lists, buttons); a "ปิด" row is appended unless no_close
func show_nodes(nodes: Array, extra_acts: Array = []) -> void:
	for ch in _body.get_children():
		_body.remove_child(ch)
		ch.queue_free()
	for n in nodes:
		_body.add_child(n)
	var acts := HBoxContainer.new()
	acts.name = "Acts"
	acts.alignment = BoxContainer.ALIGNMENT_END
	acts.add_theme_constant_override("separation", 8)
	for a in extra_acts:
		acts.add_child(a)
	var x := Button.new()
	x.name = "PopClose"
	x.text = TH.ui_text("close")
	x.pressed.connect(close)
	acts.add_child(x)
	_body.add_child(acts)
	visible = true
	_fit()
	_fit.call_deferred()

static func head(title: String, sub: String = "", icon: Control = null) -> Control:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	if icon != null:
		icon.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		h.add_child(icon)
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_theme_constant_override("separation", 2)
	v.add_child(TH.label(title, 18, "ink", "display_b"))
	if sub != "":
		var s := TH.label(sub, 13, "mute")
		s.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		v.add_child(s)
	h.add_child(v)
	return h
