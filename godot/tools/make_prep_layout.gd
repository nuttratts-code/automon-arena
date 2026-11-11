# Set 207 (user B2): writes res://scenes/prep_layout.tscn from prep.gd's default layout (build_layout).
# Run ONCE to create the scene, or again to reset it to the default (this overwrites the owner's edits — ask first):
#   <godot> --headless --path godot -s res://tools/make_prep_layout.gd
# The scene holds layout only: no colours / fonts / icons (prep.gd adds them from metas at run time, light + dark),
# no cells (made in code), no scripts except shape.gd on the reroll icon. tools/ is not exported (export_presets.cfg).
extends SceneTree

const OUT := "res://scenes/prep_layout.tscn"

func _init() -> void:
	var prep: Control = load("res://scripts/ui/prep.gd").new()
	var lay: Control = prep.build_layout()
	_own(lay, lay)
	var ps := PackedScene.new()
	var err := ps.pack(lay)
	if err == OK:
		err = ResourceSaver.save(ps, OUT)
	print("make_prep_layout: ", "wrote " + OUT if err == OK else "FAILED " + str(err))
	lay.free()
	prep.free()
	quit(0 if err == OK else 1)

func _own(n: Node, root: Node) -> void:
	for ch in n.get_children():
		ch.owner = root
		_own(ch, root)
