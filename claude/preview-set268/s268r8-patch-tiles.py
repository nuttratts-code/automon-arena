# set 268 round 8 (owner picture 21 Nov: three see-through teal tiles with a word on top + white icon; owner A1 two tiles,
# no words): pause + fast-forward become see-through teal rounded tiles (~#1d6079 at 62 %, radius 8, no edge) with white
# icons. Measured from the picture. Run after r7b-patch-battleicons.
import sys, os
g = sys.argv[1]

def sub(path, pairs):
    p = os.path.join(g, path)
    t = open(p, encoding="utf-8").read()
    for a, b in pairs:
        a = a.replace("    ", "\t"); b = b.replace("    ", "\t")
        assert a in t, (path, a[:70])
        t = t.replace(a, b, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(t)

sub("scripts/ui/battle.gd", [
    ("        b.flat = true\n", "        b.flat = false   # round 8: flat buttons skip the tile\n"),
    ("        b.custom_minimum_size = Vector2(60, 48)\n", "        b.custom_minimum_size = Vector2(58, 54)\n"),
    ("        for st in [\"normal\", \"hover\", \"pressed\", \"focus\", \"hover_pressed\"]:\n            b.add_theme_stylebox_override(st, StyleBoxEmpty.new())\n",
     """        for st in ["normal", "hover", "pressed", "focus", "hover_pressed"]:
            var tile := StyleBoxFlat.new()
            tile.bg_color = Color("#1d6079", 0.74 if st in ["pressed", "hover_pressed"] else 0.62)
            tile.set_corner_radius_all(8)
            tile.anti_aliasing = true
            b.add_theme_stylebox_override(st, tile if st != "focus" else StyleBoxEmpty.new())
"""),
])
sub("scripts/ui/s268_icon.gd", [
    ("const GREY := Color(0.55, 0.58, 0.62)\nconst RED := Color(0.98, 0.22, 0.32)\nconst EDGE := Color(0.05, 0.07, 0.10, 0.85)\n",
     "const GREY := Color(\"#e8f6fa\")   # round 8: white icons on the teal tile\nconst RED := Color(\"#e8f6fa\")\nconst EDGE := Color(0.05, 0.20, 0.27, 0.35)\n"),
    ("    var s := minf(size.x, size.y) * 0.62\n", "    var s := minf(size.x, size.y) * 0.50\n"),
    ("    for p in pts: big.append(c + (p - c) * 1.0 + (p - c).normalized() * 2.0)\n",
     "    for p in pts: big.append(c + (p - c) + (p - c).normalized() * 1.0 + Vector2(0, 1.5))   # soft drop below, like the picture\n"),
])
print("ok tiles")
