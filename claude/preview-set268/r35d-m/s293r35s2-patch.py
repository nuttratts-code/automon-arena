# set 293 round 35s2 (sample, after s293r35s): owner after R35s —
# (a) detail panel must not cover units: one FIXED place in the empty strip above the units' heads (wide + short, 3 columns)
# (b) zero slots: no socket; normal icon (full brightness) + "–" (panel rows too). Env S293DIM=1 = note-63 dim style.
# usage: python -I s293r35s2-patch.py <g286 path>
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")

def rep(old, new, n=1):
    global s
    old = old.replace("    ", "\t"); new = new.replace("    ", "\t")
    assert s.count(old) == n, (s.count(old), old[:80])
    s = s.replace(old, new)

# (b) zero slot = normal chip with "–"
rep("""        if sl[k][2] or OS.get_environment("S293DIM") == "1":
            _chip(Vector2(gx, sy), sl[k][0], sl[k][1], a * (1.0 if sl[k][2] else 0.28), false)
        else:   # s293 (owner pick 1): empty recessed socket, no icon, no "–"
            _socket(Rect2(gx - 1.0, sy - 0.5, (_c1w287 if k % 2 == 0 else _c2w287) + 1.0, ISZ), a)
""", """        # s293 r35s2 (owner): zero = the normal icon + "–" (no socket, no dim); S293DIM=1 = note-63 dim
        _chip(Vector2(gx, sy), sl[k][0], sl[k][1], a * (0.28 if OS.get_environment("S293DIM") == "1" and not sl[k][2] else 1.0), false)
""")

# (a) fixed wide panel above the heads
rep("""        _detail(view.units[picked])
""", """        _detail2(view.units[picked])
""")
rep("""func _detail(v: Dictionary) -> void:
""", """const D2W := 600.0
const D2Y := 86.0
const D2C1 := 190.0   # column 1: who + HP + cooldown
const D2C2 := 168.0   # column 2: the 6 card values
const D2GAP := 14.0

func _detail2(v: Dictionary) -> void:   # s293 r35s2: one fixed place in the empty strip above the heads, 3 columns
    var uid := int(v["uid"])
    var foe := int(v["side"]) == 1
    var dead: bool = v.get("down") == true or float(v["hp"]) <= 0.0
    var sl := _slots(v)
    var st := _row1(v)
    var ef := _effects(v)
    var nstat := st.size() + ef.size()
    var srow := minf(DROW, 6.0 * DROW / maxf(1.0, float(nstat)))
    var sfs := 11 if nstat <= 6 else 10
    var h := DPAD + 16.0 + 6.0 * DROW + DPAD - 2.0
    var R := Rect2(roundf((size.x - D2W) * 0.5), D2Y, D2W, h)
    _det_r = R
    var side_col: Color = FOE_COL if foe else OWN_COL
    var sb := StyleBoxFlat.new()
    sb.bg_color = Color(0.065, 0.075, 0.09, 0.95)
    sb.set_corner_radius_all(3)
    sb.border_color = Color(1, 1, 1, 0.22)
    sb.set_border_width_all(1)
    _pn_layer.draw_style_box(sb, R)
    _pn_layer.draw_rect(Rect2(R.position.x + 1.0, R.position.y + 1.0, R.size.x - 2.0, 2.0), Color(side_col, 0.9))
    _pn_layer.draw_string(TH.font("body"), Vector2(R.end.x - 16.0, R.position.y + 16.0), "✕", HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(MUTE, 0.7))
    # column 1: icon + name + side / level, HP bar, cooldown bar
    var L := R.position.x + DPAD
    var RT := L + D2C1
    var cy := R.position.y + DPAD
    var c := Vector2(L + 15.0, cy + 15.0)
    var dr := 15.0
    var dia := PackedVector2Array([c + Vector2(0, -dr), c + Vector2(dr, 0), c + Vector2(0, dr), c + Vector2(-dr, 0)])
    _pn_layer.draw_colored_polygon(dia, Color(0.08, 0.12, 0.16, 0.9))
    var ic: Texture2D = tl._icon(uid) if tl != null else null
    if ic != null: _pn_layer.draw_texture_rect(ic, Rect2(c - Vector2(dr, dr) * 1.15, Vector2(dr, dr) * 2.3), false)
    _pn_layer.draw_polyline(dia + PackedVector2Array([dia[0]]), Color(side_col, 0.95), 1.5)
    _dtxt(Vector2(L + 38.0, cy + 13.0), str(v.get("name", v.get("id", ""))), 14, INK, true)
    _dtxt(Vector2(L + 38.0, cy + 29.0), ("ฝั่งศัตรู" if foe else "ฝั่งเรา") + " · เลเวล %d" % int(v.get("level", 1)) + (" · ล้มแล้ว" if dead else ""), 10, MUTE)
    cy += 44.0
    var mx := maxf(1.0, float(v["maxHp"]))
    var hp := clampf(float(v["hp"]), 0.0, mx)
    var arm := maxf(0.0, float(v.get("armor", 0.0)))
    _dtxt(Vector2(L, cy + 10.0), "พลังชีวิต", 11, INK)
    _dtxt(Vector2(0, cy + 10.0), "%s / %s" % [R_num(hp), R_num(mx)] + (("  + เกราะ " + R_num(arm)) if arm > 0.0 else ""), 11, INK, false, RT)
    var bw := RT - L
    _pn_layer.draw_rect(Rect2(L, cy + 15.0, bw, 6.0), Color(0.12, 0.11, 0.09, 0.9))
    var sc := bw / maxf(mx, hp + arm)
    _pn_layer.draw_rect(Rect2(L, cy + 15.0, roundf(hp * sc), 6.0), Color("#5e9a45") if hp / mx > 0.3 else Color("#bf8530"))
    if arm > 0.0: _pn_layer.draw_rect(Rect2(L + roundf(hp * sc), cy + 15.0, roundf(arm * sc), 6.0), Color(0.93, 0.93, 0.9, 0.95))
    cy += 32.0
    var sd: Variant = v.get("stat")
    var cdv := float(sd.get("cd", 0.0)) / 1000.0 if sd is Dictionary else 0.0
    var rem := _cd_rem(v)
    _dtxt(Vector2(L, cy + 10.0), "ตีทุก", 11, INK)
    _dtxt(Vector2(0, cy + 10.0), ("%.1f วิ" % cdv) + (("  · อีก %.1f วิ" % rem) if rem >= 0.0 and not dead else ""), 11, INK, false, RT)
    var cf := _cd_frac(v)
    _pn_layer.draw_rect(Rect2(L, cy + 15.0, bw, 3.0), Color(0.12, 0.11, 0.09, 0.9))
    if cf >= 0.0 and not dead: _pn_layer.draw_rect(Rect2(L, cy + 15.0, bw * cf, 3.0), Color("#4f7fc4") if not foe else Color("#c0564f"))
    # column 2: the 6 card values (zero = normal icon + "–", like the card)
    var L2 := RT + D2GAP
    _pn_layer.draw_rect(Rect2(L2 - D2GAP * 0.5, R.position.y + DPAD, 1.0, h - DPAD * 2.0), Color(1, 1, 1, 0.08))
    var R2 := L2 + D2C2
    cy = R.position.y + DPAD
    _dtxt(Vector2(L2, cy + 10.0), "ค่าประจำตัว", 10, Color(MUTE, 0.75), true)
    cy += 16.0
    for k in sl.size():
        _dicon(Vector2(L2 + 6.0, cy + 7.0), String(sl[k][0]), 12.0)
        _dtxt(Vector2(L2 + 18.0, cy + 11.0), String(VAL_NAME.get(sl[k][0], sl[k][0])), 11, INK)
        _dnum(Vector2(0, cy + 11.0), String(sl[k][1]), 11, INK, R2)
        cy += DROW
    # column 3: what is on the unit now
    var L3 := R2 + D2GAP
    _pn_layer.draw_rect(Rect2(L3 - D2GAP * 0.5, R.position.y + DPAD, 1.0, h - DPAD * 2.0), Color(1, 1, 1, 0.08))
    var R3 := R.end.x - DPAD
    cy = R.position.y + DPAD
    _dtxt(Vector2(L3, cy + 10.0), "สถานะตอนนี้", 10, Color(MUTE, 0.75), true)
    cy += 16.0
    if nstat == 0: _dtxt(Vector2(L3, cy + 11.0), "–", 11, MUTE)
    for it in st:
        _dicon(Vector2(L3 + 6.0, cy + 7.0), String(it[0]), 12.0)
        _dtxt(Vector2(L3 + 18.0, cy + 11.0), {"armor": "เกราะ", "burn": "ติดไฟ", "shock": "ติดสายฟ้า"}.get(it[0], it[0]), sfs, INK)
        _dnum(Vector2(0, cy + 11.0), String(it[1]), sfs, INK, R3)
        cy += srow
    for e in ef:
        var er := Rect2(L3, cy + 1.0, 12.0, 12.0)
        var eb := StyleBoxFlat.new()
        eb.bg_color = Color("#2f6db5", 0.92) if e[2] else Color("#b8343a", 0.92)
        eb.set_corner_radius_all(2)
        _pn_layer.draw_style_box(eb, er)
        _dicon(er.get_center(), String(e[1]), 10.0, 1.0, Color(1, 1, 1))
        _dtxt(Vector2(L3 + 18.0, cy + 11.0), String(e[4]), sfs, INK)
        cy += srow

func _detail(v: Dictionary) -> void:
""")
p.write_text(s, encoding="utf-8")
print("s293r35s2 patched", p)
