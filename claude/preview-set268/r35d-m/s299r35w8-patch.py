#!/usr/bin/env python3
# set 299 round 35w8 (owner picked B): the 3 number lines fill the card height evenly (pitch 7.5, same margin top + bottom)
#   · buff / debuff chips = 3 rows x 2, right-aligned, on the same pitch as the number lines; > 6 -> 5 + "+N".
# run after s299r35w7b-patch.py
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
f = root / "scripts/ui/s286_team.gd"
s = f.read_text(encoding="utf-8")
a0 = s.index(T("        var y := r.position.y + 1.5 + (3.0 - float(nums.size())) * 4.0\n"))
b0 = s.index(T("            draw_string(mf, pp, t2, HORIZONTAL_ALIGNMENT_LEFT, -1, 7, Color(1, 1, 1, 0.95 * a))\n"), a0)
b0 = s.index("\n", b0) + 1
new = T('''        var pitch := 7.5   # r35w8: 3 lines fill the card evenly
        var top := r.position.y + (r.size.y - (pitch * 2.0 + isz)) * 0.5
        var y := top + (3.0 - float(nums.size())) * pitch * 0.5
        for n in nums:
            _symnum299(L, y, String(n[0]), String(n[1]), fs, isz, a)
            y += pitch
        var cs := 7.0   # r35w8: chips 3 rows x 2, right-aligned
        var nshow := mini(ef.size(), 6)
        if ef.size() > 6: nshow = 5
        for i in nshow:
            _effect_chip(Rect2(RT - cs - float(1 - i % 2) * (cs + 1.0), top + float(i / 2) * pitch, cs, cs), ef[i], a)
        if ef.size() > nshow:
            var t2 := "+%d" % (ef.size() - nshow)
            var tw := mf.get_string_size(t2, HORIZONTAL_ALIGNMENT_LEFT, -1, 7).x
            var pp := Vector2(RT - tw, top + 2.0 * pitch + cs - 1.0)
            draw_string_outline(mf, pp, t2, HORIZONTAL_ALIGNMENT_LEFT, -1, 7, 3, Color(0.04, 0.05, 0.07, 0.85 * a))
            draw_string(mf, pp, t2, HORIZONTAL_ALIGNMENT_LEFT, -1, 7, Color(1, 1, 1, 0.95 * a))
''')
s = s[:a0] + new + s[b0:]
f.write_text(s, encoding="utf-8", newline="")
print("s299r35w8 ok")
