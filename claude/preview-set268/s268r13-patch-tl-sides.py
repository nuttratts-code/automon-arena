# set 268 round 13 (owner 21 Nov): timeline sides split — own units ride ABOVE the line, foes BELOW it, both on the
# same line (same act point, same scale); a short stem joins each portrait to its spot on the line.
# Run after s268r12-patch-states.
import sys, os
g = sys.argv[1]

def sub(path, pairs):
    p = os.path.join(g, path)
    t = open(p, encoding="utf-8").read()
    for a, b in pairs:
        assert a in t, (path, a[:70])
        t = t.replace(a, b, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(t)

sub("scripts/ui/battle.gd", [
    ("\t_tl.custom_minimum_size.y = 60\n", "\t_tl.custom_minimum_size.y = 112   # round 13: own row above + foe row below the line\n"),
])
sub("scripts/ui/s268_timeline.gd", [
    ("\t\tvar c := Vector2(lerpf(x1 - 14.0, x0, f), y)\n\t\tvar frame := FOE_COL if int(v[\"side\"]) == 1 else OWN_COL\n",
     "\t\tvar foe := int(v[\"side\"]) == 1\n\t\tvar lx := lerpf(x1 - 14.0, x0, f)\n\t\tvar dy := (r + 2.5) * (1.0 if foe else -1.0)   # round 13b (owner picture): diamond tip touches the line, own above, foe below\n\t\tvar c := Vector2(lx, y + dy)\n\t\tvar frame := FOE_COL if foe else OWN_COL\n"),
])
print("ok tl sides")
