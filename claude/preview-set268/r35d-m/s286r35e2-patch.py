# R35e2: each card as wide as its own values need (min 84, max 110), width only grows during a match (no jitter), packed from the left.
import sys, io
T = sys.argv[1] + '/scripts/ui/s286_team.gd'
s = io.open(T, encoding='utf-8').read()
pairs = [
 ("\tvar w := CARD_MIN\n\tfor uid in _order:\n\t\tif view.units.has(uid): w = maxf(w, _need_w(view.units[uid]))\n"
  "\tw = minf(minf(w, CARD_MAX), (band.size.x - GAP * float(n - 1)) / float(n))\n",
  "\tvar wmax := (band.size.x - GAP * float(n - 1)) / float(n)\n\tvar x := band.position.x\n"),
 ("\t\tvar r := Rect2(Vector2(band.position.x + float(i) * (w + GAP), band.position.y), Vector2(w, CARD_H))\n",
  "\t\tvar w := minf(maxf(float(_cw.get(uid, CARD_MIN)), _need_w(view.units[uid])), wmax)\n"
  "\t\t_cw[uid] = w\n"
  "\t\tvar r := Rect2(Vector2(x, band.position.y), Vector2(w, CARD_H))\n"
  "\t\tx += w + GAP\n"),
 ("var _ic_q: Array = []\n", "var _ic_q: Array = []\nvar _cw := {}   # r35e2: card width per uid (only grows during a match)\n"),
 ("func _sort_units() -> void:\n", "func _sort_units() -> void:\n\t_cw.clear()\n"),
 ("# HP bar (blocks of 100 HP, no number) + cooldown gauge", "# HP bar (r35e: no lines, white HP number at the left) + cooldown gauge"),
]
for a, b in pairs:
    if a not in s: raise SystemExit('anchor not found: %r' % a[:60])
    s = s.replace(a, b, 1)
io.open(T, 'w', encoding='utf-8', newline='\n').write(s)
print('r35e2 ok')
