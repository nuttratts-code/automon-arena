#!/usr/bin/env python3
# set 299 round 35w (owner F1 after note 90 "look at how FF does it"): S297E=4 = slim cool cards.
#   Each used slot = cool teal-slate card with cut corners (top-left + bottom-right, our motif, set 212) and a 1 px light edge;
#   head frame = cut-corner square (no diamond); no coloured top stripe; empty places = nothing.
#   Picked = card lifted 3 px + brighter teal + a 2 px side-colour mark on the card's left edge (no thick white frame).
#   Console = same cut-corner card, only while a unit is picked (no empty box); side mark on its left edge too.
# run after s297r35v-patch.py:  python -I s299r35w-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")

f = root / "scripts/ui/s286_team.gd"
# empty places: nothing in E4
sub(f, T('''                if E297 in ["1", "3"]: continue
'''), T('''                if E297 in ["1", "3", "4"]: continue
'''))
# slot plate: E4 card (lift when picked)
sub(f, T('''    elif on:   # E1 / E3: picked = soft teal wash only
        draw_rect(r, Color(Color("#1d6079"), 0.45))
    if on: draw_rect(r, Color(1, 1, 1, 0.95), false, 2.0)
    # head icon in a diamond
    var c := Vector2(r.position.x + 12.0, r.position.y + 14.0)
    var dr := 9.0
    var dia := PackedVector2Array([c + Vector2(0, -dr), c + Vector2(dr, 0), c + Vector2(0, dr), c + Vector2(-dr, 0)])
    draw_colored_polygon(dia, Color(0.08, 0.12, 0.16, 0.9 * a))
    var ic: Texture2D = tl._icon(uid) if tl != null else null
    if ic != null: draw_texture_rect(ic, Rect2(c - Vector2(dr, dr) * 1.15, Vector2(dr, dr) * 2.3), false, Color(1, 1, 1, a) if not dead else Color(0.6, 0.6, 0.6, a))
    draw_polyline(dia + PackedVector2Array([dia[0]]), Color(side_col, 0.95 * a), 1.0)
'''), T('''    elif E297 == "4":   # s299 r35w F1: slim cool card, cut corners, 1 px light edge; picked = lifted 3 px + side mark
        if on: r = Rect2(r.position.x, r.position.y - 3.0, r.size.x, r.size.y)
        _card299(r, on, side_col, a, self)
    elif on:   # E1 / E3: picked = soft teal wash only
        draw_rect(r, Color(Color("#1d6079"), 0.45))
    if on and E297 != "4": draw_rect(r, Color(1, 1, 1, 0.95), false, 2.0)
    var c := Vector2(r.position.x + 12.0, r.position.y + 14.0)
    var dr := 9.0
    var ic: Texture2D = tl._icon(uid) if tl != null else null
    if E297 == "4":   # head in a cut-corner square (no diamond)
        var hr := Rect2(c - Vector2(dr, dr), Vector2(dr, dr) * 2.0)
        var hq := _cutpts299(hr, 3.0)
        draw_colored_polygon(hq, Color(0.05, 0.08, 0.10, 0.9 * a))
        if ic != null: draw_texture_rect(ic, Rect2(c - Vector2(dr, dr) * 1.05, Vector2(dr, dr) * 2.1), false, Color(1, 1, 1, a) if not dead else Color(0.6, 0.6, 0.6, a))
        draw_polyline(hq + PackedVector2Array([hq[0]]), Color(side_col.lightened(0.15), 0.9 * a), 1.0)
    else:
        # head icon in a diamond
        var dia := PackedVector2Array([c + Vector2(0, -dr), c + Vector2(dr, 0), c + Vector2(0, dr), c + Vector2(-dr, 0)])
        draw_colored_polygon(dia, Color(0.08, 0.12, 0.16, 0.9 * a))
        if ic != null: draw_texture_rect(ic, Rect2(c - Vector2(dr, dr) * 1.15, Vector2(dr, dr) * 2.3), false, Color(1, 1, 1, a) if not dead else Color(0.6, 0.6, 0.6, a))
        draw_polyline(dia + PackedVector2Array([dia[0]]), Color(side_col, 0.95 * a), 1.0)
'''))
# console: card only while picked
sub(f, T('''    elif E297 == "3" and has:
        _pn_layer.draw_rect(R, Color(TH.R23_INK, 0.62))
    if not has: return   # r35u2 (owner): no hint, empty plate
'''), T('''    elif E297 == "3" and has:
        _pn_layer.draw_rect(R, Color(TH.R23_INK, 0.62))
    elif E297 == "4" and has:
        var sc4: Color = FOE_COL if int(view.units[picked]["side"]) == 1 else OWN_COL
        _card299(R, false, sc4, 1.0, _pn_layer, true)
    if not has: return   # r35u2 (owner): no hint, empty plate
'''))
# console's side-colour top line: not in E4 (the mark sits on the left edge instead)
sub(f, T('''    _pn_layer.draw_rect(Rect2(R.position.x, R.position.y, R.size.x, 1.0), Color(side_col, 0.85))
    var ink := INK
'''), T('''    if E297 != "4": _pn_layer.draw_rect(Rect2(R.position.x, R.position.y, R.size.x, 1.0), Color(side_col, 0.85))
    var ink := INK
'''))
s = f.read_text(encoding="utf-8")
s += T('''

func _cutpts299(r: Rect2, k: float) -> PackedVector2Array:   # s299 r35w: cut top-left + bottom-right corners (our motif)
    return PackedVector2Array([Vector2(r.position.x + k, r.position.y), Vector2(r.end.x, r.position.y), Vector2(r.end.x, r.end.y - k),
        Vector2(r.end.x - k, r.end.y), Vector2(r.position.x, r.end.y), Vector2(r.position.x, r.position.y + k)])

func _card299(r: Rect2, on: bool, side_col: Color, a: float, ci: CanvasItem, mark := false) -> void:   # s299 r35w F1 card
    var p := _cutpts299(r, 5.0)
    var fill := Color(Color("#1f5266"), 0.86 * a) if on else Color(Color("#18262f"), 0.78 * a)
    ci.draw_colored_polygon(p, fill)
    ci.draw_polyline(p + PackedVector2Array([p[0]]), Color(Color("#d6e8ee"), (0.85 if on else 0.42) * a), 1.0)
    if on or mark:   # side-colour mark on the left edge (below the cut)
        ci.draw_rect(Rect2(r.position.x + 1.0, r.position.y + 6.0, 2.0, r.size.y - 9.0), Color(side_col.lightened(0.1), 0.95 * a))
''')
f.write_text(s, encoding="utf-8", newline="")
print("s299r35w ok")
