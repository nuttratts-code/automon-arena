# set 268 round 27 — owner: "when a stack is opened, widen that part of the bar too".
# The gap after the opened dot grows to fit the opened stack; the dots + portraits right of it squeeze into the rest of the
# line (left part unchanged). Uses the opened stack's size from the previous frame (one-frame lag, invisible).
# usage: python s268r27-patch-widen.py <g268>   (after s268r26)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()

def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)

if "s268r27" not in s:
    rep('var _open := ""     # key of the opened stack\n',
        'var _open := ""     # key of the opened stack\nvar _ok := -1       # s268r27: dot index of the opened stack\nvar _ow := 0.0      # width it needs (px)\n')
    rep("	var x1 := w - 8.0\n", '''	var x1 := w - 8.0
	var stp0 := (x1 - x0) / 14.0 # s268r27: widen the gap of the opened stack, squeeze the rest
	var remap := func(x: float) -> float:
		if _ok < 0 or _ow <= stp0: return x
		var a := x0 + float(_ok) * stp0
		var b := a + stp0
		var b2 := minf(a + _ow, x1 - 20.0)
		if x <= a: return x
		if x <= b: return a + (x - a) * (b2 - a) / stp0
		return b2 + (x - b) * (x1 - b2) / maxf(1.0, x1 - b)
''')
    rep("		var tx := x0 + (x1 - x0) * float(i) / float(n)\n",
        "		var tx: float = remap.call(x0 + (x1 - x0) * float(i) / float(n))\n")
    rep("				tpos[int(g[i][1][\"uid\"])] = x0 + float(kk) * stp + gap * float(i)\n",
        "				tpos[int(g[i][1][\"uid\"])] = float(remap.call(x0 + float(kk) * stp)) + gap * float(i)\n")
    rep("				var xa := x0 + float(kk) * stp - 22.0\n",
        "				var xa: float = float(remap.call(x0 + float(kk) * stp)) - 22.0\n")
    rep("		# draw order: foes first, own last (own on top)",
        '''		_ok = -1 # s268r27: remember the opened stack for the next frame
		if groups.has(_open) and (groups[_open] as Array).size() > 1:
			_ok = int(_open.split(":")[1])
			_ow = 34.0 * float((groups[_open] as Array).size() - 1) + 40.0
		# draw order: foes first, own last (own on top)''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
