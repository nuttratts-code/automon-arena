# Set 196 (7a): a tribe shape (web .shape .s-*: square r7 · triangle · diamond · circle · hexagon · pentagon), filled with a colour token.
extends Control

const TH := preload("res://scripts/ui/theme.gd")
const POLY := {
	"triangle": [[0.5, 0.04], [0.97, 0.94], [0.03, 0.94]],
	"diamond": [[0.5, 0.0], [1.0, 0.5], [0.5, 1.0], [0.0, 0.5]],
	"hexagon": [[0.25, 0.06], [0.75, 0.06], [1.0, 0.5], [0.75, 0.94], [0.25, 0.94], [0.0, 0.5]],
	"pentagon": [[0.5, 0.0], [1.0, 0.38], [0.81, 1.0], [0.19, 1.0], [0.0, 0.38]],
}

var kind := "square"
var token := "t-steel"

static func make(k: String, tok: String, px: float) -> Control:
	var s: Control = load("res://scripts/ui/shape.gd").new()
	s.kind = k
	s.token = tok
	s.custom_minimum_size = Vector2(px, px)
	s.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return s

func _draw() -> void:
	var col := TH.c(token)
	var w := size.x
	var h := size.y
	if kind == "circle":
		draw_circle(Vector2(w, h) / 2.0, minf(w, h) / 2.0, col, true, -1.0, true)
	elif POLY.has(kind):
		var pts := PackedVector2Array()
		for p in POLY[kind]:
			pts.append(Vector2(p[0] * w, p[1] * h))
		draw_colored_polygon(pts, col)
	else:
		draw_style_box(TH.box(col, col, int(round(w * 7.0 / 40.0)), 0), Rect2(Vector2.ZERO, size))
