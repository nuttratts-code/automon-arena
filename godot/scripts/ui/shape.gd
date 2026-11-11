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
	if kind == "reroll": # set 207 P3: the reroll icon = a circular arrow, drawn in code (no outside asset)
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
	elif kind == "circle":
		draw_circle(Vector2(w, h) / 2.0, minf(w, h) / 2.0, col, true, -1.0, true)
	elif POLY.has(kind):
		var pts := PackedVector2Array()
		for p in POLY[kind]:
			pts.append(Vector2(p[0] * w, p[1] * h))
		draw_colored_polygon(pts, col)
	else:
		draw_style_box(TH.box(col, col, int(round(w * 7.0 / 40.0)), 0), Rect2(Vector2.ZERO, size))
