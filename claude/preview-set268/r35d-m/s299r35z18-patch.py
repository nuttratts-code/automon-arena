# set 299 round 35z18 (sample, after s299r35z17): env S299ARM (default on, 0 = old)
#   armour leaves the cards → shield symbol + number at the right end of each unit's HP bar (owner reference: number over the shield)
#   cards: burn / shock only, bigger symbol + number (2 lines)
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"; s = p.read_text(encoding="utf-8")
# 1) cards (SYM b): drop armour, bigger symbol + digits
old1 = ('\t\tvar fs := 7\n'
        '\t\tvar isz := 7.0\n'
        '\t\tvar cw := 0.0\n')
assert s.count(old1) == 1
new1 = ('\t\tvar fs := 7\n'
        '\t\tvar isz := 7.0\n'
        '\t\tif ARM299:   # s299 r35z18: armour moved to the HP bar; burn / shock bigger\n'
        '\t\t\tnums = nums.filter(func(n): return String(n[0]) != "armor")\n'
        '\t\t\tfs = int(OS.get_environment("S299FS")) if OS.get_environment("S299FS") != "" else 8\n'
        '\t\t\tisz = float(OS.get_environment("S299IS")) if OS.get_environment("S299IS") != "" else 10.0\n'
        '\t\tvar cw := 0.0\n')
s = s.replace(old1, new1)
old2 = ('\t\tvar pitch := 7.5   # r35w8: 3 lines fill the card evenly\n')
assert s.count(old2) == 1
s = s.replace(old2, old2 + '\t\tif ARM299: pitch = isz + 1.5\n')
old2b = '\t\tvar y := top + (3.0 - float(nums.size())) * pitch * 0.5\n'
assert s.count(old2b) == 1
s = s.replace(old2b, '\t\tif ARM299: top = r.position.y + (r.size.y - (pitch + isz)) * 0.5\n\t\tvar y := top + ((2.0 if ARM299 else 3.0) - float(nums.size())) * pitch * 0.5\n')
# symbol keeps the full isz when ARM299 (no cap-height resize)
old3 = '\tif OS.get_environment("S299ICO") in ["6", "7", "8", "9", "10"]:   # s299 r35z16'
assert s.count(old3) == 1
s = s.replace(old3, '\tif not ARM299 and OS.get_environment("S299ICO") in ["6", "7", "8", "9", "10"]:   # s299 r35z16')
# 2) HP bar: shield + number at the right end
old4 = ('\tif aw287 > 0.0: draw_rect(Rect2(x0 + hw, y0, aw287, HP_H), Color(0.93, 0.93, 0.9, 0.95))\n')
assert s.count(old4) == 1
new4 = old4 + ('\tif ARM299 and arm287 > 0.0:   # s299 r35z18: shield symbol + armour number at the bar end\n'
               '\t\tvar ss := float(OS.get_environment("S299SS")) if OS.get_environment("S299SS") != "" else 12.0\n'
               '\t\tvar sr := Rect2(x0 + BAR_W - ss * 0.35, y0 + HP_H * 0.5 - ss * 0.5, ss, ss)\n'
               '\t\t_arm299.append([sr, R_num(arm287)])\n')
s = s.replace(old4, new4)
# draw the shields after every bar (on top), in _ic_layer order: queue as normal symbols + text afterwards
old5 = 'var _ic_q: Array = []\n'
assert s.count(old5) == 1
s = s.replace(old5, old5 + 'var _arm299: Array = []   # s299 r35z18: [rect, text] per unit\nvar ARM299 := OS.get_environment("S299ARM") != "0"\n')
old6 = '\t_ic_q.clear()\n'
assert s.count(old6) == 1
s = s.replace(old6, old6 + '\t_arm299.clear()\n')
old7 = '\t_draw_tip()\n\nfunc _draw_tip() -> void:'
assert s.count(old7) == 1
new7 = ('\tif ARM299:   # s299 r35z18: HP-bar shields, number drawn over the symbol\n'
        '\t\tvar mf: Font = TH.font("mono")\n'
        '\t\tvar af := int(OS.get_environment("S299AF")) if OS.get_environment("S299AF") != "" else 8\n'
        '\t\tvar fo := icon_tex("armor")\n'
        '\t\tfor e in _arm299:\n'
        '\t\t\tvar sr: Rect2 = e[0]\n'
        '\t\t\tif fo != null:\n'
        '\t\t\t\tfor dv in [Vector2(-1, 0), Vector2(1, 0), Vector2(0, -1), Vector2(0, 1), Vector2(-0.7, -0.7), Vector2(0.7, -0.7), Vector2(-0.7, 0.7), Vector2(0.7, 0.7)]:\n'
        '\t\t\t\t\t_ic_layer.draw_texture_rect(fo, Rect2(sr.position + dv, sr.size), false, Color(0.02, 0.03, 0.04, 1))\n'
        '\t\t\t\t_ic_layer.draw_texture_rect(fo, sr, false, Color("#a9c8ee"))\n'
        '\t\t\tvar t := String(e[1])\n'
        '\t\t\tvar tw := mf.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, af).x\n'
        '\t\t\tvar bp := Vector2(sr.get_center().x - tw * 0.5, sr.get_center().y + float(af) * 0.36)\n'
        '\t\t\t_ic_layer.draw_string_outline(mf, bp, t, HORIZONTAL_ALIGNMENT_LEFT, -1, af, 2, Color(0.02, 0.03, 0.04, 1))\n'
        '\t\t\t_ic_layer.draw_string(mf, bp, t, HORIZONTAL_ALIGNMENT_LEFT, -1, af, Color(1, 1, 1))\n') + old7
s = s.replace(old7, new7)
p.write_text(s, encoding="utf-8"); print("ok")
