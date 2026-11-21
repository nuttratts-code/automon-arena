# set 268 round 34e — owner: "วิ too close to the number" -> gap 1 -> 3 px. usage: python s268r34e-patch-gap.py <g268> (after r34d)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()
a = "var ux := x + tw + 1.0"
if "s268r34e" not in s:
    assert a in s
    s = s.replace(a, "var ux := x + tw + 3.0 # s268r34e", 1)
    open(p, "w", encoding="utf-8").write(s)
print("ok")
