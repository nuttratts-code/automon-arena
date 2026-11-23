# R35e (set 286 follow-up, after r35d): owner — "cards narrower and closer · big numbers short (1000 = 1K, 1000000 = 1M) ·
# HP bar: no block lines, show the HP left as a white number at the left inside the bar" (reverses r35b B "no number").
import sys, io
G = sys.argv[1]
T = G + '/scripts/ui/s286_team.gd'
s = io.open(T, encoding='utf-8').read()


def rep(a, b):
    global s
    if a not in s:
        raise SystemExit('anchor not found: %r' % a[:70])
    s = s.replace(a, b, 1)


# --- HP bar: taller, no block lines, white HP number left inside
rep("\tdraw_rect(Rect2(x0 - 1.0, y0 - 1.0, BAR_W + 2.0, 9.0), Color(OUT, 0.85))\n"
    "\tdraw_rect(Rect2(x0, y0, BAR_W, 4.0), HP_BG)\n"
    "\tdraw_rect(Rect2(x0, y0, BAR_W * fr, 4.0), HP_COL if fr > 0.3 else HP_LOW)\n"
    "\tvar nb := int(ceil(mx / HP_BLOCK))\n"
    "\tfor k in range(1, nb):   # block lines every 100 HP\n"
    "\t\tvar bx := roundf(x0 + BAR_W * (float(k) * HP_BLOCK / mx))\n"
    "\t\tdraw_rect(Rect2(bx, y0, 1.0, 4.0), Color(OUT, 0.9))\n",
    "\t# r35e: no block lines; HP left = white number at the left inside the bar\n"
    "\tdraw_rect(Rect2(x0 - 1.0, y0 - 1.0, BAR_W + 2.0, HP_H + 5.0), Color(OUT, 0.85))\n"
    "\tdraw_rect(Rect2(x0, y0, BAR_W, HP_H), HP_BG)\n"
    "\tdraw_rect(Rect2(x0, y0, roundf(BAR_W * fr), HP_H), HP_COL if fr > 0.3 else HP_LOW)\n"
    "\tvar mf: Font = TH.font(\"mono\")\n"
    "\tvar hs := short_num(ceilf(hp))\n"
    "\tvar tp := Vector2(x0 + 2.0, y0 + HP_H - 1.5)\n"
    "\tdraw_string_outline(mf, tp, hs, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, 3, Color(OUT, 0.95))\n"
    "\tdraw_string(mf, tp, hs, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color(1, 1, 1, 0.98))\n")
rep("\tdraw_rect(Rect2(x0, y0 + 5.0, BAR_W, 2.0), HP_BG)\n", "\tdraw_rect(Rect2(x0, y0 + HP_H + 1.0, BAR_W, 2.0), HP_BG)\n")
rep("\t\tdraw_rect(Rect2(x0, y0 + 5.0, BAR_W * cf, 2.0),", "\t\tdraw_rect(Rect2(x0, y0 + HP_H + 1.0, BAR_W * cf, 2.0),")
rep("const BAR_W := 46.0\n", "const BAR_W := 46.0\nconst HP_H := 8.0   # r35e: room for the HP number\nconst CARD_MIN := 84.0\nconst CARD_MAX := 110.0\n")
rep("const GAP := 6.0\n", "const GAP := 4.0   # r35e: cards closer\n")

# --- cards: one width for all = what the busiest card needs to fit its values in 2 rows, clamped; packed from the left
rep("\tvar w := (band.size.x - GAP * float(n - 1)) / float(n)\n",
    "\tvar w := CARD_MIN\n"
    "\tfor uid in _order:\n"
    "\t\tif view.units.has(uid): w = maxf(w, _need_w(view.units[uid]))\n"
    "\tw = minf(minf(w, CARD_MAX), (band.size.x - GAP * float(n - 1)) / float(n))\n")
rep("func _haves(v: Dictionary) -> Array:",
    "func _need_w(v: Dictionary) -> float:   # r35e: narrowest card that fits this unit's values in 2 rows\n"
    "\tvar its := _haves(v)\n"
    "\tvar ws: Array = []\n"
    "\tfor it in its: ws.append(_chip_w(it[0], it[1]) + 6.0)\n"
    "\tvar lo := 38.0 + 4.0\n"
    "\tfor cw in range(int(CARD_MIN), int(CARD_MAX) + 1, 2):\n"
    "\t\tvar avail := float(cw) - lo\n"
    "\t\tvar rows := 1\n"
    "\t\tvar x := 0.0\n"
    "\t\tvar ok := true\n"
    "\t\tfor wv in ws:\n"
    "\t\t\tif x + wv - 6.0 > avail and x > 0.0:\n"
    "\t\t\t\trows += 1; x = 0.0\n"
    "\t\t\tif wv - 6.0 > avail: ok = false\n"
    "\t\t\tx += wv\n"
    "\t\tif ok and rows <= 2: return float(cw)\n"
    "\treturn CARD_MAX\n\n"
    "func _haves(v: Dictionary) -> Array:")

# --- short numbers: 999 · 1.2K · 12K · 1.2M · 12M (seconds and % keep their own format)
rep("static func R_num(x: float) -> String:\n",
    "static func short_num(x: float) -> String:\n"
    "\tvar ax := absf(x)\n"
    "\tvar sg := \"-\" if x < 0.0 else \"\"\n"
    "\tif ax < 1000.0: return sg + R_raw(ax)\n"
    "\tfor u in [[1e9, \"B\"], [1e6, \"M\"], [1e3, \"K\"]]:\n"
    "\t\tif ax >= float(u[0]):\n"
    "\t\t\tvar q := ax / float(u[0])\n"
    "\t\t\tif q < 9.95:\n"
    "\t\t\t\tvar t := \"%.1f\" % (floorf(q * 10.0) / 10.0)\n"
    "\t\t\t\tif t.ends_with(\".0\"): t = t.substr(0, t.length() - 2)\n"
    "\t\t\t\treturn sg + t + String(u[1])\n"
    "\t\t\treturn sg + str(int(floorf(q))) + String(u[1])\n"
    "\treturn sg + R_raw(ax)\n\n"
    "static func R_num(x: float) -> String:\n"
    "\treturn short_num(x)\n\n"
    "static func R_raw(x: float) -> String:\n")
io.open(T, 'w', encoding='utf-8', newline='\n').write(s)
print('r35e patch ok')
