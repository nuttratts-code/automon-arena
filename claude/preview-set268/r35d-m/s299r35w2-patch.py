#!/usr/bin/env python3
# set 299 round 35w2 (owner after 35w): cards a bit more see-through · picked = colour change only (no lift, no side mark)
#   · console gimmick: the side-colour mark runs from the left edge along the bottom to the bottom-right corner (follows the cut).
# run after s299r35w-patch.py:  python -I s299r35w2-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")

f = root / "scripts/ui/s286_team.gd"
sub(f, T('''        if on: r = Rect2(r.position.x, r.position.y - 3.0, r.size.x, r.size.y)
'''), '')
sub(f, T('''    var fill := Color(Color("#1f5266"), 0.86 * a) if on else Color(Color("#18262f"), 0.78 * a)
    ci.draw_colored_polygon(p, fill)
    ci.draw_polyline(p + PackedVector2Array([p[0]]), Color(Color("#d6e8ee"), (0.85 if on else 0.42) * a), 1.0)
    if on or mark:   # side-colour mark on the left edge (below the cut)
        ci.draw_rect(Rect2(r.position.x + 1.0, r.position.y + 6.0, 2.0, r.size.y - 9.0), Color(side_col.lightened(0.1), 0.95 * a))
'''), T('''    var fill := Color(Color("#1f5266"), 0.72 * a) if on else Color(Color("#18262f"), 0.60 * a)   # r35w2: a bit more see-through
    ci.draw_colored_polygon(p, fill)
    ci.draw_polyline(p + PackedVector2Array([p[0]]), Color(Color("#d6e8ee"), (0.75 if on else 0.34) * a), 1.0)
    if mark:   # r35w2 console gimmick: side line down the left edge, along the bottom, up the cut to the right corner
        var k := 5.0
        var m := PackedVector2Array([Vector2(r.position.x + 1.0, r.position.y + 6.0), Vector2(r.position.x + 1.0, r.end.y - 1.0),
            Vector2(r.end.x - k - 0.5, r.end.y - 1.0), Vector2(r.end.x - 1.0, r.end.y - k - 0.5)])
        ci.draw_polyline(m, Color(side_col.lightened(0.1), 0.95 * a), 2.0)
'''))
print("s299r35w2 ok")
