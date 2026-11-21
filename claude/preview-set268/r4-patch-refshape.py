# set 268 R4 (owner: "button colours are not like the reference at all — make them as close as possible, shape too")
# Measured from the owner's reference picture (21 Nov, not stored): near-square corners, ONE 1-px grey-blue edge (#8ea3b1),
# blue-grey body (~#2c4a5e, ~85 % opaque), no plate ledge · bars = black track + 1-px light frame, teal-green fill with a
# bright top line, MP-blue (#3d8ebe) for the main action. Run after r2-patch-slate-timeline.
import sys, os, json
g = sys.argv[1]

def sub(path, pairs):
    p = os.path.join(g, path)
    t = open(p, encoding="utf-8").read()
    for a, b in pairs:
        a = a.replace("    ", "\t"); b = b.replace("    ", "\t")
        assert a in t, (path, a[:70])
        t = t.replace(a, b, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(t)

tp = os.path.join(g, "data/tone.json")
tone = json.load(open(tp, encoding="utf-8"))
tone["light"].update({
    "panel": "#2c4a5e", "card": "#2c4a5e", "soft": "#37596e", "bg": "#101a22",
    "line": "#8ea3b1", "arena-line": "#8ea3b1", "accent": "#2f6f99", "on-accent": "#ffffff",
    "hp": "#3bc88d", "hp-bg": "#000000", "sel": "#9fe3d0",
})
open(tp, "w", encoding="utf-8", newline="\n").write(json.dumps(tone, ensure_ascii=False, indent=1))

sub("scripts/ui/theme.gd", [
    # shape: every box nearly square (2 px), one thin edge
    ("    var s := StyleBoxFlat.new()\n    s.bg_color = bg\n",
     "    var s := StyleBoxFlat.new()\n    radius = mini(radius, 2)  # R4: reference = near-square corners\n    border = mini(border, 1) if border > 0 else 0\n    s.bg_color = bg\n"),
    # no plate ledge
    ("static func ledge(s: StyleBoxFlat, pressed: bool) -> void:\n",
     "static func ledge(s: StyleBoxFlat, pressed: bool) -> void:\n    return  # R4: flat panels like the reference\n"),
    # main action button: same frame, blue body, no ledge
    ("        var s := box(c(\"accent\"), c(\"accent\").darkened(0.45), 10 if big else 8, 0)\n        s.border_width_bottom = 4\n        s.border_width_right = 2\n",
     "        var s := box(c(\"accent\"), c(\"line\"), 2, 1)\n"),
    # reference text = white with a thin dark outline (buttons + labels)
    ("    t.set_color(\"font_color\", \"Label\", c(\"ink\"))\n",
     "    t.set_color(\"font_color\", \"Label\", c(\"ink\"))\n    for cls in [\"Label\", \"Button\"]:\n        t.set_constant(\"outline_size\", cls, 4)\n        t.set_color(\"font_outline_color\", cls, Color(0.03, 0.06, 0.09, 0.75))\n"),
])
sub("scripts/ui/prep.gd", [("const GLASS := 0.80", "const GLASS := 0.85")])
sub("scripts/ui/slot_cell.gd", [("const GLASS := 0.80", "const GLASS := 0.85")])
# unit HP bars: black track, 1-px light frame, bright top line on the fill
sub("scripts/ui/battle_view.gd", [
    ("        draw_rect(r, under)\n        draw_rect(Rect2(0, 0, size.x * frac, size.y), fill)\n",
     "        draw_rect(r, under)\n        draw_rect(Rect2(0, 0, size.x * frac, size.y), fill)\n        draw_rect(Rect2(0, 0, size.x * frac, 1), fill.lightened(0.35))\n        draw_rect(r, Color(0.50, 0.56, 0.62), false, 1.0)\n"),
])
print("ok refshape")
