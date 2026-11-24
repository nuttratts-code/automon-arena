# set 294 round 35s8c (sample, after s294r35s8b). Owner: "2 rows x 3 · I like the white frame" ->
# on-unit tags flow 3 per row (left to right, row by row, max 2 rows), every tag keeps a white 1 px frame;
# the picked unit's tags = 2 px frame. S294COLS=2 = round 35s8b (3 rows x 2, frame only on the picked unit).
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")
def rep(old, new):
    global s
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
rep("\tvar cw := [0.0, 0.0]\n\tfor k in have.size(): cw[k % 2] = maxf(cw[k % 2],",
    "\tvar nc := 2 if OS.get_environment(\"S294COLS\") == \"2\" else 3   # s294 r35s8c: 3 per row\n"
    "\tvar cw := [0.0, 0.0, 0.0]\n\tfor k in have.size(): cw[k % nc] = maxf(cw[k % nc],")
rep("\tvar rows := (have.size() + 1) / 2\n", "\tvar rows := (have.size() + nc - 1) / nc\n")
rep("\tvar w: float = cw[0] + (1.0 + cw[1] if have.size() > 1 else 0.0)\n",
    "\tvar w := 0.0\n\tfor c in mini(nc, have.size()): w += float(cw[c]) + (1.0 if c > 0 else 0.0)\n")
rep("\t\tvar tr := Rect2(x0 + (0.0 if k % 2 == 0 else cw[0] + 1.0), y0 + float(k / 2) * (th + 1.0), cw[k % 2], th)\n",
    "\t\tvar tx0 := x0\n\t\tfor c in k % nc: tx0 += float(cw[c]) + 1.0\n"
    "\t\tvar tr := Rect2(tx0, y0 + float(k / nc) * (th + 1.0), cw[k % nc], th)\n")
rep("\t\tif on:\n\t\t\tsb.border_color = Color(1, 1, 1, 0.95); sb.set_border_width_all(1)\n",
    "\t\tif on or nc == 3:   # s294 r35s8c (owner): white frame on every tag, picked = 2 px\n"
    "\t\t\tsb.border_color = Color(1, 1, 1, 0.95); sb.set_border_width_all(2 if on and nc == 3 else 1)\n")
p.write_text(s, encoding="utf-8")
print("s294r35s8c patched", p)
