# set 213 sample R3 (owner J1): the rune-plaza render (art/scene/runeplaza-v5.png) as a still backdrop behind the 3D board.
# 3D ground / plaza / stone tiles / midline hidden (the picture has its own plaza); fog off (it washed the whole floor to the
# horizon colour); rims + sprites + foot marks stay 3D. Needs art/bg/runeplaza.png in the copy.
import sys
g = sys.argv[1]

def sub(path, old, new):
    p = g + "/" + path
    s = open(p, encoding="utf-8").read()
    assert old in s, (path, old[:60])
    s = s.replace(old, new, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(s)

P = "scripts/ui/stage3d.gd"
sub(P, "\tenv.fog_enabled = true", "\tenv.fog_enabled = false")
sub(P, "\tenv.background_mode = Environment.BG_SKY\n",
    "\tenv.background_mode = Environment.BG_CANVAS\n"
    "\tenv.background_canvas_max_layer = -1\n")
sub(P, "\tcam.transform = Transform3D(cam_basis(), Vector3(0, 9, 14))\n\t_floor(dark)\n",
    "\tcam.transform = Transform3D(cam_basis(), Vector3(0, 9, 14))\n\t_floor(dark)\n"
    "\tvar cl := CanvasLayer.new()\n"
    "\tcl.name = \"Backdrop\"\n"
    "\tcl.layer = -1\n"
    "\tvar tr := TextureRect.new()\n"
    "\ttr.name = \"Pic\"\n"
    "\tvar img := Image.load_from_file(ProjectSettings.globalize_path(\"res://art/bg/runeplaza.png\"))\n"
    "\ttr.texture = ImageTexture.create_from_image(img)\n"
    "\ttr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE\n"
    "\ttr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED\n"
    "\ttr.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)\n"
    "\tcl.add_child(tr)\n"
    "\tadd_child(cl)\n"
    "\tfor nm in [\"Ground\", \"Plaza\", \"Mid\"]:\n"
    "\t\tvar n := get_node_or_null(nm)\n"
    "\t\tif n != null:\n"
    "\t\t\tn.visible = false\n"
    "\tfor ch in get_children():\n"
    "\t\tif ch is MeshInstance3D and str(ch.name).begins_with(\"Tile\"):\n"
    "\t\t\tch.visible = false\n")
sub(P, "\t\tm.visible = r > 0.0 and (not m.name.begins_with(\"Rim\") or _rim_on(m))",
    "\t\tm.visible = r > 0.0 and not m.name.begins_with(\"Tile\") and (not m.name.begins_with(\"Rim\") or _rim_on(m))")
print("R3 patch ok")
