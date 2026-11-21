# set 268 round 18 (owner 21 Nov): band gap from the act frame = the same as the gap between the act diamond's two
# white frames (outer r 28, inner r 24 -> 4) · the running units' frames fade with the bar too (same curve as the
# line, floor 0.2 so a frame never disappears). Run after s268r17-patch-tl-gap-fade.
import sys, os
g = sys.argv[1]
p = os.path.join(g, "scripts/ui/s268_timeline.gd")
t = open(p, encoding="utf-8").read()
for a, b in [
    ("\t\tvar ge := x0 + 28.0 + 7.0", "\t\tvar ge := x0 + 28.0 + 4.0   # round 18: = gap between the two white frames"),
    ("\t\tdraw_colored_polygon(_diamond(c, r + 2.0), frame)\n",
     "\t\tdraw_colored_polygon(_diamond(c, r + 2.0), Color(frame, maxf(float(fx.call(c.x)), 0.2)))   # round 18: frame fades with the bar\n"),
]:
    assert a in t, a[:60]
    t = t.replace(a, b, 1)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok gap4 framefade")
