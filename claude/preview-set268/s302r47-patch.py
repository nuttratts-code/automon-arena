# set 303 r47: ChatGPT (Codex, gpt-6.2-sol) read the target vs r46 and gave per-element values (S303-gpt-colours.txt).
# Top 5 applied: Fight dark face + cyan only in short top/bottom highlights · shop plate blue-green charcoal #182C36 -> #0B1318, black drop ·
# cards dark muted body + local glow at the feet (tribe hue kept) · muted gold #B19358 / bevel #C9B17C / shade #7B6238 ·
# bench tray 70 % + sockets #253034 -> #171F21, no doubled inset, warm plus. + lock/reroll fills, text colours.
# Usage: python s302r47-patch.py <g286> (after s302r46)
import sys, os, shutil
g = sys.argv[1]
def patch(rel, pairs):
    p = os.path.join(g, rel)
    s = open(p, encoding="utf-8").read()
    if not os.path.exists(p + ".s302r47"): shutil.copy(p, p + ".s302r47")
    for old, new in pairs:
        old = old.replace("    ", "\t"); new = new.replace("    ", "\t")
        assert s.count(old) == 1, (rel, old[:70], s.count(old))
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8", newline="\n").write(s)

patch("scripts/ui/r43.gd", [
    ('const GOLD := "#c9a45c"', 'const GOLD := "#B19358"   # r47 GPT: muted gold'),
    ('const G_LIT := "#E3A942"', 'const G_LIT := "#C9B17C"'),
    ('const G_SHD := "#6F5129"', 'const G_SHD := "#7B6238"'),
    # drop shadow: black, ~60 %
    ('ci.draw_polygon(p_of.call(g, k + i * 1.2), PackedColorArray([Color(Color("#070D12"), 0.11 * a)]))',
     'ci.draw_polygon(p_of.call(g, k + i * 1.2), PackedColorArray([Color(0, 0, 0, 0.13 * a)]))'),
    # plate fills
    ("""static func panel(ci: CanvasItem, r: Rect2, k: float, a: float, base := "#0D1A21") -> void:
    shadow(ci, _cut, r, k, a)
    var b := Color(base)
    _grad(ci, _cut(r, k), Color(b.lightened(0.06), 0.96 * a), Color(b.darkened(0.15), 0.96 * a), r)
""",
     """static func panel(ci: CanvasItem, r: Rect2, k: float, a: float, base := "#182C36", bot := "#0B1318") -> void:
    shadow(ci, _cut, r, k, a)
    _grad(ci, _cut(r, k), Color(Color(base), 0.97 * a), Color(Color(bot), 0.97 * a), r)   # r47 GPT
"""),
    ("""    var b := Color("#0D1A21")
    _grad(ci, _step(r, k), Color(b.lightened(0.06), 0.96 * a), Color(b.darkened(0.15), 0.96 * a), r)
""",
     """    _grad(ci, _step(r, k), Color(Color("#182C36"), 0.97 * a), Color(Color("#0B1318"), 0.97 * a), r)   # r47 GPT
"""),
    ('panel(ci, r, K, 1.0, "#091D2B")', 'panel(ci, r, K, 1.0, "#142A33", "#0C171D")'),
    ("    var col := Color(Color(GOLD), 0.16)\n", "    var col := Color(Color(\"#A68E52\"), 0.28)   # r47 GPT watermark\n"),
    # lock / reroll fills (vertical, neutral) + warm/cool sheen
    ("""    var cs := PackedColorArray()   # r45 B1: bar lit from the right (picture)
    for v in p:
        var t := clampf((v.x - r.position.x) / maxf(r.size.x, 1.0), 0.0, 1.0)
        cs.append(Color("#141f33").lerp(Color("#2a3d5c"), t).lightened(0.07 if hv else 0.0))
    ci.draw_polygon(p, cs)
""",
     """    var rr := nm == "Reroll"   # r47 GPT: lock #252829 -> #10191D, reroll #26343C -> #101C24
    _grad(ci, p, Color("#26343C" if rr else "#252829").lightened(0.08 if hv else 0.0), Color("#101C24" if rr else "#10191D"), r)
"""),
    ("ci.draw_polygon(sh, PackedColorArray([Color(1, 1, 1, 0.09)]))",
     "ci.draw_polygon(sh, PackedColorArray([Color(Color(\"#75A6BD\" if nm == \"Reroll\" else \"#B59A65\"), 0.10)]))"),
    # Fight: dark face, muted gold frame, cyan only as a thin bevel + short top/bottom highlights
    ("""        _ring(ci, _cut4(r.grow(3.0 + i * 1.8), k + 1.5 + i * 0.8), Color(Color("#6fe0ff"), (0.20 - i * 0.035) * (1.2 if hv else 1.0)), 2.0)""",
     """        _ring(ci, _cut4(r.grow(3.0 + i * 1.8), k + 1.5 + i * 0.8), Color(Color("#6fe0ff"), (0.05 - i * 0.009) * (1.6 if hv else 1.0)), 2.0)"""),
    ("""    _grad(ci, _cut4(r, k), Color("#b88a3c"), Color(G_SHD), r)   # gold frame (r46: lit top, shade bottom)""",
     """    _grad(ci, _cut4(r, k), Color("#D4B575"), Color("#8E6E3C"), r)   # r47 GPT gold frame"""),
    ("""Color("#12648A").lightened(0.12 if hv else 0.0), Color("#0E8EB3").lightened(0.12 if hv else 0.0), inr)   # r46 spec §2""",
     """Color("#153D4E").lightened(0.12 if hv else 0.0), Color("#0C2B39").lightened(0.12 if hv else 0.0), inr)   # r47 GPT: dark face
    ci.draw_circle(inr.get_center(), inr.size.y * 0.55, Color(Color("#167497"), 0.22), true, -1.0, true)   # centre wash
    for e in [inr.position.y + 2.0, inr.end.y - 2.0]:   # short cyan highlights, top + bottom centre
        for j in 4:
            var hw := inr.size.x * (0.22 - j * 0.03)
            ci.draw_line(Vector2(inr.get_center().x - hw, e), Vector2(inr.get_center().x + hw, e), Color(Color("#29CFFF") if j < 3 else Color("#8AEAFF"), 0.18 if j < 3 else 0.95), 6.0 - j * 1.5, true)"""),
    ("(1.0 if i == 0 else 0.42 - i * 0.065)", "(0.65 if i == 0 else 0.0)"),
    ('Color(Color("#6fe0ff"), (0.65', 'Color(Color("#3D9BB6"), (0.65'),
    # text
    ('Color("#F5F0DF"))   # r46 spec', 'Color("#F5F4ED"))   # r47 GPT'),
    # bench: tray 70 %, own colours; sockets
    ("""        panel(ci, tr, K, 1.0)
""",
     """        shadow(ci, _cut, tr, K, 0.75)
        _grad(ci, _cut(tr, K), Color(Color("#242824"), 0.70), Color(Color("#151A19"), 0.70), tr)   # r47 GPT tray
        _ring(ci, _cut(tr.grow(-1.0), K), Color("#665C45"), 2.0)
        ci.draw_line(tr.position + Vector2(K, 1.5), Vector2(tr.end.x - 2, tr.position.y + 1.5), Color("#A1926E"), 1.0)
"""),
    ('_grad(ci, p, Color(Color("#1A262E"), 0.95), Color(Color("#19242C"), 0.95), r)   # r46 spec §2',
     '_grad(ci, p, Color("#253034"), Color("#171F21"), r)   # r47 GPT'),
    ("""    _ring(ci, _cut(r.grow(-3.5), 4.0), Color(Color(GOLD), 0.18), 1.0)
""", ""),
    ('        var pc := Color("#8d96a3")', '        var pc := Color("#9B9788")'),
    # cards: dark muted body in the tribe hue + local glow at the feet; name strip tinted; tribe rule; thin inner frame
    ("""    var base := Color.from_hsv(tc.h, clampf(tc.s * 1.1, 0.0, 1.0), 0.82)
""",
     """    var base := Color.from_hsv(tc.h, clampf(tc.s * 0.62, 0.0, 0.62), 0.36)   # r47 GPT: muted, dark
"""),
    ("_grad(ci, _cut(r, k), base.darkened(0.62), base.darkened(0.18), r)   # r46 spec §3: dark behind the name",
     "_grad(ci, _cut(r, k), base.darkened(0.42), base, r)   # r47 GPT: darker top -> body colour at the feet"),
    ("""    var lc := Color.from_hsv(tc.h, clampf(tc.s * 0.60, 0.0, 0.70), 1.0)
    for i in 9:""",
     """    var lc := Color.from_hsv(tc.h, clampf(tc.s * 0.62, 0.0, 0.65), 1.0)
    for i in 0:"""),
    ("""    for i in 8:
        ci.draw_circle(Vector2(w * 0.60, h * 0.58), h * (0.50 - i * 0.05), Color(lc, 0.035), true, -1.0, true)
""",
     """    for i in 12:   # r47 GPT: local glow at 55 % across / 85 % down, ~50 % at the centre, gone at 55 % of the card width
        var rx := w * 0.55 * (1.0 - i * 0.08)
        var pts := PackedVector2Array()
        for j in 40:
            var t := TAU * j / 40.0
            pts.append(Vector2(w * 0.55, h * 0.85) + Vector2(cos(t) * rx, sin(t) * rx * 0.62))
        ci.draw_polygon(pts, PackedColorArray([Color(lc, 0.055)]))
"""),
    ("ci.draw_rect(Rect2(r.position.x + 1, r.position.y + 1, r.size.x - 2, bh), Color(0.03, 0.05, 0.09, 0.82))",
     "ci.draw_rect(Rect2(r.position.x + 1, r.position.y + 1, r.size.x - 2, bh), Color(Color.from_hsv(tc.h, 0.30, 0.15), 0.92))   # r47 GPT tinted strip"),
    ("Vector2(r.end.x - 1, r.position.y + bh + 1), Color(Color(GOLD), 0.55 * fa), 1.0)",
     "Vector2(r.end.x - 1, r.position.y + bh + 1), Color(Color.from_hsv(tc.h, 0.40, 0.55), fa), 1.0)   # r47 GPT tribe rule"),
    ("    _ring(ci, _cut(ir, 4.0), Color(Color(GOLD), 0.45 * fa), 1.0)", "    _ring(ci, _cut(ir, 4.0), Color(Color(GOLD), 0.15 * fa), 1.0)   # r47: lighter inset"),
])

patch("scripts/ui/prep.gd", [
    ('gv.add_theme_color_override("font_color", Color("#FFD56A"))', 'gv.add_theme_color_override("font_color", Color("#FFD47B"))'),
    ('hv.add_theme_color_override("font_color", Color("#F58998"))', 'hv.add_theme_color_override("font_color", Color("#F49CA9"))'),
])
print("s302r47 patched")
# r47b (same round): cards brighter than GPT's values (they read too dull next to the target)
p = os.path.join(g, "scripts/ui/r43.gd"); s = open(p, encoding="utf-8").read()
for o, n in [("clampf(tc.s * 0.62, 0.0, 0.62), 0.36)   # r47 GPT: muted, dark", "clampf(tc.s * 0.85, 0.0, 0.85), 0.50)   # r47b: GPT values read too dull next to the target"),
             ("ci.draw_polygon(pts, PackedColorArray([Color(lc, 0.055)]))", "ci.draw_polygon(pts, PackedColorArray([Color(lc, 0.085)]))")]:
    assert s.count(o) == 1, o
    s = s.replace(o, n)
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("s302r47b patched")
