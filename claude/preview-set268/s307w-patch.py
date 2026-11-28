# set 307 w (owner): "make the character card frame thinner". Picks A1 = 3 levels to compare · B1 pill frames unchanged ·
# C1 cut corners shrink with the edge. Card frame only: 9-slice scale 0.21 x S307FSC (env, default 1.0 = round v);
# creature right limit follows the thinner edge. Levels shown: 0.8 / 0.65 / 0.5 (20 / 35 / 50 % thinner).
# Usage: python s307w-patch.py <g286> (after s307u; backup r43.gd.s307w)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "r43.gd")
if not os.path.exists(p + ".s307w"): shutil.copy(p, p + ".s307w")
s = open(p, encoding="utf-8", newline="").read()
rep = [('\tvar fx1 := r.end.x - 18.0 * 0.21 - 1.0   # r50c: inside the right gold frame\n',
        '\tvar fsc := 0.21 * (float(OS.get_environment("S307FSC")) if OS.get_environment("S307FSC") != "" else 1.0)   # set 307 w: thinner card frame\n'
        '\tvar fx1 := r.end.x - 18.0 * fsc - 1.0   # r50c: inside the right gold frame (set 307 w: follows fsc)\n'),
       ('else "card_frame"), r, 30.0, 0.21, Color(1, 1, 1, fa))', 'else "card_frame"), r, 30.0, fsc, Color(1, 1, 1, fa))')]
for old, new in rep:
    if new not in s:
        assert s.count(old) == 1, old; s = s.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="").write(s); print("r43.gd ok")
