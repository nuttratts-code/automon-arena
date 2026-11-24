#!/usr/bin/env python3
# set 297 round 35u7 (owner after 35u6 L: "still stands out a bit — tone it down"): S297TOP=m = L with the whole group faded
#   alpha from env S297TONE (default 0.75); the fade covers icons, outline and clock together (group modulate)
# run after s297r35u6-patch.py:  python -I s297r35u7-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")

b = root / "scripts/ui/battle.gd"
sub(b, T('''        "k", "l":   # s297 r35u5: G + white icons, centred on the screen · r35u6 l = near the top edge
'''), T('''        "k", "l", "m":   # s297 r35u5: G + white icons, centred on the screen · r35u6 l = near the top edge · r35u7 m = l faded
'''))
sub(b, 'roundf(hud.global_position.y + (4.0 if V == "l" else',
    'roundf(hud.global_position.y + (4.0 if V in ["l", "m"] else')
sub(b, T('''            place.call_deferred()
            return
'''), T('''            place.call_deferred()
            if V == "m":
                var tone := OS.get_environment("S297TONE")
                grp.modulate.a = float(tone) if tone != "" else 0.75
            return
'''))
print("s297r35u7 ok")
