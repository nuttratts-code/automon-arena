# Set 196 (7a): name screen = web #nameScr (src/game/run/body.html + js/80-runend-name.js askName / nameForm submit).
# Hero (6 tribe shapes · title · tagline) + card (label · input · เริ่มเล่น · error · note). Name rule = runlog.gd rl_name (same as JS rlName).
extends ScrollContainer

signal submitted(name: String)

const TH := preload("res://scripts/ui/theme.gd")
const SHAPE := preload("res://scripts/ui/shape.gd")
const RL := preload("res://scripts/runlog.gd")

var input: LineEdit
var go: Button
var err: Label

func _init() -> void:
	name = "NameScreen"
	set_anchors_preset(Control.PRESET_FULL_RECT)
	horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var center := CenterContainer.new()
	center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_child(center)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 20)
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_child(col)
	# hero
	var hero := VBoxContainer.new()
	hero.add_theme_constant_override("separation", 4)
	var shapes := HBoxContainer.new()
	shapes.alignment = BoxContainer.ALIGNMENT_CENTER
	shapes.add_theme_constant_override("separation", 14)
	for t in ["เหล็กกล้า", "เพลิงเผา", "สายฟ้า", "วายุ", "ภูติ", "อสูร"]:
		shapes.add_child(SHAPE.make(TH.TRIBE_SHAPE[t][0], TH.TRIBE_SHAPE[t][1], 32))
	hero.add_child(shapes)
	var ttl := TH.label(TH.ui_text("title"), TH.SIZE["title"], "ink", "display_b")
	ttl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hero.add_child(ttl)
	var tag := TH.label(TH.ui_text("tagline"), TH.SIZE["tagline"], "mute")
	tag.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hero.add_child(tag)
	col.add_child(hero)
	# card
	var card := PanelContainer.new()
	card.custom_minimum_size.x = 420
	var form := VBoxContainer.new()
	form.add_theme_constant_override("separation", 10)
	card.add_child(form)
	form.add_child(TH.label(TH.ui_text("name_label"), 16, "ink", "body_b"))
	input = LineEdit.new()
	input.name = "NameIn"
	input.placeholder_text = TH.ui_text("name_ph")
	input.max_length = 40
	input.custom_minimum_size.y = 46
	input.add_theme_font_size_override("font_size", 17)
	input.text_submitted.connect(func(_t: String) -> void: _submit())
	form.add_child(input)
	go = Button.new()
	go.name = "NameGo"
	go.text = TH.ui_text("name_go")
	TH.primary(go, true)
	go.pressed.connect(_submit)
	form.add_child(go)
	err = TH.label(TH.ui_text("name_err"), TH.SIZE["hint"], "bad")
	err.visible = false
	form.add_child(err)
	var note := TH.label(TH.ui_text("name_note"), TH.SIZE["hint"], "mute")
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.custom_minimum_size.x = 370
	form.add_child(note)
	col.add_child(card)

func open(current: String) -> void:
	input.text = current
	err.visible = false
	visible = true
	if is_inside_tree():
		input.grab_focus()

func _submit() -> void:
	var nm := RL.rl_name(input.text)
	if nm == "":
		err.visible = true
		return
	submitted.emit(nm)
