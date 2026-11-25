# set 299 round 36h (sample, after s299r36g): owner on r36g —
#   creature fills the shop card (3 px margin) · padlock off the card → one small lock button right of the shop
#   (B1 lock the whole shop: tap = lock every card there, tap again = unlock; the rule change itself waits for ทำจริง) ·
#   D1 tribe "1/2" count hidden (tribe shape stays) · E1 shop level + odds row bottom-left (bench narrower, shifted right) ·
#   C1 card of a kind you own = light running round its edge; a buy that levels up adds stars (★★ = Lv2, ★★★ = Lv3),
#   the old "upstar" ribbon hides
import sys, pathlib, re
here = pathlib.Path(__file__).parent
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
src = (here / "s299r36-prep.gd.txt").read_text(encoding="utf-8")
src = re.sub(r"(?m)^((?:    )+)", lambda m: "\t" * (len(m.group(1)) // 4), src)
(g / "scripts/ui/s299_prep.gd").write_text(src, encoding="utf-8")
T = "\t"
ON = 'OS.get_environment("S299PREP") != "0"'
pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
rep = [
    # D1: tribe count hidden
    (T*3 + 'tl.name = "BuyStep"\n',
     T*3 + 'tl.name = "BuyStep"\n' + T*3 + 'tl.visible = not (' + ON + ')   # r36h D1: tribe count off, shape stays\n'),
    # creature fills the card
    (T*2 + 'cc.offset_top = 2\n',
     T*2 + 'cc.offset_top = 3   # r36h: creature fills the card, 3 px margin\n' + T*2 + 'cc.offset_left = 3\n' + T*2 + 'cc.offset_right = -3\n'),
    (T*2 + 'cc.offset_bottom = -42   # r36g: art above the stats row\n', T*2 + 'cc.offset_bottom = -3   # r36h\n'),
    (T*2 + 'cc.add_child(UV.make(c, 0, SHOP_PX * 1.3, false))   # r36g: 80-tall card\n',
     T*2 + 'cc.add_child(UV.make(c, 0, SHOP_PX * 1.75, false))   # r36h: fills the card\n'),
    # padlock off the card · running light + stars · ribbon off
    (T + 'ov.add_child(lk)\n' + T + 'if ready:\n',
     T + 'ov.add_child(lk)\n'
     + T + 'if ' + ON + ':   # r36h: padlock off the card (lock button right of the shop) · C1 running light + stars\n'
     + T*2 + 'lk.name = "LockTapOff299"\n' + T*2 + 'lk.visible = false\n'
     + T*2 + 'var demo299 := OS.get_environment("S299RUNDEMO") == "1" and i >= 1 and i <= 3   # sample only: cards 2-4 show the 3 states\n'
     + T*2 + 'if mine.size() > 0 or demo299:\n'
     + T*3 + 'var rn: Control = load("res://scripts/ui/s299_prep.gd").new()\n'
     + T*3 + 'rn.mode = "run"\n'
     + T*3 + 'if ready:\n'
     + T*4 + 'var lv2 := mine.filter(func(x): return float(x["u"]["level"]) == 2.0).size()\n'
     + T*4 + 'rn.stars = 3 if float(lv2) >= merge_need(id) - 1.0 else 2\n'
     + T*3 + 'if demo299:\n'
     + T*4 + 'rn.stars = [0, 0, 2, 3][i]\n'
     + T*3 + 'ov.add_child(rn)\n'
     + T + 'if ready and not (' + ON + '):\n'),
    # E1 odds bottom-left · bench narrower · lock button
    (T*3 + '_mv299(bench_row, tr, 0.5, -X, X, 72, 138)   # r36g: bench 66 tall\n',
     T*3 + '_mv299(bench_row, tr, 0.5, -130, 282, 72, 138)   # r36h: narrower, shifted right (odds bottom-left)\n'),
    (T*2 + 'if btn_fight != null:\n' + T*3 + 'btn_fight.offset_top = 72',
     T*2 + '_mv299(top.get_node_or_null("ShopOdds"), tr, 0.0, 0, 228, 72, 104)   # r36h E1: shop level + odds bottom-left\n'
     + T*2 + 'var lb := Button.new()   # r36h B1: one small lock button right of the shop\n'
     + T*2 + 'lb.name = "Lock299"\n' + T*2 + 'lb.focus_mode = Control.FOCUS_NONE\n' + T*2 + 'lb.tooltip_text = "ล็อกร้าน"\n'
     + T*2 + 'top.add_child(lb)\n' + T*2 + '_mv299(lb, top, 0.5, 394, 418, 28, 52)\n'
     + T*2 + 'var lpl: Control = PZS.new()\n' + T*2 + 'lpl.mode = "btn"\n' + T*2 + 'lpl.btn = lb\n' + T*2 + 'lb.add_child(lpl)\n'
     + T*2 + 'lb.pressed.connect(_lock299.bind(lb))\n' + T*2 + '_lock299_icon(lb)\n'
     + T*2 + 'if btn_fight != null:\n' + T*3 + 'btn_fight.offset_top = 72'),
    (T*2 + 'if float(odds[r]) <= 0.0:\n' + T*3 + 'continue\n',
     T*2 + 'if float(odds[r]) <= 0.0 and not (' + ON + '):   # r36h E1: every rarity, 0 % too (picture 2)\n' + T*3 + 'continue\n'),
    (T*2 + 'odds_row.add_child(h)\n\nfunc _build_menu',
     T*2 + 'odds_row.add_child(h)\n'
     + T + 'if ' + ON + ':   # r36h E1: shop level chip at the end (picture 2)\n'
     + T*2 + 'var lvl := TH.label("Lv.%d" % int(lv), 13, "ink", "body_b")\n'
     + T*2 + 'lvl.add_theme_stylebox_override("normal", TH.box(Color(0, 0, 0, 0.45), TH.c("line"), 8, 1, 6, 0))\n'
     + T*2 + 'lvl.mouse_filter = Control.MOUSE_FILTER_IGNORE\n'
     + T*2 + 'odds_row.add_child(lvl)\n\nfunc _build_menu'),
    ('static func _mv299(',
     'func _lock_on299() -> bool:   # r36h: every card in the shop is locked (an empty shop counts as unlocked)\n'
     + T + 'if app == null or not (app.P is Dictionary) or app.P.is_empty():   # layout built before a run exists\n' + T*2 + 'return false\n'
     + T + 'var any := false\n'
     + T + 'for s in P()["shop"]:\n'
     + T*2 + 'if s.get("id") != null:\n' + T*3 + 'any = true\n'
     + T*3 + 'if not bool(s.get("locked", false)):\n' + T*4 + 'return false\n'
     + T + 'return any\n\n'
     + 'func _lock299(lb: Button) -> void:   # r36h B1: lock every card in the shop, or unlock them all (sample: per-slot toggles)\n'
     + T + 'if app == null or not (app.P is Dictionary) or app.P.is_empty():\n' + T*2 + 'return\n'
     + T + 'var on := _lock_on299()\n'
     + T + 'var sh: Array = P()["shop"]\n'
     + T + 'for i in sh.size():\n'
     + T*2 + 'var s: Dictionary = P()["shop"][i]\n'
     + T*2 + 'if s.get("id") != null and bool(s.get("locked", false)) == on:\n'
     + T*3 + 'app.do_lock(i)\n'
     + T + '_lock299_icon(lb)\n\n'
     + 'func _lock299_icon(lb: Button) -> void:\n'
     + T + 'for ch in lb.get_children():\n'
     + T*2 + 'if ch.name == "Ico299":\n' + T*3 + 'ch.queue_free()\n'
     + T + 'var on := _lock_on299()\n'
     + T + 'var cc := CenterContainer.new()\n' + T + 'cc.name = "Ico299"\n'
     + T + 'cc.mouse_filter = Control.MOUSE_FILTER_IGNORE\n'
     + T + 'lb.add_child(cc)\n'
     + T + 'cc.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)\n'
     + T + 'cc.add_child(SHAPE.make("lock" if on else "unlock", "gold" if on else "mute", 16))\n\n'
     + 'static func _mv299('),
]
for o, n in rep:
    assert p.count(o) == 1, o
    p = p.replace(o, n)
pp.write_text(p, encoding="utf-8")
print("ok r36h")
