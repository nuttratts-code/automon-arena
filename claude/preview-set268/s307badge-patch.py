# set 307 tribe badge on the shop card: grey sphere (S307-orb.png, PIL; set 307 a GPT medallion retired) tinted by the tribe colour + white highlight layer
# replaces the flat code circle; the owner's white glyph (r38w, note 190) stays, a bit smaller inside the rim.
# Usage: python s307badge-patch.py <g286> (after s307card)
import sys, os, shutil
here = os.path.dirname(os.path.abspath(__file__)); g = sys.argv[1]
shutil.copy(os.path.join(here, "S307-orb.png"), os.path.join(g, "ui_r48", "medallion.png"))
shutil.copy(os.path.join(here, "S307-orb-spec.png"), os.path.join(g, "ui_r48", "medallion_spec.png"))   # set 307 c: white highlight, untinted
p = os.path.join(g, "scripts", "ui", "r43.gd")
s = open(p, encoding="utf-8", newline="").read()
if not os.path.exists(p + ".s307badge"): shutil.copy(p, p + ".s307badge")
SPEC = "\t\tci.draw_texture_rect(_tex(\"medallion_spec\"), Rect2(bc - Vector2(md, md) * 0.5, Vector2(md, md)), false, Color(1, 1, 1, fa))   # set 307 c\n"
old = "\t\tv._badge(ci, Vector2(r.position.x + 11, r.position.y + 1 + bh * 0.5), 12.0, str(ts[0]), tc, 2)\n"
if old not in s:   # already patched (set 307 b) -> only add the white highlight layer once
    if "medallion_spec" not in s:
        k = s.index("\t\tvar gl: Texture2D = BADGE50.glyph(str(ts[0]))\n"); s = s[:k] + SPEC + s[k:]
    open(p, "w", encoding="utf-8", newline="").write(s); print("s307badge ok (spec)")
else:
    new = ("\t\tvar bc := Vector2(r.position.x + 11, r.position.y + 1 + bh * 0.5)   # set 307: painted medallion + owner glyph\n"
           "\t\tvar md := 15.0\n"
           "\t\tci.draw_texture_rect(_tex(\"medallion\"), Rect2(bc - Vector2(md, md) * 0.5, Vector2(md, md)), false, Color(tc.r, tc.g, tc.b, fa))\n"
           "\t\tvar gl: Texture2D = BADGE50.glyph(str(ts[0]))\n"
           "\t\tif gl != null:\n"
           "\t\t\tvar gs := md * 0.56\n"
           "\t\t\tci.draw_texture_rect(gl, Rect2(bc - Vector2(gs, gs) * 0.5, Vector2(gs, gs)), false, Color(1, 1, 1, fa))\n")
    s = s.replace(old, new)
    open(p, "w", encoding="utf-8", newline="").write(s)
    print("s307badge ok")

# set 307 e (owner fire target): owner grey orb (S307e-orb.py -> S307-orb.png + spec), glyph 57 % and cream.
# Runs on a fresh or an already patched r43.gd.
s = open(p, encoding="utf-8", newline="").read()
s = s.replace("\t\t\tvar gs := md * 0.56\n", "\t\t\tvar gs := md * 0.57\n")
s = s.replace("Rect2(bc - Vector2(gs, gs) * 0.5, Vector2(gs, gs)), false, Color(1, 1, 1, fa))",
              "Rect2(bc - Vector2(gs, gs) * 0.5, Vector2(gs, gs)), false, Color(0.98, 0.965, 0.945, fa))")
open(p, "w", encoding="utf-8", newline="").write(s); print("s307badge e ok")

# set 307 f: owner "why flat?" -> cause: tc is the muted card colour (r39l S299CSAT/CVAL), multiply turns the shadow brown-grey.
# Badge only: vivid tribe colour = the owner fire target's mid red (238,69,31) -> s 0.87, v 0.93. Cards stay muted (r39l).
s = open(p, encoding="utf-8", newline="").read()
s = s.replace("Vector2(md, md)), false, Color(tc.r, tc.g, tc.b, fa))\n",
              "Vector2(md, md)), false, Color.from_hsv(tc.h, 0.87, 0.93, fa))   # set 307 f: vivid badge\n")
open(p, "w", encoding="utf-8", newline="").write(s); print("s307badge f ok")

# set 307 g (owner G1 + "steel = grey"): badge colour = the painted card body hue (median of ui_r48/card_body_<tribe>.png), s .87 v .93;
# steel = grey (s .10 v .78) instead of the card's faint blue. Fallback (no painted body) = f.
s = open(p, encoding="utf-8", newline="").read()
OLDF = "Vector2(md, md)), false, Color.from_hsv(tc.h, 0.87, 0.93, fa))   # set 307 f: vivid badge\n"
NEWG = "Vector2(md, md)), false, _badge_col307(tk, tc, fa))   # set 307 g: card body hue (owner G1)\n"
if OLDF in s:
    s = s.replace(OLDF, NEWG)
    s += ("\n\n# set 307 g (owner G1): tribe badge = card body hue (median of the painted card_body_<tribe>), steel = grey\n"
          "static func _badge_col307(tk: String, tc: Color, fa: float) -> Color:\n"
          "\tvar H := {\"fire\": 0.014, \"bolt\": 0.124, \"wind\": 0.486, \"spirit\": 0.729, \"fiend\": 0.912}\n"
          "\tif tk == \"steel\": return Color.from_hsv(0.59, 0.10, 0.78, fa)\n"
          "\treturn Color.from_hsv(float(H.get(tk, tc.h)), 0.87, 0.93, fa)\n")
open(p, "w", encoding="utf-8", newline="").write(s); print("s307badge g ok")
