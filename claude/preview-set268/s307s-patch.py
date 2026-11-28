# set 307 s: number centred on the framed pill's inner box (texture inner box y 13..96 of 104 -> centre 0.524 h;
# digit cap measured 15 px on PC = 6.8 units -> baseline = top + 0.524 h + 3.4, no y rounding: whole units = 2.2 px steps on PC).
# S307NUMC=0 = round r position. Usage: python s307s-patch.py <g286> (after s307r; backup r43.gd.s307s)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "r43.gd")
if not os.path.exists(p + ".s307s"): shutil.copy(p, p + ".s307s")
s = open(p, encoding="utf-8", newline="").read()
old = '\tvar pos := Vector2(roundf(r.get_center().x - tw * 0.5), roundf(r.end.y - 2.5))\n'
new = old + ('\tif fr != "" and OS.get_environment("S307PILLFR") != "0" and OS.get_environment("S307NUMC") != "0":   # set 307 s: centred on the inner box\n'
             '\t\tpos.y = r.position.y + r.size.y * 0.524 + 3.4\n')
if new not in s:
    assert s.count(old) == 1; s = s.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="").write(s); print("r43.gd ok")
