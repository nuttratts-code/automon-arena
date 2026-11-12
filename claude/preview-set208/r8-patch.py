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

# R8 (owner, 12 Nov): bigger foot marks, tribe shape = star size · bigger picture on shop cards
patch('scripts/ui/stage3d.gd', [
("const FOOT_PX := 0.0042", "const FOOT_PX := 0.0058"),
("""    shp.pixel_size = 0.16 / 16.0""", """    shp.pixel_size = MARK / 16.0"""),
("""    var total := 0.16 + sw + star_w
    var y := -tall / 2.0 + 0.1
    shp.position = Vector3(-total / 2.0 + 0.08, y, 0.04)
    star.position = Vector3(-total / 2.0 + 0.16 + sw, y, 0.04)""",
"""    var total := MARK + sw + star_w
    var y := -tall / 2.0 + 0.14
    shp.position = Vector3(-total / 2.0 + MARK / 2.0, y, 0.04)
    star.position = Vector3(-total / 2.0 + MARK + sw, y - MARK * 0.06, 0.04)"""),
("const FOOT_PX := 0.0058", "const FOOT_PX := 0.0058\nconst MARK := 0.34 # tribe shape side = the star glyph's height"),
])
patch('scripts/ui/prep.gd', [
("""    var mon := UV.make(c, 0, 34, false)
    mon.size_flags_horizontal = Control.SIZE_EXPAND | Control.SIZE_SHRINK_CENTER""",
"""    var mon := UV.make(c, 0, 47, false) # R8: bigger picture
    mon.size_flags_horizontal = Control.SIZE_EXPAND | Control.SIZE_SHRINK_CENTER"""),
])
print('ok')
