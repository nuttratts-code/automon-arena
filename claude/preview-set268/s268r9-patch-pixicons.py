# set 268 round 9 (owner: "the buttons look pasted on — how do others do it?" → A1): pixel icons in the sprites' hand
# (s268r9-pixicon.gd.txt) on the same slate button as every other button (2-px corners, 1-px edge, BTN_A see-through) —
# replaces the round 8 teal tiles. Run after s268r8-patch-tiles.
import sys, os, shutil
g = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
shutil.copy(os.path.join(here, "s268r9-pixicon.gd.txt"), os.path.join(g, "scripts/ui/s268_icon.gd"))

def sub(path, pairs):
    p = os.path.join(g, path)
    t = open(p, encoding="utf-8").read()
    for a, b in pairs:
        a = a.replace("    ", "\t"); b = b.replace("    ", "\t")
        assert a in t, (path, a[:70])
        t = t.replace(a, b, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(t)

sub("scripts/ui/battle.gd", [
    ("            var tile := StyleBoxFlat.new()\n            tile.bg_color = Color(\"#1d6079\", 0.74 if st in [\"pressed\", \"hover_pressed\"] else 0.62)\n            tile.set_corner_radius_all(8)\n            tile.anti_aliasing = true\n",
     "            var tile := TH.box(Color(TH.c(\"soft\") if st in [\"pressed\", \"hover_pressed\"] else TH.c(\"panel\"), TH.BTN_A), TH.c(\"line\"), 2, 1, 0, 0)   # round 9: same slate button as the rest\n"),
])
print("ok pixicons")
