# set 299 round 35z9c (sample, after s299r35z9b): owner picked C3 -> S299CLR default 3 (0 = old look);
# text under 0.6 opacity (dead units 0.45, faint zero marks) keeps its own opacity instead of going full.
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
t = g / "scripts/ui/s286_team.gd"; s = t.read_text(encoding="utf-8")
a = 'int(OS.get_environment("S299CLR")) if OS.get_environment("S299CLR") != "" else 0\n'
b = '\tvar o := Color(c.r, c.g, c.b, 1.0)\n'
assert a in s and b in s
s = s.replace(a, a.replace("else 0", "else 3")).replace(b, '\tvar o := Color(c.r, c.g, c.b, 1.0 if c.a >= 0.6 else c.a)\n')
t.write_text(s, encoding="utf-8")
h = g / "scripts/ui/theme.gd"; s = h.read_text(encoding="utf-8")
a2 = 'OS.get_environment("S299CLR") != "" else 0   # s299 r35z9b'
assert a2 in s
h.write_text(s.replace(a2, a2.replace("else 0", "else 3")), encoding="utf-8"); print("ok")
