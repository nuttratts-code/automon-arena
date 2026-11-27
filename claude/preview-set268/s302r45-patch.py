# set 303 r45 (owner B1-B6 all, vs S301 target): lock/reroll = brighter gradient bars, padlock closed, reroll cost row not cut ·
# gutter + gold divider between the button column and the cards · cards: inner gold frame, stronger glow, one name size, bigger pills ·
# info panel: gold-trim panel + faint emblem, plain Mitr digits (no slashed zero) · Fight: stronger inner glow + soft outer glow ·
# bench sockets: own gold frame each. Usage: python s302r45-patch.py <g286> (after s302r44)
import sys, os, shutil
g = sys.argv[1]
def patch(rel, pairs):
    p = os.path.join(g, rel)
    s = open(p, encoding="utf-8").read()
    if not os.path.exists(p + ".s302r45"): shutil.copy(p, p + ".s302r45")
    for old, new in pairs:
        old = old.replace("    ", "\t"); new = new.replace("    ", "\t")
        assert s.count(old) == 1, (rel, old[:70], s.count(old))
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8", newline="\n").write(s)

patch("scripts/ui/r43.gd", [
    # B1: button = horizontal gradient bar (dark left -> lighter right) with a clear sheen band; B4: info plate (no name) = gold panel + emblem
    ("""    var p := _cut(r, 6.0)
    _grad(ci, p, Color("#22324c").lightened(0.06 if hv else 0.0), Color("#131e30"), r)
""",
     """    if nm == "":   # r45 B4: the info panel (round / gold / hearts)
        panel(ci, r, K, 1.0)
        emblem(ci, Vector2(r.end.x - r.size.y * 0.42, r.get_center().y + 1.0), r.size.y * 0.30)
        return
    var p := _cut(r, 6.0)
    var cs := PackedColorArray()   # r45 B1: bar lit from the right (picture)
    for v in p:
        var t := clampf((v.x - r.position.x) / maxf(r.size.x, 1.0), 0.0, 1.0)
        cs.append(Color("#141f33").lerp(Color("#2a3d5c"), t).lightened(0.07 if hv else 0.0))
    ci.draw_polygon(p, cs)
    ci.draw_line(Vector2(r.position.x + 7, r.position.y + 1.5), Vector2(r.end.x - 1, r.position.y + 1.5), Color(1, 1, 1, 0.10), 1.0)
"""),
    ("ci.draw_polygon(sh, PackedColorArray([Color(1, 1, 1, 0.05)]))", "ci.draw_polygon(sh, PackedColorArray([Color(1, 1, 1, 0.09)]))"),
    ("""    _ring(ci, _cut(r.grow(-0.5), 5.8), Color("#5d6d86") if not hv else Color(GOLD), 1.0)
""",
     """    _ring(ci, _cut(r.grow(-0.5), 5.8), Color(Color(GOLD), 0.75) if not hv else Color(GOLD), 1.0)

# r45 B4: faint crest (leaf fan) in the info panel, as the picture
static func emblem(ci: CanvasItem, c: Vector2, s: float) -> void:
    var col := Color(Color(GOLD), 0.16)
    for a in [-0.75, -0.38, 0.0, 0.38, 0.75]:
        var d := Vector2(sin(a), -cos(a))
        var n := Vector2(-d.y, d.x)
        var l := s * (1.0 - absf(a) * 0.35)
        var tip := c + d * l
        var mid := c + d * l * 0.5
        ci.draw_polygon(PackedVector2Array([c + d * s * 0.12, mid + n * s * 0.16, tip, mid - n * s * 0.16]), PackedColorArray([col]))
    ci.draw_line(c + Vector2(-s * 0.35, s * 0.25), c + Vector2(s * 0.35, s * 0.25), col, 2.0, true)
"""),
    # B5: Fight glow - soft cyan outer glow + brighter inner fall-off
    ("""    var k := 14.0
    ci.draw_polygon(_cut4(r.grow(1.5), k + 0.6), PackedColorArray([Color(Color(RIM), 0.95)]))
""",
     """    var k := 14.0
    for i in 5:   # r45 B5: soft outer glow
        _ring(ci, _cut4(r.grow(3.0 + i * 1.8), k + 1.5 + i * 0.8), Color(Color("#6fe0ff"), (0.20 - i * 0.035) * (1.2 if hv else 1.0)), 2.0)
    ci.draw_polygon(_cut4(r.grow(1.5), k + 0.6), PackedColorArray([Color(Color(RIM), 0.95)]))
"""),
    ("(0.95 if i == 0 else 0.30 - i * 0.05)", "(1.0 if i == 0 else 0.42 - i * 0.065)"),
    # B6: each socket its own gold frame + faint inner gold line
    ("""    _ring(ci, _cut(r.grow(-0.5), 5.8), Color("#6a5a3e") if line == null or not filled else line, 1.0)
""",
     """    _ring(ci, _cut(r.grow(-0.5), 5.8), Color(Color(GOLD), 0.85) if line == null or not filled else line, 1.2)
    _ring(ci, _cut(r.grow(-3.5), 4.0), Color(Color(GOLD), 0.18), 1.0)
"""),
    # B2: stronger glow behind the creature
    ("Color(Color.from_hsv(tc.h, clampf(tc.s * 0.85, 0.0, 0.85), 1.0), 0.07), true, -1.0, true)",
     "Color(Color.from_hsv(tc.h, clampf(tc.s * 0.70, 0.0, 0.75), 1.0), 0.10), true, -1.0, true)"),
    # B2: one name size on every card (fit the longest name a card may carry, 9 letters), shrink only if still longer
    ("""    var nfs := 10
    while nfs > 7 and fb.get_string_size(nm, HORIZONTAL_ALIGNMENT_LEFT, -1, nfs).x > room: nfs -= 1
""",
     """    var nfs := 11
    while nfs > 7 and fb.get_string_size("Bhameleon", HORIZONTAL_ALIGNMENT_LEFT, -1, nfs).x > room: nfs -= 1   # r45 B2: same size on every card
    while nfs > 7 and fb.get_string_size(nm, HORIZONTAL_ALIGNMENT_LEFT, -1, nfs).x > room: nfs -= 1
"""),
    # B2: bigger pills
    ("""    _pill(ci, fb, Rect2(r.position.x + 5, py, 23, 11), v._num(hp), Color("#3f8a46"))
    _pill(ci, fb, Rect2(r.position.x + 5, py + 15, 23, 11), v._num(atk), Color("#a3363a"))
""",
     """    _pill(ci, fb, Rect2(r.position.x + 5, py, 26, 13), v._num(hp), Color("#3f8a46"))
    _pill(ci, fb, Rect2(r.position.x + 5, py + 17, 26, 13), v._num(atk), Color("#a3363a"))
"""),
    ("    var fs := 9\n    var tw := f.get_string_size", "    var fs := 10\n    var tw := f.get_string_size"),
    # B2: inner gold frame (second line inside the card edge, as the picture)
    ("""    _ring(ci, _cut(r.grow(-0.8), k - 0.3), Color(Color(GOLD), 0.95 * fa), 1.2)
""",
     """    _ring(ci, _cut(r.grow(-0.8), k - 0.3), Color(Color(GOLD), 0.95 * fa), 1.2)
    var ir := Rect2(r.position.x + 3, r.position.y + bh + 3, r.size.x - 6, r.size.y - bh - 6)
    _ring(ci, _cut(ir, 4.0), Color(Color(GOLD), 0.45 * fa), 1.0)
"""),
])

patch("scripts/ui/prep.gd", [
    # B1+B3: lock 27-67, reroll 71-123 (cost row fits), column ends at -190 -> gutter to the cards
    ("""                _mv299(top.get_node_or_null("Reroll"), top, 0.5, -392, -181, 76, 122)
""",
     """                _mv299(top.get_node_or_null("Reroll"), top, 0.5, -392, -190, 71, 123)   # r45 B1/B3
"""),
    ("""                _mv299(lb, top, 0.5, -392, -181, 28, 72)
""",
     """                _mv299(lb, top, 0.5, -392, -190, 27, 67)   # r45 B1/B3
                var gd := ColorRect.new()   # r45 B3: gold divider between the button column and the cards
                gd.name = "Gut302"
                gd.color = Color(Color("#c9a45c"), 0.5)
                gd.mouse_filter = Control.MOUSE_FILTER_IGNORE
                top.add_child(gd)
                _mv299(gd, top, 0.5, -183, -182, 30, 120)
"""),
    # B1: padlock drawn closed (picture)
    ("""        cc.add_child(SHAPE.make("lock" if on else "unlock", "gold" if on or OS.get_environment("S302R43") == "1" else "mute", 26))""",
     """        cc.add_child(SHAPE.make("lock" if on or OS.get_environment("S302R43") == "1" else "unlock", "gold" if on or OS.get_environment("S302R43") == "1" else "mute", 26))   # r45 B1: closed padlock"""),
    # B4: bigger info panel
    ("""            _mv299(inf, tr, 0.0, 10, 200, 68, 128)
""",
     """            _mv299(inf, tr, 0.0, 10, 200, 68, 128)
            if OS.get_environment("S302R43") == "1": _mv299(inf, tr, 0.0, 12, 222, 64, 130)   # r45 B4: bigger panel
"""),
    ("""            _ly39p_reroll(top.get_node_or_null("Reroll") as Button, PZS, inf.get_node_or_null("ChipGold/Row/Icon"))
""",
     """            _ly39p_reroll(top.get_node_or_null("Reroll") as Button, PZS, inf.get_node_or_null("ChipGold/Row/Icon"))
            if OS.get_environment("S302R43") == "1":   # r45 B4: plain Mitr digits (the tnum display font draws a slashed zero)
                for n in inf.find_children("*", "Label", true, false):
                    (n as Label).add_theme_font_override("font", TH.font("body_b"))
                var lc := (top.get_node_or_null("Reroll") as Control)
                if lc != null and lc.get_node_or_null("Left39p") != null:
                    (lc.get_node("Left39p") as VBoxContainer).add_theme_constant_override("separation", -3)   # r45 B1: cost row fits
"""),
])
print("s302r45 patched")
