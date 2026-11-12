# Set 197 (plan-set196 7b): one place on the prep screen = board cell · bench cell · shop slot (web [data-ref] elements).
# Drag = Godot's built-in drag and drop (mouse + touch): drag data {ref}; a press + release without a drag = tap (card).
# It never changes the run itself: it asks the prep screen (callables) and the prep screen asks the ported core.
extends PanelContainer

const TH := preload("res://scripts/ui/theme.gd")
const UV := preload("res://scripts/ui/unit_view.gd")

var ref: Dictionary = {}
var prep: Object = null # prep.gd: tapped(ref, node) · drop_on(from, to) · can_drop(from, to) · merge_mark(from, to) · drag_preview(ref)
var _dragged := false
var mergeable := false
var picked := false
var hi := 0 # 1 = tribe highlight on · -1 = dimmed
var drop_ok := false
var owned := false # set 207 P9: shop card of a kind you already own
const GLASS := 0.94 # = prep.gd GLASS (set 212 near-solid)
var stage_slot: Array = [] # set 206: [side, row, lane] = a board cell on the 3D arena (no box; states light the tile's rune rim)
var stage: Node3D = null

func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	focus_mode = Control.FOCUS_ALL

func look(filled: bool, shop: bool = false, locked: bool = false, cant: bool = false) -> void:
	var line := TH.c("line") if filled else TH.c("arena-line")
	var bg := Color(TH.c("panel"), GLASS) if filled else Color(0, 0, 0, 0) # set 207 P2: see-through over the arena
	var bw := 1 if filled else 2
	if shop:
		bg = Color(TH.c("panel"), GLASS)
		line = TH.c("line")
		bw = 1
		if owned and filled: # set 207 P9 (user G2): you already own this kind → yellowish card
			bg = Color(TH.c("gold-bg"), 0.88)
	if locked:
		line = TH.c("gold")
		bw = 2
	if mergeable:
		line = TH.c("gold")
		bw = 3
	if hi > 0:
		line = TH.c("accent")
		bw = 3
	if picked:
		line = TH.c("sel")
		bw = 3
	if drop_ok:
		line = TH.c("ok")
		bw = 3
	var st := TH.box(bg, line, 10, bw, 3, 2)
	if not stage_slot.is_empty(): # set 207 P0: arena cells draw no 2D frame — every state lights the tile's rune rim only
		var lit := locked or mergeable or hi > 0 or picked or drop_ok
		st = TH.box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 10, 0, 3, 2)
		if stage != null:
			stage.tint(int(stage_slot[0]), int(stage_slot[1]), int(stage_slot[2]), line if lit else null)
	add_theme_stylebox_override("panel", st)
	modulate = Color(1, 1, 1, 0.35) if hi < 0 else Color(1, 1, 1, 0.55) if cant else Color.WHITE

func _gui_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.button_index == MOUSE_BUTTON_LEFT:
		if e.pressed:
			_dragged = false
		elif not _dragged and prep != null and get_global_rect().has_point(e.global_position):
			var lk := find_child("LockTap", true, false) as Control # set 212: shop padlock = lock / unlock straight from the shop
			if lk != null and lk.get_global_rect().has_point(e.global_position):
				prep.lock_tapped(ref)
			else:
				prep.tapped(ref, self)
			accept_event()
	elif e is InputEventKey and e.pressed and (e.keycode == KEY_ENTER or e.keycode == KEY_SPACE) and prep != null:
		prep.tapped(ref, self)
		accept_event()

func _get_drag_data(_at: Vector2) -> Variant:
	if prep == null or not prep.has_thing(ref):
		return null
	_dragged = true
	set_drag_preview(prep.drag_preview(ref))
	prep.drag_started(ref)
	return {"ref": ref}

func _can_drop_data(_at: Vector2, data: Variant) -> bool:
	var ok: bool = data is Dictionary and data.get("ref") is Dictionary and prep != null and prep.can_drop(data["ref"], ref)
	if ok != drop_ok:
		drop_ok = ok
		prep.restyle(self)
	if ok: # set 207 P0: one hover cell at a time — the prep screen clears the cell the pointer left
		prep.hover(self)
	return ok

func _drop_data(_at: Vector2, data: Variant) -> void:
	drop_ok = false
	if prep != null and data is Dictionary and data.get("ref") is Dictionary:
		prep.drop_on(data["ref"], ref)

func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_END and prep != null:
		drop_ok = false
		prep.drag_ended()
