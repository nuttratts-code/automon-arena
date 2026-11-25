# set 299 round 36c (sample, after s299r36b): the board moves up into the room the old top shop left (front row no longer under
#   the bottom shop) · dark band at each shop card's bottom behind the stats + name rows (creature art stays readable)
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pa = g / "scripts/ui/app.gd"; a = pa.read_text(encoding="utf-8")
old = '\t\tpr = Rect2(pf.position.x + prep.board_side_room(), 150.0, pf.size.x - 2.0 * prep.board_side_room(), size.y - 150.0 - 50.0)\n'
assert a.count(old) == 1
a = a.replace(old, old + '\t\tif OS.get_environment("S299PREP") != "0":   # s299 r36c: shop at the bottom → board from 56 to above the shop tab\n'
	'\t\t\tpr = Rect2(pf.position.x + prep.board_side_room(), 56.0, pf.size.x - 2.0 * prep.board_side_room(), size.y - 56.0 - 168.0)\n')
pa.write_text(a, encoding="utf-8")
pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
old = '\t\tcell.add_child(cc)\n'
assert p.count(old) == 1
p = p.replace(old, old + '\t\tvar band299 := Panel.new()\n'
	'\t\tband299.mouse_filter = Control.MOUSE_FILTER_IGNORE\n'
	'\t\tband299.add_theme_stylebox_override("panel", TH.band(TH.R23_INK, 0.9, Vector2(0.5, 1), Vector2(0.5, 0), 0, 0, 0.75, 0.6))\n'
	'\t\tband299.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)\n'
	'\t\tband299.offset_top = 40\n\t\tband299.offset_left = 1\n\t\tband299.offset_right = -1\n\t\tband299.offset_bottom = -1\n'
	'\t\tcell.add_child(band299)\n')
pp.write_text(p, encoding="utf-8")
print("ok r36c")
