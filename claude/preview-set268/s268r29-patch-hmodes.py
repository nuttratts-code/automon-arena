# set 268 round 29 — owner: "the bar still is not pretty; research other techniques; make a sample of each; our fight is
# fast (seconds)". Env S268H picks a mode instead of the long timeline bar:
#  1 = ground ring: a thin arc around each unit's feet fills with its cooldown (side colour); the last 0.4 s it turns
#      bright + thick and pulses (= "about to act", readable from the corner of the eye at fight speed)
#  2 = portrait rows: own 6 top-left, foe 6 top-right, fixed slots; a clock-wipe shade shows the time left; last 0.4 s glow
#  3 = next-up queue: act point at the left + the next 5 units in order as small heads (smooth slide), seconds under each;
#      units acting in the same 0.1 s tick share one bracket marked "พร้อมกัน"
#  4 = 1 + 3
# Display only (same cd / lastAct data as the bar). usage: python s268r29-patch-hmodes.py <g268>   (after s268r28e2)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()

def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)

HCODE = r'''
# ---- s268r29: H modes ------------------------------------------------------------------------------------------
var _qx := {}   # uid -> smoothed x of the queue head
const READY_S := 0.4

func _rows() -> Array: # [uid, side, rem s, cd s] of living units
	var out := []
	if view == null: return out
	var clock: float = float(view.clock)
	for v in view.units.values():
		if v.get("down") == true or float(v["hp"]) <= 0.0: continue
		var cd := _cd_of(v)
		if cd <= 0.0: continue
		var rem := maxf(0.0, cd - (clock - float(v.get("lastAct", 0.0)))) / 1000.0
		out.append([int(v["uid"]), int(v["side"]), rem, cd / 1000.0])
	return out

func _feet_px(uid: int) -> Variant: # screen point of the unit's shadow centre in this control's space
	if stage == null: return null
	var gb: Dictionary = stage.groups.get("battle", {})
	var key: Variant = uid if gb.has(uid) else float(uid)
	if not gb.has(key): return null
	var sh: Variant = gb[key].get("shadow")
	if not (sh is Node3D) or not (sh as Node3D).is_visible_in_tree(): return null
	var cam := get_viewport().get_camera_3d()
	if cam == null: return null
	var g := (sh as Node3D).global_position
	if cam.is_position_behind(g): return null
	var inv := get_global_transform_with_canvas().affine_inverse()
	var pts := PackedVector2Array()
	for i in 33:
		var a := TAU * float(i) / 32.0 - PI * 0.5
		pts.append(inv * cam.unproject_position(g + Vector3(cos(a) * 0.62, 0.0, sin(a) * 0.40)))
	return pts

func _draw_rings(rows: Array) -> void:
	var tsec := float(Time.get_ticks_msec()) / 1000.0
	for r in rows:
		var pts: Variant = _feet_px(int(r[0]))
		if pts == null: continue
		var col := FOE_COL if int(r[1]) == 1 else OWN_COL
		var rem: float = r[2]
		var f := clampf(1.0 - rem / maxf(0.01, float(r[3])), 0.0, 1.0)
		var ring: PackedVector2Array = pts
		draw_polyline(ring, Color(0.06, 0.09, 0.13, 0.55), 5.0, true) # track
		var n := int(round(32.0 * f))
		if n >= 1:
			var arc := ring.slice(0, n + 1)
			if rem <= READY_S: # about to act: bright, thick, pulsing
				var pu := 0.5 + 0.5 * sin(tsec * 18.0)
				draw_polyline(ring, Color(col.lightened(0.45), 0.35 + 0.35 * pu), 9.0, true)
				draw_polyline(ring, Color(1, 1, 1, 0.95), 3.5, true)
			else:
				draw_polyline(arc, Color(col, 0.95), 3.5, true)

func _wipe(c: Vector2, r: float, frac: float, col: Color) -> void: # clock-wipe shade over a diamond (frac = part still to wait)
	if frac <= 0.0: return
	var pts := PackedVector2Array([c])
	var steps := maxi(2, int(ceil(48.0 * frac)))
	for i in steps + 1:
		var a := -PI * 0.5 + TAU * (1.0 - frac) + TAU * frac * float(i) / float(steps)
		var d := Vector2(cos(a), sin(a))
		var k := r / (absf(d.x) + absf(d.y)) # ray to the diamond edge
		pts.append(c + d * k)
	draw_colored_polygon(pts, col)

func _draw_rowsH2(rows: Array) -> void:
	var tsec := float(Time.get_ticks_msec()) / 1000.0
	var y := size.y * 0.5
	var r := 22.0
	var sp := 54.0
	var bysd := {0: [], 1: []}
	for rw in rows: bysd[int(rw[1])].append(rw)
	for sd in [0, 1]:
		var lst: Array = bysd[sd]
		lst.sort_custom(func(a, b): return int(a[0]) < int(b[0])) # fixed slot order
		for i in lst.size():
			var rw: Array = lst[i]
			var cx := (40.0 + sp * float(i)) if sd == 0 else (size.x - 100.0 - sp * float(i))
			var c := Vector2(cx, y)
			var col := FOE_COL if sd == 1 else OWN_COL
			var rem: float = rw[2]
			var ready := rem <= READY_S
			if ready:
				var pu := 0.5 + 0.5 * sin(tsec * 18.0)
				draw_colored_polygon(_diamond(c, r + 8.0), Color(col.lightened(0.4), 0.30 + 0.35 * pu))
			draw_colored_polygon(_diamond(c, r + 2.5), Color(1, 1, 1, 0.95) if ready else col)
			draw_colored_polygon(_diamond(c, r), Color(0.16, 0.22, 0.30))
			var ic: Texture2D = _icon(int(rw[0]))
			if ic != null:
				var s2 := 2.0 * r * ICON_K
				draw_texture_rect(ic, Rect2(c - Vector2(s2, s2) * 0.5, Vector2(s2, s2)), false)
			_wipe(c, r, clampf(rem / maxf(0.01, float(rw[3])), 0.0, 1.0), Color(0.04, 0.06, 0.10, 0.62))

func _draw_queue(rows: Array) -> void:
	var y := size.y * 0.5
	var x0 := 26.0
	var sorted := rows.duplicate()
	sorted.sort_custom(func(a, b): return float(a[2]) < float(b[2]) or (float(a[2]) == float(b[2]) and int(a[0]) < int(b[0])))
	var nq := mini(6, sorted.size())
	var bf := ThemeDB.fallback_font
	# act point (first in queue) = big diamond at the left
	var xs := x0 + 70.0
	var prev_tick := -1
	var gx0 := 0.0
	var groups := [] # [x start, x end, tick] of same-tick runs
	var placed := []
	for i in nq:
		var rw: Array = sorted[i]
		var tick := int(ceil(float(rw[2]) * 10.0 - 0.0001))
		if i > 0:
			xs += (40.0 if tick == prev_tick else 62.0)
		if tick != prev_tick:
			groups.append([xs, xs, tick])
		else:
			groups[groups.size() - 1][1] = xs
		prev_tick = tick
		placed.append([rw, xs])
	# same-tick brackets
	for g in groups:
		if float(g[1]) > float(g[0]):
			var a := float(g[0]) - 24.0; var b := float(g[1]) + 24.0
			draw_rect(Rect2(a, y - 30.0, b - a, 60.0), Color(1, 1, 1, 0.10), true)
			draw_polyline(PackedVector2Array([Vector2(a, y - 30.0), Vector2(b, y - 30.0)]), Color(1, 1, 1, 0.8), 1.5)
			draw_string_outline(bf, Vector2(a + 4.0, y - 34.0), "พร้อมกัน", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, 4, Color(0.09, 0.13, 0.16, 0.9))
			draw_string(bf, Vector2(a + 4.0, y - 34.0), "พร้อมกัน", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color(1, 1, 1))
	var dt := clampf(get_process_delta_time() * 12.0, 0.0, 1.0)
	var seen := {}
	for pr in placed:
		var rw: Array = pr[0]
		var u := int(rw[0])
		seen[u] = true
		var tx: float = pr[1]
		_qx[u] = lerpf(float(_qx.get(u, size.x * 0.5)), tx, dt) # smooth slide
		var c := Vector2(float(_qx[u]), y)
		var r := 20.0
		var col := FOE_COL if int(rw[1]) == 1 else OWN_COL
		draw_colored_polygon(_diamond(c, r + 2.5), col)
		draw_colored_polygon(_diamond(c, r), Color(0.16, 0.22, 0.30))
		var ic: Texture2D = _icon(u)
		if ic != null:
			var s2 := 2.0 * r * ICON_K
			draw_texture_rect(ic, Rect2(c - Vector2(s2, s2) * 0.5, Vector2(s2, s2)), false)
		var tt := "%.1f" % float(rw[2])
		draw_string_outline(bf, c + Vector2(-12.0, r + 18.0), tt, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, 4, Color(0.09, 0.13, 0.16, 0.9))
		draw_string(bf, c + Vector2(-12.0, r + 18.0), tt, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color(1, 1, 1))
	for k in _qx.keys():
		if not seen.has(k): _qx.erase(k)
'''

if "s268r29" not in s:
    s = s.rstrip("\n") + "\n" + HCODE
    rep('''func _draw() -> void:
''', '''func _draw() -> void:
	var hm := OS.get_environment("S268H") # s268r29: other techniques instead of the long bar
	if hm != "":
		var rows := _rows()
		if hm == "1" or hm == "4": _draw_rings(rows)
		if hm == "2": _draw_rowsH2(rows)
		if hm == "3" or hm == "4": _draw_queue(rows)
		return
''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
