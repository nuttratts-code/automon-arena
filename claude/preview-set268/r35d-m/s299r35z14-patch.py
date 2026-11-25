# set 299 round 35z14 (sample, after s299r35z13): burn number/symbol #ff6a55 -> #ff7a66 (contrast 4.4 -> 4.5+ on the P6 plate)
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"; s = p.read_text(encoding="utf-8")
assert s.count("\"burn\": Color(\"#ff6a55\")") == 1
s = s.replace("\"burn\": Color(\"#ff6a55\")", "\"burn\": Color(\"#ff7a66\")"); p.write_text(s, encoding="utf-8"); print("ok")
