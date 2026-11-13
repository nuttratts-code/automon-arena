# set 217 R7 (sample copy only): owner likes camera 8° + the staggered party look of the owner's reference screenshot
# (teams face each other, each unit offset in depth AND sideways so nobody hides anybody).
#   python -I r7-patch-formation.py <godot copy> <col0,col1,col2> <laneFar,laneNear> <far lane x shift>
import re
import sys
g, cols, lanes, shift = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
p = g + "/scripts/ui/stage3d.gd"
s = open(p, encoding="utf-8").read()
s, a = re.subn(r"const COL_X := \[[^\]]*\]", "const COL_X := [%s]" % ", ".join(cols.split(",")), s)
s, b = re.subn(r"const LANE_Z := \[[^\]]*\]", "const LANE_Z := [%s]" % ", ".join(lanes.split(",")), s)
s, c = re.subn(r"\(([\d.]+) if lane == 0 else 0\.0\)", "(%s if lane == 0 else 0.0)" % shift, s)
assert (a, b, c) == (1, 1, 1), (a, b, c)
open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
