# set 299 round 36d (sample, after s299r36c): the shop cell is a PanelContainer → it stretches every child to the full card and
#   ignores offsets (r36c band + art box covered the whole card) → band and art box go inside a plain Control holder
#   (band from 58 px down, art box above the stats + name rows)
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
old = '\t\tcell.add_child(cc)\n'
assert p.count(old) == 1
p = p.replace(old, '\t\tvar hold299 := Control.new()\n\t\thold299.mouse_filter = Control.MOUSE_FILTER_IGNORE\n'
	'\t\tcell.add_child(hold299)\n\t\thold299.add_child(cc)\n')
old = '\t\tband299.offset_top = 40\n'
assert p.count(old) == 1
p = p.replace(old, '\t\tband299.offset_top = 58\n')
old = '\t\tcell.add_child(band299)\n'
assert p.count(old) == 1
p = p.replace(old, '\t\thold299.add_child(band299)\n\t\thold299.move_child(band299, 0)\n')
pp.write_text(p, encoding="utf-8")
print("ok r36d")
