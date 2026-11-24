#!/usr/bin/env python3
# set 299 round 35w7b: variants a / c never drop a number: try size 8 (gap 3), then 7 (gap 2) so every number fits in 2 rows.
# run after s299r35w7-patch.py
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
f = root / "scripts/ui/s286_team.gd"
s = f.read_text(encoding="utf-8")
old = T('''        var fs := 8
        var isz := 8.0
        var ys := [r.position.y + 3.0, r.position.y + 14.5]
        var line := 0
        var x := L
        for n in nums:
            var w := isz + 1.0 + mf.get_string_size(String(n[1]), HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
            if x + w > RT and x > L:
                line += 1
                x = L
            if line > 1: break
            x += _symnum299(x, ys[line], String(n[0]), String(n[1]), fs, isz, a) + 3.0
''')
new = T('''        var fs := 8
        var isz := 8.0
        var gap := 3.0
        for tryi in 2:   # r35w7b: shrink before anything is dropped
            fs = 8 - tryi
            isz = 8.0 - float(tryi)
            gap = 3.0 - float(tryi)
            var lx := L
            var ln := 0
            for n in nums:
                var w0 := isz + 1.0 + mf.get_string_size(String(n[1]), HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
                if lx + w0 > RT and lx > L:
                    ln += 1
                    lx = L
                lx += w0 + gap
            if ln <= 1: break
        var ys := [r.position.y + 3.0, r.position.y + 14.5]
        var line := 0
        var x := L
        for n in nums:
            var w := isz + 1.0 + mf.get_string_size(String(n[1]), HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
            if x + w > RT and x > L:
                line += 1
                x = L
            if line > 1: break
            x += _symnum299(x, ys[line], String(n[0]), String(n[1]), fs, isz, a) + gap
''')
assert s.count(old) == 1
f.write_text(s.replace(old, new), encoding="utf-8", newline="")
print("s299r35w7b ok")
