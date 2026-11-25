# set 299 round 35z9b (sample, after s299r35z9): S299CLR 3 = 2 + every "body" text drawn SemiBold
#   4 = 3 + font antialiasing off + full hinting (hard pixel edges)
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/theme.gd"
s = p.read_text(encoding="utf-8")
old = '\t\tvar path: String = FONT_FILES.get(key, FONT_FILES["body"])\n'
assert old in s and "S299CLR" not in s
new = ('\t\tvar _cm := int(OS.get_environment("S299CLR")) if OS.get_environment("S299CLR") != "" else 0   # s299 r35z9b\n'
       '\t\tvar path: String = FONT_FILES.get(("body_b" if key == "body" and _cm >= 3 else key), FONT_FILES["body"])\n'
       '\t\tif _cm >= 4:\n'
       '\t\t\tf.antialiasing = TextServer.FONT_ANTIALIASING_NONE\n'
       '\t\t\tf.hinting = TextServer.HINTING_NORMAL\n')
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("ok")
