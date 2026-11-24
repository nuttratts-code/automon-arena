#!/usr/bin/env python3
# set 299 round 35w10 (owner: "make many mark styles, let me see"): chips = cut-corner shape (top-left + bottom-right, our motif)
#   + bigger centre icon (pad 0.4) + mark style picked by env S299MK:
#   empty/0 = old "+"/"−" (rounded chip, pad 1.5) · 1 folded corner (up = top-right tab, down = bottom-left tab, the uncut corners)
#   2 small chevron ^ / v top-right · 3 edge bar (top = up, bottom = down) · 4 solid triangle top-right
#   5 lit cut edge (up = top-left cut lit, down = bottom-right cut lit) · 6 corner dot (top-right = up, bottom-left = down)
#   7 side bar right edge (upper half = up, lower half = down)
import sys, pathlib
root = pathlib.Path(sys.argv[1])
def T(s): return s.replace("    ", "\t")
f = root / "scripts/ui/s286_team.gd"
s = f.read_text(encoding="utf-8")

old = T('''    var sb := StyleBoxFlat.new()
    sb.bg_color = bg
    sb.set_corner_radius_all(2)
    sb.border_color = Color(OUT, 0.7 * a)
    if OS.get_environment("S294") == "0": sb.set_border_width_all(1)   # s294 C2
    draw_style_box(sb, r)
    _ic_q.append([r.grow(-1.5), e[1], Color(1, 1, 1, 0.97), a])
    var mk: String = e[5]
    if mk != "" and r.size.x >= 9.0:   # s299 r35w8b: no mark on small chips · white "+" / "−" at the top-right corner = which way the stat goes
        _ic_q.append([mk, r.position + Vector2(r.size.x - 1.5, 1.5), a])
''')
new = T('''    var mks := OS.get_environment("S299MK")
    var mk: String = e[5]
    if mks != "" and mks != "0":   # s299 r35w10: cut-corner chip + bigger icon + mark style
        var k := roundf(r.size.x * 0.28)
        var pp := _cutpts299(r, k)
        draw_colored_polygon(pp, bg)
        draw_polyline(pp + PackedVector2Array([pp[0]]), Color(OUT, 0.7 * a), 1.0)
        _ic_q.append([r.grow(-0.4), e[1], Color(1, 1, 1, 0.97), a])
        if mk != "" and r.size.x >= 9.0:
            _ic_q.append(["mk" + mks, r, mk == "+", k, a])
    else:
        var sb := StyleBoxFlat.new()
        sb.bg_color = bg
        sb.set_corner_radius_all(2)
        sb.border_color = Color(OUT, 0.7 * a)
        if OS.get_environment("S294") == "0": sb.set_border_width_all(1)   # s294 C2
        draw_style_box(sb, r)
        _ic_q.append([r.grow(-1.5), e[1], Color(1, 1, 1, 0.97), a])
        if mk != "" and r.size.x >= 9.0:   # s299 r35w8b: no mark on small chips · white "+" / "−" at the top-right corner = which way the stat goes
            _ic_q.append([mk, r.position + Vector2(r.size.x - 1.5, 1.5), a])
''')
assert s.count(old) == 1, "chip"
s = s.replace(old, new)

old2 = T('''        if q[0] is String and q[0] == "veil":
''')
new2 = T('''        if q[0] is String and String(q[0]).begins_with("mk"):   # s299 r35w10 mark styles
            _mark299(String(q[0]).substr(2), q[1], q[2], q[3], q[4])
            continue
        if q[0] is String and q[0] == "veil":
''')
assert s.count(old2) == 1, "draw"
s = s.replace(old2, new2)

s += T('''

func _mark299(st: String, r: Rect2, up: bool, k: float, a: float) -> void:   # s299 r35w10: up / down mark on a cut-corner chip
    var L := _ic_layer
    var W := Color(1, 1, 1, a)
    var D := Color(OUT, 0.85 * a)
    var x0 := r.position.x
    var y0 := r.position.y
    var x1 := r.end.x
    var y1 := r.end.y
    var t := roundf(r.size.x * 0.42)
    match st:
        "1":   # folded corner on the uncut corners
            var tri := PackedVector2Array([Vector2(x1 - t, y0), Vector2(x1, y0), Vector2(x1, y0 + t)]) if up else PackedVector2Array([Vector2(x0, y1 - t), Vector2(x0, y1), Vector2(x0 + t, y1)])
            L.draw_colored_polygon(tri, W)
            var ed := [Vector2(x1 - t, y0), Vector2(x1, y0 + t)] if up else [Vector2(x0, y1 - t), Vector2(x0 + t, y1)]
            L.draw_line(ed[0], ed[1], D, 0.8, true)
        "2":   # small chevron top-right (^ up, v down)
            var cx := x1 - 2.0
            var cy := y0 + 2.2
            var pts := PackedVector2Array([Vector2(cx - 1.6, cy + 0.8), Vector2(cx, cy - 0.8), Vector2(cx + 1.6, cy + 0.8)]) if up else PackedVector2Array([Vector2(cx - 1.6, cy - 0.8), Vector2(cx, cy + 0.8), Vector2(cx + 1.6, cy - 0.8)])
            L.draw_polyline(pts, D, 2.4, true)
            L.draw_polyline(pts, W, 1.1, true)
        "3":   # edge bar, inset past the cut
            var br := Rect2(x0 + k, y0 - 1.0, r.size.x - k, 1.6) if up else Rect2(x0, y1 - 0.6, r.size.x - k, 1.6)
            L.draw_rect(br.grow(0.5), D)
            L.draw_rect(br, W)
        "4":   # solid triangle top-right
            var cx := x1 - 2.0
            var cy := y0 + 2.0
            var tri := PackedVector2Array([Vector2(cx - 1.8, cy + 1.2), Vector2(cx, cy - 1.4), Vector2(cx + 1.8, cy + 1.2)]) if up else PackedVector2Array([Vector2(cx - 1.8, cy - 1.2), Vector2(cx, cy + 1.4), Vector2(cx + 1.8, cy - 1.2)])
            L.draw_polyline(tri + PackedVector2Array([tri[0]]), D, 1.4, true)
            L.draw_colored_polygon(tri, W)
        "5":   # lit cut edge (our motif)
            var ed := [Vector2(x0, y0 + k), Vector2(x0 + k, y0)] if up else [Vector2(x1 - k, y1), Vector2(x1, y1 - k)]
            var n := Vector2(-0.7, -0.7) if up else Vector2(0.7, 0.7)
            L.draw_line(ed[0] - n * 0.3, ed[1] - n * 0.3, D, 2.6, true)
            L.draw_line(ed[0] + n * 0.2 - (ed[1] - ed[0]).normalized() * 0.8, ed[1] + n * 0.2 + (ed[1] - ed[0]).normalized() * 0.8, W, 1.5, true)
        "6":   # corner dot on the uncut corners
            var c := Vector2(x1 - 1.0, y0 + 1.0) if up else Vector2(x0 + 1.0, y1 - 1.0)
            L.draw_circle(c, 1.9, D, true, -1.0, true)
            L.draw_circle(c, 1.2, W, true, -1.0, true)
        "7":   # side bar on the right edge (upper half up, lower half down)
            var br := Rect2(x1 - 0.6, y0 + 0.5, 1.4, r.size.y * 0.5) if up else Rect2(x1 - 0.6, y1 - k - r.size.y * 0.5, 1.4, r.size.y * 0.5)
            L.draw_rect(br.grow(0.5), D)
            L.draw_rect(br, W)
''')
f.write_text(s, encoding="utf-8", newline="")
print("s299r35w10 ok")

# mock only (S286FAKESTAT): show one DOWN mark on a visible chip (cdSlow hourglass)
s = f.read_text(encoding="utf-8")
o3 = '["cdSlow", "cd", false, -1.0, "คูลดาวน์ช้าลง 30%", "+"]'
if s.count(o3) == 1:
    f.write_text(s.replace(o3, o3[:-4] + '"-"]'), encoding="utf-8", newline="")
    print("mock down mark ok")
