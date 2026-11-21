# set 268 round 28c — owner: "dot spacing = whatever fits the 6-same-cooldown case; opened frames just a small gap apart, not
# overlapping; tapping open widens EVERY gap, even the empty ones".
# Env S268STP = closed dot spacing in units (a closed 6-stack = 5x12 + 32 = 92 -> 100); the number of gaps = what fits the line.
# Opened spacing default 36 (frame 32 + gap 4). Open-all = the whole line zooms out evenly by the factor the biggest stack
# needs; dots + portraits pushed past the right end are not drawn. S268SEC window = sec x gaps.
# usage: python s268r28c-patch-zoom.py <g268>   (after s268r28b)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()

def rep(a, b, cnt=1):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, cnt)

if "s268r28c" not in s:
    rep('else 10.0 # s268r28b (owner: 10)', 'else 36.0 # s268r28c (owner: frames a small gap apart)')
    rep('var _need := {}', 'var _zoom := 1.0     # s268r28c: open-all zoom of the whole line\nvar _need := {}')
    rep('	var stp0 := (x1 - x0) / 14.0', '''	var ng := 14 # s268r28c: number of gaps
	if OS.get_environment("S268STP") != "": ng = maxi(2, int(floor((x1 - x0) / float(OS.get_environment("S268STP")))))
	var stp0 := (x1 - x0) / float(ng)''')
    rep('''	var remap := func(x: float) -> float:
''', '''	var remap := func(x: float) -> float:
		if _all: return x0 + (x - x0) * _zoom # s268r28c: every gap widens evenly
''')
    rep('	var n := 14\n', '	var n := ng\n')
    rep('''		var tx: float = remap.call(x0 + (x1 - x0) * float(i) / float(n))
''', '''		var tx: float = remap.call(x0 + (x1 - x0) * float(i) / float(n))
		if tx > x1 + 0.5: continue # s268r28c: pushed past the end
''')
    rep('			var win := sec * 1000.0 * 14.0', '			var win := sec * 1000.0 * float(ng)')
    rep('		var stp := (x1 - x0) / 14.0\n', '		var stp := stp0\n')
    rep('''				_need[kd] = maxf(float(_need.get(kd, 0.0)), OPEN_GAP * float(gn - 1) + 40.0)''',
        '''				_need[kd] = maxf(float(_need.get(kd, 0.0)), OPEN_GAP * float(gn))''')
    rep('''		_ok = -1 # s268r27: remember the opened stack for the next frame''',
        '''		_zoom = 1.0 # s268r28c
		for kd in _need: _zoom = maxf(_zoom, float(_need[kd]) / stp0)
		_ok = -1 # s268r27: remember the opened stack for the next frame''')
    rep('''		if tpos.has(int(v["uid"])): lx = float(tpos[int(v["uid"])])
''', '''		if tpos.has(int(v["uid"])): lx = float(tpos[int(v["uid"])])
		if lx > x1: continue # s268r28c: pushed past the end
''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
