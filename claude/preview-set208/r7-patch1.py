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

# R7 (owner, 12 Nov): tribe + stars at each unit's feet, inside the 3D scene (a unit in front hides them) · shop card stats
patch('scripts/ui/stage3d.gd', [
("""    var vis := shown == group
    s.visible = vis""", """    if u.has("level") and not big: # R7: foot plate = tribe shape + stars, children of the sprite (depth-tested)
        _foot_marks(s, c, int(u.get("level", 1)), tall)
    var vis := shown == group
    s.visible = vis"""),
("""func show_group(group: String) -> void:""", """const FOOT_PX := 0.0042 # world size of one texture pixel of the foot marks
static func _in_shape(kind: String, x: float, y: float) -> bool: # x, y in 0..1
    if kind == "circle":
        return Vector2(x - 0.5, y - 0.5).length() <= 0.5
    if kind == "square":
        return x >= 0.06 and x <= 0.94 and y >= 0.06 and y <= 0.94
    var poly: Array = SHAPE_POLY.get(kind, [])
    var inside := false
    var j := poly.size() - 1
    for i in poly.size():
        var a: Array = poly[i]
        var b: Array = poly[j]
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            inside = not inside
        j = i
    return inside
const SHAPE_POLY := {
    "triangle": [[0.5, 0.04], [0.97, 0.94], [0.03, 0.94]],
    "diamond": [[0.5, 0.0], [1.0, 0.5], [0.5, 1.0], [0.0, 0.5]],
    "hexagon": [[0.25, 0.06], [0.75, 0.06], [1.0, 0.5], [0.75, 0.94], [0.25, 0.94], [0.0, 0.5]],
    "pentagon": [[0.5, 0.0], [1.0, 0.38], [0.81, 1.0], [0.19, 1.0], [0.0, 0.38]],
}
static func shape_mark(kind: String, col: Color, n: int) -> Texture2D: # tribe shape with a 2 px dark outline
    var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
    img.fill(Color(0, 0, 0, 0))
    var dark := Color(0.05, 0.05, 0.08, 0.95)
    var ins := 2.0 / float(n)
    for py in n:
        for px in n:
            var x := (float(px) + 0.5) / float(n)
            var y := (float(py) + 0.5) / float(n)
            if _in_shape(kind, x, y):
                var cx := 0.5 + (x - 0.5) / (1.0 - 2.0 * ins)
                var cy := 0.5 + (y - 0.5) / (1.0 - 2.0 * ins)
                img.set_pixel(px, py, col if _in_shape(kind, cx, cy) else dark)
    return ImageTexture.create_from_image(img)

func _foot_marks(s: Sprite3D, c: Dictionary, level: int, tall: float) -> void:
    var sp: Array = TH.TRIBE_SHAPE.get(c.get("tribe"), ["square", "mute"])
    var star := Label3D.new()
    star.text = "★".repeat(maxi(1, level))
    star.font = TH.font("body")
    star.font_size = 64
    star.outline_size = 14
    star.modulate = Color(1.0, 0.85, 0.3)
    star.outline_modulate = Color(0.05, 0.04, 0.02, 0.95)
    star.pixel_size = FOOT_PX
    star.shaded = false
    star.double_sided = true
    star.alpha_cut = Label3D.ALPHA_CUT_DISCARD
    star.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR
    star.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
    var sw := 0.06 # gap between shape and stars
    var shp := Sprite3D.new()
    shp.texture = shape_mark(sp[0], TH.c(sp[1]), 16)
    shp.pixel_size = 0.16 / 16.0
    shp.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
    shp.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
    shp.shaded = false
    shp.double_sided = true
    var star_w := 64.0 * 0.82 * float(maxi(1, level)) * FOOT_PX
    var total := 0.16 + sw + star_w
    var y := -tall / 2.0 + 0.1
    shp.position = Vector3(-total / 2.0 + 0.08, y, 0.04)
    star.position = Vector3(-total / 2.0 + 0.16 + sw, y, 0.04)
    star.offset = Vector2(0, 0)
    s.add_child(shp)
    s.add_child(star)

func show_group(group: String) -> void:"""),
])
patch('scripts/ui/prep.gd', [
# board cell: no 2D badge row any more (marks live in the 3D scene)
("""        var mon0 := UV.badges(c, int(u["level"]), 14.0)
        mon0.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
        v.add_child(mon0)""", """        pass # R7: tribe + stars are 3D foot marks now (stage3d._foot_marks)"""),
# shop card: stats row under the picture
("""    v.add_child(top)
    var gap := Control.new()
    gap.size_flags_vertical = Control.SIZE_EXPAND_FILL
    gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
    v.add_child(gap)""", """    v.add_child(top)
    var gap := Control.new()
    gap.size_flags_vertical = Control.SIZE_EXPAND_FILL
    gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
    v.add_child(gap)
    var stt := HBoxContainer.new() # R7: level-1 attack · HP · cooldown
    stt.name = "Stats"
    stt.alignment = BoxContainer.ALIGNMENT_CENTER
    stt.add_theme_constant_override("separation", 7)
    stt.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var cd0: float = float(c["cdMs"][0]) / 1000.0
    for it in [["atk", _n(c["atk"][0]), Color("#f08a5d")], ["hp", _n(c["hp"][0]), Color("#79c98a")], ["cd", ("%.1f" % cd0).trim_suffix(".0"), Color("#8cc0de")]]:
        var gi := HBoxContainer.new()
        gi.add_theme_constant_override("separation", 2)
        gi.mouse_filter = Control.MOUSE_FILTER_IGNORE
        var ic: Control = load("res://scripts/ui/stat_icon.gd").new()
        ic.kind = it[0]
        ic.col = it[2]
        ic.custom_minimum_size = Vector2(10, 10)
        ic.size_flags_vertical = Control.SIZE_SHRINK_CENTER
        ic.mouse_filter = Control.MOUSE_FILTER_IGNORE
        gi.add_child(ic)
        var nl := TH.label(it[1], 12, "ink", "body_b")
        nl.mouse_filter = Control.MOUSE_FILTER_IGNORE
        gi.add_child(nl)
        stt.add_child(gi)
    v.add_child(stt)"""),
])
patch('scripts/ui/prep.gd', [('"lane": lane, "c": app.cm[u["id"]]}', '"lane": lane, "c": app.cm[u["id"]], "level": int(u["level"])}')])
print('ok')
