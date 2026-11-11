# Set 205 (user E1 set 204 · A1 set 205): one shared arena for prep + battle — the "camera" move between the two screens.
# Set 206 (user B2 + C1): the arena is 3D now (stage3d.gd) and the move is the real Camera3D dolly (~0.6 s) between the prep pose
# (your half fills the prep field) and the battle pose (both halves fill the battle field). Floor, sprites and the 2D cells all
# follow the same camera, so everything scales together. Way out: the battle cells ride along, the prep cells are hidden;
# way back: the reverse. The prep top/tray and battle top/dock slide away / in as before. Display only: the match was decided
# and applied before the move starts (set 22 rule).
extends Control

signal done

var app: Control # app.gd: prep · battle · stage · zoom_s · refit_stage()
var blocker: Control # above every screen while moving: no taps land mid-move
var moving := false

const SLIDE_PART := 0.4 # the overlays slide during the first / last 40 % of the move

func _init() -> void:
	name = "World"
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	visible = false
	blocker = Control.new()
	blocker.name = "MoveBlock"
	blocker.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	blocker.mouse_filter = Control.MOUSE_FILTER_STOP
	blocker.visible = false

# ---------- pure helpers (tests call these) ----------
static func ease_k(k: float) -> float: # cubic in-out
	k = clampf(k, 0.0, 1.0)
	return 4.0 * k * k * k if k < 0.5 else 1.0 - pow(-2.0 * k + 2.0, 3.0) / 2.0

# a plain holder that keeps its child's size but lets it slide (containers would snap it back): overlays use it
static func hold(inner: Control, nm: String) -> Control:
	var h := Control.new()
	h.name = nm
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	h.set_meta("dy", 0.0)
	h.add_child(inner)
	var fit := func() -> void:
		h.custom_minimum_size = inner.get_combined_minimum_size()
	inner.minimum_size_changed.connect(fit)
	h.resized.connect(func() -> void:
		inner.size = h.size
		inner.position = Vector2(0.0, float(h.get_meta("dy"))))
	fit.call()
	return h

static func slide(h: Control, dy: float) -> void:
	h.set_meta("dy", dy)
	(h.get_child(0) as Control).position = Vector2(0.0, dy)

# ---------- the move ----------
# to_battle: the battle screen is already loaded (paused) and visible; prep is still on screen
func to_battle(then: Callable) -> void:
	await _run(true, then)

# to_prep: prep was rendered (visible); the battle screen is still visible with the cells of the match that ended
func to_prep(then: Callable) -> void:
	await _run(false, then)

func _begin(out: bool) -> void:
	moving = true
	blocker.visible = true
	app.prep.visible = true
	app.battle.visible = true
	app.battle.result_box.visible = false
	app.battle.live.visible = false
	app.prep.card.visible = false
	app.prep.field.modulate.a = 0.0 if out else 1.0 # the side the camera heads for carries its cells along
	app.battle.field.modulate.a = 1.0 if out else 0.0
	app.stage.show_group("battle" if out else "prep")

func _run(out: bool, then: Callable) -> void:
	_begin(out)
	_step(0.0 if out else 1.0)
	await get_tree().process_frame # the side that just opened gets its layout
	app.refit_stage()
	_step(0.0 if out else 1.0)
	var tw := create_tween()
	tw.tween_method(func(k: float) -> void: _step(k if out else 1.0 - k), 0.0, 1.0, float(app.zoom_s))
	await tw.finished
	_finish(out, then)

# k = camera position (0 prep pose … 1 battle pose)
func _step(k: float) -> void:
	app.stage.set_k(ease_k(k))
	# prep overlays leave in the first part of the way out, battle overlays arrive in the last part (and the reverse way back)
	app.prep.slide(ease_k(clampf(k / SLIDE_PART, 0.0, 1.0)))
	app.battle.slide(ease_k(clampf((1.0 - k) / SLIDE_PART, 0.0, 1.0)))

func _finish(out: bool, then: Callable) -> void:
	moving = false
	blocker.visible = false
	app.prep.field.modulate.a = 1.0
	app.battle.field.modulate.a = 1.0
	app.prep.slide(0.0)
	app.battle.slide(0.0)
	app.prep.visible = not out
	app.battle.visible = out
	app._sync_stage()
	if then.is_valid():
		then.call()
	done.emit()

# shots.gd: freeze the move at k (both screens laid out already) · thaw() puts the battle screen back
func freeze(k: float) -> bool:
	_begin(true)
	app.refit_stage()
	_step(k)
	return true

func thaw() -> void:
	_finish(true, Callable())
