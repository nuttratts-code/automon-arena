# set 299 round 35z12 (sample, after s299r35z11)
#  ① page flip box 13 -> 10 px, its + / − 6 -> 4 px
#  ② dead units can be picked on the arena too (alive units win when both are under the tap)
#  ③ tapping the same unit / card again keeps the box open; a tap on empty ground (no unit, no card, no button) closes it
import sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"; s = p.read_text(encoding="utf-8")

def rep(old, new):
    global s
    assert s.count(old) == 1, old[:70]
    s = s.replace(old, new)

rep('\tvar br := Rect2(R.end.x - 8.0 - 13.0, R.end.y - 4.0 - 13.0, 13.0, 13.0)   # page flip box, bottom-right\n',
    '\tvar br := Rect2(R.end.x - 8.0 - 10.0, R.end.y - 5.0 - 10.0, 10.0, 10.0)   # page flip box, bottom-right (r35z12: 13 -> 10)\n')
rep('\t_pn_layer.draw_rect(Rect2(bc.x - 3.0, bc.y - 0.5, 6.0, 1.0), Color(1, 1, 1, 1))\n\tif pg < _pgn299 - 1: _pn_layer.draw_rect(Rect2(bc.x - 0.5, bc.y - 3.0, 1.0, 6.0), Color(1, 1, 1, 1))\n',
    '\t_pn_layer.draw_rect(Rect2(bc.x - 2.0, bc.y - 0.5, 4.0, 1.0), Color(1, 1, 1, 1))   # r35z12: mark 6 -> 4\n\tif pg < _pgn299 - 1: _pn_layer.draw_rect(Rect2(bc.x - 0.5, bc.y - 2.0, 1.0, 4.0), Color(1, 1, 1, 1))\n')
# ② dead pickable on the arena
rep('\t\tif v.get("down") == true or float(v["hp"]) <= 0.0: continue\n\t\tvar uid := int(v["uid"])\n\t\tvar s := _spr(uid)\n\t\tif s == null or not s.is_visible_in_tree(): continue\n',
    '\t\tvar dead299: bool = v.get("down") == true or float(v["hp"]) <= 0.0   # r35z12: dead can be picked too\n\t\tvar uid := int(v["uid"])\n\t\tvar s := _spr(uid)\n\t\tif s == null: continue\n')
rep('\t\t\tvar d := canvas_p.distance_to(rr.get_center())\n\t\t\tif d < bestd:\n',
    '\t\t\tvar d := canvas_p.distance_to(rr.get_center()) + (100000.0 if dead299 else 0.0)   # alive first\n\t\t\tif d < bestd:\n')
# ③ no toggle; empty tap closes
rep('\tpicked = -1 if picked == uid else uid\n', '\tpicked = uid   # r35z12: same unit / card again = stays open\n')
rep('\tvar hit := _unit_at(mb.position)\n\tif hit >= 0:\n\t\t_pgj299 = 0   # s299 r35z11: from the arena -> page 1\n\t\t_pick(hit)\n',
    '\tvar hit := _unit_at(mb.position)\n\tif hit >= 0:\n\t\t_pgj299 = 0   # s299 r35z11: from the arena -> page 1\n\t\t_pick(hit)\n'
    '\telif picked >= 0 and not (get_viewport().gui_get_hovered_control() is BaseButton):   # r35z12: empty ground = close\n\t\tpicked = -1\n')
p.write_text(s, encoding="utf-8")

# battle.gd: a second tap on the same unit must not unpick there either
b = g / "scripts/ui/battle.gd"; t = b.read_text(encoding="utf-8")
old = '\tif uid < 0 or (view.picked != null and int(view.picked) == uid):\n\t\tunpick() # the same unit again, or an empty cell = back to the field\n\t\treturn\n'
assert t.count(old) == 1
t = t.replace(old, '\tif uid < 0:   # s299 r35z12: the same unit again keeps it picked; empty = back to the field\n\t\tunpick()\n\t\treturn\n')
b.write_text(t, encoding="utf-8")
print("ok")
