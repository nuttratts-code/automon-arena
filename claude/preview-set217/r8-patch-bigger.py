# set 217 R8 (sample copy only): owner "ขยายตัวละคร" — bigger units like the FF-style reference.
# SPR_H (unit height in world units) up, and the battle camera frames the units, not the whole plaza
# (smaller side/top margins in app.gd board_targets → the camera dollies in).
#   python -I r8-patch-bigger.py <godot copy> <spr_h> <side margin px> <top margin px>
import re
import sys
g, spr, side, top = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
p = g + "/scripts/ui/stage3d.gd"
s = open(p, encoding="utf-8").read()
s, a = re.subn(r"const SPR_H := [\d.]+", "const SPR_H := %s" % spr, s)
assert a == 1
open(p, "w", encoding="utf-8", newline="").write(s)
p = g + "/scripts/ui/app.gd"
s = open(p, encoding="utf-8").read()
s, b = re.subn(r"br = bf\.grow_individual\([^)]*\)", "br = bf.grow_individual(-%s.0, -%s.0, -%s.0, -4.0)" % (side, top, side), s)
assert b == 1
open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
