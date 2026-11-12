# set 213 sample R1b: next-gold label 14 px, shorter text (win bonus in the tooltip), chip narrower
import sys
g = sys.argv[1]
p = g + "/scripts/ui/prep.gd"
s = open(p, encoding="utf-8").read()
a = 'ng.add_theme_font_size_override("font_size", 12)'
assert a in s; s = s.replace(a, 'ng.add_theme_font_size_override("font_size", 14)')
i = s.index('\tng.text = "  รอบหน้า'); j = s.index("\n", i)
s = s[:i] + '\tng.text = " รอบหน้า +%s" % _n(SH.base_income_at(float(st["round"]) + 1.0))\n\tchip_gold.get_parent().get_parent().tooltip_text = "รอบหน้าได้ +%s · ชนะได้เพิ่ม +%s · เงินที่เหลือไม่ทบรอบ" % [_n(SH.base_income_at(float(st["round"]) + 1.0)), _n(S["winBonus"])]' + s[j:]
open(p, "w", encoding="utf-8", newline="\n").write(s)
t = g + "/scenes/prep_layout.tscn"
s = open(t, encoding="utf-8").read()
a = "offset_left = 256.0\noffset_top = 2.0\noffset_right = 400.0"
assert a in s; s = s.replace(a, "offset_left = 256.0\noffset_top = 2.0\noffset_right = 384.0")
open(t, "w", encoding="utf-8", newline="\n").write(s)
print("R1b ok")
