# set 217 R2 (sample branch only): after r1-patch-cards.py + the R1 tweaks, stage3d.gd builds the cards from
# scenes/arena_dressing.tscn (owner edits it in the Godot editor) instead of the hard-coded lists.
import sys, re
g = sys.argv[1]
p = g + '/scripts/ui/stage3d.gd'
s = open(p, encoding='utf-8').read()
i = s.index('func _cards(dark: bool) -> void:')
j = s.index('\nfunc ', i + 10)
new = '''func _cards(dark: bool) -> void:
	# set 217 sample: the owner places the cards in scenes/arena_dressing.tscn (Godot editor); Guides + GameCam are editor-only
	var ps: Variant = load("res://scenes/arena_dressing.tscn") if ResourceLoader.exists("res://scenes/arena_dressing.tscn") else null
	if not (ps is PackedScene):
		return
	var d: Node3D = (ps as PackedScene).instantiate()
	for nm in ["Guides", "GameCam"]:
		var n := d.get_node_or_null(nm)
		if n != null:
			d.remove_child(n)
			n.free()
	if dark:
		for sp in d.find_children("*", "Sprite3D", true, false):
			sp.modulate = sp.modulate * Color(0.62, 0.58, 0.72)
	add_child(d)
'''
s = s[:i] + new + s[j:]
open(p, 'w', encoding='utf-8').write(s)
print('ok')
