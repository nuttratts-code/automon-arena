# set 268 round 28d — owner picks after R28c: D1 (every gap widens, empty ones too) · E3 (the whole line zooms evenly +
# drag sideways to see what went past the end) · F1 (one gap = 0.1 s).
# Tap a stack = open all: the line zooms by what the biggest stack needs, anchored so the tapped spot stays under the finger;
# drag left/right while open = scroll (clamped: start .. end of the zoomed line); things scrolled left of the act point hide.
# A press that moves < 6 px = tap (tap again = close). Env S268ALL=1 (stills): opened, anchored on the biggest stack;
# env S268SCROLL=<px> adds to that anchor. usage: python s268r28d-patch-drag.py <g268>   (after s268r28c)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()

def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)

if "s268r28d" not in s:
    rep('''func _gui_input(ev: InputEvent) -> void: # s268r26: tap a stack = open / close it
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		var hit := ""
		for sr in _stk:
			if (sr[0] as Rect2).has_point(ev.position): hit = str(sr[1])
		_open = "" if hit == _open else hit
		_all = (not _all) if hit != "" else false # s268r28
		accept_event()''', '''var _scroll := 0.0   # s268r28d: px scrolled while open
var _press := Vector2.ZERO
var _drag := false
var _dragged := false # the owner moved it (stills stop re-anchoring)

func _clamp_scroll() -> void:
	_scroll = clampf(_scroll, 0.0, maxf(0.0, (size.x - 34.0) * (_zoom - 1.0) + (OPEN_GAP * 6.0 if _zoom > 1.0 else 0.0)))

func _gui_input(ev: InputEvent) -> void: # s268r26: tap a stack = open / close it · s268r28d: tap on release, drag = scroll
	if ev is InputEventMouseButton and ev.button_index == MOUSE_BUTTON_LEFT:
		if ev.pressed:
			_press = ev.position; _drag = false
		else:
			if not _drag:
				var hit := ""
				for sr in _stk:
					if (sr[0] as Rect2).has_point(ev.position): hit = str(sr[1])
				var was := _all
				_all = (not _all) if hit != "" else false # s268r28
				_open = ""
				if _all and not was: # anchor: the tapped spot stays under the finger
					_scroll = (ev.position.x - 26.0) * (_zoom - 1.0); _clamp_scroll()
			_drag = false
		accept_event()
	elif ev is InputEventMouseMotion and (ev.button_mask & MOUSE_BUTTON_MASK_LEFT) != 0:
		if not _drag and absf(ev.position.x - _press.x) > 6.0: _drag = true
		if _drag and _all:
			_scroll -= ev.relative.x; _dragged = true; _clamp_scroll()
		accept_event()''')
    rep('		if _all: return x0 + (x - x0) * _zoom # s268r28c: every gap widens evenly',
        '		if _all: return x0 + (x - x0) * _zoom - _scroll # s268r28c: every gap widens evenly · r28d: minus the scroll')
    rep('		if tx > x1 + 0.5: continue # s268r28c: pushed past the end',
        '		if tx > x1 + 0.5 or (_all and _scroll > 0.5 and tx < x0 + 30.0): continue # s268r28c: pushed past the end · r28d: scrolled behind the act point')
    rep('		if lx > x1: continue # s268r28c: pushed past the end',
        '		if lx > x1 or (_all and _scroll > 0.5 and lx < x0 + 24.0): continue # s268r28c / r28d')
    rep('''		for kd in _need: _zoom = maxf(_zoom, float(_need[kd]) / stp0)''',
        '''		for kd in _need: _zoom = maxf(_zoom, float(_need[kd]) / stp0)
		if OS.get_environment("S268ALL") == "1" and not _dragged and groups.has(big): # s268r28d stills: anchor on the biggest stack
			_scroll = float(int(str(big).split(":")[1])) * stp0 * (_zoom - 1.0) + float(OS.get_environment("S268SCROLL"))
		_clamp_scroll()''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
