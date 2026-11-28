# set 307 u (owner after t): "make the numbers a bit smaller so they don't go past the frame".
# Framed pills only: outline 3 -> 2 units; font size fitted to the frame's inner box (y 13..96, x 13..195 of 208x104):
# digit cap = 0.68 fs (measured 6.8 units at fs 10), keep 1 unit clear above and below -> fs = floor((0.798 h - 2 - outline) / 0.68),
# clamped 7..10, then shrunk while text + outline + 2 > inner width; baseline = top + 0.524 h + 0.34 fs (centred, as round s).
# S307NUMFIT=0 = round t. Usage: python s307u-patch.py <g286> (after s307s; backup r43.gd.s307u)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "r43.gd")
if not os.path.exists(p + ".s307u"): shutil.copy(p, p + ".s307u")
s = open(p, encoding="utf-8", newline="").read()
old = ('\tci.draw_string_outline(f, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 3, Color(0.06, 0.04, 0.03, 0.85 * a))\n'
       '\tci.draw_string(f, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 0.99, 0.95, a))\n')
new = ('\tvar ol := 3\n'
       '\tif fr != "" and OS.get_environment("S307PILLFR") != "0" and OS.get_environment("S307NUMFIT") != "0":   # set 307 u: number fitted inside the frame\n'
       '\t\tol = 2\n'
       '\t\tfs = clampi(int(floor((r.size.y * 0.798 - 2.0 - ol) / 0.68)), 7, 10)\n'
       '\t\twhile fs > 7 and f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x + ol + 2.0 > r.size.x * 0.875: fs -= 1\n'
       '\t\ttw = f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x\n'
       '\t\tpos = Vector2(roundf(r.get_center().x - tw * 0.5), r.position.y + r.size.y * 0.524 + 0.34 * fs)\n'
       '\tci.draw_string_outline(f, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, ol, Color(0.06, 0.04, 0.03, 0.85 * a))\n'
       '\tci.draw_string(f, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 0.99, 0.95, a))\n')
if new not in s:
    assert s.count(old) == 1; s = s.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="").write(s); print("r43.gd ok")
