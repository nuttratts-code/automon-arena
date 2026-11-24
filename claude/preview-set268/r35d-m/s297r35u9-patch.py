#!/usr/bin/env python3
# set 297 round 35u9 (owner after 35u8 N: "move it to the left side, clock leftmost, make the clock smaller"):
#   S297TOP=o = N (old corner-button size, top edge, faded S297TONE 0.75) placed at the hud's left edge, order clock | pause | ff,
#   clock size from env S297CLK (default 15; N1 was 18)
# run after s297r35u8-patch.py:  python -I s297r35u9-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")

b = root / "scripts/ui/battle.gd"
sub(b, T('''        "k", "l", "m", "n":'''), T('''        "k", "l", "m", "n", "o":'''))
sub(b, T('''            var big := V == "n"
'''), T('''            var big := V in ["n", "o"]
'''))
sub(b, 'clock.add_theme_font_size_override("font_size", int(clk) if big and clk != "" else 18)',
    'clock.add_theme_font_size_override("font_size", int(clk) if big and clk != "" else (15 if V == "o" else 18))')
sub(b, T('''            for nd in [btn_stop, cp, sb]: inner.add_child(nd)
            var holder := Control.new()
'''), T('''            for nd in ([cp, btn_stop, sb] if V == "o" else [btn_stop, cp, sb]): inner.add_child(nd)
            var holder := Control.new()
'''))
sub(b, 'roundf(hr.position.x + (hr.size.x - grp.size.x) * 0.5)',
    'roundf(hr.position.x if V == "o" else hr.position.x + (hr.size.x - grp.size.x) * 0.5)')
sub(b, '(4.0 if V in ["l", "m", "n"] else', '(4.0 if V in ["l", "m", "n", "o"] else')
sub(b, T('''            if V in ["m", "n"]:
'''), T('''            if V in ["m", "n", "o"]:
'''))
print("s297r35u9 ok")
