# set 268 round 31 — owner after R30: "the top queue is too big · no feet bars · show EVERY unit on top in blocks, the one
# closest to acting on the left; after acting it rejoins the line by its cooldown (a short cooldown can cut in ahead of
# units already waiting)". Env S268H=6: the r30 queue with all living units (sorted by real time left, so rejoining by
# cooldown is automatic), smaller heads (r 14, was 20), block step 40 (was 60), stack overlap 9, opened = 4 px apart;
# no feet bars. usage: python s268r31-patch-allqueue.py <g268>   (after s268r30)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()

def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)

if "s268r31" not in s:
    rep('func _draw_queue2(rows: Array) -> void:', 'var _qn := 6      # s268r31: heads shown\nvar _qr := 20.0   # head radius\nvar _qstep := 60.0\nvar _qov := 12.0\n\nfunc _draw_queue2(rows: Array) -> void:')
    rep('	var nq := mini(6, sorted.size())\n	var r := 20.0\n	var gin := 47.0 if _all else 12.0 # inside a stack: opened = frames 4 px apart (diamond 2*(r+2.5) = 45)',
        '	var nq := mini(_qn, sorted.size())\n	var r := _qr\n	var gin := (2.0 * (r + 3.5) + 4.0) if _all else _qov # inside a stack: opened = frames 4 px apart')
    rep('		if i > 0: xs += (gin if tick == prev_tick else 60.0)', '		if i > 0: xs += (gin if tick == prev_tick else _qstep)')
    rep('_stk.append([Rect2(float(st[0]) - 26.0, y - 26.0, float(st[1]) - float(st[0]) + 52.0, 52.0)',
        '_stk.append([Rect2(float(st[0]) - r - 6.0, y - r - 6.0, float(st[1]) - float(st[0]) + 2.0 * r + 12.0, 2.0 * r + 12.0)')
    rep('''		if hm == "5": # s268r30''', '''		if hm == "6": # s268r31: every unit, smaller, no feet bars
			_qn = 99; _qr = 14.0; _qstep = 40.0; _qov = 9.0
			if OS.get_environment("S268ALL") == "1": _all = true
			_draw_queue2(rows)
		if hm == "5": # s268r30''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
