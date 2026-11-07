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

def node(nt, t, **kw):
    n = nt.nodes.new(t)
    for k, v in kw.items():
        if k.startswith('i_'): n.inputs[k[2:].replace('_', ' ')].default_value = v
        else: setattr(n, k, v)
    return n

def ramp(nt, stops):
    r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
    while len(el) < len(stops): el.new(0.5)
    for e, (p, c) in zip(el, stops): e.position = p; e.color = (*c, 1)
    return r

def lin(c): return tuple(v ** 2.2 for v in c)

# ---------------- rock material: colour variation, crevices, vertical weather streaks, lichen, moss, layered bump ----------------
def rock_mat(name, moss=.5, tint=(1, 1, 1)):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; L = nt.links
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = .88
    tc = node(nt, 'ShaderNodeTexCoord')
    obj = tc.outputs['Object']
    big = node(nt, 'ShaderNodeTexNoise', i_Scale=1.2, i_Detail=4.0, i_Roughness=.55); L.new(obj, big.inputs['Vector'])
    fine = node(nt, 'ShaderNodeTexNoise', i_Scale=38.0, i_Detail=12.0, i_Roughness=.65); L.new(obj, fine.inputs['Vector'])
    vor = node(nt, 'ShaderNodeTexVoronoi', i_Scale=3.0); L.new(obj, vor.inputs['Vector'])
    crk = node(nt, 'ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE', i_Scale=1.6); L.new(obj, crk.inputs['Vector'])
    # base stone colour: warm grey with darker and lighter patches
    base = ramp(nt, [(.25, lin((.30, .29, .27))), (.55, lin((.52, .50, .46))), (.8, lin((.66, .64, .58)))])
    L.new(big.outputs['Fac'], base.inputs[0])
    # grain
    gr = node(nt, 'ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY'); gr.inputs['Factor'].default_value = .35
    L.new(base.outputs[0], gr.inputs['A']); L.new(fine.outputs['Color'], gr.inputs['B'])
    # vertical weather streaks (noise squashed in z)
    mp = node(nt, 'ShaderNodeMapping'); mp.inputs['Scale'].default_value = (2.2, 2.2, .6); L.new(obj, mp.inputs['Vector'])
    st = node(nt, 'ShaderNodeTexNoise', i_Scale=2.0, i_Detail=3.0); L.new(mp.outputs[0], st.inputs['Vector'])
    str_ = ramp(nt, [(.5, (1, 1, 1)), (.72, lin((.7, .68, .64)))]); L.new(st.outputs['Fac'], str_.inputs[0])
    c1 = node(nt, 'ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY'); c1.inputs['Factor'].default_value = 1
    L.new(gr.outputs['Result'], c1.inputs['A']); L.new(str_.outputs[0], c1.inputs['B'])
    # crevices darker / ridges lighter (pointiness, Cycles)
    geo = node(nt, 'ShaderNodeNewGeometry')
    pt = ramp(nt, [(.44, lin((.35, .34, .33))), (.5, (1, 1, 1)), (.58, lin((1.2, 1.18, 1.12)))]); L.new(geo.outputs['Pointiness'], pt.inputs[0])
    c2 = node(nt, 'ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY'); c2.inputs['Factor'].default_value = 1
    L.new(c1.outputs['Result'], c2.inputs['A']); L.new(pt.outputs[0], c2.inputs['B'])
    # cracks: thin dark lines
    ck = ramp(nt, [(.0, lin((.2, .19, .18))), (.02, (1, 1, 1))]); L.new(crk.outputs['Distance'], ck.inputs[0])
    cm = node(nt, 'ShaderNodeTexNoise', i_Scale=1.1, i_Detail=2.0); L.new(obj, cm.inputs['Vector'])
    cmr = ramp(nt, [(.55, (0, 0, 0)), (.65, (.85, .85, .85))]); L.new(cm.outputs['Fac'], cmr.inputs[0])
    c3 = node(nt, 'ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY'); L.new(cmr.outputs[0], c3.inputs['Factor'])
    L.new(c2.outputs['Result'], c3.inputs['A']); L.new(ck.outputs[0], c3.inputs['B'])
    # lichen: pale crusty spots + a few orange ones
    li = node(nt, 'ShaderNodeTexVoronoi', i_Scale=7.0, i_Randomness=1.0); L.new(obj, li.inputs['Vector'])
    lm = node(nt, 'ShaderNodeTexNoise', i_Scale=3.0, i_Detail=2.0); L.new(obj, lm.inputs['Vector'])
    ls = ramp(nt, [(.22, (.9, .9, .9)), (.34, (0, 0, 0))]); L.new(li.outputs['Distance'], ls.inputs[0])
    lmr = ramp(nt, [(.5, (0, 0, 0)), (.62, (1, 1, 1))]); L.new(lm.outputs['Fac'], lmr.inputs[0])
    lk = node(nt, 'ShaderNodeMath', operation='MULTIPLY'); L.new(ls.outputs[0], lk.inputs[0]); L.new(lmr.outputs[0], lk.inputs[1])
    lc = ramp(nt, [(.3, lin((.78, .76, .62))), (.75, lin((.80, .55, .25)))]); L.new(li.outputs['Color'], lc.inputs[0])
    c4 = node(nt, 'ShaderNodeMix', data_type='RGBA'); L.new(lk.outputs[0], c4.inputs['Factor'])
    L.new(c3.outputs['Result'], c4.inputs['A']); L.new(lc.outputs[0], c4.inputs['B'])
    # moss on up-facing surfaces, broken up by noise
    sep = node(nt, 'ShaderNodeSeparateXYZ'); L.new(geo.outputs['Normal'], sep.inputs[0])
    mn = node(nt, 'ShaderNodeTexNoise', i_Scale=4.0, i_Detail=8.0, i_Roughness=.7); L.new(obj, mn.inputs['Vector'])
    ad = node(nt, 'ShaderNodeMath', operation='ADD'); L.new(sep.outputs['Z'], ad.inputs[0]); L.new(mn.outputs['Fac'], ad.inputs[1])
    mr = node(nt, 'ShaderNodeMapRange'); mr.inputs[1].default_value = 1.25 - moss * .3; mr.inputs[2].default_value = 1.4 - moss * .3
    L.new(ad.outputs[0], mr.inputs[0])
    mc = ramp(nt, [(.3, lin((.22, .30, .08))), (.7, lin((.42, .50, .16)))]); L.new(fine.outputs['Fac'], mc.inputs[0])
    c5 = node(nt, 'ShaderNodeMix', data_type='RGBA'); L.new(mr.outputs[0], c5.inputs['Factor'])
    L.new(c4.outputs['Result'], c5.inputs['A']); L.new(mc.outputs[0], c5.inputs['B'])
    tn = node(nt, 'ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY'); tn.inputs['Factor'].default_value = 1
    tn.inputs['B'].default_value = (*tint, 1); L.new(c5.outputs['Result'], tn.inputs['A'])
    L.new(tn.outputs['Result'], b.inputs['Base Color'])
    # layered bump: chunky facets + cracks + grain
    h1 = node(nt, 'ShaderNodeMath', operation='MULTIPLY', ); h1.inputs[1].default_value = .5; L.new(vor.outputs['Distance'], h1.inputs[0])
    h2 = node(nt, 'ShaderNodeMath', operation='MULTIPLY'); h2.inputs[1].default_value = .25; L.new(fine.outputs['Fac'], h2.inputs[0])
    h3 = node(nt, 'ShaderNodeMath', operation='MINIMUM'); h3.inputs[1].default_value = .04; L.new(crk.outputs['Distance'], h3.inputs[0])
    h4 = node(nt, 'ShaderNodeMath', operation='MULTIPLY'); L.new(h3.outputs[0], h4.inputs[0]); L.new(cmr.outputs[0], h4.inputs[1])
    s1 = node(nt, 'ShaderNodeMath', operation='ADD'); L.new(h1.outputs[0], s1.inputs[0]); L.new(h2.outputs[0], s1.inputs[1])
    s2 = node(nt, 'ShaderNodeMath', operation='ADD'); L.new(s1.outputs[0], s2.inputs[0]); L.new(h4.outputs[0], s2.inputs[1])
    bm = node(nt, 'ShaderNodeBump', i_Strength=.55, i_Distance=.08); L.new(s2.outputs[0], bm.inputs['Height'])
    L.new(bm.outputs[0], b.inputs['Normal'])
    return m

M_ROCK = rock_mat('rock', moss=.45)
M_ROCK2 = rock_mat('rock_old', moss=.8, tint=(.92, .93, .9))

TEX_V = bpy.data.textures.new('vor', 'VORONOI'); TEX_V.noise_scale = .9
TEX_C = bpy.data.textures.new('cld', 'CLOUDS'); TEX_C.noise_scale = .6; TEX_C.noise_depth = 4
TEX_F = bpy.data.textures.new('fine', 'CLOUDS'); TEX_F.noise_scale = .12; TEX_F.noise_depth = 2

def weather(o, sub=4, vs=.18, cs=.12, fs=.03, bevel=.0):
    if bevel:
        bv = o.modifiers.new('bv', 'BEVEL'); bv.width = bevel; bv.segments = 2
    ss = o.modifiers.new('ss', 'SUBSURF'); ss.levels = ss.render_levels = sub
    for t, s in ((TEX_V, vs), (TEX_C, cs), (TEX_F, fs)):
        d = o.modifiers.new('d', 'DISPLACE'); d.texture = t; d.strength = s; d.mid_level = .5; d.texture_coords = 'GLOBAL'
    for p in o.data.polygons: p.use_smooth = True

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
ar = np.random.default_rng(7)
def blk(cx, cy, cz, sx, sy, sz, rot=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz), rotation=rot); o = bpy.context.object
    o.scale = (sx, sy, sz); bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat or (M_ROCK if ar.random() < .5 else M_ROCK2))
    weather(o, sub=2, vs=.05, cs=.05, fs=.015, bevel=min(sx, sy, sz) * .1); return o

OW, PT, PD = 3.4, 1.25, 1.1          # opening width, pillar thickness, depth
gz = h1(AX, AY) - .15
spring = 0
for side in (-1, 1):                 # pillars: irregular stacked blocks, each a bit different, slight drift
    z = gz; k = 0; top = 3.9
    while z < gz + top - .05:
        hh = ar.uniform(.55, .95); hh = gz + top - z if gz + top - z - hh < .35 else hh; ww = PT * ar.uniform(.92, 1.12)
        blk(AX + side * (OW / 2 + PT / 2) + ar.uniform(-.06, .06) + side * k * .015, AY + ar.uniform(-.05, .05), z + hh / 2,
            ww, PD * ar.uniform(.9, 1.05), hh * 1.01, rot=(ar.uniform(-.03, .03), ar.uniform(-.03, .03), ar.uniform(-.06, .06)))
        z += hh; k += 1
    spring = max(spring, z)
spring = gz + 3.9
import bmesh
def vous(a0, a1, ri, ro, drop=0.0):
    pts = []
    for a in (a0, a1):
        for rr in (ri, ro):
            for yy in (-PD / 2, PD / 2):
                pts.append(Vector((AX + math.cos(a) * rr, AY + yy, spring + math.sin(a) * rr - drop)))
    bm = bmesh.new()
    for p in pts: bm.verts.new(p)
    bmesh.ops.convex_hull(bm, input=bm.verts)
    me = bpy.data.meshes.new('v'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('vous', me); sc.collection.objects.link(o)
    o.data.materials.append(M_ROCK if ar.random() < .5 else M_ROCK2)
    weather(o, sub=2, vs=.04, cs=.04, fs=.012, bevel=.07)
    return o
ri = OW / 2; ro = OW / 2 + PT * .85
NV = 13
edges = np.cumsum(np.r_[0, ar.uniform(.85, 1.15, NV)]); edges = edges / edges[-1] * math.pi
for k in range(NV):                  # uneven voussoirs; the crown has sagged a few cm
    mid = (edges[k] + edges[k + 1]) / 2; sag = .08 * math.sin(mid) ** 4
    vous(edges[k] + .012, edges[k + 1] - .012, ri + ar.uniform(-.04, .04), ro + ar.uniform(-.08, .12), drop=sag)
# square shoulders above the pillars (like the target); the right one has lost its top courses
TOP = spring + ro + .45
for side in (-1, 1):
    top = TOP if side < 0 else TOP - 1.0
    for (xc, wdt) in ((OW / 2 + PT / 2, PT * 1.05), (OW / 2 - .35, .75)):
        ext = spring + math.sqrt(max(0, ro ** 2 - (xc - wdt / 2) ** 2)) - .05 if xc < OW / 2 else spring
        z = ext
        while z < top - .15:
            hh = min(ar.uniform(.5, .75), top - z)
            blk(AX + side * xc + ar.uniform(-.04, .04), AY + ar.uniform(-.04, .04), z + hh / 2, wdt * ar.uniform(.95, 1.05),
                PD * ar.uniform(.92, 1.0), hh * 1.01, rot=(0, ar.uniform(-.03, .03), ar.uniform(-.04, .04)))
            z += hh
# a crown course over the keystone, broken off toward the right
for (xx, wdt) in ((-1.1, 1.0), (-.1, 1.0), (.75, .6)):
    zb = spring + math.sqrt(max(0, ro ** 2 - (abs(xx) + wdt / 2) ** 2))
    zb = max(zb, spring + ro - .1)
    hh = TOP - zb - (.35 if xx > 0 else 0)
    if hh > .2: blk(AX + xx, AY, zb + hh / 2, wdt, PD * .96, hh, rot=(0, ar.uniform(-.03, .03), 0))
# fallen courses from the broken right shoulder at its foot
blk(AX + OW / 2 + PT + 1.0, AY - 1.0, gz + .3, 1.1, .9, .6, rot=(.3, .2, .8), mat=M_ROCK2)
blk(AX + OW / 2 + PT + 1.9, AY - .4, gz + .18, .6, .5, .35, rot=(.1, .5, 2.1), mat=M_ROCK2)
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
