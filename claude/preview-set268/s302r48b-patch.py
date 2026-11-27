# set 303 r48b: owner A1 (27 Nov) "make the Fight button follow our game concept" = shape only: chamfered rectangle with
# TWO cut corners (top-left + bottom-right, ui-patterns set 212 motif) instead of the target's 4-cut octagon; colours kept.
# Codex image_generation edited the r48 empty button (S303r48b-gpt-fight-2cut.png, attempt 1 of 2); keyed -> S303r48b-fight_btn.png.
# Usage: python s302r48b-patch.py <g286> (after s302r48)
import sys, os, shutil
g = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
shutil.copy(os.path.join(here, "S303r48b-fight_btn.png"), os.path.join(g, "ui_r48", "fight_btn.png"))
p = os.path.join(g, "scripts/ui/r43.gd")
s = open(p, encoding="utf-8").read()
if not os.path.exists(p + ".s302r48b"): shutil.copy(p, p + ".s302r48b")
old = "\tshadow(ci, _cut4, r, k, 1.0)\n\t# r48 C2"
new = "\tshadow(ci, _cut, r, r.size.y * 0.22, 1.0)   # r48b: 2-cut motif (cut = 22 % of height, as the piece)\n\t# r48 C2"
assert s.count(old) == 1, "r48 shadow line"
s = s.replace(old, new)
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("r48b ok")
