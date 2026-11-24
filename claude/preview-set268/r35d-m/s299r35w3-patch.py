#!/usr/bin/env python3
# set 299 round 35w3 (owner): foe picked -> console line is red (foe side colour) and runs the other way:
#   down the RIGHT edge, through the bottom-right cut, along the bottom to the bottom-left corner.
# run after s299r35w2-patch.py:  python -I s299r35w3-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")
f = root / "scripts/ui/s286_team.gd"
sub(f, T('''        _card299(R, false, sc4, 1.0, _pn_layer, true)
'''), T('''        _card299(R, false, sc4, 1.0, _pn_layer, true, int(view.units[picked]["side"]) == 1)
'''))
sub(f, 'func _card299(r: Rect2, on: bool, side_col: Color, a: float, ci: CanvasItem, mark := false) -> void:',
       'func _card299(r: Rect2, on: bool, side_col: Color, a: float, ci: CanvasItem, mark := false, flip := false) -> void:')
sub(f, T('''        ci.draw_polyline(m, Color(side_col.lightened(0.1), 0.95 * a), 2.0)
'''), T('''        if flip:   # r35w3: foe picked = mirror: right edge, the cut, along the bottom to the bottom-left corner
            m = PackedVector2Array([Vector2(r.end.x - 1.0, r.position.y + 1.0), Vector2(r.end.x - 1.0, r.end.y - k - 0.5),
                Vector2(r.end.x - k - 0.5, r.end.y - 1.0), Vector2(r.position.x + 1.0, r.end.y - 1.0)])
        ci.draw_polyline(m, Color(side_col.lightened(0.1), 0.95 * a), 2.0)
'''))
print("s299r35w3 ok")
