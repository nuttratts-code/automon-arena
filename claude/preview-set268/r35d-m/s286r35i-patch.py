# R35i: owner "darker" -> deeper bar colours, more solid edge + track (still the soft r35h shape).
import sys, io
T = sys.argv[1] + '/scripts/ui/s286_team.gd'
s = io.open(T, encoding='utf-8').read()
for a, b in [
 ("Color(0.10, 0.09, 0.07, 0.38))", "Color(0.07, 0.06, 0.05, 0.62))"),
 ("_soft_rect(Rect2(x0, y0, BAR_W, HP_H), Color(0.12, 0.11, 0.09, 0.42))", "_soft_rect(Rect2(x0, y0, BAR_W, HP_H), Color(0.09, 0.08, 0.06, 0.65))"),
 ("Color(\"#8fbf6e\", 0.88) if fr > 0.3 else Color(\"#d2a45a\", 0.9)", "Color(\"#5e9a45\", 0.97) if fr > 0.3 else Color(\"#bf8530\", 0.97)"),
 ("Color(1.0, 0.98, 0.85, 0.22))   # sun-lit", "Color(1.0, 0.98, 0.85, 0.14))   # sun-lit"),
 ("Color(\"#7fa3d9\") if int(v[\"side\"]) == 0 else Color(\"#d98a86\")", "Color(\"#4f7fc4\") if int(v[\"side\"]) == 0 else Color(\"#c0564f\")"),
 ("draw_rect(Rect2(x0, y0 + HP_H + 1.0, BAR_W, 2.0), Color(0.12, 0.11, 0.09, 0.35))", "draw_rect(Rect2(x0, y0 + HP_H + 1.0, BAR_W, 2.0), Color(0.09, 0.08, 0.06, 0.6))"),
 ("else Color(col, 0.8))", "else Color(col, 0.97))"),
]:
    if a not in s: raise SystemExit('anchor not found: %r' % a)
    s = s.replace(a, b, 1)
io.open(T, 'w', encoding='utf-8', newline='\n').write(s)
print('r35i ok')
