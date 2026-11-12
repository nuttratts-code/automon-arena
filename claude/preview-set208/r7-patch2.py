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

# R7b: taller shop cards (dock top 62 → 40), odds line + arena bottom move up with it; stats a bit bigger
patch('scripts/ui/prep.gd', [
("""    odds_btn.offset_top = 34.0
    odds_btn.offset_bottom = 62.0""", """    odds_btn.offset_top = 12.0
    odds_btn.offset_bottom = 40.0"""),
("""    dock.offset_left = -282.0
    dock.offset_right = 282.0""", """    dock.offset_left = -282.0
    dock.offset_right = 282.0
    dock.offset_top = 40.0 # R7: taller cards (room for the stats row)
    field.offset_bottom -= 22.0"""),
("""        ic.custom_minimum_size = Vector2(10, 10)""", """        ic.custom_minimum_size = Vector2(12, 12)"""),
("""        var nl := TH.label(it[1], 12, "ink", "body_b")""", """        var nl := TH.label(it[1], 14, "ink", "body_b")"""),
])
print('ok')
