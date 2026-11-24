#!/usr/bin/env python3
# set 297 round 35u5 (owner picked G, "compare it on the whole screen"): S297TOP=k = G + white icons with the dark outline
#   + the group centred on the SCREEN (in G it sat beside the expand spacers, so it drifted off centre)
#   icons: s268_icon.gd gets `white` -> colour #eef3f6 (= clock), alpha 1.0 at rest (grey 0.55 was why modulate 1.7 did nothing)
# run after s297r35u4-patch.py:  python -I s297r35u5-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")

b = root / "scripts/ui/battle.gd"
sub(b, T('''        "g", "h", "i", "j":   # s297 r35u4: no plates
'''), T('''        "k":   # s297 r35u5: G + white icons, centred on the screen
            inner.add_theme_constant_override("separation", 14)
            _btn297(btn_stop, Vector2(36, 36), none, none)
            _btn297(sb, Vector2(36, 36), none, none)
            clock.add_theme_font_size_override("font_size", 18)
            clock.add_theme_constant_override("outline_size", 5)
            for k in _icons: (_icons[k] as Control).set("white", true)
            for nd in [btn_stop, cp, sb]: inner.add_child(nd)
            var holder := Control.new()
            holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
            holder.add_child(grp)
            grp.top_level = true   # holder moves after hud.resized; top_level keeps the screen-centre spot
            hud.add_child(holder)
            hud.move_child(holder, spl.get_index() + 1)
            var place := func() -> void:
                var hr: Rect2 = hud.get_global_rect()
                grp.size = grp.get_combined_minimum_size()
                grp.global_position = Vector2(roundf(hr.position.x + (hr.size.x - grp.size.x) * 0.5), roundf(hud.global_position.y + (hud.size.y - grp.size.y) * 0.5))
            hud.resized.connect(place)
            grp.minimum_size_changed.connect(place)
            place.call_deferred()
            return
        "g", "h", "i", "j":   # s297 r35u4: no plates
'''))

ic = root / "scripts/ui/s268_icon.gd"
sub(ic, 'var speed := 1\n', 'var speed := 1\nvar white := false   # s297 r35u5: white icon + dark outline (top bar k)\n')
sub(ic, T('''    var a := 0.95 if on else 0.55
    var s := roundf(minf(size.x, size.y) * 0.62)
'''), T('''    var a := 0.95 if on else 0.55
    var fillc := LIT
    if white:
        a = 1.0
        fillc = Color("#eef3f6")
    var s := roundf(minf(size.x, size.y) * 0.62)
'''))
sub(ic, 'draw_texture_rect(TEAM.icon_tex(String(keys[i])), r, false, Color(LIT, a))',
    'draw_texture_rect(TEAM.icon_tex(String(keys[i])), r, false, Color(fillc, a))')
print("s297r35u5 ok")
