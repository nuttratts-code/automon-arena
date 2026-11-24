#!/usr/bin/env python3
# set 295 round 35s9: on-unit tag colour + frame variants, env S295V=a..h (default = a = round 35s8c)
# run after s294r35s8c-patch.py:  python -I s295r35s9-patch.py <g286 path>
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")

old_const = '''	"armhit": Color("#5d7f99"), "heal": Color("#43904c")}   # s294 r35s8b: one colour per kind (own palette, no icons)
'''
new_const = old_const + '''const TAG_COL2 := {"atk": Color("#c8384f"), "multi": Color("#8a63d2"), "burn": Color("#e58a1f"), "shock": Color("#d8b81c"),
	"armhit": Color("#4f86b0"), "heal": Color("#3f9e58")}   # s295 r35s9: wider hue gaps (atk rose-red vs burn orange)
const TAG_COL3 := {"atk": Color("#ff6b6b"), "multi": Color("#b99cff"), "burn": Color("#ffa04a"), "shock": Color("#ffe066"),
	"armhit": Color("#8cc4ef"), "heal": Color("#7ee08f")}   # s295 r35s9: light tints for coloured text / stripes on a dark plate
'''
assert s.count(old_const) == 1, "const"
s = s.replace(old_const, new_const)

old = '''		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(TAG_COL.get(have[k][0], INK), 0.92)
		sb.set_corner_radius_all(1)
		if on or nc == 3:   # s294 r35s8c (owner): white frame on every tag, picked = 2 px
			sb.border_color = Color(1, 1, 1, 0.95); sb.set_border_width_all(2 if on and nc == 3 else 1)
		draw_style_box(sb, tr)
		var t := String(have[k][1])
		var tx := tr.position.x + (tr.size.x - mf.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x) * 0.5
		draw_string_outline(mf, Vector2(tx, tr.position.y + 7.5), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 3, Color(0.05, 0.06, 0.08, 0.75))
		draw_string(mf, Vector2(tx, tr.position.y + 7.5), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 1, 1, 0.98))
'''
new = '''		var t := String(have[k][1])
		var tx := tr.position.x + (tr.size.x - mf.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x) * 0.5
		var kd: String = have[k][0]
		var tcol := Color(1, 1, 1, 0.98)
		var ocol := Color(0.05, 0.06, 0.08, 0.75)
		var V := OS.get_environment("S295V")
		var sb := StyleBoxFlat.new()
		sb.set_corner_radius_all(1)
		match V:
			"b":   # new hues + white frame
				sb.bg_color = Color(TAG_COL2.get(kd, INK), 0.92)
				sb.border_color = Color(1, 1, 1, 0.95); sb.set_border_width_all(2 if on else 1)
			"c":   # new hues, no frame (picked = white frame)
				sb.bg_color = Color(TAG_COL2.get(kd, INK), 0.92)
				if on: sb.border_color = Color(1, 1, 1, 0.95); sb.set_border_width_all(1)
			"d":   # new hues + dark frame (picked = white)
				sb.bg_color = Color(TAG_COL2.get(kd, INK), 0.92)
				sb.border_color = Color(1, 1, 1, 0.95) if on else Color(0.06, 0.07, 0.09, 0.9); sb.set_border_width_all(1)
			"e":   # new hues + lighter same-hue frame (picked = white)
				sb.bg_color = Color(TAG_COL2.get(kd, INK), 0.92)
				sb.border_color = Color(1, 1, 1, 0.95) if on else Color(TAG_COL3.get(kd, INK), 0.95); sb.set_border_width_all(1)
			"f":   # muted hues, no frame, darker bottom edge (picked = white frame)
				var base: Color = TAG_COL2.get(kd, INK)
				sb.bg_color = Color(base.darkened(0.25), 0.90)
				sb.border_color = Color(1, 1, 1, 0.95) if on else Color(base.darkened(0.6), 0.9)
				if on: sb.set_border_width_all(1)
				else: sb.border_width_bottom = 1
			"g":   # dark slate plate, coloured number (picked = white frame)
				sb.bg_color = Color(TH.R23_INK, 0.82)
				tcol = Color(TAG_COL3.get(kd, INK), 1.0); ocol = Color(0.03, 0.04, 0.05, 0.6)
				if on: sb.border_color = Color(1, 1, 1, 0.95); sb.set_border_width_all(1)
			"h":   # dark slate plate + coloured left stripe, white number (picked = white frame)
				sb.bg_color = Color(TH.R23_INK, 0.82)
				sb.border_color = Color(TAG_COL2.get(kd, INK), 1.0); sb.border_width_left = 3
				if on:
					sb.border_color = Color(1, 1, 1, 0.95); sb.set_border_width_all(1); sb.border_width_left = 3
				tx += 1.0
			_:   # a = round 35s8c
				sb.bg_color = Color(TAG_COL.get(kd, INK), 0.92)
				if on or nc == 3:   # s294 r35s8c (owner): white frame on every tag, picked = 2 px
					sb.border_color = Color(1, 1, 1, 0.95); sb.set_border_width_all(2 if on and nc == 3 else 1)
		draw_style_box(sb, tr)
		draw_string_outline(mf, Vector2(tx, tr.position.y + 7.5), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 3, ocol)
		draw_string(mf, Vector2(tx, tr.position.y + 7.5), t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, tcol)
'''
assert s.count(old) == 1, "draw block"
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("ok s295r35s9")
