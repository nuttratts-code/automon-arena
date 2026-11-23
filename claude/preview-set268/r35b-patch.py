# set 286 = set 268 round 35b (after r35-patch-team.py): team overlay becomes full-rect (bars under every unit),
# stop button: the "pressed + hover" text colour was never made see-through -> hidden "▶ เล่นต่อ" showed on hover while paused.
# Needs scripts/ui/s286_team.gd from r35b (copy: claude/preview-set268/r35b-s286_team.gd.txt).
import sys, pathlib
g = pathlib.Path(sys.argv[1])

def sub(rel, old, new):
    p = g / rel
    s = p.read_text(encoding="utf-8")
    assert old in s, (rel, old[:60])
    p.write_text(s.replace(old, new, 1), encoding="utf-8")

sub("scripts/ui/battle.gd",
    "\t\t_team.anchor_left = 0.0; _team.anchor_right = 1.0; _team.anchor_top = 1.0; _team.anchor_bottom = 1.0\n"
    "\t\t_team.offset_left = 16.0; _team.offset_right = -150.0; _team.offset_top = -64.0; _team.offset_bottom = -10.0\n",
    "\t\t_team.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT) # r35b: bars under every unit\n")

sub("scripts/ui/battle.gd",
    "\t\tb.add_theme_color_override(\"font_hover_color\", Color(0, 0, 0, 0)); b.add_theme_color_override(\"font_focus_color\", Color(0, 0, 0, 0))\n",
    "\t\tb.add_theme_color_override(\"font_hover_color\", Color(0, 0, 0, 0)); b.add_theme_color_override(\"font_focus_color\", Color(0, 0, 0, 0))\n"
    "\t\tb.add_theme_color_override(\"font_hover_pressed_color\", Color(0, 0, 0, 0)); b.add_theme_color_override(\"font_disabled_color\", Color(0, 0, 0, 0)) # s286r35b: hidden text showed on hover while paused\n")
print("ok")
