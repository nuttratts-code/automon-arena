# set 268 R7 (owner A2 B2 C2): battle bottom = only two bare symbols at the bottom-right — pause (grey ▮▮ / ▶) and
# fast-forward (red ▶▶, cycles 1→2→4→8→16, shows the speed above 1×). Skip-to-result, auto-skip and the ticker line are gone
# (nodes kept hidden so the rest of the sample code still runs). Run after r6.
import sys, os, shutil
g = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
shutil.copy(os.path.join(here, "r7-icon.gd.txt"), os.path.join(g, "scripts/ui/s268_icon.gd"))

def sub(path, pairs):
    p = os.path.join(g, path)
    t = open(p, encoding="utf-8").read()
    for a, b in pairs:
        a = a.replace("    ", "\t"); b = b.replace("    ", "\t")
        assert a in t, (path, a[:70])
        t = t.replace(a, b, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(t)

sub("scripts/ui/battle.gd", [
    ("    h.add_child(chk_auto)\n    return d\n",
     """    h.add_child(chk_auto)
    # R7: everything off except the two symbols, pushed to the right
    tb.visible = false; btn_skip.visible = false; chk_auto.visible = false
    var spc := Control.new()
    spc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    h.add_child(spc); h.move_child(spc, 0)
    h.move_child(sb, h.get_child_count() - 1)   # order: pause, then fast-forward (rightmost)
    for pair in [[btn_stop, "pause"], [sb, "ff"]]:
        var b: Button = pair[0]
        b.flat = true
        b.custom_minimum_size = Vector2(60, 48)
        b.add_theme_color_override("font_color", Color(0, 0, 0, 0)); b.add_theme_color_override("font_pressed_color", Color(0, 0, 0, 0))
        b.add_theme_color_override("font_hover_color", Color(0, 0, 0, 0)); b.add_theme_color_override("font_focus_color", Color(0, 0, 0, 0))
        b.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0))
        for st in ["normal", "hover", "pressed", "focus", "hover_pressed"]:
            b.add_theme_stylebox_override(st, StyleBoxEmpty.new())
        var ic: Control = load("res://scripts/ui/s268_icon.gd").new()
        ic.kind = pair[1]
        b.add_child(ic)
        _icons[pair[1]] = ic
    return d

var _icons := {}
"""),
    ("    if speed_btns.has(0):\n        (speed_btns[0] as Button).text = \"เร็ว %d×\" % v\n",
     "    if speed_btns.has(0):\n        (speed_btns[0] as Button).text = \"เร็ว %d×\" % v\n    if _icons.has(\"ff\"):\n        _icons[\"ff\"].speed = v\n"),
    ("    if view.playing:\n        view.pause()\n",
     "    if _icons.has(\"pause\"):\n        _icons[\"pause\"].paused = view.playing\n    if view.playing:\n        view.pause()\n"),
])
print("ok battleicons")
