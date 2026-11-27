# set 307 m (owner, 28 Nov): ① no pale line under the lock button — cause: Lock299 is a plain Button, so it used the theme's
# Button stylebox line_box() (theme.gd: 2-unit bottom border, white 45 %); the reroll has its own glass_btn style so it had none
# -> StyleBoxEmpty on every state of Lock299 (r43 only). ② owner A1: "สุ่มใหม่ 🪙 1" on ONE row, same text size, centred in the
# button (the name label moves into the coin row; 8 units name→coin, 4 coin→number). ③ owner B1: the gold "|" after Lv on the
# odds tag = as thick as the gold divider between the buttons and the cards (Gut302, 1 unit), colour + height unchanged.
# Off switches: S307NOLINE=0 · S307ROW=0 · S307LVDIV=0. Usage: python s307m-patch.py <g286> (after s307icon; backup prep.gd.s307m)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "prep.gd")
if not os.path.exists(p + ".s307m"): shutil.copy(p, p + ".s307m")
s = open(p, encoding="utf-8", newline="").read()
R = 'OS.get_environment("S302R43") == "1"'
reps = [
    ('\t\tlb.tooltip_text = "ล็อกร้าน"\n',
     '\t\tlb.tooltip_text = "ล็อกร้าน"\n'
     '\t\tif ' + R + ' and OS.get_environment("S307NOLINE") != "0":   # set 307 m ①: no theme underline (line_box) under the lock\n'
     '\t\t\tfor st307 in ["normal", "hover", "pressed", "disabled", "focus", "hover_pressed"]:\n'
     '\t\t\t\tlb.add_theme_stylebox_override(st307, StyleBoxEmpty.new())\n'),
    ('\t\t\tct.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT\n',
     '\t\t\tct.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT\n'
     '\t\t\tif ' + R + ' and OS.get_environment("S307ROW") != "0":   # set 307 m ② (owner A1): name + coin + cost on one row\n'
     '\t\t\t\tnm.reparent(hb, false)\n'
     '\t\t\t\thb.move_child(nm, 0)\n'
     '\t\t\t\tvar gap307 := Control.new()\n'
     '\t\t\t\tgap307.mouse_filter = Control.MOUSE_FILTER_IGNORE\n'
     '\t\t\t\thb.add_child(gap307)\n'
     '\t\t\t\thb.move_child(gap307, 1)\n'
     '\t\t\t\tnm.vertical_alignment = VERTICAL_ALIGNMENT_CENTER\n'
     '\t\t\t\tct.vertical_alignment = VERTICAL_ALIGNMENT_CENTER\n'),
    ('\t\t\t\tgdv.custom_minimum_size = Vector2(1.5, 9)   # set 307 g\n',
     '\t\t\t\tgdv.custom_minimum_size = Vector2(1.5, 9)   # set 307 g\n'
     '\t\t\t\tif OS.get_environment("S307LVDIV") != "0": gdv.custom_minimum_size = Vector2(1, 9)   # set 307 m ③ (owner B1): as thick as Gut302\n'),
]
for old, new in reps:
    if new in s: continue
    assert s.count(old) == 1, old; s = s.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="").write(s); print("prep.gd ok")
