# set 303 r48: owner C2 (27 Nov) -- painted pieces instead of hand-tuned colours, one piece at a time. Piece 1 = Fight button.
# ChatGPT (Codex image_generation, gpt-6.2-sol) drew an EMPTY copy of the target's Fight button (no text/icon) on magenta;
# Claude keyed + trimmed it (S303r48-fight_btn.png, 653x300) and fight() now draws it as a 3-slice (height fits, corners
# fixed, middle stretches). Swords + label stay in code. Variants sheet: S303r48-gpt-fight-variants.png (variant 1 used).
# Usage: python s302r48-patch.py <g286> (after s302r47; the PNG must sit beside this file)
import sys, os, shutil
g = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(g, "ui_r48"), exist_ok=True)
shutil.copy(os.path.join(here, "S303r48-fight_btn.png"), os.path.join(g, "ui_r48", "fight_btn.png"))
p = os.path.join(g, "scripts/ui/r43.gd")
s = open(p, encoding="utf-8").read()
if not os.path.exists(p + ".s302r48"): shutil.copy(p, p + ".s302r48")
a = "static func fight(ci: CanvasItem, r: Rect2, hv: bool) -> void:\n\tvar k := 14.0\n"
b = "\t# crossed swords, left of the label\n"
assert s.count(a) == 1 and s.count(b) == 1, "markers"
i = s.index(a) + len(a); j = s.index(b)
old = s[i:j]
assert "r47 GPT: dark face" in old and "glowing cyan inner edge" in old, "old fight body"
new = """\tshadow(ci, _cut4, r, k, 1.0)
\t# r48 C2: painted button (GPT-drawn empty copy of the target), 3-slice by height
\tif ci.texture_filter != CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS: ci.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
\t_three(ci, _fight_tex(), r.grow(2.0), 0.27, Color(1.12, 1.12, 1.12) if hv else Color.WHITE)
\tvar inr := r.grow(-4.0)
"""
s = s[:i] + new + s[j:]
helpers = """static var _ftex: Texture2D
static func _fight_tex() -> Texture2D:   # r48: sample-only runtime load (scratch, not imported)
\tif _ftex == null:
\t\tvar img := Image.load_from_file(ProjectSettings.globalize_path("res://ui_r48/fight_btn.png"))
\t\timg.generate_mipmaps()
\t\t_ftex = ImageTexture.create_from_image(img)
\treturn _ftex

static func _three(ci: CanvasItem, tex: Texture2D, r: Rect2, mf: float, mod: Color) -> void:
\tvar tw := float(tex.get_width())
\tvar th := float(tex.get_height())
\tvar m := th * mf
\tvar md := m * r.size.y / th
\tci.draw_texture_rect_region(tex, Rect2(r.position, Vector2(md, r.size.y)), Rect2(0, 0, m, th), mod)
\tci.draw_texture_rect_region(tex, Rect2(r.position + Vector2(md, 0), Vector2(r.size.x - 2.0 * md, r.size.y)), Rect2(m, 0, tw - 2.0 * m, th), mod)
\tci.draw_texture_rect_region(tex, Rect2(Vector2(r.end.x - md, r.position.y), Vector2(md, r.size.y)), Rect2(tw - m, 0, m, th), mod)

"""
s = s.replace(a, helpers + a)
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("r48 ok")
