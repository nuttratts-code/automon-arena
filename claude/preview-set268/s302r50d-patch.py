# set 303 r50d: owner "why is it blurry — or is it the mock?" -> cause (pixel zoom r48b vs r50c, game shot 1:1): since
# r49 _card() set the whole card control to LINEAR_WITH_MIPMAPS for the painted 9-slices, so the pixel creature was
# smoothed too (r48b and earlier = nearest, sharp). Fix: two child canvas items drawn BEHIND the card: [0] body 9-slice
# (linear + mipmaps), [1] creature (nearest); the card itself keeps frame + text + pills on top. RIDs freed on exit.
# Usage: python s302r50d-patch.py <g286> (after s302r50c)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "r43.gd")
s = open(p, encoding="utf-8", newline="").read()
if not os.path.exists(p + ".s302r50d"): shutil.copy(p, p + ".s302r50d")
def rep(old, new):
    global s
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
rep('\tif tk != "": _nine(ci, _tex("card_body_" + tk), r, 30.0, 0.21, Color(1, 1, 1, fa))\n'
    '\telse: _nine(ci, _tex("card_body"), r, 30.0, 0.21, tint)   # r49: grey body + tint (fallback)\n',
    '\tvar ly := _layers50(ci)   # r50d: body (linear) + creature (nearest) on child items behind the card\n'
    '\tif tk != "": _nine50(ly[0], _tex("card_body_" + tk), r, 30.0, 0.21, Color(1, 1, 1, fa))\n'
    '\telse: _nine50(ly[0], _tex("card_body"), r, 30.0, 0.21, tint)   # r49: grey body + tint (fallback)\n')
rep('\tv._pic(ci, tex, Rect2(w * 0.24, bh + 3, fx1 - w * 0.24, fy - bh - 3))\n',
    '\t_pic50(ly[1], tex, Rect2(w * 0.24, bh + 3, fx1 - w * 0.24, fy - bh - 3))   # r50d: nearest = sharp pixels\n')
anchor = "static func _tex(n: String) -> Texture2D:"
rep(anchor, '''static func _layers50(ci: CanvasItem) -> Array:   # r50d: [body linear+mipmaps, creature nearest], behind ci
	if not ci.has_meta("ly50"):
		var a: Array = []
		for f in [RenderingServer.CANVAS_ITEM_TEXTURE_FILTER_LINEAR_WITH_MIPMAPS, RenderingServer.CANVAS_ITEM_TEXTURE_FILTER_NEAREST]:
			var rid := RenderingServer.canvas_item_create()
			RenderingServer.canvas_item_set_parent(rid, ci.get_canvas_item())
			RenderingServer.canvas_item_set_draw_behind_parent(rid, true)
			RenderingServer.canvas_item_set_default_texture_filter(rid, f)
			a.append(rid)
		ci.set_meta("ly50", a)
		ci.tree_exiting.connect(func() -> void:
			for x in a: RenderingServer.free_rid(x)
			ci.remove_meta("ly50"))
	var ly: Array = ci.get_meta("ly50")
	for x in ly: RenderingServer.canvas_item_clear(x)
	return ly

static func _nine50(rid: RID, t: Texture2D, r: Rect2, m: float, sc: float, mod: Color) -> void:   # r50d: _nine on a RID
	var tw := float(t.get_width())
	var th := float(t.get_height())
	var d := m * sc
	var sx := [0.0, m, tw - m, tw]
	var sy := [0.0, m, th - m, th]
	var dx := [r.position.x, r.position.x + d, r.end.x - d, r.end.x]
	var dy := [r.position.y, r.position.y + d, r.end.y - d, r.end.y]
	for i in 3:
		for j in 3:
			t.draw_rect_region(rid, Rect2(dx[i], dy[j], dx[i + 1] - dx[i], dy[j + 1] - dy[j]), Rect2(sx[i], sy[j], sx[i + 1] - sx[i], sy[j + 1] - sy[j]), mod)

static func _pic50(rid: RID, tex: Texture2D, box: Rect2) -> void:   # r50d: same fit as var299._pic, on a RID
	if tex == null: return
	var ts := tex.get_size()
	var k := minf(box.size.x / ts.x, box.size.y / ts.y)
	var dw := ts * k
	tex.draw_rect(rid, Rect2(Vector2(roundf(box.position.x + (box.size.x - dw.x) * 0.5), box.end.y - dw.y), dw), false)

''' + anchor)
open(p, "w", encoding="utf-8", newline="").write(s)
print("r50d ok")
