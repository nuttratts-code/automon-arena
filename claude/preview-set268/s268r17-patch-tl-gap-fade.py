# set 268 round 17 (owner 21 Nov, two crops of round 16): "where red and blue join, don't run into the white frame — leave a
# small gap; and fade the whole bar (white line + ticks) along with the colour".
# - bands start a 7 px gap away from the act diamond's outer frame, their left end slanted parallel to the frame
# - white line + tick diamonds fade with the bands: 0.85 at the act point, 0.5 at 30 %, 0.12 at the right end
# Run after s268r16-patch-tl-bands.
import sys, os
g = sys.argv[1]

def sub(path, pairs):
    p = os.path.join(g, path)
    t = open(p, encoding="utf-8").read()
    for a, b in pairs:
        assert a in t, (path, a[:70])
        t = t.replace(a, b, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(t)

sub("scripts/ui/s268_timeline.gd", [
    ("\t\tdraw_polygon(PackedVector2Array([Vector2(x0, y), Vector2(xm, y), Vector2(xm, yb), Vector2(x0, yb)]),\n",
     "\t\tvar ge := x0 + 28.0 + 7.0   # round 17: gap from the act diamond's outer frame (r 28), edge parallel to it\n"
     "\t\tdraw_polygon(PackedVector2Array([Vector2(ge, y), Vector2(xm, y), Vector2(xm, yb), Vector2(ge - bh, yb)]),\n"),
    ("\tdraw_line(Vector2(x0, y), Vector2(x1, y), LINE_COL, 1.5)\n",
     "\t# round 17: line + ticks fade with the bands\n"
     "\tvar fx := func(x: float) -> float:\n"
     "\t\tvar k := clampf((x - x0) / (x1 - x0), 0.0, 1.0)\n"
     "\t\treturn lerpf(0.85, 0.5, k / 0.3) if k < 0.3 else lerpf(0.5, 0.12, (k - 0.3) / 0.7)\n"
     "\tvar lxm := x0 + (x1 - x0) * 0.3\n"
     "\tdraw_polyline_colors(PackedVector2Array([Vector2(x0, y), Vector2(lxm, y), Vector2(x1, y)]),\n"
     "\t\tPackedColorArray([Color(LINE_COL, 0.85), Color(LINE_COL, 0.5), Color(LINE_COL, 0.12)]), 1.5)\n"),
    ("\t\tdraw_colored_polygon(_diamond(Vector2(tx, y), 3.0), LINE_COL)\n",
     "\t\tdraw_colored_polygon(_diamond(Vector2(tx, y), 3.0), Color(LINE_COL, fx.call(tx)))\n"),
])
print("ok gap fade")
