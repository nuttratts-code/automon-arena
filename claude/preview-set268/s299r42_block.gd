
# ================= r42 (set 299, 27 Nov, owner A1 + B2): the same 4 looks rebuilt on ui-patterns §10 V2.2 =================
# Common to every variant: Fight = pale-blue raised plate, brightest plate, 2 px thickness (DO 39 · S2 · tone.json accent)
# · 2-tone bevel + mid-tone chamfer (DO 33 · L2) · cut 8 main / 4 small (S1, measured on the r39p top plate) · value tiers
# panel ~L*24 > card well ~15 > socket ~9 (DO 34 · L3) · one scrim under top + bottom bands (L4) · sockets recessed (DO 39)
# · can't afford = red price + dimmed frame, creature untouched (I1) · text on a dark patch, never bare on art (DO 36).
const K42 := 8.0
const KS42 := 4.0
const PAL42 := [   # pan · well · sock · rule  (B2: Claude picks one per variant, S299PAL still overrides)
	{"pan": "#343b44", "well": "#22272d", "sock": "#15181c", "rule": "#cfe6ee"},
	{"pan": "#3d3127", "well": "#2a221b", "sock": "#1a1510", "rule": "#f3dfc0"},
	{"pan": "#323b2a", "well": "#222919", "sock": "#141a10", "rule": "#dfeec6"},
	{"pan": "#3b3040", "well": "#28202b", "sock": "#19131b", "rule": "#ecd9f2"},
]
const PICK42 := [1, 1, 1, 1, 1]   # per variant palette (B2), filled after the palette shots
const FIGHT42 := "#8cc0de"
const FIGHT42_TXT := "#13212a"
static var _r42 := -1
static func r42() -> bool:
	if _r42 < 0: _r42 = 1 if OS.get_environment("S299R42") == "1" else 0
	return _r42 == 1
static var _p42 := -1
static func Q(k: String) -> Color:
	if _p42 < 0:
		var e := OS.get_environment("S299PAL")
		_p42 = clampi(int(e), 0, 3) if e != "" else PICK42[on()]
	return Color(PAL42[_p42][k])

static func _seg(ci: CanvasItem, a: Vector2, b: Vector2, c: Color) -> void:
	ci.draw_line(a, b, c, 1.0)

# 2-tone bevel on a cut-corner plate (raised: light top/left, dark bottom/right; sunk = the other way + inner shadow)
static func bev(ci: CanvasItem, r: Rect2, k: float, fill: Color, raised: bool, a := 1.0, outer := true) -> void:
	var p := _cut(r, k)
	ci.draw_polygon(p, PackedColorArray([Color(fill, fill.a * a)]))
	if outer: _line(ci, _cut(r.grow(1.0), k + 0.5), Color(0.03, 0.025, 0.02, 0.85 * a), 1.0)
	var q := _cut(r.grow(-0.5), k)
	var hi := Color(fill.lightened(0.30), a)
	var lo := Color(fill.darkened(0.50), a)
	if not raised:
		hi = Color(fill.darkened(0.50), a)
		lo = Color(fill.lightened(0.12), a)
	var mid := Color(hi.lerp(lo, 0.5), a)
	_seg(ci, q[0], q[1], hi); _seg(ci, q[1], q[2], lo); _seg(ci, q[2], q[3], mid)
	_seg(ci, q[3], q[4], lo); _seg(ci, q[4], q[5], hi); _seg(ci, q[5], q[0], mid)
	if not raised:   # inner shadow under the top lip
		for i in 3:
			var y := r.position.y + 1.5 + i
			ci.draw_line(Vector2(r.position.x + k + 1.0, y), Vector2(r.end.x - 1.5, y), Color(0, 0, 0, (0.30 - i * 0.09) * a), 1.0)

static func fight42(ci: CanvasItem, r: Rect2, hv: bool) -> void:
	var th := 2.0
	var f := Color(FIGHT42).lightened(0.08 if hv else 0.0)
	var top := Rect2(r.position, r.size - Vector2(0, th))
	if on() == 2:   # pixel hand: hard drop shadow
		ci.draw_polygon(_cut(Rect2(r.position + Vector2(3, 3), r.size), K42), PackedColorArray([Color(0, 0, 0, 0.55)]))
	ci.draw_polygon(_cut(Rect2(top.position + Vector2(0, th), top.size), K42), PackedColorArray([f.darkened(0.48)]))   # thickness
	bev(ci, top, K42, f, true, 1.0, on() != 2)
	if on() == 2: _line(ci, _cut(r.grow(1.0), K42 + 0.5), Color(0.02, 0.02, 0.03), 2.0)

static func plate42(ci: CanvasItem, r: Rect2, a: float) -> void:
	match on():
		1:
			bev(ci, r, K42, Color(Q("pan"), 0.95), true, a)
		2:
			ci.draw_polygon(_cut(Rect2(r.position + Vector2(3, 3), r.size), K42), PackedColorArray([Color(0, 0, 0, 0.45 * a)]))
			bev(ci, r, K42, Q("pan"), true, a, false)
			_line(ci, _cut(r.grow(1.0), K42 + 0.5), Color(0.02, 0.02, 0.03, a), 2.0)
		3:
			ci.draw_polygon(_cut(r, K42), PackedColorArray([Color(Q("pan"), 0.80 * a)]))
			var q := _cut(r.grow(-0.5), K42)
			_seg(ci, q[0], q[1], Color(Q("rule"), 0.55 * a)); _seg(ci, q[5], q[0], Color(Q("rule"), 0.30 * a))
			_seg(ci, q[3], q[4], Color(0, 0, 0, 0.45 * a)); _seg(ci, q[2], q[3], Color(0, 0, 0, 0.30 * a))
		4:
			ci.draw_polygon(_cut(r, K42), PackedColorArray([Color(Q("sock"), 0.90 * a)]))
			var q := _cut(r.grow(-0.5), K42)
			_seg(ci, q[0], q[1], Color(Q("pan").lightened(0.25), 0.8 * a))
			_seg(ci, q[3], q[4], Color(0, 0, 0, 0.6 * a))

static func button42(ci: CanvasItem, r: Rect2, nm: String, hv: bool) -> void:
	if nm == "Fight":
		fight42(ci, r, hv)
		return
	var f := Q("pan").lightened(0.10 if not hv else 0.18)
	match on():
		2:
			ci.draw_polygon(_cut(Rect2(r.position + Vector2(2, 2), r.size), K42), PackedColorArray([Color(0, 0, 0, 0.5)]))
			bev(ci, r, K42, f, true, 1.0, false)
			_line(ci, _cut(r.grow(1.0), K42 + 0.5), Color(0.02, 0.02, 0.03), 2.0)
		3:
			ci.draw_polygon(_cut(r, K42), PackedColorArray([Color(f, 0.72 if not hv else 0.85)]))
			var q := _cut(r.grow(-0.5), K42)
			_seg(ci, q[0], q[1], Color(Q("rule"), 0.6)); _seg(ci, q[3], q[4], Color(0, 0, 0, 0.5))
		4:
			bev(ci, r, K42, Q("pan").darkened(0.1).lightened(0.08 if hv else 0.0), true, 1.0)
		_:
			bev(ci, r, K42, f, true)

static func button_text42(b: Button) -> void:
	var c := Color(FIGHT42_TXT)
	for k in ["font_color", "font_hover_color", "font_pressed_color"]: b.add_theme_color_override(k, c)
	b.add_theme_constant_override("outline_size", 0)
	b.add_theme_color_override("font_shadow_color", Color(1, 1, 1, 0.35))
	b.add_theme_constant_override("shadow_offset_x", 0)
	b.add_theme_constant_override("shadow_offset_y", 1)
	b.add_theme_constant_override("shadow_outline_size", 0)
	for n in b.find_children("*", "Label", true, false):
		var l := n as Label
		l.add_theme_color_override("font_color", c)
		l.add_theme_constant_override("outline_size", 0)
		l.add_theme_color_override("font_shadow_color", Color(1, 1, 1, 0.35))
		l.add_theme_constant_override("shadow_offset_x", 0)
		l.add_theme_constant_override("shadow_offset_y", 1)
		l.add_theme_constant_override("shadow_outline_size", 0)

static func text42(l: Label) -> void:   # text sits on plates → no heavy outline (tell ⑦); V2 = 1 px pixel outline
	var c := l.get_theme_color("font_color")
	l.add_theme_constant_override("shadow_outline_size", 0)
	if on() == 2:
		l.add_theme_color_override("font_outline_color", Color(0.02, 0.02, 0.03, 1.0))
		l.add_theme_constant_override("outline_size", 2)
		l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0))
	else:
		l.add_theme_constant_override("outline_size", 0)
		l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.55))
		l.add_theme_constant_override("shadow_offset_x", 0)
		l.add_theme_constant_override("shadow_offset_y", 1)
	if c.s < 0.2 and c.v > 0.6: l.add_theme_color_override("font_color", Color("#f4efe6"))

static func slot42(ci: Control, filled: bool, shop: bool, line: Variant) -> void:
	var r := Rect2(Vector2.ZERO, ci.size)
	if shop:
		if line != null: _line(ci, _cut(r.grow(-1.0), K42), line, 2.0)
		return
	if not filled: line = null
	match on():
		3:
			ci.draw_polygon(_cut(r.grow(-1.0), K42), PackedColorArray([Color(Q("sock"), 0.93)]))
			var q := _cut(r.grow(-1.5), K42)
			_seg(ci, q[0], q[1], Color(0, 0, 0, 0.5)); _seg(ci, q[3], q[4], Color(Q("rule"), 0.30))
		_:
			bev(ci, r.grow(-1.0), K42, Color(Q("sock"), 0.96), false, 1.0, on() != 2)
			if on() == 2: _line(ci, _cut(r, K42 + 0.5), Color(0.02, 0.02, 0.03), 2.0)
	if line != null: _line(ci, _cut(r.grow(-1.0), K42), line, 2.0)

static func scrim42(cell: Control) -> void:   # L4: ONE scrim system under the top + bottom HUD bands
	var n: Node = cell
	while n != null and not n.has_method("_fill_shop"): n = n.get_parent()
	if n == null or n.get_node_or_null("Scrim42") != null: return
	var s := Control.new()
	s.name = "Scrim42"
	s.mouse_filter = Control.MOUSE_FILTER_IGNORE
	s.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	s.draw.connect(func() -> void:
		var w := s.size.x
		var h := s.size.y
		for b in [[0.0, h * 0.30, true], [h * 0.76, h, false]]:   # one smooth gradient per band (no strips = no banding lines)
			var n0: float = b[0]
			var n1: float = b[1]
			var c0 := Color(0.03, 0.02, 0.01, 0.20 if b[2] else 0.0)
			var c1 := Color(0.03, 0.02, 0.01, 0.0 if b[2] else 0.20)
			s.draw_polygon(PackedVector2Array([Vector2(0, n0), Vector2(w, n0), Vector2(w, n1), Vector2(0, n1)]), PackedColorArray([c0, c0, c1, c1])))
	n.add_child(s)
	n.move_child(s, 0)

static var _tnum: Font
static func _numfont(f: Font) -> Font:   # T3: fixed-width digits where the font has them
	if _tnum == null:
		var fv := FontVariation.new()
		fv.base_font = f
		fv.opentype_features = {TextServerManager.get_primary_interface().name_to_tag("tnum"): 1}
		_tnum = fv
	return _tnum

static func card42(cell: Control, c: Dictionary, ts: Array, cant: bool, owned: bool) -> void:
	var dc := OS.get_environment("S299CANT")   # sample only: force one card into the can't-afford state
	if dc != "" and cell.get_index() == int(dc): cant = true
	cell.modulate = Color.WHITE   # I1: never fade the creature (slot_cell faded the whole cell to 0.55)
	scrim42(cell)
	var rc := Color(0.55, 0.55, 0.55)
	var cols := []
	var ft := cell.find_child("Foot299", true, false)
	if ft != null:
		rc = ft.get_meta("rc", rc)
		cols = ft.get_meta("cols", [])
	if cols.is_empty():
		for t in ts: cols.append(TH.c(str((TH.TRIBE_SHAPE.get(t, ["square", "mute"]) as Array)[1])))
	for ch in cell.get_children():
		if ch is CanvasItem: (ch as CanvasItem).visible = false
	var tex := TH.hub_pic299(str(c.get("id")))
	var vc := Control.new()
	vc.name = "Var299"
	vc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vc.clip_contents = true
	vc.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var hp := _lv(c, "hp")
	var atk := _lv(c, "atk")
	vc.draw.connect(func() -> void: _card42(vc, tex, str(c["name"]), int(float(c["price"])), rc, cols, ts, hp, atk, cant, owned))
	cell.add_child(vc)

static func _stats42(ci: CanvasItem, fb: Font, x: float, y: float, hp: float, atk: float, ol: int) -> void:   # DO 36: one fixed strip on a dark patch
	var s1 := _num(hp)
	var s2 := _num(atk)
	var w1 := fb.get_string_size(s1, HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x
	var w2 := fb.get_string_size(s2, HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x
	ci.draw_polygon(_cut(Rect2(x, y, w1 + w2 + 13, 11), KS42 * 0.5), PackedColorArray([Color(0.02, 0.02, 0.02, 0.62)]))
	_txt(ci, fb, Vector2(x + 3, y + 9), s1, 8, Color("#a6e08f"), ol, Color(0.02, 0.02, 0.03))
	_txt(ci, fb, Vector2(x + 8 + w1, y + 9), s2, 8, Color("#ffc58a"), ol, Color(0.02, 0.02, 0.03))

static func _card42(ci: Control, tex: Texture2D, nm: String, price: int, rc: Color, cols: Array, ts: Array, hp: float, atk: float, cant: bool, owned: bool) -> void:
	var w := ci.size.x
	var h := ci.size.y
	var r := Rect2(Vector2.ZERO, ci.size)
	var fb: Font = TH.font("body_b")
	var fd: Font = _numfont(TH.font("display"))
	var tc: Color = cols[0] if cols.size() > 0 else Color(0.5, 0.5, 0.5)
	var pc := Color("#ff6a5a") if cant else Color("#fff3c8")
	var fa := 0.45 if cant else 1.0   # I1: frame dimmed, creature untouched
	var ps := _num(price)
	var pw := fd.get_string_size(ps, HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x
	var bh := 17.0
	match on():
		1:   # quiet chrome: recessed well, tier light inside (DO 38), calm frame
			bev(ci, r.grow(-1.0), K42, Q("well"), false, 1.0, false)
			var gc := Vector2(w * 0.5, (h - bh) * 0.66)
			for i in 12:
				ci.draw_circle(gc, (h - bh) * (0.60 - i * 0.045), Color(rc, 0.045), true, -1.0, true)
			_pic(ci, tex, Rect2(4, 6, w - 8, h - bh - 7))
			ci.draw_rect(Rect2(1, h - bh, w - 2, bh - 1), Color(0.02, 0.02, 0.02, 0.70))
			ci.draw_rect(Rect2(KS42 + 1, h - bh, w - 2 * KS42 - 2, 2), Color(rc, 0.9))
			_txt(ci, fb, Vector2(5, h - 5), nm, 9, Color("#f4efe6"), 0, Color.BLACK)
			_txt(ci, fd, Vector2(w - 5 - pw, h - 4), ps, 11, pc, 0, Color.BLACK)
			_coin(ci, Vector2(w - 6 - pw - 11, h - bh + 4), 1.5)
			_stats42(ci, fb, 3, 3, hp, atk, 0)
			if ts.size() > 0: _badge(ci, Vector2(w - 9, 9), 10.0, str(ts[0]), tc, 3)
			_line(ci, _cut(r.grow(-0.5), K42), Color(Q("pan").lightened(0.2), 0.8 * fa), 1.0)
		2:   # one hand pixel: flat pigment, 2 px black outline, hard shadow, 1 px pixel text outline
			ci.draw_polygon(_cut(r.grow(-2.0), K42), PackedColorArray([Q("well")]))
			_pic(ci, tex, Rect2(4, 5, w - 8, h - bh - 6))
			var bar := rc.lerp(Color(0.45, 0.45, 0.45), 0.25).darkened(0.15)
			ci.draw_rect(Rect2(2, h - bh, w - 4, bh - 2), Color(bar, 1.0 if not cant else 0.6))
			ci.draw_rect(Rect2(2, h - bh - 1, w - 4, 2), Color(0.02, 0.02, 0.03))
			_txt(ci, fb, Vector2(5, h - 5), nm, 9, Color.WHITE, 2, Color(0.02, 0.02, 0.03))
			_txt(ci, fd, Vector2(w - 5 - pw, h - 4), ps, 11, Color("#ff5a4a") if cant else Color("#fff3c8"), 2, Color(0.02, 0.02, 0.03))
			_coin(ci, Vector2(w - 6 - pw - 11, h - bh + 4), 1.5)
			_stats42(ci, fb, 4, 4, hp, atk, 2)
			if ts.size() > 0: _badge(ci, Vector2(w - 10, 10), 9.0, str(ts[0]), tc, 2)
			_line(ci, _cut(r.grow(-1.0), K42), Color(0.02, 0.02, 0.03, fa), 2.0)
		3:   # thin panels: no frame, creature on a 2 px tier rule, text on a soft dark patch
			var ly := h - 19.0
			for i in 10:
				ci.draw_rect(Rect2(0, ly - 30 + i * 3, w, 3), Color(0.02, 0.02, 0.02, 0.05 * i))
			ci.draw_rect(Rect2(0, ly, w, h - ly), Color(0.02, 0.02, 0.02, 0.60))
			_pic(ci, tex, Rect2(6, 4, w - 12, ly - 4))
			ci.draw_rect(Rect2(4, ly, w - 8, 2), Color(rc, fa))
			if ts.size() > 0: _badge(ci, Vector2(10, ly + 10), 9.0, str(ts[0]), tc, 3)
			_txt(ci, fb, Vector2(17, h - 4), nm, 9, Color("#f4efe6"), 0, Color.BLACK)
			_txt(ci, fd, Vector2(w - 6 - pw, h - 4), ps, 11, pc, 0, Color.BLACK)
			_coin(ci, Vector2(w - 7 - pw - 11, ly + 5), 1.5)
			_stats42(ci, fb, 3, 3, hp, atk, 0)
		4:   # shop band: creatures stand on the band, name + price on one dark patch under the floor shadow
			var ty := h - 24.0
			ci.draw_set_transform(Vector2(w * 0.5, ty - 2), 0.0, Vector2(1.0, 0.22))
			ci.draw_circle(Vector2.ZERO, w * 0.32, Color(0, 0, 0, 0.5), true, -1.0, true)
			ci.draw_set_transform(Vector2.ZERO)
			_pic(ci, tex, Rect2(6, 4, w - 12, ty - 4))
			ci.draw_polygon(_cut(Rect2(3, ty + 1, w - 6, 22), KS42), PackedColorArray([Color(0.02, 0.02, 0.02, 0.55)]))
			ci.draw_rect(Rect2(3 + KS42, ty + 1, w - 6 - KS42, 1), Color(rc, fa))
			var nw := fb.get_string_size(nm, HORIZONTAL_ALIGNMENT_LEFT, -1, 9).x
			var x0 := roundf((w - nw - 10) * 0.5)
			if ts.size() > 0: _badge(ci, Vector2(x0 + 3, ty + 6.5), 8.0, str(ts[0]), tc, 3)
			_txt(ci, fb, Vector2(x0 + 10, ty + 10), nm, 9, Color("#f4efe6"), 0, Color.BLACK)
			var pw2 := fd.get_string_size(ps, HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x
			var cx := roundf((w - pw2 - 12) * 0.5)
			_coin(ci, Vector2(cx, ty + 12), 1.5)
			_txt(ci, fd, Vector2(cx + 12, ty + 21), ps, 10, pc, 0, Color.BLACK)
			_stats42(ci, fb, 3, 3, hp, atk, 0)
	if owned: ci.draw_rect(Rect2(w - 8, h - bh - 8, 4, 4), Color("#f2c14e"))
