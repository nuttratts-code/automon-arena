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

patch('scripts/ui/theme.gd', [
('"card": "#4a3220"}', '"card": "#4a3220", "accent": "#d9a441", "on-accent": "#2a1a0c"}'),
('"card": "#253743"}', '"card": "#253743", "accent": "#8cc0de", "on-accent": "#13212a"}'),
# fight button = a plate lit from top-left: 1px light top/left edge, 4px dark bottom/right edge
("""        var s := box(c("accent"), c("accent"), 10 if big else 8)""",
"""        var s := box(c("accent"), c("accent").darkened(0.45), 10 if big else 8)
        s.border_width_bottom = 4
        s.border_width_right = 2"""),
])
print('ok')
