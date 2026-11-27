# set 307 shop plate: the top plate = painted plain 2-cut-corner plate (S307-plate.png, from GPT #2) as a 9-slice;
# the stepped code plate (r44 A1: raised odds step + gold rule) is dropped for now (owner: tab / step get added later).
# Usage: python s307plate-patch.py <g286> (after s307badge)
import sys, os, shutil
here = os.path.dirname(os.path.abspath(__file__)); g = sys.argv[1]
shutil.copy(os.path.join(here, "S307-plate.png"), os.path.join(g, "ui_r48", "plate.png"))
p = os.path.join(g, "scripts", "ui", "r43.gd")
s = open(p, encoding="utf-8", newline="").read()
if not os.path.exists(p + ".s307plate"): shutil.copy(p, p + ".s307plate")
old = "\t\tstepped(ci, r, K + 2.0, a)\n\t\treturn\n"
new = "\t\t_nine(ci, _tex(\"plate\"), r, 80.0, 0.26, Color(1, 1, 1, a))   # set 307: painted plain plate (owner)\n\t\treturn\n"
if old in s:
    s = s.replace(old, new); open(p, "w", encoding="utf-8", newline="").write(s); print("s307plate ok")
else: print("s307plate already")
