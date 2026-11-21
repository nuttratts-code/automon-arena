# set 268 round 34f — owner: "every character frame touches the top at the same height" -> heads top-aligned: centre y =
# y - 20 + r (biggest head r 20 keeps its place, smaller ones move up); the group shade ends 8 px under its own heads.
# usage: python s268r34f-patch-toptalign.py <g268>   (after r34e)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)
if "s268r34f" not in s:
    rep("\t\tr = float(placed[i][2]) # s268r33: size by slot, no double frame\n",
        "\t\tr = float(placed[i][2]) # s268r33: size by slot, no double frame\n\t\tc.y = y - 20.0 + r # s268r34f: frame tops at one height\n")
    rep("draw_rect(Rect2(a, ly, b - a, (y + gr_r + 8.0) - ly)", "draw_rect(Rect2(a, ly, b - a, (y - 20.0 + 2.0 * gr_r + 8.0) - ly)")
    open(p, "w", encoding="utf-8").write(s)
print("ok")
