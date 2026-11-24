# set 293 round 35s3 (sample, after s293r35s2): owner "keep it on top, but it looks pasted on — make it blend".
# Panel = a drop-down band of the top HUD: edges line up with the clock (left) and the foe card row (right),
# same plate as the cards (see-through slate, thin card line), shorter (3 rows: values 2x3 grid, status 2 columns),
# fades + slides down 0.16 s on open. Env S293FIX=1 = round 35s2 box.
# usage: python -I s293r35s3-patch.py <g286 path>
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")

def rep(old, new, n=1):
    global s
    old = old.replace("    ", "\t"); new = new.replace("    ", "\t")
    assert s.count(old) == n, (s.count(old), old[:80])
    s = s.replace(old, new)

rep("""        _detail2(view.units[picked])
""", """        if OS.get_environment("S293FIX") == "1": _detail2(view.units[picked])
        else: _detail3(view.units[picked])
""")
rep("""func _pick(uid: int) -> void:
    picked = -1 if picked == uid else uid
""", """func _pick(uid: int) -> void:
    picked = -1 if picked == uid else uid
    _det_t0 = Time.get_ticks_msec() / 1000.0   # s293 r35s3: open animation restarts on every pick
""")
rep("""func _detail2(v: Dictionary) -> void:""", """var _det_t0 := -10.0
const D3Y := 80.0
const D3ROW := 16.0

func _detail3(v: Dictionary) -> void:   # s293 r35s3: drop-down band of the top HUD
    var uid := int(v["uid"])
    var foe := int(v["side"]) == 1
    var dead: bool = v.get("down") == true or float(v["hp"]) <= 0.0
    var sl := _slots(v)
    var st := _row1(v)
    var ef := _effects(v)
    var k := clampf((Time.get_ticks_msec() / 1000.0 - _det_t0) / 0.16, 0.0, 1.0)
    k = 1.0 - (1.0 - k) * (1.0 - k)   # ease out
    var a := k
    var x0 := 16.0
    var x1 := size.x - 16.0
    var h := 8.0 + 14.0 + 3.0 * D3ROW + 6.0
    var R := Rect2(x0, roundf(D3Y - 6.0 * (1.0 - k)), x1 - x0, h)
    _det_r = R
    var side_col: Color = FOE_COL if foe else OWN_COL
    var sb := StyleBoxFlat.new()
    sb.bg_color = Color("#16202a", 0.80 * a)   # same slate as the cards, a bit denser for text
    sb.set_corner_radius_all(3)
    sb.border_color = Color(LINE, LINE.a * a)
    sb.set_border_width_all(1)
    _pn_layer.draw_style_box(sb, R)
    _pn_layer.draw_rect(Rect2(R.position.x + 3.0, R.position.y, R.size.x - 6.0, 1.0), Color(side_col, 0.85 * a))
    var ink := Color(INK, a)
    var mute := Color(MUTE, 0.72 * a)
    var cy := R.position.y + 8.0
    # block 1: who + HP + cooldown (width 200)
    var L := R.position.x + 10.0
    var RT := L + 200.0
    var c := Vector2(L + 12.0, cy + 12.0)
    var dr := 12.0
    var dia := PackedVector2Array([c + Vector2(0, -dr), c + Vector2(dr, 0), c + Vector2(0, dr), c + Vector2(-dr, 0)])
    _pn_layer.draw_colored_polygon(dia, Color(0.08, 0.12, 0.16, 0.9 * a))
    var ic: Texture2D = tl._icon(uid) if tl != null else null
    if ic != null: _pn_layer.draw_texture_rect(ic, Rect2(c - Vector2(dr, dr) * 1.15, Vector2(dr, dr) * 2.3), false, Color(1, 1, 1, a))
    _pn_layer.draw_polyline(dia + PackedVector2Array([dia[0]]), Color(side_col, 0.95 * a), 1.5)
    _dtxt(Vector2(L + 30.0, cy + 10.0), str(v.get("name", v.get("id", ""))), 13, ink, true)
    _dtxt(Vector2(L + 30.0, cy + 24.0), ("ฝั่งศัตรู" if foe else "ฝั่งเรา") + " · เลเวล %d" % int(v.get("level", 1)) + (" · ล้มแล้ว" if dead else ""), 10, mute)
    var mx := maxf(1.0, float(v["maxHp"]))
    var hp := clampf(float(v["hp"]), 0.0, mx)
    var arm := maxf(0.0, float(v.get("armor", 0.0)))
    var by := cy + 34.0
    _dtxt(Vector2(L, by + 9.0), "พลังชีวิต", 10, ink)
    _dtxt(Vector2(0, by + 9.0), "%s / %s" % [R_num(hp), R_num(mx)] + (("  + เกราะ " + R_num(arm)) if arm > 0.0 else ""), 10, ink, false, RT)
    var bw := RT - L
    _pn_layer.draw_rect(Rect2(L, by + 12.0, bw, 4.0), Color(0.09, 0.08, 0.06, 0.65 * a))
    var sc := bw / maxf(mx, hp + arm)
    _pn_layer.draw_rect(Rect2(L, by + 12.0, roundf(hp * sc), 4.0), Color("#5e9a45", a) if hp / mx > 0.3 else Color("#bf8530", a))
    if arm > 0.0: _pn_layer.draw_rect(Rect2(L + roundf(hp * sc), by + 12.0, roundf(arm * sc), 4.0), Color(0.93, 0.93, 0.9, 0.95 * a))
    var sd: Variant = v.get("stat")
    var cdv := float(sd.get("cd", 0.0)) / 1000.0 if sd is Dictionary else 0.0
    var rem := _cd_rem(v)
    var cyy := by + 18.0
    _dtxt(Vector2(L, cyy + 9.0), "ตีทุก", 10, ink)
    _dtxt(Vector2(0, cyy + 9.0), ("%.1f วิ" % cdv) + (("  · อีก %.1f วิ" % rem) if rem >= 0.0 and not dead else ""), 10, ink, false, RT)
    var cf := _cd_frac(v)
    _pn_layer.draw_rect(Rect2(L, cyy + 12.0, bw, 2.0), Color(0.09, 0.08, 0.06, 0.6 * a))
    if cf >= 0.0 and not dead: _pn_layer.draw_rect(Rect2(L, cyy + 12.0, bw * cf, 2.0), Color(Color("#4f7fc4") if not foe else Color("#c0564f"), a))
    # block 2: the 6 card values as the card's own 3 x 2 grid, with words
    var L2 := RT + 18.0
    var cw2 := 112.0
    _pn_layer.draw_rect(Rect2(L2 - 9.0, R.position.y + 8.0, 1.0, h - 16.0), Color(1, 1, 1, 0.07 * a))
    _dtxt(Vector2(L2, cy + 9.0), "ค่าประจำตัว", 9, mute, true)
    for i in sl.size():
        var gx := L2 + (0.0 if i % 2 == 0 else cw2 + 8.0)
        var gy := cy + 14.0 + float(i / 2) * D3ROW
        _dicon(Vector2(gx + 5.0, gy + 6.0), String(sl[i][0]), 10.0, a)
        _dtxt(Vector2(gx + 14.0, gy + 10.0), String(VAL_NAME.get(sl[i][0], sl[i][0])), 10, ink)
        _dnum(Vector2(0, gy + 10.0), String(sl[i][1]), 10, ink, gx + cw2)
    # block 3: what is on the unit now, 2 columns x 3 rows (more = "+N")
    var L3 := L2 + cw2 * 2.0 + 8.0 + 18.0
    var R3 := R.end.x - 10.0
    var cw3 := (R3 - L3 - 8.0) * 0.5
    _pn_layer.draw_rect(Rect2(L3 - 9.0, R.position.y + 8.0, 1.0, h - 16.0), Color(1, 1, 1, 0.07 * a))
    _dtxt(Vector2(L3, cy + 9.0), "สถานะตอนนี้", 9, mute, true)
    var items := []
    for it in st: items.append(["n", it])
    for e in ef: items.append(["e", e])
    if items.is_empty(): _dtxt(Vector2(L3, cy + 24.0), "–", 10, ink)
    var cap := 6 if items.size() <= 6 else 5
    for i in mini(items.size(), cap):
        var gx := L3 + (0.0 if i % 2 == 0 else cw3 + 8.0)
        var gy := cy + 14.0 + float(i / 2) * D3ROW
        var it: Array = items[i]
        if it[0] == "n":
            var q: Array = it[1]
            _dicon(Vector2(gx + 5.0, gy + 6.0), String(q[0]), 10.0, a)
            _dtxt(Vector2(gx + 14.0, gy + 10.0), String({"armor": "เกราะ", "burn": "ติดไฟ", "shock": "ติดสายฟ้า"}.get(q[0], q[0])) + " " + String(q[1]), 10, ink)
        else:
            var e: Array = it[1]
            var er := Rect2(gx, gy + 1.0, 11.0, 11.0)
            var eb := StyleBoxFlat.new()
            eb.bg_color = Color("#2f6db5", 0.92 * a) if e[2] else Color("#b8343a", 0.92 * a)
            eb.set_corner_radius_all(2)
            _pn_layer.draw_style_box(eb, er)
            _dicon(er.get_center(), String(e[1]), 9.0, a, Color(1, 1, 1))
            _dtxt(Vector2(gx + 14.0, gy + 10.0), String(e[4]), 10, ink)
    if items.size() > cap:
        _dtxt(Vector2(L3 + cw3 + 8.0, cy + 14.0 + 2.0 * D3ROW + 10.0), "+%d อย่าง" % (items.size() - cap), 10, mute)

func _detail2(v: Dictionary) -> void:""")
p.write_text(s, encoding="utf-8")
print("s293r35s3 patched", p)
