# set 302 r43b: wider Fight (picture), bench shifted left to make room; Fight label right of the swords; brighter tribe cards; smaller card name
import sys, os, shutil
g = sys.argv[1]
def patch(rel, pairs):
    p = os.path.join(g, rel)
    s = open(p, encoding="utf-8").read()
    if not os.path.exists(p + ".s302r43b"): shutil.copy(p, p + ".s302r43b")
    for old, new in pairs:
        assert s.count(old) == 1, (rel, old[:70], s.count(old))
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8", newline="\n").write(s)
patch("scripts/ui/prep.gd", [
    ("\t\t\tbtn_fight.offset_bottom = 138\n",
     "\t\t\tbtn_fight.offset_bottom = 138\n"
     "\t\t\tif OS.get_environment(\"S302R43\") == \"1\":   # r43: Fight as wide as the picture's, bench moved left\n"
     "\t\t\t\tbtn_fight.offset_left -= 58\n"
     "\t\t\t\tif bench_row != null: _mv299(bench_row, tr, 0.5, -168, 244, 72, 138)\n"),
])
patch("scripts/ui/r43.gd", [
    ("\t\tl.add_theme_constant_override(\"shadow_offset_y\", 2)\n\tfor st in",
     "\t\tl.add_theme_constant_override(\"shadow_offset_y\", 2)\n\t\tl.anchor_left = 0.30\n\tfor st in"),
    ("\tvar c := Vector2(inr.position.x + inr.size.x * 0.27, inr.position.y + inr.size.y * 0.5)\n\tvar s := inr.size.y * 0.30\n",
     "\tvar c := Vector2(inr.position.x + inr.size.x * 0.24, inr.position.y + inr.size.y * 0.5)\n\tvar s := inr.size.y * 0.24\n"),
    ("\tvar base := Color.from_hsv(tc.h, clampf(tc.s * 0.85, 0.0, 0.75), 0.42)\n\t_grad(ci, _cut(r, k), base.darkened(0.35), base.darkened(0.55), r)\n",
     "\tvar base := Color.from_hsv(tc.h, clampf(tc.s * 0.95, 0.0, 0.85), 0.62)\n\t_grad(ci, _cut(r, k), base.darkened(0.30), base.darkened(0.62), r)\n"),
    ("Color(Color.from_hsv(tc.h, clampf(tc.s * 0.7, 0.0, 0.7), 0.78), 0.05)",
     "Color(Color.from_hsv(tc.h, clampf(tc.s * 0.75, 0.0, 0.75), 0.92), 0.06)"),
    ("\tv._txt(ci, fb, Vector2(r.position.x + 21, r.position.y + bh - 4), nm, 10, Color(\"#f4f1ea\"), 0, Color.BLACK, false)\n\tvar ps: String = v._num(price)\n\tvar pw := fd.get_string_size(ps, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x\n",
     "\tvar ps: String = v._num(price)\n\tvar pw := fd.get_string_size(ps, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x\n\tvar room := r.size.x - 21 - pw - 24\n\tvar nfs := 10\n\twhile nfs > 7 and fb.get_string_size(nm, HORIZONTAL_ALIGNMENT_LEFT, -1, nfs).x > room: nfs -= 1\n\tv._txt(ci, fb, Vector2(r.position.x + 21, r.position.y + bh - 4), nm, nfs, Color(\"#f4f1ea\"), 0, Color.BLACK, false)\n"),
])
print("s302r43b patched")
