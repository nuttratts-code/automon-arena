# set 194 (plan P2 step 5b): scripts/rules.gd helpers vs node values (src/core/rules.js · boss.js · Math.round · Array.sort).
extends RefCounted

const R := preload("res://scripts/rules.gd")

func test_up_gain_up_mul() -> String:
	var g := [[10, 5, 1], [3, 10, 1], [0, 10, 0], [7, -20, -2], [184.8, 33, 60], [1, 0.5, 1]]
	for c in g:
		if R.up_gain(c[0], c[1]) != c[2]:
			return "up_gain(%s, %s) = %s, JS %s" % [c[0], c[1], R.up_gain(c[0], c[1]), c[2]]
	var m := [[10, 1.05, 11], [3, 1.1, 4], [0, 2, 0], [7, 0.8, 5], [100, 0.95, 95], [5, 1.000001, 6], [184.8, 1.33, 245]]
	for c in m:
		if R.up_mul(c[0], c[1]) != c[2]:
			return "up_mul(%s, %s) = %s, JS %s" % [c[0], c[1], R.up_mul(c[0], c[1]), c[2]]
	return "ok"

func test_js_round() -> String:
	var c := [[0.5, 1], [1.5, 2], [2.5, 3], [-0.5, 0], [-1.5, -1], [-2.5, -2], [2.4999, 2], [-0.0001, 0]]
	for x in c:
		if R.js_round(x[0]) != x[1]:
			return "js_round(%s) = %s, JS %s" % [x[0], R.js_round(x[0]), x[1]]
	return "ok"

func test_stable_sort() -> String:
	var a := []
	for p in [[5, 0], [3, 1], [5, 2], [1, 3], [3, 4]]:
		a.append({"v": p[0], "i": p[1]})
	var got := R.sort_cmp(a, func(x, y): return x.v - y.v).map(func(x): return x.i)
	return "ok" if got == [3, 1, 4, 0, 2] else "stable sort order %s, JS [3, 1, 4, 0, 2]" % [got]

func test_boss_helpers() -> String:
	var want := {"move": {"slots": [0, 1, 2, 3, 4, 5], "cells": [0], "move": true}, "c100100": {"slots": [0, 3], "cells": [0, 3], "move": false},
		"m110000": {"slots": [0, 1], "cells": [0], "move": true}, "m100000": null, "c000000": null, "x111111": null,
		"front": {"slots": [0, 1], "cells": [0, 1], "move": false}}
	for s in want:
		var got: Variant = R.spot_cells(s)
		if not _same(got, want[s]):
			return "spot_cells(%s) = %s, JS %s" % [s, got, want[s]]
	var ph := [{"at": 0}, {"at": 1}, {"at": 3}]
	if R.phase_index_at(ph, 2) != 1 or R.phase_index_at(ph, 3) != 2:
		return "phase_index_at wrong"
	var at := [[{"row": "any", "lane": "same"}, 0, 1, 2, 1, true], [{"row": "mid", "lane": "other"}, 0, 1, 1, 0, true],
		[{"row": "mid", "lane": "other"}, 0, 1, 1, 1, false], [{"row": "back", "lane": "both"}, 0, 0, 2, 1, true]]
	for c in at:
		if R.at_match(c[0], c[1], c[2], c[3], c[4]) != c[5]:
			return "at_match %s wrong" % [c]
	return "ok"

static func _same(a: Variant, b: Variant) -> bool:
	return preload("res://tests/golden_util.gd").diff(a, b) == ""
