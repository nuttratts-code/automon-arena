# set 303 r50: owner "a background per tribe on the card" -> B2 colour + faint tribe motif · C1 steel = silver-grey ·
# D1 all 6 in one GPT picture (S303r50-gpt-tribe-bg-1.png, attempt 1 of 2). S303r50-split-bg.py masks each panel to the
# r49b body shape -> S303r50-card_body_<tribe>.png. r43.gd _card(): body = painted tribe body, untinted (main tribe = ts[0]);
# unknown tribe falls back to the r49b grey body + tint. Frame r49c unchanged.
# Usage: python s302r50-patch.py <g286> (after s302r49c; PNGs beside this file)
import sys, os, shutil
here = os.path.dirname(os.path.abspath(__file__)); g = sys.argv[1]
for n in ["steel", "fire", "bolt", "wind", "spirit", "fiend"]:
    shutil.copy(os.path.join(here, "S303r50-card_body_%s.png" % n), os.path.join(g, "ui_r48", "card_body_%s.png" % n))
p = os.path.join(g, "scripts", "ui", "r43.gd")
s = open(p, encoding="utf-8", newline="").read()
if not os.path.exists(p + ".s302r50"): shutil.copy(p, p + ".s302r50")
old = '\t_nine(ci, _tex("card_body"), r, 30.0, 0.21, tint)   # r49: 9-slice, frame ~1.5x thicker than a plain stretch\n'
new = ('\tvar tk: String = BADGE50.FILE.get(str(ts[0]), "") if ts.size() > 0 else ""   # r50: painted body per main tribe\n'
       '\tif tk != "": _nine(ci, _tex("card_body_" + tk), r, 30.0, 0.21, Color(1, 1, 1, fa))\n'
       '\telse: _nine(ci, _tex("card_body"), r, 30.0, 0.21, tint)   # r49: grey body + tint (fallback)\n')
assert s.count(old) == 1, "body line not found"
s = s.replace(old, new)
anchor = "static func _tex(n: String) -> Texture2D:"
assert s.count(anchor) == 1
s = s.replace(anchor, 'const BADGE50 = preload("res://scripts/ui/badge299.gd")   # r50: tribe name -> file key\n\n' + anchor)
open(p, "w", encoding="utf-8", newline="").write(s)
print("r50 ok")
