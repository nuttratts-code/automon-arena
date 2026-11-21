# set 268 round 34i — owner: "make the band blue like the other screens, fading top to bottom" -> group shade = the battle
# buttons' teal-blue tile colour (#1d6079, set 268 r8: 62 %) at 0.62 under the line, fading to 0 at the bottom.
# usage: python s268r34i-patch-shadeblue.py <g268>   (after r34h)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()
a = "draw_rect(Rect2(a, ly, b - a, (y - 20.0 + 2.0 * gr_r + 8.0) - ly), Color(1, 1, 1, 0.10), true)"
b = """var by := y - 20.0 + 2.0 * gr_r + 8.0 # s268r34i: teal-blue (battle buttons #1d6079) fading top -> bottom
			var bt := Color("#1d6079", 0.62); var bb := Color("#1d6079", 0.0)
			draw_polygon(PackedVector2Array([Vector2(a, ly), Vector2(b, ly), Vector2(b, by), Vector2(a, by)]), PackedColorArray([bt, bt, bb, bb]))"""
if "s268r34i" not in s:
    assert a in s
    s = s.replace(a, b, 1)
    open(p, "w", encoding="utf-8").write(s)
print("ok")
