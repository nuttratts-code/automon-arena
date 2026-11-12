# set 216 R1: prep sample — shop card shows the tribe count it would make on the board (DO 27, compare at the moment of buying)
# yellow = this unit completes a tribe step · only for units not already on the board (same id counts once, team.gd count_tribes)
import sys, os
g = sys.argv[1]

def sub(path, pairs):
    p = os.path.join(g, path)
    t = open(p, encoding="utf-8").read()
    for a, b in pairs:
        a = a.replace("    ", "\t"); b = b.replace("    ", "\t")
        assert a in t, (path, a[:70])
        t = t.replace(a, b, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(t)

sub("scripts/ui/prep.gd", [
("""    var ts := [c["tribe"]]
    ts.append_array(c["extraTribes"])
    for t in ts:
        var sp: Array = TH.TRIBE_SHAPE.get(t, ["square", "mute"])
        tr.add_child(SHAPE.make(sp[0], sp[1], 12))
    top.add_child(tr)
""", """    var ts := [c["tribe"]]
    ts.append_array(c["extraTribes"])
    var on_board := SH.board_units(P()).any(func(x): return x["u"]["id"] == id)
    var tc := T.count_tribes(SH.team_entries(P()), app.cm)
    for t in ts:
        var sp: Array = TH.TRIBE_SHAPE.get(t, ["square", "mute"])
        var trow := HBoxContainer.new()
        trow.add_theme_constant_override("separation", 2)
        trow.mouse_filter = Control.MOUSE_FILTER_IGNORE
        var shp := SHAPE.make(sp[0], sp[1], 12)
        shp.size_flags_vertical = Control.SIZE_SHRINK_CENTER
        trow.add_child(shp)
        if not on_board:
            var n := float(tc.get(t, 0.0)) + 1.0
            var hit := (R.RULES()["tribeSteps"] as Array).has(int(n))
            var tl := TH.label("%s/%s" % [_n(n), _n(n if hit else next_step(n))], 13, "ink", "body_b")
            tl.name = "BuyStep"
            tl.add_theme_color_override("font_color", STEP_ON if hit else STEP_OFF)
            tl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
            tl.add_theme_constant_override("outline_size", 4)
            tl.mouse_filter = Control.MOUSE_FILTER_IGNORE
            trow.add_child(tl)
        tr.add_child(trow)
    top.add_child(tr)
"""),
])
print("ok prep")
