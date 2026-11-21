# set 268 round 34d — owner picked deco 1 (number + "วิ"): "วิ" a bit smaller than the number (11 -> 8, thinner outline 3,
# 1 px gap, same baseline) · the white line over each group = the clock colour (#9fadb6 a0.95) like the number.
# usage: python s268r34d-patch-smallunit.py <g268>   (after s268r34c)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)
if "s268r34d" not in s:
    rep('''	if deco == "1": tt += " วิ" # s268r34b: one string, mono + its Thai fallback = the match clock
''', '')
    rep('''	draw_string(mf, Vector2(x, lp.y), tt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, CLK_COL)
''', '''	draw_string(mf, Vector2(x, lp.y), tt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, CLK_COL)
	if deco == "1": # s268r34d: smaller "วิ" after the number, same baseline, clock colour
		var ux := x + tw + 1.0
		draw_string_outline(mf, Vector2(ux, lp.y), "วิ", HORIZONTAL_ALIGNMENT_LEFT, -1, 8, 3, CLK_OUT)
		draw_string(mf, Vector2(ux, lp.y), "วิ", HORIZONTAL_ALIGNMENT_LEFT, -1, 8, CLK_COL)
''')
    rep('''		draw_polyline(PackedVector2Array([Vector2(a, ly), Vector2(b, ly)]), Color(1, 1, 1, 0.8), 1.5)''',
        '''		draw_polyline(PackedVector2Array([Vector2(a, ly), Vector2(b, ly)]), CLK_COL, 1.5) # s268r34d: = number colour''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
