# set 213 sample R1d: bench box moves up 10 (5 rows need ~241, box was 236 → row 5 spilled onto the first shop card)
import sys
g = sys.argv[1]
t = g + "/scenes/prep_layout.tscn"
s = open(t, encoding="utf-8").read()
i = s.index('[node name="Bench"'); j = s.index("\n[", i + 1)
blk = s[i:j]; assert "offset_top = -202.0" in blk and "offset_bottom = 34.0" in blk
s = s[:i] + blk.replace("offset_top = -202.0", "offset_top = -212.0").replace("offset_bottom = 34.0", "offset_bottom = 32.0") + s[j:]
open(t, "w", encoding="utf-8", newline="\n").write(s)
print("R1d ok")
