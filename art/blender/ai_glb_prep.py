# Automon Arena — prepare an AI-made 3D model (.glb from Hunyuan3D / Tripo / Meshy / Stable Fast 3D) for Godot.
# Skill: .claude/skills/asset-3d/SKILL.md (set 217 R4, 13 Nov 2026). Tested on Blender 5.2, Hunyuan3D 50k-tri PBR glb.
#
#   blender -b --factory-startup --python art/blender/ai_glb_prep.py -- \
#       --in <src.glb> --out godot/art/<area>/3d/<name>.glb --name <name> --mode full|decimate|bake \
#       [--height 4.13] [--tris 2500] [--tex 1024] [--bake-res 2048] [--keep-metal]
#
# Modes (owner picked "full" for the hero stone, set 217 R4):
#   full     = keep every triangle, only rescale + shrink textures (best look; Godot makes LODs on import)
#   decimate = collapse to --tris, keep the AI's UVs (fast; fine down to ~10 % of the source, smears below that)
#   bake     = collapse to --tris, NEW smart UVs, bake colour + normal from the full model (standard game route;
#              ~20x lighter than full; check the crack edges for thin light seams)
# Always: clears the importer's parent/rotation (glTF is Y-up → a parent turns it; reading o.dimensions before this
# gives the wrong axis), scales to --height (world Z), makes it matte (metal 0, rough 0.9, spec 0.3) unless
# --keep-metal, packs textures at --tex. Prints TRIS / DIMS / IMG lines; read them.
import bpy, sys, argparse

a = argparse.ArgumentParser()
a.add_argument("--in", dest="src", required=True)
a.add_argument("--out", required=True)
a.add_argument("--name", required=True)
a.add_argument("--mode", choices=["full", "decimate", "bake"], default="full")
a.add_argument("--height", type=float, default=4.13)  # stone_a_tall / card stone_tall height in Godot units
a.add_argument("--tris", type=int, default=2500)
a.add_argument("--tex", type=int, default=1024)
a.add_argument("--bake-res", type=int, default=2048)
a.add_argument("--keep-metal", action="store_true")
args = a.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args.src)
meshes = [x for x in bpy.context.scene.objects if x.type == 'MESH']
if len(meshes) != 1:
    sys.exit("expected exactly 1 mesh, got %d — join or split by hand first" % len(meshes))
hi = meshes[0]

def only(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o

only(hi)
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
zs = [v.co.z for v in hi.data.vertices]
f = args.height / (max(zs) - min(zs))
hi.scale = (f, f, f)
bpy.ops.object.transform_apply(scale=True)
src_tris = sum(len(p.vertices) - 2 for p in hi.data.polygons)

def matte(mat):
    if args.keep_metal or not mat or not mat.use_nodes:
        return
    nt = mat.node_tree
    for n in nt.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            for k in ('Metallic', 'Roughness', 'Specular IOR Level'):
                for l in list(n.inputs[k].links):
                    nt.links.remove(l)
            n.inputs['Metallic'].default_value = 0.0
            n.inputs['Roughness'].default_value = 0.9
            n.inputs['Specular IOR Level'].default_value = 0.3

def decimate(o, tris):
    only(o)
    m = o.modifiers.new('dec', 'DECIMATE')
    m.ratio = min(1.0, tris / float(src_tris))
    bpy.ops.object.modifier_apply(modifier='dec')
    bpy.ops.object.shade_smooth()

if args.mode in ("full", "decimate"):
    out_obj = hi
    if args.mode == "decimate":
        decimate(hi, args.tris)
    for mat in hi.data.materials:
        matte(mat)
    if not args.keep_metal:
        for im in list(bpy.data.images):
            if 'metal' in im.name.lower() or 'rough' in im.name.lower():
                bpy.data.images.remove(im)  # else Godot still extracts the unused png next to the glb
    for im in bpy.data.images:
        if im.size[0] > args.tex:
            im.scale(args.tex, args.tex)
        im.file_format = 'PNG'
else:  # bake
    col = None
    for n in hi.active_material.node_tree.nodes:
        if n.type == 'TEX_IMAGE' and n.image and n.image.colorspace_settings.name != 'Non-Color' and col is None:
            col = n.image
    lo = hi.copy(); lo.data = hi.data.copy()
    bpy.context.scene.collection.objects.link(lo)
    decimate(lo, args.tris)
    while len(lo.data.uv_layers):
        lo.data.uv_layers.remove(lo.data.uv_layers[0])
    lo.data.uv_layers.new(name='UVMap')
    only(lo)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.006)
    bpy.ops.uv.pack_islands(margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')
    R = args.bake_res
    cimg = bpy.data.images.new(args.name + '_color', R, R, alpha=False)
    nimg = bpy.data.images.new(args.name + '_normal', R, R, alpha=False)
    nimg.colorspace_settings.name = 'Non-Color'
    mat = bpy.data.materials.new(args.name); mat.use_nodes = True; nt = mat.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Metallic'].default_value = 0.0; b.inputs['Roughness'].default_value = 0.9
    b.inputs['Specular IOR Level'].default_value = 0.3
    tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = cimg; nt.links.new(tc.outputs['Color'], b.inputs['Base Color'])
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = nimg
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    lo.data.materials.clear(); lo.data.materials.append(mat)
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 4; sc.cycles.device = 'CPU'
    ext = 0.015 * args.height  # 0.06 at height 4.13 (tested)
    for img, typ, kw in ((nimg, 'NORMAL', {}), (cimg, 'DIFFUSE', {'pass_filter': {'COLOR'}})):
        nt.nodes.active = tc if img is cimg else tn
        bpy.ops.object.select_all(action='DESELECT'); hi.select_set(True); lo.select_set(True)
        bpy.context.view_layer.objects.active = lo
        bpy.ops.object.bake(type=typ, use_selected_to_active=True, cage_extrusion=ext,
                            max_ray_distance=ext * 5, margin=16, **kw)
    for img in (cimg, nimg):
        img.scale(args.tex, args.tex); img.pack()
    bpy.data.objects.remove(hi)
    out_obj = lo

out_obj.name = args.name
out_obj.data.name = args.name
print("TRIS", src_tris, "->", sum(len(p.vertices) - 2 for p in out_obj.data.polygons),
      "DIMS", tuple(round(v, 2) for v in out_obj.dimensions))
for mat in out_obj.data.materials:  # only what the export carries
    for n in mat.node_tree.nodes:
        if n.type == 'TEX_IMAGE' and n.image:
            print("IMG", n.image.name, tuple(n.image.size))
only(out_obj)
bpy.ops.export_scene.gltf(filepath=args.out, export_format='GLB', use_selection=True, export_image_format='AUTO')
print("DONE", args.out)
