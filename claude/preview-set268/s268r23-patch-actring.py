# set 268 round 23 — owner: act diamond rings carry side colours. Inner ring = side colour of the unit now in the slot
# (the last arrival), outer ring = side colour of the unit before it; on a new arrival both shift outward with the
# round 21 crossfade. Own side colour white -> blue (portrait frames too). Foe stays red.
# usage: python s268r23-patch-actring.py <g268>   (after s268r20-patch-tl-smooth.py)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()
if "s268r23" not in s:
    a = "const OWN_COL := Color(0.86, 0.92, 0.98)\n"
    assert a in s
    s = s.replace(a, "const OWN_COL := Color(0.30, 0.56, 0.95)   # s268r23: own side = blue (was white 0.86, 0.92, 0.98)\n")
    a = ("	draw_polyline(_diamond(ac, ar + 6.0) + PackedVector2Array([ac + Vector2(0, -ar - 6.0)]), OWN_COL, 1.5)\n"
         "	draw_colored_polygon(_diamond(ac, ar + 2.0), OWN_COL)\n")
    assert a in s
    b = ("	# s268r23 (owner): inner ring = side of the unit in the slot, outer = side of the one before; shift out on arrival\n"
         "	var ring_in := Color(0.86, 0.92, 0.98); var ring_out := Color(0.86, 0.92, 0.98)\n"
         "	if not items.is_empty():\n"
         "		var sc := func(it: Array) -> Color: return FOE_COL if int(it[1][\"side\"]) == 1 else OWN_COL\n"
         "		var tin := smoothstep(0.93, 1.0, float(items[items.size() - 1][0]))   # same crossfade as the icon (round 21)\n"
         "		var cur: Color = sc.call(items[0]); var prv: Color = sc.call(items[1] if items.size() > 1 else items[0])\n"
         "		ring_in = cur.lerp(sc.call(items[items.size() - 1]), tin)\n"
         "		ring_out = prv.lerp(cur, tin)\n"
         "	draw_polyline(_diamond(ac, ar + 6.0) + PackedVector2Array([ac + Vector2(0, -ar - 6.0)]), ring_out, 1.5)\n"
         "	draw_colored_polygon(_diamond(ac, ar + 2.0), ring_in)\n")
    s = s.replace(a, b)
    open(p, "w", encoding="utf-8").write(s)
print("ok")
