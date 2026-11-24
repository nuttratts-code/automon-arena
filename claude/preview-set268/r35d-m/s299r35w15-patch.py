#!/usr/bin/env python3
# set 299 round 35w15 (owner picks on list sheets r35w11-14): S299MK=s → chip cut 15 % (top-left + bottom-right),
#   baked icons n_<key> (same ink size, sword tip top-left, pad 0.10) drawn on the whole chip, small smooth + / − texture
#   (n_plus / n_minus, top-right). Needs s299_chipicons.py run on data/ui_icons/r35d first. After s299r35w10.
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
f = root / "scripts/ui/s286_team.gd"
s = f.read_text(encoding="utf-8")
old = T('''    if mks != "" and mks != "0":   # s299 r35w10: cut-corner chip + bigger icon + mark style
''')
new = T('''    if mks == "s":   # s299 r35w15: picked look
        var pp := _cutpts299(r, r.size.x * 0.15)
        draw_colored_polygon(pp, bg)
        draw_polyline(pp + PackedVector2Array([pp[0]]), Color(OUT, 0.7 * a), 1.0)
        _ic_q.append([r, "n_" + String(e[1]), Color(1, 1, 1, 0.97), a])
        if mk != "": _ic_q.append(["ntex", r, "n_plus" if mk == "+" else "n_minus", a])
    elif mks != "" and mks != "0":   # s299 r35w10: cut-corner chip + bigger icon + mark style
''')
assert s.count(old) == 1, "chip"
s = s.replace(old, new)
old2 = T('''        if q[0] is String and q[0] == "veil":
''')
new2 = T('''        if q[0] is String and q[0] == "ntex":   # s299 r35w15: baked + / − mark
            var tx := icon_tex(String(q[2]))
            if tx != null: _ic_layer.draw_texture_rect(tx, q[1], false, Color(1, 1, 1, float(q[3])))
            continue
        if q[0] is String and q[0] == "veil":
''')
assert s.count(old2) == 1, "draw"
s = s.replace(old2, new2)
f.write_text(s, encoding="utf-8", newline="")
print("s299r35w15 ok")
