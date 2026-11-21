# set 268 round 11 (owner: "tone the buttons down, they stand out too much"): the pixel icons go grey-blue and a little
# see-through — fill #9fadb6 (was #d6e2e9), lit #bcc8cf (was white), shade #75848f, outline softer, whole icon 80 %.
# Run after s268r10-patch-nobg.
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

sub("scripts/ui/s268_icon.gd", [
    ("const OUT := Color(\"#0e1620\")\nconst BASE := Color(\"#d6e2e9\")\nconst LIT := Color(\"#ffffff\")\nconst SHADE := Color(\"#93a6b3\")\n",
     "const OUT := Color(\"#16202a\", 0.85)   # round 11: toned down\nconst BASE := Color(\"#9fadb6\")\nconst LIT := Color(\"#bcc8cf\")\nconst SHADE := Color(\"#75848f\")\n"),
    ("    mouse_filter = Control.MOUSE_FILTER_IGNORE\n", "    mouse_filter = Control.MOUSE_FILTER_IGNORE\n    modulate.a = 0.8\n"),
])
print("ok tonedown")
