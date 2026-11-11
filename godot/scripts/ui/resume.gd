# Set 200 (plan-set196 7e): resume screen = web #resume (src/game/run/body.html + js/99-start.js boot()).
# Hero (6 tribe shapes · title · tagline) + card: "มี run ที่เล่นค้างไว้" · เล่นต่อ · round line · note · new run / copy run code · player + rename.
# Text only; app.gd decides what the buttons do (resume the saved round as it was when P.op — set 184).
extends ScrollContainer

signal go
signal new_run
signal copy_code
signal rename

const TH := preload("res://scripts/ui/theme.gd")
const SHAPE := preload("res://scripts/ui/shape.gd")

var info: Label
var player: Label
var msg: Label

func _init() -> void:
	name = "Resume"
	set_anchors_preset(Control.PRESET_FULL_RECT)
	horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var center := CenterContainer.new()
	center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_child(center)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 16)
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_child(col)
	var hero := VBoxContainer.new()
	hero.add_theme_constant_override("separation", 4)
	var shapes := HBoxContainer.new()
	shapes.alignment = BoxContainer.ALIGNMENT_CENTER
	shapes.add_theme_constant_override("separation", 14)
	for t in ["เหล็กกล้า", "เพลิงเผา", "สายฟ้า", "วายุ", "ภูติ", "อสูร"]:
		shapes.add_child(SHAPE.make(TH.TRIBE_SHAPE[t][0], TH.TRIBE_SHAPE[t][1], 28))
	hero.add_child(shapes)
	var ttl := TH.label(TH.ui_text("title"), TH.SIZE["title"], "ink", "display_b")
	ttl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hero.add_child(ttl)
	var tag := TH.label(TH.ui_text("tagline"), TH.SIZE["tagline"], "mute")
	tag.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hero.add_child(tag)
	col.add_child(hero)
	var card := PanelContainer.new()
	card.custom_minimum_size.x = 440
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	card.add_child(v)
	v.add_child(TH.label(TH.ui_text("rs_title"), 18, "ink", "display_b"))
	var b := Button.new()
	b.name = "ResumeGo"
	b.text = TH.ui_text("rs_go")
	TH.primary(b, true)
	b.pressed.connect(func() -> void: go.emit())
	v.add_child(b)
	info = _hint("")
	info.name = "ResumeInfo"
	v.add_child(info)
	v.add_child(_hint(TH.ui_text("rs_note")))
	var row := HFlowContainer.new()
	row.add_theme_constant_override("h_separation", 8)
	row.add_theme_constant_override("v_separation", 6)
	row.add_child(_btn(TH.ui_text("end_new"), "ResumeNew", func() -> void: new_run.emit()))
	row.add_child(_btn(TH.ui_text("code_copy"), "ResumeCode", func() -> void: copy_code.emit()))
	v.add_child(row)
	msg = _hint("", "ok")
	msg.name = "ResumeMsg"
	msg.visible = false
	v.add_child(msg)
	var prow := HBoxContainer.new()
	prow.add_theme_constant_override("separation", 8)
	player = TH.label("", TH.SIZE["hint"], "mute")
	player.name = "ResumePlayer"
	player.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	prow.add_child(player)
	prow.add_child(_btn(TH.ui_text("rename"), "ResumeRename", func() -> void: rename.emit()))
	v.add_child(prow)
	col.add_child(card)

func _hint(t: String, colr: String = "mute") -> Label:
	var l := TH.label(t, TH.SIZE["hint"], colr)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size.x = 400
	return l

func _btn(t: String, nm: String, fn: Callable) -> Button:
	var b := Button.new()
	b.name = nm
	b.text = t
	b.custom_minimum_size.y = 40
	b.pressed.connect(fn)
	return b

func open(info_text: String, nm: String) -> void:
	info.text = info_text
	set_player(nm)
	msg.visible = false
	visible = true

func set_player(nm: String) -> void:
	player.text = TH.ui_text("player", {"n": nm if nm != "" else TH.ui_text("no_name")})

func say(t: String, err: bool) -> void:
	msg.text = t
	msg.add_theme_color_override("font_color", TH.c("bad" if err else "ok"))
	msg.visible = t != ""
