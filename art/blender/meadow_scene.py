# Automon Arena — meadow battle scene (draft, set 132). Original scene: open meadow, dirt clearing,
# stream, big tree, hills + far mountains, painted sky. Characters are NOT in the scene:
# the game draws pixel sprites on top (cells exported to <out>_cells.json).
# Run: pip install bpy pillow ; python meadow_scene.py <out.png>   (env SAMPLES, W, H, FAST=1)
import bpy, math, sys, os, json
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

OUT = os.path.abspath(sys.argv[-1]); D = os.path.dirname(OUT); BASE = os.path.splitext(OUT)[0]
W = int(os.environ.get('W', 1600)); H = int(os.environ.get('H', 740))
FAST = os.environ.get('FAST') == '1'
rng = np.random.default_rng(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------------- noise (numpy) ----------------
def _hash(i, j, s):
    n = (i.astype(np.uint64) * np.uint64(374761393) + j.astype(np.uint64) * np.uint64(668265263)
         + np.uint64(s * 982451653 + 1013904223)) & np.uint64(0xffffffff)
    n = ((n ^ (n >> np.uint64(13))) * np.uint64(1274126177)) & np.uint64(0xffffffff)
    return ((n ^ (n >> np.uint64(16))) & np.uint64(0xffff)).astype(np.float64) / 65535.0

def vnoise(x, y, s=0):
    xi = np.floor(x); yi = np.floor(y); xf = x - xi; yf = y - yi
    xi = xi.astype(np.int64) + 100000; yi = yi.astype(np.int64) + 100000
    u = xf * xf * (3 - 2 * xf); v = yf * yf * (3 - 2 * yf)
    a = _hash(xi, yi, s); b = _hash(xi + 1, yi, s); c = _hash(xi, yi + 1, s); d = _hash(xi + 1, yi + 1, s)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v

def fbm(x, y, s=0, octv=5):
    t = 0.0; amp = 0.5; norm = 0.0
    for k in range(octv):
        t = t + amp * vnoise(x * 2 ** k, y * 2 ** k, s + k); norm += amp; amp *= 0.5
    return t / norm

def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def poly_dist(x, y, pts):
    best = np.full(np.shape(x), 1e9)
    for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
        dx, dy = bx - ax, by - ay
        t = np.clip(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1)
        best = np.minimum(best, np.hypot(x - ax - t * dx, y - ay - t * dy))
    return best

# ---------------- layout ----------------
# board: 2 sides x 3 columns (front/mid/back) x 2 lanes; player = left
LANES = (0.6, 5.6)            # y of near / far lane
COLS = (2.3, 5.2, 8.1)        # |x| of front / mid / back column
CLEAR_C = (0.0, 3.1); CLEAR_R = (12.5, 6.8)
RIVER = [(-90, 15), (-45, 13), (-26, 15), (-18, 22), (-19, 33), (-13, 48), (-26, 70), (-75, 98)]
ROAD = [(-40, -16), (-16, -5), (-6, 1), (4, 5), (10, 12), (13, 24), (17, 42), (24, 70), (28, 110)]

def height(x, y, river=True):
    e = (x / CLEAR_R[0]) ** 2 + ((y - CLEAR_C[1]) / CLEAR_R[1]) ** 2
    flat = sstep(1.0, 2.6, e)
    base = (fbm(x * .03, y * .03, 1) - .5) * 2.4 + (fbm(x * .12, y * .12, 3) - .5) * .7
    hills = sstep(60, 320, y) * fbm(x * .008, y * .008, 5, 4) * 18
    ridge = 1 - np.abs(2 * fbm(x * .005, y * .005, 7, 5) - 1)
    mount = sstep(420, 650, y) * ridge ** 1.8 * 62
    h = flat * (base + hills) + mount
    if river:
        d = poly_dist(x, y, RIVER); w = 3.2 - np.clip((y - 15) / 120, 0, 1) * 1.6
        h = h - 1.1 * np.exp(-(d / w) ** 2)
    return h

def ground_color(x, y, h):
    e = (x / CLEAR_R[0]) ** 2 + ((y - CLEAR_C[1]) / CLEAR_R[1]) ** 2
    n = fbm(x * .08, y * .08, 21)
    dirt = (1 - sstep(.55, 1.05, e + (n - .5) * .7)) * (.55 + .45 * sstep(.35, .6, fbm(x * .22, y * .22, 25)))
    rd = poly_dist(x, y, ROAD); rw = 2.0 - np.clip(y / 120, 0, 1) * 1.2
    dirt = np.maximum(dirt, 1 - sstep(.7 * rw, 1.25 * rw, rd + (n - .5) * 1.2))
    g1 = np.array([0.20, 0.42, 0.10]); g2 = np.array([0.46, 0.62, 0.17]); g3 = np.array([0.62, 0.66, 0.25])
    m = fbm(x * .025, y * .025, 23)[..., None]; m2 = sstep(.6, .8, fbm(x * .05, y * .05, 29))[..., None]
    grass = g1 + (g2 - g1) * m; grass = grass + (g3 - grass) * m2 * .6
    far = np.clip((y - 40) / 160, 0, 1)[..., None]
    grass = grass + (np.array([0.40, 0.56, 0.22]) - grass) * far * .5
    dc = np.array([0.60, 0.46, 0.30]) * (0.85 + 0.3 * fbm(x * .3, y * .3, 31))[..., None]
    c = grass + (dc - grass) * dirt[..., None]
    rd2 = poly_dist(x, y, RIVER)
    c = c * (1 - 0.35 * np.exp(-(rd2 / 4.5) ** 2))[..., None]          # damp river banks
    rock = np.clip((h - 14) / 30, 0, 1)[..., None] * sstep(.45, .7, fbm(x * .02, y * .02, 37))[..., None]
    forest = sstep(.55, .7, fbm(x * .015, y * .015, 41))[..., None] * np.clip((y - 50) / 60, 0, 1)[..., None]
    c = c + (np.array([0.13, 0.27, 0.12]) - c) * forest * .8
    c = c + (np.array([0.40, 0.46, 0.50]) - c) * rock
    return np.clip(c, 0, 1) ** 2.2, dirt

# ---------------- mesh helpers ----------------
def grid_mesh(name, x0, x1, y0, y1, nx, ny, xpow=1.0, ypow=1.0):
    gx = np.linspace(0, 1, nx) ** xpow; gy = np.linspace(0, 1, ny) ** ypow
    xs = x0 + (x1 - x0) * gx; ys = y0 + (y1 - y0) * gy
    X, Y = np.meshgrid(xs, ys); Z = height(X, Y)
    col, dirt = ground_color(X, Y, Z)
    verts = np.stack([X, Y, Z], -1).reshape(-1, 3)
    idx = np.arange(nx * ny).reshape(ny, nx)
    q = np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], -1).reshape(-1, 4)
    me = build_mesh(name, verts, q, np.concatenate([col.reshape(-1, 3), np.ones((nx * ny, 1))], 1))
    return me, X, Y, Z, dirt

def build_mesh(name, verts, faces, pcol=None, smooth=True):
    me = bpy.data.meshes.new(name)
    nv = len(verts); nf = len(faces); k = faces.shape[1]
    me.vertices.add(nv); me.vertices.foreach_set('co', verts.astype(np.float32).ravel())
    me.loops.add(nf * k); me.loops.foreach_set('vertex_index', faces.astype(np.int32).ravel())
    me.polygons.add(nf)
    me.polygons.foreach_set('loop_start', (np.arange(nf) * k).astype(np.int32))
    me.update(); me.validate()
    if pcol is not None:
        a = me.color_attributes.new('col', 'FLOAT_COLOR', 'POINT')
        a.data.foreach_set('color', pcol.astype(np.float32).ravel())
    if smooth: me.shade_smooth()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    return ob

# ---------------- materials ----------------
HAZE = (0.68, 0.80, 0.93)
def haze_wrap(nt, bsdf_out, near=60, far=1400, maxf=0.66, pw=1.15):
    cam = nt.nodes.new('ShaderNodeCameraData')
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs[1].default_value = near; mr.inputs[2].default_value = far
    mr.inputs[3].default_value = 0; mr.inputs[4].default_value = maxf
    nt.links.new(cam.outputs['View Distance'], mr.inputs[0])
    pwn = nt.nodes.new('ShaderNodeMath'); pwn.operation = 'POWER'; pwn.inputs[1].default_value = pw
    nt.links.new(mr.outputs[0], pwn.inputs[0])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*HAZE, 1); em.inputs['Strength'].default_value = 1.15
    mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(pwn.outputs[0], mx.inputs[0]); nt.links.new(bsdf_out, mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes['Material Output'].inputs['Surface'])

def mat_vcol(name, detail=40.0, rough=0.95, haze=True, nfac=0.3, trans=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'col'
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = detail; nz.inputs['Detail'].default_value = 6
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs[3].default_value = 1 - nfac; mr.inputs[4].default_value = 1 + nfac * .6
    nt.links.new(nz.outputs['Fac'], mr.inputs[0])
    mul = nt.nodes.new('ShaderNodeVectorMath'); mul.operation = 'SCALE'
    nt.links.new(at.outputs['Color'], mul.inputs[0]); nt.links.new(mr.outputs[0], mul.inputs['Scale'])
    nt.links.new(mul.outputs[0], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    out = b.outputs[0]
    if trans > 0:
        tr = nt.nodes.new('ShaderNodeBsdfTranslucent'); nt.links.new(mul.outputs[0], tr.inputs['Color'])
        ms = nt.nodes.new('ShaderNodeMixShader'); ms.inputs[0].default_value = trans
        nt.links.new(out, ms.inputs[1]); nt.links.new(tr.outputs[0], ms.inputs[2]); out = ms.outputs[0]
    if haze: haze_wrap(nt, out)
    else: nt.links.new(out, nt.nodes['Material Output'].inputs['Surface'])
    return m

def mat_foliage(name, dark, light, scale=3.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 8
    cr = nt.nodes.new('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].position = .35; cr.color_ramp.elements[0].color = (*[c ** 2.2 for c in dark], 1)
    cr.color_ramp.elements[1].position = .7; cr.color_ramp.elements[1].color = (*[c ** 2.2 for c in light], 1)
    nt.links.new(nz.outputs['Fac'], cr.inputs[0])
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 1.5
    nt.links.new(cr.outputs[0], ao.inputs['Color'])
    nt.links.new(ao.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = .8
    tr = nt.nodes.new('ShaderNodeBsdfTranslucent'); nt.links.new(cr.outputs[0], tr.inputs['Color'])
    ms = nt.nodes.new('ShaderNodeMixShader'); ms.inputs[0].default_value = .22
    nt.links.new(b.outputs[0], ms.inputs[1]); nt.links.new(tr.outputs[0], ms.inputs[2])
    haze_wrap(nt, ms.outputs[0])
    return m

def mat_plain(name, col, rough=.9):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*[c ** 2.2 for c in col], 1); b.inputs['Roughness'].default_value = rough
    haze_wrap(nt, b.outputs[0]); return m

def mat_water():
    m = bpy.data.materials.new('water'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.10, 0.30, 0.42, 1); b.inputs['Roughness'].default_value = .06
    b.inputs['Metallic'].default_value = 0.0
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 6; nz.inputs['Detail'].default_value = 4
    bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = .25
    nt.links.new(nz.outputs['Fac'], bm.inputs['Height']); nt.links.new(bm.outputs[0], b.inputs['Normal'])
    haze_wrap(nt, b.outputs[0]); return m

M_TERR = mat_vcol('terrain', detail=35, nfac=.25)
M_GRASS = mat_vcol('grass', detail=2, nfac=.15, trans=.3)
M_FLOWER = mat_vcol('flower', detail=1, nfac=.05)
M_LEAF = mat_foliage('leaf', (0.13, 0.30, 0.08), (0.48, 0.66, 0.20))
M_LEAF_FAR = mat_foliage('leaf_far', (0.20, 0.36, 0.16), (0.40, 0.58, 0.24), 1.2)
M_BUSH = mat_foliage('bush', (0.10, 0.26, 0.06), (0.36, 0.56, 0.14), 4)
M_BARK = mat_plain('bark', (0.30, 0.22, 0.15))
M_ROCK = mat_plain('rock', (0.55, 0.54, 0.50))
M_WATER = mat_water()

# ---------------- terrain ----------------
near, NX, NY, NZ, NDIRT = grid_mesh('near', -90, 90, -16, 125, 70 if FAST else 480, 50 if FAST else 380, ypow=1.3)
near.data.materials.append(M_TERR)
far = grid_mesh('far', -1600, 1600, 100, 1500, 60 if FAST else 300, 40 if FAST else 200, ypow=1.6)[0]
far.data.materials.append(M_TERR); far.location.z = -0.6

# river ribbon (water) following the carved channel
pts = []
for (ax, ay), (bx, by) in zip(RIVER[:-1], RIVER[1:]):
    n = max(2, int(math.hypot(bx - ax, by - ay) / 1.5))
    for t in np.linspace(0, 1, n, endpoint=False): pts.append((ax + (bx - ax) * t, ay + (by - ay) * t))
pts.append(RIVER[-1]); pts = np.array(pts)
tang = np.gradient(pts, axis=0); tang /= np.linalg.norm(tang, axis=1, keepdims=True)
nrm = np.stack([-tang[:, 1], tang[:, 0]], 1)
wid = (3.2 - np.clip((pts[:, 1] - 15) / 120, 0, 1) * 1.6) * 1.05
zc = height(pts[:, 0], pts[:, 1], river=False) - 0.55
L = pts + nrm * wid[:, None]; R = pts - nrm * wid[:, None]
vv = np.concatenate([np.c_[L, zc], np.c_[R, zc]])
n = len(pts); f = np.array([[i, i + 1, n + i + 1, n + i] for i in range(n - 1)])
build_mesh('river', vv, f, smooth=False).data.materials.append(M_WATER)

# ---------------- grass blades + flowers (one mesh each) ----------------
def scatter(N, x0, x1, y0, y1):
    x = rng.uniform(x0, x1, N); y = rng.uniform(y0, y1, N)
    return x, y

def blades(N):
    x, y = scatter(N, -34, 34, -8, 38)
    _, dirt = ground_color(x, y, np.zeros_like(x))
    rv = np.exp(-(poly_dist(x, y, RIVER) / 2.6) ** 2)
    view = np.abs(x) < (y + 22) * 0.62
    eb = (x / CLEAR_R[0]) ** 2 + ((y - CLEAR_C[1]) / CLEAR_R[1]) ** 2
    view &= rng.random(N) < sstep(.75, 1.25, eb)          # board area stays clear
    keep = (rng.random(N) < (1 - dirt) * (1 - rv) * 0.95) & view
    keep &= rng.random(N) < np.clip(1.25 - (y + 8) / 50, 0.25, 1)
    x, y = x[keep], y[keep]
    z = height(x, y); gc, _ = ground_color(x, y, z)
    K = 4; m = len(x)
    bx = np.repeat(x, K) + rng.normal(0, .12, m * K); by = np.repeat(y, K) + rng.normal(0, .12, m * K)
    bz = np.repeat(z, K) - 0.03
    ang = rng.uniform(0, math.pi, m * K); w = rng.uniform(.05, .09, m * K) * 0.5
    big = np.repeat(1 + 0.6 * sstep(-6, -2, -y) , K)                   # taller tufts at the very front
    hgt = rng.uniform(.22, .5, m * K) * big * np.repeat(0.8 + 0.5 * fbm(x * .2, y * .2, 51), K)
    lean = rng.normal(0, .07, (m * K, 2))
    p0 = np.c_[bx + np.cos(ang) * w, by + np.sin(ang) * w, bz]
    p1 = np.c_[bx - np.cos(ang) * w, by - np.sin(ang) * w, bz]
    p2 = np.c_[bx + lean[:, 0], by + lean[:, 1], bz + hgt]
    verts = np.stack([p0, p1, p2], 1).reshape(-1, 3)
    faces = np.arange(m * K * 3).reshape(-1, 3)
    g = np.repeat(gc ** (1 / 2.2), K, axis=0) * rng.uniform(.85, 1.15, (m * K, 1))
    base = (g * .45) ** 2.2; tip = np.clip(g * 1.25 + np.array([.05, .04, 0]), 0, 1) ** 2.2
    cols = np.stack([base, base, tip], 1).reshape(-1, 3)
    ob = build_mesh('grass', verts, faces, np.c_[cols, np.ones(len(cols))], smooth=False)
    ob.data.materials.append(M_GRASS); return len(faces)

def flowers(N):
    x, y = scatter(N, -34, 34, -8, 30)
    _, dirt = ground_color(x, y, np.zeros_like(x))
    patch = fbm(x * .15, y * .15, 61)
    keep = (dirt < .1) & (patch > .62) & (rng.random(len(x)) < .5) & (np.abs(x) < (y + 22) * 0.62)
    x, y = x[keep], y[keep]; m = len(x)
    z = height(x, y) + rng.uniform(.25, .55, m)
    s = rng.uniform(.04, .075, m) * (1 + 0.6 * sstep(-6, -2, -y))
    pal = np.array([[1.0, .85, .25], [.98, .96, .9], [.72, .45, .95], [1.0, .55, .6], [1.0, .7, .2]])
    c = pal[rng.integers(0, len(pal), m)] ** 2.2
    off = np.array([[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]], float)
    verts = (np.c_[x, y, z][:, None, :] + off[None] * s[:, None, None]).reshape(-1, 3)
    oct_f = np.array([[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4], [1, 0, 5], [2, 1, 5], [3, 2, 5], [0, 3, 5]])
    faces = (oct_f[None] + 6 * np.arange(m)[:, None, None]).reshape(-1, 3)
    ob = build_mesh('flowers', verts, faces, np.c_[np.repeat(c, 6, 0), np.ones(m * 6)], smooth=False)
    ob.data.materials.append(M_FLOWER)

nbl = blades(30000 if FAST else 900000)
flowers(3000 if FAST else 30000)

# ---------------- trees, bushes, rocks ----------------
cloud_tex = bpy.data.textures.new('clouds', 'CLOUDS'); cloud_tex.noise_scale = 0.9
def blob(name, loc, r, mat, sub=3, disp=.45, sq=1.0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    o = bpy.context.object; o.name = name; o.scale.z = sq
    md = o.modifiers.new('d', 'DISPLACE'); md.texture = cloud_tex; md.strength = r * disp; md.mid_level = .5
    o.data.materials.append(mat); bpy.ops.object.shade_smooth(); return o

def tree(x, y, s, seed, mat=None, sub=3):
    r = np.random.default_rng(seed); z = float(height(np.array(x), np.array(y)))
    th = 4.2 * s
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=.42 * s, radius2=.22 * s, depth=th, location=(x, y, z + th / 2 - .2))
    t = bpy.context.object; t.data.materials.append(M_BARK); bpy.ops.object.shade_smooth()
    for k in range(3):                                             # branches
        a = r.uniform(0, 2 * math.pi)
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=.16 * s, radius2=.06 * s, depth=2.0 * s,
                                        location=(x + math.cos(a) * .7 * s, y + math.sin(a) * .7 * s, z + th * .8),
                                        rotation=(math.cos(a) * .9, -math.sin(a) * .9, 0))
        bpy.context.object.data.materials.append(M_BARK)
    for k in range(int(r.integers(7, 11))):
        a = r.uniform(0, 2 * math.pi); d = r.uniform(.4, 1.9) * s
        blob('leaf', (x + math.cos(a) * d, y + math.sin(a) * d * .8, z + th + r.uniform(-.6, 2.4) * s),
             r.uniform(1.3, 2.1) * s, mat or M_LEAF, sub)

tree(17.5, 18, 1.75, 1)          # big tree, right
tree(25, 30, 1.3, 2); tree(-27, 36, 1.4, 3); tree(-33, 44, 1.2, 4); tree(-21, 47, 1.0, 5)
tree(-12, 28, 0.85, 6); tree(31, 22, 1.2, 7)
# distant trees on the hills (simple blobs)
xs = rng.uniform(-420, 420, 2400); ys = 60 + rng.uniform(0, 1, 2400) ** 1.5 * 480
ok = (np.abs(xs) < (ys + 20) * 0.75) & (fbm(xs * .02, ys * .02, 41) > .40) & (poly_dist(xs, ys, RIVER) > 5) & (poly_dist(xs, ys, ROAD) > 6)
cnt = 0
for x, y in zip(xs[ok], ys[ok]):
    if cnt >= (120 if FAST else 300): break
    z = float(height(np.array(x), np.array(y))); s = rng.uniform(1.4, 3.0)
    blob('ftree', (x, y, z + s * .55), s, M_LEAF_FAR, sub=2, disp=.35, sq=.95)
    for j in range(2): blob('ftree', (x + rng.uniform(-1.6, 1.6) * s, y + rng.uniform(-1, 1) * s, z + s * .4), s * rng.uniform(.6, .9), M_LEAF_FAR, sub=2, disp=.35, sq=.9); cnt += 1
# bushes framing the corners + clearing edge
for (x, y, r) in [(-15, -3, 1.6), (-12.5, -4.5, 1.1), (-18, 2, 1.8), (15.5, -2.5, 1.5), (13, -5, 1.0),
                  (19, 4, 1.9), (-13, 11, 1.2), (11, 12, 1.0), (-6, 15, .8), (4, 16, .9)]:
    z = float(height(np.array(x), np.array(y))); blob('bush', (x, y, z + r * .45), r, M_BUSH, sq=.75)
for (x, y, r) in [(-21, 12, .9), (-17.5, 17, .6), (-10.5, 9.5, .5), (12, 9, .45), (22, 10, .8)]:
    z = float(height(np.array(x), np.array(y))); blob('rock', (x, y, z + r * .25), r, M_ROCK, sub=2, disp=.3, sq=.6)

# ---------------- light / world ----------------
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(40), 0, math.radians(118)))
sun = bpy.context.object.data; sun.energy = 4.2; sun.color = (1.0, 0.94, 0.82); sun.angle = math.radians(2)
wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True; nt = wd.node_tree
bg = nt.nodes['Background']; tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
cr = nt.nodes.new('ShaderNodeValToRGB')
cr.color_ramp.elements[0].position = 0.5; cr.color_ramp.elements[0].color = (0.62, 0.72, 0.82, 1)
cr.color_ramp.elements[1].position = 0.85; cr.color_ramp.elements[1].color = (0.20, 0.38, 0.75, 1)
nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], cr.inputs[0])
nt.links.new(cr.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 1.0

# ---------------- camera: level axis + lens shift (straight verticals, sprite-friendly) ----------------
CAM_H = 6.0; CAM_Y = -21.0; LENS = 35.0
HORIZON = 0.30                                           # horizon at 25 % from the top
Hmm = 36.0 * H / W
bpy.ops.object.camera_add(location=(0, CAM_Y, CAM_H), rotation=(math.radians(90), 0, 0))
cam = bpy.context.object; sc.camera = cam
cam.data.lens = LENS; cam.data.sensor_fit = 'HORIZONTAL'; cam.data.sensor_width = 36
cam.data.shift_y = -(0.5 - HORIZON) * Hmm / 36.0
cam.data.clip_end = 3000

# ---------------- render ----------------
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
sc.cycles.samples = int(os.environ.get('SAMPLES', 12 if FAST else 64)); sc.cycles.use_denoising = True
sc.cycles.max_bounces = 4; sc.cycles.diffuse_bounces = 2; sc.cycles.glossy_bounces = 2; sc.cycles.transmission_bounces = 2
sc.render.resolution_x, sc.render.resolution_y = W, H; sc.render.resolution_percentage = 100
sc.render.film_transparent = True                         # sky is painted in post (alpha = sky mask)
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.filepath = BASE + '_raw.png'

# board cells in screen space (fraction of width/height from top-left) + sprite height for 1.7 units
cells = []
for side, sx in (('P', -1), ('E', 1)):
    for li, ly in enumerate(LANES):
        for ci, cx in enumerate(COLS):
            x = sx * cx; z = float(height(np.array(x), np.array(ly)))
            a = world_to_camera_view(sc, cam, Vector((x, ly, z))); b = world_to_camera_view(sc, cam, Vector((x, ly, z + 1.7)))
            cells.append({'side': side, 'lane': li, 'col': ['front', 'mid', 'back'][ci],
                          'x': round(a.x, 4), 'y': round(1 - a.y, 4), 'h': round(b.y - a.y, 4)})
json.dump({'w': W, 'h': H, 'horizon': HORIZON, 'sun_dir': [-0.55, -0.25, -0.8], 'cells': cells},
          open(BASE + '_cells.json', 'w'), indent=1)
print('grass blades', nbl)
bpy.ops.render.render(write_still=True)
print('DONE', BASE + '_raw.png')
