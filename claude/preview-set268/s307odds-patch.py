# set 307 odds tag (owner): Lv + drop odds leave the top row and hang under the shop plate, bottom-right, on a small copy of the
# painted plate: "Lv.1 | 100% 0% ..." (gold divider after Lv). Lock / reroll / cards / gold gutter move up 22 (owner: plate shorter).
# Book / skull HUD row moves below the hanging tag. Usage: python s307odds-patch.py <g286> (after s307plate)
import sys, os, shutil
g = sys.argv[1]
SEEN = set()
def patch(rel, pairs, tag="s307odds"):   # first touch of a file in this run starts from its backup (= reruns are clean)
    p = os.path.join(g, "scripts", "ui", rel)
    if not os.path.exists(p + "." + tag): shutil.copy(p, p + "." + tag)
    s = open(p + "." + tag if rel not in SEEN else p, encoding="utf-8", newline="").read(); SEEN.add(rel)
    for old, new in pairs:
        if new in s: continue
        assert old in s, (rel, old[:70]); s = s.replace(old, new, 1)
    open(p, "w", encoding="utf-8", newline="").write(s); print(rel, "ok")
patch("prep.gd", [
 ('\t\t\t\t_mv299(top.get_node_or_null("ShopOdds"), top, 0.5, -392, 389, 0, 22)\n\t\t\t\t_mv299(top.get_node_or_null("Reroll"), top, 0.5, -392, -190, 71, 123)   # r45 B1/B3\n',
  '\t\t\t\t_mv299(top.get_node_or_null("ShopOdds"), top, 0.5, 103, 381, 99.0 + PZS._inset(), 120.0 + PZS._inset())   # set 307: Lv + odds tag hangs under the plate, bottom-right\n'
  '\t\t\t\t_mv299(top.get_node_or_null("Reroll"), top, 0.5, -392, -190, 49, 101)   # r45 B1/B3 · set 307: up 22\n'
  '\t\t\t\t_mv299(top.get_node_or_null("Dock"), top, 0.5, -175, 389, 4, 100)   # set 307: up 22 (Lv row gone)\n'),
 ('(126.0 if OS.get_environment("S299LY") == "1" else 100.0) + PZS._inset(), (156.0 if OS.get_environment("S299LY") == "1" else 130.0) + PZS._inset())',
  '(126.0 if OS.get_environment("S299LY") == "1" else 100.0) + PZS._inset() + (6.0 if OS.get_environment("S302R43") == "1" else 0.0), (156.0 if OS.get_environment("S299LY") == "1" else 130.0) + PZS._inset() + (6.0 if OS.get_environment("S302R43") == "1" else 0.0))   # set 307: under the odds tag'),
 ('\t\t\t\t_mv299(lb, top, 0.5, -392, -190, 27, 67)   # r45 B1/B3\n', '\t\t\t\t_mv299(lb, top, 0.5, -392, -190, 5, 45)   # r45 B1/B3 · set 307: up 22\n'),
 ('\t\t\t\t_mv299(gd, top, 0.5, -183, -182, 30, 120)\n', '\t\t\t\t_mv299(gd, top, 0.5, -183, -182, 8, 98)   # set 307: up 22\n'),
 ('\t\t\t\tlvl.add_theme_stylebox_override("normal", sb)\n\t\t\t\tlvl.add_theme_font_size_override("font_size", 16)\n\t\t\t\todds_row.offset_left = 4\n',
  '\t\t\t\tlvl.add_theme_stylebox_override("normal", sb)\n\t\t\t\tlvl.add_theme_font_size_override("font_size", 16)\n\t\t\t\todds_row.offset_left = 4\n'
  '\t\t\t\t# set 307 (owner): "Lv.1 | 100% ..." on the hanging tag: no Lv tab box, no spacer, gold divider after Lv\n'
  '\t\t\t\tlvl.add_theme_stylebox_override("normal", StyleBoxEmpty.new())\n'
  '\t\t\t\tlvl.add_theme_font_size_override("font_size", 14)\n'
  '\t\t\t\tsp.queue_free()\n'
  '\t\t\t\tvar gdv := ColorRect.new()\n'
  '\t\t\t\tgdv.color = Color("#c9a45c")\n'
  '\t\t\t\tgdv.custom_minimum_size = Vector2(1.5, 14)\n'
  '\t\t\t\tgdv.size_flags_vertical = Control.SIZE_SHRINK_CENTER\n'
  '\t\t\t\tgdv.mouse_filter = Control.MOUSE_FILTER_IGNORE\n'
  '\t\t\t\todds_row.add_child(gdv)\n'
  '\t\t\t\todds_row.move_child(gdv, 1)\n'
  '\t\t\t\todds_row.add_theme_constant_override("separation", 7)\n'
  '\t\t\t\todds_row.alignment = BoxContainer.ALIGNMENT_CENTER\n'
  '\t\t\t\todds_row.offset_left = 0\n\t\t\t\todds_row.offset_right = 0\n'),
])
patch("s299_prep.gd", [
 ('\t\tub = _union(["Reroll", "Dock", "ShopOdds", "Lock299"])\n\t\tif ub.size.x > 0.0:\n',
  '\t\tub = _union(["Reroll", "Dock", "ShopOdds", "Lock299"])\n'
  '\t\tif OS.get_environment("S302R43") == "1":   # set 307: odds tag hangs under the plate = its own small painted plate, drawn first (tucked under)\n'
  '\t\t\tub = _union(["Reroll", "Dock", "Lock299"])\n'
  '\t\t\tvar ou := _union(["ShopOdds"])\n'
  '\t\t\tif ou.size.x > 0.0:\n'
  '\t\t\t\tvar R43S: GDScript = load("res://scripts/ui/r43.gd")\n'
  '\t\t\t\tR43S._nine(self, R43S._tex("plate"), ou.grow_individual(4, 8, 4, 3), 80.0, 0.16, Color(1, 1, 1, 0.97))\n'
  '\t\tif ub.size.x > 0.0:\n'),
])

# set 307 odds tag b (owner): smaller + moved to the left (under the lock / reroll column): x -388..-160, y 99..117, Lv 12, odds 11
patch("prep.gd", [
 ('top, 0.5, 103, 381, 99.0 + PZS._inset(), 120.0 + PZS._inset())   # set 307',
  'top, 0.5, -388, -128, 99.0 + PZS._inset(), 117.0 + PZS._inset())   # set 307 b: left, smaller'),
 ('\t\t\t\tlvl.add_theme_font_size_override("font_size", 14)\n',
  '\t\t\t\tlvl.add_theme_font_size_override("font_size", 12)   # set 307 b\n'
  '\t\t\t\tfor hh in odds_row.get_children():   # set 307 b: smaller odds text\n'
  '\t\t\t\t\tfor q in hh.get_children():\n'
  '\t\t\t\t\t\tvar ql := q as Label\n'
  '\t\t\t\t\t\tif ql != null: ql.add_theme_font_size_override("font_size", 11)\n'),
 ('\t\t\t\tgdv.custom_minimum_size = Vector2(1.5, 14)\n', '\t\t\t\tgdv.custom_minimum_size = Vector2(1.5, 11)\n'),
 ('\t\t\t\todds_row.add_theme_constant_override("separation", 7)\n', '\t\t\t\todds_row.add_theme_constant_override("separation", 5)\n'),
])

# set 307 odds tag c (owner): narrower, must not reach the creatures -> inside the button column: x -388..-196, y 99..114, Lv 11, odds 10, gaps 3/1
patch("prep.gd", [
 ("'top, 0.5, -388, -128, 99.0 + PZS._inset(), 117.0 + PZS._inset())".strip("'"), "top, 0.5, -388, -196, 99.0 + PZS._inset(), 114.0 + PZS._inset())"),
 ('lvl.add_theme_font_size_override("font_size", 12)   # set 307 b\n', 'lvl.add_theme_font_size_override("font_size", 11)   # set 307 b · c\n'),
 ('if ql != null: ql.add_theme_font_size_override("font_size", 11)\n', 'if ql != null: ql.add_theme_font_size_override("font_size", 10)\n'),
 ('\t\t\t\todds_row.add_theme_constant_override("separation", 5)\n', '\t\t\t\todds_row.add_theme_constant_override("separation", 3)\n'
  '\t\t\t\tfor hh2 in odds_row.get_children():   # set 307 c: dot-to-number gap 1\n'
  '\t\t\t\t\tvar hb2 := hh2 as HBoxContainer\n'
  '\t\t\t\t\tif hb2 != null: hb2.add_theme_constant_override("separation", 1)\n'),
])

# set 307 odds tag d (owner): thinner, little space between text and edge: y 99..111, plate grow bottom 1, corner scale 0.16 -> 0.10
patch("prep.gd", [
 ("top, 0.5, -388, -196, 99.0 + PZS._inset(), 114.0 + PZS._inset())", "top, 0.5, -388, -196, 99.0 + PZS._inset(), 111.0 + PZS._inset())"),
])
patch("s299_prep.gd", [
 ('ou.grow_individual(4, 8, 4, 3), 80.0, 0.16,', 'ou.grow_individual(3, 8, 3, 1), 80.0, 0.10,'),
])

# set 307 odds tag e (owner picture of a thin strip: text nearly touching the edges): text up 1, plate bottom = 2 above the label box
patch("prep.gd", [
 ("top, 0.5, -388, -196, 99.0 + PZS._inset(), 111.0 + PZS._inset())", "top, 0.5, -388, -196, 95.0 + PZS._inset(), 107.0 + PZS._inset())"),
])
patch("s299_prep.gd", [
 ('ou.grow_individual(3, 8, 3, 1), 80.0, 0.10,', 'ou.grow_individual(3, 8, 3, -2.5), 80.0, 0.08,'),
])
