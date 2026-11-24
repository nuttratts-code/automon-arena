# set 294 round 35s8 (sample, after s293r35s7). Owner (crop of another game's unit, layout idea only):
# "move what is in the card to above the HP bar" + keep the cards for now (F) + G1 all 6 slots fixed 3x2 (zero = icon + "-").
# Plus C1-C5 from the set 293 review: C1 flat plate under the clock + G4 under pause / fast-forward ·
# C2 flat chips, no frame · C3 status column left-aligned, no "+N", up to 9 (3 rows, columns sized to their text) ·
# C4 band as wide as its content, left edge at the clock · C5 band icon frame = side colour (already so, no change).
# Env: S294=0 = round 35s7 · S294GRID=0 = no grid on the units · S294ROWS=2 = grid 2 rows x 3.
import sys, pathlib
root = pathlib.Path(sys.argv[1])

def rep(s, old, new, n=1):
    assert s.count(old) == n, (old[:70], s.count(old))
    return s.replace(old, new)

# ---------- s286_team.gd ----------
p = root / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")

# 1. grid on every unit, right above its HP bar (after the team-wide column widths are known)
old = "\t_tw287 = 27.0 + _c1w287 + (VG + _c2w287 if _c2w287 > 0.0 else 0.0) + 5.0\n"
s = rep(s, old, old + "\tif OS.get_environment(\"S294\") != \"0\" and OS.get_environment(\"S294GRID\") != \"0\":   # s294 r35s8\n"
    "\t\tfor uidg in _bar287.keys():\n"
    "\t\t\tif view.units.has(uidg): _on_grid(view.units[uidg], _bar287[uidg])\n")

old = "func _feet_bars(v: Dictionary) -> void:\n"
s = rep(s, old,
    "func _on_grid(v: Dictionary, br: Rect2) -> void:   # s294 r35s8 (owner G1): the card's 6 fixed slots on the unit, right above its HP bar\n"
    "\tvar sl := _slots(v)\n"
    "\tvar cols := 3 if OS.get_environment(\"S294ROWS\") == \"2\" else 2\n"
    "\tvar rows := 6 / cols\n"
    "\tvar cw := []\n"
    "\tfor c in cols: cw.append(0.0)\n"
    "\tfor k in sl.size(): cw[k % cols] = maxf(cw[k % cols], _chip_w(sl[k][0], sl[k][1]))\n"
    "\tvar w := 6.0 + VG * float(cols - 1)\n"
    "\tfor c in cols: w += cw[c]\n"
    "\tvar h := 3.0 + float(rows) * ROW_H\n"
    "\tvar r := Rect2(roundf(br.get_center().x - w * 0.5), br.position.y - 2.0 - h, w, h)\n"
    "\tvar on := int(v[\"uid\"]) == picked\n"
    "\tdraw_rect(r, Color(Color(\"#1d6079\") if on else TH.R23_INK, 0.70))\n"
    "\tif on: draw_rect(r, Color(1, 1, 1, 0.95), false, 1.0)\n"
    "\tfor k in sl.size():\n"
    "\t\tvar gx := r.position.x + 3.0\n"
    "\t\tfor c in k % cols: gx += cw[c] + VG\n"
    "\t\t_chip(Vector2(gx, r.position.y + 2.0 + float(k / cols) * ROW_H), sl[k][0], sl[k][1], 1.0, false)\n\n" + old)

# 2. C2: flat chips (row-1 number chips + buff / debuff chips), no frame
old = "\t\tsb.border_color = Color(ICON_COL[kind], 0.55 * a)\n\t\tsb.set_border_width_all(1)\n"
s = rep(s, old, "\t\tsb.border_color = Color(ICON_COL[kind], 0.55 * a)\n\t\tif OS.get_environment(\"S294\") == \"0\": sb.set_border_width_all(1)   # s294 C2: flat, no frame\n")
old = "\tsb.set_border_width_all(1)\n\tdraw_style_box(sb, r)\n\t_ic_q.append([r.grow(-1.5)"
s = rep(s, old, "\tif OS.get_environment(\"S294\") == \"0\": sb.set_border_width_all(1)   # s294 C2\n\tdraw_style_box(sb, r)\n\t_ic_q.append([r.grow(-1.5)")

# 3. C3 + C4: status column = up to 9 items, 3 rows, columns as wide as their text, left-aligned; band ends after it
old = "\tvar x0 := 16.0\n\tvar x1 := size.x - 16.0\n\tvar h := 8.0 + 14.0 + 3.0 * D3ROW + 6.0\n"
new = ("\tvar x0 := 16.0\n\tvar x1 := size.x - 16.0\n"
    "\tvar s294 := OS.get_environment(\"S294\") != \"0\"\n"
    "\tvar it294 := []\n"
    "\tvar cw294 := []\n"
    "\tif s294:\n"
    "\t\tfor q in st: it294.append([\"n\", q, String({\"armor\": \"เกราะ\", \"burn\": \"ติดไฟ\", \"shock\": \"ติดสายฟ้า\"}.get(q[0], q[0])) + \" \" + String(q[1])])\n"
    "\t\tfor e in ef: it294.append([\"e\", e, String(e[4])])\n"
    "\t\tif it294.size() > 9: it294.resize(9)\n"
    "\t\tvar bf: Font = TH.font(\"body\")\n"
    "\t\tfor i in it294.size():\n"
    "\t\t\tif i / 3 >= cw294.size(): cw294.append(0.0)\n"
    "\t\t\tcw294[i / 3] = maxf(cw294[i / 3], 14.0 + bf.get_string_size(String(it294[i][2]), HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x)\n"
    "\t\tvar wst := 0.0\n"
    "\t\tfor c in cw294.size(): wst += cw294[c] + (12.0 if c > 0 else 0.0)\n"
    "\t\twst = maxf(wst, TH.font(\"body_b\").get_string_size(\"สถานะตอนนี้\", HORIZONTAL_ALIGNMENT_LEFT, -1, 9).x)\n"
    "\t\tx1 = minf(x1, x0 + 10.0 + 200.0 + 18.0 + 112.0 * 2.0 + 8.0 + 18.0 + wst + 12.0)\n"
    "\tvar h := 8.0 + 14.0 + 3.0 * D3ROW + 6.0\n")
s = rep(s, old, new)

old = "\tif items.is_empty(): _dtxt(Vector2(L3, cy + 24.0), \"–\", 10, ink)\n\tvar cap := 6 if items.size() <= 6 else 5\n"
new = ("\tif items.is_empty(): _dtxt(Vector2(L3, cy + 24.0), \"–\", 10, ink)\n"
    "\tif s294:   # s294 C3: column-major, 3 rows, left-aligned, no +N\n"
    "\t\tvar gx294 := L3\n"
    "\t\tfor i in it294.size():\n"
    "\t\t\tif i > 0 and i % 3 == 0: gx294 += cw294[i / 3 - 1] + 12.0\n"
    "\t\t\tvar gy := cy + 14.0 + float(i % 3) * D3ROW\n"
    "\t\t\tvar q: Array = it294[i]\n"
    "\t\t\tif q[0] == \"n\":\n"
    "\t\t\t\t_dicon(Vector2(gx294 + 5.0, gy + 6.0), String(q[1][0]), 10.0, a)\n"
    "\t\t\telse:\n"
    "\t\t\t\tvar e: Array = q[1]\n"
    "\t\t\t\tvar er := Rect2(gx294, gy + 1.0, 11.0, 11.0)\n"
    "\t\t\t\t_pn_layer.draw_rect(er, Color(\"#2f6db5\", 0.92 * a) if e[2] else Color(\"#b8343a\", 0.92 * a))\n"
    "\t\t\t\t_dicon(er.get_center(), String(e[1]), 9.0, a, Color(1, 1, 1))\n"
    "\t\t\t_dtxt(Vector2(gx294 + 14.0, gy + 10.0), String(q[2]), 10, ink)\n"
    "\t\titems = []\n"
    "\tvar cap := 6 if items.size() <= 6 else 5\n")
s = rep(s, old, new)
p.write_text(s, encoding="utf-8")

# ---------- battle.gd: C1 clock plate + G4 button plates ----------
p = root / "scripts/ui/battle.gd"
s = p.read_text(encoding="utf-8")
old = "\tcp.add_theme_stylebox_override(\"panel\", StyleBoxEmpty.new())   # round 14: no plate, like the STOP word\n"
s = rep(s, old, old + "\tif OS.get_environment(\"S294\") != \"0\":   # s294 C1: flat run-end slate plate under the clock\n"
    "\t\tvar cps := StyleBoxFlat.new()\n\t\tcps.bg_color = Color(TH.R23_INK, 0.70)\n\t\tcps.set_corner_radius_all(3)\n"
    "\t\tcps.content_margin_left = 8; cps.content_margin_right = 8; cps.content_margin_top = 2; cps.content_margin_bottom = 2\n"
    "\t\tcp.add_theme_stylebox_override(\"panel\", cps)\n")
old = "\t\t\tb.add_theme_stylebox_override(st, StyleBoxEmpty.new())   # round 10: icon only\n"
s = rep(s, old, "\t\t\tif OS.get_environment(\"S294\") != \"0\":   # s294 G4: same flat slate plate under pause / fast-forward\n"
    "\t\t\t\tvar bp := StyleBoxFlat.new()\n\t\t\t\tbp.bg_color = Color(Color(\"#1d6079\") if st in [\"pressed\", \"hover_pressed\"] else TH.R23_INK, 0.70)\n"
    "\t\t\t\tbp.set_corner_radius_all(3)\n\t\t\t\tb.add_theme_stylebox_override(st, bp)\n"
    "\t\t\telse:\n\t\t\t\tb.add_theme_stylebox_override(st, StyleBoxEmpty.new())   # round 10: icon only\n")
p.write_text(s, encoding="utf-8")
print("s294r35s8 patched", root)
