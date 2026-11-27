# set 303 r51: painted stat pills (7 kinds, one GPT sheet, owner B "all colours + a themed pattern", heal = "+" marks +
# sparkles) + painted coin on the shop card (C1, D1 card only). Owner rule set 286 r35c: show EVERY non-zero carried
# value -> hp · atk · ×multi (> 1) · burn · shock · armour/hit · heal/hit (level 1), no cooldown (E1), colour only (F2),
# one column down the left (G1). Pills = 3-slice by height (caps 42 % of height keep the 2-cut chamfers), numbers in code
# with a thin dark outline. Sample-only env S303PILLDEMO=1 fakes extra values on cards 1/3/4/5 to show all 7 kinds.
# Usage: python s302r51-patch.py <g286> (after s302r50d)
import sys, os, shutil
here = os.path.dirname(os.path.abspath(__file__)); g = sys.argv[1]
os.makedirs(os.path.join(g, "ui_r48"), exist_ok=True)
for n in ["hp", "atk", "multi", "burn", "shock", "armor", "heal"]:
    shutil.copy(os.path.join(here, "S303r51-pill_%s.png" % n), os.path.join(g, "ui_r48", "pill_%s.png" % n))
shutil.copy(os.path.join(here, "S303r51-coin.png"), os.path.join(g, "ui_r48", "coin.png"))
p = os.path.join(g, "scripts", "ui", "r43.gd")
s = open(p, encoding="utf-8", newline="").read()
if not os.path.exists(p + ".s302r51"): shutil.copy(p, p + ".s302r51")
def rep(old, new, tag):
    global s
    assert s.count(old) == 1, tag
    s = s.replace(old, new)
# 1) the cell builder collects the non-zero values in the owner's order
rep("\tvc.draw.connect(func() -> void: _card(vc, tex, str(c[\"name\"]), int(float(c[\"price\"])), cols, ts, hp, atk, cant, owned))\n",
    "\tvar pl := _pills51(c, hp, atk, cell.get_index())   # r51: every non-zero carried value\n"
    "\tvc.draw.connect(func() -> void: _card(vc, tex, str(c[\"name\"]), int(float(c[\"price\"])), cols, ts, pl, cant, owned))\n", "connect")
# 2) _pill -> painted 3-slice + outlined number
i0 = s.index("static func _pill(ci: CanvasItem, f: Font, r: Rect2, s: String, fill: Color) -> void:\n")
i1 = s.index("static func _card(", i0)
s = s[:i0] + (
"const PILL51 := [\"hp\", \"atk\", \"multi\", \"burn\", \"shock\", \"armor\", \"heal\"]\n"
"static func _pills51(c: Dictionary, hp: float, atk: float, idx: int) -> Array:   # r51: [[kind, text], ...] non-zero, owner order\n"
"\tvar v := V()\n"
"\tvar val := {\"hp\": hp, \"atk\": atk, \"multi\": v._lv(c, \"multi\"), \"burn\": v._lv(c, \"burn\"), \"shock\": v._lv(c, \"shock\"),\n"
"\t\t\"armor\": v._lv(c, \"armorHit\"), \"heal\": v._lv(c, \"healHit\")}\n"
"\tif OS.get_environment(\"S303PILLDEMO\") == \"1\":   # sample only: fake values so every kind shows once\n"
"\t\tvar fk: Dictionary = {0: {\"multi\": 2.0, \"armor\": 5.0}, 2: {\"shock\": 2.0, \"heal\": 4.0}, 3: {\"armor\": 10.0}, 4: {\"multi\": 3.0, \"burn\": 3.0, \"heal\": 5.0}}.get(idx, {})\n"
"\t\tfor k in fk: val[k] = fk[k]\n"
"\tvar out := []\n"
"\tfor k in PILL51:\n"
"\t\tvar x: float = val[k]\n"
"\t\tif k == \"multi\":\n"
"\t\t\tif x > 1.0: out.append([k, \"×\" + v._num(x)])\n"
"\t\telif x != 0.0: out.append([k, v._num(x)])\n"
"\treturn out\n"
"\n"
"static func _pill(ci: CanvasItem, f: Font, r: Rect2, s: String, kind: String, a: float) -> void:   # r51: painted pill (GPT) + number\n"
"\t_three(ci, _tex(\"pill_\" + kind), r, 0.42, Color(1, 1, 1, a))\n"
"\tvar fs := 10\n"
"\tvar tw := f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x\n"
"\tvar pos := Vector2(roundf(r.get_center().x - tw * 0.5), roundf(r.end.y - 2.5))\n"
"\tci.draw_string_outline(f, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 3, Color(0.06, 0.04, 0.03, 0.85 * a))\n"
"\tci.draw_string(f, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 0.99, 0.95, a))\n"
"\n") + s[i1:]
# 3) _card signature + body
rep("cols: Array, ts: Array, hp: float, atk: float, cant: bool, owned: bool) -> void:\n\tvar v := V()\n\tvar w := ci.size.x\n",
    "cols: Array, ts: Array, pl: Array, cant: bool, owned: bool) -> void:\n\tvar v := V()\n\tvar w := ci.size.x\n", "sig")
rep("\tv._coin(ci, Vector2(r.end.x - 6 - pw - 12, r.position.y + 1 + (bh - 10.5) * 0.5), 1.5)\n",
    "\tvar ct := _tex(\"coin\")   # r51 C1: painted coin (card only, D1)\n"
    "\tvar cw := 12.0\n"
    "\tvar chh := cw * float(ct.get_height()) / float(ct.get_width())\n"
    "\tci.draw_texture_rect(ct, Rect2(r.end.x - 6 - pw - 13, r.position.y + 1 + (bh - chh) * 0.5, cw, chh), false, Color(1, 1, 1, fa))\n", "coin")
rep("\tvar py := r.position.y + bh + 6\n"
    "\t_pill(ci, fb, Rect2(r.position.x + 5, py, 26, 13), v._num(hp), Color(\"#3f8a46\"))\n"
    "\t_pill(ci, fb, Rect2(r.position.x + 5, py + 17, 26, 13), v._num(atk), Color(\"#a3363a\"))\n",
    "\tvar py := r.position.y + bh + 6\n"
    "\tvar gap := 3.0 if pl.size() <= 4 else 2.0   # r51 G1: one column, smaller when they don't fit\n"
    "\tvar ph := minf(13.0, (r.end.y - 6.0 - py - gap * float(pl.size() - 1)) / float(maxi(pl.size(), 1)))\n"
    "\tfor i in pl.size():\n"
    "\t\t_pill(ci, fb, Rect2(r.position.x + 5, py + i * (ph + gap), 28, ph), str(pl[i][1]), str(pl[i][0]), fa)\n", "pills")
open(p, "w", encoding="utf-8", newline="").write(s)
print("r51 ok")
