# set 268 round 14 (owner 21 Nov): the clock top-right looks like the STOP word under the pause button —
# no plate, icon grey-blue #9fadb6 text with the icon's dark outline. Run after s268r13-patch-tl-sides.
import sys, os
g = sys.argv[1]
p = os.path.join(g, "scripts/ui/battle.gd")
t = open(p, encoding="utf-8").read()
a = "\tcp.add_child(clock)\n\thud.add_child(cp)\n"
assert a in t
t = t.replace(a, a + "\tcp.add_theme_stylebox_override(\"panel\", StyleBoxEmpty.new())   # round 14: no plate, like the STOP word\n"
    "\tclock.add_theme_color_override(\"font_color\", Color(\"#9fadb6\", 0.95))\n"
    "\tclock.add_theme_color_override(\"font_outline_color\", Color(\"#16202a\", 0.8))\n"
    "\tclock.add_theme_constant_override(\"outline_size\", 4)\n", 1)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok clock")
