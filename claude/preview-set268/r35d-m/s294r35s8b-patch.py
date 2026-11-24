# set 294 round 35s8b (sample, after s294r35s8). Owner after R35s8: "H1 3 rows x 2 · values that are zero are not shown ·
# no icons — colour tells the kind, like the picture". Grid on the unit = only the present values, flowing left then right,
# row by row (3 x 2, max 6), each value = a small flat colour tag (radius 1, our own palette) + white outlined number.
# Cards (top / bottom) unchanged: zero = icon + "-" (note 65). S294TAG=0 = round 35s8 grid.
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")
old = "func _on_grid(v: Dictionary, br: Rect2) -> void:   # s294 r35s8 (owner G1): the card's 6 fixed slots on the unit, right above its HP bar\n"
assert s.count(old) == 1
new = old.replace("func _on_grid(", "func _on_grid_icons(")
tags = (
"const TAG_COL := {\"atk\": Color(\"#b8493a\"), \"multi\": Color(\"#7a5fb8\"), \"burn\": Color(\"#d9742a\"), \"shock\": Color(\"#c7a21f\"),\n"
"\t\"armhit\": Color(\"#5d7f99\"), \"heal\": Color(\"#43904c\")}   # s294 r35s8b: one colour per kind (own palette, no icons)\n\n"
"func _on_grid(v: Dictionary, br: Rect2) -> void:   # s294 r35s8b (owner): only present values, colour = kind, 3 rows x 2\n"
"\tif OS.get_environment(\"S294TAG\") == \"0\":\n"
"\t\t_on_grid_icons(v, br); return\n"
"\tvar have := []\n"
"\tfor q in _slots(v):\n"
"\t\tif q[2]: have.append(q)\n"
"\tif have.is_empty(): return\n"
"\tvar mf: Font = TH.font(\"mono\")\n"
"\tvar fs := 8\n"
"\tvar cw := [0.0, 0.0]\n"
"\tfor k in have.size(): cw[k % 2] = maxf(cw[k % 2], mf.get_string_size(String(have[k][1]), HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x + 6.0)\n"
"\tvar rows := (have.size() + 1) / 2\n"
"\tvar th := 10.0\n"
"\tvar w: float = cw[0] + (1.0 + cw[1] if have.size() > 1 else 0.0)\n"
"\tvar h := float(rows) * th + float(rows - 1)\n"
"\tvar x0 := roundf(br.get_center().x - w * 0.5)\n"
"\tvar y0 := br.position.y - 2.0 - h\n"
"\tvar on := int(v[\"uid\"]) == picked\n"
"\tfor k in have.size():\n"
"\t\tvar tr := Rect2(x0 + (0.0 if k % 2 == 0 else cw[0] + 1.0), y0 + float(k / 2) * (th + 1.0), cw[k % 2], th)\n"
"\t\tvar sb := StyleBoxFlat.new()\n"
"\t\tsb.bg_color = Color(TAG_COL.get(have[k][0], INK), 0.92)\n"
"\t\tsb.set_corner_radius_all(1)\n"
"\t\tif on:\n"
"\t\t\tsb.border_color = Color(1, 1, 1, 0.95); sb.set_border_width_all(1)\n"
"\t\tdraw_style_box(sb, tr)\n"
"\t\tvar t := String(have[k][1])\n"
"\t\tvar tx := tr.position.x + (tr.size.x - mf.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x) * 0.5\n"
"\t\tdraw_string_outline(mf, Vector2(tx, tr.position.y + 7.5), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 3, Color(0.05, 0.06, 0.08, 0.75))\n"
"\t\tdraw_string(mf, Vector2(tx, tr.position.y + 7.5), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 1, 1, 0.98))\n\n")
s = s.replace(old, tags + new)
p.write_text(s, encoding="utf-8")
print("s294r35s8b patched", p)
