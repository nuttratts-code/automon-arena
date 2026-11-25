# set 299 round 35z21 (sample, after s299r35z20): battle screen shapes → our 2-cut-corner box, colours kept (owner B2)
#   env S299CUT (default on, 0 = old): value tags above the units (_tag4, was radius 1) · chip tooltip (_draw_tip, was radius 3)
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"; s = p.read_text(encoding="utf-8")
old1 = ('\tsb.bg_color = Color(TAG_COL2.get(_l4_col(kd), INK), 0.92 * a)\n'
        '\tsb.border_color = Color(TAG_COL3.get(_l4_col(kd), INK), 0.95 * a); sb.set_border_width_all(1)\n'
        '\tdraw_style_box(sb, tr)\n')
assert s.count(old1) == 1
new1 = ('\tsb.bg_color = Color(TAG_COL2.get(_l4_col(kd), INK), 0.92 * a)\n'
        '\tsb.border_color = Color(TAG_COL3.get(_l4_col(kd), INK), 0.95 * a); sb.set_border_width_all(1)\n'
        '\tif OS.get_environment("S299CUT") != "0":   # s299 r35z21: cut top-left + bottom-right, same colours\n'
        '\t\tvar cp := _cutpts299(tr, 3.5)\n'
        '\t\tdraw_colored_polygon(cp, sb.bg_color)\n'
        '\t\tvar ip := _cutpts299(tr.grow(-0.5), 3.0)\n'
        '\t\tdraw_polyline(ip + PackedVector2Array([ip[0]]), sb.border_color, 1.0)\n'
        '\telse:\n'
        '\t\tdraw_style_box(sb, tr)\n')
s = s.replace(old1, new1)
old2 = ('\tsb.set_corner_radius_all(3)\n'
        '\t_ic_layer.draw_style_box(sb, box)\n')
assert s.count(old2) == 1
new2 = ('\tsb.set_corner_radius_all(3)\n'
        '\tif OS.get_environment("S299CUT") != "0":   # s299 r35z21: cut-corner tooltip, same colours\n'
        '\t\tvar cp := _cutpts299(box, 4.0)\n'
        '\t\t_ic_layer.draw_colored_polygon(cp, sb.bg_color)\n'
        '\t\tvar ip := _cutpts299(box.grow(-0.5), 3.5)\n'
        '\t\t_ic_layer.draw_polyline(ip + PackedVector2Array([ip[0]]), sb.border_color, 1.0)\n'
        '\telse:\n'
        '\t\t_ic_layer.draw_style_box(sb, box)\n')
s = s.replace(old2, new2)
p.write_text(s, encoding="utf-8"); print("ok")
# part 2: the tags on the units are drawn by _on_grid (S295V e), not _tag4 → same cut there
s = p.read_text(encoding="utf-8")
old3 = '\t\tdraw_style_box(sb, tr)\n'
i = s.find('func _on_grid(')
j = s.find(old3, i)
assert i > 0 and j > i and j - i < 4000
new3 = ('\t\tif OS.get_environment("S299CUT") != "0":   # s299 r35z21: cut top-left + bottom-right, same colours\n'
        '\t\t\tvar cq := _cutpts299(tr, 3.5)\n'
        '\t\t\tdraw_colored_polygon(cq, sb.bg_color)\n'
        '\t\t\tif sb.border_width_top > 0:\n'
        '\t\t\t\tvar iq := _cutpts299(tr.grow(-0.5), 3.0)\n'
        '\t\t\t\tdraw_polyline(iq + PackedVector2Array([iq[0]]), sb.border_color, float(sb.border_width_top))\n'
        '\t\telse:\n'
        '\t\t\tdraw_style_box(sb, tr)\n')
s = s[:j] + new3 + s[j + len(old3):]
p.write_text(s, encoding="utf-8"); print("ok2")
