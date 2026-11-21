# set 268 round 34c — cooldown-change test: env S268RN = own runes as compact JSON (e.g. [{"id":"C8","n":1}]) for the
# S268FIGHT sample fight, and a print of every cooldown-changing event (freeze / stun / cdSlowPct / cdPct / cdCut buffs)
# with its time, so a still can be shot right after one. usage: python s268r34c-patch-cdteam.py <g268>   (after s268r34b)
import os, sys
p = os.path.join(sys.argv[1], "tests", "s239_prep.gd")
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)
if "s268r34c" not in s:
    rep('''		var ps: Dictionary = app.player_side(ta, [], 0.0)''', '''		var rn34: Array = JSON.parse_string(OS.get_environment("S268RN")) if OS.get_environment("S268RN") != "" else [] # s268r34c
		var ps: Dictionary = app.player_side(ta, rn34, 0.0)''')
    rep('''		print("S268FIGHT winner ", res["winner"], " timeMs ", res["timeMs"])''', '''		print("S268FIGHT winner ", res["winner"], " timeMs ", res["timeMs"])
		for ev in res.get("events", res.get("log", [])): # s268r34c: cooldown-changing moments
			var ek := str(ev.get("k", ev.get("type", "")))
			var bk := str(ev.get("what", ""))
			if ek in ["cdCut"] or bk in ["freeze", "stun", "cdSlowPct", "cdPct"]:
				print("S268CD t=", ev.get("t"), " ", ek, " ", bk, " ", JSON.stringify(ev).substr(0, 140))''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
