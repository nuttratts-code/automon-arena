# set 299 round 36q (sample, after s299r36p): owner (+ 2 crops of another game's shop card footer / Buy-XP button = idea only, NOT stored):
#   "colour the name + price strip, split into shades: left = tribe colour (2 tribes = one more shade, main tribe first),
#    right = rarity colour (where the price sits)"
#   env S299FOOT: 0 = off · 1 = hard slanted split · 2 = soft blend between shades · 3 = hard split + dark divider + light top line
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pp = g / "scripts/ui/s299_prep.gd"; s = pp.read_text(encoding="utf-8")
old = '	if mode == "odds":   # r36p A3'
assert s.count(old) == 1
s = s.replace(old, '''	if mode == "foot":   # r36q: name + price strip in shades (tribes left, rarity right)
		_draw_foot()
		return
''' + old)
s += '''
static var demo_i := 0   # r36q demo counter (S299FOOTDEMO)

func _draw_foot() -> void:   # r36q
	var cols: Array = get_meta("cols", [])
	var rc: Color = get_meta("rc", Color(0.5, 0.5, 0.5))
	var pw: float = get_meta("pw", 22.0)
	var fv := int(OS.get_environment("S299FOOT"))
	var w := size.x
	var h: float = get_meta("fh", 21.0)
	draw_set_transform(Vector2(0, size.y - h))   # _ready forces full rect: draw the strip at the bottom
	var sl := 5.0
	var lw := w - pw
	var bands := []
	for i in cols.size():
		bands.append([lw * i / cols.size(), lw * (i + 1) / cols.size(), cols[i]])
	bands.append([lw, w, rc])
	var nb := bands.size()
	var k := 5.0   # the card's bottom-right cut
	for i in nb:
		var x0: float = bands[i][0]
		var x1: float = bands[i][1]
		var c: Color = (bands[i][2] as Color).darkened(0.42)
		c.a = 0.94
		var x0t := x0 + (sl * 0.5 if i > 0 else 0.0)
		var x0b := x0 - (sl * 0.5 if i > 0 else 0.0)
		var x1t := x1 + (sl * 0.5 if i < nb - 1 else 0.0)
		var x1b := x1 - (sl * 0.5 if i < nb - 1 else 0.0)
		var p := PackedVector2Array([Vector2(x0t, 0), Vector2(x1t, 0)])
		if i == nb - 1:
			p.append_array([Vector2(w, h - k), Vector2(w - k, h)])
		else:
			p.append(Vector2(x1b, h))
		p.append(Vector2(x0b, h))
		var top := c.lightened(0.12)
		var bot := c.darkened(0.12)
		var cc := PackedColorArray()
		for q in p:
			cc.append(top.lerp(bot, q.y / maxf(1.0, h)))
		draw_polygon(p, cc)
	if fv == 2:   # soft: blend each boundary over 12 px
		for i in nb - 1:
			var xb: float = bands[i][1]
			var ca: Color = (bands[i][2] as Color).darkened(0.42)
			var cb: Color = (bands[i + 1][2] as Color).darkened(0.42)
			ca.a = 0.94
			cb.a = 0.94
			draw_polygon(PackedVector2Array([Vector2(xb - 6, 0), Vector2(xb + 6, 0), Vector2(xb + 6, h), Vector2(xb - 6, h)]),
				PackedColorArray([ca, cb, cb, ca]))
	if fv == 3:   # dark divider + light top line
		for i in nb - 1:
			var xb: float = bands[i][1]
			draw_line(Vector2(xb + sl * 0.5, 0), Vector2(xb - sl * 0.5, h), Color(0.02, 0.03, 0.04, 0.9), 1.5)
		draw_line(Vector2(0, 0.5), Vector2(w, 0.5), Color(1, 1, 1, 0.35), 1.0)
	else:
		draw_line(Vector2(0, 0.5), Vector2(w, 0.5), Color(0, 0, 0, 0.6), 1.0)
'''
pp.write_text(s, encoding="utf-8")

pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
T = "\t"
old = T*2 + "hold299.move_child(band299, 0)\n"
assert p.count(old) == 1
new = old + "".join(T*2 + l + "\n" for l in [
    'if OS.get_environment("S299FOOT") not in ["", "0"]:   # r36q: shaded name + price strip',
    '\tvar ft299: Control = load("res://scripts/ui/s299_prep.gd").new()',
    '\tft299.mode = "foot"',
    "\tft299.mouse_filter = Control.MOUSE_FILTER_IGNORE",
    "\tvar fc299 := []",
    "\tfor t299 in ts:",
    '\t\tfc299.append(TH.c(str((TH.TRIBE_SHAPE.get(t299, ["square", "mute"]) as Array)[1])))',
    '\tft299.set_meta("cols", fc299)',
    '\tvar rk299 := {"common": "mute", "uncommon": "r-unc", "rare": "r-rare", "epic": "r-epic", "legend": "r-legend"}',
    '\tft299.set_meta("rc", TH.c(str(RAR_TOK.get(str(c.get("rarity", "")), rk299.get(str(c.get("rarity", "")), "mute")))))',
    '\tif OS.get_environment("S299FOOTDEMO") == "1":   # demo only: show 2 tribes + every rarity across the 5 cards',
    '\t\tvar ps299: GDScript = load("res://scripts/ui/s299_prep.gd")',
    '\t\tvar di299: int = ps299.demo_i % 5',
    '\t\tps299.demo_i += 1',
    '\t\tif di299 == 0 or di299 == 2:',
    '\t\t\tfc299.append(TH.c("t-bolt"))',
    '\t\tft299.set_meta("rc", TH.c(["mute", "r-unc", "r-rare", "r-epic", "r-legend"][di299]))',
    '\tft299.set_meta("pw", 22.0)',
    "\tft299.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)",
    "\tft299.offset_top = -21",
    "\tft299.offset_bottom = 0",
    "\thold299.add_child(ft299)",
])
p = p.replace(old, new)
# price text readable on the rarity shade
old = '	var pr := TH.label(_n(c["price"]), 14, "gold-ink", "display")\n'
assert p.count(old) == 1
p = p.replace(old, old + '	if OS.get_environment("S299FOOT") not in ["", "0"]:   # r36q: white on the rarity shade\n		pr.add_theme_color_override("font_color", Color("#fff6e0"))\n')
pp.write_text(p, encoding="utf-8")
print("ok r36q")
