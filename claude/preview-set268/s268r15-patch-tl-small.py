# set 268 round 15 (owner 21 Nov): "make the gauge bar smaller" — the whole timeline about 0.72x:
# portraits r 19 -> 14 (next to act 27 -> 20), act-point diamond 24 -> 17, ticks 4 -> 3, line 2 -> 1.5 px,
# trail band 10 -> 7 px, height 112 -> 82. Run after s268r14-patch-clock.
import sys, os
g = sys.argv[1]

def sub(path, pairs):
    p = os.path.join(g, path)
    t = open(p, encoding="utf-8").read()
    for a, b in pairs:
        assert a in t, (path, a[:70])
        t = t.replace(a, b)
    open(p, "w", encoding="utf-8", newline="\n").write(t)

sub("scripts/ui/battle.gd", [
    ("_tl.custom_minimum_size.y = 112", "_tl.custom_minimum_size.y = 82"),
])
sub("scripts/ui/s268_timeline.gd", [
    ("var r := 27.0 if front else 19.0", "var r := 20.0 if front else 14.0   # round 15: smaller"),
    ("_diamond(Vector2(x0, y), 24.0)", "_diamond(Vector2(x0, y), 17.0)"),
    ("Vector2(x0, y - 24.0)", "Vector2(x0, y - 17.0)"),
    ("_diamond(Vector2(tx, y), 4.0), LINE_COL)", "_diamond(Vector2(tx, y), 3.0), LINE_COL)"),
    ("draw_line(Vector2(x0, y), Vector2(x1, y), LINE_COL, 2.0)", "draw_line(Vector2(x0, y), Vector2(x1, y), LINE_COL, 1.5)"),
    ("Rect2(x0, y - 5.0, (x1 - x0) * 0.55, 10.0)", "Rect2(x0, y - 3.5, (x1 - x0) * 0.55, 7.0)"),
    ("var x0 := 34.0", "var x0 := 26.0"),
    ("_diamond(c, r + 2.5), frame)", "_diamond(c, r + 2.0), frame)"),
    ("var dy := (r + 2.5) *", "var dy := (r + 2.0) *"),
])
print("ok tl small")
