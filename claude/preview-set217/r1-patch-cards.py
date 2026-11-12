# set 217 R1 sample: camera R5 values + painted cut-out cards (backdrop, standing stones, rocks, grass) around the 3D plaza.
# Sample hack only (ui-preview) — never paste into the real code.
import sys, re
g = sys.argv[1]
p = g + '/scripts/ui/stage3d.gd'
s = open(p, encoding='utf-8').read()
def rep(old, new):
    global s
    assert old in s, old
    s = s.replace(old, new, 1)
rep('const PITCH := 40.0', 'const PITCH := 22.0')
rep('const FOV := 34.0', 'const FOV := 26.0')
rep('const LANE_Z := [-1.4, 1.4]', 'const LANE_Z := [-2.3, 2.3]')
rep('return Vector3((-1.0 if side == 0 else 1.0) * float(COL_X[row]), 0.0, float(LANE_Z[lane]))',
    'return Vector3((-1.0 if side == 0 else 1.0) * (float(COL_X[row]) + (1.0 if lane == 0 else 0.0)), 0.0, float(LANE_Z[lane]))')
# hide the heavy far parts of the glb, keep the plaza + near ground, then add the cards
rep('''		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF # set 214: no shadowed sun in Compatibility
	return true''', '''		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF # set 214: no shadowed sun in Compatibility
		var nm := String(mi.name) + "|" + String(mi.get_parent().name)
		for hide in ["Far", "Rocks", "Arch", "Woods", "Runes", "Flowers"]:
			if nm.begins_with(hide) or nm.contains("|" + hide):
				mi.visible = false
	_cards(dark)
	return true

func _card(file: String, at: Vector3, h: float, flip: bool = false, tint: Color = Color.WHITE, upright: bool = true) -> Sprite3D:
	var t: Variant = load("res://art/s217/" + file + ".png")
	var sp := Sprite3D.new()
	sp.texture = t
	sp.pixel_size = h / float((t as Texture2D).get_height())
	sp.centered = true
	sp.offset = Vector2(0, (t as Texture2D).get_height() / 2.0)
	sp.billboard = BaseMaterial3D.BILLBOARD_FIXED_Y if upright else BaseMaterial3D.BILLBOARD_DISABLED
	sp.alpha_cut = SpriteBase3D.ALPHA_CUT_OPAQUE_PREPASS
	sp.shaded = false
	sp.flip_h = flip
	sp.modulate = tint
	sp.position = at
	sp.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	add_child(sp)
	return sp

func _cards(dark: bool) -> void:
	var day := Color(1, 1, 1) if not dark else Color(0.62, 0.58, 0.72)
	# far painting: one big card behind everything (hills + arch), faces the camera
	var bd := _card("backdrop", Vector3(0, -9.0, -62.0), 62.0, false, day.lerp(Color(0.85, 0.9, 1.0), 0.1))
	bd.billboard = BaseMaterial3D.BILLBOARD_DISABLED
	bd.rotation = Vector3(deg_to_rad(-PITCH) * 0.0, 0, 0)
	bd.alpha_cut = SpriteBase3D.ALPHA_CUT_DISABLED
	# standing stones ring the back half of the plaza (front stays open so nobody hides behind them)
	var ring := [["stone_tall", -10.5, -6.5, 4.4], ["stone1", -5.5, -9.6, 3.6], ["stone0", 1.2, -10.6, 3.9],
		["stone3", 6.4, -9.2, 4.0], ["stone2", 11.0, -6.0, 4.2], ["stone_fallen", 4.0, -11.6, 2.4],
		["rock", -14.5, -2.5, 3.0], ["rock", 15.0, -1.5, 2.6]]
	for r in ring:
		_card(r[0], Vector3(r[1], -0.05, r[2]), r[3], r[1] > 8.0, day)
	# grass + flowers: tufts on the plaza edge and a band of big clumps at the very front (blurred-looking frame)
	var tufts := [["grass1", -9.0, -7.8, 0.9], ["grass3", 8.6, -7.6, 0.8], ["grass0", -12.0, -4.0, 1.2],
		["grass4", 12.6, -3.2, 1.2], ["grass5", -2.5, -10.2, 1.0], ["grass2", 3.5, -10.0, 1.1],
		["grass_big", -13.0, 4.5, 2.0], ["grass5", 13.0, 4.0, 1.8], ["grass1", -8.5, 8.2, 1.4], ["grass3", 9.0, 8.0, 1.3]]
	for t in tufts:
		_card(t[0], Vector3(t[1], -0.05, t[2]), t[3], false, day)''')
open(p, 'w', encoding='utf-8').write(s)
print('ok')
