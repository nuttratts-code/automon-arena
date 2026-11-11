# Set 205 (user E1 set 204 · A1 set 205): one shared arena for prep + battle. The steady screens keep their own field panels;
# this node only plays the "camera" move between them (~0.6 s): prep = zoomed into your half, battle = both halves.
# During the move the prep board and the battle field are hidden and this node draws the world itself — floor, midline,
# 6 + 6 slot frames and unit pictures, no text — every slot rect lerped from its prep spot to its battle spot (cells are moved and
# sized, never scaled, so the real cells take over with crisp text when the move ends). The enemy slots start where the same
# camera maps them = off-screen right. Display only: the match was decided and applied before the move starts (set 22 rule).
extends Control

const TH := preload("res://scripts/ui/theme.gd")
const UV := preload("res://scripts/ui/unit_view.gd")

signal done

var app: Control # app.gd: prep · battle · zoom_s
var blocker: Control # above every screen while moving: no taps land mid-move
var from := {} # "side:row:lane" → Rect2 at t=0 (prep framing)
var to := {} # "side:row:lane" → Rect2 at t=1 (battle framing)
var tokens := {} # "side:row:lane" → {tex: Texture2D | null, col: Color, ring: Color | null}
var floor_from := Rect2()
var floor_to := Rect2()
var mid_from := 0.0
var mid_to := 0.0
var t := 0.0
var moving := false

const SLIDE_PART := 0.4 # the overlays slide during the first / last 40 % of the move

func _init() -> void:
	name = "World"
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST # pixel sprites stay sharp while they move
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	visible = false
	blocker = Control.new()
	blocker.name = "MoveBlock"
	blocker.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	blocker.mouse_filter = Control.MOUSE_FILTER_STOP
	blocker.visible = false

# ---------- pure helpers (tests call these) ----------
static func lerp_rect(a: Rect2, b: Rect2, k: float) -> Rect2:
	return Rect2(a.position.lerp(b.position, k), a.size.lerp(b.size, k))

static func ease_k(k: float) -> float: # cubic in-out
	k = clampf(k, 0.0, 1.0)
	return 4.0 * k * k * k if k < 0.5 else 1.0 - pow(-2.0 * k + 2.0, 3.0) / 2.0

# the camera that frames your battle half (u1) onto your prep half (u0): the same map places every other battle rect
static func cam_map(r: Rect2, u1: Rect2, u0: Rect2) -> Rect2:
	var k := Vector2(u0.size.x / maxf(1.0, u1.size.x), u0.size.y / maxf(1.0, u1.size.y))
	return Rect2(u0.position + (r.position - u1.position) * k, r.size * k)

static func union(rs: Array) -> Rect2:
	var u: Rect2 = rs[0]
	for r in rs:
		u = u.merge(r)
	return u

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

# ---------- capture ----------
func _rects() -> Dictionary: # both framings from the live cells; false when a side is not laid out
	var bv: Control = app.battle.view
	var p0 := {}
	var p1 := {}
	var e1 := {}
	for row in 3:
		for lane in 2:
			var pc: Control = app.prep.cells.get("b_%d_%d" % [row, lane])
			var b0: Control = bv.cells.get("0:%d:%d" % [row, lane])
			var b1: Control = bv.cells.get("1:%d:%d" % [row, lane])
			if pc == null or b0 == null or b1 == null:
				return {}
			p0["0:%d:%d" % [row, lane]] = pc.get_global_rect()
			p1["0:%d:%d" % [row, lane]] = b0.get_global_rect()
			e1["1:%d:%d" % [row, lane]] = b1.get_global_rect()
	return {"p0": p0, "p1": p1, "e1": e1}

func capture() -> bool:
	var rc := _rects()
	if rc.is_empty():
		return false
	var o := get_global_rect().position
	var u0 := union(rc["p0"].values())
	var u1 := union(rc["p1"].values())
	if u0.size.x < 1.0 or u1.size.x < 1.0:
		return false
	from = {}
	to = {}
	for k in rc["p0"]:
		from[k] = Rect2(rc["p0"][k].position - o, rc["p0"][k].size)
		to[k] = Rect2(rc["p1"][k].position - o, rc["p1"][k].size)
	for k in rc["e1"]:
		var r: Rect2 = rc["e1"][k]
		var m := cam_map(r, u1, u0)
		from[k] = Rect2(m.position - o, m.size)
		to[k] = Rect2(r.position - o, r.size)
	var pf: Rect2 = app.prep.field.get_global_rect()
	var bf: Rect2 = app.battle.field.get_global_rect()
	var e_u1 := union(rc["e1"].values())
	var mid := (u1.end.x + e_u1.position.x) / 2.0
	floor_to = Rect2(bf.position - o, bf.size)
	var fb := cam_map(bf, u1, u0) # the battle floor seen through the prep camera: its left part = the prep field
	floor_from = Rect2(pf.position - o, Vector2(fb.end.x - pf.position.x, pf.size.y))
	mid_to = mid - o.x
	mid_from = u0.position.x + (mid - u1.position.x) * (u0.size.x / u1.size.x) - o.x
	tokens = {}
	for v in app.battle.view.units.values():
		var key := "%d:%d:%d" % [int(v["side"]), int(v["row"]), int(v["lane"])]
		var c: Dictionary = app.battle.view._char_of(v)
		var sp: Array = TH.TRIBE_SHAPE.get(c.get("tribe"), ["square", "mute"])
		var rt := UV.rarity_token(c)
		tokens[key] = {"tex": TH.art("unit", str(v["id"])), "col": TH.c(sp[1]), "ring": TH.c(rt) if rt != "" else null}
	return true

# ---------- the move ----------
# to_battle: the battle screen is already loaded (paused) and visible; prep is still on screen
func to_battle(then: Callable) -> void:
	await _run(true, then)

# to_prep: prep was rendered (visible); the battle screen is still visible with the cells of the match that ended
func to_prep(then: Callable) -> void:
	await _run(false, then)

func _run(out: bool, then: Callable) -> void:
	moving = true
	blocker.visible = true
	app.prep.visible = true
	app.battle.visible = true
	app.battle.result_box.visible = false
	app.battle.live.visible = false
	app.prep.card.visible = false
	app.prep.field.modulate.a = 0.0
	app.battle.field.modulate.a = 0.0
	_step(0.0 if out else 1.0, out)
	await get_tree().process_frame # the side that just opened gets its layout
	if not capture():
		_finish(out, then)
		return
	visible = true
	var tw := create_tween()
	tw.tween_method(func(k: float) -> void: _step(k if out else 1.0 - k, out), 0.0, 1.0, float(app.zoom_s))
	await tw.finished
	_finish(out, then)

# k = camera position (0 prep framing … 1 battle framing) · out = the move goes prep → battle
func _step(k: float, _out: bool) -> void:
	t = ease_k(k)
	queue_redraw()
	# prep overlays leave in the first part of the way out, battle overlays arrive in the last part (and the reverse way back)
	app.prep.slide(ease_k(clampf(k / SLIDE_PART, 0.0, 1.0)))
	app.battle.slide(ease_k(clampf((1.0 - k) / SLIDE_PART, 0.0, 1.0)))

func _finish(out: bool, then: Callable) -> void:
	visible = false
	moving = false
	blocker.visible = false
	app.prep.field.modulate.a = 1.0
	app.battle.field.modulate.a = 1.0
	app.prep.slide(0.0)
	app.battle.slide(0.0)
	app.prep.visible = not out
	app.battle.visible = out
	if then.is_valid():
		then.call()
	done.emit()

# shots.gd: freeze the move at k (both screens laid out already) · thaw() puts the battle screen back
func freeze(k: float) -> bool:
	app.prep.visible = true
	app.prep.field.modulate.a = 0.0
	app.battle.field.modulate.a = 0.0
	if not capture():
		thaw()
		return false
	visible = true
	_step(k, true)
	return true

func thaw() -> void:
	_finish(true, Callable())

# ---------- drawing ----------
func _draw() -> void:
	var fl := lerp_rect(floor_from, floor_to, t)
	var sb := TH.box(TH.c("arena"), TH.c("arena-line"), 12, 1, 0, 0)
	draw_style_box(sb, fl)
	var mx := lerpf(mid_from, mid_to, t)
	draw_rect(Rect2(mx - 1.0, fl.position.y + 6.0, 2.0, fl.size.y - 12.0), TH.c("mid"))
	var frame := TH.box(Color(0, 0, 0, 0), TH.c("arena-line"), 8, 2, 0, 0)
	var filled := TH.box(TH.c("panel"), TH.c("line"), 8, 1, 0, 0)
	for key in to:
		var r := lerp_rect(from[key], to[key], t)
		var tk: Variant = tokens.get(key)
		draw_style_box(filled if tk != null else frame, r)
		if tk == null:
			continue
		var side := minf(r.size.x, r.size.y) * 0.62
		var pic := Rect2(r.get_center() - Vector2(side, side) / 2.0, Vector2(side, side))
		if tk["ring"] != null:
			draw_style_box(TH.box(Color(0, 0, 0, 0), tk["ring"], 8, 2, 0, 0), pic.grow(2.0))
		if tk["tex"] != null:
			draw_texture_rect(tk["tex"], pic, false)
		else:
			draw_rect(pic.grow(-side * 0.15), tk["col"])
