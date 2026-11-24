#!/usr/bin/env python3
# set 299 round 35w9 (owner): chips back to 2 rows like round 35w7 B (9 px, +/- marks back); 3 rows x 2 only with S299CH3=1.
#   Number lines keep the 35w8 even pitch.
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
f = root / "scripts/ui/s286_team.gd"
s = f.read_text(encoding="utf-8")
old = T('''        var cs := 7.0   # r35w8: chips 3 rows x 2, right-aligned
        var nshow := mini(ef.size(), 6)
''')
new = T('''        if OS.get_environment("S299CH3") != "1":   # r35w9: chips back to 2 rows (round 35w7 B)
            var cx := L + cw + 4.0 if nums.size() > 0 else L
            var cs2 := 9.0
            var per := maxi(1, int(floorf((RT - cx + 1.0) / (cs2 + 1.0))))
            var cap := per * 2
            var ns2 := mini(ef.size(), cap)
            if ef.size() > cap: ns2 = cap - 1
            for i in ns2:
                _effect_chip(Rect2(cx + float(i % per) * (cs2 + 1.0), r.position.y + 3.0 + float(i / per) * (cs2 + 2.0), cs2, cs2), ef[i], a)
            if ef.size() > ns2:
                var p2 := Vector2(cx + float(ns2 % per) * (cs2 + 1.0), r.position.y + 3.0 + float(ns2 / per) * (cs2 + 2.0) + cs2 - 2.0)
                var t3 := "+%d" % (ef.size() - ns2)
                draw_string_outline(mf, p2, t3, HORIZONTAL_ALIGNMENT_LEFT, -1, 7, 3, Color(0.04, 0.05, 0.07, 0.85 * a))
                draw_string(mf, p2, t3, HORIZONTAL_ALIGNMENT_LEFT, -1, 7, Color(1, 1, 1, 0.95 * a))
            return
        var cs := 7.0   # r35w8: chips 3 rows x 2, right-aligned
        var nshow := mini(ef.size(), 6)
''')
assert s.count(old) == 1
f.write_text(s.replace(old, new), encoding="utf-8", newline="")
print("s299r35w9 ok")
