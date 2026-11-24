#!/usr/bin/env python3
# set 297 round 35v (owner after the live P run: "the bottom slots look AI-designed"; tells found: 12 identical tiles,
#   even spacing, see-through slate plate on every slot + an empty console box, coloured top stripe on each slot, mirror symmetry).
#   Owner: "show all of them". Env S297E picks the bottom-board look (structure = layout 4 unchanged, owner pick):
#   1 = Octopath-like dark band fading up from the screen edge, no per-slot boxes, no top stripes, console text on the band only when picked
#   2 = rune-stone plaques: pixel stone fill, lit top/left edge, dark bottom/right edge (like the arena stones), console = stone too
#   3 = nothing behind: head + numbers straight on the grass (outlined), console plate only when picked
#   (front row bigger in 2 not done in this round — layout sizes kept)
# run after s297r35u10-patch.py:  python -I s297r35v-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")

f = root / "scripts/ui/s286_team.gd"
# band behind everything (E1) at the start of the layout-4 draw
sub(f, T('''    var y0 := size.y - L4_PB - bh
    var ox := L4_PAD
'''), T('''    var y0 := size.y - L4_PB - bh
    var ox := L4_PAD
    if E297 == "1":   # s297 r35v E1: one dark band fading up from the screen edge
        var top := y0 - 18.0
        var pts := PackedVector2Array([Vector2(0, top), Vector2(size.x, top), Vector2(size.x, size.y), Vector2(0, size.y)])
        var cols := PackedColorArray([Color(TH.R23_INK, 0.0), Color(TH.R23_INK, 0.0), Color(TH.R23_INK, 0.78), Color(TH.R23_INK, 0.78)])
        draw_polygon(pts, cols)
        draw_rect(Rect2(L4_PAD, y0 + L4_SH + L4_G * 0.5, size.x - L4_PAD * 2.0, 1.0), Color(1, 1, 1, 0.14))   # one thin rule between the rows
'''))
sub(f, 'var _con_r := Rect2()\n', 'var _con_r := Rect2()\nvar E297 := OS.get_environment("S297E")   # s297 r35v: bottom-board look 1 / 2 / 3\n')
# empty places
sub(f, T('''            if used.has("%d:%d" % [c, l]): continue
                draw_rect('''), T('''            if used.has("%d:%d" % [c, l]): continue
                if E297 in ["1", "3"]: continue
                if E297 == "2":
                    _stone297(Rect2(x0 + float(c) * (L4_SW + L4_G), y0 + float(l) * (L4_SH + L4_G), L4_SW, L4_SH), 0.30, self)
                    continue
                draw_rect('''))
# slot plate + stripe
sub(f, T('''    draw_rect(r, Color(Color("#1d6079"), 0.55) if on else Color(TH.R23_INK, 0.42))   # r35u2: more see-through
    var side_col: Color = FOE_COL if foe else OWN_COL
    draw_rect(Rect2(r.position.x, r.position.y, r.size.x, 1.0), Color(side_col, 0.85 * a))
'''), T('''    var side_col: Color = FOE_COL if foe else OWN_COL
    if E297 == "":
        draw_rect(r, Color(Color("#1d6079"), 0.55) if on else Color(TH.R23_INK, 0.42))   # r35u2: more see-through
        draw_rect(Rect2(r.position.x, r.position.y, r.size.x, 1.0), Color(side_col, 0.85 * a))
    elif E297 == "2":
        _stone297(r, 1.0, self)
        if on: draw_rect(r, Color(Color("#1d6079"), 0.35))
    elif on:   # E1 / E3: picked = soft teal wash only
        draw_rect(r, Color(Color("#1d6079"), 0.45))
'''))
# console plate
sub(f, T('''    _pn_layer.draw_rect(R, Color(TH.R23_INK, 0.42))   # r35u2: more see-through
    var has: bool = picked >= 0 and view != null and view.units.has(picked)
    if not has: return   # r35u2 (owner): no hint, empty plate
'''), T('''    var has: bool = picked >= 0 and view != null and view.units.has(picked)
    if E297 == "":
        _pn_layer.draw_rect(R, Color(TH.R23_INK, 0.42))   # r35u2: more see-through
    elif E297 == "2":
        _stone297(R, 1.0 if has else 0.30, _pn_layer)
    elif E297 == "3" and has:
        _pn_layer.draw_rect(R, Color(TH.R23_INK, 0.62))
    if not has: return   # r35u2 (owner): no hint, empty plate
'''))
# stone helper at the end
s = f.read_text(encoding="utf-8")
s += T('''

func _stone297(r: Rect2, a: float, ci: CanvasItem) -> void:   # s297 r35v E2: pixel rune-stone plaque, sun from the top-left
    ci.draw_rect(r, Color(Color("#5b5850"), 0.92 * a))
    ci.draw_rect(Rect2(r.position.x + 2.0, r.position.y + 2.0, r.size.x - 4.0, r.size.y - 4.0), Color(Color("#666258"), 0.92 * a))
    ci.draw_rect(Rect2(r.position.x, r.position.y, r.size.x, 1.0), Color(Color("#9a9586"), a))
    ci.draw_rect(Rect2(r.position.x, r.position.y, 1.0, r.size.y), Color(Color("#8a8577"), a))
    ci.draw_rect(Rect2(r.position.x, r.end.y - 1.0, r.size.x, 1.0), Color(Color("#26241f"), a))
    ci.draw_rect(Rect2(r.end.x - 1.0, r.position.y, 1.0, r.size.y), Color(Color("#2f2d27"), a))
''')
f.write_text(s, encoding="utf-8", newline="")
print("s297r35v ok")
