#!/usr/bin/env python3
# set 299 round 35w6 (owner after 35w5): old inside is nicer -> new inside only with S299IN=1 (default = round 35w4 inside).
#   Console lines hug their corner: own (blue) = upside-down L at the top-left: up the left edge, round the top-left cut,
#   along the top edge · foe (red) = L at the bottom-right: down the right edge, round the bottom-right cut, along the bottom.
# run after s299r35w5-patch.py:  python -I s299r35w6-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")
f = root / "scripts/ui/s286_team.gd"
sub(f, 'var IN299 := OS.get_environment("S299IN") != "0"', 'var IN299 := OS.get_environment("S299IN") == "1"')
sub(f, T('''        var m := PackedVector2Array([Vector2(r.position.x + 1.0, r.position.y + k + 0.5), Vector2(r.position.x + k + 0.5, r.position.y + 1.0),
            Vector2(r.end.x - 1.0, r.position.y + 1.0), Vector2(r.end.x - 1.0, r.end.y - 6.0)])   # r35w5: own = from the top-left corner
        if flip:   # r35w5: foe = from the bottom-right corner: up the cut, along the bottom, up the left edge
            m = PackedVector2Array([Vector2(r.end.x - 1.0, r.end.y - k - 0.5), Vector2(r.end.x - k - 0.5, r.end.y - 1.0),
                Vector2(r.position.x + 1.0, r.end.y - 1.0), Vector2(r.position.x + 1.0, r.position.y + 6.0)])
'''), T('''        # r35w6: own = upside-down L at the top-left (left edge + top edge)
        var m := PackedVector2Array([Vector2(r.position.x + 1.0, r.end.y - 1.0), Vector2(r.position.x + 1.0, r.position.y + k + 0.5),
            Vector2(r.position.x + k + 0.5, r.position.y + 1.0), Vector2(r.end.x - 1.0, r.position.y + 1.0)])
        if flip:   # r35w6: foe = L at the bottom-right (right edge + bottom edge)
            m = PackedVector2Array([Vector2(r.end.x - 1.0, r.position.y + 1.0), Vector2(r.end.x - 1.0, r.end.y - k - 0.5),
                Vector2(r.end.x - k - 0.5, r.end.y - 1.0), Vector2(r.position.x + 1.0, r.end.y - 1.0)])
'''))
print("s299r35w6 ok")
