# R35f: owner "smaller, far too big" -> bottom cards ~0.7x: height 40->28, icon diamond 14->10, chip icon 11->9, chip font 9->8, width 60-84.
import sys, io
T = sys.argv[1] + '/scripts/ui/s286_team.gd'
s = io.open(T, encoding='utf-8').read()
pairs = [
 ("const ISZ := 11.0", "const ISZ := 9.0"), ("const CARD_H := 40.0", "const CARD_H := 28.0"),
 ("const CARD_MIN := 84.0", "const CARD_MIN := 60.0"), ("const CARD_MAX := 110.0", "const CARD_MAX := 84.0"),
 ("Vector2(19.0, r.size.y * 0.5)", "Vector2(14.0, r.size.y * 0.5)"), ("var dr := 14.0", "var dr := 10.0"),
 ("var x0 := r.position.x + 38.0", "var x0 := r.position.x + 27.0"), ("var y := r.position.y + 6.0", "var y := r.position.y + 3.5"),
 ("x = x0; y += 15.0", "x = x0; y += 11.5"), ("if y > r.end.y - 10.0: break", "if y > r.end.y - 9.0: break"),
 ("r.position.y - 13.0), it[0]", "r.position.y - 12.0), it[0]"), ("var lo := 38.0 + 4.0", "var lo := 27.0 + 3.0"),
 ("HORIZONTAL_ALIGNMENT_LEFT, -1, 9).x", "HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x"), ("\tvar fs := 9\n", "\tvar fs := 8\n"),
 ("Rect2(p.x - 2.0, p.y - 1.0, w + 5.0, 11.0)", "Rect2(p.x - 2.0, p.y - 1.0, w + 5.0, 10.0)"),
]
for a, b in pairs:
    if a not in s: raise SystemExit('anchor not found: %r' % a)
    s = s.replace(a, b, 1)
s = s.replace("Vector2(p.x + gw + 2.0, p.y + 8.0)", "Vector2(p.x + gw + 2.0, p.y + 7.0)")
io.open(T, 'w', encoding='utf-8', newline='\n').write(s)
print('r35f ok')
