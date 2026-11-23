# R35h: owner "make the bars sit in the background, they look oddly sharp" -> softer bars:
# no solid dark box (thin see-through edge only), muted warm green / amber matching the sunlit arena, see-through track,
# cooldown gauge muted side colour; bar ends rounded by 1 px (corner pixels left out).
import sys, io
T = sys.argv[1] + '/scripts/ui/s286_team.gd'
s = io.open(T, encoding='utf-8').read()
old_start = "\t# r35g: thin bar, no lines, no number\n"
old_end = "Color(1, 1, 1, 0.95) if rem_s < 0.4 else col)\n"
i = s.find(old_start); j = s.find(old_end, i)
if i < 0 or j < 0: raise SystemExit('bar block not found')
new = (
 "\t# r35h: soft bar — see-through edge, muted colours, 1 px rounded ends (owner: blend with the background)\n"
 "\tvar full := HP_H + 3.0\n"
 "\t_soft_rect(Rect2(x0 - 1.0, y0 - 1.0, BAR_W + 2.0, full + 2.0), Color(0.10, 0.09, 0.07, 0.38))\n"
 "\t_soft_rect(Rect2(x0, y0, BAR_W, HP_H), Color(0.12, 0.11, 0.09, 0.42))\n"
 "\tvar hw := roundf(BAR_W * fr)\n"
 "\tif hw > 0.0: _soft_rect(Rect2(x0, y0, hw, HP_H), Color(\"#8fbf6e\", 0.88) if fr > 0.3 else Color(\"#d2a45a\", 0.9))\n"
 "\tif hw > 2.0: draw_rect(Rect2(x0 + 1.0, y0, hw - 2.0, 1.0), Color(1.0, 0.98, 0.85, 0.22))   # sun-lit top edge\n"
 "\tvar col: Color = Color(\"#7fa3d9\") if int(v[\"side\"]) == 0 else Color(\"#d98a86\")\n"
 "\tvar cf := _cd_frac(v)\n"
 "\tdraw_rect(Rect2(x0, y0 + HP_H + 1.0, BAR_W, 2.0), Color(0.12, 0.11, 0.09, 0.35))\n"
 "\tif cf >= 0.0:\n"
 "\t\tvar rem_s := _cd_rem(v)\n"
 "\t\tdraw_rect(Rect2(x0, y0 + HP_H + 1.0, BAR_W * cf, 2.0), Color(1, 0.98, 0.9, 0.85) if rem_s < 0.4 else Color(col, 0.8))\n"
)
s = s[:i] + new + s[j + len(old_end):]
s = s.replace("func _card(r: Rect2, v: Dictionary, on: bool) -> void:",
 "func _soft_rect(r: Rect2, c: Color) -> void:   # r35h: rectangle with the 4 corner pixels left out\n"
 "\tif r.size.x < 3.0 or r.size.y < 3.0:\n"
 "\t\tdraw_rect(r, c); return\n"
 "\tdraw_rect(Rect2(r.position.x + 1.0, r.position.y, r.size.x - 2.0, r.size.y), c)\n"
 "\tdraw_rect(Rect2(r.position.x, r.position.y + 1.0, 1.0, r.size.y - 2.0), c)\n"
 "\tdraw_rect(Rect2(r.end.x - 1.0, r.position.y + 1.0, 1.0, r.size.y - 2.0), c)\n\n"
 "func _card(r: Rect2, v: Dictionary, on: bool) -> void:", 1)
io.open(T, 'w', encoding='utf-8', newline='\n').write(s)
print('r35h ok')
