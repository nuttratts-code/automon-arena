# set 293 round 35s7 (sample, after s293r35s6): owner after the 5 fade shapes: "no gradient looks nicer".
# Default plate = flat run-end slate (R23_INK) at one even 0.70 strength, no border, no gradient (cards + detail band).
# S293FDIR=v|h|d|c|e = the round 35s6 shapes.
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")
old = "\tvar m := OS.get_environment(\"S293FDIR\")\n"
new = old + "\tif m == \"\":\n\t\tcv.draw_rect(r, Color(col, a0 * 0.8))   # s293 r35s7 (owner): flat, no gradient\n\t\treturn\n"
assert s.count(old) == 1
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("s293r35s7 patched", p)
