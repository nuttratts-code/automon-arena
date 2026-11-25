# set 299 round 36i (sample, after s299r36h): owner "make the shop cards almost fill the frame" →
#   shop cards 80 → 96 tall (fill the top plate's height, which the info column already sets) · creature ×2.1 · dark band from 60 ·
#   board rect top 100 → 116
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
T = "\t"
pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
rep = [
    ('_mv299(top.get_node_or_null("Dock"), top, 0.5, -175, 389, 0, 80)', '_mv299(top.get_node_or_null("Dock"), top, 0.5, -175, 389, 0, 96)'),
    ('_mv299(top.get_node_or_null("Reroll"), top, 0.5, -241, -181, 0, 80)', '_mv299(top.get_node_or_null("Reroll"), top, 0.5, -241, -181, 0, 96)'),
    ('_mv299(hbx, top, 1.0, -270, 0, 86, 116)', '_mv299(hbx, top, 1.0, -270, 0, 106, 136)'),
    ('_mv299(lb, top, 0.5, 394, 418, 28, 52)', '_mv299(lb, top, 0.5, 394, 418, 36, 60)'),
    ('UV.make(c, 0, SHOP_PX * 1.75, false))   # r36h: fills the card', 'UV.make(c, 0, SHOP_PX * 2.1, false))   # r36i: almost fills the card'),
    (T*2 + 'band299.offset_top = 46   # r36g: 80-tall card\n', T*2 + 'band299.offset_top = 60   # r36i: 96-tall card\n'),
]
for o, n in rep:
    assert p.count(o) == 1, o
    p = p.replace(o, n)
pp.write_text(p, encoding="utf-8")
pa = g / "scripts/ui/app.gd"; a = pa.read_text(encoding="utf-8")
old = '100.0, pf.size.x - 2.0 * prep.board_side_room(), size.y - 100.0 - 90.0)'
assert a.count(old) == 1
a = a.replace(old, '116.0, pf.size.x - 2.0 * prep.board_side_room(), size.y - 116.0 - 90.0)')
pa.write_text(a, encoding="utf-8")
print("ok r36i")
