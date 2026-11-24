#!/usr/bin/env python3
# set 299 round 35w17 (owner): chips touched each other → 2 px gap between chips (same as the row gap). After s299r35w16.
import sys, pathlib
root = pathlib.Path(sys.argv[1])
f = root / "scripts/ui/s286_team.gd"
s = f.read_text(encoding="utf-8")
a = s.index('if OS.get_environment("S299CH3") != "1":   # r35w9')
b = s.index("\t\t\treturn\n", a)
blk = s[a:b]
n = blk.count("(cs2 + 1.0)")
assert n >= 4, n
blk = blk.replace("(cs2 + 1.0)", "(cs2 + 2.0)").replace("+ 1.0) / (cs2 + 2.0)", "+ 2.0) / (cs2 + 2.0)").replace("- 1.0)) * 0.5", "- 2.0)) * 0.5")
s = s[:a] + blk + s[b:]
f.write_text(s, encoding="utf-8", newline="")
print("s299r35w17 ok", n)
