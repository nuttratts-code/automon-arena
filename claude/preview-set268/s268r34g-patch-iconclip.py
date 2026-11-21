# set 268 round 34g — owner: "art may poke out of the frame, but never onto the white line" -> each queue head picture is
# cut at a limit 3 px under the group line (line y - 28 -> limit y - 25); below it the art may still leave the frame.
# usage: python s268r34g-patch-iconclip.py <g268>   (after r34f)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()
a = """			var s2 := 2.0 * r * ICON_K
			draw_texture_rect(ic, Rect2(c - Vector2(s2, s2) * 0.5, Vector2(s2, s2)), false)
	for k in _qx.keys():"""
b = """			var s2 := 2.0 * r * ICON_K
			var top := c.y - s2 * 0.5
			var lim := y - 20.0 - 8.0 + 3.0 # s268r34g: 3 px under the group line
			var cut := clampf(lim - top, 0.0, s2 - 1.0)
			var tsz := ic.get_size()
			draw_texture_rect_region(ic, Rect2(c.x - s2 * 0.5, top + cut, s2, s2 - cut), Rect2(0.0, tsz.y * cut / s2, tsz.x, tsz.y * (s2 - cut) / s2))
	for k in _qx.keys():"""
if "s268r34g" not in s:
    assert a in s
    s = s.replace(a, b, 1)
    open(p, "w", encoding="utf-8").write(s)
print("ok")
