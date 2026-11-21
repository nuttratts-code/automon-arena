# set 268 round 30 — owner after R29: "ground ring -> a long horizontal bar instead · keep the short queue, but same-time units
# overlap like before and open when tapped · no numbers: the frame colour is the countdown · the leftmost one gets a double
# frame (it acts first)". Env S268H=5:
#  - cooldown bar under each unit's feet (projected from the shadow centre): dark track, side colour fills left -> right,
#    last 0.4 s = white + pulsing glow
#  - next-up queue (next 6): units in the same 0.1 s tick overlap 12 px (first to act on top); tap a stack = every stack
#    opens (frames 4 px apart), tap again = close; heads slide smoothly
#  - each queue frame = countdown: the side colour runs round the diamond (clockwise from the top) as the cooldown fills,
#    white + pulse in the last 0.4 s · first in the queue = double frame
# usage: python s268r30-patch-barsqueue.py <g268>   (after s268r29)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()

def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)

CODE = r'''
# ---- s268r30: H5 = feet bars + queue with stacks / frame countdown -------------------------------------------------
func _feet_c(uid: int) -> Variant:
	var pts: Variant = _feet_px(uid)
	if pts == null: return null
	var a: PackedVector2Array = pts
	var mn := a[0]; var mx := a[0]
	for q in a:
		mn = Vector2(minf(mn.x, q.x), minf(mn.y, q.y)); mx = Vector2(maxf(mx.x, q.x), maxf(mx.y, q.y))
	return [(mn + mx) * 0.5, mx.x - mn.x]

func _draw_bars(rows: Array) -> void:
	var tsec := float(Time.get_ticks_msec()) / 1000.0
	for r in rows:
		var fc: Variant = _feet_c(int(r[0]))
		if fc == null: continue
		var c: Vector2 = fc[0]
		var w := maxf(40.0, float(fc[1]) * 0.9)
		var h := 6.0
		var rect := Rect2(c.x - w * 0.5, c.y + 8.0, w, h)
		var col := FOE_COL if int(r[1]) == 1 else OWN_COL
		var rem: float = r[2]
		var f := clampf(1.0 - rem / maxf(0.01, float(r[3])), 0.0, 1.0)
		draw_rect(rect.grow(1.5), Color(0.06, 0.09, 0.13, 0.75), true)
		if rem <= READY_S:
			var pu := 0.5 + 0.5 * sin(tsec * 18.0)
			draw_rect(rect.grow(4.0), Color(col.lightened(0.45), 0.25 + 0.35 * pu), true)
			draw_rect(rect, Color(1, 1, 1, 0.97), true)
		else:
			draw_rect(Rect2(rect.position, Vector2(w * f, h)), Color(col, 0.97), true)

func _diamond_path(c: Vector2, r: float, frac: float) -> PackedVector2Array: # outline from the top, clockwise, frac of it
	var corners := [c + Vector2(0, -r), c + Vector2(r, 0), c + Vector2(0, r), c + Vector2(-r, 0), c + Vector2(0, -r)]
	var out := PackedVector2Array([corners[0]])
	var left := clampf(frac, 0.0, 1.0) * 4.0
	for i in 4:
		if left <= 0.0: break
		var t := minf(1.0, left)
		out.append((corners[i] as Vector2).lerp(corners[i + 1], t))
		left -= 1.0
	return out

func _draw_queue2(rows: Array) -> void:
	var tsec := float(Time.get_ticks_msec()) / 1000.0
	var y := size.y * 0.5
	var sorted := rows.duplicate()
	sorted.sort_custom(func(a, b): return float(a[2]) < float(b[2]) or (float(a[2]) == float(b[2]) and int(a[0]) < int(b[0])))
	var nq := mini(6, sorted.size())
	var r := 20.0
	var gin := 47.0 if _all else 12.0 # inside a stack: opened = frames 4 px apart (diamond 2*(r+2.5) = 45)
	var xs := 70.0
	var prev_tick := -1
	var placed := [] # [row, x, index in its stack, stack size]
	var stacks := [] # [x start, x end, tick, count]
	for i in nq:
		var rw: Array = sorted[i]
		var tick := int(ceil(float(rw[2]) * 10.0 - 0.0001))
		if i > 0: xs += (gin if tick == prev_tick else 60.0)
		if tick != prev_tick: stacks.append([xs, xs, tick, 1])
		else:
			stacks[stacks.size() - 1][1] = xs
			stacks[stacks.size() - 1][3] = int(stacks[stacks.size() - 1][3]) + 1
		prev_tick = tick
		placed.append([rw, xs])
	_stk = []
	for st in stacks:
		if int(st[3]) > 1:
			_stk.append([Rect2(float(st[0]) - 26.0, y - 26.0, float(st[1]) - float(st[0]) + 52.0, 52.0), "q:%d" % int(st[2])])
	var dt := clampf(get_process_delta_time() * 12.0, 0.0, 1.0)
	var seen := {}
	# draw right to left so the one acting first (left, and first inside a stack) ends up on top
	for i in range(placed.size() - 1, -1, -1):
		var rw: Array = placed[i][0]
		var u := int(rw[0])
		seen[u] = true
		_qx[u] = lerpf(float(_qx.get(u, size.x * 0.5)), float(placed[i][1]), dt)
		var c := Vector2(float(_qx[u]), y)
		var col := FOE_COL if int(rw[1]) == 1 else OWN_COL
		var rem: float = rw[2]
		var f := clampf(1.0 - rem / maxf(0.01, float(rw[3])), 0.0, 1.0)
		var ready := rem <= READY_S
		var pu := 0.5 + 0.5 * sin(tsec * 18.0)
		if i == 0: # first to act: double frame
			draw_colored_polygon(_diamond(c, r + 8.5), Color(0.08, 0.12, 0.19, 0.9))
			draw_polyline(_diamond(c, r + 8.0) + PackedVector2Array([c + Vector2(0, -r - 8.0)]), Color(1, 1, 1, 0.95), 2.0)
		if ready:
			draw_colored_polygon(_diamond(c, r + 6.0), Color(col.lightened(0.45), 0.25 + 0.35 * pu))
		draw_colored_polygon(_diamond(c, r + 3.5), Color(0.06, 0.09, 0.13, 0.95)) # frame track
		draw_colored_polygon(_diamond(c, r), Color(0.16, 0.22, 0.30))
		var ic: Texture2D = _icon(u)
		if ic != null:
			var s2 := 2.0 * r * ICON_K
			draw_texture_rect(ic, Rect2(c - Vector2(s2, s2) * 0.5, Vector2(s2, s2)), false)
		var fr := _diamond_path(c, r + 1.75, 1.0 if ready else f)
		if fr.size() > 1:
			draw_polyline(fr, Color(1, 1, 1, 0.97) if ready else col, 3.5)
	for k in _qx.keys():
		if not seen.has(k): _qx.erase(k)
'''

if "s268r30" not in s:
    s = s.rstrip("\n") + "\n" + CODE
    rep('''		if hm == "3" or hm == "4": _draw_queue(rows)''',
        '''		if hm == "3" or hm == "4": _draw_queue(rows)
		if hm == "5": # s268r30
			_draw_bars(rows)
			if OS.get_environment("S268ALL") == "1": _all = true
			_draw_queue2(rows)''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
