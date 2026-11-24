#!/usr/bin/env python3
# set 299 round 35w4 (owner): foe picked -> red line comes from the TOP corner: 180-degree turn of the own line:
#   from the top-left cut, along the top edge, down the right edge to the bottom-right cut.
# run after s299r35w3-patch.py:  python -I s299r35w4-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")
f = root / "scripts/ui/s286_team.gd"
sub(f, T('''            m = PackedVector2Array([Vector2(r.end.x - 1.0, r.position.y + 1.0), Vector2(r.end.x - 1.0, r.end.y - k - 0.5),
                Vector2(r.end.x - k - 0.5, r.end.y - 1.0), Vector2(r.position.x + 1.0, r.end.y - 1.0)])
'''), T('''            m = PackedVector2Array([Vector2(r.position.x + 1.0, r.position.y + k + 0.5), Vector2(r.position.x + k + 0.5, r.position.y + 1.0),
                Vector2(r.end.x - 1.0, r.position.y + 1.0), Vector2(r.end.x - 1.0, r.end.y - 6.0)])   # r35w4: from the top corner
'''))
print("s299r35w4 ok")
