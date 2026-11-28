# set 307 w2 (owner): pick W2 (35 % thinner) + "clean up the edge — where do the dark lines come from?".
# Cause: the card body texture starts 15 src px in from its edge and was still drawn at 9-slice scale 0.21 (= 3.2 units),
# while the thinner frame's hole now starts at 18 px x 0.1365 (= 2.5 units) -> a ~0.7 unit transparent gap between frame
# and body shows the dark panel behind = dark line on the left / right / bottom and a second diagonal at the BR cut.
# Fix: body drawn with the same scale as the frame (fsc), so body and frame keep their painted fit; default S307FSC = 0.65.
# Usage: python s307w2-patch.py <g286> (after s307w; backup r43.gd.s307w2)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "r43.gd")
if not os.path.exists(p + ".s307w2"): shutil.copy(p, p + ".s307w2")
s = open(p, encoding="utf-8", newline="").read()
FSC_OLD = '\tvar fsc := 0.21 * (float(OS.get_environment("S307FSC")) if OS.get_environment("S307FSC") != "" else 1.0)   # set 307 w: thinner card frame\n'
FSC_NEW = '\tvar fsc := 0.21 * (float(OS.get_environment("S307FSC")) if OS.get_environment("S307FSC") != "" else 0.65)   # set 307 w: thinner card frame · w2: owner pick W2 = 0.65\n'
rep = [(FSC_OLD, ""),
       ('\tvar ly := _layers50(ci)', FSC_NEW + '\tvar ly := _layers50(ci)'),
       ('_tex("card_body_" + tk), r, 30.0, 0.21,', '_tex("card_body_" + tk), r, 30.0, fsc,'),
       ('_tex("card_body"), r, 30.0, 0.21, tint)', '_tex("card_body"), r, 30.0, fsc, tint)')]
if FSC_NEW not in s:
    for old, new in rep:
        assert s.count(old) == 1, old; s = s.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="").write(s); print("r43.gd ok")
