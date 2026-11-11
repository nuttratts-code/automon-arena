# Set 196 (plan-set196 7a): the game app = web src/game/run (one page, screens + popups). Owns the run state P and the screens.
# 7a: name screen → new run · win rune offer popup · rotate notice in portrait.
# 7b (set 197): the prep / shop screen (prep.gd) + popups (popups.gd) · every action = J() journal + core call + messages + save, like the web
# J() / pushMsgs() / saveRun(). User pick: the run is saved after EVERY action (the web saved only at run start / rune actions / match end;
# a resume of a mid-round save re-opens that round as it was — P.op).
# Run rules come only from the ported core (shop.gd · runrunes.gd); this file never computes game rules itself.
# Player files: user://*.json only through save.gd store_text / load_text + JSON parse + type checks (HARD RULE 9 ③).
extends Control

const TH := preload("res://scripts/ui/theme.gd")
const R := preload("res://scripts/rules.gd")
const SH := preload("res://scripts/shop.gd")
const RR := preload("res://scripts/runrunes.gd")
const T := preload("res://scripts/team.gd")
const SV := preload("res://scripts/save.gd")
const RL := preload("res://scripts/runlog.gd")
const RB := preload("res://scripts/runboss.gd")
const Prep := preload("res://scripts/ui/prep.gd")
const Pop := preload("res://scripts/ui/pop.gd")
const Popups := preload("res://scripts/ui/popups.gd")
const NameScreen := preload("res://scripts/ui/name_screen.gd")
const RuneOffer := preload("res://scripts/ui/rune_offer.gd")
const PREFS := "user://prefs.json"

var chars: Array = []
var cm: Dictionary = {}
var P: Variant = null # run state (shop.gd new_run shape) · null before the first run
var B: Variant = null # the bot's run state (kept in the save, web B)
var stats: Dictionary = {}
var started_at := 0.0
var RLOG: Variant = null # run journal (runlog.gd)
var data_hash := ""
var save_file := "user://save.json" # tests point these at their own files
var log_file := "user://runlog.json"
var msgs: Array = [] # newest first, max 5 (web msgs)
var confirm_empty := false # 7c: "ยืนยันสู้" two-step fight button
var confirm_runes := false
var player_name := ""
var pop: Control
var popups: RefCounted
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
	data_hash = SV.data_hash(chars)
	prep = Prep.new()
	add_child(prep)
	prep.setup(self)
	prep.visible = false # shown by the first render() (the name screen comes first)
	prep.fight.connect(_on_fight)
	prep.open_runes.connect(func() -> void: popups.open("runes"))
	prep.open_tribes.connect(func() -> void: popups.open("tribes"))
	prep.clear_highlight.connect(func() -> void: set_highlight(null))
	pop = Pop.new()
	add_child(pop)
	popups = Popups.new(self, pop)
	name_scr = NameScreen.new()
	name_scr.visible = false
	name_scr.submitted.connect(_on_name)
	add_child(name_scr)
	offer = RuneOffer.new()
	offer.visible = false
	offer.take.connect(_on_take)
	offer.reroll.connect(_on_offer_reroll)
	offer.skip.connect(_on_offer_skip)
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
	var sd := seed & 0xFFFFFFFF
	P = SH.new_run(chars, float(sd))
	B = SH.new_run(chars, float((sd ^ 0xA5A5A5A5) & 0xFFFFFFFF))
	msgs = []
	stats = SV.new_stats()
	started_at = floorf(Time.get_unix_time_from_system() * 1000.0)
	RLOG = RL.new_run_log(float(sd), data_hash, started_at, player_name)
	confirm_empty = false
	confirm_runes = false
	prep.hi_tribe = null
	prep.sel = null
	prep.card.visible = false
	save_run() # saved at the start (before the first shop round): leaving and coming back = a fresh round-1 shop
	begin_round()

# web beginRound(): startRound on the player AND on the bot state
func begin_round() -> void:
	push_msgs(J("st", [], func() -> Variant: return SH.start_round(P, chars)))
	SH.start_round(B, chars)
	render()

func render() -> void:
	if P == null:
		return
	prep.visible = true
	prep.render()
	if popups.is_open():
		popups.refresh()
	if P.get("rn") is Dictionary and P["rn"].get("offer") is Dictionary and not bool(P.get("over", false)):
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

func _on_fight() -> void:
	say_err("ยังสู้ไม่ได้ในเวอร์ชัน Godot นี้ (ขั้น 7c)") # placeholder until 7c

# ---------- journal + save (web J() · saveRun()) ----------
# runs fn on P, and writes one journal entry (gold before → after) when it worked or changed anything
func J(type: String, args: Array, fn: Callable) -> Variant:
	var g0: Variant = P["gold"]
	var snap: String = SV.js_json(P) if RLOG != null else ""
	var r: Variant = fn.call()
	if RLOG != null and (type == "of" or (r is Dictionary and bool(r.get("ok", false))) or SV.js_json(P) != snap):
		RL.rl_push(RLOG, type, args, g0, P["gold"], floorf(Time.get_unix_time_from_system() * 1000.0))
	return r

func save_run() -> void:
	if P == null:
		return
	if not bool(P.get("over", false)):
		SV.store_text(save_file, SV.make_save(P, B, stats, started_at, data_hash))
	if RLOG != null:
		SV.store_text(log_file, SV.js_json(RLOG))

# web pushMsgs(): ok → its messages · refused → its reason (shown longer, red)
func push_msgs(r: Variant) -> void:
	if not (r is Dictionary):
		return
	var ok := bool(r.get("ok", false))
	var add: Array = (r.get("msgs", []) as Array).duplicate() if ok else [str(r.get("msg", ""))]
	if add.is_empty():
		return
	var rev := add.duplicate()
	rev.reverse()
	rev.append_array(msgs)
	msgs = rev.slice(0, 5)
	prep.show_msg(add.slice(maxi(0, add.size() - 3)), not ok)

func say_err(t: String) -> void:
	push_msgs({"ok": false, "msg": t})

# one finished action: message + save + redraw
func _done(r: Variant) -> Variant:
	push_msgs(r)
	confirm_empty = false
	confirm_runes = false
	save_run()
	render()
	return r

# ---------- commands (web doBuy / doSell / act / reroll / lock / runes) ----------
static func rf(ref: Variant) -> String:
	return RL.rl_ref(ref)

func do_buy(slot: int, dest: Variant) -> Variant:
	return _done(J("by", [slot, rf(dest)], func() -> Variant: return SH.buy(P, float(slot), dest, chars)))

func do_buy_merge(slot: int, to: Dictionary) -> Variant:
	return _done(J("bm", [slot, rf(to)], func() -> Variant: return SH.buy_merge(P, float(slot), to, chars)))

func do_sell(ref: Dictionary) -> Variant:
	return _done(J("sl", [rf(ref)], func() -> Variant: return SH.sell(P, ref, chars)))

func do_move(from: Dictionary, to: Dictionary) -> Variant:
	return _done(J("mv", [rf(from), rf(to)], func() -> Variant: return SH.move(P, from, to, chars)))

func do_reroll() -> Variant:
	return _done(J("rr", [], func() -> Variant: return SH.reroll(P, chars)))

func do_lock(slot: int) -> Variant:
	return _done(J("lk", [slot], func() -> Variant: return SH.toggle_lock(P, float(slot))))

func do_heart_trade() -> Variant:
	return _done(J("ht", [], func() -> Variant: return RR.rn_heart_trade(P)))

# slot = [row, lane] on the board, or null = not worn
func do_place_rune(id: String, slot: Variant, partner: bool) -> Variant:
	var sref := "-"
	if slot is Array:
		sref = rf({"at": "board", "row": slot[0], "lane": slot[1]})
	return _done(J("pl", [id, sref, 1 if partner else 0], func() -> Variant: return RR.rn_place(P, id, slot, R.RULES(), partner)))

func open_shop_pop() -> void:
	popups.open("shop")

func set_highlight(t: Variant) -> void:
	prep.hi_tribe = t
	render()

func run_boss_at() -> Variant:
	return RB.run_boss_at(P)

# names of the runes a unit wears (web runesOn): partner runes get " (คู่)"
func runes_on(u: Dictionary) -> Array:
	var out := []
	for id in P["rn"]["bag"]:
		for pr in [[RR.rn_unit_of(P, id), ""], [RR.rn_unit_of(P, id, true), " (คู่)"]]:
			if pr[0] != null and is_same(pr[0], u):
				var rec: Variant = RR.rn_rec(id)
				out.append((str(rec["name"]) if rec is Dictionary else str(id)) + pr[1])
	return out

# ---------- the win rune offer (7a) ----------
func _on_take(i: int, tribe: Variant) -> void:
	if i < 0: # flag rune: open / leave the tribe picker
		render()
		return
	var ids: Array = P["rn"]["offer"]["ids"]
	var id: Variant = ids[i] if i < ids.size() else null
	var args: Array = [i] if tribe == null else [i, tribe]
	var r: Variant = _done(J("tk", args, func() -> Variant: return SH.take_rune(P, float(i), chars, {}, tribe)))
	# a rune that must be worn → open it right away to pick the unit (web set 109)
	if r is Dictionary and bool(r.get("ok", false)) and id != null and RR.rn_wear(P, id) != "ok":
		popups.open("rune", id)

func _on_offer_reroll() -> void:
	_done(J("or", [], func() -> Variant: return RR.rn_reroll_offer(P)))

func _on_offer_skip() -> void:
	_done(J("sk", [], func() -> Variant: return RR.rn_skip_offer(P)))

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
