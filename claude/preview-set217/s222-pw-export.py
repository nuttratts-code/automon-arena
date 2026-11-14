# set 222: export HL-1 as a Pixelwright rig (parts + pre-rotated variants + 16-frame idle). Sample tool, not game code.
# Pixelwright parts only move, never rotate -> each rotation step is a variant drawn with RotSprite (EPX x8 -> rotate -> 1x).
# run: python -I s222-pw-export.py <hl1_px.png> <out.json> [preview.gif]
import sys, json
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
spr = np.asarray(Image.open(src).convert('RGBA')).copy()
H, W = spr.shape[:2]
OFF = 4                                    # padding so rotated parts stay on the canvas
CW, CH = W + 2 * OFF, H + 2 * OFF
ys, xs = np.mgrid[0:H, 0:W]
solid = spr[..., 3] > 0

# ---- palette: 28 metal/outline colours + 4 eye colours, all taken from HL-1 ----
hop = spr[solid][:, :3]
eye = hop[:, 2].astype(int) > hop[:, 0].astype(int) + 70
def kq(px, n):
    im = Image.fromarray(px.reshape(-1, 1, 3)).quantize(n, method=Image.FASTOCTREE, kmeans=8)
    return np.array(im.getpalette()[:n * 3]).reshape(n, 3)
pal = np.vstack([kq(hop[~eye], 28), kq(hop[eye], 4)])
_, uniq = np.unique(pal, axis=0, return_index=True)
pal = pal[np.sort(uniq)]
CH_KEYS = 'abcdefghijklmnopqrstuvwxyz012345'[:len(pal)]   # Pixelwright refuses capital-letter keys
TOKENS = ['hl' + c for c in 'abcdefghijklmnopqrstuvwxyzABCDEF'[:len(pal)]]
order = np.argsort(pal.sum(1))             # darkest first -> 'a' = outline navy
pal = pal[order]

# ---- parts (84x80 grid coordinates, same cut as s222-rig-rotate.py) ----
lab = np.full((H, W), 'body', dtype=object)
lab[(ys < 14) | ((ys < 26) & (xs >= 30) & (xs <= 50))] = 'head'
lab[(xs >= 56) & (ys < 56)] = 'armR'
lab[((xs < 28) & (ys < 58)) | ((xs < 35) & (ys >= 34) & (ys < 58))] = 'armL'
lab[(ys >= 57) & (lab != 'armL')] = 'legs'
lab[~solid] = ''
PIV = {'body': (40, 56), 'head': (40, 25), 'armL': (27, 23), 'armR': (55, 25), 'legs': (40, 70), 'back': (40, 56)}
DARK = pal[0]

def layer(mask, colour=None):
    a = np.zeros_like(spr); a[mask] = spr[mask]
    if colour is not None: a[mask, :3] = colour
    return a
pics = {n: layer(lab == n) for n in ('legs', 'armL', 'body', 'head', 'armR')}
seam = np.zeros((H, W), bool)                         # pixels within 3 px of a cut between two parts
for dy in range(-3, 4):
    for dx in range(-3, 4):
        sh = np.roll(lab, (dy, dx), axis=(0, 1)); seam |= (sh != lab) & (sh != '') & (lab != '')
pics['back'] = layer(seam & solid & (lab != 'legs'))   # original pixels behind turning joints, so a 1 px gap shows the same picture

def epx(a):
    h, w = a.shape[:2]
    p = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode='edge')
    P = p[1:-1, 1:-1]; A = p[:-2, 1:-1]; B = p[1:-1, 2:]; C = p[1:-1, :-2]; D = p[2:, 1:-1]
    eq = lambda x, y: (x == y).all(-1)
    o = np.zeros((h * 2, w * 2, 4), a.dtype)
    o[0::2, 0::2] = np.where((eq(C, A) & ~eq(C, D) & ~eq(A, B))[..., None], A, P)
    o[0::2, 1::2] = np.where((eq(A, B) & ~eq(A, C) & ~eq(B, D))[..., None], B, P)
    o[1::2, 0::2] = np.where((eq(D, C) & ~eq(D, B) & ~eq(C, A))[..., None], C, P)
    o[1::2, 1::2] = np.where((eq(B, D) & ~eq(B, A) & ~eq(D, C))[..., None], D, P)
    return o

def glow(a):
    a = a.copy(); e = (a[..., 2].astype(int) > a[..., 0].astype(int) + 70) & (a[..., 3] > 0)
    a[e, :3] = np.clip(a[e, :3].astype(int) + np.array([60, 80, 40]), 0, 255); return a

def rotsprite(a, deg, piv):
    """rotate a part picture (sprite coords) around piv; returns canvas-sized RGBA."""
    u = epx(epx(epx(a)))
    r = np.radians(deg); c, s = np.cos(r), np.sin(r); px, py = piv
    oy, ox = np.mgrid[0:CH, 0:CW]
    x = ox + 0.5 - OFF - px; y = oy + 0.5 - OFF - py
    sx = np.floor((c * x + s * y + px) * 8).astype(int); sy = np.floor((-s * x + c * y + py) * 8).astype(int)
    ok = (sx >= 0) & (sy >= 0) & (sx < W * 8) & (sy < H * 8)
    o = np.zeros((CH, CW, 4), np.uint8); o[ok] = u[sy[ok], sx[ok]]
    return o

def to_rows(a):
    m = a[..., 3] > 0
    yy, xx = np.where(m)
    y0, y1, x0, x1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
    d = ((a[..., :3].astype(int)[:, :, None, :] - pal[None, None]) ** 2).sum(-1).argmin(-1)
    rows = [''.join(CH_KEYS[d[y, x]] if m[y, x] else '.' for x in range(x0, x1)) for y in range(y0, y1)]
    return [int(x0), int(y0)], rows

# ---- variants (angles in degrees, + = clockwise on screen) ----
ANG = {'body': [0, -0.5, -1.0, -1.5],
       'head': [0, 0.7, 1.4, 2.0], 'armL': [0, -1.0, -2.0, -3.0], 'armR': [0, 1.3, 2.7, 4.0]}
writes = []
for n in ('back', 'legs', 'armL', 'body', 'head', 'armR'):
    for i, ang in enumerate(ANG.get(n, [0])):
        for g in ((False, True) if n == 'head' else (False,)):
            pic = glow(pics[n]) if g else pics[n]
            origin, rows = to_rows(rotsprite(pic, ang, PIV[n]))
            writes.append({'part': n, 'variant': f'r{i}' + ('g' if g else ''), 'origin': origin, 'rows': rows})

def breath(t):
    if t < .35: x = t / .35; return x * x * (3 - 2 * x)
    if t < .50: return 1.0
    if t < .85: x = (t - .5) / .35; return 1 - x * x * (3 - 2 * x)
    return 0.0

def near(n, deg): return int(np.abs(np.array(ANG[n]) - deg).argmin())

N, MS = 16, 150
frames = []
for f in range(N):
    t = f / N; s = breath(t); sh = breath((t - 0.06) % 1)
    bi = near('body', -1.5 * s); ba = np.radians(ANG['body'][bi])
    def carried(n):                         # where the body's turn carries a child's pivot
        px, py = PIV[n]; bx, by = PIV['body']; x, y = px - bx, py - by
        return int(round(np.cos(ba) * x - np.sin(ba) * y - x)), int(round(np.sin(ba) * x + np.cos(ba) * y - y))
    pose = {'body': {'variant': f'r{bi}', 'dy': -1 if s > 0.5 else 0},
            }
    for n, k in (('head', 2.0), ('armL', -3.0), ('armR', 4.0)):
        dx, dy = carried(n)
        pose[n] = {'variant': f'r{near(n, k * sh)}' + ('g' if n == 'head' and s > 0.5 else ''), 'dx': dx, 'dy': dy}
    frames.append({'ms': MS, 'parts': pose})

data = {'size': [CW, CH], 'offset': OFF,
        'palette': [{'token': TOKENS[i], 'hex': '#%02x%02x%02x' % tuple(int(v) for v in c)} for i, c in enumerate(pal)],
        'keys': {CH_KEYS[i]: TOKENS[i] for i in range(len(pal))},
        'anchors': {n: [PIV[n][0] + OFF, PIV[n][1] + OFF] for n in PIV},
        'variants': {n: sorted({w['variant'] for w in writes if w['part'] == n}) for n in PIV},
        'writes': writes, 'idle': frames}
json.dump(data, open(out, 'w'), indent=None)
print('colours', len(pal), 'writes', len(writes), 'chars', sum(len(''.join(w['rows'])) for w in writes))
