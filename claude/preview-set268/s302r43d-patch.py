# set 302 r43d: gold padlock + cyan reroll icon (picture)
import sys, os, shutil
g = sys.argv[1]
p = os.path.join(g, "scripts/ui/prep.gd")
s = open(p, encoding="utf-8").read()
if not os.path.exists(p + ".s302r43d"): shutil.copy(p, p + ".s302r43d")
for o, n in [('\tvar ic := SHAPE.make("reroll", "ink", 26)\n',
              '\tvar ic := SHAPE.make("reroll", "ink", 26)\n\tif OS.get_environment("S302R43") == "1": ic.modulate = Color("#7fe3ff")   # r43: cyan reroll (picture)\n'),
             ('\t\tcc.add_child(SHAPE.make("lock" if on else "unlock", "gold" if on else "mute", 26))\n',
              '\t\tcc.add_child(SHAPE.make("lock" if on else "unlock", "gold" if on or OS.get_environment("S302R43") == "1" else "mute", 26))   # r43: gold padlock (picture)\n')]:
    assert s.count(o) == 1, o
    s = s.replace(o, n)
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("s302r43d patched")
