# Set 201 (plan-set196 7f1): credits screen — HARD RULE 9 ② (licence + credit for everything third-party) + S-B1 owner line.
# Builds itself from data/credits.json (plain text only, validated; a bad file falls back to the owner line + engine notices).
# Godot's own MIT text + its third-party notices come from the engine at run time, so they always match the shipped build.
# Long licence texts are hidden behind a toggle per section (built only when opened). 7e adds the menu entry that opens it:
#   var c := preload("res://scripts/ui/credits.gd").new(); add_child(c); c.closed.connect(c.queue_free)
extends Control

const TH := preload("res://scripts/ui/theme.gd")
const DATA := "res://data/credits.json"
const MAX_BYTES := 200000

signal closed

var data := {}
var close_btn: Button
var _panel: PanelContainer
var _body: VBoxContainer

func _init() -> void:
	name = "Credits"
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	data = load_data()
	var bg := ColorRect.new()
	bg.color = TH.c("bg")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)
	_panel = PanelContainer.new()
	_panel.add_theme_stylebox_override("panel", TH.box(TH.c("panel"), TH.c("line"), 14, 1, 14, 12))
	center.add_child(_panel)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	_panel.add_child(col)
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 8)
	var ttl := TH.label(data["title"], TH.SIZE["big"], "ink", "display_b")
	ttl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(ttl)
	close_btn = Button.new()
	close_btn.name = "CreditsClose"
	close_btn.text = data["close"]
	close_btn.custom_minimum_size = Vector2(72, 40)
	close_btn.pressed.connect(close)
	head.add_child(close_btn)
	col.add_child(head)
	var scroll := ScrollContainer.new()
	scroll.name = "CreditsScroll"
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(scroll)
	_body = VBoxContainer.new()
	_body.name = "CreditsBody"
	_body.add_theme_constant_override("separation", 12)
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_body)
	_body.add_child(_owner_box())
	for s in data["sections"]:
		_body.add_child(_section(s))
	resized.connect(_fit)

func _ready() -> void:
	_fit()

func close() -> void:
	closed.emit()

func _unhandled_input(e: InputEvent) -> void:
	if visible and e.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		close()

func _fit() -> void:
	var w := minf(640.0, size.x - 24.0)
	var h := size.y - 24.0
	_panel.custom_minimum_size = Vector2(w, h)
	_body.custom_minimum_size.x = w - 40.0

func _wrap(l: Label) -> Label:
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return l

func _owner_box() -> Control:
	var v := VBoxContainer.new()
	v.name = "Owner"
	v.add_theme_constant_override("separation", 2)
	var o := _wrap(TH.label(data["owner"], 15, "ink", "body_b"))
	o.name = "OwnerLine"
	v.add_child(o)
	if data["owner_sub"] != "":
		v.add_child(_wrap(TH.label(data["owner_sub"], TH.SIZE["hint"], "mute")))
	return v

func _section(s: Dictionary) -> Control:
	var v := VBoxContainer.new()
	v.name = "S_" + s["id"]
	v.add_theme_constant_override("separation", 3)
	v.add_child(_wrap(TH.label(s["title"], TH.SIZE["h2"], "ink", "display")))
	for line in s["lines"]:
		v.add_child(_wrap(TH.label(line, TH.SIZE["hint"], "mute")))
	if s["engine"] != "" or s["licence_text"] != "" or s["licence_file"] != "":
		var t := Button.new()
		t.name = "Toggle"
		t.text = data["show"]
		t.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		t.custom_minimum_size.y = 36
		v.add_child(t)
		t.pressed.connect(func() -> void: _toggle(v, t, s))
	return v

func _toggle(v: VBoxContainer, t: Button, s: Dictionary) -> void:
	var box := v.get_node_or_null("Licence")
	if box == null:
		var l := _wrap(TH.label(licence_of(s), 12, "ink", "mono"))
		l.name = "Licence"
		v.add_child(l)
		t.text = data["hide"]
	else:
		box.visible = not box.visible
		t.text = data["hide"] if box.visible else data["show"]

# The full licence text of one section (engine text, inline text or a shipped .txt under res://data/fonts/).
static func licence_of(s: Dictionary) -> String:
	match s.get("engine", ""):
		"licence":
			return Engine.get_license_text()
		"thirdparty":
			return engine_thirdparty()
	if s.get("licence_text", "") != "":
		return s["licence_text"]
	var p: String = s.get("licence_file", "")
	if p != "" and FileAccess.file_exists(p):
		var f := FileAccess.open(p, FileAccess.READ)
		if f != null and f.get_length() <= MAX_BYTES:
			return f.get_as_text()
	return ""

# Godot's third-party components (name · copyright lines · licence id) + the text of every licence they use.
static func engine_thirdparty() -> String:
	var out := PackedStringArray()
	for comp in Engine.get_copyright_info():
		out.append(str(comp.get("name", "")))
		for part in comp.get("parts", []):
			for cr in part.get("copyright", []):
				out.append("  © " + str(cr))
			out.append("  " + str(part.get("license", "")))
	var lic := Engine.get_license_info()
	for k in lic.keys():
		out.append("")
		out.append("— " + str(k) + " —")
		out.append(str(lic[k]))
	return "\n".join(out)

static func load_data(path: String = DATA) -> Dictionary:
	var raw: Variant = null
	if FileAccess.file_exists(path):
		var f := FileAccess.open(path, FileAccess.READ)
		if f != null and f.get_length() <= MAX_BYTES:
			raw = JSON.parse_string(f.get_as_text())
	return clean(raw)

# Validate external data (HARD RULE 7): known keys only, strings only, licence files only from res://data/fonts/*.txt.
# The owner line and both engine sections are always present, whatever the file says.
static func clean(raw: Variant) -> Dictionary:
	var d: Dictionary = raw if raw is Dictionary else {}
	var out := {
		"title": _str(d.get("title"), "เครดิต"),
		"close": _str(d.get("close"), "ปิด"),
		"show": _str(d.get("show"), "ดูข้อความสัญญาอนุญาต"),
		"hide": _str(d.get("hide"), "ซ่อนข้อความสัญญาอนุญาต"),
		"owner": _str(d.get("owner"), "© 2026 Automon Arena · สงวนลิขสิทธิ์ (All rights reserved)"),
		"owner_sub": _str(d.get("owner_sub"), ""),
		"sections": [],
	}
	var seen := {}
	var src: Variant = d.get("sections")
	for s in (src if src is Array else []):
		if not s is Dictionary:
			continue
		var id := _str(s.get("id"), "")
		if id == "" or seen.has(id) or not id.is_valid_identifier():
			continue
		var eng := _str(s.get("engine"), "")
		var lf := _str(s.get("licence_file"), "")
		if not (lf.begins_with("res://data/fonts/") and lf.ends_with(".txt") and not lf.contains("..")):
			lf = ""
		var lines: Array = []
		var ls: Variant = s.get("lines")
		for line in (ls if ls is Array else []):
			if line is String:
				lines.append(line)
		seen[id] = true
		out["sections"].append({"id": id, "title": _str(s.get("title"), id), "lines": lines,
			"engine": eng if eng in ["licence", "thirdparty"] else "",
			"licence_text": _str(s.get("licence_text"), ""), "licence_file": lf})
	for need in [["godot_thirdparty", "Godot Engine third-party", "thirdparty"], ["godot", "Godot Engine", "licence"]]: # reverse: push_front
		if not seen.has(need[0]):
			out["sections"].push_front({"id": need[0], "title": need[1], "lines": [], "engine": need[2], "licence_text": "", "licence_file": ""})
	return out

static func _str(v: Variant, fallback: String) -> String:
	return v if v is String and v != "" else fallback
