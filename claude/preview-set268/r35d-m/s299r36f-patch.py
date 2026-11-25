# set 299 round 36f (sample, after s299r36e): owner note 140 → F1a shop row back at the TOP (Top) with the round tab
#   (round / gold / hearts) hanging under it · F2a bench = one horizontal row centred at the bottom, Fight bottom-right ·
#   F3a reroll left of the shop · HUD buttons down to the tab line (left) · tab compact · board rect y 160..h-120 (between tab and bench) · harness zoom target y = S299ZY (default 0.30)
import sys, pathlib, re
here = pathlib.Path(__file__).parent
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
src = (here / "s299r36-prep.gd.txt").read_text(encoding="utf-8")
src = re.sub(r"(?m)^((?:    )+)", lambda m: "\t" * (len(m.group(1)) // 4), src)
(g / "scripts/ui/s299_prep.gd").write_text(src, encoding="utf-8")
pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
rep = [
	('\t\t_mv299(top.get_node_or_null("Dock"), tr, 0.5, -X, X, 40, 138)\n',
	 '\t\t_mv299(top.get_node_or_null("Dock"), top, 0.5, -X, X, 0, 98)   # r36f: shop back at the top\n'),
	('\t\t_mv299(top.get_node_or_null("Reroll"), tr, 0.5, -X - 8.0 - 74.0, -X - 8.0, 40, 138)\n',
	 '\t\t_mv299(top.get_node_or_null("Reroll"), top, 0.5, -X - 8.0 - 74.0, -X - 8.0, 0, 98)   # r36f: F3a left of the shop\n'),
	('\t\t_mv299(top.get_node_or_null("ShopOdds"), tr, 0.5, -6000, -5700, 40, 72)',
	 '\t\t_mv299(top.get_node_or_null("ShopOdds"), top, 0.5, -6000, -5700, 0, 32)'),
	('\t\t_mv299(tr.get_node_or_null("HudTitle"), top, 0.5, 172, 330, 2, 32)   # r36e: top centre\n',
	 '\t\t_mv299(tr.get_node_or_null("HudTitle"), top, 0.5, -140, -26, 108, 138)   # r36f: F1a tab under the shop\n'),
	('\t\t_mv299(tr.get_node_or_null("ChipGold"), top, 0.5, -70, 70, 2, 32)   # r36e: top centre\n',
	 '\t\t_mv299(tr.get_node_or_null("ChipGold"), top, 0.5, -14, 126, 108, 138)   # r36f: F1a tab under the shop\n'),
	('\t\t_mv299(tr.get_node_or_null("ChipHearts"), top, 0.5, 84, 160, 2, 32)   # r36e: top centre\n',
	 '\t\t_mv299(tr.get_node_or_null("ChipHearts"), top, 0.5, 138, 180, 108, 138)   # r36f: F1a tab under the shop\n'),
	('\t\t\t_mv299(hbx, top, 0.0, 0, 360, 2, 38)\n',
	 '\t\t\t_mv299(hbx, top, 0.0, 0, 240, 104, 140)   # r36f: HUD buttons on the tab line, left (reroll took the top-left)\n'),
	('\t\tif btn_fight != null:\n\t\t\tbtn_fight.offset_top = 40\n',
	 '\t\tif bench_row != null:   # r36f: F2a bench = one horizontal row, bottom centre\n'
	 '\t\t\tvar hb := HBoxContainer.new()   # a VBoxContainer cannot turn sideways → new row, same cells\n'
	 '\t\t\tvar ob := bench_row\n\t\t\tob.name = "BenchOld"\n\t\t\thb.name = "Bench"\n\t\t\ttr.add_child(hb)\n'
	 '\t\t\tfor ch in ob.get_children():\n\t\t\t\tch.reparent(hb, false)\n\t\t\tob.queue_free()\n\t\t\tbench_row = hb\n'
	 '\t\t\tbench_row.add_theme_constant_override("separation", 6)\n'
	 '\t\t\t_mv299(bench_row, tr, 0.5, -X, X, 40, 138)\n'
	 '\t\tif btn_fight != null:\n\t\t\tbtn_fight.offset_top = 40\n'),
	('\tvar bar: Control = PZS.new()\n\tbar.mode = "bar"\n\tbar.tray = tr\n\ttr.add_child(bar)\n\ttr.move_child(bar, 0)\n', ''),
]
for o, n in rep:
	assert p.count(o) == 1, o
	p = p.replace(o, n)
pp.write_text(p, encoding="utf-8")
pa = g / "scripts/ui/app.gd"; a = pa.read_text(encoding="utf-8")
old = '56.0, pf.size.x - 2.0 * prep.board_side_room(), size.y - 56.0 - 130.0)'
assert a.count(old) == 1
a = a.replace(old, '160.0, pf.size.x - 2.0 * prep.board_side_room(), size.y - 160.0 - 120.0)   # r36f: shop + tab top, bench bottom')
pa.write_text(a, encoding="utf-8")
ph = g / "tests/s239_prep.gd"; h = ph.read_text(encoding="utf-8")
for tw in ("tw", "tw3"):
	old = 'Vector2((vp.x - %s) / 2.0, vp.y * 0.30), Vector2(%s, vp.y * 0.50))' % (tw, tw)
	assert h.count(old) == 1, tw
	h = h.replace(old, 'Vector2((vp.x - %s) / 2.0, vp.y * (float(OS.get_environment("S299ZY")) if OS.get_environment("S299ZY") != "" else 0.30)), Vector2(%s, vp.y * 0.50))   # r36f: S299ZY' % (tw, tw))
ph.write_text(h, encoding="utf-8")
print("ok r36f")
