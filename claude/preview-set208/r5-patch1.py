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

# R5: UI temperature via env UI_TEMP (warm|cool) + cut-corner motif on every box
patch('scripts/ui/theme.gd', [
("""static func c(name: String) -> Color:
    var v: Variant""",
"""const R5 := {"warm": {"panel": "#3b2716", "soft": "#4a3220", "line": "#b8893e", "card": "#4a3220"},
    "cool": {"panel": "#1c2a33", "soft": "#253743", "line": "#7fa3b5", "card": "#253743"}}
static func c(name: String) -> Color:
    var tmp := OS.get_environment("UI_TEMP")
    if dark and R5.has(tmp) and R5[tmp].has(name):
        return Color.html(R5[tmp][name])
    var v: Variant"""),
("""    s.set_corner_radius_all(radius)""",
"""    s.set_corner_radius_all(mini(radius, 7))
    s.corner_detail = 1 # R5 motif: cut corners (chamfer) on every box"""),
("""    s.anti_aliasing = true
    return s""",
"""    s.anti_aliasing = false
    return s"""),
])
patch('scripts/ui/prep.gd', [
("const GLASS := 0.72", "const GLASS := 0.94"),
])
print('ok')
