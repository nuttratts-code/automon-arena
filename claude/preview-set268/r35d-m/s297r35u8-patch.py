#!/usr/bin/env python3
# set 297 round 35u8 (owner after 35u7 M: "make the size like the old corner buttons" -> C2 = old bottom-right pause/ff, 58x54 / 70x54):
#   S297TOP=n = M (top edge, faded S297TONE default 0.75) with the old button sizes; clock size from env S297CLK (default 18)
# run after s297r35u7-patch.py:  python -I s297r35u8-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")

b = root / "scripts/ui/battle.gd"
sub(b, T('''        "k", "l", "m":   # s297 r35u5: G + white icons, centred on the screen · r35u6 l = near the top edge · r35u7 m = l faded
            inner.add_theme_constant_override("separation", 14)
            _btn297(btn_stop, Vector2(36, 36), none, none)
            _btn297(sb, Vector2(36, 36), none, none)
            clock.add_theme_font_size_override("font_size", 18)
'''), T('''        "k", "l", "m", "n":   # s297 r35u5: G + white icons, centred on the screen · r35u6 l = near the top edge · r35u7 m = l faded · r35u8 n = m + old corner-button sizes
            inner.add_theme_constant_override("separation", 14)
            var big := V == "n"
            _btn297(btn_stop, Vector2(58, 54) if big else Vector2(36, 36), none, none)
            _btn297(sb, Vector2(70, 54) if big else Vector2(36, 36), none, none)
            var clk := OS.get_environment("S297CLK")
            clock.add_theme_font_size_override("font_size", int(clk) if big and clk != "" else 18)
'''))
sub(b, '(4.0 if V in ["l", "m"] else', '(4.0 if V in ["l", "m", "n"] else')
sub(b, T('''            if V == "m":
'''), T('''            if V in ["m", "n"]:
'''))
print("s297r35u8 ok")
