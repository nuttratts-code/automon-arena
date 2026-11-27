# set 303 r49: piece 2 = shop card frame (owner: sample sheet first S303r49-card-sample.png, then B1 grey body + tint in code,
# C1 pills/coin = next piece, brief sent as listed). Codex image_generation drew ONE empty card (2 cut corners TL+BR, gold
# bevel frame, dark name strip + gold rule, pure-grey body with a glow at the feet); attempt 1 of 2 used (S303r49-gpt-card-2tries.png).
# S303r49-split-card.py keyed it and split it into card_frame.png (frame + strip, body hole) and card_body.png (grey body).
# 9-slice (margin 30 src px, 0.31 base units per src px -> frame ~1.5x thicker than a plain stretch). _card(): body drawn with a tribe tint (hsv(h, s*0.75 <= 0.7, 1) x 1.45), creature, then the frame on top; strip = 20 % of height.
# Old hand-drawn gradient, glows, strip, rule, rings and inset removed. Text, badge, coin, price, pills unchanged.
# Usage: python s302r49-patch.py <g286> (after s302r48b; PNGs beside this file)
import sys, os, shutil
g = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(g, "ui_r48"), exist_ok=True)
for a, b in [("S303r49-card_frame.png", "card_frame.png"), ("S303r49-card_body.png", "card_body.png")]:
    shutil.copy(os.path.join(here, a), os.path.join(g, "ui_r48", b))
p = os.path.join(g, "scripts/ui/r43.gd")
s = open(p, encoding="utf-8").read()
if not os.path.exists(p + ".s302r49"): shutil.copy(p, p + ".s302r49")
def cut(s, a, b, new, keep_b=True):
    assert s.count(a) == 1 and s.count(b) == 1, (a[:50], b[:50], s.count(a), s.count(b))
    i = s.index(a); j = s.index(b)
    assert i < j
    return s[:i] + new + (s[j:] if keep_b else s[j + len(b):])
# 1) gradient + glows -> tinted grey body
s = cut(s, "\t# tribe gradient: deep tribe colour at the edges", "\tvar bh := 18.0\n",
"""\t# r49 C2/B1: painted card (GPT empty grey card), body tinted per tribe, frame drawn after the creature
\tif ci.texture_filter != CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS: ci.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
\tvar tint := Color.from_hsv(tc.h, clampf(tc.s * 0.75, 0.0, 0.7), 1.0) * 1.45
\ttint.a = fa
\t_nine(ci, _tex("card_body"), r, 30.0, 0.31, tint)   # r49: 9-slice, frame ~1.5x thicker than a plain stretch
""")
s = s.replace("\tvar bh := 18.0\n\tv._pic(", "\tvar bh := roundf(r.size.y * 0.20)\n\tv._pic(", 1)
assert "roundf(r.size.y * 0.20)" in s
# 2) strip rect + tribe rule -> frame texture
s = cut(s, "\tci.draw_rect(Rect2(r.position.x + 1, r.position.y + 1, r.size.x - 2, bh), Color(Color.from_hsv(tc.h, 0.30, 0.15), 0.92))",
        "\tif ts.size() > 0:\n\t\tv._badge(",
"""\t_nine(ci, _tex("card_frame"), r, 30.0, 0.31, Color(1, 1, 1, fa))   # r49: frame + strip over the creature
""")
# 3) old rings + inset removed
s = cut(s, "\t# frame: dark rim + gold line\n", "\tif owned: ci.draw_rect(Rect2(w - 9, h - 9, 4, 4)", "")
# loader
s = s.replace("static var _ftex: Texture2D\n", """static var _texs := {}
static func _tex(n: String) -> Texture2D:   # r49: sample-only runtime load of ui_r48/<n>.png (scratch, not imported)
\tif not _texs.has(n):
\t\tvar img := Image.load_from_file(ProjectSettings.globalize_path("res://ui_r48/%s.png" % n))
\t\timg.generate_mipmaps()
\t\t_texs[n] = ImageTexture.create_from_image(img)
\treturn _texs[n]

static func _nine(ci: CanvasItem, t: Texture2D, r: Rect2, m: float, sc: float, mod: Color) -> void:   # r49: corners keep m*sc, middle stretches
\tvar tw := float(t.get_width())
\tvar th := float(t.get_height())
\tvar d := m * sc
\tvar sx := [0.0, m, tw - m, tw]
\tvar sy := [0.0, m, th - m, th]
\tvar dx := [r.position.x, r.position.x + d, r.end.x - d, r.end.x]
\tvar dy := [r.position.y, r.position.y + d, r.end.y - d, r.end.y]
\tfor i in 3:
\t\tfor j in 3:
\t\t\tci.draw_texture_rect_region(t, Rect2(dx[i], dy[j], dx[i + 1] - dx[i], dy[j + 1] - dy[j]), Rect2(sx[i], sy[j], sx[i + 1] - sx[i], sy[j + 1] - sy[j]), mod)

static var _ftex: Texture2D
""", 1)
assert "static func _tex(" in s
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("r49 ok")
