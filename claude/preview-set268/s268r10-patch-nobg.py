# set 268 round 10 (owner: "try the icons alone, no background"): pause / fast-forward = the round 9 pixel icons only,
# no button box (touch area stays 58x54, invisible). Run after s268r9-patch-pixicons.
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
    ("            b.add_theme_stylebox_override(st, tile if st != \"focus\" else StyleBoxEmpty.new())\n",
     "            b.add_theme_stylebox_override(st, StyleBoxEmpty.new())   # round 10: icon only\n"),
])
print("ok nobg")
