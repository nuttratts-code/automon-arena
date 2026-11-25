# set 299 round 35z17 (sample, after s299r35z16): lighter-looking symbols (all on the z16 "6" base: size = digit height)
#   S299ICO 7 = no outline · 8 = 80 % size, no outline · 9 = number outline, fill dimmed · 10 = 80 % size, number outline, fill dimmed
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"; s = p.read_text(encoding="utf-8")
old1 = ('\tif OS.get_environment("S299ICO") == "6":   # s299 r35z16: symbol ink height = digit height\n'
        '\t\tvar cap := float(fs) * 0.698\n')
assert s.count(old1) == 1
new1 = ('\tif OS.get_environment("S299ICO") in ["6", "7", "8", "9", "10"]:   # s299 r35z16: symbol ink height = digit height\n'
        '\t\tvar cap := float(fs) * 0.698 * (0.8 if OS.get_environment("S299ICO") in ["8", "10"] else 1.0)\n')
s = s.replace(old1, new1)
old2 = '\t\t\t\tif iv == "6" and f != null:   # s299 r35z16'
assert s.count(old2) == 1
s = s.replace(old2, '\t\t\t\tif iv in ["7", "8"]: pass   # s299 r35z17: no outline\n\t\t\t\telif iv in ["6", "9", "10"] and f != null:   # s299 r35z16')
old3 = '\t\t\tif f != null: _ic_layer.draw_texture_rect(f, r, false, Color(fc, a))\n\t\telse:'
assert s.count(old3) == 1
s = s.replace(old3, '\t\t\tif OS.get_environment("S299ICO") in ["9", "10"]: fc = fc.darkened(0.3)   # s299 r35z17: dimmer fill\n' + old3)
p.write_text(s, encoding="utf-8"); print("ok")
