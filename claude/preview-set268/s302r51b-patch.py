# set 303 r51b: owner "why isn't the pattern across the whole pill / why is one side cut" -> cause: r51 cut the middle of
# GPT's 4:1 pills to reach 28:13. Owner plan: size the pill for the longest tested value ("100K", set 286 r35j) = 34x13,
# GPT draws plain pills + separate long white pattern strips, Claude bakes them (S303r51b-bake-pills.py): pattern fills the
# whole pill. Owner edits: x-hit = "x" marks + sparkles (like heal) · armour = same seams/rivets as white lines.
# Usage: python s302r51b-patch.py <g286> (after s302r51)
import sys, os, shutil
here = os.path.dirname(os.path.abspath(__file__)); g = sys.argv[1]
for n in ["hp", "atk", "multi", "burn", "shock", "armor", "heal"]:
    shutil.copy(os.path.join(here, "S303r51b-pill_%s.png" % n), os.path.join(g, "ui_r48", "pill_%s.png" % n))
p = os.path.join(g, "scripts", "ui", "r43.gd")
s = open(p, encoding="utf-8", newline="").read()
if not os.path.exists(p + ".s302r51b"): shutil.copy(p, p + ".s302r51b")
old = "Rect2(r.position.x + 5, py + i * (ph + gap), 28, ph)"
assert s.count(old) == 1, "pill rect"
s = s.replace(old, "Rect2(r.position.x + 5, py + i * (ph + gap), 34, ph)")
open(p, "w", encoding="utf-8", newline="").write(s)
print("r51b ok")
