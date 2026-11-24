# set 299 r35z7 (after s299r35z6): dynamic skill font — normal 8 px (pitch 9, 4 lines); a long skill shrinks
# to 7 / 6 / 5 px (pitch = size + 1) until all its lines fit the 4-line height (36 px) on ONE page.
# Only if even 5 px does not fit, it pages as before (4 lines of 8 px per page).
import sys
p = sys.argv[1] if len(sys.argv) > 1 else r"D:\GitHub\automon-scratch\g286\scripts\ui\s286_team.gd"
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:70])
    s = s.replace(a, b)

rep('''	var lines := []
	if groups is Array:
		for g in groups:
			var on: bool = g.get("lv") == null or (g["lv"] is Array and g["lv"].has(float(lv)))
			if not on: continue
			var txts: Array = g["text"]
			var tx299 := String(txts[clampi(lv - 1, 0, txts.size() - 1)])
			if OS.get_environment("S299LONG") == "1": tx299 = tx299 + " " + tx299   # mock: long skill
			for ln in _wrap299(tx299, 8, RT - L3 - 16.0): lines.append(ln)''',
'''	var sktx := []
	if groups is Array:
		for g in groups:
			var on: bool = g.get("lv") == null or (g["lv"] is Array and g["lv"].has(float(lv)))
			if not on: continue
			var txts: Array = g["text"]
			var tx299 := String(txts[clampi(lv - 1, 0, txts.size() - 1)])
			if OS.get_environment("S299LONG") == "1": tx299 = tx299 + " " + tx299   # mock: long skill
			sktx.append(tx299)
	var skfs := 8   # s299 r35z7: dynamic font — shrink until the whole skill fits 4 normal lines (36 px)
	var lines := []
	var skper := 4
	for fs in [8, 7, 6, 5]:
		lines = []
		for t in sktx:
			for ln in _wrap299(String(t), fs, RT - L3 - 16.0): lines.append(ln)
		skfs = fs
		skper = int(floor(36.0 / float(fs + 1)))
		if lines.size() <= skper: break
	if lines.size() > skper:   # still too long at 5 px → page at the normal size
		skfs = 8
		skper = 4
		lines = []
		for t in sktx:
			for ln in _wrap299(String(t), 8, RT - L3 - 16.0): lines.append(ln)''')
rep('\tvar chunks := maxi(1, int(ceil(float(lines.size()) / 4.0)))',
    '\tvar chunks := maxi(1, int(ceil(float(lines.size()) / float(skper))))')
rep('''		for i in range(pg * 4, mini(lines.size(), pg * 4 + 4)):
			_dtxt(Vector2(L3, top + 9.0 + float(i - pg * 4) * 9.0), String(lines[i]), 8, ink)''',
'''		for i in range(pg * skper, mini(lines.size(), pg * skper + skper)):
			_dtxt(Vector2(L3, top + float(skfs + 1) + float(i - pg * skper) * float(skfs + 1)), String(lines[i]), skfs, ink)''')
open(p, "w", encoding="utf-8").write(s)
print("ok")
