# set 299 round 36n (sample, after s299r36m): owner picked ข 2 → S299INSET default 2 (cards 2 px in from the top plate's line,
#   own full frame); env S299INSET still overrides (0 = r36l shared line)
import sys, pathlib, re
here = pathlib.Path(__file__).parent
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
src = (here / "s299r36-prep.gd.txt").read_text(encoding="utf-8")
assert "owner pick" in src
src = re.sub(r"(?m)^((?:    )+)", lambda m: "\t" * (len(m.group(1)) // 4), src)
(g / "scripts/ui/s299_prep.gd").write_text(src, encoding="utf-8")
print("ok r36n")
