# set 293 round 35s (sample, after s287e): (1) zero slots = empty recessed socket, no icon / "–"
# (2) tap anywhere on a card (or the unit) = large unit-detail panel, Thai text, fight keeps running;
#     per-slot / chip tooltips off (slots ~35x25 px < 44 px rule). Env S293TIPS=1 = old tooltips back.
# usage: python -I s293r35s-patch.py <g286 path>
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")

def rep(old, new, n=1):
    global s
    old = old.replace("    ", "\t"); new = new.replace("    ", "\t")
    assert s.count(old) == n, (s.count(old), old[:80])
    s = s.replace(old, new)

# (1) socket instead of dim icon + "–"
rep("""        _chip(Vector2(gx, r.position.y + 3.5 + float(k / 2) * 11.5), sl[k][0], sl[k][1], a * (1.0 if sl[k][2] else 0.28), false)
    if not hv.is_empty():
        var lines := PackedStringArray()
        for it in hv: lines.append("%s %s" % [VAL_NAME.get(it[0], it[0]), it[1]])
        _tips.append([r, " · ".join(lines)])
""", """        var sy := r.position.y + 3.5 + float(k / 2) * 11.5
        if sl[k][2] or OS.get_environment("S293DIM") == "1":
            _chip(Vector2(gx, sy), sl[k][0], sl[k][1], a * (1.0 if sl[k][2] else 0.28), false)
        else:   # s293 (owner pick 1): empty recessed socket, no icon, no "–"
            _socket(Rect2(gx - 1.0, sy - 0.5, (_c1w287 if k % 2 == 0 else _c2w287) + 1.0, ISZ), a)
""")
rep("""const EF_SZ := 11.0
""", """func _socket(r: Rect2, a: float) -> void:   # s293: engraved empty slot (darker inset, shadow on top, light lip below)
    var rr := Rect2(roundf(r.position.x), roundf(r.position.y), roundf(r.size.x), roundf(r.size.y))
    _soft_rect(rr, Color(0.02, 0.03, 0.04, 0.42 * a))
    draw_rect(Rect2(rr.position.x + 1.0, rr.position.y, rr.size.x - 2.0, 1.0), Color(0.0, 0.0, 0.0, 0.38 * a))
    draw_rect(Rect2(rr.position.x + 1.0, rr.end.y - 1.0, rr.size.x - 2.0, 1.0), Color(0.85, 0.92, 1.0, 0.10 * a))

const EF_SZ := 11.0
""")

# (2) tooltips off unless S293TIPS=1
rep("""func _draw_tip() -> void:   # r35l: hover (PC) or a tapped chip (touch, 2.5 s)
""", """func _draw_tip() -> void:   # r35l: hover (PC) or a tapped chip (touch, 2.5 s)
    if OS.get_environment("S293TIPS") != "1": return   # s293: replaced by the unit-detail panel
""")
rep("""    for i in range(_tips.size() - 1, -1, -1):   # r35l: a chip / a \\"+N\\" card tap shows its detail
        var tr: Rect2 = _tips[i][0]
        if tr.has_point(p) and not _rects.values().has(tr):
""", """    if picked >= 0 and _det_r.has_point(p):   # s293: tap the detail panel = close it
        _pick(picked)
        get_viewport().set_input_as_handled()
        return
    for i in range(_tips.size() - 1, -1, -1):   # r35l: a chip / a \\"+N\\" card tap shows its detail
        var tr: Rect2 = _tips[i][0]
        if OS.get_environment("S293TIPS") == "1" and tr.has_point(p) and not _rects.values().has(tr):
""")
# chips above a card belong to the card for taps (whole card area incl. its chips)
rep("""    for uid in _rects:
        if (_rects[uid] as Rect2).has_point(p):
""", """    for uid in _rects:
        if (_rects[uid] as Rect2).grow_individual(0, 26, 0, 26).has_point(p):   # s293: card + its chip rows
""")

# panel draw hook
rep("""func _draw_panels() -> void:
    _cv287 = _pn_layer
    for pq in _panel_q: _panel(pq[0], pq[1])
    _cv287 = null
""", """func _draw_panels() -> void:
    _cv287 = _pn_layer
    for pq in _panel_q: _panel(pq[0], pq[1])
    _det_r = Rect2()
    if picked >= 0 and view != null and view.units.has(picked) and OS.get_environment("S287CARDS") != "0":
        _detail(view.units[picked])
    _cv287 = null

# ---------- s293 (owner pick 2 / Gemini G3): unit-detail panel, opened by tapping a card or the unit ----------
const DW := 232.0
const DPAD := 10.0
const DROW := 17.0
var _det_r := Rect2()

func _dtxt(p: Vector2, t: String, fs: int, col: Color, bold := false, right := -1.0) -> void:
    var f: Font = TH.font("body_b" if bold else "body")
    var x := p.x
    if right > 0.0: x = right - f.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
    _pn_layer.draw_string(f, Vector2(x, p.y), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)

func _dnum(p: Vector2, t: String, fs: int, col: Color, right: float) -> void:
    var f: Font = TH.font("mono")
    _pn_layer.draw_string(f, Vector2(right - f.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x, p.y), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)

func _dicon(c: Vector2, key: String, sz: float, a := 1.0, col: Variant = null) -> void:
    var r := Rect2(c - Vector2(sz, sz) * 0.5, Vector2(sz, sz))
    var o := icon_tex(key + "_o")
    var f := icon_tex(key)
    if o != null: _pn_layer.draw_texture_rect(o, r, false, Color(OUT, OUT.a * a))
    if f != null: _pn_layer.draw_texture_rect(f, r, false, Color(col if col != null else ICON_COL.get(key, INK), a))

func _detail(v: Dictionary) -> void:
    var uid := int(v["uid"])
    var foe := int(v["side"]) == 1
    var dead: bool = v.get("down") == true or float(v["hp"]) <= 0.0
    var sl := _slots(v)
    var st := _row1(v)
    var ef := _effects(v)
    var nstat := st.size() + ef.size()
    var h := DPAD + 34.0 + 8.0 + 30.0 + 26.0 + 8.0 + 16.0 + 6.0 * DROW + 8.0 + 16.0 + float(maxi(nstat, 1)) * DROW + DPAD - 4.0
    var x := PAD_L
    var y := 0.0
    var cr: Rect2 = _rects.get(uid, Rect2())
    if foe:
        x = size.x - 16.0 - DW
        y = (cr.end.y if cr.size.y > 0.0 else 48.0) + 30.0
    else:
        y = (cr.position.y if cr.size.y > 0.0 else size.y - 50.0) - 30.0 - h
    y = clampf(y, 6.0, size.y - h - 6.0)
    var R := Rect2(x, y, DW, h)
    _det_r = R
    var side_col: Color = FOE_COL if foe else OWN_COL
    var sb := StyleBoxFlat.new()
    sb.bg_color = Color(0.065, 0.075, 0.09, 0.95)
    sb.set_corner_radius_all(3)
    sb.border_color = Color(1, 1, 1, 0.22)
    sb.set_border_width_all(1)
    _pn_layer.draw_style_box(sb, R)
    _pn_layer.draw_rect(Rect2(R.position.x + 1.0, R.position.y + 1.0, R.size.x - 2.0, 2.0), Color(side_col, 0.9))   # side colour line
    var L := R.position.x + DPAD
    var RT := R.end.x - DPAD
    var cy := R.position.y + DPAD
    # header: icon diamond + name + level / side
    var c := Vector2(L + 15.0, cy + 15.0)
    var dr := 15.0
    var dia := PackedVector2Array([c + Vector2(0, -dr), c + Vector2(dr, 0), c + Vector2(0, dr), c + Vector2(-dr, 0)])
    _pn_layer.draw_colored_polygon(dia, Color(0.08, 0.12, 0.16, 0.9))
    var ic: Texture2D = tl._icon(uid) if tl != null else null
    if ic != null: _pn_layer.draw_texture_rect(ic, Rect2(c - Vector2(dr, dr) * 1.15, Vector2(dr, dr) * 2.3), false)
    _pn_layer.draw_polyline(dia + PackedVector2Array([dia[0]]), Color(side_col, 0.95), 1.5)
    _dtxt(Vector2(L + 38.0, cy + 13.0), str(v.get("name", v.get("id", ""))), 14, INK, true)
    _dtxt(Vector2(L + 38.0, cy + 29.0), ("ฝั่งศัตรู" if foe else "ฝั่งเรา") + " · เลเวล %d" % int(v.get("level", 1)) + (" · ล้มแล้ว" if dead else ""), 10, MUTE)
    _pn_layer.draw_string(TH.font("body"), Vector2(RT - 8.0, cy + 9.0), "✕", HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(MUTE, 0.7))
    cy += 34.0 + 8.0
    # HP (+ armour) bar
    var mx := maxf(1.0, float(v["maxHp"]))
    var hp := clampf(float(v["hp"]), 0.0, mx)
    var arm := maxf(0.0, float(v.get("armor", 0.0)))
    _dtxt(Vector2(L, cy + 10.0), "พลังชีวิต", 11, INK)
    _dtxt(Vector2(0, cy + 10.0), "%s / %s" % [R_num(hp), R_num(mx)] + (("  + เกราะ " + R_num(arm)) if arm > 0.0 else ""), 11, INK, false, RT)
    var bw := RT - L
    var by := cy + 15.0
    _pn_layer.draw_rect(Rect2(L, by, bw, 6.0), Color(0.12, 0.11, 0.09, 0.9))
    var sc := bw / maxf(mx, hp + arm)
    _pn_layer.draw_rect(Rect2(L, by, roundf(hp * sc), 6.0), Color("#5e9a45") if hp / mx > 0.3 else Color("#bf8530"))
    if arm > 0.0: _pn_layer.draw_rect(Rect2(L + roundf(hp * sc), by, roundf(arm * sc), 6.0), Color(0.93, 0.93, 0.9, 0.95))
    cy += 30.0
    # cooldown
    var sd: Variant = v.get("stat")
    var cdv := float(sd.get("cd", 0.0)) / 1000.0 if sd is Dictionary else 0.0
    var rem := _cd_rem(v)
    _dtxt(Vector2(L, cy + 10.0), "ตีทุก", 11, INK)
    _dtxt(Vector2(0, cy + 10.0), ("%.1f วิ" % cdv) + (("  · อีก %.1f วิ" % rem) if rem >= 0.0 and not dead else ""), 11, INK, false, RT)
    var cf := _cd_frac(v)
    _pn_layer.draw_rect(Rect2(L, cy + 15.0, bw, 3.0), Color(0.12, 0.11, 0.09, 0.9))
    if cf >= 0.0 and not dead: _pn_layer.draw_rect(Rect2(L, cy + 15.0, bw * cf, 3.0), Color("#4f7fc4") if not foe else Color("#c0564f"))
    cy += 26.0 + 8.0
    # the 6 card values, one roomy row each; zero = dim "ไม่มี"
    _dtxt(Vector2(L, cy + 10.0), "ค่าประจำตัว", 10, Color(MUTE, 0.75), true)
    cy += 16.0
    for k in sl.size():
        var on: bool = sl[k][2]
        var aa := 1.0 if on else 0.38
        _dicon(Vector2(L + 6.0, cy + 7.0), String(sl[k][0]), 12.0, aa)
        _dtxt(Vector2(L + 18.0, cy + 11.0), String(VAL_NAME.get(sl[k][0], sl[k][0])), 11, Color(INK, aa))
        if on: _dnum(Vector2(0, cy + 11.0), String(sl[k][1]), 11, INK, RT)
        else: _dtxt(Vector2(0, cy + 11.0), "ไม่มี", 10, Color(MUTE, 0.5), false, RT)
        cy += DROW
    cy += 8.0
    # what is on the unit now: armour / burn / shock numbers + every buff / debuff in words
    _pn_layer.draw_rect(Rect2(L, cy - 4.0, bw, 1.0), Color(1, 1, 1, 0.08))
    _dtxt(Vector2(L, cy + 10.0), "สถานะตอนนี้", 10, Color(MUTE, 0.75), true)
    cy += 16.0
    if nstat == 0:
        _dtxt(Vector2(L + 18.0, cy + 11.0), "ไม่มี", 11, Color(MUTE, 0.5))
    for it in st:
        _dicon(Vector2(L + 6.0, cy + 7.0), String(it[0]), 12.0)
        _dtxt(Vector2(L + 18.0, cy + 11.0), {"armor": "เกราะ", "burn": "ติดไฟ", "shock": "ติดสายฟ้า"}.get(it[0], it[0]), 11, INK)
        _dnum(Vector2(0, cy + 11.0), String(it[1]), 11, INK, RT)
        cy += DROW
    for e in ef:
        var er := Rect2(L, cy + 1.0, 12.0, 12.0)
        var eb := StyleBoxFlat.new()
        eb.bg_color = Color("#2f6db5", 0.92) if e[2] else Color("#b8343a", 0.92)
        eb.set_corner_radius_all(2)
        _pn_layer.draw_style_box(eb, er)
        _dicon(er.get_center(), String(e[1]), 10.0, 1.0, Color(1, 1, 1))
        _dtxt(Vector2(L + 18.0, cy + 11.0), String(e[4]), 11, INK)
        cy += DROW
""")

# hover-only small panel (s287d) stays off while cards are on; nothing else to change
p.write_text(s, encoding="utf-8")
print("s293r35s patched", p)
