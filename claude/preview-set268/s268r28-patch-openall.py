# set 268 round 28 — owner after R27: "keep the look; one tap opens EVERY stack at once; design for all 6 having the same cooldown".
# B2: opened portraits 40 px apart. Each dot whose stack is open widens the gap after it to fit the widest side there
# (own above / foe below share the gap); the other gaps share what is left (min 8 px); if even that does not fit,
# the opened gaps shrink together. One tap on any stack opens all, a second tap anywhere on the bar closes all.
# Env S268ALL=1 starts opened (stills). usage: python s268r28-patch-openall.py <g268>   (after s268r27)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()

def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)

if "s268r28" not in s:
    rep('var _ow := 0.0      # width it needs (px)\n',
        'var _ow := 0.0      # width it needs (px)\nvar _all := false   # s268r28: every stack opened\nvar _need := {}      # s268r28: dot index -> gap width it needs (previous frame)\nconst OPEN_GAP := 40.0\n')
    # tap: any stack toggles all; a tap on empty bar closes
    rep('''		_open = "" if hit == _open else hit
		accept_event()''', '''		_open = "" if hit == _open else hit
		_all = (not _all) if hit != "" else false # s268r28
		accept_event()''')
    rep('''	var remap := func(x: float) -> float:
		if _ok < 0 or _ow <= stp0: return x''', '''	var segs := [] # s268r28: [orig start, new start, orig width, new width] per gap
	if _all and not _need.is_empty():
		var L := x1 - x0
		var wide := 0.0; var nrest := 0
		for k in 14:
			if float(_need.get(k, 0.0)) > stp0: wide += float(_need[k])
			else: nrest += 1
		var rest := maxf(8.0 * float(nrest), L - wide)
		var ks := (L - rest) / maxf(1.0, wide) # < 1 when the opened gaps must shrink
		var nx := x0
		for k in 14:
			var nw: float = float(_need[k]) * ks if float(_need.get(k, 0.0)) > stp0 else rest / maxf(1.0, float(nrest))
			segs.append([x0 + float(k) * stp0, nx, stp0, nw])
			nx += nw
	var remap := func(x: float) -> float:
		if not segs.is_empty():
			var kq := clampi(int(floor((x - x0) / stp0)), 0, 13)
			if x >= x1: kq = 13
			var sg: Array = segs[kq]
			return float(sg[1]) + (x - float(sg[0])) * float(sg[3]) / float(sg[2])
		if _ok < 0 or _ow <= stp0: return x''')
    rep('''		if OS.get_environment("S268EXP") == "1" and (groups.get(big, []) as Array).size() > 1: _open = big''',
        '''		if OS.get_environment("S268EXP") == "1" and (groups.get(big, []) as Array).size() > 1: _open = big
		if OS.get_environment("S268ALL") == "1": _all = true
		if _all: _open = "" # s268r28: the one-stack mode is off while all are open''')
    rep('''			var gap := 34.0 if key == _open else 12.0''',
        '''			var gap := OPEN_GAP if (_all or key == _open) else 12.0 # s268r28: 40 px (owner B2)''')
    rep('''		_ok = -1 # s268r27: remember the opened stack for the next frame''',
        '''		_need = {} # s268r28: width each dot needs when all are open (widest side wins)
		for key in groups:
			var gn := (groups[key] as Array).size()
			if gn > 1:
				var kd := int(str(key).split(":")[1])
				_need[kd] = maxf(float(_need.get(kd, 0.0)), OPEN_GAP * float(gn - 1) + 40.0)
		_ok = -1 # s268r27: remember the opened stack for the next frame''')
    rep('''			_ow = 34.0 * float((groups[_open] as Array).size() - 1) + 40.0''',
        '''			_ow = OPEN_GAP * float((groups[_open] as Array).size() - 1) + 40.0''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
