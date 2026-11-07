# Automon Arena — "rune plaza on a grassy highland" battle scene (v4, set 132/134; spec claude/art-style.md §8).
# Ancient round stone plaza on a high meadow, standing stones with our own glowing rune glyphs,
# a ruined arch on a far hill, layered hazy hills. Camera A: high, looking down, horizon ~40 % from top.
# The 12 board cells get carved rings on the floor; standing stones stay out of the cells' screen area.
# Characters are NOT in the scene (the game draws sprites on top; cells -> <out>_cells.json).
# Run: pip install bpy pillow ; python runeplaza_scene.py <out.png>   (env SAMPLES, W, H, FAST=1)
# Helpers (noise, build_mesh, haze, grass) come from meadow_scene.py (v1, rejected scene).
import bpy, math, sys, os, json
import numpy as np
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

OUT = os.path.abspath(sys.argv[-1]); BASE = os.path.splitext(OUT)[0]
W = int(os.environ.get('W', 1600)); H = int(os.environ.get('H', 740))
FAST = os.environ.get('FAST') == '1'
rng = np.random.default_rng(132)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------------- noise (numpy) ----------------
def _hash(i, j, s):
    n = (i.astype(np.uint64) * np.uint64(374761393) + j.astype(np.uint64) * np.uint64(668265263)
         + np.uint64(s * 982451653 + 1013904223)) & np.uint64(0xffffffff)
    n = ((n ^ (n >> np.uint64(13))) * np.uint64(1274126177)) & np.uint64(0xffffffff)
    return ((n ^ (n >> np.uint64(16))) & np.uint64(0xffff)).astype(np.float64) / 65535.0

def vnoise(x, y, s=0):
    x = np.asarray(x, float); y = np.asarray(y, float)
    xi = np.floor(x); yi = np.floor(y); xf = x - xi; yf = y - yi
    xi = xi.astype(np.int64) + 100000; yi = yi.astype(np.int64) + 100000
    u = xf * xf * (3 - 2 * xf); v = yf * yf * (3 - 2 * yf)
    a = _hash(xi, yi, s); b = _hash(xi + 1, yi, s); c = _hash(xi, yi + 1, s); d = _hash(xi + 1, yi + 1, s)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v

def fbm(x, y, s=0, octv=5):
    t = 0.0; amp = 0.5; norm = 0.0
    for k in range(octv):
        t = t + amp * vnoise(np.asarray(x) * 2 ** k, np.asarray(y) * 2 ** k, s + k); norm += amp; amp *= 0.5
    return t / norm

def sstep(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

# ---------------- layout ----------------
# board: 2 sides x 3 columns (front/mid/back) x 2 lanes; player = left (x < 0)
PC = (0.0, 3.0)               # plaza centre
LANES = (0.0, 6.0)            # y of near / far lane
COLS = (2.8, 6.0, 9.2)        # |x| of front / mid / back column
PR = 12.3                     # plaza radius
CELL_R = 1.2                  # carved ring under each cell
CELLS = [(sx * cx, ly) for sx in (-1, 1) for ly in LANES for cx in COLS]
ARCH = (78.0, 250.0)          # ruined arch on top of a far hill (right of centre)

def pr(x, y): return np.hypot(np.asarray(x) - PC[0], np.asarray(y) - PC[1])

def height(x, y):
    x = np.asarray(x, float); y = np.asarray(y, float); r = pr(x, y)
    flat = sstep(PR + 1.5, PR + 9, r)                               # plaza ground stays flat
    roll = (fbm(x * .035, y * .035, 1) - .5) * 2.0 + (fbm(x * .13, y * .13, 3) - .5) * .5
    side = sstep(18, 60, np.abs(x)) * fbm(x * .02, y * .02, 4) * 9   # mounds left/right
    drop = -sstep(30, 130, y) * 22                                   # plateau edge -> valley
    hills = sstep(120, 260, y) * (fbm(x * .008, y * .008, 5, 4) * 44 - 10)
    hills2 = sstep(380, 600, y) * (fbm(x * .004, y * .004, 9, 4) * 80 - 10)
    ridge = 1 - np.abs(2 * fbm(x * .0025, y * .0025, 7, 5) - 1)
    mount = sstep(900, 1400, y) * ridge ** 1.5 * 150
    arch = 46 * np.exp(-((x - ARCH[0]) ** 2 + (y - ARCH[1]) ** 2) / (2 * 34 ** 2)) ** 1.3   # the arch's own hill
    return flat * (roll + side) + drop + hills + hills2 + mount + arch

def ground_color(x, y, h):
    x = np.asarray(x, float); y = np.asarray(y, float)
    g1 = np.array([0.24, 0.36, 0.13]); g2 = np.array([0.47, 0.54, 0.22]); g3 = np.array([0.70, 0.64, 0.34])
    m = fbm(x * .03, y * .03, 23)[..., None]; m2 = sstep(.6, .8, fbm(x * .06, y * .06, 29))[..., None]
    c = g1 + (g2 - g1) * m; c = c + (g3 - c) * m2 * .55
    far = np.clip((y - 60) / 260, 0, 1)[..., None]
    c = c + (np.array([0.24, 0.45, 0.22]) - c) * far * .7
    worn = (1 - sstep(PR - .2, PR + 2.2, pr(x, y) + (fbm(x * .4, y * .4, 33) - .5) * 1.5))[..., None]
    c = c + (np.array([0.50, 0.44, 0.30]) - c) * worn * .45            # trodden ring round the plaza
    dry = sstep(.55, .75, fbm(x * .09, y * .09, 91))[..., None] * (1 - worn)
    c = c + (np.array([0.66, 0.58, 0.30]) - c) * dry * .55
    forest = sstep(.53, .62, fbm(x * .012, y * .012, 41))[..., None] * np.clip((y - 110) / 60, 0, 1)[..., None]
    c = c + (np.array([0.10, 0.24, 0.09]) - c) * forest * .8
    shade = sstep(.52, .7, fbm(x * .004 + 3.1, y * .004, 97))[..., None] * np.clip((y - 50) / 80, 0, 1)[..., None]
    c = c * (1 - shade * .4)
    rock = sstep(.6, .8, fbm(x * .015, y * .015, 37))[..., None] * np.clip((h - 30) / 60, 0, 1)[..., None]
    c = c + (np.array([0.46, 0.48, 0.50]) - c) * rock
    return np.clip(c, 0, 1) ** 2.2

# ---------------- mesh helpers ----------------
def build_mesh(name, verts, faces, pcol=None, smooth=True, extra=None):
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
    for nm, val in (extra or {}).items():
        a = me.attributes.new(nm, 'FLOAT', 'POINT'); a.data.foreach_set('value', val.astype(np.float32).ravel())
    if smooth: me.shade_smooth()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    return ob

def grid_faces(nx, ny):
    idx = np.arange(nx * ny).reshape(ny, nx)
    return np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], -1).reshape(-1, 4)

def terrain(name, x0, x1, y0, y1, nx, ny, ypow=1.0, hole=False):
    xs = np.linspace(x0, x1, nx); ys = y0 + (y1 - y0) * np.linspace(0, 1, ny) ** ypow
    X, Y = np.meshgrid(xs, ys); Z = height(X, Y)
    col = ground_color(X, Y, Z)
    verts = np.stack([X, Y, Z], -1).reshape(-1, 3)
    return build_mesh(name, verts, grid_faces(nx, ny), np.concatenate([col.reshape(-1, 3), np.ones((nx * ny, 1))], 1))

# ---------------- materials ----------------
HAZE = (0.50, 0.68, 0.96)
def haze_wrap(nt, bsdf_out, near=90, far=2000, maxf=0.82, pw=0.85):
    cam = nt.nodes.new('ShaderNodeCameraData')
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs[1].default_value = near; mr.inputs[2].default_value = far
    mr.inputs[3].default_value = 0; mr.inputs[4].default_value = maxf
    nt.links.new(cam.outputs['View Distance'], mr.inputs[0])
    gpos = nt.nodes.new('ShaderNodeNewGeometry'); gsep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(gpos.outputs['Position'], gsep.inputs[0])
    mz = nt.nodes.new('ShaderNodeMapRange'); mz.inputs[1].default_value = -24; mz.inputs[2].default_value = -2
    mz.inputs[3].default_value = .55; mz.inputs[4].default_value = 0
    nt.links.new(gsep.outputs['Z'], mz.inputs[0])
    mxm = nt.nodes.new('ShaderNodeMath'); mxm.operation = 'MAXIMUM'
    nt.links.new(mr.outputs[0], mxm.inputs[0]); nt.links.new(mz.outputs[0], mxm.inputs[1])
    mr = mxm
    pwn = nt.nodes.new('ShaderNodeMath'); pwn.operation = 'POWER'; pwn.inputs[1].default_value = pw
    nt.links.new(mr.outputs[0], pwn.inputs[0])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*HAZE, 1); em.inputs['Strength'].default_value = 1.1
    mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(pwn.outputs[0], mx.inputs[0]); nt.links.new(bsdf_out, mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes['Material Output'].inputs['Surface'])

def vcol_node(nt, detail, nfac):
    at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'col'
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = detail; nz.inputs['Detail'].default_value = 6
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs[3].default_value = 1 - nfac; mr.inputs[4].default_value = 1 + nfac * .6
    nt.links.new(nz.outputs['Fac'], mr.inputs[0])
    mul = nt.nodes.new('ShaderNodeVectorMath'); mul.operation = 'SCALE'
    nt.links.new(at.outputs['Color'], mul.inputs[0]); nt.links.new(mr.outputs[0], mul.inputs['Scale'])
    return mul.outputs[0]

def mat_vcol(name, detail=40.0, rough=0.95, nfac=0.3, trans=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    c = vcol_node(nt, detail, nfac); nt.links.new(c, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    out = b.outputs[0]
    if trans > 0:
        tr = nt.nodes.new('ShaderNodeBsdfTranslucent'); nt.links.new(c, tr.inputs['Color'])
        ms = nt.nodes.new('ShaderNodeMixShader'); ms.inputs[0].default_value = trans
        nt.links.new(out, ms.inputs[1]); nt.links.new(tr.outputs[0], ms.inputs[2]); out = ms.outputs[0]
    haze_wrap(nt, out); return m

GLOW = (0.10, 0.52, 1.0)
def mat_plaza():
    """vertex colour slabs + faint rune-blue glow in the carved cell rings (attribute 'glow')."""
    m = bpy.data.materials.new('plaza'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    c = vcol_node(nt, 18, .22); nt.links.new(c, b.inputs['Base Color']); b.inputs['Roughness'].default_value = .9
    g = nt.nodes.new('ShaderNodeAttribute'); g.attribute_name = 'glow'; g.attribute_type = 'GEOMETRY'
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*GLOW, 1); em.inputs['Strength'].default_value = 1.5
    ad = nt.nodes.new('ShaderNodeAddShader')
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 1.0
    nt.links.new(g.outputs['Fac'], mul.inputs[0])
    ms = nt.nodes.new('ShaderNodeMixShader')                   # glow -> emission blend
    nt.links.new(mul.outputs[0], ms.inputs[0]); nt.links.new(b.outputs[0], ms.inputs[1]); nt.links.new(em.outputs[0], ms.inputs[2])
    haze_wrap(nt, ms.outputs[0]); return m

def mat_stone(name, base=(0.58, 0.57, 0.53), moss=(0.36, 0.48, 0.16), mossamt=.5):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.5; nz.inputs['Detail'].default_value = 8
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    cr = nt.nodes.new('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].position = .3; cr.color_ramp.elements[0].color = (*[v * .62 for v in [c ** 2.2 for c in base]], 1)
    cr.color_ramp.elements[1].position = .75; cr.color_ramp.elements[1].color = (*[min(1, v * 1.25) for v in [c ** 2.2 for c in base]], 1)
    nt.links.new(nz.outputs['Fac'], cr.inputs[0])
    # moss: on upward faces + noisy patches
    geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Normal'], sep.inputs[0])
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 2.2; n2.inputs['Detail'].default_value = 5
    nt.links.new(tc.outputs['Object'], n2.inputs['Vector'])
    ad = nt.nodes.new('ShaderNodeMath'); ad.operation = 'ADD'
    sc1 = nt.nodes.new('ShaderNodeMath'); sc1.operation = 'MULTIPLY'; sc1.inputs[1].default_value = .55
    nt.links.new(sep.outputs['Z'], sc1.inputs[0])
    nt.links.new(sc1.outputs[0], ad.inputs[0]); nt.links.new(n2.outputs['Fac'], ad.inputs[1])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs[1].default_value = 1.05 - mossamt * .25; mr.inputs[2].default_value = 1.2 - mossamt * .25
    nt.links.new(ad.outputs[0], mr.inputs[0])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    nt.links.new(mr.outputs[0], mix.inputs['Factor']); nt.links.new(cr.outputs[0], mix.inputs['A'])
    mix.inputs['B'].default_value = (*[c ** 2.2 for c in moss], 1)
    nt.links.new(mix.outputs['Result'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = .92
    bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = .35
    n3 = nt.nodes.new('ShaderNodeTexNoise'); n3.inputs['Scale'].default_value = 9; n3.inputs['Detail'].default_value = 10
    nt.links.new(tc.outputs['Object'], n3.inputs['Vector'])
    nt.links.new(n3.outputs['Fac'], bm.inputs['Height']); nt.links.new(bm.outputs[0], b.inputs['Normal'])
    haze_wrap(nt, b.outputs[0]); return m

def mat_glow():
    m = bpy.data.materials.new('rune'); m.use_nodes = True; nt = m.node_tree
    nt.nodes.remove(nt.nodes['Principled BSDF'])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*GLOW, 1); em.inputs['Strength'].default_value = 3.2
    haze_wrap(nt, em.outputs[0]); return m

M_TERR = mat_vcol('terrain', detail=35, nfac=.22)
M_GRASS = mat_vcol('grass', detail=2, nfac=.15, trans=.3)
M_FLOWER = mat_vcol('flower', detail=1, nfac=.05)
M_PLAZA = mat_plaza()
M_STONE = mat_stone('stone')
M_STONE2 = mat_stone('stone_old', base=(0.52, 0.52, 0.50), mossamt=.8)
M_RUNE = mat_glow()

# ---------------- terrain ----------------
terrain('near', -110, 110, -22, 150, 70 if FAST else 520, 60 if FAST else 420, ypow=1.4).data.materials.append(M_TERR)
far = terrain('far', -3000, 3000, 130, 3200, 70 if FAST else 340, 50 if FAST else 240, ypow=1.7)
far.data.materials.append(M_TERR); far.location.z = -0.8

# ---------------- plaza: concentric flagstones (Voronoi) + carved rings matching the 12 cells ----------------
def slab_seeds():
    pts = [(0.0, 0.0)]; ring = 1.55
    k = 1
    while ring * k < PR + .3:
        r0 = ring * (k - .5) + ring * .5; n = max(6, int(2 * math.pi * r0 / 1.55))
        off = rng.uniform(0, 2 * math.pi)
        for i in range(n):
            a = off + 2 * math.pi * (i + rng.uniform(-.18, .18)) / n
            rr = r0 + rng.uniform(-.22, .22) * ring
            pts.append((math.cos(a) * rr, math.sin(a) * rr))
        k += 1
    return np.array(pts) + np.array(PC)

SEEDS = slab_seeds(); SEED_TONE = rng.uniform(0, 1, len(SEEDS)); SEED_MOSS = rng.uniform(0, 1, len(SEEDS))

def voronoi(x, y):
    f1 = np.full(x.shape, 1e9); f2 = np.full(x.shape, 1e9); id1 = np.zeros(x.shape, int)
    # anisotropic metric along the ring direction -> slabs follow the circles like the target
    for i, (sx, sy) in enumerate(SEEDS):
        d = np.hypot(x - sx, y - sy)
        sw = d < f1
        f2 = np.where(sw, f1, np.minimum(f2, d)); id1 = np.where(sw, i, id1); f1 = np.where(sw, d, f1)
    return f1, f2, id1

def plaza():
    n = 110 if FAST else 760
    xs = np.linspace(PC[0] - PR - .2, PC[0] + PR + .2, n); ys = np.linspace(PC[1] - PR - .2, PC[1] + PR + .2, n)
    X, Y = np.meshgrid(xs, ys)
    jx = X + (fbm(X * .9, Y * .9, 71) - .5) * .5; jy = Y + (fbm(X * .9, Y * .9, 73) - .5) * .5
    R = pr(X, Y) + (fbm(X * 1.3, Y * 1.3, 75) - .5) * .35           # ragged outer edge
    f1, f2, sid = voronoi(jx, jy)
    gap = f2 - f1
    crack = 1 - sstep(.05, .13, gap)                                 # mortar lines with grass
    tone = SEED_TONE[sid]; mossy = SEED_MOSS[sid]
    sl1 = np.array([0.50, 0.49, 0.45]); sl2 = np.array([0.64, 0.60, 0.53]); sl3 = np.array([0.46, 0.48, 0.47])
    c = sl1 + (sl2 - sl1) * tone[..., None]
    c = c + (sl3 - c) * sstep(.6, .9, fbm(X * .25, Y * .25, 77))[..., None] * .7
    lich = sstep(.62, .75, fbm(X * 1.8, Y * 1.8, 79))[..., None] * .35
    c = c + (np.array([0.78, 0.66, 0.44]) - c) * lich                # warm lichen flecks
    mz = sstep(.48, .66, fbm(X * .7, Y * .7, 81) * .7 + mossy * .3 + crack * .3 + sstep(PR - 3, PR, pr(X, Y)) * .12)[..., None]
    c = c + (np.array([0.33, 0.43, 0.14]) - c) * mz * .8             # moss patches (more toward the rim)
    dirt = sstep(.5, .8, fbm(X * .45, Y * .45, 87))[..., None]
    c = c * (1 - dirt * .22)                                         # dark weathering stains
    rust = sstep(.66, .78, fbm(X * .9 + 4, Y * .9, 89))[..., None] * .4
    c = c + (np.array([0.62, 0.42, 0.26]) - c) * rust                # rusty lichen like the target
    hair = 1 - sstep(.0, .035, np.abs(fbm(X * .55, Y * .55, 93) - .5))  # hairline cracks inside slabs
    hair = hair * sstep(.45, .6, fbm(X * .3, Y * .3, 95))
    c = c * (1 - hair[..., None] * .45)
    c = c + (np.array([0.22, 0.36, 0.10]) - c) * crack[..., None] * .9
    # carved design: outer border ring, centre line between the sides, a ring under each board cell
    groove = np.zeros(X.shape); glow = np.zeros(X.shape)
    def ring(d, r, w):
        return 1 - sstep(w * .5, w, np.abs(d - r))
    groove = np.maximum(groove, ring(pr(X, Y), PR - .75, .16))
    groove = np.maximum(groove, ring(pr(X, Y), PR - 1.05, .08) * .7)
    cl = (1 - sstep(.05, .11, np.abs(X - PC[0]))) * (np.abs(Y - PC[1]) < PR - .9)
    groove = np.maximum(groove, cl * .8)
    for (cx, cy) in CELLS:
        d = np.hypot(X - cx, Y - cy)
        rg = ring(d, CELL_R, .13); groove = np.maximum(groove, rg)
        glow = np.maximum(glow, rg * .55 + ring(d, CELL_R, .3) * .15)
        dot = 1 - sstep(.10, .17, d); groove = np.maximum(groove, dot * .8); glow = np.maximum(glow, dot * .5)
    # little tick marks on the border ring (12, one per cell direction) for a designed feel
    ang = np.arctan2(Y - PC[1], X - PC[0])
    tick = (1 - sstep(.04, .09, np.abs(((ang * 24 / (2 * np.pi)) + .5) % 1 - .5) * pr(X, Y) / 3.5)) * ring(pr(X, Y), PR - .45, .5)
    groove = np.maximum(groove, tick * .8)
    groove = groove * (1 - crack * .5)
    c = c * (1 - groove[..., None] * .55)
    edge = sstep(.13, .22, gap)                                      # slab tops lighter than their worn edges
    c = c * (.86 + .14 * edge[..., None])
    glow = glow * (1 - crack * .6)
    Z = height(X, Y) + .09 - groove * .035 - crack * .05 - hair * .01 + (fbm(X * 3, Y * 3, 83) - .5) * .02 \
        + (tone - .5) * .04 * (pr(X, Y) / PR)                       # outer slabs sit unevenly
    sr = pr(SEEDS[:, 0], SEEDS[:, 1]); gone = (sr > PR - 2.2) & (np.random.default_rng(9).random(len(SEEDS)) < .26)
    gone &= ~((SEEDS[:, 1] < PC[1] - PR + 3) & (np.abs(SEEDS[:, 0]) < 4))
    keep = (R < PR) & ~gone[sid]
    global MISSING; MISSING = gone
    verts = np.stack([X, Y, Z], -1).reshape(-1, 3)
    faces = grid_faces(n, n)
    kf = keep.ravel()[faces].all(1); faces = faces[kf]
    col = np.concatenate([np.clip(c, 0, 1).reshape(-1, 3) ** 2.2, np.ones((n * n, 1))], 1)
    ob = build_mesh('plaza', verts, faces, col, extra={'glow': glow.ravel()})
    ob.data.materials.append(M_PLAZA)
    # thin kerb so the slab edge reads as raised stone
    return ob

plaza()

# ---------------- rune glyphs (own designs: not real runes, not latin letters) ----------------
def circ(cx, cy, r, a0=0, a1=360, n=12):
    return [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in np.linspace(a0, a1, n)]
GLYPHS = [
    [circ(0, .76, .19), [(0, .57), (0, .12)], [(0, .12), (-.26, -.02)], [(0, .38), (.24, .5)]],   # eye on a branch
    [[(-.34, 1), (0, .62), (.34, 1)], [(-.34, 0), (0, .38), (.34, 0)], [(-.06, .5), (.06, .5)]],   # meeting chevrons
    [[(-.34, .36), (.34, .36), (0, .96), (-.34, .36)], [(0, .36), (0, 0)], [(-.14, .14), (.14, .14)]],  # peak on a root
    [[(.3, 1), (-.3, 1), (-.3, .28), (.18, .28), (.18, .62), (-.06, .62)], [(.3, 1), (.3, .1)]],     # folded spiral
    [circ(0, .42, .32, 0, 180, 9), [(-.4, .42), (.4, .42)], [(0, .42), (0, 0)], [(0, .74), (0, .92)]],  # rising sun
    [[(0, 1), (.28, .66), (0, .32), (-.28, .66), (0, 1)], [(0, .32), (-.24, 0)], [(0, .32), (.24, 0)]],  # seed with legs
    [[(-.32, .25), (.06, .95)], [(-.04, .1), (.34, .8)], circ(.26, .1, .1, n=9)],      # twin strokes + pebble
]

def glyph_mesh(strokes, scale, w=.075, dep=.12):
    verts = []; faces = []
    for pl in strokes:
        for (ax, ay), (bx, by) in zip(pl[:-1], pl[1:]):
            ax, ay, bx, by = ax * scale, ay * scale, bx * scale, by * scale
            dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1e-6; nx, ny = -dy / L * w / 2, dx / L * w / 2
            ex, ey = dx / L * w / 2, dy / L * w / 2           # extend ends so joints close
            q = [(ax - ex + nx, ay - ey + ny), (bx + ex + nx, by + ey + ny), (bx + ex - nx, by + ey - ny), (ax - ex - nx, ay - ey - ny)]
            b = len(verts)
            for (u, v) in q: verts.append((u, -dep, v))
            for (u, v) in q: verts.append((u, dep * .3, v))
            faces += [[b, b + 1, b + 2, b + 3], [b + 4, b + 7, b + 6, b + 5], [b, b + 4, b + 5, b + 1],
                      [b + 1, b + 5, b + 6, b + 2], [b + 2, b + 6, b + 7, b + 3], [b + 3, b + 7, b + 4, b]]
    return np.array(verts), np.array(faces)

cloud_tex = bpy.data.textures.new('clouds', 'CLOUDS'); cloud_tex.noise_scale = 0.7
CAM = None   # set below; stones face a point between the camera and the plaza centre

voro_tex = bpy.data.textures.new('vor', 'VORONOI'); voro_tex.noise_scale = 1.3

def stone_mesh(h, w, d, r, broken=False):
    """irregular weathered monolith: 10-sided rings with per-vertex noise, flat worked front (-y), rounded/slanted top."""
    NS, NZ = 12, 16
    ang = np.linspace(0, 2 * np.pi, NS, endpoint=False) + r.uniform(0, .3)
    jit = r.normal(0, .07, (NZ + 1, NS))
    for _ in range(3): jit = (jit + np.roll(jit, 1, 0) + np.roll(jit, -1, 0)) / 3   # smooth along height
    drift = np.cumsum(r.normal(0, .025, (NZ + 1, 2)), 0) * w
    slant = r.uniform(-.45, .45); topz = np.ones(NS)
    if broken: topz = 1 + r.uniform(-.25, .1, NS)
    verts = []
    for k in range(NZ + 1):
        t = k / NZ
        taper = 1 - .3 * t ** 1.4 + .08 * (1 - t) ** 6                  # wider foot
        rnd = math.sqrt(max(0.0, 1 - ((t - .8) / .2) ** 2)) if t > .8 else 1.0
        s = taper * max(rnd, .22)
        x = np.cos(ang) * w / 2 * s * (1 + jit[k]); y = np.sin(ang) * d / 2 * s * (1 + jit[k] * .6)
        y = np.maximum(y, -d / 2 * s * .78)                               # flatter front face for the runes
        z = t * h * (topz if broken and k == NZ else 1) + slant * x * t ** 3
        for i in range(NS): verts.append((x[i] + drift[k, 0], y[i] + drift[k, 1], float(z[i] if np.ndim(z) else z)))
    tc = len(verts); top = np.mean(np.array(verts[-NS:]), 0); verts.append((top[0], top[1], top[2] + h * .015))
    bc = len(verts); verts.append((drift[0, 0], drift[0, 1], 0))
    faces = []
    for k in range(NZ):
        for i in range(NS):
            a = k * NS + i; b = k * NS + (i + 1) % NS
            faces.append([a, b, b + NS, a + NS])
    for i in range(NS):
        faces.append([NZ * NS + i, NZ * NS + (i + 1) % NS, tc, tc]); faces.append([(i + 1) % NS, i, bc, bc])
    faces = [f[:3] if f[2] == f[3] else f for f in faces]
    quads = [f for f in faces if len(f) == 4]; tris = [f for f in faces if len(f) == 3]
    return np.array(verts), quads, tris

def build_poly(name, verts, quads, tris):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in quads + tris]); me.update()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); return ob

def standing_stone(x, y, h, w, d, seed, glyphs=(), face_to=(0, -26), lean=(0, 0), mat=None, broken=False):
    r = np.random.default_rng(seed)
    v, q, t = stone_mesh(h, w, d, r, broken)
    ob = build_poly('stone', v, q, t); ob.data.materials.append(mat or M_STONE)
    ss = ob.modifiers.new('s', 'SUBSURF'); ss.levels = ss.render_levels = 1 if FAST else 2
    d1 = ob.modifiers.new('d1', 'DISPLACE'); d1.texture = voro_tex; d1.strength = .16; d1.mid_level = .5; d1.texture_coords = 'OBJECT'
    d2 = ob.modifiers.new('d2', 'DISPLACE'); d2.texture = cloud_tex; d2.strength = .05; d2.mid_level = .5; d2.texture_coords = 'OBJECT'
    for p in ob.data.polygons: p.use_smooth = True
    z = float(height(x, y)) - .5
    ob.location = (x, y, z)
    ang = math.atan2(face_to[1] - y, face_to[0] - x) + math.pi / 2   # local -y faces the target
    ob.rotation_euler = (lean[0], lean[1], ang)
    if not glyphs: return ob
    dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg)
    def front(u, vz):
        ok, loc, nor, _ = ev.ray_cast(Vector((u, -5.0, vz)), Vector((0, 1, 0)))
        return loc.y if ok else -d / 2
    hh = h * (.7 if broken else 1)
    gs = min(w * .45, .95); top = hh * .86 - gs
    for k, gi in enumerate(glyphs):
        vz = top - k * gs * 1.3
        if vz < .7: break
        gv, gf = glyph_mesh(GLYPHS[gi], gs, w=.09, dep=.06)
        cx = float(np.mean(np.array(v)[:, 0])) * 0
        gv[:, 2] += vz
        for i in range(len(gv)):                                       # stick each stroke vertex to the stone face
            fy = front(gv[i, 0], gv[i, 2]); gv[i, 1] = fy + (-.05 if gv[i, 1] < 0 else .12)
        g = build_mesh('rune', gv, gf, smooth=False); g.data.materials.append(M_RUNE)
        g.parent = ob
    return ob

# stones ring: behind the far lane and out at the sides; the near (camera) side is left open so
# no stone covers a board cell. Front corners are pushed far out to frame the picture.
STONES = [
    # x, y, h, w, d, glyphs
    (-17.0, 8.0, 6.6, 2.3, 1.5, (0, 3)),
    (-12.6, 15.2, 8.0, 2.7, 1.7, (2, 5, 1)),
    (-8.4, 17.2, 4.2, 1.8, 1.3, (6,)),
    (-4.2, 19.5, 2.6, 1.6, 1.2, ()),
    (10.4, 17.4, 4.4, 1.8, 1.3, (4,)),
    (16.2, 13.2, 7.4, 2.5, 1.6, (5, 0, 3)),
    (-15.2, -2.0, 6.8, 2.5, 1.6, (1,)),    # front-left frame stone (pushed out)
    (15.6, -3.0, 6.2, 2.3, 1.5, ()),       # front-right frame stone (pushed out)
]
for i, (x, y, h, w, d, g) in enumerate(STONES):
    standing_stone(x, y, h, w, d, 40 + i, g, face_to=(PC[0] * .3, -30), lean=(rng.uniform(-.07, .07), rng.uniform(-.09, .09), 0),
                   mat=M_STONE if i % 3 else M_STONE2)
standing_stone(13.0, -10.5, 2.4, 1.9, 1.3, 60, (3,), face_to=(-2, -30), broken=True, mat=M_STONE2)
fallen = standing_stone(9.0, 19.5, 3.8, 1.6, 1.1, 61, (), face_to=(0, -30), mat=M_STONE2)
fallen.rotation_euler = (math.radians(84), math.radians(6), math.radians(-12)); fallen.location.z = float(height(9, 19.5)) + .35
def boulder(x, y, r, sq=.6, seed=0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1 if FAST else 3, radius=r, location=(x, y, float(height(x, y)) + r * .1))
    o = bpy.context.object; o.scale.z = sq; o.rotation_euler.z = seed
    md = o.modifiers.new('d', 'DISPLACE'); md.texture = voro_tex; md.strength = r * .35; md.mid_level = .5
    md2 = o.modifiers.new('d2', 'DISPLACE'); md2.texture = cloud_tex; md2.strength = r * .25; md2.mid_level = .5
    o.data.materials.append(M_STONE2); bpy.ops.object.shade_smooth(); return o
for i, (x, y, r) in enumerate([(-17.5, -4.0, .8), (-14.5, -7.5, .45), (-25, 12, 1.2), (-27.5, 14.5, .7), (14.0, -9.5, .5),
                                (24, 8, 1.0), (19.5, 18, .7), (-4.5, 21, .55), (6.5, 22.5, .9), (-13.5, -11, .35),
                                (-31, 22, 1.5), (30, 26, 1.3), (12.5, -2.5, .3), (-12.8, -1.5, .28),
                                (-16.4, 6.6, .5), (-11.3, 14.0, .45), (15.0, 12.0, .55), (17.3, 14.6, .35), (-14.0, -1.0, .4)]):
    boulder(x, y, r, seed=i)
# rubble: broken slab chips round the plaza edge
for i in range(10 if FAST else 34):
    a = rng.uniform(0, 2 * math.pi); rr = rng.uniform(PR - .8, PR + 3.5)
    x = PC[0] + math.cos(a) * rr; y = PC[1] + math.sin(a) * rr
    if y < -4 and abs(x) < 9: continue
    s = rng.uniform(.25, .7)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, float(height(x, y)) + .05),
                                    rotation=(rng.uniform(-.3, .3), rng.uniform(-.3, .3), rng.uniform(0, 3)))
    o = bpy.context.object; o.scale = (s * rng.uniform(.8, 1.6), s, s * .28)
    bv = o.modifiers.new('b', 'BEVEL'); bv.width = .05; bv.segments = 2
    o.data.materials.append(M_STONE2)

# ---------------- ruined arch on the far hill (landmark): stacked blocks + wedge arch + broken wall ----------------
def block(cx, cy, cz, sx, sy, sz, rx=0.0, ry=0.0, rz=0.0, mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz), rotation=(rx, ry, rz)); o = bpy.context.object
    o.scale = (sx, sy, sz); bv = o.modifiers.new('b', 'BEVEL'); bv.width = .18; bv.segments = 2
    md = o.modifiers.new('d', 'DISPLACE'); md.texture = cloud_tex; md.strength = .15; md.mid_level = .5
    o.data.materials.append(mat or M_STONE); return o

def wedge(cx, cz, cy, ri, ro, a0, a1, dep, mat=None):
    pts = []
    for a in (a0, a1):
        for rr in (ri, ro):
            for yy in (-dep / 2, dep / 2):
                pts.append((cx + math.cos(a) * rr, cy + yy, cz + math.sin(a) * rr))
    me = bpy.data.meshes.new('wedge')
    f = [(0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)]
    me.from_pydata(pts, [], f); me.update()
    o = bpy.data.objects.new('wedge', me); sc.collection.objects.link(o)
    bv = o.modifiers.new('b', 'BEVEL'); bv.width = .14; bv.segments = 2
    o.data.materials.append(mat or M_STONE); return o

ar = np.random.default_rng(7)
ax, ay = ARCH; az = float(height(ax, ay)) - .8
AW, AT, BH = 8.0, 2.2, 1.55            # opening width, pillar thickness, block height
NB = 6                                 # blocks per pillar
for side in (-1, 1):
    px = ax + side * (AW / 2 + AT / 2)
    for k in range(NB):
        block(px + ar.uniform(-.12, .12), ay + ar.uniform(-.1, .1), az + BH * (k + .5), AT * ar.uniform(.95, 1.08), AT * .95, BH * .97,
              rz=ar.uniform(-.04, .04), mat=M_STONE if k % 2 else M_STONE2)
spring = az + BH * NB; ri = AW / 2; ro = AW / 2 + AT
NW = 9
for k in range(NW):                                       # full semicircle of voussoirs
    a0 = math.pi * k / NW + .012; a1 = math.pi * (k + 1) / NW - .012
    wedge(ax, spring, ay, ri, ro, a0, a1, AT * .95, M_STONE if k % 2 else M_STONE2)
block(ax, ay, spring + ro + .45, AT * 1.1, AT * .95, .9, mat=M_STONE2)        # cap stone
# broken wall running left from the arch, stepping down; a few fallen blocks on the right
for j in range(5):
    hgt = max(1, 4 - j - (j % 2))
    for k in range(hgt):
        block(ax - AW / 2 - AT - 1.2 - j * 2.2 + ar.uniform(-.1, .1), ay + .3, az + BH * (k + .5), 2.1, AT * .85, BH * .96,
              rz=ar.uniform(-.05, .05), mat=M_STONE2)
for j in range(4):
    bx = ax + AW / 2 + AT + 2 + j * 1.9 + ar.uniform(-.5, .5); by = ay + ar.uniform(-3, 2)
    block(bx, by, float(height(bx, by)) - .1, 2.0, AT * .9, BH, rx=ar.uniform(-.3, .3), ry=ar.uniform(-.4, .4), rz=ar.uniform(0, 3), mat=M_STONE2)

# ---------------- distant trees on the hills (clumps where the forest patches are) ----------------
M_TREE = bpy.data.materials.new('tree'); M_TREE.use_nodes = True
_b = M_TREE.node_tree.nodes['Principled BSDF']; _b.inputs['Base Color'].default_value = (0.05, 0.13, 0.04, 1); _b.inputs['Roughness'].default_value = .9
haze_wrap(M_TREE.node_tree, _b.outputs[0])
# one mesh of many small low-poly crowns, packed in clusters on the forest patches (reads as woods, not balls)
xs = rng.uniform(-700, 700, 20000); ys = 130 + rng.uniform(0, 1, 20000) ** 1.2 * 600
ok = (np.abs(xs) < (ys + 20) * 0.8) & (fbm(xs * .012, ys * .012, 41) > .56) & (np.hypot(xs - ARCH[0], ys - ARCH[1]) > 35)
cxs, cys = xs[ok][:140], ys[ok][:140]
TV = []; TF = []
ico = np.array([[0, 0, 1], [.89, 0, .45], [.28, .85, .45], [-.72, .53, .45], [-.72, -.53, .45], [.28, -.85, .45],
                [.72, .53, -.45], [-.28, .85, -.45], [-.89, 0, -.45], [-.28, -.85, -.45], [.72, -.53, -.45], [0, 0, -1]])
icof = np.array([[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 1], [1, 6, 2], [2, 7, 3], [3, 8, 4], [4, 9, 5], [5, 10, 1],
                 [6, 7, 2], [7, 8, 3], [8, 9, 4], [9, 10, 5], [10, 6, 1], [11, 7, 6], [11, 8, 7], [11, 9, 8], [11, 10, 9], [11, 6, 10]])
for cx, cy in zip(cxs, cys):
    n = int(rng.integers(12, 40)) if not FAST else 8
    tx = cx + rng.normal(0, 9, n); ty = cy + rng.normal(0, 6, n)
    for x, y in zip(tx, ty):
        z = float(height(x, y)); s = rng.uniform(1.3, 2.4)
        v = ico * np.array([s, s, s * 1.3]) * rng.uniform(.85, 1.15, (12, 3)) + np.array([x, y, z + s * 1.0])
        TF.append(icof + len(TV) * 12); TV.append(v)
if TV:
    tob = build_mesh('woods', np.concatenate(TV), np.concatenate(TF), smooth=False); tob.data.materials.append(M_TREE)

# ---------------- grass blades + flowers ----------------
def blades(N):
    x = rng.uniform(-46, 46, N); y = rng.uniform(-16, 48, N)
    view = np.abs(x) < (y + 30) * 0.72
    r = pr(x, y)
    inner = r < PR
    hole = np.zeros(N, bool); ii = np.where(inner & (r > PR - 3))[0]
    if len(ii): hole[ii] = MISSING[voronoi(x[ii], y[ii])[2]]
    view &= (rng.random(N) < sstep(PR - .3, PR + 1.6, r)) | (hole & (rng.random(N) < .8))   # plaza clear except lost slabs
    keep = view & (rng.random(N) < np.clip(1.25 - (y + 14) / 70, 0.25, 1))
    x, y = x[keep], y[keep]
    z = height(x, y); gc = ground_color(x, y, z)
    K = 4; m = len(x)
    bx = np.repeat(x, K) + rng.normal(0, .12, m * K); by = np.repeat(y, K) + rng.normal(0, .12, m * K)
    bz = np.repeat(z, K) - 0.03
    ang = rng.uniform(0, math.pi, m * K); w = rng.uniform(.05, .09, m * K) * 0.5
    big = np.repeat(1 + 1.4 * sstep(-6, -14, y), K)                   # taller tufts at the very front
    hgt = rng.uniform(.2, .48, m * K) * big * np.repeat(0.8 + 0.5 * fbm(x * .2, y * .2, 51), K)
    lean = rng.normal(0, .07, (m * K, 2))
    p0 = np.c_[bx + np.cos(ang) * w, by + np.sin(ang) * w, bz]
    p1 = np.c_[bx - np.cos(ang) * w, by - np.sin(ang) * w, bz]
    p2 = np.c_[bx + lean[:, 0], by + lean[:, 1], bz + hgt]
    verts = np.stack([p0, p1, p2], 1).reshape(-1, 3)
    faces = np.arange(m * K * 3).reshape(-1, 3)
    g = np.repeat(gc ** (1 / 2.2), K, axis=0) * rng.uniform(.78, 1.18, (m * K, 1)) * rng.uniform(.92, 1.08, (m * K, 3))
    dryb = rng.random(m * K) < .2; g[dryb] = g[dryb] * .4 + np.array([.62, .56, .30]) * .6
    base = (g * .42) ** 2.2; tip = np.clip(g * 1.12 + np.array([.07, .04, -.02]), 0, 1) ** 2.2
    cols = np.stack([base, base, tip], 1).reshape(-1, 3)
    ob = build_mesh('grass', verts, faces, np.c_[cols, np.ones(len(cols))], smooth=False)
    ob.data.materials.append(M_GRASS); return len(faces)

def flowers(N):
    x = rng.uniform(-40, 40, N); y = rng.uniform(-16, 34, N)
    patch = fbm(x * .15, y * .15, 61) + sstep(-2, -12, y) * .15
    keep = (pr(x, y) > PR + .6) & (patch > .6) & (rng.random(len(x)) < .5) & (np.abs(x) < (y + 30) * 0.72)
    x, y = x[keep], y[keep]; m = len(x)
    z = height(x, y) + rng.uniform(.22, .5, m)
    s = rng.uniform(.04, .075, m) * (1 + 0.9 * sstep(-6, -13, y))
    pal = np.array([[1.0, .84, .22], [.98, .96, .9], [.74, .48, .95], [1.0, .62, .70], [.55, .70, 1.0]])
    c = pal[rng.choice(len(pal), m, p=[.38, .27, .15, .1, .1])] ** 2.2
    off = np.array([[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]], float)
    verts = (np.c_[x, y, z][:, None, :] + off[None] * s[:, None, None]).reshape(-1, 3)
    oct_f = np.array([[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4], [1, 0, 5], [2, 1, 5], [3, 2, 5], [0, 3, 5]])
    faces = (oct_f[None] + 6 * np.arange(m)[:, None, None]).reshape(-1, 3)
    ob = build_mesh('flowers', verts, faces, np.c_[np.repeat(c, 6, 0), np.ones(m * 6)], smooth=False)
    ob.data.materials.append(M_FLOWER)

nbl = blades(30000 if FAST else 1000000)
flowers(4000 if FAST else 40000)

def front_flowers(N):
    # clustered wildflowers along the bottom edge: squashed heads on thin stems
    cx = rng.uniform(-24, 24, 26); cy = rng.uniform(-16, -7, 26)
    k = rng.integers(0, 26, N); x = cx[k] + rng.normal(0, .9, N); y = cy[k] + rng.normal(0, .6, N)
    keep = (np.abs(x) < (y + 30) * .72) & ~((np.abs(x) < 8) & (y > -9))
    x, y, k = x[keep], y[keep], k[keep]; m = len(x)
    z = height(x, y); hs = rng.uniform(.35, .7, m)
    pal = np.array([[1.0, .82, .16], [1.0, .86, .30], [.70, .42, .92], [.98, .95, .88], [1.0, .55, .72]])
    c = pal[np.array([0, 1, 2, 3, 4, 0, 1, 2])[k % 8]] ** 2.2 * rng.uniform(.85, 1.1, (m, 1))
    s = rng.uniform(.09, .15, m)
    off = np.array([[0, 0, .5], [1, 0, 0], [0, 0, -.5], [-1, 0, 0], [0, 1, 0], [0, -1, 0]], float)
    hv = (np.c_[x, y, z + hs][:, None, :] + off[None] * s[:, None, None]).reshape(-1, 3)
    oct_f = np.array([[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4], [1, 0, 5], [2, 1, 5], [3, 2, 5], [0, 3, 5]])
    hf = (oct_f[None] + 6 * np.arange(m)[:, None, None]).reshape(-1, 3)
    sv = np.stack([np.c_[x - .015, y, z], np.c_[x + .015, y, z], np.c_[x, y, z + hs]], 1).reshape(-1, 3)
    sf = np.arange(m * 3).reshape(-1, 3) + len(hv)
    stem = np.array([.18, .32, .08]) ** 2.2
    cols = np.r_[np.repeat(c, 6, 0), np.tile(stem, (m * 3, 1))]
    ob = build_mesh('fflowers', np.r_[hv, sv], np.r_[hf, sf], np.c_[cols, np.ones(len(cols))], smooth=False)
    ob.data.materials.append(M_FLOWER)

front_flowers(1500 if FAST else 7000)

# ---------------- light / world ----------------
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(60), 0, math.radians(-42)))
sun = bpy.context.object.data; sun.energy = 5.4; sun.color = (1.0, 0.85, 0.64); sun.angle = math.radians(1.5)
wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True; nt = wd.node_tree
bg = nt.nodes['Background']; tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
cr = nt.nodes.new('ShaderNodeValToRGB')
cr.color_ramp.elements[0].position = 0.5; cr.color_ramp.elements[0].color = (0.62, 0.72, 0.84, 1)
cr.color_ramp.elements[1].position = 0.85; cr.color_ramp.elements[1].color = (0.20, 0.38, 0.78, 1)
nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], cr.inputs[0])
nt.links.new(cr.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 0.8

# ---------------- camera A: high, pitched down; lens shift puts the horizon at 40 % from the top ----------------
CAM_H = float(os.environ.get('CAM_H', 5.5)); CAM_Y = float(os.environ.get('CAM_Y', -20.0))
LENS = float(os.environ.get('LENS', 21.0)); PITCH = math.radians(float(os.environ.get('PITCH', 12)))
HORIZON = 0.40
Hmm = 36.0 * H / W
bpy.ops.object.camera_add(location=(0, CAM_Y, CAM_H), rotation=(math.radians(90) - PITCH, 0, 0))
cam = bpy.context.object; sc.camera = cam
cam.data.lens = LENS; cam.data.sensor_fit = 'HORIZONTAL'; cam.data.sensor_width = 36
cam.data.shift_y = (LENS * math.tan(PITCH) - (0.5 - HORIZON) * Hmm) / 36.0
cam.data.clip_end = 4000

# ---------------- render ----------------
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
sc.cycles.samples = int(os.environ.get('SAMPLES', 12 if FAST else 64)); sc.cycles.use_denoising = True
sc.cycles.max_bounces = 4; sc.cycles.diffuse_bounces = 2; sc.cycles.glossy_bounces = 1; sc.cycles.transmission_bounces = 2
sc.render.resolution_x, sc.render.resolution_y = W, H; sc.render.resolution_percentage = 100
sc.render.film_transparent = True                         # sky is painted in post (alpha = sky mask)
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.filepath = BASE + '_raw.png'
bpy.context.view_layer.update()

def scr(p):
    a = world_to_camera_view(sc, cam, Vector(p)); return a.x, 1 - a.y

# board cells in screen space (fraction of width/height from top-left) + sprite height for 1.7 units
cells = []
for side, sx in (('P', -1), ('E', 1)):
    for li, ly in enumerate(LANES):
        for ci, cx in enumerate(COLS):
            x = sx * cx; z = float(height(x, ly)) + .09
            ax, ay = scr((x, ly, z)); bx, by = scr((x, ly, z + 1.7))
            cells.append({'side': side, 'lane': li, 'col': ['front', 'mid', 'back'][ci],
                          'x': round(ax, 4), 'y': round(ay, 4), 'h': round(ay - by, 4)})
hz = scr((0, 5000, CAM_H))[1]
# check: no standing stone may overlap a unit box (cell foot .. 1.7 units up, ~0.6 h wide)
warn = []
for (x, y, h, w, d, g) in STONES:
    sx0, sy0 = scr((x - w / 2, y, float(height(x, y)))); sx1, sy1 = scr((x + w / 2, y, float(height(x, y)) + h))
    for c in cells:
        bw = c['h'] * H / W * .35
        if min(sx0, sx1) < c['x'] + bw and max(sx0, sx1) > c['x'] - bw and sy1 < c['y'] and sy0 > c['y'] - c['h'] and y < LANES[0] + (6 if c['lane'] else 0) + 1:
            warn.append((x, y, c['side'] + c['col'][0] + str(c['lane'])))
print('horizon y', round(hz, 3), 'cells y', min(c['y'] for c in cells), max(c['y'] for c in cells),
      'x', min(c['x'] for c in cells), max(c['x'] for c in cells), 'h', min(c['h'] for c in cells), max(c['h'] for c in cells))
print('stone overlaps', warn)
json.dump({'w': W, 'h': H, 'horizon': HORIZON, 'cells': cells}, open(BASE + '_cells.json', 'w'), indent=1)
print('grass blades', nbl)
if os.environ.get('NORENDER') != '1':
    bpy.ops.render.render(write_still=True)
    print('DONE', BASE + '_raw.png')
