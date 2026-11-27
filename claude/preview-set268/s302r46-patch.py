# set 303 r46 (owner E1: GPT spec §2 colours + §3 light/shadow, UI only; F1 unit shadows stay from the hub):
# panels #0D1A21 (shop) / #091D2B (info) · gold bevel #E3A942 lit top-left, #6F5129 shade bottom-right · dark inner edge ·
# drop shadow #070D12 ~45 % down 5 px soft 8 px under every panel / Fight / bench tray · bench #1A262E -> #19242C, dimmer gold ·
# cards dark behind the name, oval light under the feet (~30 %, 72 % wide) · Fight #12648A -> #0E8EB3 · text #F5F0DF, gold #FFD56A, hearts #F58998.
# Usage: python s302r46-patch.py <g286> (after s302r45)
import sys, os, shutil
g = sys.argv[1]
def patch(rel, pairs):
    p = os.path.join(g, rel)
    s = open(p, encoding="utf-8").read()
    if not os.path.exists(p + ".s302r46"): shutil.copy(p, p + ".s302r46")
    for old, new in pairs:
        old = old.replace("    ", "\t"); new = new.replace("    ", "\t")
        assert s.count(old) == 1, (rel, old[:70], s.count(old))
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8", newline="\n").write(s)

patch("scripts/ui/r43.gd", [
    # helpers: drop shadow + two-tone gold bevel
    ("""# dark-navy panel, dark rim, gold trim, faint inner gold rule
static func panel(ci: CanvasItem, r: Rect2, k: float, a: float) -> void:
    _grad(ci, _cut(r, k), Color(Color("#172840"), 0.95 * a), Color(Color(NAVY2), 0.95 * a), r)
    _ring(ci, _cut(r.grow(1.0), k + 0.4), Color(Color(RIM), 0.9 * a), 2.0)
    _ring(ci, _cut(r.grow(-1.0), k - 0.4), Color(Color(GOLD), a), 1.5)
    _ring(ci, _cut(r.grow(-4.0), maxf(k - 1.6, 1.0)), Color(Color(GOLD), 0.22 * a), 1.0)
""",
     """const G_LIT := "#E3A942"   # r46 spec §2: gold edge in light
const G_SHD := "#6F5129"   # r46 spec §2: gold edge in shade

# r46 spec §3: soft drop shadow #070D12 ~45 %, 5 px down, ~8 px blur (stacked grown polygons)
static func shadow(ci: CanvasItem, p_of: Callable, r: Rect2, k: float, a: float) -> void:
    for i in 5:
        var g := r.grow(1.0 + i * 2.0)
        g.position.y += 5.0
        ci.draw_polygon(p_of.call(g, k + i * 1.2), PackedColorArray([Color(Color("#070D12"), 0.11 * a)]))

# r46 spec §3: gold line lit on the top-left run of points (lit = indices in order), shade elsewhere
static func _bevel(ci: CanvasItem, p: PackedVector2Array, lit: Array, w: float, a: float) -> void:
    _ring(ci, p, Color(Color(G_SHD), a), w)
    var q := PackedVector2Array()
    for i in lit: q.append(p[i])
    ci.draw_polyline(q, Color(Color(G_LIT), a), w, true)

# dark panel (spec colour), dark rim, gold bevel, dark inner edge
static func panel(ci: CanvasItem, r: Rect2, k: float, a: float, base := "#0D1A21") -> void:
    shadow(ci, _cut, r, k, a)
    var b := Color(base)
    _grad(ci, _cut(r, k), Color(b.lightened(0.06), 0.96 * a), Color(b.darkened(0.15), 0.96 * a), r)
    _ring(ci, _cut(r.grow(1.0), k + 0.4), Color(Color(RIM), 0.9 * a), 2.0)
    _bevel(ci, _cut(r.grow(-1.0), k - 0.4), [4, 5, 0, 1], 1.5, a)
    _ring(ci, _cut(r.grow(-3.0), maxf(k - 1.2, 1.0)), Color(0, 0, 0, 0.35 * a), 2.0)
"""),
    ("""static func stepped(ci: CanvasItem, r: Rect2, k: float, a: float) -> void:
    _grad(ci, _step(r, k), Color(Color("#172840"), 0.95 * a), Color(Color(NAVY2), 0.95 * a), r)
    _ring(ci, _step(r.grow(1.0), k + 0.4), Color(Color(RIM), 0.9 * a), 2.0)
    _ring(ci, _step(r.grow(-1.0), k - 0.4), Color(Color(GOLD), a), 1.5)
    _ring(ci, _step(r.grow(-4.0), maxf(k - 1.6, 1.0)), Color(Color(GOLD), 0.22 * a), 1.0)
""",
     """static func stepped(ci: CanvasItem, r: Rect2, k: float, a: float) -> void:
    shadow(ci, _step, r, k, a)
    var b := Color("#0D1A21")
    _grad(ci, _step(r, k), Color(b.lightened(0.06), 0.96 * a), Color(b.darkened(0.15), 0.96 * a), r)
    _ring(ci, _step(r.grow(1.0), k + 0.4), Color(Color(RIM), 0.9 * a), 2.0)
    _bevel(ci, _step(r.grow(-1.0), k - 0.4), [6, 7, 0, 1, 2, 3], 1.5, a)
    _ring(ci, _step(r.grow(-3.0), maxf(k - 1.2, 1.0)), Color(0, 0, 0, 0.35 * a), 2.0)
"""),
    ("    ci.draw_line(Vector2(xs + h1, y), Vector2(r.end.x - 6.0, y), Color(Color(GOLD), 0.55 * a), 1.0)",
     "    ci.draw_line(Vector2(xs + h1, y), Vector2(r.end.x - 6.0, y), Color(Color(G_SHD), 0.9 * a), 1.0)"),
    # info panel = spec #091D2B
    ("        panel(ci, r, K, 1.0)\n        emblem(", "        panel(ci, r, K, 1.0, \"#091D2B\")\n        emblem("),
    # secondary buttons: dimmer gold bevel (spec: gold less bright on secondary buttons)
    ("""    _ring(ci, _cut(r.grow(-0.5), 5.8), Color(Color(GOLD), 0.75) if not hv else Color(GOLD), 1.0)
""",
     """    _bevel(ci, _cut(r.grow(-0.5), 5.8), [4, 5, 0, 1], 1.0, 0.7 if not hv else 1.0)
"""),
    # Fight: shadow + spec gradient
    ("""    ci.draw_polygon(_cut4(r.grow(1.5), k + 0.6), PackedColorArray([Color(Color(RIM), 0.95)]))
""",
     """    shadow(ci, _cut4, r, k, 1.0)
    ci.draw_polygon(_cut4(r.grow(1.5), k + 0.6), PackedColorArray([Color(Color(RIM), 0.95)]))
"""),
    ("""    _grad(ci, _cut4(r, k), Color("#a88444"), Color("#6e5630"), r)   # gold frame
    _ring(ci, _cut4(r.grow(-0.5), k - 0.2), Color("#f0d48e"), 1.0)
""",
     """    _grad(ci, _cut4(r, k), Color("#b88a3c"), Color(G_SHD), r)   # gold frame (r46: lit top, shade bottom)
    _ring(ci, _cut4(r.grow(-0.5), k - 0.2), Color(G_LIT), 1.0)
"""),
    ("""Color("#13456a").lightened(0.08 if hv else 0.0), Color("#0a2238"), inr)""",
     """Color("#12648A").lightened(0.12 if hv else 0.0), Color("#0E8EB3").lightened(0.12 if hv else 0.0), inr)   # r46 spec §2"""),
    # text colour
    ("""    if c.s < 0.2 and c.v > 0.6: l.add_theme_color_override("font_color", Color("#f4f1ea"))""",
     """    if c.s < 0.2 and c.v > 0.6: l.add_theme_color_override("font_color", Color("#F5F0DF"))   # r46 spec"""),
    # bench: tray shadow comes from panel(); sockets spec colours + dimmer gold
    ("""    _grad(ci, p, Color(Color("#0e1828"), 0.93), Color(Color("#0a111d"), 0.93), r)
""",
     """    _grad(ci, p, Color(Color("#1A262E"), 0.95), Color(Color("#19242C"), 0.95), r)   # r46 spec §2
"""),
    ("""    _ring(ci, _cut(r.grow(-0.5), 5.8), Color(Color(GOLD), 0.85) if line == null or not filled else line, 1.2)
""",
     """    if line == null or not filled: _bevel(ci, _cut(r.grow(-0.5), 5.8), [4, 5, 0, 1], 1.2, 0.75)   # r46: dimmer gold on secondary
    else: _ring(ci, _cut(r.grow(-0.5), 5.8), line, 1.2)
"""),
    # cards: dark behind the name, lighter at the feet + oval light under the feet
    ("""    _grad(ci, _cut(r, k), base.darkened(0.22), base.darkened(0.58), r)
    var gc := Vector2(w * 0.60, h * 0.62)
    for i in 14:
        ci.draw_circle(gc, h * (0.62 - i * 0.04), Color(Color.from_hsv(tc.h, clampf(tc.s * 0.70, 0.0, 0.75), 1.0), 0.10), true, -1.0, true)
""",
     """    _grad(ci, _cut(r, k), base.darkened(0.62), base.darkened(0.18), r)   # r46 spec §3: dark behind the name
    var gc := Vector2(w * 0.60, h * 0.84)
    var lc := Color.from_hsv(tc.h, clampf(tc.s * 0.60, 0.0, 0.70), 1.0)
    for i in 9:   # r46 spec §3: oval light under the feet, ~30 % at the centre, 72 % of the card wide
        var rx := w * 0.36 * (1.0 - i * 0.1)
        var pts := PackedVector2Array()
        for j in 32:
            var t := TAU * j / 32.0
            pts.append(gc + Vector2(cos(t) * rx, sin(t) * rx * 0.34))
        ci.draw_polygon(pts, PackedColorArray([Color(lc, 0.04)]))
    for i in 8:
        ci.draw_circle(Vector2(w * 0.60, h * 0.58), h * (0.50 - i * 0.05), Color(lc, 0.035), true, -1.0, true)
"""),
])

patch("scripts/ui/prep.gd", [
    ("""                for n in inf.find_children("*", "Label", true, false):
                    (n as Label).add_theme_font_override("font", TH.font("body_b"))
""",
     """                for n in inf.find_children("*", "Label", true, false):
                    (n as Label).add_theme_font_override("font", TH.font("body_b"))
                var gv := inf.get_node_or_null("ChipGold/Row/Value") as Label   # r46 spec: gold / hearts colours
                if gv == null: gv = inf.find_child("Value", true, false) as Label
                if gv != null: gv.add_theme_color_override("font_color", Color("#FFD56A"))
                var hc := inf.get_node_or_null("ChipHearts") as Control
                if hc != null:
                    var hv := hc.find_child("Value", true, false) as Label
                    if hv != null: hv.add_theme_color_override("font_color", Color("#F58998"))
"""),
])
print("s302r46 patched")
