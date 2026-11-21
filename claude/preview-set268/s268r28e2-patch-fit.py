# set 268 round 28e2 — an opened stack near the right end was cut off: after the anchor, scroll just enough that the
# tapped (or, for stills, the biggest) stack fits before the line end. usage: python s268r28e2-patch-fit.py <g268> (after r28e)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)
if "s268r28e2" not in s:
    rep('var _dragged := false', 'var _dragged := false\nvar _fitk := "" # s268r28e2: stack to keep inside the line after opening')
    rep('''				if _all and not was: # anchor: the tapped spot stays under the finger''',
        '''				if _all and not was: # anchor: the tapped spot stays under the finger
					_fitk = hit; _dragged = false # s268r28e2''')
    rep('''		_clamp_scroll()
		_ok = -1''', '''		var fk := str(big) if OS.get_environment("S268ALL") == "1" else _fitk # s268r28e2: fit the opened stack
		if _all and not _dragged and groups.has(fk):
			var kf := int(fk.split(":")[1])
			_scroll = maxf(_scroll, float(kf) * stp0 * _zoom + OPEN_GAP * float((groups[fk] as Array).size()) - (x1 - x0))
		_clamp_scroll()
		_ok = -1''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
