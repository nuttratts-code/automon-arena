#!/usr/bin/env python3
# set 299 round 35w8b: on 7 px chips the white +/- corner mark covered the icon -> no mark when the chip is < 9 px (colour = buff / debuff).
import sys, pathlib
f = pathlib.Path(sys.argv[1]) / "scripts/ui/s286_team.gd"
s = f.read_text(encoding="utf-8")
old = '\tif mk != "":   # white "+" / "−" at the top-right corner'
assert s.count(old) == 1
f.write_text(s.replace(old, '\tif mk != "" and r.size.x >= 9.0:   # s299 r35w8b: no mark on small chips · white "+" / "−" at the top-right corner'), encoding="utf-8", newline="")
print("s299r35w8b ok")
