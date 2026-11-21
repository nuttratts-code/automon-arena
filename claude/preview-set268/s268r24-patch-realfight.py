# set 268 round 24 — owner: "try it on the real cooldowns". Env S268FIGHT="<own ids>+<foe ids>" (game ids, 6 + 6, slot i = row i/2, lane i%2):
# the harness builds both teams (level 1, no runes), runs the real simulate() and plays it on the battle screen (no BHOLD freeze),
# then swaps each real unit's picture for its hub idle sheet (same hub rules as round 22c, keyed by the unit's character id)
# and keeps its lunge "home". Timeline with S268REAL=1 reads the real cooldowns; icons by character id.
# Live window: no rewired buttons (the screen's own pause / fast-forward drive the real fight), idle frames animate.
# usage: python s268r24-patch-realfight.py <g268>   (after s268r23)
import os, sys
G = sys.argv[1]

def sub(path, a, b, tag):
    s = open(path, encoding="utf-8").read()
    if tag in s:
        return
    assert a in s, (path, a[:60])
    s = s.replace(a, b, 1)
    open(path, "w", encoding="utf-8").write(s)

# stage: remember the character id per unit
st3 = os.path.join(G, "scripts", "ui", "stage3d.gd")
sub(st3, '	groups[group][u["id"]] = {"spr": s, "shadow": sh, "ring": ring, "home": home, "side": side}\n',
    '	groups[group][u["id"]] = {"spr": s, "shadow": sh, "ring": ring, "home": home, "side": side, "cid": str(c.get("id", ""))} # s268r24\n', "s268r24")

pr = os.path.join(G, "tests", "s239_prep.gd")
# 1) start a real fight with the given teams
sub(pr, '''	app.do_buy(0, null)
	app.do_move({"at": "bench", "i": 0.0}, {"at": "board", "row": 0.0, "lane": 0.0})
	app.set_speed(1, false); app._on_fight()
	await _frames()
	app.battle.view.advance(1500.0)
''', '''	if OS.get_environment("S268FIGHT") != "": # s268r24: real fight, hub teams
		var fl := OS.get_environment("S268FIGHT").split("+")
		var mk := func(lst: PackedStringArray) -> Array:
			var arr := []
			for i in lst.size(): arr.append({"id": lst[i], "level": 1.0, "row": float(i / 2), "lane": float(i % 2)})
			return arr
		var ta: Array = mk.call(fl[0].split("/")); var tb: Array = mk.call(fl[1].split("/"))
		var ps: Dictionary = app.player_side(ta, [], 0.0); var fo: Dictionary = app.foe_units(tb, null, 1.0, [], 0.0)
		if ps.has("error") or fo.has("error"): print("S268FIGHT error ", ps.get("error"), " ", fo.get("error"))
		var res: Dictionary = app._sim(ps, fo, {"detail": true, "live": true})
		print("S268FIGHT winner ", res["winner"], " timeMs ", res["timeMs"])
		app.set_speed(1, false)
		app._show_battle(res, app.cm, "ทดลองสู้จริง", [], false)
		await _frames()
		app.battle.view.play()
		app.battle.view.advance(float(OS.get_environment("S268T0")) if OS.get_environment("S268T0") != "" else 1500.0)
	else:
		app.do_buy(0, null)
		app.do_move({"at": "bench", "i": 0.0}, {"at": "board", "row": 0.0, "lane": 0.0})
		app.set_speed(1, false); app._on_fight()
		await _frames()
		app.battle.view.advance(1500.0)
''', "s268r24: real fight")
sub(pr, '	if OS.get_environment("BHOLD") != "": app.battle.view.pause()',
    '	if OS.get_environment("BHOLD") != "" and OS.get_environment("S268FIGHT") == "": app.battle.view.pause()', "S268FIGHT\") == \"\": app.battle.view.pause")
# 2) keep the real units, swap their pictures
sub(pr, '	for id in (st.groups.get("battle", {}) as Dictionary).keys(): st.remove_unit("battle", id)\n',
    '''	var fight := OS.get_environment("S268FIGHT") != "" # s268r24
	var fmap := {}
	if fight:
		for uid in app.battle.view.units.keys():
			var vu: Dictionary = app.battle.view.units[uid]
			fmap["%d:%d:%d" % [int(vu["side"]), int(vu["row"]), int(vu["lane"])]] = uid
	else:
		for id in (st.groups.get("battle", {}) as Dictionary).keys(): st.remove_unit("battle", id)
''', "var fight := OS.get_environment")
sub(pr, '''				n += 1
				st.add_unit("battle", {"id": n, "side": s, "row": row, "lane": lane, "c": {"id": "HL-1", "tribe": ""}})
				var cid: String = (ids if s == 0 else foe)[row * 2 + lane]
				var sp: Sprite3D = st.groups["battle"][n]["spr"]
''', '''				n += 1
				var gk: Variant = n
				var cid: String
				if fight:
					gk = fmap.get("%d:%d:%d" % [s, row, lane])
					if gk == null or not (st.groups["battle"] as Dictionary).has(gk): continue
					cid = "i1" + str(st.groups["battle"][gk].get("cid", "")).replace("-", "")
				else:
					st.add_unit("battle", {"id": n, "side": s, "row": row, "lane": lane, "c": {"id": "HL-1", "tribe": ""}})
					cid = (ids if s == 0 else foe)[row * 2 + lane]
				var sp: Sprite3D = st.groups["battle"][gk]["spr"]
''', "var gk: Variant = n")
sub(pr, '''				sp.rotation = Vector3(-p, 0, 0)
				sprs.append(sp)
''', '''				sp.rotation = Vector3(-p, 0, 0)
				if fight: st.groups["battle"][gk]["home"] = sp.position # s268r24: lunges return here
				sprs.append(sp)
''', "lunges return here")
# 3) live window for the real fight
sub(pr, '''	if OS.get_environment("LIVEB") == "1":   # set 268 round 19: live battle screen window
''', '''	if OS.get_environment("LIVEB") == "1" and fight: # s268r24: real fight plays itself; the screen's own buttons work
		DisplayServer.window_set_title("set 268 real fight sample - close the window to stop")
		while true:
			await process_frame
			for ia in s259idle: (ia[0] as Sprite3D).frame = int(floor(float(Time.get_ticks_msec()) / 1000.0 / float(ia[1]) + float(ia[3]) / float(ia[1]))) % int(ia[2])
	if OS.get_environment("LIVEB") == "1":   # set 268 round 19: live battle screen window
''', "real fight plays itself")
# 4) timeline icons by character id on the real path
tl = os.path.join(G, "scripts", "ui", "s268_timeline.gd")
sub(tl, '''	var tex: Texture2D = null
	var idx := uid - 9001
''', '''	var tex: Texture2D = null
	if OS.get_environment("S268REAL") == "1" and view != null and view.units.has(uid): # s268r24: real fight -> icon by character id
		var fp0 := ProjectSettings.globalize_path("res://tests/s268icons/%s.png" % str(view.units[uid]["id"]))
		if FileAccess.file_exists(fp0):
			tex = ImageTexture.create_from_image(Image.load_from_file(fp0))
		_icons[uid] = tex
		return tex
	var idx := uid - 9001
''', "s268r24: real fight -> icon")
print("ok")
