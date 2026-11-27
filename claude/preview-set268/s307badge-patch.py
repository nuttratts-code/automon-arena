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
    open(p, "w", encoding="utf-8", newline="").write(s); print("s307badge ok (spec)"); sys.exit(0)
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
