# set 213 sample R1: outer margin 16 · bench clear of the shop · reroll/fight = card height + equal width · gold next-round · sell label · battle margin 16
import sys, re
g = sys.argv[1]

def sub(path, old, new, count=1):
    p = g + "/" + path
    s = open(p, encoding="utf-8").read()
    assert old in s, (path, old)
    s = s.replace(old, new, count)
    open(p, "w", encoding="utf-8", newline="\n").write(s)

def node_prop(path, node, prop, val):
    p = g + "/" + path
    s = open(p, encoding="utf-8").read()
    i = s.index('[node name="%s"' % node)
    j = s.index("\n[", i + 1)
    blk = s[i:j]
    nb, n = re.subn(r"\n%s = [^\n]*" % prop, "\n%s = %s" % (prop, val), blk)
    assert n == 1, (node, prop)
    s = s[:i] + nb + s[j:]
    open(p, "w", encoding="utf-8", newline="\n").write(s)

L = "scenes/prep_layout.tscn"
M = 16.0
node_prop(L, "Top", "offset_left", "16.0")
node_prop(L, "Top", "offset_right", "-16.0")
node_prop(L, "Top", "offset_top", "12.0")
node_prop(L, "Top", "offset_bottom", "81.0")
node_prop(L, "Field", "offset_left", "16.0")
node_prop(L, "Field", "offset_right", "-16.0")
node_prop(L, "Field", "offset_top", "48.0")
node_prop(L, "Field", "offset_bottom", "-152.0")
node_prop(L, "Tray", "offset_left", "16.0")
node_prop(L, "Tray", "offset_right", "-16.0")
node_prop(L, "Tray", "offset_top", "-150.0")
node_prop(L, "Tray", "offset_bottom", "-12.0")
node_prop(L, "Bench", "offset_bottom", "34.0")      # bench ends above the shop cards (was 42 → overlapped the first card)
node_prop(L, "Reroll", "offset_top", "40.0")        # same height as the shop cards
node_prop(L, "Reroll", "offset_right", "96.0")      # same width as Fight → shop row looks centred
node_prop(L, "Fight", "offset_top", "40.0")
node_prop(L, "ChipGold", "offset_right", "400.0")   # room for "รอบหน้า +N"

# gold chip: second small label
P = "scripts/ui/prep.gd"
sub(P, '\tchip_gold.text = _n(st["gold"])\n',
    '\tchip_gold.text = _n(st["gold"])\n'
    '\tvar ng: Label = chip_gold.get_parent().get_node_or_null("NextGold")\n'
    '\tif ng == null:\n'
    '\t\tng = Label.new()\n'
    '\t\tng.name = "NextGold"\n'
    '\t\tng.add_theme_font_size_override("font_size", 12)\n'
    '\t\tng.add_theme_color_override("font_color", TH.c("gold-ink"))\n'
    '\t\tng.vertical_alignment = VERTICAL_ALIGNMENT_CENTER\n'
    '\t\tchip_gold.get_parent().add_child(ng)\n'
    '\tng.text = "  รอบหน้า +%s (ชนะ +%s)" % [_n(SH.base_income_at(float(st["round"]) + 1.0)), _n(SH.base_income_at(float(st["round"]) + 1.0) + float(S["winBonus"]))]\n')

# sell label over the dock while an own unit is dragged
sub(P, 'func drag_started(ref: Dictionary) -> void:\n\t_drag_from = ref\n',
    'func drag_started(ref: Dictionary) -> void:\n\t_drag_from = ref\n'
    '\t_sell_hint(ref)\n')
sub(P, 'func drag_ended() -> void:\n',
    'func _sell_hint(ref: Variant) -> void:\n'
    '\tvar h: Control = dock.get_node_or_null("SellHint")\n'
    '\tif h == null:\n'
    '\t\th = PanelContainer.new()\n'
    '\t\th.name = "SellHint"\n'
    '\t\th.mouse_filter = Control.MOUSE_FILTER_IGNORE\n'
    '\t\th.add_theme_stylebox_override("panel", TH.box(Color(TH.c("panel"), 0.82), TH.c("bad"), 10, 2, 2, 2))\n'
    '\t\tvar l := Label.new()\n'
    '\t\tl.name = "T"\n'
    '\t\tl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER\n'
    '\t\tl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER\n'
    '\t\tl.add_theme_font_size_override("font_size", 16)\n'
    '\t\tl.add_theme_color_override("font_color", TH.c("bad"))\n'
    '\t\th.add_child(l)\n'
    '\t\tdock.add_child(h)\n'
    '\tvar u: Variant = unit_at(ref) if ref is Dictionary and ref["at"] != "shop" else null\n'
    '\th.visible = u != null\n'
    '\tif u != null:\n'
    '\t\th.get_node("T").text = "ลากมาวางที่ร้านเพื่อขาย  +%s เงิน" % _n(u["paid"])\n'
    '\n'
    'func drag_ended() -> void:\n'
    '\t_sell_hint(null)\n')

# battle screen: outer margin 16
sub("scripts/ui/battle.gd", 'm.add_theme_constant_override("margin_" + k, 8)', 'm.add_theme_constant_override("margin_" + k, 16)')
print("R1 patch ok")
