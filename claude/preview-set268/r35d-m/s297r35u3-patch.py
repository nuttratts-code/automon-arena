#!/usr/bin/env python3
# set 297 round 35u3 (owner: "the top is not pretty — design many options"): top-centre group variants, env S297TOP
#   a = round 35u2 (icons only) · b = one pill plate behind pause | clock | ff · c = round buttons + small clock plate
#   d = no plates, big white clock, smaller white icons, wide gaps · e = joined segmented bar (3 tiles)
#   f = big clock centre, pause + ff as a joined pair on its right
# run after s297r35u2-patch.py:  python -I s297r35u3-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])

def T(s):
    return s.replace("    ", "\t")

p = root / "scripts/ui/battle.gd"
s = p.read_text(encoding="utf-8")
old = T('''        dk.visible = false
''')
new = T('''        dk.visible = false
        _top297(hud, spl, spr, cp)
''')
assert s.count(old) == 1
s = s.replace(old, new)
s = s.rstrip("\n") + "\n" + T('''

# ---------- s297 r35u3: top-centre group variants (env S297TOP) ----------
func _sb297(a: float, rad: int, col := Color(0, 0, 0, 0), l := -1, r := -1) -> StyleBoxFlat:
    var b := StyleBoxFlat.new()
    b.bg_color = Color(TH.R23_INK, a) if col.a == 0.0 else col
    b.set_corner_radius_all(rad)
    if l >= 0:
        b.corner_radius_top_left = l; b.corner_radius_bottom_left = l
        b.corner_radius_top_right = r; b.corner_radius_bottom_right = r
    return b

func _btn297(b: Button, sz: Vector2, normal: StyleBox, pressed: StyleBox) -> void:
    b.custom_minimum_size = sz
    b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
    for st in ["normal", "hover", "pressed", "focus", "hover_pressed"]:
        b.add_theme_stylebox_override(st, pressed if st in ["pressed", "hover_pressed"] else normal)

func _top297(hud: HBoxContainer, spl: Control, spr: Control, cp: PanelContainer) -> void:
    var V := OS.get_environment("S297TOP")
    if V == "" or V == "a": return
    var sb: Button = speed_btns[0]
    var teal := Color(Color("#1d6079"), 0.62)
    var none := StyleBoxEmpty.new()
    var grp := PanelContainer.new()
    var inner := HBoxContainer.new()
    inner.add_theme_constant_override("separation", 10)
    grp.add_child(inner)
    grp.add_theme_stylebox_override("panel", none)
    grp.size_flags_vertical = Control.SIZE_SHRINK_CENTER
    for nd in [btn_stop, cp, sb]:
        hud.remove_child(nd)
    clock.add_theme_color_override("font_color", Color("#eef3f6"))
    clock.add_theme_color_override("font_outline_color", Color("#16202a", 0.85))
    match V:
        "b":   # one pill behind all three
            var pill := _sb297(0.42, 22)
            pill.content_margin_left = 8; pill.content_margin_right = 8; pill.content_margin_top = 2; pill.content_margin_bottom = 2
            grp.add_theme_stylebox_override("panel", pill)
            inner.add_theme_constant_override("separation", 2)
            _btn297(btn_stop, Vector2(44, 40), none, _sb297(0, 18, teal))
            _btn297(sb, Vector2(48, 40), none, _sb297(0, 18, teal))
            for nd in [btn_stop, cp, sb]: inner.add_child(nd)
        "c":   # round buttons + small clock plate
            _btn297(btn_stop, Vector2(46, 46), _sb297(0.42, 23), _sb297(0, 23, teal))
            _btn297(sb, Vector2(46, 46), _sb297(0.42, 23), _sb297(0, 23, teal))
            var cps := _sb297(0.42, 6)
            cps.content_margin_left = 10; cps.content_margin_right = 10; cps.content_margin_top = 3; cps.content_margin_bottom = 3
            cp.add_theme_stylebox_override("panel", cps)
            for nd in [btn_stop, cp, sb]: inner.add_child(nd)
        "d":   # no plates, big clock, smaller icons, wide gaps
            inner.add_theme_constant_override("separation", 22)
            _btn297(btn_stop, Vector2(40, 40), none, none)
            _btn297(sb, Vector2(46, 40), none, none)
            clock.add_theme_font_size_override("font_size", 20)
            clock.add_theme_constant_override("outline_size", 6)
            for nd in [btn_stop, cp, sb]: inner.add_child(nd)
        "e":   # joined segmented bar
            inner.add_theme_constant_override("separation", 1)
            _btn297(btn_stop, Vector2(46, 36), _sb297(0.42, 0, Color(0, 0, 0, 0), 8, 0), _sb297(0, 0, teal, 8, 0))
            _btn297(sb, Vector2(50, 36), _sb297(0.42, 0, Color(0, 0, 0, 0), 0, 8), _sb297(0, 0, teal, 0, 8))
            var mid := _sb297(0.55, 0)
            mid.content_margin_left = 12; mid.content_margin_right = 12; mid.content_margin_top = 4; mid.content_margin_bottom = 4
            cp.add_theme_stylebox_override("panel", mid)
            cp.custom_minimum_size.y = 36
            for nd in [btn_stop, cp, sb]: inner.add_child(nd)
        "f":   # big clock, joined pair on its right
            inner.add_theme_constant_override("separation", 12)
            clock.add_theme_font_size_override("font_size", 20)
            clock.add_theme_constant_override("outline_size", 6)
            var pair := HBoxContainer.new()
            pair.add_theme_constant_override("separation", 1)
            pair.size_flags_vertical = Control.SIZE_SHRINK_CENTER
            _btn297(btn_stop, Vector2(40, 34), _sb297(0.42, 0, Color(0, 0, 0, 0), 6, 0), _sb297(0, 0, teal, 6, 0))
            _btn297(sb, Vector2(44, 34), _sb297(0.42, 0, Color(0, 0, 0, 0), 0, 6), _sb297(0, 0, teal, 0, 6))
            pair.add_child(btn_stop); pair.add_child(sb)
            inner.add_child(cp); inner.add_child(pair)
    hud.add_child(grp)
    hud.move_child(grp, spl.get_index() + 1)
''')
p.write_text(s, encoding="utf-8")
print("s297 r35u3 patched")
