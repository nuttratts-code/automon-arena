# set 286 = set 268 round 35c: random teams for tests (owner: "random characters when testing, to find bugs").
# env S286RAND=<seed> (0 = new seed from the clock): 12 different creatures from the hub pool (tests/s225/s268i1_meta.json),
# random level 1-3 each, own = first 6, foe = last 6. Prints "S286RAND seed .. teams .." so a bug can be replayed (same seed).
# Still needs S268FIGHT set (any value) so the harness runs the real fight.
import sys, pathlib
g = pathlib.Path(sys.argv[1])
p = g / "tests" / "s239_prep.gd"
s = p.read_text(encoding="utf-8")
old = """		var fl := OS.get_environment("S268FIGHT").split("+")
		var mk := func(lst: PackedStringArray) -> Array:
			var arr := []
			for i in lst.size(): arr.append({"id": lst[i], "level": 1.0, "row": float(i / 2), "lane": float(i % 2)})
			return arr
"""
assert old in s
new = """		var fl := OS.get_environment("S268FIGHT").split("+")
		var lv286 := {} # s286r35c: random teams
		if OS.get_environment("S286RAND") != "":
			var rng286 := RandomNumberGenerator.new()
			var sd := int(OS.get_environment("S286RAND"))
			if sd == 0: sd = int(Time.get_unix_time_from_system()) % 1000000
			rng286.seed = sd
			var meta286: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(ProjectSettings.globalize_path("res://tests/s225/s268i1_meta.json")))
			var pool := []
			for kk in meta286.keys(): pool.append(str(kk).substr(2, 2) + "-" + str(kk).substr(4))
			pool.sort()
			for i in range(pool.size() - 1, 0, -1):
				var j := rng286.randi_range(0, i)
				var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp
			var pick: Array = pool.slice(0, 12)
			for cid in pick: lv286[cid] = float(rng286.randi_range(1, 3))
			fl = PackedStringArray(["/".join(PackedStringArray(pick.slice(0, 6))), "/".join(PackedStringArray(pick.slice(6, 12)))])
			print("S286RAND seed ", sd, " teams ", fl[0], " + ", fl[1], " levels ", JSON.stringify(lv286))
		var mk := func(lst: PackedStringArray) -> Array:
			var arr := []
			for i in lst.size(): arr.append({"id": lst[i], "level": lv286.get(lst[i], 1.0), "row": float(i / 2), "lane": float(i % 2)})
			return arr
"""
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("ok")
