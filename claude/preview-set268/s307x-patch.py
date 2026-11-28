# set 307 x (owner): "move the tribe badge up a bit". Picks A1 = 3 levels to compare (1 / 2 / 3 units up) · B1 price coin stays.
# Badge centre y - S307BADGEUP units (env, default 0 = round w2). Usage: python s307x-patch.py <g286> (after s307w2; backup r43.gd.s307x)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "r43.gd")
if not os.path.exists(p + ".s307x"): shutil.copy(p, p + ".s307x")
s = open(p, encoding="utf-8", newline="").read()
old = '\t\tvar bc := Vector2(r.position.x + 11, r.position.y + 1 + bh * 0.5)   # set 307: painted medallion + owner glyph\n'
new = ('\t\tvar bc := Vector2(r.position.x + 11, r.position.y + 1 + bh * 0.5)   # set 307: painted medallion + owner glyph\n'
       '\t\tbc.y -= float(OS.get_environment("S307BADGEUP")) if OS.get_environment("S307BADGEUP") != "" else 0.0   # set 307 x: badge higher (coin stays)\n')
if new not in s:
    assert s.count(old) == 1; s = s.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="").write(s); print("r43.gd ok")
