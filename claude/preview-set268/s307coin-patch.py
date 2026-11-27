# set 307: tilted coin (50 deg) with dark outline + deep drop shadow (owner pick) on the shop card.
# Texture S307-coin.png -> g286 ui_r48/coin.png; r43.gd sizes the coin by height (14 px) since the tilted coin is taller.
# Usage: python s307coin-patch.py <g286> (after s302r51c)
import sys, os, shutil
here = os.path.dirname(os.path.abspath(__file__)); g = sys.argv[1]
shutil.copy(os.path.join(here, "S307-coin.png"), os.path.join(g, "ui_r48", "coin.png"))
p = os.path.join(g, "scripts", "ui", "r43.gd")
s = open(p, encoding="utf-8", newline="").read()
if not os.path.exists(p + ".s307coin"): shutil.copy(p, p + ".s307coin")
old = "\tvar cw := 12.0\n\tvar chh := cw * float(ct.get_height()) / float(ct.get_width())\n"
if old in s: s = s.replace(old, "\tvar chh := 14.0   # set 307: tilted coin is taller, size by height\n\tvar cw := chh * float(ct.get_width()) / float(ct.get_height())\n")
open(p, "w", encoding="utf-8", newline="").write(s)
print("s307coin ok")
