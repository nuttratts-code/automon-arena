#!/usr/bin/env python3
# set 299 round 35w5 (owner): console lines swap: own (blue) starts at the TOP-LEFT corner (top edge -> right edge),
#   foe (red) starts at the BOTTOM-RIGHT corner (bottom edge -> left edge).
#   + new inside for the E4 cards + console (owner: "not like AI"), env S299IN (default on; S299IN=0 = round 35w4 inside):
#   card: head breaks out of the card top (no frame) · numbers = bare digits in their kind hue (no boxes), tight, "·" between
#         · buff / debuff chips right-aligned on row 2.
#   console: no vertical hairlines, no colour swatches · col A = name big + small "Lv" + HP as a big number "/max" small
#         + cooldown line · col B = the 6 values as word (dim) + number (kind hue), zero = faint "–" · col C = status as words
#         that flow and wrap (blue / red tint, tiny pixel arrow), tight inside, wide (22 px) between columns.
# run after s299r35w4-patch.py:  python -I s299r35w5-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")
f = root / "scripts/ui/s286_team.gd"
# 1. swap the console line paths
sub(f, T('''        var m := PackedVector2Array([Vector2(r.position.x + 1.0, r.position.y + 6.0), Vector2(r.position.x + 1.0, r.end.y - 1.0),
            Vector2(r.end.x - k - 0.5, r.end.y - 1.0), Vector2(r.end.x - 1.0, r.end.y - k - 0.5)])
        if flip:'''), T('''        var m := PackedVector2Array([Vector2(r.position.x + 1.0, r.position.y + k + 0.5), Vector2(r.position.x + k + 0.5, r.position.y + 1.0),
            Vector2(r.end.x - 1.0, r.position.y + 1.0), Vector2(r.end.x - 1.0, r.end.y - 6.0)])   # r35w5: own = from the top-left corner
        if flip:   # r35w5: foe = from the bottom-right corner: up the cut, along the bottom, up the left edge
            m = PackedVector2Array([Vector2(r.end.x - 1.0, r.end.y - k - 0.5), Vector2(r.end.x - k - 0.5, r.end.y - 1.0),
                Vector2(r.position.x + 1.0, r.end.y - 1.0), Vector2(r.position.x + 1.0, r.position.y + 6.0)])
        if false:'''))
sub(f, 'var E297 := OS.get_environment("S297E")', 'var IN299 := OS.get_environment("S299IN") != "0"   # s299 r35w5: new card + console inside\nvar E297 := OS.get_environment("S297E")')
# 2. card inside
sub(f, T('''    if on and E297 != "4": draw_rect(r, Color(1, 1, 1, 0.95), false, 2.0)
'''), T('''    if on and E297 != "4": draw_rect(r, Color(1, 1, 1, 0.95), false, 2.0)
    if E297 == "4" and IN299:
        _slot299(r, v, a, dead)
        return
'''))
# 3. console inside
sub(f, T('''    var v: Dictionary = view.units[picked]
    var foe := int(v["side"]) == 1
    var dead: bool = v.get("down") == true or float(v["hp"]) <= 0.0
    var side_col: Color = FOE_COL if foe else OWN_COL
'''), T('''    var v: Dictionary = view.units[picked]
    if E297 == "4" and IN299:
        _console299(R, v)
        return
    var foe := int(v["side"]) == 1
    var dead: bool = v.get("down") == true or float(v["hp"]) <= 0.0
    var side_col: Color = FOE_COL if foe else OWN_COL
'''))
s = f.read_text(encoding="utf-8")
s += T('''

# ---------- s299 r35w5: new inside for the E4 cards + console ----------
const W5_BUFF := Color("#9cc8ff")
const W5_DEBUFF := Color("#ff9b9b")

func _w5num(ci: CanvasItem, p: Vector2, t: String, fs: int, col: Color, bold := true) -> float:   # outlined text, returns width
    var f: Font = TH.font("body_b" if bold else "body")
    ci.draw_string_outline(f, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 3, Color(0.04, 0.05, 0.07, 0.8 * col.a))
    ci.draw_string(f, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)
    return f.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x

func _slot299(r: Rect2, v: Dictionary, a: float, dead: bool) -> void:
    var uid := int(v["uid"])
    # head breaks out of the card top: no frame, bottom 5 px inside the card
    var ic: Texture2D = tl._icon(uid) if tl != null else null
    if ic != null: draw_texture_rect(ic, Rect2(r.position.x + 2.0, r.position.y - 6.0, 26.0, 26.0), false, Color(1, 1, 1, a) if not dead else Color(0.55, 0.55, 0.55, a))
    var L := r.position.x + 31.0
    var RT := r.end.x - 4.0
    # row 1: bare numbers in their kind hue, "·" between
    var x := L
    var first := true
    for q in _row1(v):
        var t := String(q[1])
        if not first: x += _w5num(self, Vector2(x, r.position.y + 11.0), "·", 9, Color(1, 1, 1, 0.45 * a), false) + 1.0
        var w := TH.font("body_b").get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x
        if x + w > RT: break
        x += _w5num(self, Vector2(x, r.position.y + 11.0), t, 10, Color(TAG_COL3.get(_l4_col(String(q[0])), INK), a)) + 1.0
        first = false
    # row 2: chips, right-aligned (the side away from the head), "+N" at the far left when they do not fit
    var ef := _effects(v)
    var cs := 9.0
    var fit := int(floorf((RT - L + 1.0) / (cs + 1.0)))
    var nshow := mini(ef.size(), fit)
    var more := ef.size() - nshow
    if more > 0:
        nshow = maxi(0, fit - 2)
        more = ef.size() - nshow
    var cx := RT - cs
    for i in nshow:
        _effect_chip(Rect2(cx, r.position.y + 14.0, cs, cs), ef[ef.size() - 1 - i], a)
        cx -= cs + 1.0
    if more > 0: _w5num(self, Vector2(L, r.position.y + 22.0), "+%d" % more, 8, Color(1, 1, 1, 0.9 * a))

func _console299(R: Rect2, v: Dictionary) -> void:
    var foe := int(v["side"]) == 1
    var dead: bool = v.get("down") == true or float(v["hp"]) <= 0.0
    var ci := _pn_layer
    var y := R.position.y
    var dim := Color(MUTE, 0.62)
    # col A: who + HP + cooldown
    var L := R.position.x + 10.0
    var WA := 100.0
    var nm := _fit_txt(str(v.get("name", v.get("id", ""))), 11, WA - 22.0, true)
    var nw := _w5num(ci, Vector2(L, y + 13.0), nm, 11, INK)
    _w5num(ci, Vector2(L + nw + 4.0, y + 13.0), "Lv%d" % int(v.get("level", 1)), 8, dim, false)
    var mx := maxf(1.0, float(v["maxHp"]))
    var hp := clampf(float(v["hp"]), 0.0, mx)
    var arm := maxf(0.0, float(v.get("armor", 0.0)))
    if dead:
        _w5num(ci, Vector2(L, y + 30.0), "ล้มแล้ว", 12, Color(MUTE, 0.8))
    else:
        var hw := _w5num(ci, Vector2(L, y + 30.0), R_num(hp), 14, Color("#b5e08f") if hp / mx > 0.3 else Color("#f0b260"))
        var mw := _w5num(ci, Vector2(L + hw + 2.0, y + 30.0), "/" + R_num(mx), 8, dim, false)
        if arm > 0.0: _w5num(ci, Vector2(L + hw + mw + 6.0, y + 30.0), "+" + R_num(arm), 9, Color(TAG_COL3.get("armhit", INK), 1.0))
    ci.draw_rect(Rect2(L, y + 34.0, WA, 2.0), Color(0.05, 0.06, 0.08, 0.6))
    var sc := WA / maxf(mx, hp + arm)
    ci.draw_rect(Rect2(L, y + 34.0, roundf(hp * sc), 2.0), Color("#7cc455") if hp / mx > 0.3 else Color("#e0973a"))
    if arm > 0.0: ci.draw_rect(Rect2(L + roundf(hp * sc), y + 34.0, roundf(arm * sc), 2.0), Color(0.93, 0.93, 0.9, 0.95))
    var sd: Variant = v.get("stat")
    var cdv := float(sd.get("cd", 0.0)) / 1000.0 if sd is Dictionary else 0.0
    var rem := _cd_rem(v)
    var cw := _w5num(ci, Vector2(L, y + 47.0), "ตีทุก", 8, dim, false)
    _w5num(ci, Vector2(L + cw + 3.0, y + 47.0), "%.1f วิ" % cdv, 9, INK)
    if rem >= 0.0 and not dead:
        var rt := "อีก %.1f" % rem
        var rw := TH.font("body").get_string_size(rt, HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x
        _w5num(ci, Vector2(L + WA - rw, y + 47.0), rt, 8, dim, false)
    var cf := _cd_frac(v)
    ci.draw_rect(Rect2(L, y + 50.0, WA, 1.0), Color(0.05, 0.06, 0.08, 0.6))
    if cf >= 0.0 and not dead: ci.draw_rect(Rect2(L, y + 50.0, WA * cf, 1.0), Color("#8fb8ff") if not foe else Color("#ff8f8f"))
    # col B: the 6 values, word (dim) + number (kind hue); zero = faint "–"
    var L2 := L + WA + 22.0
    var sl := _slots(v)
    for i in sl.size():
        var gx := L2 + float(i % 3) * 40.0
        var gy := y + 18.0 + float(i / 3) * 20.0
        var q: Array = sl[i]
        var kd := String(q[0])
        var ww := _w5num(ci, Vector2(gx, gy), String(L4_VAL.get(kd, kd)), 8, dim, false)
        if bool(q[2]): _w5num(ci, Vector2(gx + ww + 3.0, gy), String(q[1]), 10, Color(TAG_COL3.get(kd, INK), 1.0))
        else: _w5num(ci, Vector2(gx + ww + 3.0, gy), "–", 9, Color(MUTE, 0.28), false)
    # col C: status words that flow and wrap
    var L3 := L2 + 120.0 + 22.0
    var RT3 := R.end.x - 10.0
    var items := []
    for q in _row1(v): items.append([String(L4_NUM.get(q[0], q[0])) + " " + String(q[1]), Color(TAG_COL3.get(_l4_col(String(q[0])), INK), 1.0), 0])
    for e in _effects(v): items.append([_short4(e), W5_BUFF if bool(e[2]) else W5_DEBUFF, 1 if bool(e[2]) else -1])
    if items.is_empty():
        _w5num(ci, Vector2(L3, y + 18.0), "ไม่มีสถานะ", 8, Color(MUTE, 0.4), false)
        return
    var fb: Font = TH.font("body")
    var x := L3
    var line := 0
    for i in items.size():
        var it: Array = items[i]
        var t := String(it[0])
        var w := fb.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, 9).x + (6.0 if int(it[2]) != 0 else 0.0)
        if x + w > RT3 and x > L3:
            line += 1
            x = L3
        if line > 2:
            _w5num(ci, Vector2(RT3 - 34.0, y + 18.0 + 2.0 * 16.0), "+%d อย่าง" % (items.size() - i), 8, dim, false)
            break
        var by := y + 18.0 + float(line) * 16.0
        var c: Color = it[1]
        if int(it[2]) != 0:   # tiny pixel arrow: up = buff, down = debuff
            var tip := Vector2(x + 2.0, by - 7.0) if int(it[2]) > 0 else Vector2(x + 2.0, by - 2.0)
            var d := 1.0 if int(it[2]) > 0 else -1.0
            ci.draw_colored_polygon(PackedVector2Array([tip, tip + Vector2(2.5, 3.5 * d), tip + Vector2(-2.5, 3.5 * d)]), c)
            x += 6.0
        _w5num(ci, Vector2(x, by), t, 9, c, false)
        x += w - (6.0 if int(it[2]) != 0 else 0.0) + 12.0
''')
f.write_text(s, encoding="utf-8", newline="")
print("s299r35w5 ok")
