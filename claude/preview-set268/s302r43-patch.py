# set 302 r43: owner target look (S302R43=1). Usage: python s302r43-patch.py <g286>; needs r43.gd.txt beside it (copied to scripts/ui/r43.gd)
import sys, os, shutil
g = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, "r43.gd.txt")
if os.path.exists(src):
    shutil.copy(src, os.path.join(g, "scripts/ui/r43.gd"))

def patch(rel, pairs):
    p = os.path.join(g, rel)
    s = open(p, encoding="utf-8").read()
    if not os.path.exists(p + ".s302r43bak"): shutil.copy(p, p + ".s302r43bak")
    for old, new in pairs:
        assert s.count(old) == 1, (rel, old[:60], s.count(old))
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8", newline="\n").write(s)

R = 'load("res://scripts/ui/r43.gd")'
patch("scripts/ui/var299.gd", [
    ("static func plate(ci: CanvasItem, r: Rect2, k: float, a: float) -> void:\n",
     "static func plate(ci: CanvasItem, r: Rect2, k: float, a: float) -> void:\n\tif %s.on():\n\t\t%s.plate(ci, r, k, a)\n\t\treturn\n" % (R, R)),
    ("static func button(ci: CanvasItem, r: Rect2, nm: String, hv: bool) -> void:\n",
     "static func button(ci: CanvasItem, r: Rect2, nm: String, hv: bool) -> void:\n\tif %s.on():\n\t\t%s.button(ci, r, nm, hv)\n\t\treturn\n" % (R, R)),
    ("static func button_text(b: Button) -> void:   # the Fight button's own text\n",
     "static func button_text(b: Button) -> void:   # the Fight button's own text\n\tif %s.on():\n\t\t%s.button_text(b)\n\t\treturn\n" % (R, R)),
    ("static func text(l: Label) -> void:   # every label in the HUD (replaces the C3 heavy outline + shadow)\n",
     "static func text(l: Label) -> void:   # every label in the HUD (replaces the C3 heavy outline + shadow)\n\tif %s.on():\n\t\t%s.text(l)\n\t\treturn\n" % (R, R)),
    ("static func slot(ci: Control, filled: bool, shop: bool, line: Variant) -> void:\n",
     "static func slot(ci: Control, filled: bool, shop: bool, line: Variant) -> void:\n\tif %s.on():\n\t\t%s.slot(ci, filled, shop, line)\n\t\treturn\n" % (R, R)),
    ("static func card(cell: Control, c: Dictionary, ts: Array, cant: bool, owned: bool) -> void:\n",
     "static func card(cell: Control, c: Dictionary, ts: Array, cant: bool, owned: bool) -> void:\n\tif %s.on():\n\t\t%s.card(cell, c, ts, cant, owned)\n\t\treturn\n" % (R, R)),
])

patch("scripts/ui/prep.gd", [
    # layout: odds strip spans the whole plate top (Lv tab at its left end, over the lock column); lock + reroll below it
    ('\t\t\t_mv299(top.get_node_or_null("Reroll"), top, 0.5, -392, -181, 66, 122)\n',
     '\t\t\t_mv299(top.get_node_or_null("Reroll"), top, 0.5, -392, -181, 66, 122)\n'
     '\t\t\tif OS.get_environment("S302R43") == "1":   # r43: Lv tab top-left, lock + reroll under it\n'
     '\t\t\t\t_mv299(top.get_node_or_null("ShopOdds"), top, 0.5, -392, 389, 0, 22)\n'
     '\t\t\t\t_mv299(top.get_node_or_null("Reroll"), top, 0.5, -392, -181, 76, 122)\n'),
    ('\t\t\t_mv299(lb, top, 0.5, -392, -181, 0, 60)\n',
     '\t\t\t_mv299(lb, top, 0.5, -392, -181, 0, 60)\n'
     '\t\t\tif OS.get_environment("S302R43") == "1":\n'
     '\t\t\t\t_mv299(lb, top, 0.5, -392, -181, 28, 72)\n'),
    # Lv = a gold-trimmed tab
    ('\t\t\todds_row.offset_right = -10\n',
     '\t\t\todds_row.offset_right = -10\n'
     '\t\t\tif OS.get_environment("S302R43") == "1":   # r43: Lv tab (navy, gold trim, slanted sides)\n'
     '\t\t\t\tvar sb := StyleBoxFlat.new()\n'
     '\t\t\t\tsb.bg_color = Color("#0d182a")\n'
     '\t\t\t\tsb.border_color = Color("#c9a45c")\n'
     '\t\t\t\tsb.set_border_width_all(1)\n'
     '\t\t\t\tsb.skew = Vector2(0.35, 0)\n'
     '\t\t\t\tsb.content_margin_left = 22\n'
     '\t\t\t\tsb.content_margin_right = 22\n'
     '\t\t\t\tsb.content_margin_top = 0\n'
     '\t\t\t\tsb.content_margin_bottom = 0\n'
     '\t\t\t\tlvl.add_theme_stylebox_override("normal", sb)\n'
     '\t\t\t\tlvl.add_theme_font_size_override("font_size", 16)\n'
     '\t\t\t\todds_row.offset_left = 4\n'),
])

patch("scripts/ui/prep.gd", [('\tfor i in int(R.RULES()["shop"]["bench"]):\n', '\tfor i in (int(OS.get_environment("S302BENCH")) if OS.get_environment("S302BENCH") != "" else int(R.RULES()["shop"]["bench"])):   # SAMPLE set 302: 6 bench cells\n')])

patch("scripts/shop.gd", [
    ('\tbench.resize(int(S["bench"]))\n',
     '\tbench.resize(int(OS.get_environment("S302BENCH")) if OS.get_environment("S302BENCH") != "" else int(S["bench"]))   # SAMPLE set 302: 6 bench slots (owner A2, rule not changed yet)\n'),
])
print("s302r43 patched")
