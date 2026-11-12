# set 217 R3 sample: build a 3D stone from 4 orthographic views (+ top) — visual hull + per-face projected paint.
# Owner's views (Gemini/GPT, magenta background). Run with the pip bpy 5.2 venv:
#   bvenv/bin/python r3-hull-stone.py <front> <left> <back> <right> <top> <out_dir> <name> [height]
# left = camera on the stone's left (the front face shows at the image's right edge); right = the other side.
import sys, os, math
import numpy as np
from PIL import Image, ImageFilter
import bpy, bmesh

front, left, back, right, top, OUT, NAME = sys.argv[1:8]
HEIGHT = float(sys.argv[8]) if len(sys.argv) > 8 else 4.4
os.makedirs(OUT, exist_ok=True)
S = 1024

def load(p):
    im = Image.open(p).convert('RGB').resize((S, S), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    bg = np.median(np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3)]), axis=0)
    d = np.sqrt(((a - bg) ** 2).sum(axis=2))
    m = d > 90
    # remove specks: keep the largest blob roughly by an opening via PIL filters
    mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
    m = np.asarray(mi) > 127
    return a, m

views = {k: load(p) for k, p in zip(['front', 'left', 'back', 'right', 'top'], [front, left, back, right, top])}

def bbox(m):
    ys, xs = np.where(m)
    return xs.min(), xs.max(), ys.min(), ys.max()

# common vertical frame from the four side views (they share the base line); horizontal centre = each view's own centre
fb = bbox(views['front'][1])
z0, z1 = fb[2], fb[3]
cen = {}
for k in ['front', 'left', 'back', 'right']:
    x0, x1, _, _ = bbox(views[k][1])
    cen[k] = (x0 + x1) / 2.0
STEP = 4
zs = np.arange(z0, z1 + 1, STEP)
half = 300
xs = np.arange(-half, half + 1, STEP)
ys = np.arange(-half, half + 1, STEP)

def sample(k, u, row):
    m = views[k][1]
    u = np.clip(np.round(u).astype(int), 0, S - 1)
    row = np.clip(np.round(row).astype(int), 0, S - 1)
    return m[row, u]

Z, Y, X = np.meshgrid(zs, ys, xs, indexing='ij')  # X,Y in px around the axis; Z = image row (down)
keep = sample('front', cen['front'] + X, Z)
keep &= sample('back', cen['back'] - X, Z)
keep &= sample('left', cen['left'] - Y, Z)     # left view: image right = front (-Y)
keep &= sample('right', cen['right'] + Y, Z)   # right view: image right = back (+Y)
print('voxels', int(keep.sum()))

# boundary quads of the voxel set
pad = np.pad(keep, 1)
verts, faces, vidx = [], [], {}
def vid(p):
    if p not in vidx:
        vidx[p] = len(verts); verts.append(p)
    return vidx[p]
nz, ny, nx = keep.shape
dirs = [((1, 0, 0), 'z'), ((-1, 0, 0), 'z'), ((0, 1, 0), 'y'), ((0, -1, 0), 'y'), ((0, 0, 1), 'x'), ((0, 0, -1), 'x')]
for (dz, dy, dx), _ in dirs:
    nb = pad[1 + dz:1 + dz + nz, 1 + dy:1 + dy + ny, 1 + dx:1 + dx + nx]
    k, j, i = np.where(keep & ~nb)
    for a, b, c in zip(k, j, i):
        # cube corners in grid units (z down in image = up in world flipped later)
        if dz:
            zz = a + (1 if dz > 0 else 0)
            q = [(zz, b, c), (zz, b + 1, c), (zz, b + 1, c + 1), (zz, b, c + 1)]
        elif dy:
            yy = b + (1 if dy > 0 else 0)
            q = [(a, yy, c), (a + 1, yy, c), (a + 1, yy, c + 1), (a, yy, c + 1)]
        else:
            xx = c + (1 if dx > 0 else 0)
            q = [(a, b, xx), (a + 1, b, xx), (a + 1, b + 1, xx), (a, b + 1, xx)]
        faces.append([vid(p) for p in q])
print('quads', len(faces))
pxh = (z1 - z0)  # px height
sc = HEIGHT / pxh
def world(p):
    a, b, c = p
    zpx = z0 + a * STEP; ypx = -half + b * STEP; xpx = -half + c * STEP
    return (xpx * sc, ypx * sc, (z1 - zpx) * sc)  # Blender: X right, Y back, Z up

bpy.ops.wm.read_factory_settings(use_empty=True)
me = bpy.data.meshes.new(NAME)
me.from_pydata([world(p) for p in verts], [], faces)
me.validate()
ob = bpy.data.objects.new(NAME, me)
bpy.context.scene.collection.objects.link(ob)
bpy.context.view_layer.objects.active = ob
ob.select_set(True)
m = ob.modifiers.new('rm', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = STEP * sc * 1.6
bpy.ops.object.modifier_apply(modifier='rm')
m = ob.modifiers.new('sm', 'SMOOTH'); m.iterations = 6; m.factor = 0.6
bpy.ops.object.modifier_apply(modifier='sm')
m = ob.modifiers.new('tri', 'TRIANGULATE'); bpy.ops.object.modifier_apply(modifier='tri')
tris = len(ob.data.polygons)
m = ob.modifiers.new('dc', 'DECIMATE'); m.ratio = min(1.0, 3000.0 / max(1, tris))
bpy.ops.object.modifier_apply(modifier='dc')
m = ob.modifiers.new('tri', 'TRIANGULATE'); bpy.ops.object.modifier_apply(modifier='tri')
print('tris', len(ob.data.polygons))

# ---- atlas: 3×2 tiles of 512, background filled with the nearest paint so edges never show magenta
T = 512
def filled(k):
    a, m = views[k]
    img = a.copy(); mm = m.astype(np.float32)
    acc = img * mm[..., None]; w = mm.copy()
    im = Image.fromarray(np.uint8(np.clip(img, 0, 255)))
    for r in [3, 6, 12, 24, 48, 96]:
        ba = np.asarray(Image.fromarray(np.uint8(np.clip(acc / np.maximum(w, 1e-4)[..., None], 0, 255))).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)
        bw = np.asarray(Image.fromarray(np.uint8(np.clip(w * 255, 0, 255))).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255
        hole = w < 0.5
        acc[hole] = ba[hole] * 1.0; w[hole] = np.where(bw[hole] > 0.02, 1.0, 0.0)
    out = np.where(m[..., None], img, acc)
    return Image.fromarray(np.uint8(np.clip(out, 0, 255))).resize((T, T), Image.LANCZOS)
order = ['front', 'left', 'back', 'right', 'top']
atlas = Image.new('RGB', (3 * T, 2 * T), (120, 120, 110))
for n, k in enumerate(order):
    atlas.paste(filled(k), ((n % 3) * T, (n // 3) * T))
apath = os.path.join(OUT, NAME + '_atlas.png'); atlas.save(apath)

tb = bbox(views['top'][1])
co = np.array([v.co[:] for v in ob.data.vertices])
hx = (co[:, 0].min(), co[:, 0].max()); hy = (co[:, 1].min(), co[:, 1].max())
def proj(k, x, y, z):
    if k == 'top':
        u = tb[0] + (x - hx[0]) / (hx[1] - hx[0]) * (tb[1] - tb[0])
        r = tb[3] - (y - hy[0]) / (hy[1] - hy[0]) * (tb[3] - tb[2])  # front (-Y) at the image bottom
    else:
        X = x / sc; Yp = y / sc; r = z1 - z / sc
        u = {'front': cen['front'] + X, 'back': cen['back'] - X, 'left': cen['left'] - Yp, 'right': cen['right'] + Yp}[k]
    n = order.index(k)
    U = ((n % 3) * T + np.clip(u, 0, S - 1) / S * T) / (3 * T)
    V = 1.0 - ((n // 3) * T + np.clip(r, 0, S - 1) / S * T) / (2 * T)
    return (U, V)
uv = ob.data.uv_layers.new(name='UVMap')
for p in ob.data.polygons:
    nx_, ny_, nz_ = p.normal
    cz = sum(ob.data.vertices[i].co.z for i in p.vertices) / 3.0
    w = {'front': -ny_, 'back': ny_, 'left': -nx_, 'right': nx_}
    if nz_ > 0.7 and cz > HEIGHT * 0.8:
        w['top'] = 9.0  # only the real cap uses the top view; ledges lower down keep the side paint
    k = max(w, key=w.get)
    for li in p.loop_indices:
        v = ob.data.vertices[ob.data.loops[li].vertex_index].co
        uv.data[li].uv = proj(k, v.x, v.y, v.z)
bpy.ops.object.shade_smooth()
mat = bpy.data.materials.new(NAME); mat.use_nodes = True
bsdf = mat.node_tree.nodes['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 1.0
tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(apath)
mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
ob.data.materials.append(mat)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, NAME + '.glb'), export_format='GLB', use_selection=True, export_yup=True)
print('glb', os.path.join(OUT, NAME + '.glb'))

# ---- turntable preview (Cycles CPU)
sc_ = bpy.context.scene
sc_.render.engine = 'CYCLES'; sc_.cycles.samples = 24; sc_.cycles.device = 'CPU'
sc_.render.resolution_x = 360; sc_.render.resolution_y = 520
sc_.render.film_transparent = False
world_ = bpy.data.worlds.new('w'); world_.use_nodes = True
world_.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.62, 0.72, 1); world_.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
sc_.world = world_
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 2.5
sun.rotation_euler = (math.radians(50), 0, math.radians(-40)); sc_.collection.objects.link(sun)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc_.collection.objects.link(cam); sc_.camera = cam
cam.data.lens = 70
for i, ang in enumerate([0, 45, 90, 135, 180, 270]):
    r = 17.0; a = math.radians(ang)
    cam.location = (r * math.sin(a), -r * math.cos(a), HEIGHT * 0.5 + 3.0)
    d = np.array([0, 0, HEIGHT * 0.5]) - np.array(cam.location)
    cam.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]), 0, math.atan2(d[1], d[0]) - math.pi / 2)
    sc_.render.filepath = os.path.join(OUT, f'{NAME}_turn{i}_{ang}.png')
    bpy.ops.render.render(write_still=True)
print('done')
