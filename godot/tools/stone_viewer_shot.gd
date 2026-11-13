extends SceneTree
# Screenshots of scenes/s217_stone_viewer.tscn for the owner (skill asset-3d). Editor/PC tool only (tools/* is not exported).
#   <godot_console.exe> --rendering-driver opengl3 --audio-driver Dummy --path godot --resolution 1600x900 \
#       -s res://tools/stone_viewer_shot.gd -- --out <scratch dir> [--at <x>]
# Writes row.png (every model, front) + close0..2.png (camera close on x = --at, models turned 0° / 80° / 160°).
# Models sit at x = 0, 4, 8 … in file-name order, the old flat card last.

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out := "user://"
	var at := 4.0
	var i := args.find("--out")
	if i >= 0 and i + 1 < args.size():
		out = args[i + 1]
	i = args.find("--at")
	if i >= 0 and i + 1 < args.size():
		at = float(args[i + 1])
	var v: Node = (load("res://scenes/s217_stone_viewer.tscn") as PackedScene).instantiate()
	root.add_child(v)
	for k in 30:
		await process_frame
	v.set("turn", false)
	for m in v.get("models"):
		(m as Node3D).rotation.y = 0.0
	await process_frame
	await process_frame
	root.get_viewport().get_texture().get_image().save_png(out + "/row.png")
	var cam: Camera3D = v.get("cam")
	cam.position = Vector3(at, 2.6, 9.5)
	cam.look_at(Vector3(at, 2.0, 0))
	for k in 3:
		await process_frame
		await process_frame
		root.get_viewport().get_texture().get_image().save_png(out + "/close%d.png" % k)
		for m in v.get("models"):
			(m as Node3D).rotate_y(1.4)
	quit()
