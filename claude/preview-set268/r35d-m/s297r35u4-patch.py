#!/usr/bin/env python3
# set 297 round 35u4 (owner: "no plates — like A but it still looks odd"): plate-free variants g-j of S297TOP
#   cause seen in A: icons far bigger than the clock digits · grey icons faint on the sky · uneven gaps (ff button wider)
#   g = icons sized to the digits, whiter icons + white clock, even gaps 14 · h = smaller icons, more air (gap 26), clock 20
#   i = g + thin white dividers between the three · j = tight group (gap 4), icons a bit bigger than the digits
# run after s297r35u3-patch.py:  python -I s297r35u4-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
p = root / "scripts/ui/battle.gd"
s = p.read_text(encoding="utf-8")
old = T('''    hud.add_child(grp)
    hud.move_child(grp, spl.get_index() + 1)
''')
new = T('''        "g", "h", "i", "j":   # s297 r35u4: no plates
            var sz: int = {"g": 36, "h": 30, "i": 36, "j": 42}[V]
            inner.add_theme_constant_override("separation", {"g": 14, "h": 26, "i": 12, "j": 4}[V])
            _btn297(btn_stop, Vector2(sz, sz), none, none)
            _btn297(sb, Vector2(sz, sz), none, none)
            clock.add_theme_font_size_override("font_size", 20 if V == "h" else 18)
            clock.add_theme_constant_override("outline_size", 5)
            for k in _icons: (_icons[k] as Control).modulate = Color(1.7, 1.7, 1.7)
            inner.add_child(btn_stop)
            if V == "i": inner.add_child(_div297())
            inner.add_child(cp)
            if V == "i": inner.add_child(_div297())
            inner.add_child(sb)
    hud.add_child(grp)
    hud.move_child(grp, spl.get_index() + 1)

func _div297() -> Control:
    var c := ColorRect.new()
    c.color = Color(1, 1, 1, 0.55)
    c.custom_minimum_size = Vector2(1, 22)
    c.size_flags_vertical = Control.SIZE_SHRINK_CENTER
    return c
''')
assert s.count(old) == 1
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("s297 r35u4 patched")
