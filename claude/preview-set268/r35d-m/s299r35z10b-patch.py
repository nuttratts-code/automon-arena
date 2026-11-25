# set 299 round 35z10b (sample, after s299r35z10): owner picked P6 -> S299PL default 6 ("0" = the old teal plate)
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"; s = p.read_text(encoding="utf-8")
old = '\treturn [Color("#18262f"), Color("#1f5266"), 0.60, 0.72, Color("#d6e8ee"), 0.34, false, false]\n'
assert old in s and s.count(old) == 1
s = s.replace('\tmatch OS.get_environment("S299PL"):\n', '\tmatch OS.get_environment("S299PL"):\n\t\t"0": ' + old.strip() + '\n')
s = s.replace(old, '\treturn [Color("#16283a"), Color("#24425a"), 0.84, 0.90, Color("#e6dcc0"), 0.45, true, true]   # P6 default (owner pick)\n')
p.write_text(s, encoding="utf-8"); print("ok")
