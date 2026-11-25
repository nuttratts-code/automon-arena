# set 299 round 36l (sample, after s299r36k): owner "not left/right — I meant the cards' TOP and BOTTOM edges" →
#   cards apart again (separation 6, still filling the Dock) · the top plate hugs the shop row (grow −1.5 top + bottom, was 8 / 6)
#   (Dock keeps a 2 px inner margin → plate line pulled in: grow −1.5) so each card's top and bottom edge = the plate's own line; the card draws only its sides + cut corners (s299_prep.col) ·
#   running light back to both cut corners · lock tab + HUD icons moved up with the plate's new bottom
import sys, pathlib, re
here = pathlib.Path(__file__).parent
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
src = (here / "s299r36-prep.gd.txt").read_text(encoding="utf-8")
src = re.sub(r"(?m)^((?:    )+)", lambda m: "\t" * (len(m.group(1)) // 4), src)
(g / "scripts/ui/s299_prep.gd").write_text(src, encoding="utf-8")
T = "\t"
pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
rep = [
    ('shop_row.add_theme_constant_override("separation", 0)   # r36k: cards flush',
     'shop_row.add_theme_constant_override("separation", 6)   # r36l: cards apart again (owner meant top/bottom)'),
    ('rn.kl = 6.0 if i == 0 else 0.0\n', 'rn.kl = 6.0   # r36l\n'),
    ('rn.kr = 6.0 if i == int(R.RULES()["shop"]["slots"]) - 1 else 0.0\n', 'rn.kr = 6.0\n'),
    ('_mv299(lb, top, 0.5, 357, 395, 104, 132)', '_mv299(lb, top, 0.5, 357, 395, 97, 123)'),
    ('_mv299(hbx, top, 1.0, -360, -88, 106, 136)', '_mv299(hbx, top, 1.0, -360, -88, 100, 130)'),
]
for o, n in rep:
    assert p.count(o) == 1, o
    p = p.replace(o, n)
pp.write_text(p, encoding="utf-8")

ps = g / "scripts/ui/slot_cell.gd"; s = ps.read_text(encoding="utf-8")
old = T*2 + 'var n := get_parent().get_child_count()\n' + T*2 + '_PZ299.strip(self, size.x, size.y, get_index(), n, picked,'
new = T*2 + '_PZ299.col(self, size.x, size.y, picked,'   # r36l: sides only, the plate draws top + bottom
assert s.count(old) == 1
s = s.replace(old, new)
ps.write_text(s, encoding="utf-8")
print("ok r36l")
