# set 307 r: stat pills framed with the shrunk card frame (S307r-pillframe.py -> ui_r48/pill_fr_<kind>_<tok>.png),
# frame colour = the card's rarity frame (owner A1; no rarity -> gold). S307PILLFR=0 = round q pills.
# Usage: python s307r-patch.py <g286> (after s307p; backup r43.gd.s307r)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "r43.gd")
if not os.path.exists(p + ".s307r"): shutil.copy(p, p + ".s307r")
s = open(p, encoding="utf-8", newline="").read()
old = 'static func _pill(ci: CanvasItem, f: Font, r: Rect2, s: String, kind: String, a: float) -> void:   # r51: painted pill (GPT) + number\n'
new = ('static func _pill(ci: CanvasItem, f: Font, r: Rect2, s: String, kind: String, a: float, fr: String = "") -> void:   # r51: painted pill (GPT) + number\n'
       '\tif fr != "" and OS.get_environment("S307PILLFR") != "0": kind = kind + "_" + fr; kind = "fr_" + kind   # set 307 r: card frame around the pill\n')
if new not in s:
    assert s.count(old) == 1; s = s.replace(old, new, 1)
old2 = 'str(pl[i][1]), str(pl[i][0]), fa)'
new2 = 'str(pl[i][1]), str(pl[i][0]), fa, str(RAR307.get(rar, "gold")))'
if new2 not in s:
    assert s.count(old2) == 1; s = s.replace(old2, new2, 1)
open(p, "w", encoding="utf-8", newline="").write(s); print("r43.gd ok")
