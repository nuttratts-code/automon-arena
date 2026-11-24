#!/usr/bin/env python3
# set 297 round 35u10 (owner after 35u9 O: "closer together, move everything to the right side"):
#   S297TOP=p = O (clock 15 | pause | ff, old icon size, top edge, faded 0.75) at the hud's RIGHT edge, tight:
#   both buttons 54x54 (same icon size as before: 0.62 of the 54 side), group gap 0, clock plate without margins + 6 px air
# run after s297r35u9-patch.py:  python -I s297r35u10-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")

b = root / "scripts/ui/battle.gd"
sub(b, T('''        "k", "l", "m", "n", "o":'''), T('''        "k", "l", "m", "n", "o", "p":'''))
sub(b, T('''            var big := V in ["n", "o"]
'''), T('''            var big := V in ["n", "o", "p"]
'''))
sub(b, '(15 if V == "o" else 18))', '(15 if V in ["o", "p"] else 18))')
sub(b, '([cp, btn_stop, sb] if V == "o" else [btn_stop, cp, sb])', '([cp, btn_stop, sb] if V in ["o", "p"] else [btn_stop, cp, sb])')
sub(b, T('''            var holder := Control.new()
'''), T('''            if V == "p":   # r35u10: tight group
                inner.add_theme_constant_override("separation", -14)   # buttons carry ~10 px empty sides around the icon
                _btn297(btn_stop, Vector2(54, 54), none, none)
                _btn297(sb, Vector2(54, 54), none, none)
                var cpb := StyleBoxEmpty.new()
                cpb.content_margin_right = 12
                cp.add_theme_stylebox_override("panel", cpb)
            var holder := Control.new()
'''))
sub(b, 'roundf(hr.position.x if V == "o" else hr.position.x + (hr.size.x - grp.size.x) * 0.5)',
    'roundf(hr.position.x if V == "o" else (hr.end.x - grp.size.x if V == "p" else hr.position.x + (hr.size.x - grp.size.x) * 0.5))')
sub(b, '(4.0 if V in ["l", "m", "n", "o"] else', '(4.0 if V in ["l", "m", "n", "o", "p"] else')
sub(b, T('''            if V in ["m", "n", "o"]:
'''), T('''            if V in ["m", "n", "o", "p"]:
'''))
print("s297r35u10 ok")
