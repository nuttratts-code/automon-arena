# R35g: owner "HP bar much thinner, remove the number" -> HP_H 8 -> 3, no HP number (no block lines either, as r35e).
import sys, io
T = sys.argv[1] + '/scripts/ui/s286_team.gd'
s = io.open(T, encoding='utf-8').read()
a0 = "\tvar mf: Font = TH.font(\"mono\")\n\tvar hs := short_num(ceilf(hp))\n"
i = s.find(a0); j = s.find("Color(1, 1, 1, 0.98))\n", i)
if i < 0 or j < 0: raise SystemExit('number block not found')
s = s[:i] + s[j + len("Color(1, 1, 1, 0.98))\n"):]
for a, b in [("const HP_H := 8.0   # r35e: room for the HP number", "const HP_H := 3.0   # r35g: thin bar, no number"),
             ("# r35e: no block lines; HP left = white number at the left inside the bar", "# r35g: thin bar, no lines, no number"),
             ("# HP bar (r35e: no lines, white HP number at the left)", "# HP bar (r35g: thin, no lines, no number)")]:
    if a not in s: raise SystemExit('anchor not found: %r' % a)
    s = s.replace(a, b, 1)
io.open(T, 'w', encoding='utf-8', newline='\n').write(s)
print('r35g ok')
