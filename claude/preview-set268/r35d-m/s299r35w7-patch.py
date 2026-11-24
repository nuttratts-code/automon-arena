#!/usr/bin/env python3
# set 299 round 35w7 (owner): head picture centred in the card (vertically: the frame sat 1 px low) ·
#   armour / burn / shock on the card = SYMBOL + number (no coloured tag boxes), many variants, big numbers must never overflow.
#   Env S299SYM (E4 only; empty = round 35w6 E-tags):
#     a = row: icon + white number, flows into row 2 when row 1 is full, chips follow after the numbers, "+N" when out of room
#     b = column right of the head: up to 3 lines icon + white number (7 px), chips in a 2-row grid on the right
#     c = like a, number in the kind hue
#     d = like b, number in the kind hue + a faint dark strip behind the column
#   Numbers >= 1000 are shortened: 1.2k · 12k · 123k · 1.2M. Mock: S299BIG=1 = big numbers on every card (3 patterns).
# run after s299r35w6-patch.py:  python -I s299r35w7-patch.py <g286 path>
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
def sub(p, old, new):
    s = p.read_text(encoding="utf-8")
    assert s.count(old) == 1, (p, old[:60])
    p.write_text(s.replace(old, new), encoding="utf-8", newline="")
f = root / "scripts/ui/s286_team.gd"
sub(f, 'var E297 := OS.get_environment("S297E")', 'var SYM299 := OS.get_environment("S299SYM")   # s299 r35w7: symbol + number variants a-d\nvar E297 := OS.get_environment("S297E")')
# head frame centred vertically in E4
sub(f, T('''    if E297 == "4":   # head in a cut-corner square (no diamond)
        var hr := Rect2(c - Vector2(dr, dr), Vector2(dr, dr) * 2.0)
'''), T('''    if E297 == "4":   # head in a cut-corner square (no diamond)
        c = Vector2(r.position.x + r.size.y * 0.5, r.position.y + r.size.y * 0.5)   # r35w7: centred (same margin all round)
        var hr := Rect2(c - Vector2(dr, dr), Vector2(dr, dr) * 2.0)
'''))
# hand the rows over to the variant drawer
sub(f, T('''    var L := r.position.x + 25.0
    var RT := r.end.x - 3.0
    # row 1: armour / burn / shock numbers as E-tags (present only)
'''), T('''    var L := r.position.x + 25.0
    var RT := r.end.x - 3.0
    if E297 == "4" and SYM299 != "":
        _sym299(r, v, a, L, RT)
        return
    # row 1: armour / burn / shock numbers as E-tags (present only)
'''))
# big-number mock
sub(f, T('''func _row1(v: Dictionary) -> Array:   # burn / shock on the unit (numbers)
'''), T('''func _row1(v: Dictionary) -> Array:   # burn / shock on the unit (numbers)
    if OS.get_environment("S299BIG") == "1":   # s299 r35w7 mock: big numbers
        match int(v["uid"]) % 3:
            0: return [["armor", "12345"], ["burn", "987"], ["shock", "45600"]]
            1: return [["burn", "25"], ["shock", "1500000"]]
            _: return [["armor", "1200"], ["shock", "8"]]
'''))
s = f.read_text(encoding="utf-8")
s += T('''

# ---------- s299 r35w7: symbol + number on the E4 cards ----------
static func _k299(t: String) -> String:   # 1.2k · 12k · 123k · 1.2M
    var n := t.to_float()
    if n < 1000.0: return t
    if n < 10000.0: return ("%.1fk" % (n / 1000.0)).replace(".0k", "k")
    if n < 1000000.0: return "%dk" % int(n / 1000.0)
    return ("%.1fM" % (n / 1000000.0)).replace(".0M", "M")

func _symnum299(x: float, y: float, kd: String, t: String, fs: int, isz: float, a: float) -> float:   # icon + number, returns width
    var mf: Font = TH.font("mono")
    _ic_q.append([Rect2(x, y, isz, isz), kd, ICON_COL.get(kd, INK), a])
    var col := Color(1, 1, 1, 0.98 * a) if SYM299 in ["a", "b"] else Color(TAG_COL3.get(_l4_col(kd), INK), a)
    var tx := x + isz + 1.0
    var by := y + isz * 0.5 + float(fs) * 0.36
    draw_string_outline(mf, Vector2(tx, by), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 3, Color(0.04, 0.05, 0.07, 0.85 * a))
    draw_string(mf, Vector2(tx, by), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)
    return isz + 1.0 + mf.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x

func _chips299(ef: Array, x: float, y: float, RT: float, cs: float, a: float) -> void:   # one line of chips from x, "+N" at the end
    var mf: Font = TH.font("mono")
    var fit := int(floorf((RT - x + 1.0) / (cs + 1.0)))
    var nshow := mini(ef.size(), fit)
    if ef.size() > fit: nshow = maxi(0, fit - 1)
    for i in nshow:
        _effect_chip(Rect2(x, y, cs, cs), ef[i], a)
        x += cs + 1.0
    if ef.size() > nshow:
        var t2 := "+%d" % (ef.size() - nshow)
        draw_string_outline(mf, Vector2(x, y + cs - 2.0), t2, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, 3, Color(0.04, 0.05, 0.07, 0.85 * a))
        draw_string(mf, Vector2(x, y + cs - 2.0), t2, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color(1, 1, 1, 0.95 * a))

func _sym299(r: Rect2, v: Dictionary, a: float, L: float, RT: float) -> void:
    var mf: Font = TH.font("mono")
    var nums := []
    for q in _row1(v): nums.append([String(q[0]), _k299(String(q[1]))])
    var ef := _effects(v)
    if SYM299 in ["a", "c"]:   # flowing rows
        var fs := 8
        var isz := 8.0
        var ys := [r.position.y + 3.0, r.position.y + 14.5]
        var line := 0
        var x := L
        for n in nums:
            var w := isz + 1.0 + mf.get_string_size(String(n[1]), HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
            if x + w > RT and x > L:
                line += 1
                x = L
            if line > 1: break
            x += _symnum299(x, ys[line], String(n[0]), String(n[1]), fs, isz, a) + 3.0
        if line == 0: x = L   # chips own row 2
        else: x += 1.0
        if line <= 1: _chips299(ef, x, ys[1], RT, 9.0, a)
    else:   # b / d: column right of the head, chips grid on the right
        var fs := 7
        var isz := 7.0
        var cw := 0.0
        for n in nums: cw = maxf(cw, isz + 1.0 + mf.get_string_size(String(n[1]), HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x)
        if SYM299 == "d" and nums.size() > 0:
            draw_rect(Rect2(L - 2.0, r.position.y + 2.0, cw + 4.0, r.size.y - 4.0), Color(0.03, 0.05, 0.07, 0.35 * a))
        var y := r.position.y + 1.5 + (3.0 - float(nums.size())) * 4.0
        for n in nums:
            _symnum299(L, y, String(n[0]), String(n[1]), fs, isz, a)
            y += 8.0
        var cx := L + cw + 4.0 if nums.size() > 0 else L
        var cs := 9.0
        var per := maxi(1, int(floorf((RT - cx + 1.0) / (cs + 1.0))))
        var cap := per * 2
        var nshow := mini(ef.size(), cap)
        if ef.size() > cap: nshow = cap - 1
        for i in nshow:
            _effect_chip(Rect2(cx + float(i % per) * (cs + 1.0), r.position.y + 3.0 + float(i / per) * (cs + 2.0), cs, cs), ef[i], a)
        if ef.size() > nshow:
            var pp := Vector2(cx + float(nshow % per) * (cs + 1.0), r.position.y + 3.0 + float(nshow / per) * (cs + 2.0) + cs - 2.0)
            var t2 := "+%d" % (ef.size() - nshow)
            draw_string_outline(mf, pp, t2, HORIZONTAL_ALIGNMENT_LEFT, -1, 7, 3, Color(0.04, 0.05, 0.07, 0.85 * a))
            draw_string(mf, pp, t2, HORIZONTAL_ALIGNMENT_LEFT, -1, 7, Color(1, 1, 1, 0.95 * a))
''')
f.write_text(s, encoding="utf-8", newline="")
print("s299r35w7 ok")
