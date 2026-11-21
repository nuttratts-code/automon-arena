# set 268 round 26 — owner: "move by the white dots, in steps, not a long slide; units at the same time stack as
# overlapping diamonds in the gap after the dot; our colour always on top; tap a stack = it opens so every frame shows".
# Env S268SNAP=1: a portrait sits on the white dot at or right of its true spot (jumps one dot at a time, reaches the act
# point when it acts) · units on the same dot stack to the right in the gap, 12 px apart, the one acting first at the dot
# and drawn on top; every foe drawn first, own last (own on top) · tap / click a stack = open it (34 px apart = whole
# frames), tap again or elsewhere = close. S268EXP=1 opens the biggest stack (for stills).
# usage: python s268r26-patch-snap.py <g268>   (after s268r25)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()

def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)

if "s268r26" not in s:
    rep("func _ready() -> void:\n", "var _stk := []      # s268r26: [Rect2, key] of each drawn stack\nvar _open := \"\"     # key of the opened stack\n\nfunc _gui_input(ev: InputEvent) -> void: # s268r26: tap a stack = open / close it\n\tif ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:\n\t\tvar hit := \"\"\n\t\tfor sr in _stk:\n\t\t\tif (sr[0] as Rect2).has_point(ev.position): hit = str(sr[1])\n\t\t_open = \"\" if hit == _open else hit\n\t\taccept_event()\n\nfunc _ready() -> void:\n\tif OS.get_environment(\"S268SNAP\") == \"1\": mouse_filter = Control.MOUSE_FILTER_STOP\n")
    # after the tie block: snap + stack layout
    rep("				tpos[u] = bx\n", '''				tpos[u] = bx
	var ditems := [] # s268r26: draw order (items keeps the f order the act diamond needs)
	if OS.get_environment("S268SNAP") == "1": # s268r26: dots + stacks
		var stp := (x1 - x0) / 14.0
		var groups := {}
		for it in items:
			var lx0 := lerpf(x1 - 14.0, x0, float(it[0]))
			var kk := int(ceil((lx0 - x0) / stp - 0.0001))
			var key := "%d:%d" % [int(it[1]["side"]), kk]
			if not groups.has(key): groups[key] = []
			groups[key].append(it)
		_stk = []
		var big := ""
		for key in groups:
			if big == "" or (groups[key] as Array).size() > (groups[big] as Array).size(): big = key
		if OS.get_environment("S268EXP") == "1" and (groups.get(big, []) as Array).size() > 1: _open = big
		for key in groups:
			var g: Array = groups[key]
			g.sort_custom(func(a, b): return float(a[0]) > float(b[0]) or (float(a[0]) == float(b[0]) and int(a[1]["uid"]) < int(b[1]["uid"])))
			var kk := int(str(key).split(":")[1])
			var gap := 34.0 if key == _open else 12.0
			for i in g.size():
				tpos[int(g[i][1]["uid"])] = x0 + float(kk) * stp + gap * float(i)
				tbadge.erase(int(g[i][1]["uid"]))
			if g.size() > 1:
				var sd := int(str(key).split(":")[0])
				var xa := x0 + float(kk) * stp - 22.0
				_stk.append([Rect2(xa, (y - 44.0) if sd == 0 else y, gap * float(g.size() - 1) + 44.0, 44.0), key])
		# draw order: foes first, own last (own on top); inside a stack the one acting first is drawn last (on top)
		var rank := {}
		for key in groups:
			var g2: Array = groups[key]
			for i in g2.size(): rank[int(g2[i][1]["uid"])] = g2.size() - i
		ditems = items.duplicate()
		ditems.sort_custom(func(a, b):
			var sa := int(a[1]["side"]); var sb := int(b[1]["side"])
			if sa != sb: return sa > sb
			return int(rank.get(int(a[1]["uid"]), 0)) < int(rank.get(int(b[1]["uid"]), 0)))
''')
    rep("\tfor it in items:\n\t\tvar f: float = it[0]\n", "\tfor it in (ditems if not ditems.is_empty() else items):\n\t\tvar f: float = it[0]\n")
    open(p, "w", encoding="utf-8").write(s)
print("ok")
