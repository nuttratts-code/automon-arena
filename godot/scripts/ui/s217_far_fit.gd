extends Node3D
# SET 217 SAMPLE ONLY (ui-preview R6 — never merge to main as is).
# Keeps the far paintings fitted to whatever camera is on: every frame the Sky card fills the whole view at SKY_D, and the
# Hills card (true shape, screen-wide) stands at HILLS_D with its bottom just under the line where the view meets the ground.
# Works for any camera pitch, so the owner can compare angles without moving cards by hand.

const SKY_D := 60.0
const HILLS_D := 40.0
const GROUND_Y := -0.15

func _process(_d: float) -> void:
	var cam := get_viewport().get_camera_3d()
	if cam == null:
		return
	var b := cam.global_transform.basis
	var pos := cam.global_position
	var vp := get_viewport().get_visible_rect().size
	var aspect := vp.x / maxf(vp.y, 1.0)
	var t := tan(deg_to_rad(cam.fov / 2.0))
	var fwd := -b.z
	var pitch := asin(clampf(-fwd.y, -1.0, 1.0))
	var sky := get_node_or_null("Sky") as Sprite3D
	if sky != null and sky.texture != null:
		var hh := SKY_D * t
		var ts := sky.texture.get_size()
		sky.pixel_size = maxf(2.0 * hh * aspect * 1.05 / ts.x, 2.0 * hh * 1.05 / ts.y)
		sky.global_transform = Transform3D(b, pos + fwd * SKY_D)
	var hills := get_node_or_null("Hills") as Sprite3D
	if hills != null and hills.texture != null:
		var hh := HILLS_D * t
		var ts := hills.texture.get_size()
		hills.pixel_size = 2.0 * hh * aspect * 1.05 / ts.x
		var h := ts.y * hills.pixel_size
		var ground_u := (HILLS_D * sin(pitch) - (pos.y - GROUND_Y)) / cos(pitch) # where this card plane meets the ground
		var bottom := ground_u - 0.04 * hh
		hills.global_transform = Transform3D(b, pos + fwd * HILLS_D + b.y * (bottom + h / 2.0))
