# set 268 round 34 — owner after R33: (1) the white line over every group sits at ONE height (the biggest head's),
# not stepping down with the head size · (2) countdown label = the match clock's font + colour + outline
# (IBM Plex Mono Medium, #9fadb6 a0.95, outline #16202a a0.8 size 4; battle.gd clock) · (3) decoration samples,
# env S268DECO: 0 = number only · 1 = " วิ" after the number (same as the clock text "{t} วิ") · 2 = small clock icon
# (TH.uicon("cd"), the Kenney icon the shop uses, tinted the clock colour) before the number · 3 = dark faded plate
# under the number. Icons for characters without a hub icon (cooldown test team) fall back to the same tribe's first icon.
# usage: python s268r34-patch-label.py <g268>   (after s268r33)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)
if "s268r34" not in s:
    rep('''extends Control
''', '''extends Control
const TH := preload("res://scripts/ui/theme.gd") # s268r34
''')
    rep('''		var gr_r := float(gr[3])
		var a := float(gr[0]) - gr_r - 4.0; var b := float(gr[1]) + gr_r + 4.0
		if float(gr[1]) > float(gr[0]):
			draw_rect(Rect2(a, y - gr_r - 8.0, b - a, 2.0 * gr_r + 16.0), Color(1, 1, 1, 0.10), true)
		draw_polyline(PackedVector2Array([Vector2(a, y - gr_r - 8.0), Vector2(b, y - gr_r - 8.0)]), Color(1, 1, 1, 0.8), 1.5)
		var tt := "%.1f" % (float(gr[2]) / 10.0)
		var lp := Vector2(a + 1.0, y - gr_r - 11.0)
		draw_string_outline(bf, lp, tt, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, 3, Color(0.09, 0.13, 0.16, 0.9))
		draw_string(bf, lp, tt, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(1, 1, 1))''', '''		var gr_r := float(gr[3])
		var a := float(gr[0]) - gr_r - 4.0; var b := float(gr[1]) + gr_r + 4.0
		var ly := y - 20.0 - 8.0 # s268r34: one line height for every group (the biggest head's)
		if float(gr[1]) > float(gr[0]):
			draw_rect(Rect2(a, ly, b - a, (y + gr_r + 8.0) - ly), Color(1, 1, 1, 0.10), true)
		draw_polyline(PackedVector2Array([Vector2(a, ly), Vector2(b, ly)]), Color(1, 1, 1, 0.8), 1.5)
		_draw_count(Vector2(a + 1.0, ly - 3.0), "%.1f" % (float(gr[2]) / 10.0))''')
    rep('''func _draw_queue3(rows: Array) -> void:''', '''const CLK_COL := Color("#9fadb6", 0.95) # s268r34: = the match clock (battle.gd)
const CLK_OUT := Color("#16202a", 0.8)
func _draw_count(lp: Vector2, tt: String) -> void: # baseline-left at lp
	var mf: Font = TH.font("mono")
	var fs := 11
	var deco := OS.get_environment("S268DECO")
	var x := lp.x
	if deco == "2": # small clock icon before the number
		var ic: Texture2D = TH.uicon("cd")
		var isz := 10.0
		if ic != null:
			draw_texture_rect(ic, Rect2(Vector2(x, lp.y - isz + 1.0), Vector2(isz, isz)), false, CLK_COL)
		x += isz + 2.0
	var txt := tt + (" วิ" if deco == "1" else "")
	var tw := mf.get_string_size(tt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	if deco == "1":
		tw += ThemeDB.fallback_font.get_string_size(" วิ", HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	if deco == "3": # dark faded plate under the number
		var pr := Rect2(Vector2(x - 3.0, lp.y - fs + 1.0), Vector2(tw + 6.0, fs + 3.0))
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color("#16202a", 0.55)
		sb.set_corner_radius_all(3)
		draw_style_box(sb, pr)
	draw_string_outline(mf, Vector2(x, lp.y), tt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 4, CLK_OUT)
	draw_string(mf, Vector2(x, lp.y), tt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, CLK_COL)
	if deco == "1": # Thai unit in the body font (mono has no Thai), same colour + outline
		var ux := x + mf.get_string_size(tt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		var tf: Font = TH.font("body")
		draw_string_outline(tf, Vector2(ux, lp.y), " วิ", HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 4, CLK_OUT)
		draw_string(tf, Vector2(ux, lp.y), " วิ", HORIZONTAL_ALIGNMENT_LEFT, -1, fs, CLK_COL)

func _draw_queue3(rows: Array) -> void:''')
    rep('''		var fp0 := ProjectSettings.globalize_path("res://tests/s268icons/%s.png" % str(view.units[uid]["id"]))
		if FileAccess.file_exists(fp0):''', '''		var fp0 := ProjectSettings.globalize_path("res://tests/s268icons/%s.png" % str(view.units[uid]["id"]))
		if not FileAccess.file_exists(fp0): # s268r34: no hub icon yet -> same tribe's first icon
			fp0 = ProjectSettings.globalize_path("res://tests/s268icons/%s-1.png" % str(view.units[uid]["id"]).substr(0, 2))
		if FileAccess.file_exists(fp0):''')
    open(p, "w", encoding="utf-8").write(s)
print("ok")
