# set 307 r51c: owner picks on the S303r51c-sheet.png list -> heal (r51 sparkles) + x-hit v2 (4 staggered x) + ATK v2
# (big middle claw, sides small at the edges). Textures only, r43.gd unchanged (still 34x13 from r51b).
# Usage: python s302r51c-patch.py <g286> (after s302r51b)
import sys, os, shutil
here = os.path.dirname(os.path.abspath(__file__)); g = sys.argv[1]
for src, dst in [("heal", "heal"), ("multi_v2", "multi"), ("atk_v2", "atk")]:
    shutil.copy(os.path.join(here, "S303r51c-pill_%s.png" % src), os.path.join(g, "ui_r48", "pill_%s.png" % dst))
print("r51c ok")
