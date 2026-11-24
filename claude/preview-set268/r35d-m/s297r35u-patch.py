#!/usr/bin/env python3
# set 297 round 35u: layout 4 in Godot (notes 74b + 75-77, owner A1 + B2)
#   no cards (own + foe) · bottom = two 2x3 mini boards (own left, foe right, arena order)
#   slot = flat plate + side line + head icon + row 1 armour/burn/shock E-tags + row 2 buff/debuff chips ("+N" when full)
#   centre console = always there; nothing picked = hint "แตะตัวละครเพื่อดู" (owner B2)
#   pause / fast-forward move to the top-right; on-unit tags default to variant E
#   S297=0 = round 35s9
# run after s295r35s9-patch.py:  python -I s297r35u-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])

def T(s):   # 4 spaces -> tab
    return s.replace("    ", "\t")

def sub(s, old, new, tag):
    old = T(old); new = T(new)
    assert s.count(old) == 1, tag
    return s.replace(old, new)

# ---------------- battle.gd: pause / ff go to the top-right of the HUD ----------------
p = root / "scripts/ui/battle.gd"
s = p.read_text(encoding="utf-8")
s = sub(s, '''    dv.add_child(_build_dock())
''', '''    if OS.get_environment("S297") != "0":   # s297 r35u (layout 4): pause / fast-forward at the top-right
        hud.add_child(_build_dock())
    else:
        dv.add_child(_build_dock())
''', "dock")
s = sub(s, '''        b.custom_minimum_size = Vector2(58, 54) if pair[1] == "pause" else Vector2(70, 54)   # round 12: room for 4 triangles
''', '''        b.custom_minimum_size = Vector2(58, 54) if pair[1] == "pause" else Vector2(70, 54)   # round 12: room for 4 triangles
        if OS.get_environment("S297") != "0":   # s297: small top-right buttons, same height as the clock plate
            b.custom_minimum_size = Vector2(34, 26) if pair[1] == "pause" else Vector2(40, 26)
            b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
''', "btnsize")
s = sub(s, '''    d.custom_minimum_size.y = 52
''', '''    d.custom_minimum_size.y = 52 if OS.get_environment("S297") == "0" else 0
''', "docky")
p.write_text(s, encoding="utf-8")

# ---------------- s286_team.gd ----------------
p = root / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")

# on-unit tags: variant E is the default in layout 4
s = sub(s, '''        var V := OS.get_environment("S295V")
''', '''        var V := OS.get_environment("S295V")
        if V == "" and OS.get_environment("S297") != "0": V = "e"   # s297: owner picked E (note 74b)
''', "V")

# _draw: layout 4 replaces every card
s = sub(s, '''    var w := minf(maxf(_tw287, CARD_MIN_W), (size.x - PAD_L - PAD_R - GAP * float(n - 1)) / float(n))
''', '''    if OS.get_environment("S297") != "0":   # s297 r35u: layout 4
        _layout4()
        if _pn_layer != null: _pn_layer.queue_redraw()
        return
    var w := minf(maxf(_tw287, CARD_MIN_W), (size.x - PAD_L - PAD_R - GAP * float(n - 1)) / float(n))
''', "draw")

s = sub(s, '''    _det_r = Rect2()
    if picked >= 0 and view != null and view.units.has(picked) and OS.get_environment("S287CARDS") != "0":
''', '''    _det_r = Rect2()
    if OS.get_environment("S297") != "0":
        _console4(_con_r)
        _cv287 = null
        return
    if picked >= 0 and view != null and view.units.has(picked) and OS.get_environment("S287CARDS") != "0":
''', "panels")

# tap: slot rects only (no grow over the next row); the console never closes
s = sub(s, '''        if (_rects[uid] as Rect2).grow_individual(0, 26, 0, 26).has_point(p):   # s293: card + its chip rows
''', '''        var gy := 0.0 if OS.get_environment("S297") != "0" else 26.0   # s297: slots touch, no grow
        if (_rects[uid] as Rect2).grow_individual(0, gy, 0, gy).has_point(p):   # s293: card + its chip rows
''', "tap")
s = sub(s, '''    if picked >= 0 and _det_r.has_point(p):   # s293: tap the detail panel = close it
''', '''    if OS.get_environment("S297") != "0" and _con_r.has_point(p):   # s297: the console stays, tap = nothing
        get_viewport().set_input_as_handled()
        return
    if picked >= 0 and _det_r.has_point(p):   # s293: tap the detail panel = close it
''', "contap")

s = s.rstrip("\n") + "\n" + T('''

# ---------- s297 r35u: layout 4 (notes 75-77) ----------
const L4_SW := 76.0     # slot width (base px)
const L4_SH := 26.0     # slot height
const L4_G := 2.0       # gap between slots
const L4_PAD := 16.0    # screen side margin
const L4_PB := 8.0      # bottom margin
const L4_CG := 7.0      # board <-> console gap
const L4_EFW := {"hitAmp": "ตี", "burnAmp": "ไฟ", "shockAmp": "ฟ้า", "armorAmp": "รับเกราะ", "healAmp": "รับฮีล",
    "cdAmp": "ลดคูล", "healToAtk": "ฮีล→ตี", "dmgTaken": "โดนตี", "burnTaken": "โดนไฟ", "shockTaken": "โดนฟ้า",
    "armorCut": "รับเกราะ", "cdSlow": "คูลช้า", "stun": "มึนงง"}   # s297: short console words (blue = buff, red = debuff)
const L4_VAL := {"atk": "ตี", "multi": "ครั้ง", "burn": "ไฟ", "shock": "ฟ้า", "armhit": "เกราะ", "heal": "ฮีล"}
const L4_NUM := {"armor": "เกราะ", "burn": "ติดไฟ", "shock": "ติดฟ้า"}
var _con_r := Rect2()

func _l4_col(kd: String) -> String:   # armour number uses the armour-per-hit hue
    return "armhit" if kd == "armor" else kd

func _layout4() -> void:
    var bw := L4_SW * 3.0 + L4_G * 2.0
    var bh := L4_SH * 2.0 + L4_G
    var y0 := size.y - L4_PB - bh
    var ox := L4_PAD
    var fx := size.x - L4_PAD - bw
    _con_r = Rect2(ox + bw + L4_CG, y0, fx - L4_CG - (ox + bw + L4_CG), bh)
    for side in 2:
        var x0 := ox if side == 0 else fx
        var used := {}
        for v in view.units.values():
            if int(v["side"]) != side: continue
            var row := int(v["row"])     # 0 front .. 2 back
            var lane := int(v["lane"])   # 0 far (top) .. 1 near (bottom)
            var col := (2 - row) if side == 0 else row   # same order as the arena: own back row at the left edge
            used["%d:%d" % [col, lane]] = true
            var r := Rect2(x0 + float(col) * (L4_SW + L4_G), y0 + float(lane) * (L4_SH + L4_G), L4_SW, L4_SH)
            _rects[int(v["uid"])] = r
            _slot4(r, v, int(v["uid"]) == picked)
        for c in 3:   # empty board places stay faint, so the board keeps its shape
            for l in 2:
                if used.has("%d:%d" % [c, l]): continue
                draw_rect(Rect2(x0 + float(c) * (L4_SW + L4_G), y0 + float(l) * (L4_SH + L4_G), L4_SW, L4_SH), Color(TH.R23_INK, 0.30))

func _tag4(tr: Rect2, kd: String, t: String, a: float) -> void:   # variant E tag (note 74b)
    var mf: Font = TH.font("mono")
    var sb := StyleBoxFlat.new()
    sb.set_corner_radius_all(1)
    sb.bg_color = Color(TAG_COL2.get(_l4_col(kd), INK), 0.92 * a)
    sb.border_color = Color(TAG_COL3.get(_l4_col(kd), INK), 0.95 * a); sb.set_border_width_all(1)
    draw_style_box(sb, tr)
    var tx := tr.position.x + (tr.size.x - mf.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x) * 0.5
    draw_string_outline(mf, Vector2(tx, tr.position.y + 7.5), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, 3, Color(0.05, 0.06, 0.08, 0.75 * a))
    draw_string(mf, Vector2(tx, tr.position.y + 7.5), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color(1, 1, 1, 0.98 * a))

func _slot4(r: Rect2, v: Dictionary, on: bool) -> void:
    var uid := int(v["uid"])
    var foe := int(v["side"]) == 1
    var dead: bool = v.get("down") == true or float(v["hp"]) <= 0.0
    var a := 0.45 if dead else 1.0
    draw_rect(r, Color(Color("#1d6079") if on else TH.R23_INK, 0.70))   # note 70: flat plate, picked = teal
    var side_col: Color = FOE_COL if foe else OWN_COL
    draw_rect(Rect2(r.position.x, r.position.y, r.size.x, 1.0), Color(side_col, 0.85 * a))
    if on: draw_rect(r, Color(1, 1, 1, 0.95), false, 2.0)
    # head icon in a diamond
    var c := Vector2(r.position.x + 12.0, r.position.y + 14.0)
    var dr := 9.0
    var dia := PackedVector2Array([c + Vector2(0, -dr), c + Vector2(dr, 0), c + Vector2(0, dr), c + Vector2(-dr, 0)])
    draw_colored_polygon(dia, Color(0.08, 0.12, 0.16, 0.9 * a))
    var ic: Texture2D = tl._icon(uid) if tl != null else null
    if ic != null: draw_texture_rect(ic, Rect2(c - Vector2(dr, dr) * 1.15, Vector2(dr, dr) * 2.3), false, Color(1, 1, 1, a) if not dead else Color(0.6, 0.6, 0.6, a))
    draw_polyline(dia + PackedVector2Array([dia[0]]), Color(side_col, 0.95 * a), 1.0)
    var L := r.position.x + 25.0
    var RT := r.end.x - 3.0
    # row 1: armour / burn / shock numbers as E-tags (present only)
    var mf: Font = TH.font("mono")
    var x := L
    for q in _row1(v):
        var t := String(q[1])
        var tw := mf.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x + 6.0
        if x + tw > RT: break
        _tag4(Rect2(x, r.position.y + 3.0, tw, 10.0), String(q[0]), t, a)
        x += tw + 1.0
    # row 2: buff / debuff chips; when they do not fit, the last place = "+N"
    var ef := _effects(v)
    var cs := 10.0
    var fit := int(floorf((RT - L + 1.0) / (cs + 1.0)))
    var nshow := ef.size()
    var more := 0
    if ef.size() > fit:
        var pw := mf.get_string_size("+%d" % ef.size(), HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x + 5.0
        nshow = int(floorf((RT - L - pw) / (cs + 1.0)))
        more = ef.size() - nshow
    x = L
    for i in nshow:
        _effect_chip(Rect2(x, r.position.y + 14.5, cs, cs), ef[i], a)
        x += cs + 1.0
    if more > 0:
        var t2 := "+%d" % more
        var pr := Rect2(x, r.position.y + 14.5, mf.get_string_size(t2, HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x + 5.0, cs)
        var sb := StyleBoxFlat.new()
        sb.bg_color = Color(TH.R23_INK, 0.9 * a)
        sb.border_color = Color(1, 1, 1, 0.9 * a); sb.set_border_width_all(1)
        sb.set_corner_radius_all(1)
        draw_style_box(sb, pr)
        draw_string(mf, Vector2(pr.position.x + 2.5, pr.position.y + 7.5), t2, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color(1, 1, 1, 0.98 * a))

func _fit_txt(t: String, fs: int, maxw: float, bold := false) -> String:
    var f: Font = TH.font("body_b" if bold else "body")
    if f.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x <= maxw: return t
    var s2 := t
    while s2.length() > 1 and f.get_string_size(s2 + "…", HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x > maxw:
        s2 = s2.substr(0, s2.length() - 1)
    return s2 + "…"

func _short4(e: Array) -> String:   # "ตี +20%" · "โดนไฟ +25% 4วิ" · "มึนงง 0.9วิ"
    var tip := String(e[4])
    var rx := RegEx.new()
    rx.compile("[0-9]+([.][0-9]+)?%?")
    var nums := rx.search_all(tip)
    var w := String(L4_EFW.get(String(e[0]), tip))
    if String(e[0]) == "stun": return w + (" " + nums[0].get_string() + "วิ" if nums.size() > 0 else "")
    var mk := String(e[5]).replace("-", "−")
    var o := w + (" " + mk + nums[0].get_string() if nums.size() > 0 else "")
    if tip.find("เหลือ") >= 0 and nums.size() > 1: o += " " + nums[1].get_string() + "วิ"
    return o

func _console4(R: Rect2) -> void:
    if R.size.x <= 0.0: return
    _pn_layer.draw_rect(R, Color(TH.R23_INK, 0.70))   # note 70: flat slate plate
    var has: bool = picked >= 0 and view != null and view.units.has(picked)
    if not has:   # owner B2: empty console with a hint
        var hint := "แตะตัวละครเพื่อดู"
        var hf: Font = TH.font("body")
        var hw := hf.get_string_size(hint, HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x
        _dtxt(Vector2(R.get_center().x - hw * 0.5, R.get_center().y + 4.0), hint, 11, Color(MUTE, 0.75))
        return
    var v: Dictionary = view.units[picked]
    var foe := int(v["side"]) == 1
    var dead: bool = v.get("down") == true or float(v["hp"]) <= 0.0
    var side_col: Color = FOE_COL if foe else OWN_COL
    _pn_layer.draw_rect(Rect2(R.position.x, R.position.y, R.size.x, 1.0), Color(side_col, 0.85))
    var ink := INK
    var mute := Color(MUTE, 0.8)
    var y := R.position.y
    # column 1: who + HP + cooldown
    var L := R.position.x + 8.0
    var W1 := 84.0
    var RT := L + W1
    var who := str(v.get("name", v.get("id", ""))) + " · เลเวล %d" % int(v.get("level", 1))
    _dtxt(Vector2(L, y + 12.0), _fit_txt(who, 9, W1, true), 9, ink, true)
    var mx := maxf(1.0, float(v["maxHp"]))
    var hp := clampf(float(v["hp"]), 0.0, mx)
    var arm := maxf(0.0, float(v.get("armor", 0.0)))
    _pn_layer.draw_rect(Rect2(L, y + 16.0, W1, 3.0), Color(0.09, 0.08, 0.06, 0.65))
    var sc := W1 / maxf(mx, hp + arm)
    _pn_layer.draw_rect(Rect2(L, y + 16.0, roundf(hp * sc), 3.0), Color("#5e9a45") if hp / mx > 0.3 else Color("#bf8530"))
    if arm > 0.0: _pn_layer.draw_rect(Rect2(L + roundf(hp * sc), y + 16.0, roundf(arm * sc), 3.0), Color(0.93, 0.93, 0.9, 0.95))
    _dtxt(Vector2(L, y + 30.0), ("ล้มแล้ว" if dead else "HP %s/%s" % [R_num(hp), R_num(mx)] + (("  เกราะ " + R_num(arm)) if arm > 0.0 else "")), 9, ink)
    var sd: Variant = v.get("stat")
    var cdv := float(sd.get("cd", 0.0)) / 1000.0 if sd is Dictionary else 0.0
    var rem := _cd_rem(v)
    _dtxt(Vector2(L, y + 42.0), _fit_txt(("ตีทุก %.1f วิ" % cdv) + ((" · อีก %.1f" % rem) if rem >= 0.0 and not dead else ""), 9, W1), 9, ink)
    var cf := _cd_frac(v)
    _pn_layer.draw_rect(Rect2(L, y + 46.0, W1, 2.0), Color(0.09, 0.08, 0.06, 0.6))
    if cf >= 0.0 and not dead: _pn_layer.draw_rect(Rect2(L, y + 46.0, W1 * cf, 2.0), Color("#4f7fc4") if not foe else Color("#c0564f"))
    # column 2: the 6 values, 3 rows x 2, colour swatch = kind (E hues), zero = "–"
    var L2 := RT + 10.0
    var cw2 := 50.0
    _pn_layer.draw_rect(Rect2(L2 - 5.0, y + 5.0, 1.0, R.size.y - 10.0), Color(1, 1, 1, 0.08))
    var sl := _slots(v)
    for i in sl.size():
        var gx := L2 + (0.0 if i % 2 == 0 else cw2 + 4.0)
        var gy := y + 4.0 + float(i / 2) * 16.0
        var kd := String(sl[i][0])
        _pn_layer.draw_rect(Rect2(gx, gy + 3.0, 3.0, 8.0), Color(TAG_COL2.get(kd, INK), 1.0 if sl[i][2] else 0.35))
        _dtxt(Vector2(gx + 6.0, gy + 11.0), String(L4_VAL.get(kd, kd)), 8, ink if sl[i][2] else mute)
        _dnum(Vector2(0, gy + 11.0), String(sl[i][1]), 8, ink if sl[i][2] else mute, gx + cw2)
    # column 3: what is on the unit now, 2 columns x 3 rows; more = "+N อย่าง" in the last place
    var L3 := L2 + cw2 * 2.0 + 4.0 + 10.0
    _pn_layer.draw_rect(Rect2(L3 - 5.0, y + 5.0, 1.0, R.size.y - 10.0), Color(1, 1, 1, 0.08))
    var R3 := R.end.x - 8.0
    var cw3 := (R3 - L3 - 8.0) * 0.5
    var items := []
    for q in _row1(v): items.append(["n", String(q[0]), String(L4_NUM.get(q[0], q[0])) + " " + String(q[1]), true])
    for e in _effects(v): items.append(["e", String(e[1]), _short4(e), bool(e[2])])
    if items.is_empty(): _dtxt(Vector2(L3, y + 15.0), "ไม่มีสถานะ", 9, mute)
    var cap := 6 if items.size() <= 6 else 5
    for i in mini(items.size(), cap):
        var gx := L3 + (0.0 if i / 3 == 0 else cw3 + 8.0)   # column-major: left column first
        var gy := y + 4.0 + float(i % 3) * 16.0
        var it: Array = items[i]
        if it[0] == "n":
            _pn_layer.draw_rect(Rect2(gx, gy + 3.0, 8.0, 8.0), Color(TAG_COL2.get(_l4_col(String(it[1])), INK), 1.0))
        else:
            _pn_layer.draw_rect(Rect2(gx, gy + 3.0, 8.0, 8.0), Color("#2f6db5") if it[3] else Color("#b8343a"))
        _dtxt(Vector2(gx + 11.0, gy + 11.0), _fit_txt(String(it[2]), 8, cw3 - 11.0), 8, ink)
    if items.size() > cap:
        _dtxt(Vector2(L3 + cw3 + 8.0, y + 4.0 + 2.0 * 16.0 + 11.0), "+%d อย่าง" % (items.size() - cap), 8, mute)
''')
p.write_text(s, encoding="utf-8")
print("s297 r35u patched")
