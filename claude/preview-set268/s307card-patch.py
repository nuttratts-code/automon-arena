# set 307 card: owner "put the price number on the coin" + "shorter stat pills, shop numbers are short".
#  - pills 34 -> 26 wide (textures re-baked at 26:13 by S307-bake-pills.py + S307-pills-c.py; fits 3 digits like "120")
#  - coin bigger (strip height - 1) at the right of the name strip, price drawn on the coin face (red when gold is short);
#    the separate price text is gone, the name gets the freed room.
# Usage: python s307card-patch.py <g286> (after s307coin)
import sys, os, shutil
here = os.path.dirname(os.path.abspath(__file__)); g = sys.argv[1]
for n in ["hp", "atk", "multi", "burn", "shock", "armor", "heal"]:
    shutil.copy(os.path.join(here, "S307-pill_%s.png" % n), os.path.join(g, "ui_r48", "pill_%s.png" % n))
p = os.path.join(g, "scripts", "ui", "r43.gd")
s = open(p, encoding="utf-8", newline="").read()
if not os.path.exists(p + ".s307card"): shutil.copy(p, p + ".s307card")
def rep(old, new):
    global s
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
rep("Rect2(r.position.x + 5, py + i * (ph + gap), 34, ph)", "Rect2(r.position.x + 5, py + i * (ph + gap), 26, ph)")
rep("\tvar pw := fd.get_string_size(ps, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x\n\tvar room := r.size.x - 21 - pw - 24\n",
    "\tvar ct := _tex(\"coin\")   # r51 C1 painted coin; set 307: tilted, price drawn on it\n"
    "\tvar chh := bh - 1.0\n\tvar cw := chh * float(ct.get_width()) / float(ct.get_height())\n"
    "\tvar room := r.size.x - 21 - cw - 9\n")
i0 = s.index("\tv._txt(ci, fd, Vector2(r.end.x - 5 - pw, r.position.y + bh - 3), ps, 12,")
i1 = s.index("\tci.draw_texture_rect(ct, Rect2(r.end.x - 6 - pw - 13,")
i1 = s.index("\n", i1) + 1
s = s[:i0] + (
    "\tvar crc := Rect2(r.end.x - 5 - cw, r.position.y + 1 + (bh - chh) * 0.5, cw, chh)\n"
    "\tci.draw_texture_rect(ct, crc, false, Color(1, 1, 1, fa))\n"
    "\tvar pfs := 11\n"
    "\tvar ptw := fd.get_string_size(ps, HORIZONTAL_ALIGNMENT_LEFT, -1, pfs).x\n"
    "\tvar fc := crc.get_center() - Vector2(cw * 0.05, chh * 0.05)   # face centre (the rim shows bottom-right)\n"
    "\tvar pp := Vector2(roundf(fc.x - ptw * 0.5), roundf(fc.y + pfs * 0.36))\n"
    "\tci.draw_string_outline(fd, pp, ps, HORIZONTAL_ALIGNMENT_LEFT, -1, pfs, 3, Color(0.16, 0.08, 0.01, 0.95 * fa))\n"
    "\tci.draw_string(fd, pp, ps, HORIZONTAL_ALIGNMENT_LEFT, -1, pfs, Color(\"#ff6a5a\") if cant else Color(\"#fff8e0\"))\n"
) + s[i1:]
open(p, "w", encoding="utf-8", newline="").write(s)
print("s307card ok")
