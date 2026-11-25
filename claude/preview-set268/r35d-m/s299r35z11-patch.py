# set 299 round 35z11 (sample, after s299r35z10b)
#  ① card numbers in their status hue: burn red · shock yellow · armour light blue (S299NUM=0 = white, the B look)
#  ② tap a CARD -> detail box opens on the first status page · tap a UNIT on the arena -> page 1 (values + skill)
#  ③ the old live-details popup (live.gd, "ค่าเรียลไทม์ …") no longer opens on a unit tap (S299LIVE=1 = back)
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"; s = p.read_text(encoding="utf-8")

def rep(old, new):
    global s
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)

rep('\tvar col := Color(1, 1, 1, 0.98 * a) if SYM299 in ["a", "b"] else Color(TAG_COL3.get(_l4_col(kd), INK), a)\n',
    '\tvar col := Color(1, 1, 1, 0.98 * a) if SYM299 in ["a", "b"] else Color(TAG_COL3.get(_l4_col(kd), INK), a)\n'
    '\tif OS.get_environment("S299NUM") != "0" and NUM299.has(kd): col = Color(NUM299[kd], 0.98 * a)   # s299 r35z11: status hue\n')
rep('func _symnum299(', 'const NUM299 := {"burn": Color("#ff6a55"), "shock": Color("#ffd84a"), "armor": Color("#8fd3ff")}   # s299 r35z11\n\nfunc _symnum299(')
# ② page jump
rep('\t\tif (_rects[uid] as Rect2).grow_individual(0, gy, 0, gy).has_point(p):   # s293: card + its chip rows\n\t\t\t_pick(uid)\n',
    '\t\tif (_rects[uid] as Rect2).grow_individual(0, gy, 0, gy).has_point(p):   # s293: card + its chip rows\n\t\t\t_pgj299 = 1   # s299 r35z11: from a card -> status page\n\t\t\t_pick(uid)\n')
rep('\tvar hit := _unit_at(mb.position)\n\tif hit >= 0:\n\t\t_pick(hit)\n',
    '\tvar hit := _unit_at(mb.position)\n\tif hit >= 0:\n\t\t_pgj299 = 0   # s299 r35z11: from the arena -> page 1\n\t\t_pick(hit)\n')
rep('var _pginit := false', 'var _pgj299 := -1   # s299 r35z11: page to jump to on the next draw (-1 none · 0 first page · 1 first status page)\nvar _pginit := false')
rep('\tvar pg := clampi(_pg299, 0, _pgn299 - 1)\n',
    '\tif _pgj299 >= 0:\n\t\t_pg299 = chunks if _pgj299 == 1 else 0\n\t\t_pgj299 = -1\n\tvar pg := clampi(_pg299, 0, _pgn299 - 1)\n')
p.write_text(s, encoding="utf-8")

b = g / "scripts/ui/battle.gd"; t = b.read_text(encoding="utf-8")
old = 'func _show_live() -> void:\n\tif view.picked == null or view.result == null:\n\t\treturn\n'
assert t.count(old) == 1
t = t.replace(old, 'func _show_live() -> void:\n\tif OS.get_environment("S299LIVE") != "1":   # s299 r35z11: old live popup off (detail box at the bottom instead)\n\t\tlive.visible = false\n\t\treturn\n\tif view.picked == null or view.result == null:\n\t\treturn\n')
b.write_text(t, encoding="utf-8")
print("ok")
