# set 293 round 35s6 (sample, after s293r35s5): owner "make samples of the fade from many angles".
# Env S293FDIR picks the fade shape for cards + detail band (same run-end colour + 0.88 strength):
#   v = round 35s5 (dark at the screen edge, fading toward the middle of the screen)
#   h = sideways: dark at the left (icon side), clear past the right edge
#   d = diagonal: dark at the outer-left corner, clear at the opposite corner
#   c = centre: dark middle, both left and right edges fade out
#   e = soft all round: solid inside, every edge fades out (vignette plate)
# usage: python -I s293r35s6-patch.py <g286 path>
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")

def rep(old, new, n=1):
    global s
    old = old.replace("    ", "\t"); new = new.replace("    ", "\t")
    assert s.count(old) == n, (s.count(old), old[:80])
    s = s.replace(old, new)

rep("""func _socket(r: Rect2, a: float) -> void:""", """func _q(cv: CanvasItem, p0: Vector2, p1: Vector2, p2: Vector2, p3: Vector2, c0: Color, c1: Color, c2: Color, c3: Color) -> void:
    cv.draw_polygon(PackedVector2Array([p0, p1, p2, p3]), PackedColorArray([c0, c1, c2, c3]))

# s293 r35s6: one plate, many fade shapes. top_dark = the dark edge is the top (foe cards, detail band)
func _fade_r(cv: CanvasItem, r: Rect2, col: Color, a0: float, top_dark: bool, tail: float) -> void:
    var m := OS.get_environment("S293FDIR")
    var A := Color(col, a0)
    var M := Color(col, a0 * 0.5)
    var Z := Color(col, 0.0)
    if m == "h":
        var xm := r.position.x + r.size.x * 0.6
        _q(cv, r.position, Vector2(xm, r.position.y), Vector2(xm, r.end.y), Vector2(r.position.x, r.end.y), A, Color(col, a0 * 0.8), Color(col, a0 * 0.8), A)
        _q(cv, Vector2(xm, r.position.y), Vector2(r.end.x + tail, r.position.y), Vector2(r.end.x + tail, r.end.y), Vector2(xm, r.end.y), Color(col, a0 * 0.8), Z, Z, Color(col, a0 * 0.8))
    elif m == "d":
        var rr := r.grow_individual(0, 0 if top_dark else tail, tail, tail if top_dark else 0)
        var tl := rr.position
        var tr := Vector2(rr.end.x, rr.position.y)
        var br := rr.end
        var bl := Vector2(rr.position.x, rr.end.y)
        if top_dark: _q(cv, tl, tr, br, bl, A, M, Z, M)
        else: _q(cv, tl, tr, br, bl, M, Z, M, A)
    elif m == "c":
        var w := r.size.x * 0.22
        var x1 := r.position.x + w
        var x2 := r.end.x - w
        _q(cv, Vector2(r.position.x - tail, r.position.y), Vector2(x1, r.position.y), Vector2(x1, r.end.y), Vector2(r.position.x - tail, r.end.y), Z, A, A, Z)
        _q(cv, Vector2(x1, r.position.y), Vector2(x2, r.position.y), Vector2(x2, r.end.y), Vector2(x1, r.end.y), A, A, A, A)
        _q(cv, Vector2(x2, r.position.y), Vector2(r.end.x + tail, r.position.y), Vector2(r.end.x + tail, r.end.y), Vector2(x2, r.end.y), A, Z, Z, A)
    elif m == "e":
        var t := minf(tail, minf(r.size.x, r.size.y) * 0.5)
        var o := r.grow(t * 0.5)
        var i := r.grow(-t * 0.5)
        cv.draw_rect(i, A)
        _q(cv, o.position, Vector2(o.end.x, o.position.y), Vector2(i.end.x, i.position.y), i.position, Z, Z, A, A)
        _q(cv, Vector2(i.position.x, i.end.y), i.end, o.end, Vector2(o.position.x, o.end.y), A, A, Z, Z)
        _q(cv, o.position, i.position, Vector2(i.position.x, i.end.y), Vector2(o.position.x, o.end.y), Z, A, A, Z)
        _q(cv, Vector2(i.end.x, i.position.y), Vector2(o.end.x, o.position.y), o.end, i.end, A, Z, Z, A)
    else:
        if top_dark: _fade(cv, r.position.x, r.end.x, r.position.y, r.end.y + tail, col, a0)
        else: _fade(cv, r.position.x, r.end.x, r.end.y, r.position.y - tail, col, a0)

func _socket(r: Rect2, a: float) -> void:""")
rep("""        if foe: _fade(self, r.position.x, r.end.x, r.position.y, r.end.y + 10.0, fc, 0.88 * a)
        else: _fade(self, r.position.x, r.end.x, r.end.y, r.position.y - 10.0, fc, 0.88 * a)
""", """        _fade_r(self, r, fc, 0.88 * a, foe, 10.0)
""")
rep("""            _fade(_pn_layer, R.position.x, R.end.x, R.position.y, R.end.y + 16.0, TH.R23_INK, 0.88 * a)
""", """            _fade_r(_pn_layer, R, TH.R23_INK, 0.88 * a, true, 16.0)
""")
p.write_text(s, encoding="utf-8")
print("s293r35s6 patched", p)
