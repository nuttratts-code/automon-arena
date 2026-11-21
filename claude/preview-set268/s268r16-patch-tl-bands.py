# set 268 round 16 (owner 21 Nov, picture of another game's timeline end, NOT stored): "make the end like this, with a
# gradient that gets darker toward the edge, both sides, the foe's red".
# - the old teal trail -> two bands on the line: own band ABOVE (blue), foe band BELOW (red), clear at the right end,
#   darkest at the act point (left edge)
# - act point = bigger diamond with a double white frame holding the icon of the unit about to act (the reference's look)
# Run after s268r15-patch-tl-small.
import sys, os
g = sys.argv[1]
p = os.path.join(g, "scripts/ui/s268_timeline.gd")
t = open(p, encoding="utf-8").read()

a = "\tdraw_rect(Rect2(x0, y - 3.5, (x1 - x0) * 0.55, 7.0), Color(TRAIL_COL, 0.35))\n"
b = ("\t# round 16: side bands — own above (blue), foe below (red), darker toward the act point\n"
     "\tvar bh := 13.0\n"
     "\tfor sd in [[-1.0, Color(\"#1f4f86\")], [1.0, Color(\"#8c1e2c\")]]:\n"
     "\t\tvar yb := y + bh * float(sd[0])\n"
     "\t\tvar bc: Color = sd[1]\n"
     "\t\tvar xm := x0 + (x1 - x0) * 0.3   # 16b: steeper — dark at the act point, half by 30 %, clear at the right end\n"
     "\t\tvar dk := bc.darkened(0.35)\n"
     "\t\tdraw_polygon(PackedVector2Array([Vector2(x0, y), Vector2(xm, y), Vector2(xm, yb), Vector2(x0, yb)]),\n"
     "\t\t\tPackedColorArray([Color(dk, 0.95), Color(bc, 0.5), Color(bc, 0.5), Color(dk, 0.95)]))\n"
     "\t\tdraw_polygon(PackedVector2Array([Vector2(xm, y), Vector2(x1, y), Vector2(x1, yb), Vector2(xm, yb)]),\n"
     "\t\t\tPackedColorArray([Color(bc, 0.5), Color(bc, 0.0), Color(bc, 0.0), Color(bc, 0.5)]))\n")
assert a in t
t = t.replace(a, b, 1)

tail = "\t\telse:\n\t\t\tdraw_colored_polygon(pts, Color(0.16, 0.22, 0.30))\n"
assert t.endswith(tail)
t += ("\t# round 16: act point = big diamond, double white frame, icon of the unit about to act\n"
      "\tvar ar := 22.0\n"
      "\tvar ac := Vector2(x0, y)\n"
      "\tdraw_colored_polygon(_diamond(ac, ar + 6.0), Color(0.08, 0.12, 0.19, 0.9))\n"
      "\tdraw_polyline(_diamond(ac, ar + 6.0) + PackedVector2Array([ac + Vector2(0, -ar - 6.0)]), OWN_COL, 1.5)\n"
      "\tdraw_colored_polygon(_diamond(ac, ar + 2.0), OWN_COL)\n"
      "\tdraw_colored_polygon(_diamond(ac, ar), Color(0.16, 0.22, 0.30))\n"
      "\tif not items.is_empty():\n"
      "\t\tvar nx: Dictionary = items[items.size() - 1][1]\n"
      "\t\tvar nic: Texture2D = _icon(int(nx[\"uid\"]))\n"
      "\t\tif nic != null:\n"
      "\t\t\tvar s3 := 2.0 * ar * ICON_K\n"
      "\t\t\tdraw_texture_rect(nic, Rect2(ac - Vector2(s3, s3) * 0.5, Vector2(s3, s3)), false)\n")
open(p, "w", encoding="utf-8", newline="\n").write(t)

p = os.path.join(g, "scripts/ui/battle.gd")
t = open(p, encoding="utf-8").read()
a = "_tl.custom_minimum_size.y = 82"
assert a in t
t = t.replace(a, "_tl.custom_minimum_size.y = 86", 1)   # round 16: room for the bigger act diamond
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok tl bands")
