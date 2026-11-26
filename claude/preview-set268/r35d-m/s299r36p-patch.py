# set 299 round 36p (sample, after s299r36o): owner on ข 1 "show me each add-on" →
#   env S299ADD = list of add-ons on top of S299MAT (e.g. "1,3"):
#   1 = soft dark gradient over the creature art under the stats + name (above the art, below the text)
#   2 = Fight = warm raised block (from ง)
#   3 = lit plate behind the odds % row + Lv
#   4 = bench slots = dark recessed sockets (from ง)
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
pp = g / "scripts/ui/s299_prep.gd"; s = pp.read_text(encoding="utf-8")
rep = [
    ('	if m >= 3 and role == "bench":   # socket', '	if (m >= 3 or (m >= 1 and _add(4))) and role == "bench":   # r36p A4 · socket'),
    ('	if m >= 3 and role == "fight":   # the one warm', '	if (m >= 3 or (m >= 1 and _add(2))) and role == "fight":   # r36p A2 · the one warm'),
    ('	var sunk := (m >= 2 and role == "card") or (m >= 3 and role == "bench")\n	bevel(ci, p, a, sunk, role == "fight" and m >= 3)',
     '	var sunk := (m >= 2 and role == "card") or ((m >= 3 or _add(4)) and role == "bench")\n	bevel(ci, p, a, sunk, role == "fight" and (m >= 3 or _add(2)))'),
    ('	if mode == "tab":\n		return\n',
     '''	if mode == "tab":
		return
	if mode == "odds":   # r36p A3: lit plate behind the odds row + Lv
		var u := Rect2()
		var have := false
		for c in get_parent().find_children("*", "Control", true, false):
			var cc := c as Control
			if cc == self or not cc.is_visible_in_tree() or cc.size.x <= 0.0 or cc.size.y <= 0.0:
				continue
			var cr := Rect2(cc.global_position - global_position, cc.size)
			u = cr if not have else u.merge(cr)
			have = true
		if have:
			plate(self, u.grow_individual(8, 3, 8, 3), 7.0, false, 0.9)
		return
'''),
]
for o, n in rep:
    assert s.count(o) == 1, o
    s = s.replace(o, n)
s += '''
static func _add(i: int) -> bool:   # r36p (owner picks): add-on list on top of the material, e.g. S299ADD=1,3
	return str(i) in OS.get_environment("S299ADD").split(",")
'''
pp.write_text(s, encoding="utf-8")

pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
T = "\t"
old = T*2 + "hold299.move_child(band299, 0)\n"
assert p.count(old) == 1
new = old + "".join(T*2 + l + "\n" for l in [
    "if load(\"res://scripts/ui/s299_prep.gd\")._add(1):   # r36p A1: soft dark under the stats + name, ABOVE the creature (text stays on top)",
    "\tvar gr299 := Gradient.new()",
    "\tgr299.offsets = PackedFloat32Array([0.0, 0.45, 1.0])",
    "\tgr299.colors = PackedColorArray([Color(0.02, 0.03, 0.05, 0.0), Color(0.02, 0.03, 0.05, 0.6), Color(0.02, 0.03, 0.05, 0.82)])",
    "\tvar gt299 := GradientTexture2D.new()",
    "\tgt299.gradient = gr299",
    "\tgt299.fill_from = Vector2(0, 0)",
    "\tgt299.fill_to = Vector2(0, 1)",
    "\tgt299.width = 4",
    "\tgt299.height = 64",
    "\tvar sc299 := TextureRect.new()",
    "\tsc299.texture = gt299",
    "\tsc299.expand_mode = TextureRect.EXPAND_IGNORE_SIZE",
    "\tsc299.stretch_mode = TextureRect.STRETCH_SCALE",
    "\tsc299.mouse_filter = Control.MOUSE_FILTER_IGNORE",
    "\tsc299.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)",
    "\tsc299.offset_top = 34",
    "\tsc299.offset_left = 1",
    "\tsc299.offset_right = -1",
    "\tsc299.offset_bottom = -1",
    "\thold299.add_child(sc299)",
])
p = p.replace(old, new)
old = '_mv299(top.get_node_or_null("ShopOdds"), tr, 0.0, 0, 228, 72, 104)   # r36h E1: shop level + odds bottom-left\n'
assert p.count(old) == 1
i = p.index(old)
ind = p[p.rfind("\n", 0, i) + 1:i]
new = old + "".join(ind + l + "\n" for l in [
    'if PZS._add(3) and tr.get_node_or_null("ShopOdds") != null and tr.get_node_or_null("ShopOdds/OddsPlate299") == null:   # r36p A3',
    "\tvar op299: Control = PZS.new()",
    '\top299.name = "OddsPlate299"',
    '\top299.mode = "odds"',
    "\top299.mouse_filter = Control.MOUSE_FILTER_IGNORE",
    '\tvar so299 := tr.get_node_or_null("ShopOdds")',
    "\tif so299 != null:",
    "\t\tso299.add_child(op299)",
    "\t\tso299.move_child(op299, 0)",
])
p = p.replace(old, new)
pp.write_text(p, encoding="utf-8")
print("ok r36p")
