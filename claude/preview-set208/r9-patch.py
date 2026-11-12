import sys, re
g = sys.argv[1]
def patch(path, pairs):
    p = g + '/' + path
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        a = a.replace('    ', '\t'); b = b.replace('    ', '\t')
        assert a in s, (path, a)
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8', newline='\n').write(s)

# R9 (owner, 12 Nov): tribe mark level with the stars · bench picture = shop picture size · try stats on bench rows
patch('scripts/ui/stage3d.gd', [
("""    shp.position = Vector3(-total / 2.0 + MARK / 2.0, y, 0.04)
    star.position = Vector3(-total / 2.0 + MARK + sw, y - MARK * 0.06, 0.04)""",
"""    shp.position = Vector3(-total / 2.0 + MARK / 2.0, y - MARK * FOOT_DY, 0.04)
    star.position = Vector3(-total / 2.0 + MARK + sw, y, 0.04)"""),
("const MARK := 0.34", "const FOOT_DY := 0.0 # R9: shape drop vs the stars' line (tuned on the shot)\nconst MARK := 0.34"),
])

# shop: the R7 stats block → one call
p = g + '/scripts/ui/prep.gd'
s = open(p, encoding='utf-8').read()
m = re.search(r'\tvar stt := HBoxContainer\.new\(\) # R7.*?\n\tv\.add_child\(stt\)\n', s, re.S)
assert m
s = s[:m.start()] + '\tv.add_child(stats_row(c, 1, 14))\n' + s[m.end():]
open(p, 'w', encoding='utf-8', newline='\n').write(s)

patch('scripts/ui/prep.gd', [
("""        _fill_unit(cells["n_%d" % i], {"at": "bench", "i": float(i)}, 34.0)""",
"""        _fill_unit(cells["n_%d" % i], {"at": "bench", "i": float(i)}, 47.0) # R9: same as the shop picture"""),
("""        col.add_child(UV.tribes_stars(c, int(u["level"]), 11.0, true))""",
"""        col.add_child(UV.tribes_stars(c, int(u["level"]), 11.0, true))
        if BENCH_STATS:
            col.add_child(stats_row(c, int(u["level"]), 12))"""),
("""func _fill_unit(cell: Control, ref: Dictionary, px: float) -> void:""",
"""const BENCH_STATS := true
func stats_row(c: Dictionary, level: int, fs: int) -> HBoxContainer: # R7/R9: attack · HP · cooldown at that level
    var li := clampi(level, 1, 3) - 1
    var stt := HBoxContainer.new()
    stt.name = "Stats"
    stt.alignment = BoxContainer.ALIGNMENT_CENTER if fs >= 14 else BoxContainer.ALIGNMENT_BEGIN
    stt.add_theme_constant_override("separation", 7 if fs >= 14 else 5)
    stt.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var cd0: float = float(c["cdMs"][li]) / 1000.0
    for it in [["atk", _n(c["atk"][li]), Color("#f08a5d")], ["hp", _n(c["hp"][li]), Color("#79c98a")], ["cd", ("%.1f" % cd0).trim_suffix(".0"), Color("#8cc0de")]]:
        var gi := HBoxContainer.new()
        gi.add_theme_constant_override("separation", 2)
        gi.mouse_filter = Control.MOUSE_FILTER_IGNORE
        var ic: Control = load("res://scripts/ui/stat_icon.gd").new()
        ic.kind = it[0]
        ic.col = it[2]
        ic.custom_minimum_size = Vector2(12, 12) if fs >= 14 else Vector2(10, 10)
        ic.size_flags_vertical = Control.SIZE_SHRINK_CENTER
        ic.mouse_filter = Control.MOUSE_FILTER_IGNORE
        gi.add_child(ic)
        var nl := TH.label(it[1], fs, "ink", "body_b")
        nl.mouse_filter = Control.MOUSE_FILTER_IGNORE
        gi.add_child(nl)
        stt.add_child(gi)
    return stt

func _fill_unit(cell: Control, ref: Dictionary, px: float) -> void:"""),
])
print('ok')
# R9b: 47 + bench stats overflowed the bench box (5 rows) → both pictures 42, no stats on the bench, shape 5 % lower
patch('scripts/ui/prep.gd', [
('{"at": "bench", "i": float(i)}, 47.0) # R9: same as the shop picture', '{"at": "bench", "i": float(i)}, 42.0) # R9: same as the shop picture'),
('UV.make(c, 0, 47, false) # R8', 'UV.make(c, 0, 42, false) # R8/R9'),
('const BENCH_STATS := true', 'const BENCH_STATS := false # R9: a 3rd line does not fit 5 bench rows'),
])
patch('scripts/ui/stage3d.gd', [('const FOOT_DY := 0.0 #', 'const FOOT_DY := 0.05 #')])
print('ok b')
