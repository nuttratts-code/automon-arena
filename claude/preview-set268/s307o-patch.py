# set 307 o (owner A1): stat pills sit IN the card: soft drop shadow under each pill (the same pill shape in black, 1.5 units
# down, 0.45 alpha, drawn first) + pills 2 units away from the left frame (x +5 -> +7). S307PILLSH=0 = old.
# Usage: python s307o-patch.py <g286> (backup r43.gd.s307o)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "r43.gd")
if not os.path.exists(p + ".s307o"): shutil.copy(p, p + ".s307o")
s = open(p, encoding="utf-8", newline="").read()
reps = [
    ('\t_three(ci, _tex("pill_" + kind), r, 0.42, Color(1, 1, 1, a))\n',
     '\tif OS.get_environment("S307PILLSH") != "0":   # set 307 o: soft shadow under the pill (sits in the card)\n'
     '\t\t_three(ci, _tex("pill_" + kind), Rect2(r.position + Vector2(0.3, 1.5), r.size).grow(0.4), 0.42, Color(0, 0, 0, 0.45 * a))\n'
     '\t_three(ci, _tex("pill_" + kind), r, 0.42, Color(1, 1, 1, a))\n'),
    ('\t\t_pill(ci, fb, Rect2(r.position.x + 5, py',
     '\t\t_pill(ci, fb, Rect2(r.position.x + (7.0 if OS.get_environment("S307PILLSH") != "0" else 5.0), py'),
]
for old, new in reps:
    if new in s: continue
    assert s.count(old) == 1, old; s = s.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="").write(s); print("r43.gd ok")
