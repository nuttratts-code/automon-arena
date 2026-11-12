# set 213 sample R1c: reroll keeps its old top (62) — at 40 it hit the bench's 5th row (bench rows overflow their box)
import sys, re
g = sys.argv[1]
t = g + "/scenes/prep_layout.tscn"
s = open(t, encoding="utf-8").read()
i = s.index('[node name="Reroll"'); j = s.index("\n[", i + 1)
blk = s[i:j]; assert "offset_top = 40.0" in blk
s = s[:i] + blk.replace("offset_top = 40.0", "offset_top = 62.0") + s[j:]
open(t, "w", encoding="utf-8", newline="\n").write(s)
print("R1c ok")
