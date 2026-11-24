# set 293 round 35s5 (sample, after s293r35s4): owner shows the run-end screen: "I like this fade tone — do the whole screen;
# only the colour fade, not its direction, design what fits". Run-end curve (run_end.gd TH.band): R23_INK #16202a,
# 0.88 at the dark end -> 0.70 at 60 % -> clear. Used now on: own cards (dark at the screen bottom, fading up past the card top),
# foe cards (dark at the screen top, fading down), the detail band (dark on top, fading down past its bottom). Card lines gone;
# the picked card keeps its white frame on a teal fade. Env S293BOX=1 = round 35s4 look.
# usage: python -I s293r35s5-patch.py <g286 path>
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")

def rep(old, new, n=1):
    global s
    old = old.replace("    ", "\t"); new = new.replace("    ", "\t")
    assert s.count(old) == n, (s.count(old), old[:80])
    s = s.replace(old, new)

# helper: vertical run-end fade from y_dark (a0) to y_clear (0), 0.8*a0 at 60 %
rep("""func _socket(r: Rect2, a: float) -> void:""", """func _fade(cv: CanvasItem, x0: float, x1: float, y_dark: float, y_clear: float, col: Color, a0: float) -> void:
    var ym := y_dark + (y_clear - y_dark) * 0.6
    var c0 := Color(col, a0)
    var c1 := Color(col, a0 * 0.8)
    var c2 := Color(col, 0.0)
    cv.draw_polygon(PackedVector2Array([Vector2(x0, y_dark), Vector2(x1, y_dark), Vector2(x1, ym), Vector2(x0, ym)]), PackedColorArray([c0, c0, c1, c1]))
    cv.draw_polygon(PackedVector2Array([Vector2(x0, ym), Vector2(x1, ym), Vector2(x1, y_clear), Vector2(x0, y_clear)]), PackedColorArray([c1, c1, c2, c2]))

func _socket(r: Rect2, a: float) -> void:""")

# cards
rep("""    sb.border_color = Color(1, 1, 1, 0.95) if on else LINE
    sb.set_border_width_all(2 if on else 1)
    draw_style_box(sb, r)
""", """    sb.border_color = Color(1, 1, 1, 0.95) if on else LINE
    sb.set_border_width_all(2 if on else 1)
    if OS.get_environment("S293BOX") == "1":
        draw_style_box(sb, r)
    else:   # s293 r35s5: run-end fade, dark at the screen edge, clear past the card's inner edge
        var fc: Color = Color("#1d6079") if on else TH.R23_INK
        if foe: _fade(self, r.position.x, r.end.x, r.position.y, r.end.y + 10.0, fc, 0.88 * a)
        else: _fade(self, r.position.x, r.end.x, r.end.y, r.position.y - 10.0, fc, 0.88 * a)
        if on:
            var fr := StyleBoxFlat.new()
            fr.bg_color = Color(0, 0, 0, 0)
            fr.set_corner_radius_all(3)
            fr.border_color = Color(1, 1, 1, 0.95)
            fr.set_border_width_all(2)
            draw_style_box(fr, r)
""")

# detail band: same curve, dark on top, clear 16 px past the bottom
rep("""        _pn_layer.draw_polygon(PackedVector2Array([R.position, Vector2(R.end.x, R.position.y), Vector2(R.end.x, y1), Vector2(R.position.x, y1)]),
            PackedColorArray([t0, t0, t1, t1]))
        _pn_layer.draw_polygon(PackedVector2Array([Vector2(R.position.x, y1), Vector2(R.end.x, y1), Vector2(R.end.x, y2), Vector2(R.position.x, y2)]),
            PackedColorArray([t1, t1, t2, t2]))
""", """        if OS.get_environment("S293BOX") == "2":   # round 35s4 fade
            _pn_layer.draw_polygon(PackedVector2Array([R.position, Vector2(R.end.x, R.position.y), Vector2(R.end.x, y1), Vector2(R.position.x, y1)]),
                PackedColorArray([t0, t0, t1, t1]))
            _pn_layer.draw_polygon(PackedVector2Array([Vector2(R.position.x, y1), Vector2(R.end.x, y1), Vector2(R.end.x, y2), Vector2(R.position.x, y2)]),
                PackedColorArray([t1, t1, t2, t2]))
        else:   # s293 r35s5: run-end curve
            _fade(_pn_layer, R.position.x, R.end.x, R.position.y, R.end.y + 16.0, TH.R23_INK, 0.88 * a)
""")
p.write_text(s, encoding="utf-8")
print("s293r35s5 patched", p)
