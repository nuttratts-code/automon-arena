# set 299 round 36g (sample, after s299r36f): owner "too crowded, redesign" → A1 one plate at the top =
#   [round / gold / hearts column][reroll][5 shop cards], no hanging tab · shop cards 98 → 80 tall (art x1.3, band from 46) ·
#   HUD buttons = small, no plate, top-right under the shop plate · bench + Fight 98 → 66 tall · B2 empty bench plates stay faint ·
#   board rect y 100..h-90 · harness zoom target y default 0.27
import sys, pathlib, re
here = pathlib.Path(__file__).parent
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
src = (here / "s299r36-prep.gd.txt").read_text(encoding="utf-8")
src = re.sub(r"(?m)^((?:    )+)", lambda m: "\t" * (len(m.group(1)) // 4), src)
(g / "scripts/ui/s299_prep.gd").write_text(src, encoding="utf-8")
T = "\t"
pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
rep = [
    (T*2 + '_mv299(top.get_node_or_null("Dock"), top, 0.5, -X, X, 0, 98)   # r36f: shop back at the top\n',
     T*2 + '_mv299(top.get_node_or_null("Dock"), top, 0.5, -175, 389, 0, 80)   # r36g: one top plate, shop on the right\n'),
    (T*2 + '_mv299(top.get_node_or_null("Reroll"), top, 0.5, -X - 8.0 - 74.0, -X - 8.0, 0, 98)   # r36f: F3a left of the shop\n',
     T*2 + '_mv299(top.get_node_or_null("Reroll"), top, 0.5, -241, -181, 0, 80)   # r36g: reroll between info and shop\n'),
    (T*2 + '_mv299(tr.get_node_or_null("HudTitle"), top, 0.5, -140, -26, 108, 138)   # r36f: F1a tab under the shop\n',
     T*2 + '_mv299(tr.get_node_or_null("HudTitle"), top, 0.5, -392, -247, 4, 26)   # r36g: info column, left of the reroll\n'),
    (T*2 + '_mv299(tr.get_node_or_null("ChipGold"), top, 0.5, -14, 126, 108, 138)   # r36f: F1a tab under the shop\n',
     T*2 + '_mv299(tr.get_node_or_null("ChipGold"), top, 0.5, -392, -247, 28, 52)   # r36g: info column\n'),
    (T*2 + '_mv299(tr.get_node_or_null("ChipHearts"), top, 0.5, 138, 180, 108, 138)   # r36f: F1a tab under the shop\n',
     T*2 + '_mv299(tr.get_node_or_null("ChipHearts"), top, 0.5, -392, -247, 54, 78)   # r36g: info column\n'),
    (T*3 + '_mv299(hbx, top, 0.0, 0, 240, 104, 140)   # r36f: HUD buttons on the tab line, left (reroll took the top-left)\n'
     + T*3 + 'hbx.alignment = BoxContainer.ALIGNMENT_BEGIN\n' + T*3 + 'hbx.grow_horizontal = Control.GROW_DIRECTION_END\n',
     T*3 + '_mv299(hbx, top, 1.0, -270, 0, 86, 116)   # r36g: small, no plate, top-right under the shop plate\n'
     + T*3 + 'hbx.alignment = BoxContainer.ALIGNMENT_END\n' + T*3 + 'hbx.grow_horizontal = Control.GROW_DIRECTION_BEGIN\n'),
    (T*3 + '_mv299(bench_row, tr, 0.5, -X, X, 40, 138)\n',
     T*3 + '_mv299(bench_row, tr, 0.5, -X, X, 72, 138)   # r36g: bench 66 tall\n'),
    (T*3 + 'btn_fight.offset_top = 40\n', T*3 + 'btn_fight.offset_top = 72   # r36g: Fight as tall as the bench\n'),
    (T*2 + 'cc.offset_bottom = -30\n', T*2 + 'cc.offset_bottom = -42   # r36g: art above the stats row\n'),
    (T*2 + 'band299.offset_top = 58\n', T*2 + 'band299.offset_top = 46   # r36g: 80-tall card\n'),
    (T*2 + 'cc.add_child(UV.make(c, 0, SHOP_PX * 1.6, false))\n', T*2 + 'cc.add_child(UV.make(c, 0, SHOP_PX * 1.3, false))   # r36g: 80-tall card\n'),
]
for o, n in rep:
    assert p.count(o) == 1, o
    p = p.replace(o, n)
pp.write_text(p, encoding="utf-8")
pa = g / "scripts/ui/app.gd"; a = pa.read_text(encoding="utf-8")
old = '160.0, pf.size.x - 2.0 * prep.board_side_room(), size.y - 160.0 - 120.0)'
assert a.count(old) == 1
a = a.replace(old, '100.0, pf.size.x - 2.0 * prep.board_side_room(), size.y - 100.0 - 90.0)')
pa.write_text(a, encoding="utf-8")
ph = g / "tests/s239_prep.gd"; h = ph.read_text(encoding="utf-8")
old = 'OS.get_environment("S299ZY") != "" else 0.30)'
assert h.count(old) == 2
h = h.replace(old, 'OS.get_environment("S299ZY") != "" else 0.27)')
ph.write_text(h, encoding="utf-8")
print("ok r36g")
