#!/usr/bin/env python3
# set 299 round 35w16 (owner D2): chips start at the SAME x on every card (number column reserved for the widest
#   4-char number, mono font) and the gap numbers → chips = the gap last chip → card edge. After s299r35w15.
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
f = root / "scripts/ui/s286_team.gd"
s = f.read_text(encoding="utf-8")
old = T('''            var cx := L + cw + 4.0 if nums.size() > 0 else L
            var cs2 := 9.0
            var per := maxi(1, int(floorf((RT - cx + 1.0) / (cs2 + 1.0))))
''')
new = T('''            var cx := L + cw + 4.0 if nums.size() > 0 else L
            var cs2 := 9.0
            var per := maxi(1, int(floorf((RT - cx + 1.0) / (cs2 + 1.0))))
            if OS.get_environment("S299D2") != "0":   # r35w16 D2: fixed start + equal gaps
                var c0 := L + isz + 1.0 + mf.get_string_size("8.8M", HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
                var room := (r.end.x - 1.0) - c0
                per = maxi(1, int(floorf((room - 4.0 + 1.0) / (cs2 + 1.0))))
                var gp := (room - (float(per) * (cs2 + 1.0) - 1.0)) * 0.5
                cx = roundf(c0 + gp)
''')
assert s.count(old) == 1, "chips"
f.write_text(s.replace(old, new), encoding="utf-8", newline="")
print("s299r35w16 ok")
