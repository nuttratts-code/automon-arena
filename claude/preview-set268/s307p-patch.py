# set 307 p: S307PILLV=p1..p4 picks the pill variant ui_r48/pill_<kind>_<v>.png (S307p-pills.py); unset = pill_<kind>.png.
# Usage: python s307p-patch.py <g286> (after s307o; backup r43.gd.s307p)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "r43.gd")
if not os.path.exists(p + ".s307p"): shutil.copy(p, p + ".s307p")
s = open(p, encoding="utf-8", newline="").read()
old = 'static func _pill(ci: CanvasItem, f: Font, r: Rect2, s: String, kind: String, a: float) -> void:   # r51: painted pill (GPT) + number\n'
new = old + '\tif OS.get_environment("S307PILLV") != "": kind += "_" + OS.get_environment("S307PILLV")   # set 307 p: variant sheet\n'
if new not in s:
    assert s.count(old) == 1; s = s.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="").write(s); print("r43.gd ok")
