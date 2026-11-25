# set 299 round 36j (sample, after s299r36i): owner "creature bigger still, the running light is too big" →
#   creature x2.6 (was 2.1), clipped to the card · running light line 1.0-1.6 px + 3 px glow (was 2.5-4 + 7) in s299r36-prep.gd.txt
import sys, pathlib, re
here = pathlib.Path(__file__).parent
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
src = (here / "s299r36-prep.gd.txt").read_text(encoding="utf-8")
src = re.sub(r"(?m)^((?:    )+)", lambda m: "\t" * (len(m.group(1)) // 4), src)
(g / "scripts/ui/s299_prep.gd").write_text(src, encoding="utf-8")
T = "\t"
pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
rep = [
    ('UV.make(c, 0, SHOP_PX * 2.1, false))   # r36i: almost fills the card', 'UV.make(c, 0, SHOP_PX * 2.6, false))   # r36j: bigger still'),
    (T*2 + 'var hold299 := Control.new()\n', T*2 + 'var hold299 := Control.new()\n' + T*2 + 'hold299.clip_contents = true   # r36j: a big creature stays inside the card\n'),
]
for o, n in rep:
    assert p.count(o) == 1, o
    p = p.replace(o, n)
pp.write_text(p, encoding="utf-8")
print("ok r36j")
