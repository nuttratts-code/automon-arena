# set 302 r43c: Fight icon + label closer together (picture), cards a step brighter
import sys, os, shutil
g = sys.argv[1]
p = os.path.join(g, "scripts/ui/r43.gd")
s = open(p, encoding="utf-8").read()
if not os.path.exists(p + ".s302r43c"): shutil.copy(p, p + ".s302r43c")
for o, n in [("\t\tl.anchor_left = 0.30\n", "\t\tl.anchor_left = 0.20\n"),
             ("inr.position.x + inr.size.x * 0.24,", "inr.position.x + inr.size.x * 0.31,"),
             ("clampf(tc.s * 0.95, 0.0, 0.85), 0.62)", "clampf(tc.s * 1.0, 0.0, 0.9), 0.72)"),
             ("_grad(ci, _cut(r, k), base.darkened(0.30), base.darkened(0.62), r)", "_grad(ci, _cut(r, k), base.darkened(0.22), base.darkened(0.58), r)")]:
    assert s.count(o) == 1, o
    s = s.replace(o, n)
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("s302r43c patched")
