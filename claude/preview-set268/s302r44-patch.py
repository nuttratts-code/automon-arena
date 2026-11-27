# set 302 r44 (owner A1-A4): odds strip = raised step on the top plate edge · one navy/gold tray behind the 6 bench sockets ·
# gold divider under the round line in the info panel · tribe cards one step brighter
import sys, os, shutil
g = sys.argv[1]
def patch(rel, pairs):
    p = os.path.join(g, rel)
    s = open(p, encoding="utf-8").read()
    if not os.path.exists(p + ".s302r44"): shutil.copy(p, p + ".s302r44")
    for old, new in pairs:
        assert s.count(old) == 1, (rel, old[:70], s.count(old))
        s = s.replace(old, new)
    open(p, "w", encoding="utf-8", newline="\n").write(s)
patch("scripts/ui/r43.gd", [
    ("static func plate(ci: CanvasItem, r: Rect2, _k: float, a: float) -> void:\n\tpanel(ci, r, K + 2.0, a)\n",
     "static func plate(ci: CanvasItem, r: Rect2, _k: float, a: float) -> void:\n"
     "\tvar vp := (ci as CanvasItem).get_viewport_rect().size\n"
     "\tif r.size.x > vp.x * 0.6 and (ci as CanvasItem).get_global_transform().origin.y + r.position.y < vp.y * 0.2:   # r44 A1: the top plate\n"
     "\t\tstepped(ci, r, K + 2.0, a)\n"
     "\t\treturn\n"
     "\tpanel(ci, r, K + 2.0, a)\n"
     "\n"
     "# r44 A1: top plate whose edge steps up under the odds strip (right part); Lv tab sits on the lower left part\n"
     "static func _step(r: Rect2, k: float) -> PackedVector2Array:\n"
     "\tvar h1 := roundf(r.size.y * 0.13)\n"
     "\tvar xs := r.position.x + r.size.x * 0.655\n"
     "\tvar a := r.position\n"
     "\tvar b := r.end\n"
     "\treturn PackedVector2Array([Vector2(a.x + k, a.y + h1), Vector2(xs, a.y + h1), Vector2(xs + h1, a.y), Vector2(b.x, a.y), Vector2(b.x, b.y - k),\n"
     "\t\tVector2(b.x - k, b.y), Vector2(a.x, b.y), Vector2(a.x, a.y + h1 + k)])\n"
     "\n"
     "static func stepped(ci: CanvasItem, r: Rect2, k: float, a: float) -> void:\n"
     "\t_grad(ci, _step(r, k), Color(Color(\"#172840\"), 0.95 * a), Color(Color(NAVY2), 0.95 * a), r)\n"
     "\t_ring(ci, _step(r.grow(1.0), k + 0.4), Color(Color(RIM), 0.9 * a), 2.0)\n"
     "\t_ring(ci, _step(r.grow(-1.0), k - 0.4), Color(Color(GOLD), a), 1.5)\n"
     "\t_ring(ci, _step(r.grow(-4.0), maxf(k - 1.6, 1.0)), Color(Color(GOLD), 0.22 * a), 1.0)\n"
     "\tvar h1 := roundf(r.size.y * 0.13)\n"
     "\tvar xs := r.position.x + r.size.x * 0.655\n"
     "\tvar y := r.position.y + h1 * 2.0 + 2.0   # gold rule under the odds strip (the picture's raised strip)\n"
     "\tci.draw_line(Vector2(xs + h1, y), Vector2(r.end.x - 6.0, y), Color(Color(GOLD), 0.55 * a), 1.0)\n"),
    ("static func slot(ci: Control, filled: bool, shop: bool, line: Variant) -> void:\n\tvar r := Rect2(Vector2.ZERO, ci.size).grow(-1.0)\n\tif shop:\n\t\treturn\n",
     "static func slot(ci: Control, filled: bool, shop: bool, line: Variant) -> void:\n\tvar r := Rect2(Vector2.ZERO, ci.size).grow(-1.0)\n\tif shop:\n\t\treturn\n"
     "\tvar bn := ci.get_parent() as Control   # r44 A2: one tray behind the whole bench row, drawn by the first socket (siblings draw over it)\n"
     "\tif bn != null and bn.name == \"Bench\" and ci.get_index() == 0:\n"
     "\t\tvar tr := Rect2(bn.global_position - ci.global_position, bn.size).grow_individual(9, 7, 9, 7)\n"
     "\t\tpanel(ci, tr, K, 1.0)\n"),
    ("clampf(tc.s * 1.0, 0.0, 0.9), 0.72)", "clampf(tc.s * 1.1, 0.0, 1.0), 0.82)"),
    ("Color(Color.from_hsv(tc.h, clampf(tc.s * 0.75, 0.0, 0.75), 0.92), 0.06)", "Color(Color.from_hsv(tc.h, clampf(tc.s * 0.85, 0.0, 0.85), 1.0), 0.07)"),
])
patch("scripts/ui/prep.gd", [
    ('\t\t\t_mv299(top.get_node_or_null("HudTitle"), inf, 0.0, 0, 190, 0, 19)\n',
     '\t\t\t_mv299(top.get_node_or_null("HudTitle"), inf, 0.0, 0, 190, 0, 19)\n'
     '\t\t\tif OS.get_environment("S302R43") == "1":   # r44 A3: gold divider under the round line\n'
     '\t\t\t\tvar dv := ColorRect.new()\n'
     '\t\t\t\tdv.name = "Div302"\n'
     '\t\t\t\tdv.color = Color(Color("#c9a45c"), 0.6)\n'
     '\t\t\t\tdv.mouse_filter = Control.MOUSE_FILTER_IGNORE\n'
     '\t\t\t\tinf.add_child(dv)\n'
     '\t\t\t\t_mv299(dv, inf, 0.0, 0, 160, 21, 22)\n'),
])
print("s302r44 patched")
