# set 217 R6 (sample copy only): stage3d.gd loads arena_dressing_r6.tscn and hides the old plaza model (runeplaza.glb).
#   python -I r6-patch.py <godot copy> [pitch]      (pitch: optional camera angle to try, e.g. 14)
import re
import sys
g = sys.argv[1]
p = g + "/scripts/ui/stage3d.gd"
s = open(p, encoding="utf-8").read()
old = '\tvar ps: Variant = load("res://scenes/arena_dressing.tscn") if ResourceLoader.exists("res://scenes/arena_dressing.tscn") else null'
if old in s:
    s = s.replace(old, '\tvar ps: Variant = load("res://scenes/arena_dressing_r6.tscn")')
else:
    s, k = re.subn(r'var path := "res://scenes/arena_dressing_r\d\.tscn"', 'var path := "res://scenes/arena_dressing_r6.tscn"', s)
    assert k == 1, "load line not found"
old2 = '\troot.name = "Plaza3D"\n\tadd_child(root)\n'
assert old2 in s, "plaza add not found"
if "root.visible = false" not in s:
    s = s.replace(old2, old2 + '\troot.visible = false # set 217 R6 sample: the owner\'s Hunyuan3D plaza replaces it\n')
if len(sys.argv) > 2:
    s, k = re.subn(r"const PITCH := [\d.]+", "const PITCH := %s.0" % sys.argv[2], s)
    assert k == 1
open(p, "w", encoding="utf-8", newline="").write(s)
print("ok")
