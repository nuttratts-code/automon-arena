#!/usr/bin/env python3
# set 297 round 35u6 (owner after 35u5 K: "it stands out too much — move it up a bit"): S297TOP=l = K placed near the top edge
#   (K sat in the vertical middle of the 86-px hud row; l = 4 px from the hud top, same sizes and colours)
# run after s297r35u5-patch.py:  python -I s297r35u6-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")

b = root / "scripts/ui/battle.gd"
sub(b, T('''        "k":   # s297 r35u5: G + white icons, centred on the screen
'''), T('''        "k", "l":   # s297 r35u5: G + white icons, centred on the screen · r35u6 l = near the top edge
'''))
sub(b, 'roundf(hud.global_position.y + (hud.size.y - grp.size.y) * 0.5))',
    'roundf(hud.global_position.y + (4.0 if V == "l" else (hud.size.y - grp.size.y) * 0.5)))')
print("s297r35u6 ok")
