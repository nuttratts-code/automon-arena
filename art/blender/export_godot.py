# Set 215 (owner pick A2): the rune plaza scene (art/scene/runeplaza-v5.blend, our own Blender scene from set 132)
# exported for the Godot arena as one light glTF + one plaza picture.
# Run:  blender -b art/scene/runeplaza-v5.blend --python art/blender/export_godot.py -- <out_dir>
# Out:  <out_dir>/runeplaza.glb (nodes: Plaza, Near, Far, Flowers, Rocks, Arch, Woods, Runes) · <out_dir>/plaza.png
# Why: the render scene is 3.6 M triangles with procedural Cycles materials — glTF drops those materials (art-look §4
# step 2). So: the plaza's vertex colours are drawn top-down into a picture on a flat disc, every other mesh is cut down
# (Decimate) and keeps or gets its colour as a vertex colour 'col' (Cycles bake for the procedural stone material).
# The grass blades (1.6 M) are dropped: the terrain under them is already green. Scale S makes the plaza radius 9
# (= the old code plaza in godot/scripts/ui/stage3d.gd), so the 12 game slots fit inside it.
import bpy, sys, os, math

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.path.dirname(bpy.data.filepath)
os.makedirs(OUT, exist_ok=True)
S = 9.0 / 12.5
PLAZA_R = 12.5
TEX = 1024
sc = bpy.context.scene

def objs(prefix):
    return [o for o in bpy.data.objects if o.type == 'MESH' and (o.name == prefix or o.name.startswith(prefix + "."))]

def only(sel):
    bpy.ops.object.select_all(action='DESELECT')
    for o in sel:
        o.hide_set(False)
        o.select_set(True)
    bpy.context.view_layer.objects.active = sel[0]

def apply_all(o):
    only([o])
    if o.data.users > 1:
        o.data = o.data.copy()
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)

def decimate(o, ratio):
    if ratio >= 1.0:
        return
    m = o.modifiers.new("dec", 'DECIMATE')
    m.ratio = ratio
    only([o])
    bpy.ops.object.modifier_apply(modifier=m.name)

def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)

# ---------- 1. the plaza picture: vertex colours seen straight from above ----------
for nm in ("grass", "Camera", "Sun"):  # drop what Godot does not use first (the PC has ~8 GB RAM)
    if nm in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[nm])
# the runes are children of their standing stones: unparent everything (keep the world place) so the moves, joins and
# the scale below act once per object (first export put the runes in the middle of the board)
for o in bpy.data.objects:
    if o.parent is not None:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
bpy.context.view_layer.update()
plaza = bpy.data.objects["plaza"]
# the plaza mesh is not centred on its origin: move the whole scene so the plaza centre = the board centre (0, 0)
from mathutils import Vector
bb = [plaza.matrix_world @ Vector(c) for c in plaza.bound_box]
centre = Vector(((min(v.x for v in bb) + max(v.x for v in bb)) / 2.0, (min(v.y for v in bb) + max(v.y for v in bb)) / 2.0, 0.0))
for o in bpy.data.objects:
    if o.parent is None:
        o.location -= centre
bpy.context.view_layer.update()
print("CENTRE", tuple(round(v, 3) for v in centre))
# the 12 baked ring marks sit where the old Blender camera wanted them, not on the game slots: the 'glow' attribute
# that marks them is drawn as a second picture (plaza_glow.png) so tools/plaza_clean.py can paint them out
import numpy as np
me = plaza.data
g = np.zeros(len(me.vertices), dtype=np.float32)
me.attributes["glow"].data.foreach_get("value", g)
gm = me.color_attributes.new("glowcol", 'FLOAT_COLOR', 'POINT')
rgba = np.repeat(np.clip(g, 0.0, 1.0), 4).reshape(-1, 4)
rgba[:, 3] = 1.0
gm.data.foreach_set("color", rgba.ravel())
print("GLOW max", float(g.max()), "verts>0", int((g > 0.01).sum()))
plaza.data.color_attributes.active_color = plaza.data.color_attributes["col"]
for o in bpy.data.objects:
    o.hide_render = o is not plaza
cam_d = bpy.data.cameras.new("top")
cam_d.type = 'ORTHO'
cam_d.ortho_scale = PLAZA_R * 2.0
cam = bpy.data.objects.new("top", cam_d)
sc.collection.objects.link(cam)
cam.location = (0, 0, 20)
cam.rotation_euler = (0, 0, 0)
sc.camera = cam
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'FLAT'
sc.display.shading.color_type = 'VERTEX'
sc.render.film_transparent = True
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
sc.render.resolution_x = TEX
sc.render.resolution_y = TEX
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.render.filepath = os.path.join(OUT, "plaza.png")
bpy.ops.render.render(write_still=True)
plaza.data.color_attributes.active_color = plaza.data.color_attributes["glowcol"]
sc.render.filepath = os.path.join(OUT, "plaza_glow.png")
bpy.ops.render.render(write_still=True)
for o in bpy.data.objects:
    o.hide_render = False

# a flat disc with a top-down UV in place of the 812 k-triangle plaza
bpy.data.objects.remove(plaza)
bpy.ops.mesh.primitive_circle_add(vertices=96, radius=PLAZA_R, fill_type='TRIFAN', location=(0, 0, 0.02))
disc = bpy.context.active_object
disc.name = "Plaza"
uv = disc.data.uv_layers.new(name="UVMap")
for loop in disc.data.loops:
    v = disc.data.vertices[loop.vertex_index].co
    uv.data[loop.index].uv = (v.x / (PLAZA_R * 2.0) + 0.5, v.y / (PLAZA_R * 2.0) + 0.5)

# ---------- 2. drop what Godot does not use ----------
for nm in ("top",):
    if nm in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[nm])

# ---------- 3. cut down + colour ----------
def has_col(o):
    return "col" in o.data.color_attributes

def bake_col(o):  # procedural material colour → vertex colour 'col' (diffuse colour only, no light)
    if not has_col(o):
        o.data.color_attributes.new("col", 'FLOAT_COLOR', 'POINT')
    o.data.color_attributes.active_color = o.data.color_attributes["col"]
    only([o])
    for x in bpy.data.objects:  # Cycles builds its BVH from every renderable object: bake one alone (RAM)
        x.hide_render = x is not o
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, target='VERTEX_COLORS')
    for x in bpy.data.objects:
        x.hide_render = False

sc.render.engine = 'CYCLES'
sc.cycles.samples = 1
sc.cycles.device = 'CPU'

def solid_col(o, rgb):
    a = o.data.color_attributes.new("col", 'FLOAT_COLOR', 'POINT')
    for d in a.data:
        d.color = (rgb[0], rgb[1], rgb[2], 1.0)

groups = {  # node name: (source prefixes, decimate ratio, colour)
    "Near": (["near"], 0.07, "attr"),
    "Far": (["far"], 0.06, "attr"),
    "Flowers": (["flowers", "fflowers"], 0.35, "attr"),
    "Rocks": (["stone", "Cube", "Icosphere"], None, "bake"),
    "Arch": (["vous"], 0.35, "bake"),
    "Woods": (["woods"], 0.15, "tree"),
    "Runes": (["rune"], 1.0, "none"),
}
tree_rgb = (0.16, 0.30, 0.12)
tm = bpy.data.materials.get("tree")
if tm and tm.use_nodes:
    for n in tm.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            tree_rgb = tuple(n.inputs["Base Color"].default_value[:3])
report = []
for gname, (prefixes, ratio, colour) in groups.items():
    parts = []
    for p in prefixes:
        parts += objs(p)
    for o in parts:
        apply_all(o)
        r = ratio
        if r is None:  # rocks: aim at ~1.5 k triangles each
            r = min(1.0, 1500.0 / max(1, tris(o)))
        decimate(o, r)
    for o in parts:
        if colour == "bake":
            bake_col(o)
        elif colour == "tree":
            solid_col(o, tree_rgb)
        for a in [a for a in o.data.color_attributes if a.name != "col"]:
            o.data.color_attributes.remove(a)
        o.data.materials.clear()
    only(parts)
    bpy.ops.object.join()
    j = bpy.context.active_object
    j.name = gname
    report.append("%s %d" % (gname, tris(j)))

# ---------- 4. scale to the game board + export ----------
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.data.materials.clear()
        o.scale = (o.scale[0] * S, o.scale[1] * S, o.scale[2] * S)
        o.location = (o.location[0] * S, o.location[1] * S, o.location[2] * S)
only([o for o in bpy.data.objects if o.type == 'MESH'])
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "runeplaza.glb"), export_format='GLB', use_selection=True,
	export_materials='NONE', export_vertex_color='NAME', export_vertex_color_name="col", export_yup=True,
	export_normals=True, export_apply=False)
print("EXPORT", " · ".join(report), "plaza disc", tris(bpy.data.objects["Plaza"]))
