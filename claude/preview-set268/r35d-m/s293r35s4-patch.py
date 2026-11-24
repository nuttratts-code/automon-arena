# set 293 round 35s4 (sample, after s293r35s3): owner "ok-ish — fade the background down a bit".
# Band plate = vertical gradient (slate 0.78 at the top -> 0.42 at the bottom) + a 12 px tail fading to 0, no box border;
# only the side-colour line on top stays. Env S293BOX=1 = round 35s3 plate.
# usage: python -I s293r35s4-patch.py <g286 path>
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")

def rep(old, new, n=1):
    global s
    old = old.replace("    ", "\t"); new = new.replace("    ", "\t")
    assert s.count(old) == n, (s.count(old), old[:80])
    s = s.replace(old, new)

rep("""    sb.bg_color = Color("#16202a", 0.80 * a)   # same slate as the cards, a bit denser for text
    sb.set_corner_radius_all(3)
    sb.border_color = Color(LINE, LINE.a * a)
    sb.set_border_width_all(1)
    _pn_layer.draw_style_box(sb, R)
""", """    sb.bg_color = Color("#16202a", 0.80 * a)   # same slate as the cards, a bit denser for text
    sb.set_corner_radius_all(3)
    sb.border_color = Color(LINE, LINE.a * a)
    sb.set_border_width_all(1)
    if OS.get_environment("S293BOX") == "1":
        _pn_layer.draw_style_box(sb, R)
    else:   # s293 r35s4 (owner): background fades downward, soft tail, no box line
        var sl0 := Color("#16202a")
        var t0 := Color(sl0, 0.78 * a)
        var t1 := Color(sl0, 0.42 * a)
        var t2 := Color(sl0, 0.0)
        var y1 := R.end.y
        var y2 := R.end.y + 12.0
        _pn_layer.draw_polygon(PackedVector2Array([R.position, Vector2(R.end.x, R.position.y), Vector2(R.end.x, y1), Vector2(R.position.x, y1)]),
            PackedColorArray([t0, t0, t1, t1]))
        _pn_layer.draw_polygon(PackedVector2Array([Vector2(R.position.x, y1), Vector2(R.end.x, y1), Vector2(R.end.x, y2), Vector2(R.position.x, y2)]),
            PackedColorArray([t1, t1, t2, t2]))
""")
# text gets the cards' dark outline so it stays readable where the plate fades
rep("""    _pn_layer.draw_string(f, Vector2(x, p.y), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)
""", """    _pn_layer.draw_string_outline(f, Vector2(x, p.y), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 3, Color(OUT, OUT.a * col.a))
    _pn_layer.draw_string(f, Vector2(x, p.y), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)
""")
rep("""    _pn_layer.draw_string(f, Vector2(right - f.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x, p.y), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)
""", """    var xr := right - f.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
    _pn_layer.draw_string_outline(f, Vector2(xr, p.y), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 3, Color(OUT, OUT.a * col.a))
    _pn_layer.draw_string(f, Vector2(xr, p.y), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)
""")
p.write_text(s, encoding="utf-8")
print("s293r35s4 patched", p)
