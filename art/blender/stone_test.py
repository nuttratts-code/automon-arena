# Automon Arena — look test (set 134): one standing stone with a real-looking procedural rock material,
# and a rebuilt, more natural ruined arch (irregular weathered blocks, sagging, a missing voussoir, moss, rubble).
# Small scene (fits 8 GB RAM). Run:
#   blender -b --python art/blender/stone_test.py -- art/scene/test
# writes <out>-stone_raw.png and <out>-arch_raw.png ; then python art/blender/post_test.py <out>
import bpy, math, sys, os
import numpy as np
from mathutils import Vector

OUT = os.path.abspath(sys.argv[-1])
W = int(os.environ.get('W', 1000)); H = int(os.environ.get('H', 700))
rng = np.random.default_rng(134)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rock import node, ramp, lin, rock_mat, weather, build_arch
M_ROCK = rock_mat('rock', moss=.45)
M_ROCK2 = rock_mat('rock_old', moss=.8, tint=(.92, .93, .9))

# ---------------- ground ----------------
def ground(cx, cy, size, mound=0.0, mr=6.0):
    n = 160
    xs = np.linspace(-size, size, n); X, Y = np.meshgrid(xs, xs)
    Z = mound * np.exp(-(X ** 2 + Y ** 2) / (2 * mr ** 2)) + (np.sin(X * .7) * np.cos(Y * .5)) * .08
    me = bpy.data.meshes.new('g'); verts = np.stack([X + cx, Y + cy, Z], -1).reshape(-1, 3)
    idx = np.arange(n * n).reshape(n, n)
    faces = np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], -1).reshape(-1, 4)
    me.from_pydata(verts.tolist(), [], faces.tolist()); me.update()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new('ground', me); sc.collection.objects.link(o); o.data.materials.append(M_GROUND)
    return lambda x, y: mound * math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * mr ** 2))

M_GROUND = bpy.data.materials.new('ground'); M_GROUND.use_nodes = True
_nt = M_GROUND.node_tree; _b = _nt.nodes['Principled BSDF']; _b.inputs['Roughness'].default_value = .95
_n = node(_nt, 'ShaderNodeTexNoise', i_Scale=.6, i_Detail=6.0)
_r = ramp(_nt, [(.35, lin((.28, .36, .14))), (.65, lin((.50, .52, .24)))]); _nt.links.new(_n.outputs['Fac'], _r.inputs[0])
_nt.links.new(_r.outputs[0], _b.inputs['Base Color'])

M_GRASS = bpy.data.materials.new('grass'); M_GRASS.use_nodes = True
_nt = M_GRASS.node_tree; _b = _nt.nodes['Principled BSDF']; _b.inputs['Roughness'].default_value = .7
_a = node(_nt, 'ShaderNodeAttribute', attribute_name='col'); _nt.links.new(_a.outputs['Color'], _b.inputs['Base Color'])

def grass(cx, cy, rad, N, hfun, clear=()):
    x = cx + rng.uniform(-rad, rad, N); y = cy + rng.uniform(-rad, rad, N)
    keep = np.ones(N, bool)
    for (qx, qy, qr) in clear: keep &= np.hypot(x - qx, y - qy) > qr
    x, y = x[keep], y[keep]; m = len(x)
    z = np.array([hfun(a, b) for a, b in zip(x, y)]) + (np.sin(x * .7) * np.cos(y * .5)) * .08 - .02
    ang = rng.uniform(0, math.pi, m); w = rng.uniform(.012, .025, m); hg = rng.uniform(.12, .38, m)
    lean = rng.normal(0, .06, (m, 2))
    p0 = np.c_[x + np.cos(ang) * w, y + np.sin(ang) * w, z]; p1 = np.c_[x - np.cos(ang) * w, y - np.sin(ang) * w, z]
    p2 = np.c_[x + lean[:, 0], y + lean[:, 1], z + hg]
    verts = np.stack([p0, p1, p2], 1).reshape(-1, 3); faces = np.arange(m * 3).reshape(-1, 3)
    g = np.array([.42, .50, .20]) * rng.uniform(.75, 1.2, (m, 1)); dry = rng.random(m) < .2
    g[dry] = np.array([.62, .55, .30]) * rng.uniform(.8, 1.1, (dry.sum(), 1))
    base = (g * .4) ** 2.2; tip = np.clip(g * 1.15, 0, 1) ** 2.2
    cols = np.stack([base, base, tip], 1).reshape(-1, 3)
    me = bpy.data.meshes.new('grass'); me.vertices.add(len(verts)); me.vertices.foreach_set('co', verts.astype(np.float32).ravel())
    me.loops.add(len(faces) * 3); me.loops.foreach_set('vertex_index', faces.astype(np.int32).ravel())
    me.polygons.add(len(faces)); me.polygons.foreach_set('loop_start', (np.arange(len(faces)) * 3).astype(np.int32)); me.update()
    a = me.color_attributes.new('col', 'FLOAT_COLOR', 'POINT')
    a.data.foreach_set('color', np.c_[cols, np.ones(len(cols))].astype(np.float32).ravel())
    o = bpy.data.objects.new('grass', me); sc.collection.objects.link(o); o.data.materials.append(M_GRASS)

# ---------------- shot 1: one standing stone ----------------
h0 = ground(0, 0, 14)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.35)); st = bpy.context.object
st.scale = (1.15, .7, 3.4); st.rotation_euler = (math.radians(2), math.radians(-4), math.radians(14))
bpy.ops.object.transform_apply(scale=True)
for v in st.data.vertices:                                   # taper toward the top, lean the crown
    t = (v.co.z + 1.7) / 3.4; v.co.x *= 1 - .3 * t; v.co.y *= 1 - .25 * t; v.co.x += .12 * t * t
st.data.materials.append(M_ROCK); weather(st, sub=5, vs=.22, cs=.16, fs=.035)
for i, (x, y, r) in enumerate([(1.4, -.6, .28), (-1.2, .5, .18), (.9, .9, .14)]):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=r, location=(x, y, r * .3)); o = bpy.context.object
    o.scale.z = .55; o.data.materials.append(M_ROCK2); weather(o, sub=1, vs=r * .5, cs=r * .3, fs=.01)
grass(0, 0, 9, 160000, h0, clear=((0, 0, .45),))

# ---------------- shot 2: rebuilt ruined arch on a grassy knoll ----------------
AX, AY = 60.0, 0.0
h1 = ground(AX, AY, 26, mound=2.2, mr=9)
ar = np.random.default_rng(8)
OW, PT = 3.4, 1.25
gz = h1(AX, AY) - .15
build_arch(AX, AY, gz, (M_ROCK, M_ROCK2))
for i in range(9):                   # rubble half-sunk in the grass
    a = ar.uniform(0, 2 * math.pi); r = ar.uniform(2.6, 5.5); x = AX + math.cos(a) * r; y = AY + math.sin(a) * r * .7
    s = ar.uniform(.2, .5)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=s, location=(x, y, h1(x, y) - s * .2)); o = bpy.context.object
    o.scale = (ar.uniform(.9, 1.5), 1, .55); o.data.materials.append(M_ROCK2); weather(o, sub=1, vs=s * .4, cs=s * .3, fs=.01)
grass(AX, AY, 14, 260000, h1, clear=((AX - OW / 2 - PT / 2, AY, .62), (AX + OW / 2 + PT / 2, AY, .62)))

# ---------------- light, sky, cameras ----------------
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(58), 0, math.radians(-40)))
sun = bpy.context.object.data; sun.energy = 4.2; sun.color = (1.0, .86, .66); sun.angle = math.radians(1.5)
wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True; nt = wd.node_tree
tc = node(nt, 'ShaderNodeTexCoord'); sp = node(nt, 'ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sp.inputs[0])
sk = ramp(nt, [(.5, (.70, .78, .88)), (.8, (.25, .45, .85))]); nt.links.new(sp.outputs['Z'], sk.inputs[0])
nt.links.new(sk.outputs[0], nt.nodes['Background'].inputs['Color']); nt.nodes['Background'].inputs['Strength'].default_value = .9

def cam(name, loc, target, lens):
    bpy.ops.object.camera_add(location=loc); c = bpy.context.object; c.name = name; c.data.lens = lens
    d = Vector(target) - Vector(loc); c.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); return c
C1 = cam('cam_stone', (1.2, -6.2, 1.9), (0, 0, 1.6), 42)
C2 = cam('cam_arch', (AX - 4.0, AY - 15.0, 3.2), (AX, AY, gz + 2.6), 40)

sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
sc.cycles.samples = int(os.environ.get('SAMPLES', 64)); sc.cycles.use_denoising = True; sc.cycles.max_bounces = 4
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
for c, tag in ((C1, 'stone'), (C2, 'arch')):
    sc.camera = c; sc.render.filepath = OUT + '-' + tag + '_raw.png'
    bpy.ops.render.render(write_still=True); print('DONE', tag, flush=True)
if os.environ.get('BLEND') == '1':
    bpy.ops.wm.save_as_mainfile(filepath=OUT + '.blend', compress=True)
