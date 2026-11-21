# set 268 round 28e — owner after the r28d live window: "0.7 s is too fast to follow" -> research -> pick G1: uneven gaps.
# Env S268SECS = seconds per gap from the act point outward (e.g. 0.1,0.1,0.2,0.4,0.8,1.6,3.2 = 6.4 s): near the act point
# a gap is still one 0.1 s tick (same dot = same tick), farther gaps hold more time, so every unit stays on the line for its
# whole cooldown. Number of gaps = list length (overrides S268STP). More time left than the list = parked at the right end
# (faded, as before). usage: python s268r28e-patch-uneven.py <g268>   (after s268r28d)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()

def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)

if "s268r28e" not in s:
    rep('''	if OS.get_environment("S268STP") != "": ng = maxi(2, int(floor((x1 - x0) / float(OS.get_environment("S268STP")))))''',
        '''	if OS.get_environment("S268STP") != "": ng = maxi(2, int(floor((x1 - x0) / float(OS.get_environment("S268STP")))))
	var secs := PackedFloat64Array() # s268r28e: uneven gaps
	for t in OS.get_environment("S268SECS").split(",", false): secs.append(float(t))
	if secs.size() >= 2: ng = secs.size()''')
    rep('''		var sec := float(OS.get_environment("S268SEC")) # s268r28b: one gap = sec seconds of real time left
		if sec > 0.0:''', '''		var sec := float(OS.get_environment("S268SEC")) # s268r28b: one gap = sec seconds of real time left
		if secs.size() >= 2: # s268r28e: walk the uneven gaps
			var rem2 := maxf(0.0, cd - (clock - last)) / 1000.0
			var gpos := float(ng)
			var t0 := 0.0
			for k in secs.size():
				if rem2 <= t0 + secs[k]:
					gpos = float(k) + (rem2 - t0) / secs[k]
					break
				t0 += secs[k]
			var lxe := x0 + gpos * (x1 - x0) / float(ng)
			f = clampf(1.0 - (lxe - x0) / (x1 - 14.0 - x0), 0.0001, 1.0)
		elif sec > 0.0:''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
