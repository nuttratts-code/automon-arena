# set 299 round 37b (sample, after s299r37a): owner crops "what is this?" (dark notch at the bottom-right cut + a dark line on the
#   left outside the green) + "bring back the coloured edge line on the frame"
#   cause: the ring was a 6 px thick polyline -> open joints at the cut corners + its outer pixel column not covered, so the
#   card body fill showed as a dark notch / line. Fix: ring = filled quads between the outer outline (cut 6) and the inner
#   outline (inset 6, cut 2.49), subdivided every 2 px with per-vertex colour; the plate's 1 px edge line (pl[4]) back on top
import sys, pathlib, shutil
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pp = g / "scripts/ui/s299_prep.gd"
shutil.copy(pp, g / "bak286_s299_prep.gd.s299r37a")
s = pp.read_text(encoding="utf-8")
i0 = s.index("static func frame_cell(")
body = s[i0:]
a = body.index("	var p := _pts(Rect2(Vector2.ZERO, cs).grow(-fw * 0.5)")
b = body.index("	ci.draw_polyline_colors(q, cv, fw)\n") + len("	ci.draw_polyline_colors(q, cv, fw)\n")
body = body[:a] + """	var po := _pts(Rect2(Vector2.ZERO, cs), k, k)   # r37b: filled ring, no open joints
	var pn := _pts(Rect2(Vector2.ZERO, cs).grow(-fw), k - fw * 0.5858, k - fw * 0.5858)
	if po.size() == pn.size():
		for i in po.size():
			var o0: Vector2 = po[i]
			var o1: Vector2 = po[(i + 1) % po.size()]
			var n0: Vector2 = pn[i]
			var n1: Vector2 = pn[(i + 1) % pn.size()]
			var m := maxi(1, int(o0.distance_to(o1) / 2.0))
			for j in m:
				var ta := float(j) / m
				var tb := float(j + 1) / m
				var qa := o0.lerp(o1, ta)
				var qb := o0.lerp(o1, tb)
				var qc := n0.lerp(n1, tb)
				var qd := n0.lerp(n1, ta)
				ci.draw_polygon(PackedVector2Array([qa, qb, qc, qd]), PackedColorArray([_s_cs(st, qa.x, qa.y, ch), _s_cs(st, qb.x, qb.y, ch), _s_cs(st, qc.x, qc.y, ch), _s_cs(st, qd.x, qd.y, ch)]))
	var plc := TEAM._pl299()
	ci.draw_polyline(_pts(Rect2(Vector2.ZERO, cs).grow(-0.5), k - 0.5 * 0.5858, k - 0.5 * 0.5858) + PackedVector2Array([_pts(Rect2(Vector2.ZERO, cs).grow(-0.5), k - 0.5 * 0.5858, k - 0.5 * 0.5858)[0]]), Color(plc[4], minf(1.0, float(plc[5]) + 0.25)), 1.0)   # r37b: the plate's edge line back
""" + body[b:]
pp.write_text(s[:i0] + body, encoding="utf-8")
print("ok r37b")
