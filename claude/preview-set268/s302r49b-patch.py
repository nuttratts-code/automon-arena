# set 303 r49b: owner "fix what Claude found" on the r49 card: (1) GPT redrew the grey card with a ~3.5 %-wide bevelled gold
# frame and (2) a brighter, wider feet glow (S303r49b-gpt-card-2tries.png, attempt 1; split by S303r49b-split-card.py);
# (3) tint in code: hsv(h, clamp(s*0.85, 0.5, 0.7), 0.95), no x1.45 gain (glow is now near white; Firasheep no longer muddy);
# 9-slice scale 0.21 (frame drawn ~7 px at 1920, as the target).
# Usage: python s302r49b-patch.py <g286> (after s302r49; PNGs beside this file)
import sys, os, shutil
g = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
for a, b in [("S303r49b-card_frame.png", "card_frame.png"), ("S303r49b-card_body.png", "card_body.png")]:
    shutil.copy(os.path.join(here, a), os.path.join(g, "ui_r48", b))
p = os.path.join(g, "scripts/ui/r43.gd")
s = open(p, encoding="utf-8").read()
if not os.path.exists(p + ".s302r49b"): shutil.copy(p, p + ".s302r49b")
for old, new in [
    ("\tvar tint := Color.from_hsv(tc.h, clampf(tc.s * 0.75, 0.0, 0.7), 1.0) * 1.45\n",
     "\tvar tint := Color.from_hsv(tc.h, clampf(tc.s * 0.85, 0.5, 0.7), 0.95)   # r49b: vivid, no gain (glow near white)\n"),
    ('_nine(ci, _tex("card_body"), r, 30.0, 0.31, tint)', '_nine(ci, _tex("card_body"), r, 30.0, 0.21, tint)'),
    ('_nine(ci, _tex("card_frame"), r, 30.0, 0.31, Color(1, 1, 1, fa))', '_nine(ci, _tex("card_frame"), r, 30.0, 0.21, Color(1, 1, 1, fa))'),
]:
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("r49b ok")
