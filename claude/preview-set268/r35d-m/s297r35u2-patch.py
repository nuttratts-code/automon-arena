#!/usr/bin/env python3
# set 297 round 35u2 (owner after 35u): plates more see-through · no hint in the empty console
#   · clock in the top centre, pause on its left, fast-forward on its right · no plates under them (old icon-only look)
# run after s297r35u-patch.py:  python -I s297r35u2-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])

def T(s):
    return s.replace("    ", "\t")

def sub(s, old, new, tag):
    old = T(old); new = T(new)
    assert s.count(old) == 1, tag
    return s.replace(old, new)

p = root / "scripts/ui/battle.gd"
s = p.read_text(encoding="utf-8")
s = sub(s, '''        hud.add_child(_build_dock())
''', '''        var dk := _build_dock()   # s297 r35u2: pause | clock | fast-forward in the top centre
        hud.add_child(dk)
        var spl := Control.new(); spl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
        var spr := Control.new(); spr.size_flags_horizontal = Control.SIZE_EXPAND_FILL
        _tl.size_flags_horizontal = 0
        for nd in [spl, btn_stop, cp, speed_btns[0], spr, _tl]:
            if nd.get_parent() != null: nd.get_parent().remove_child(nd)
            hud.add_child(nd)
        dk.visible = false
''', "centre")
# old icon-only look: no plate under the clock / the two buttons (rounds 10 + 14)
s = sub(s, '''    if OS.get_environment("S294") != "0":   # s294 C1: flat run-end slate plate under the clock
''', '''    if OS.get_environment("S294") != "0" and OS.get_environment("S297") == "0":   # s294 C1 (s297 r35u2: off)
''', "cp")
s = sub(s, '''            if OS.get_environment("S294") != "0":   # s294 G4: same flat slate plate under pause / fast-forward
''', '''            if OS.get_environment("S294") != "0" and OS.get_environment("S297") == "0":   # s294 G4 (s297 r35u2: off)
''', "btn")
s = sub(s, '''        if OS.get_environment("S297") != "0":   # s297: small top-right buttons, same height as the clock plate
''', '''        if OS.get_environment("S297") == "x":   # s297 r35u small buttons — r35u2: old size again
''', "size")
p.write_text(s, encoding="utf-8")

p = root / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")
s = sub(s, '''    draw_rect(r, Color(Color("#1d6079") if on else TH.R23_INK, 0.70))   # note 70: flat plate, picked = teal
''', '''    draw_rect(r, Color(Color("#1d6079"), 0.55) if on else Color(TH.R23_INK, 0.42))   # r35u2: more see-through
''', "slot")
s = sub(s, '''Color(TH.R23_INK, 0.30))
''', '''Color(TH.R23_INK, 0.18))
''', "empty")
s = sub(s, '''    _pn_layer.draw_rect(R, Color(TH.R23_INK, 0.70))   # note 70: flat slate plate
    var has: bool = picked >= 0 and view != null and view.units.has(picked)
    if not has:   # owner B2: empty console with a hint
        var hint := "แตะตัวละครเพื่อดู"
        var hf: Font = TH.font("body")
        var hw := hf.get_string_size(hint, HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x
        _dtxt(Vector2(R.get_center().x - hw * 0.5, R.get_center().y + 4.0), hint, 11, Color(MUTE, 0.75))
        return
''', '''    _pn_layer.draw_rect(R, Color(TH.R23_INK, 0.42))   # r35u2: more see-through
    var has: bool = picked >= 0 and view != null and view.units.has(picked)
    if not has: return   # r35u2 (owner): no hint, empty plate
''', "console")
p.write_text(s, encoding="utf-8")
print("s297 r35u2 patched")
