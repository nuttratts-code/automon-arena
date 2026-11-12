# Set 196 (7a): a tribe shape (web .shape .s-*: square r7 · triangle · diamond · circle · hexagon · pentagon), filled with a colour token.
# Set 212: also small icons drawn in code (no outside asset): lock / unlock (shop padlock) · atk (sword) · hp (heart) · cd (clock).
extends Control

const TH := preload("res://scripts/ui/theme.gd")
const POLY := {
	"triangle": [[0.5, 0.04], [0.97, 0.94], [0.03, 0.94]],
	"diamond": [[0.5, 0.0], [1.0, 0.5], [0.5, 1.0], [0.0, 0.5]],
	"hexagon": [[0.25, 0.06], [0.75, 0.06], [1.0, 0.5], [0.75, 0.94], [0.25, 0.94], [0.0, 0.5]],
	"pentagon": [[0.5, 0.0], [1.0, 0.38], [0.81, 1.0], [0.19, 1.0], [0.0, 0.38]],
}

@export var kind := "square" # set 207: exported so the prep layout scene keeps it
@export var token := "t-steel"

static func make(k: String, tok: String, px: float) -> Control:
	var s: Control = load("res://scripts/ui/shape.gd").new()
	s.kind = k
	s.token = tok
	s.custom_minimum_size = Vector2(px, px)
	s.mouse_filter = Control.MOUSE_FILTER_IGNORE
	s.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST # pixel icons stay crisp
	return s

func _draw() -> void:
	var col := TH.c(token)
	var w := size.x
	var h := size.y
	if kind in ["atk", "hp", "cd"] and TH.uicon(kind) != null: # set 213 (R2): Kenney pixel icon (white fill, dark outline) tinted
		draw_texture_rect(TH.uicon(kind), Rect2(Vector2.ZERO, size), false, col)
	elif kind in ["lock", "unlock", "atk", "hp", "cd"]:
		_icon(col, w, h)
	elif kind == "reroll": # set 207 P3: the reroll icon = a circular arrow, drawn in code (no outside asset)
		var c := Vector2(w, h) / 2.0
		var r := minf(w, h) * 0.34
		var lw := maxf(1.5, minf(w, h) * 0.11)
		draw_arc(c, r, deg_to_rad(-50.0), deg_to_rad(240.0), 28, col, lw, true)
		var a := deg_to_rad(-50.0)
		var p := c + Vector2(cos(a), sin(a)) * r
		var d := Vector2(sin(a), -cos(a)) # travel direction at the arrow's head (angle decreasing)
		var n := Vector2(cos(a), sin(a))
		var s := minf(w, h) * 0.2
		draw_colored_polygon(PackedVector2Array([p + d * s, p + n * s * 0.9 - d * s * 0.2, p - n * s * 0.9 - d * s * 0.2]), col)
	elif kind == "circle": # set 213 (H1): tribe shapes lit from the top-left = darker edge + small highlight
		draw_circle(Vector2(w, h) / 2.0, minf(w, h) / 2.0, col, true, -1.0, true)
		draw_circle(Vector2(w, h) / 2.0, minf(w, h) / 2.0 - 0.75, col.darkened(0.45), false, 1.5, true)
		draw_circle(Vector2(w * 0.36, h * 0.32), minf(w, h) * 0.12, Color(1, 1, 1, 0.55), true, -1.0, true)
	elif POLY.has(kind):
		var pts := PackedVector2Array()
		for p in POLY[kind]:
			pts.append(Vector2(p[0] * w, p[1] * h))
		draw_colored_polygon(pts, col)
		var cl := pts.duplicate()
		cl.append(pts[0])
		draw_polyline(cl, col.darkened(0.45), 1.5, true)
		draw_circle(Vector2(w * 0.38, h * 0.38), minf(w, h) * 0.11, Color(1, 1, 1, 0.5), true, -1.0, true)
	else:
		draw_style_box(TH.box(col, col, int(round(w * 7.0 / 40.0)), 0, 12, 7, false), Rect2(Vector2.ZERO, size))

const EDGE := Color(0, 0, 0, 0.85) # dark outline so the icons read on any card colour

func _icon(col: Color, w: float, h: float) -> void:
	if kind == "lock" or kind == "unlock": # padlock in the middle ~60 % of the box (the box is the tap zone)
		var u := minf(w, h) * 0.6
		var o := (Vector2(w, h) - Vector2(u, u * 1.15)) / 2.0
		var body := Rect2(o + Vector2(0, u * 0.5), Vector2(u, u * 0.65))
		var c := Vector2(o.x + u / 2.0, body.position.y)
		var r := u * 0.32
		var cs := c + (Vector2.ZERO if kind == "lock" else Vector2(u * 0.28, -u * 0.12)) # open = shackle lifted aside
		draw_arc(cs, r, PI, TAU, 16, EDGE, maxf(3.0, u * 0.26))
		draw_arc(cs, r, PI, TAU, 16, col, maxf(1.5, u * 0.13))
		draw_rect(body.grow(1.5), EDGE)
		draw_rect(body, col)
		draw_circle(body.get_center(), u * 0.09, EDGE)
	elif kind == "atk": # sword: blade + guard
		var a := Vector2(w * 0.2, h * 0.8)
		var b := Vector2(w * 0.85, h * 0.15)
		var g1 := Vector2(w * 0.12, h * 0.52)
		var g2 := Vector2(w * 0.48, h * 0.88)
		for ln in [[a, b], [g1, g2]]:
			draw_line(ln[0], ln[1], EDGE, 3.5)
			draw_line(ln[0], ln[1], col, 1.8)
	elif kind == "hp": # heart curve
		var pts := PackedVector2Array()
		for i in 24:
			var t := TAU * float(i) / 24.0
			var x := 16.0 * pow(sin(t), 3)
			var y := -(13.0 * cos(t) - 5.0 * cos(2 * t) - 2.0 * cos(3 * t) - cos(4 * t))
			pts.append(Vector2(w / 2.0 + x * w / 36.0, h * 0.45 + y * h / 36.0))
		draw_colored_polygon(pts, col)
		pts.append(pts[0])
		draw_polyline(pts, EDGE, 1.0, true)
	else: # cd: clock face + hands
		var c := Vector2(w, h) / 2.0
		var r := minf(w, h) * 0.42
		draw_circle(c, r, EDGE)
		draw_circle(c, r - 1.2, col)
		draw_line(c, c + Vector2(0, -r * 0.65), EDGE, 1.4)
		draw_line(c, c + Vector2(r * 0.5, 0), EDGE, 1.4)
