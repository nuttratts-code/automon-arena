# set 268 round 34b — S268DECO=1: draw "0.3 วิ" as ONE string in the clock's mono font (its Thai fallback), exactly like the
# match clock "{t} วิ", instead of a separate body-font "วิ". usage: python s268r34b-patch-unit.py <g268>   (after s268r34)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)
if "s268r34b" not in s:
    rep('''	var txt := tt + (" วิ" if deco == "1" else "")
	var tw := mf.get_string_size(tt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	if deco == "1":
		tw += ThemeDB.fallback_font.get_string_size(" วิ", HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
''', '''	if deco == "1": tt += " วิ" # s268r34b: one string, mono + its Thai fallback = the match clock
	var tw := mf.get_string_size(tt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
''')
    rep('''	if deco == "1": # Thai unit in the body font (mono has no Thai), same colour + outline
		var ux := x + mf.get_string_size(tt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		var tf: Font = TH.font("body")
		draw_string_outline(tf, Vector2(ux, lp.y), " วิ", HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 4, CLK_OUT)
		draw_string(tf, Vector2(ux, lp.y), " วิ", HORIZONTAL_ALIGNMENT_LEFT, -1, fs, CLK_COL)
''', '')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
