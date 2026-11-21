# set 268 round 25 — owner: "make samples of the different ways to compare" (portraits that share a cooldown sit on top of each other).
# Env S268TIE: a1 = nudge apart along the line (min gap 26 px, the one acting first on the left, ties by uid) ·
# a2 = keep the true spot, show the front portrait only + a "x3" count badge · a3 = fixed order slots (FFX style, 52 px apart).
# Empty = round 24 behaviour (true spot, stacked).
# usage: python s268r25-patch-ties.py <g268>   (after s268r24)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()
if "s268r25" not in s:
    a = "	items.sort_custom(func(a, b): return float(a[0]) < float(b[0]))   # nearest to acting drawn last (on top)\n"
    assert a in s
    s = s.replace(a, a + '''	var tie := OS.get_environment("S268TIE") # s268r25: ways to show portraits that share a spot
	var tpos := {}; var tbadge := {}; var thide := {}
	if tie != "":
		for sd in [0, 1]:
			var lst := items.filter(func(it): return int(it[1]["side"]) == sd)
			lst.sort_custom(func(a, b): return float(a[0]) > float(b[0]) or (float(a[0]) == float(b[0]) and int(a[1]["uid"]) < int(b[1]["uid"])))
			var prev := -1.0e9
			var lead := -1
			for i in lst.size():
				var it: Array = lst[i]
				var u := int(it[1]["uid"])
				var bx := lerpf(x1 - 14.0, x0, float(it[0]))
				if tie == "a1":
					bx = maxf(bx, prev + 26.0)
					prev = bx
				elif tie == "a2":
					if lead >= 0 and absf(bx - prev) < 14.0:
						thide[u] = true
						tbadge[lead] = int(tbadge.get(lead, 1)) + 1
						continue
					lead = u
					prev = bx
				elif tie == "a3":
					bx = x0 + 70.0 + 52.0 * float(i)
				tpos[u] = bx
''')
    a = "		var lx := lerpf(x1 - 14.0, x0, f)\n"
    assert a in s
    s = s.replace(a, a + '''		if thide.has(int(v["uid"])): continue # s268r25
		if tpos.has(int(v["uid"])): lx = float(tpos[int(v["uid"])])
''')
    a = '''			draw_texture_rect(ic, Rect2(c - Vector2(s2, s2) * 0.5, Vector2(s2, s2)), false, Color(1, 1, 1, ua))
			continue
'''
    assert a in s
    s = s.replace(a, '''			draw_texture_rect(ic, Rect2(c - Vector2(s2, s2) * 0.5, Vector2(s2, s2)), false, Color(1, 1, 1, ua))
			if tbadge.has(int(v["uid"])): # s268r25 a2: how many share this spot
				var bf := ThemeDB.fallback_font
				var bt := "x%d" % int(tbadge[int(v["uid"])])
				var bp := c + Vector2(r * 0.55, (r + 4.0) if foe else (-r + 2.0))
				draw_string_outline(bf, bp, bt, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, 4, Color(0.09, 0.13, 0.16, ua))
				draw_string(bf, bp, bt, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color(1, 1, 1, ua))
			continue
''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
