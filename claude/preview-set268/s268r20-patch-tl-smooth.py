# set 268 round 20 (owner 21 Nov, after the live window): "the unit frames don't fade; make the arrival at the left smoother".
# - frame + the dark tile behind each running icon fade with the bar (frame = bar curve, floor 0.12; tile 35 % -> 100 %)
# - arrival: the portrait grows smoothly (r 14 -> 20 over the last 15 %) instead of popping at 97 %, fades out in the last
#   4 % while the act diamond fades its icon in; after acting the icon stays in the act diamond and fades out over the
#   first 15 % of the next cooldown; a unit that restarts at the right end fades in over the first 6 %.
# Run after s268r19-patch-livebattle.
import sys, os
g = sys.argv[1]
p = os.path.join(g, "scripts/ui/s268_timeline.gd")
t = open(p, encoding="utf-8").read()
pairs = [
    ("\t\tvar front := f > 0.97\n\t\tvar r := 20.0 if front else 14.0   # round 15: smaller\n",
     "\t\tvar r := lerpf(14.0, 20.0, smoothstep(0.85, 1.0, f))   # round 20: grows smoothly toward the act point\n"
     "\t\tvar ua := smoothstep(0.0, 0.06, f) * (1.0 - smoothstep(0.96, 1.0, f))   # fade in at the right end, out on arrival\n"),
    ("\t\tdraw_colored_polygon(_diamond(c, r + 2.0), Color(frame, maxf(float(fx.call(c.x)), 0.2)))   # round 18: frame fades with the bar\n",
     "\t\tvar fa := maxf(float(fx.call(c.x)), 0.12)   # round 20: frame + tile fade with the bar\n"
     "\t\tdraw_colored_polygon(_diamond(c, r + 2.0), Color(frame, fa * ua))\n"),
    ("\t\t\tdraw_colored_polygon(pts, Color(0.16, 0.22, 0.30))\n\t\t\tvar s2 := 2.0 * r * ICON_K\n\t\t\tdraw_texture_rect(ic, Rect2(c - Vector2(s2, s2) * 0.5, Vector2(s2, s2)), false)\n",
     "\t\t\tdraw_colored_polygon(pts, Color(0.16, 0.22, 0.30, (0.35 + 0.65 * fa) * ua))\n\t\t\tvar s2 := 2.0 * r * ICON_K\n\t\t\tdraw_texture_rect(ic, Rect2(c - Vector2(s2, s2) * 0.5, Vector2(s2, s2)), false, Color(1, 1, 1, ua))\n"),
    ("\tif not items.is_empty():\n\t\tvar nx: Dictionary = items[items.size() - 1][1]\n\t\tvar nic: Texture2D = _icon(int(nx[\"uid\"]))\n\t\tif nic != null:\n\t\t\tvar s3 := 2.0 * ar * ICON_K\n\t\t\tdraw_texture_rect(nic, Rect2(ac - Vector2(s3, s3) * 0.5, Vector2(s3, s3)), false)\n",
     "\tif not items.is_empty():   # round 20: arriving unit fades in, the one that just acted fades out\n"
     "\t\tvar s3 := 2.0 * ar * ICON_K\n"
     "\t\tfor pick in [[items[0], 1.0 - smoothstep(0.93, 1.0, float(items[items.size() - 1][0]))], [items[items.size() - 1], smoothstep(0.93, 1.0, float(items[items.size() - 1][0]))]]:   # round 21: the last arrival stays until the next one crossfades in\n"
     "\t\t\tvar aa: float = pick[1]\n"
     "\t\t\tif aa <= 0.01: continue\n"
     "\t\t\tvar nic: Texture2D = _icon(int(pick[0][1][\"uid\"]))\n"
     "\t\t\tif nic != null:\n"
     "\t\t\t\tdraw_texture_rect(nic, Rect2(ac - Vector2(s3, s3) * 0.5, Vector2(s3, s3)), false, Color(1, 1, 1, aa))\n"),
]
for a, b in pairs:
    assert a in t, a[:70]
    t = t.replace(a, b, 1)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok smooth")
