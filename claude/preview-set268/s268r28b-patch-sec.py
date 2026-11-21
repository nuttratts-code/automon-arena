# set 268 round 28b — owner: "40 too wide, use 10; and try one gap = 0.1 s".
# Env S268OGAP = opened spacing (default 10, was 40) · env S268SEC = seconds per gap (e.g. 0.1): a portrait sits on the dot
# of its REAL time left (ceil to the dot; 0.1 s = one fight tick, so a shared dot = acting in the same tick); the line shows
# 14 gaps = 1.4 s ahead; units with more time left are hidden and fade in at the right end.
# usage: python s268r28b-patch-sec.py <g268>   (after s268r28)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()

def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)

if "s268r28b" not in s:
    rep('const OPEN_GAP := 40.0\n',
        'var OPEN_GAP := float(OS.get_environment("S268OGAP")) if OS.get_environment("S268OGAP") != "" else 10.0 # s268r28b (owner: 10)\n')
    rep('''		var f := clampf((clock - last) / cd, 0.0, 1.0)
''', '''		var f := clampf((clock - last) / cd, 0.0, 1.0)
		var sec := float(OS.get_environment("S268SEC")) # s268r28b: one gap = sec seconds of real time left
		if sec > 0.0:
			var rem := maxf(0.0, cd - (clock - last))
			var win := sec * 1000.0 * 14.0
			f = 0.0 if rem > win else clampf(1.0 - (rem / win) * (x1 - x0) / (x1 - 14.0 - x0), 0.0001, 1.0)
''')
    rep('''		for it in items:
			var lx0 := lerpf(x1 - 14.0, x0, float(it[0]))''', '''		for it in items:
			if float(it[0]) <= 0.0: # s268r28b: beyond the window = hidden, no stack
				thide[int(it[1]["uid"])] = true
				continue
			var lx0 := lerpf(x1 - 14.0, x0, float(it[0]))''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
