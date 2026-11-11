# Set 196 (plan-set196 7a): the game app = web src/game/run (one page, screens + popups). Owns the run state P and the screens.
# 7a: name screen → new run → prep (placeholder until 7b) · win rune offer popup · rotate notice in portrait.
# Run rules come only from the ported core (shop.gd · runrunes.gd); this file never computes game rules itself.
# Player files: user://prefs.json only through save.gd store_text / load_text + JSON parse + type checks (HARD RULE 9 ③).
extends Control

const TH := preload("res://scripts/ui/theme.gd")
const R := preload("res://scripts/rules.gd")
const SH := preload("res://scripts/shop.gd")
const RR := preload("res://scripts/runrunes.gd")
const T := preload("res://scripts/team.gd")
const SV := preload("res://scripts/save.gd")
const RL := preload("res://scripts/runlog.gd")
const NameScreen := preload("res://scripts/ui/name_screen.gd")
const RuneOffer := preload("res://scripts/ui/rune_offer.gd")
const PREFS := "user://prefs.json"

var chars: Array = []
var cm: Dictionary = {}
var P: Variant = null # run state (shop.gd new_run shape) · null before the first run
var player_name := ""
var bg: ColorRect
var name_scr: Control
var prep: Control
var offer: Control
var rotate_box: Control

var built := false

func _ready() -> void:
	build()

# builds every screen once (tests call it directly: under the headless runner the scene is not in a running tree yet)
func build() -> void:
	if built:
		return
	built = true
	TH.dark = bool(get_meta("force_dark", false)) or DisplayServer.is_dark_mode() # meta = tests/shots.gd only
	theme = TH.build()
	chars = R.game()["derived"]["characters"]
	cm = T.make_char_map(chars)
	bg = ColorRect.new()
	bg.color = TH.c("bg")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	prep = _prep_placeholder()
	add_child(prep)
	name_scr = NameScreen.new()
	name_scr.visible = false
	name_scr.submitted.connect(_on_name)
	add_child(name_scr)
	offer = RuneOffer.new()
	offer.visible = false
	offer.take.connect(_on_take)
	offer.reroll.connect(func() -> void: _act(RR.rn_reroll_offer(P)))
	offer.skip.connect(func() -> void: _act(RR.rn_skip_offer(P)))
	add_child(offer)
	rotate_box = _rotate_notice()
	add_child(rotate_box)
	if is_inside_tree():
		get_viewport().size_changed.connect(_on_resize)
		_on_resize()
	else:
		rotate_box.visible = false
	player_name = _load_name()
	if not has_meta("no_boot"): # tests/shots.gd drives the screens itself
		boot()

# web boot(): no name → ask first · (7e adds resume from the save)
func boot() -> void:
	if player_name == "":
		name_scr.open("")
		return
	name_scr.visible = false
	start_new_run(randi())

func start_new_run(seed: int) -> void:
	P = SH.new_run(chars, float(seed & 0xFFFFFFFF))
	SH.start_round(P, chars)
	render()

func render() -> void:
	var lab: Label = prep.get_node("Info")
	lab.text = "" if P == null else "รอบ %d · หัวใจ %d · เงิน %d" % [int(P["round"]), int(P["hearts"]), int(P["gold"])]
	if P is Dictionary and P.get("rn") is Dictionary and P["rn"].get("offer") is Dictionary and not bool(P.get("over", false)):
		offer.show_offer(P, cm)
	else:
		offer.visible = false

func _on_name(nm: String) -> void:
	player_name = nm
	SV.store_text(PREFS, JSON.stringify({"name": nm}))
	boot()

func _load_name() -> String:
	var s: Variant = SV.load_text(PREFS, 10000)
	var d: Variant = JSON.parse_string(s) if s is String else null
	return RL.rl_name(d.get("name")) if d is Dictionary else ""

func _on_take(i: int, tribe: Variant) -> void:
	if i < 0: # flag rune: open / leave the tribe picker
		render()
		return
	_act(SH.take_rune(P, i, chars, {}, tribe))

func _act(_r: Variant) -> void:
	# 7b: messages (r.msg) + run journal (runlog) + save after every action, like the web J()/saveRun()
	render()

func _prep_placeholder() -> Control:
	var c := CenterContainer.new()
	c.name = "Prep"
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	var l := TH.label("", 18, "ink", "display")
	l.name = "Info"
	c.add_child(l)
	return c

# web #rotate: portrait phone → "turn the phone sideways" over everything
func _rotate_notice() -> Control:
	var box := ColorRect.new()
	box.name = "Rotate"
	box.color = TH.c("bg")
	box.set_anchors_preset(Control.PRESET_FULL_RECT)
	box.mouse_filter = Control.MOUSE_FILTER_STOP
	var cc := CenterContainer.new()
	cc.set_anchors_preset(Control.PRESET_FULL_RECT)
	box.add_child(cc)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	var phone := Panel.new()
	phone.custom_minimum_size = Vector2(120, 70)
	phone.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	phone.add_theme_stylebox_override("panel", TH.box(Color(0, 0, 0, 0), TH.c("ink"), 8, 3))
	v.add_child(phone)
	# only shown in portrait, where the 854-px-wide base is shrunk to ~0.46 → big logical sizes (≈ 18 / 12 px on a 390-px phone)
	for p in [[TH.ui_text("rotate"), 40, "ink", "display"], [TH.ui_text("rotate_hint"), 27, "mute", "body"]]:
		var l := TH.label(p[0], p[1], p[2], p[3])
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(l)
	cc.add_child(v)
	return box

func _on_resize() -> void:
	var s := get_viewport().get_visible_rect().size
	rotate_box.visible = s.y > s.x
	if offer.visible:
		render()
