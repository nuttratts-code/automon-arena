# set 217 R5 (sample copy only): stage3d.gd _cards() loads the 4-layer scene arena_dressing_r5.tscn (falls back to the old one).
#   python -I r5-patch-load.py <godot copy>
import sys
p = sys.argv[1] + "/scripts/ui/stage3d.gd"
s = open(p, encoding="utf-8").read()
old = '\tvar ps: Variant = load("res://scenes/arena_dressing.tscn") if ResourceLoader.exists("res://scenes/arena_dressing.tscn") else null'
assert old in s, "load line not found"
s = s.replace(old, '\tvar path := "res://scenes/arena_dressing_r5.tscn"\n'
              '\tif not ResourceLoader.exists(path):\n\t\tpath = "res://scenes/arena_dressing.tscn"\n'
              '\tvar ps: Variant = load(path) if ResourceLoader.exists(path) else null')
open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
