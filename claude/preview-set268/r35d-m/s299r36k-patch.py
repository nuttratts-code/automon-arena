# set 299 round 36k (sample, after s299r36j): owner "put the card edges right next to each other, but the lines must not
#   double up · the lock button grows out (picture: a small tab on a card's edge), in our own look" →
#   shop cards flush (separation 0, cards fill the Dock), one shared divider line, cut corners only on the strip's outer ends ·
#   lock button = a tab grown out of the top plate under its right end (one outline + a soft inner fillet), plate no longer
#   widened for the lock · HUD icons shifted left of the tab · env S299FLUSH=0 = old separate cards
import sys, pathlib, re
here = pathlib.Path(__file__).parent
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
src = (here / "s299r36-prep.gd.txt").read_text(encoding="utf-8")
src = re.sub(r"(?m)^((?:    )+)", lambda m: "\t" * (len(m.group(1)) // 4), src)
(g / "scripts/ui/s299_prep.gd").write_text(src, encoding="utf-8")
T = "\t"
FL = 'OS.get_environment("S299FLUSH") != "0"'
pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
rep = [
    (T*2 + 'c.custom_minimum_size.x = SHOP_W\n',
     T*2 + 'c.custom_minimum_size.x = SHOP_W\n'
     + T*2 + 'if OS.get_environment("S299PREP") != "0" and ' + FL + ':   # r36k: flush cards fill the Dock\n'
     + T*3 + 'c.size_flags_horizontal = Control.SIZE_EXPAND_FILL\n'),
    ('_mv299(hbx, top, 1.0, -270, 0, 106, 136)', '_mv299(hbx, top, 1.0, -360, -88, 106, 136)'),
    (T*2 + '_mv299(lb, top, 0.5, 394, 418, 36, 60)\n',
     T*2 + '_mv299(lb, top, 0.5, 357, 395, 104, 132)   # r36k: a tab under the plate\'s right end\n'
     + T*2 + 'if ' + FL + ':\n' + T*3 + 'shop_row.add_theme_constant_override("separation", 0)   # r36k: cards flush\n'),
    ('"gold" if on else "mute", 16))', '"gold" if on else "mute", 20))   # r36k: bigger padlock on the tab'),
    ('lpl.mode = "btn"', 'lpl.mode = "tab"   # r36k: drawn by the top plate'),
    (T*3 + 'rn.mode = "run"\n',
     T*3 + 'rn.mode = "run"\n'
     + T*3 + 'if ' + FL + ':   # r36k: light follows the flush card shape\n'
     + T*4 + 'rn.kl = 6.0 if i == 0 else 0.0\n'
     + T*4 + 'rn.kr = 6.0 if i == int(R.RULES()["shop"]["slots"]) - 1 else 0.0\n'),
]
for o, n in rep:
    assert p.count(o) == 1, o
    p = p.replace(o, n)
pp.write_text(p, encoding="utf-8")

ps = g / "scripts/ui/slot_cell.gd"; s = ps.read_text(encoding="utf-8")
old = T + '_PZ299.plate(self, Rect2(Vector2.ZERO, size), 6.0 if _pz299["shop"] else 5.0, picked, 1.0 if f else 0.45, edge, ew)\n'
new = (T + 'if _pz299["shop"] and ' + FL + ' and get_parent() != null:   # r36k: flush strip, one shared divider\n'
       + T*2 + 'var n := get_parent().get_child_count()\n'
       + T*2 + '_PZ299.strip(self, size.x, size.y, get_index(), n, picked, 1.0 if f else 0.45, edge if bw < 3 else null, ew if bw < 3 else 1.0)\n'
       + T*2 + 'if bw >= 3:   # pick / drop / highlight = one card stands out with its own full frame\n'
       + T*3 + 'draw_polyline(_PZ299._pts(Rect2(Vector2.ZERO, size).grow(-1.0), 0.0, 0.0) + PackedVector2Array([Vector2(1, 1)]), Color(_pz299["line"], 1.0), 2.0)\n'
       + T*2 + 'return\n'
       + old)
assert s.count(old) == 1
s = s.replace(old, new)
ps.write_text(s, encoding="utf-8")
print("ok r36k")
