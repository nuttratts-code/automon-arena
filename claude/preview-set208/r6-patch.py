import sys
g = sys.argv[1]
def patch(path, pairs):
    p = g + '/' + path
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        a = a.replace('    ', '\t'); b = b.replace('    ', '\t')
        assert a in s, (path, a)
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8', newline='\n').write(s)

# R6 (owner, 12 Nov): cool tone · arena stars under the unit · bench stars right · tribe row lower · tile rims only while dragging · no "+ถาวร"
patch('scripts/ui/theme.gd', [
('var tmp := OS.get_environment("UI_TEMP")', 'var tmp := "cool" # R6: owner picked the cool tone'),
])
patch('scripts/ui/prep.gd', [
# arena: stars sit at the bottom of the cell (the tile's front edge, under the feet)
("""    if on_stage: # set 206: the unit itself is a sprite on the 3D tile; the cell keeps tribe badge + stars + name at the feet
        v.alignment = BoxContainer.ALIGNMENT_CENTER""",
"""    if on_stage: # set 206: the unit itself is a sprite on the 3D tile; the cell keeps tribe badge + stars + name at the feet
        v.alignment = BoxContainer.ALIGNMENT_END # R6: stars under the unit"""),
# bench: right margin so right-aligned stars do not touch the frame
("""        v.offset_left = 6
    v.mouse_filter""", """        v.offset_left = 6
        v.offset_right = -8
    v.mouse_filter"""),
("""        col.add_child(UV.tribes_stars(c, int(u["level"]), 11.0))""",
"""        col.add_child(UV.tribes_stars(c, int(u["level"]), 11.0, true))"""),
# no "+ถาวร" mark (the card shows it on tap)
("""    if not (u["perm"] as Dictionary).is_empty():
        var pd""", """    if false and not (u["perm"] as Dictionary).is_empty(): # R6: hidden, the card shows it
        var pd"""),
# tribe row lower
("""        _trow.offset_top = 0
        _trow.offset_bottom = 52""", """        _trow.offset_top = 12
        _trow.offset_bottom = 64"""),
# rims only while dragging
("""    _stage_dim_drag(ref, true)
    _show_col_labels(true)""", """    _stage_dim_drag(ref, true)
    _show_col_labels(true)
    if app.stage != null: app.stage.show_rims(true)"""),
("""    _stage_dim_drag(_drag_from, false)
    _show_col_labels(false)""", """    _stage_dim_drag(_drag_from, false)
    _show_col_labels(false)
    if app.stage != null: app.stage.show_rims(false)"""),
])
patch('scripts/ui/unit_view.gd', [
("""static func tribes_stars(c: Dictionary, level: int, px: float) -> HBoxContainer:""",
"""static func tribes_stars(c: Dictionary, level: int, px: float, stars_right: bool = false) -> HBoxContainer:"""),
("""    if level > 0:
        var l := TH.label("★".repeat(level), 13, "ink")""", """    if level > 0:
        if stars_right:
            var gap := Control.new()
            gap.size_flags_horizontal = Control.SIZE_EXPAND_FILL
            gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
            row.add_child(gap)
        var l := TH.label("★".repeat(level), 13, "ink")"""),
])
patch('scripts/ui/stage3d.gd', [
("""var tiles := {} #""", """var rim_nodes := {} # R6: key → rim mesh; hidden unless lit or a drag is on
var rims_drag := false
var tiles := {} #"""),
("""                tiles[key(s, row, lane)] = rm""", """                tiles[key(s, row, lane)] = rm
                rim_nodes[key(s, row, lane)] = r1
                r1.visible = false"""),
("""    var c: Color = col if col is Color else rim_idle
    m.albedo_color = c""", """    var c: Color = col if col is Color else rim_idle
    var rn: Node3D = rim_nodes.get(key(side, row, lane))
    if rn != null:
        rn.set_meta("lit", col is Color)
        rn.visible = rims_drag or col is Color
    m.albedo_color = c"""),
("""# ---------- units ----------""", """func show_rims(on: bool) -> void: # R6: own-side rims show only while a unit is dragged
    rims_drag = on
    for k in rim_nodes:
        var rn: Node3D = rim_nodes[k]
        rn.visible = on or bool(rn.get_meta("lit", false))

# ---------- units ----------"""),
])
print('ok')
