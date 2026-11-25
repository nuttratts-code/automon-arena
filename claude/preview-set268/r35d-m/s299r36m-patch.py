# set 299 round 36m (sample, after s299r36l): owner "try setting the cards in from the plate edge at several levels, show me, I pick" →
#   env S299INSET = gap (px, base 868×480 screen) between each shop card's top/bottom and the top plate's line;
#   0 = r36l shared line (card draws sides only) · > 0 = the card draws its own full cut-corner frame; lock tab + HUD icons follow
import sys, pathlib, re
here = pathlib.Path(__file__).parent
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
src = (here / "s299r36-prep.gd.txt").read_text(encoding="utf-8")
src = re.sub(r"(?m)^((?:    )+)", lambda m: "\t" * (len(m.group(1)) // 4), src)
(g / "scripts/ui/s299_prep.gd").write_text(src, encoding="utf-8")
T = "\t"
pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
rep = [
    ('_mv299(lb, top, 0.5, 357, 395, 97, 123)', '_mv299(lb, top, 0.5, 357, 395, 97.0 + PZS._inset(), 123.0 + PZS._inset())   # r36m'),
    ('_mv299(hbx, top, 1.0, -360, -88, 100, 130)', '_mv299(hbx, top, 1.0, -360, -88, 100.0 + PZS._inset(), 130.0 + PZS._inset())   # r36m'),
]
for o, n in rep:
    assert p.count(o) == 1, o
    p = p.replace(o, n)
pp.write_text(p, encoding="utf-8")
ps = g / "scripts/ui/slot_cell.gd"; s = ps.read_text(encoding="utf-8")
old = 'if _pz299["shop"] and OS.get_environment("S299FLUSH") != "0" and get_parent() != null:'
assert s.count(old) == 1
s = s.replace(old, 'if _pz299["shop"] and OS.get_environment("S299FLUSH") != "0" and get_parent() != null and _PZ299._inset() <= 0.0:   # r36m: inset > 0 = own full frame')
ps.write_text(s, encoding="utf-8")
print("ok r36m")
