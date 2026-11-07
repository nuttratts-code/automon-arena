# Automon Arena — "rune plaza on a grassy highland" battle scene (v2, set 132; spec claude/art-style.md §8).
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
ARCH = (46.0, 245.0)          # ruined arch on a far hill (right of centre)

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
    arch = 16 * np.exp(-((x - ARCH[0]) ** 2 + (y - ARCH[1]) ** 2) / (2 * 40 ** 2))
    return flat * (roll + side) + drop + hills + hills2 + mount + arch

def ground_color(x, y, h):
    x = np.asarray(x, float); y = np.asarray(y, float)
    g1 = np.array([0.24, 0.44, 0.12]); g2 = np.array([0.50, 0.66, 0.20]); g3 = np.array([0.70, 0.68, 0.30])
    m = fbm(x * .03, y * .03, 23)[..., None]; m2 = sstep(.6, .8, fbm(x * .06, y * .06, 29))[..., None]
    c = g1 + (g2 - g1) * m; c = c + (g3 - c) * m2 * .55
    far = np.clip((y - 60) / 260, 0, 1)[..., None]
    c = c + (np.array([0.20, 0.47, 0.18]) - c) * far * .7
    worn = (1 - sstep(PR - .2, PR + 2.2, pr(x, y) + (fbm(x * .4, y * .4, 33) - .5) * 1.5))[..., None]
    c = c + (np.array([0.50, 0.44, 0.30]) - c) * worn * .45            # trodden ring round the plaza
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

GLOW = (0.30, 0.78, 1.0)
def mat_plaza():
    """vertex colour slabs + faint rune-blue glow in the carved cell rings (attribute 'glow')."""
    m = bpy.data.materials.new('plaza'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    c = vcol_node(nt, 18, .22); nt.links.new(c, b.inputs['Base Color']); b.inputs['Roughness'].default_value = .9
    g = nt.nodes.new('ShaderNodeAttribute'); g.attribute_name = 'glow'; g.attribute_type = 'GEOMETRY'
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*GLOW, 1); em.inputs['Strength'].default_value = 2.2
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
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*GLOW, 1); em.inputs['Strength'].default_value = 7
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
    sl1 = np.array([0.62, 0.61, 0.56]); sl2 = np.array([0.72, 0.69, 0.62]); sl3 = np.array([0.56, 0.58, 0.55])
    c = sl1 + (sl2 - sl1) * tone[..., None]
    c = c + (sl3 - c) * sstep(.6, .9, fbm(X * .25, Y * .25, 77))[..., None] * .7
    lich = sstep(.62, .75, fbm(X * 1.8, Y * 1.8, 79))[..., None] * .35
    c = c + (np.array([0.78, 0.66, 0.44]) - c) * lich                # warm lichen flecks
    mz = sstep(.55, .72, fbm(X * .7, Y * .7, 81) * .7 + mossy * .3 + crack * .25)[..., None]
    c = c + (np.array([0.34, 0.46, 0.15]) - c) * mz * .75            # moss patches
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
    glow = glow * (1 - crack * .6)
    Z = height(X, Y) + .09 - groove * .035 - crack * .03 + (fbm(X * 3, Y * 3, 83) - .5) * .015 \
        + (tone - .5)[...] * .02
    keep = R < PR
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

def standing_stone(x, y, h, w, d, seed, glyphs=(), face_to=(0, -26), lean=(0, 0), mat=None, broken=False):
    r = np.random.default_rng(seed)
    z = float(height(x, y)) - .4
    tw = r.uniform(.6, .8); td = r.uniform(.7, .9); slant = r.uniform(-.35, .35) * w
    v = [(-w / 2, -d / 2, 0), (w / 2, -d / 2, 0), (w / 2, d / 2, 0), (-w / 2, d / 2, 0),
         (-w / 2 * tw, -d / 2 * td, h + slant), (w / 2 * tw, -d / 2 * td, h - slant),
         (w / 2 * tw, d / 2 * td, h - slant * .6), (-w / 2 * tw, d / 2 * td, h + slant * .6)]
    if broken: v[4:] = [(a, b, c * .55 + r.uniform(-.3, .3)) for (a, b, c) in v[4:]]
    f = np.array([[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
    ob = build_mesh('stone', np.array(v), f, smooth=False)
    ob.data.materials.append(mat or M_STONE)
    bv = ob.modifiers.new('b', 'BEVEL'); bv.width = min(w, d) * .18; bv.segments = 3
    ss = ob.modifiers.new('s', 'SUBSURF'); ss.levels = ss.render_levels = 1 if FAST else 3
    dm = ob.modifiers.new('d', 'DISPLACE'); dm.texture = cloud_tex; dm.strength = .16; dm.mid_level = .5
    dm.texture_coords = 'OBJECT'
    ob.location = (x, y, z)
    ang = math.atan2(face_to[1] - y, face_to[0] - x) + math.pi / 2   # local -y faces the target
    ob.rotation_euler = (lean[0], lean[1], ang)
    for o in bpy.context.view_layer.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob; bpy.ops.object.shade_smooth()
    # glyph column on the front face
    hh = h if not broken else h * .5
    gs = min(w * tw * .6, 1.0); top = hh - gs * 1.25
    for k, gi in enumerate(glyphs):
        vz = top - k * gs * 1.32
        if vz < .6: break
        gv, gf = glyph_mesh(GLYPHS[gi], gs)
        fr = vz / h; fy = -(d / 2) * (1 - fr) - (d / 2 * td) * fr - .02
        gv = gv + np.array([0, fy, vz])
        g = build_mesh('rune', gv, gf, smooth=False); g.data.materials.append(M_RUNE)
        g.parent = ob
    return ob

# stones ring: behind the far lane and out at the sides; the near (camera) side is left open so
# no stone covers a board cell. Front corners are pushed far out to frame the picture.
STONES = [
    # x, y, h, w, d, glyphs
    (-17.0, 8.0, 6.6, 2.1, 1.3, (0, 3)),
    (-12.6, 15.2, 8.2, 2.5, 1.5, (2, 5, 1)),
    (-8.4, 17.2, 4.0, 1.5, 1.1, (6,)),
    (-4.2, 19.5, 2.6, 1.3, 1.0, ()),
    (10.4, 17.4, 4.2, 1.4, 1.0, (4,)),
    (16.2, 13.2, 7.6, 2.2, 1.35, (5, 0, 3)),
    (-15.2, -2.0, 6.8, 2.3, 1.4, (1,)),      # front-left frame stone (pushed out)
    (15.6, -3.0, 6.2, 2.1, 1.3, ()),       # front-right frame stone (pushed out)
]
for i, (x, y, h, w, d, g) in enumerate(STONES):
    standing_stone(x, y, h, w, d, 40 + i, g, face_to=(PC[0] * .3, -30), lean=(rng.uniform(-.05, .05), rng.uniform(-.06, .06), 0),
                   mat=M_STONE if i % 3 else M_STONE2)
# a broken stone and a fallen one with runes (foreground right / back right)
standing_stone(13.0, -10.5, 2.2, 1.6, 1.1, 60, (3,), face_to=(-2, -30), broken=True, mat=M_STONE2)
fallen = standing_stone(9.0, 19.5, 3.6, 1.2, .9, 61, (), face_to=(0, -30))
fallen.rotation_euler = (math.radians(84), 0, math.radians(-12)); fallen.location.z = float(height(9, 19.5)) + .45
# boulders
def boulder(x, y, r, sq=.6, seed=0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1 if FAST else 3, radius=r, location=(x, y, float(height(x, y)) + r * .15))
    o = bpy.context.object; o.scale.z = sq; o.rotation_euler.z = seed
    md = o.modifiers.new('d', 'DISPLACE'); md.texture = cloud_tex; md.strength = r * .4; md.mid_level = .5
    o.data.materials.append(M_STONE2); bpy.ops.object.shade_smooth(); return o
for i, (x, y, r) in enumerate([(-17.5, -4.0, .8), (-14.5, -7.5, .45), (-25, 12, 1.2), (-27.5, 14.5, .7), (14.0, -9.5, .5),
                                (24, 8, 1.0), (19.5, 18, .7), (-4.5, 21, .55), (6.5, 22.5, .9), (-13.5, -11, .35),
                                (-31, 22, 1.5), (30, 26, 1.3), (12.5, -2.5, .3), (-12.8, -1.5, .28)]):
    boulder(x, y, r, seed=i)

# ---------------- ruined arch on the far hill (landmark) ----------------
def box(cx, cy, cz, sx, sy, sz, rz=0, mat=M_STONE):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz), rotation=(0, 0, rz)); o = bpy.context.object
    o.scale = (sx, sy, sz); o.data.materials.append(mat); return o
az = float(height(ARCH[0], ARCH[1])) - .5
AW, AH, AT = 9.0, 13.0, 2.6
box(ARCH[0] - AW / 2, ARCH[1], az + AH / 2, AT, AT * .9, AH, mat=M_STONE)
box(ARCH[0] + AW / 2, ARCH[1], az + AH * .42, AT, AT * .9, AH * .84, mat=M_STONE)
for k in range(6):                                                   # arch voussoirs (right end broken off)
    a = math.radians(180 - k * 26); ra = AW / 2
    box(ARCH[0] + math.cos(a) * ra, ARCH[1], az + AH + math.sin(a) * ra * .8, AT * 1.05, AT * .85, AT * .8, mat=M_STONE)
box(ARCH[0] - AW / 2 - 6, ARCH[1] + 3, az + 1.6, 2.4, 2.2, 3.4, mat=M_STONE2)   # stub wall
box(ARCH[0] + AW / 2 + 4, ARCH[1] - 2, az + .8, 3.0, 2.0, 1.6, .5, mat=M_STONE2)

# ---------------- grass blades + flowers ----------------
def blades(N):
    x = rng.uniform(-46, 46, N); y = rng.uniform(-16, 48, N)
    view = np.abs(x) < (y + 30) * 0.72
    r = pr(x, y)
    view &= rng.random(N) < sstep(PR - .3, PR + 1.6, r)               # plaza stays clear; tufts creep on the edge
    keep = view & (rng.random(N) < np.clip(1.25 - (y + 14) / 70, 0.25, 1))
    x, y = x[keep], y[keep]
    z = height(x, y); gc = ground_color(x, y, z)
    K = 4; m = len(x)
    bx = np.repeat(x, K) + rng.normal(0, .12, m * K); by = np.repeat(y, K) + rng.normal(0, .12, m * K)
    bz = np.repeat(z, K) - 0.03
    ang = rng.uniform(0, math.pi, m * K); w = rng.uniform(.05, .09, m * K) * 0.5
    big = np.repeat(1 + 0.8 * sstep(-6, -12, y), K)                   # taller tufts at the very front
    hgt = rng.uniform(.2, .48, m * K) * big * np.repeat(0.8 + 0.5 * fbm(x * .2, y * .2, 51), K)
    lean = rng.normal(0, .07, (m * K, 2))
    p0 = np.c_[bx + np.cos(ang) * w, by + np.sin(ang) * w, bz]
    p1 = np.c_[bx - np.cos(ang) * w, by - np.sin(ang) * w, bz]
    p2 = np.c_[bx + lean[:, 0], by + lean[:, 1], bz + hgt]
    verts = np.stack([p0, p1, p2], 1).reshape(-1, 3)
    faces = np.arange(m * K * 3).reshape(-1, 3)
    g = np.repeat(gc ** (1 / 2.2), K, axis=0) * rng.uniform(.85, 1.15, (m * K, 1))
    base = (g * .45) ** 2.2; tip = np.clip(g * 1.25 + np.array([.06, .05, 0]), 0, 1) ** 2.2
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

# ---------------- light / world ----------------
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(50), 0, math.radians(-38)))
sun = bpy.context.object.data; sun.energy = 4.0; sun.color = (1.0, 0.95, 0.85); sun.angle = math.radians(2)
wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True; nt = wd.node_tree
bg = nt.nodes['Background']; tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
cr = nt.nodes.new('ShaderNodeValToRGB')
cr.color_ramp.elements[0].position = 0.5; cr.color_ramp.elements[0].color = (0.62, 0.72, 0.84, 1)
cr.color_ramp.elements[1].position = 0.85; cr.color_ramp.elements[1].color = (0.20, 0.38, 0.78, 1)
nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], cr.inputs[0])
nt.links.new(cr.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 1.1

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
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
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
