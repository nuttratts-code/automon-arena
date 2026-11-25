# set 299 round 36b (sample, after s299r36): shop moved to the bottom (owner picture = layout idea only, not stored)
#   owner picks C1b reroll alone (odds row hidden) · C2a gold / hearts / round on a tab above the shop, HUD buttons top-left ·
#   C3a creature big in the card + tribe / name / price + small stats row
#   env S299PREP (default on, 0 = old) as in r36; re-copies s299r36-prep.gd.txt (back plate behind reroll + shop + Fight)
import sys, pathlib, re
here = pathlib.Path(__file__).parent
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
src = (here / "s299r36-prep.gd.txt").read_text(encoding="utf-8")
src = re.sub(r"(?m)^((?:    )+)", lambda m: "\t" * (len(m.group(1)) // 4), src)
(g / "scripts/ui/s299_prep.gd").write_text(src, encoding="utf-8")

pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
old = '\tvar bar: Control = PZS.new()\n'
assert p.count(old) == 1
p = p.replace(old, (
	'\tvar top := lay.get_node_or_null("Top") as Control\n'
	'\tif top != null:   # r36b: shop row to the bottom of the Tray, tab above it, HUD buttons top-left\n'
	'\t\tvar X := 282.0\n'
	'\t\t_mv299(top.get_node_or_null("Dock"), tr, 0.5, -X, X, 40, 138)\n'
	'\t\t_mv299(top.get_node_or_null("Reroll"), tr, 0.5, -X - 8.0 - 74.0, -X - 8.0, 40, 138)\n'
	'\t\t_mv299(top.get_node_or_null("ShopOdds"), tr, 0.5, -6000, -5700, 40, 72)   # C1b: odds row out of view\n'
	'\t\t_mv299(tr.get_node_or_null("HudTitle"), tr, 0.5, -X + 4.0, -84, 6, 34)\n'
	'\t\t_mv299(tr.get_node_or_null("ChipGold"), tr, 0.5, -70, 70, 4, 34)\n'
	'\t\t_mv299(tr.get_node_or_null("ChipHearts"), tr, 0.5, 84, 160, 4, 34)\n'
	'\t\tvar hbx := tr.get_node_or_null("HudButtons") as HBoxContainer\n'
	'\t\tif hbx != null:\n'
	'\t\t\t_mv299(hbx, top, 0.0, 0, 360, 2, 38)\n'
	'\t\t\thbx.alignment = BoxContainer.ALIGNMENT_BEGIN\n'
	'\t\t\thbx.grow_horizontal = Control.GROW_DIRECTION_END\n'
	'\t\tif btn_fight != null:\n'
	'\t\t\tbtn_fight.offset_top = 40\n\t\t\tbtn_fight.offset_bottom = 138\n') + old)
old = '# set 213 (A1): phone notch / rounded corners'
p = p.replace(old, (
	'static func _mv299(n: Node, to: Control, anc: float, l: float, r: float, t: float, b: float) -> void:   # s299 r36b\n'
	'\tvar c := n as Control\n'
	'\tif c == null:\n\t\treturn\n'
	'\tif c.get_parent() != to:\n\t\tc.reparent(to, false)\n'
	'\tc.anchor_left = anc\n\tc.anchor_right = anc\n\tc.anchor_top = 0.0\n\tc.anchor_bottom = 0.0\n'
	'\tc.offset_left = l\n\tc.offset_right = r\n\tc.offset_top = t\n\tc.offset_bottom = b\n\n') + old)
# C3a card: creature big behind the text (centred in the space above the stats + name rows), stats row smaller
old = '\tvar mon := UV.make(c, 0, SHOP_PX, false)\n\tmon.size_flags_horizontal = Control.SIZE_EXPAND | Control.SIZE_SHRINK_CENTER\n\ttop.add_child(mon)\n'
assert p.count(old) == 1
p = p.replace(old, (
	'\tvar big299 := OS.get_environment("S299PREP") != "0"\n'
	'\tif big299:   # r36b C3a: the creature fills the card\n'
	'\t\tvar cc := CenterContainer.new()\n'
	'\t\tcc.mouse_filter = Control.MOUSE_FILTER_IGNORE\n'
	'\t\tcc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)\n'
	'\t\tcc.offset_top = 2\n\t\tcc.offset_bottom = -30\n'
	'\t\tcc.add_child(UV.make(c, 0, SHOP_PX * 1.6, false))\n'
	'\t\tcell.add_child(cc)\n'
	'\t\tvar sp299 := Control.new()\n'
	'\t\tsp299.size_flags_horizontal = Control.SIZE_EXPAND_FILL\n'
	'\t\tsp299.mouse_filter = Control.MOUSE_FILTER_IGNORE\n'
	'\t\ttop.add_child(sp299)\n'
	'\telse:\n'
	'\t\tvar mon := UV.make(c, 0, SHOP_PX, false)\n'
	'\t\tmon.size_flags_horizontal = Control.SIZE_EXPAND | Control.SIZE_SHRINK_CENTER\n'
	'\t\ttop.add_child(mon)\n'))
old = '\tv.add_child(stats_row(c, 1, 14))\n'
assert p.count(old) == 1
p = p.replace(old, '\tv.add_child(stats_row(c, 1, 12 if OS.get_environment("S299PREP") != "0" else 14))\n')
pp.write_text(p, encoding="utf-8")
print("ok r36b")
