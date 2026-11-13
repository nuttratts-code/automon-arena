@tool
extends Node3D
# SET 217 SAMPLE ONLY (R16): tints every mesh under this imported model (the owner's AI plaza is painted too bright).
# Change `tone` in the editor Inspector to try another stone colour.

@export var tone := Color(0.7, 0.67, 0.58):
	set(v):
		tone = v
		if is_inside_tree():
			_apply()

func _ready() -> void:
	_apply()

func _apply() -> void:
	for mi in find_children("*", "MeshInstance3D", true, false):
		var m: Material = (mi as MeshInstance3D).mesh.surface_get_material(0)
		if m is StandardMaterial3D:
			var d := (m as StandardMaterial3D).duplicate() as StandardMaterial3D
			d.albedo_color = tone
			(mi as MeshInstance3D).material_override = d
