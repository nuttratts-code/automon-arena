# set 303 r50c: owner "fit the creature to the frame" -> A1 shrink to fit inside the gold frame, feet on the glow.
# Frame layer inner edges (S303r50b-card_frame.png 460x364): sides end at src 18, bottom bar starts at 346; body glow
# brightest row = 305. 9-slice margin 30 src px at 0.21 units/src px -> side frame 3.8 units; glow y maps through the
# stretched middle (30..334). Box: x = 0.24 w .. inner right - 1, y = strip + 3 .. glow row; _pic keeps aspect, bottom = feet.
# Usage: python s302r50c-patch.py <g286> (after s302r50b)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "r43.gd")
s = open(p, encoding="utf-8", newline="").read()
if not os.path.exists(p + ".s302r50c"): shutil.copy(p, p + ".s302r50c")
old = "\tv._pic(ci, tex, Rect2(w * 0.24, bh + 3, w * 0.74, h - bh - 6))\n"
new = ("\tvar fy := r.position.y + 6.3 + (305.0 - 30.0) / 304.0 * (r.size.y - 12.6)   # r50c: feet on the body glow\n"
       "\tvar fx1 := r.end.x - 18.0 * 0.21 - 1.0   # r50c: inside the right gold frame\n"
       "\tv._pic(ci, tex, Rect2(w * 0.24, bh + 3, fx1 - w * 0.24, fy - bh - 3))\n")
assert s.count(old) == 1, "pic line"
open(p, "w", encoding="utf-8", newline="").write(s.replace(old, new))
print("r50c ok")
