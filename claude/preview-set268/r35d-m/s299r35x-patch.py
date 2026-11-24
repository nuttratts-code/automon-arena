#!/usr/bin/env python3
# set 299 round 35x (owner, detail panel of layout 4): level text out → stars after the name · "HP" letters green ·
#   "ตีทุก … · อีก …" out → "คูลดาวน์ X วิ" (cd bar kept) · value names coloured by kind (no swatch), the game's own words
#   (พลังโจมตี / มัลติฮิต / ไฟ/ฮิต / ช็อต/ฮิต / เกราะ/ฮิต / ฟื้น/ฮิต) · missing value: same colour, "-". Env S299PN=0 = old. After s299r35w17.
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
f = root / "scripts/ui/s286_team.gd"
s = f.read_text(encoding="utf-8")
def rep(old, new, tag):
    global s
    old, new = T(old), T(new)
    assert s.count(old) == 1, tag
    s = s.replace(old, new)

rep('''    var who := str(v.get("name", v.get("id", ""))) + " · เลเวล %d" % int(v.get("level", 1))
    _dtxt(Vector2(L, y + 12.0), _fit_txt(who, 9, W1, true), 9, ink, true)
''', '''    var who := str(v.get("name", v.get("id", ""))) + " · เลเวล %d" % int(v.get("level", 1))
    if PN299: who = str(v.get("name", v.get("id", "")))   # s299 r35x: level = stars
    var nlv := clampi(int(v.get("level", 1)), 1, 5)
    var stw := (float(nlv) * 7.0 + 2.0) if PN299 else 0.0
    who = _fit_txt(who, 9, W1 - stw, true)
    _dtxt(Vector2(L, y + 12.0), who, 9, ink, true)
    if PN299:
        var sx := L + TH.font("body_b").get_string_size(who, HORIZONTAL_ALIGNMENT_LEFT, -1, 9).x + 5.0
        for i in nlv: _star299(Vector2(sx + float(i) * 7.0, y + 8.5), 3.2)
''', "who")

rep('''    _dtxt(Vector2(L, y + 30.0), ("ล้มแล้ว" if dead else "HP %s/%s" % [R_num(hp), R_num(mx)] + (("  เกราะ " + R_num(arm)) if arm > 0.0 else "")), 9, ink)
''', '''    if PN299 and not dead:   # s299 r35x: "HP" letters green
        _dtxt(Vector2(L, y + 30.0), "HP", 9, Color("#7ee08f"))
        var hw := TH.font("body").get_string_size("HP ", HORIZONTAL_ALIGNMENT_LEFT, -1, 9).x
        _dtxt(Vector2(L + hw, y + 30.0), "%s/%s" % [R_num(hp), R_num(mx)] + (("  เกราะ " + R_num(arm)) if arm > 0.0 else ""), 9, ink)
    else:
        _dtxt(Vector2(L, y + 30.0), ("ล้มแล้ว" if dead else "HP %s/%s" % [R_num(hp), R_num(mx)] + (("  เกราะ " + R_num(arm)) if arm > 0.0 else "")), 9, ink)
''', "hp")

rep('''    _dtxt(Vector2(L, y + 42.0), _fit_txt(("ตีทุก %.1f วิ" % cdv) + ((" · อีก %.1f" % rem) if rem >= 0.0 and not dead else ""), 9, W1), 9, ink)
''', '''    if PN299: _dtxt(Vector2(L, y + 42.0), "คูลดาวน์ %.2f วิ" % cdv, 9, ink)   # s299 r35x: game's own wording
    else: _dtxt(Vector2(L, y + 42.0), _fit_txt(("ตีทุก %.1f วิ" % cdv) + ((" · อีก %.1f" % rem) if rem >= 0.0 and not dead else ""), 9, W1), 9, ink)
''', "cd")

rep('''    var cw2 := 50.0
''', '''    var cw2 := 62.0 if PN299 else 50.0   # r35x: longer game words
''', "cw2")

rep('''        _pn_layer.draw_rect(Rect2(gx, gy + 3.0, 3.0, 8.0), Color(TAG_COL2.get(kd, INK), 1.0 if sl[i][2] else 0.35))
        _dtxt(Vector2(gx + 6.0, gy + 11.0), String(L4_VAL.get(kd, kd)), 8, ink if sl[i][2] else mute)
        _dnum(Vector2(0, gy + 11.0), String(sl[i][1]), 8, ink if sl[i][2] else mute, gx + cw2)
''', '''        if PN299:   # r35x: name coloured by kind, no swatch; missing = same colour + "-"
            _dtxt(Vector2(gx, gy + 11.0), String(PN299_W.get(kd, kd)), 8, TAG_COL3.get(kd, INK))
            _dnum(Vector2(0, gy + 11.0), String(sl[i][1]) if sl[i][2] else "-", 8, ink, gx + cw2)
            continue
        _pn_layer.draw_rect(Rect2(gx, gy + 3.0, 3.0, 8.0), Color(TAG_COL2.get(kd, INK), 1.0 if sl[i][2] else 0.35))
        _dtxt(Vector2(gx + 6.0, gy + 11.0), String(L4_VAL.get(kd, kd)), 8, ink if sl[i][2] else mute)
        _dnum(Vector2(0, gy + 11.0), String(sl[i][1]), 8, ink if sl[i][2] else mute, gx + cw2)
''', "slots")

rep('''const L4_NUM := {"armor": "เกราะ", "burn": "ติดไฟ", "shock": "ติดฟ้า"}
''', '''const L4_NUM := {"armor": "เกราะ", "burn": "ติดไฟ", "shock": "ติดฟ้า"}
var PN299 := OS.get_environment("S299PN") != "0"   # s299 r35x: detail panel clean-up
const PN299_W := {"atk": "พลังโจมตี", "multi": "มัลติฮิต", "burn": "ไฟ/ฮิต", "shock": "ช็อต/ฮิต", "armhit": "เกราะ/ฮิต", "heal": "ฟื้น/ฮิต"}   # game's own words (shop/stat line)

func _star299(c: Vector2, r: float) -> void:   # s299 r35x: level star
    var p := PackedVector2Array()
    for i in 10:
        var ang := -PI * 0.5 + float(i) * PI / 5.0
        var rr := r if i % 2 == 0 else r * 0.45
        p.append(c + Vector2(cos(ang), sin(ang)) * rr)
    _pn_layer.draw_polyline(p + PackedVector2Array([p[0]]), Color(OUT, 0.9), 1.6, true)
    _pn_layer.draw_colored_polygon(p, Color("#ffd34d"))
''', "const")
f.write_text(s, encoding="utf-8", newline="")
print("s299r35x ok")
