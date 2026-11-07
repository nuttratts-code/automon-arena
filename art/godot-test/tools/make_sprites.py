# Placeholder pixel creatures (64x64, original designs) + auto normal maps for the Godot lighting test.
import sys, os, numpy as np
from PIL import Image, ImageDraw
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
N = 64

def hexc(h): return np.array([int(h[i:i+2], 16) for i in (1, 3, 5)], float)

class D:
    def __init__(s, d): s.d = d
    def __getattr__(s, k):
        f = getattr(s.d, k)
        def g(*a, **kw):
            if 'outline' not in kw: kw.setdefault('fill', 255)
            else: kw['outline'] = 255
            return f(*a, **kw)
        return g

class Spr:
    def __init__(s): s.mat = np.zeros((N, N), int); s.pal = {0: None}; s.glow = np.zeros((N, N), bool)
    def layer(s, idx, base, fn, glow=False):
        im = Image.new('L', (N, N), 0); fn(D(ImageDraw.Draw(im))); m = np.array(im) > 0
        s.mat[m] = idx; s.pal[idx] = hexc(base)
        if glow: s.glow |= m
        else: s.glow &= ~m
    def render(s):
        a = s.mat > 0
        rgb = np.zeros((N, N, 3))
        for idx, c in s.pal.items():
            if c is None: continue
            m = s.mat == idx
            same = lambda dy, dx: np.roll(np.roll(s.mat == idx, dy, 0), dx, 1)
            hi = m & ~same(1, 1)          # top-left edge of this material -> highlight (light from top-left)
            lo = m & ~same(-1, -1)        # bottom-right edge -> shade
            lo2 = m & ~same(-2, -2) & ~lo
            col = np.where(hi[..., None], np.minimum(c * 1.28 + 18, 255), c)
            col = np.where(lo[..., None], c * .58, col)
            col = np.where(lo2[..., None] & ~hi[..., None], c * .8, col)
            rgb[m] = col[m]
        # 1px outline tinted with the neighbouring colour
        out = np.zeros((N, N), bool); tint = np.zeros((N, N, 3))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = np.roll(np.roll(a, dy, 0), dx, 1) & ~a
            out |= n; tint = np.where(n[..., None], np.roll(np.roll(rgb, dy, 0), dx, 1) * .28, tint)
        rgb = np.where(out[..., None], tint, rgb); alpha = (a | out)
        img = np.dstack([rgb, alpha * 255.0]).clip(0, 255).astype(np.uint8)
        # height = distance to edge (iterative erosion) -> normal map
        h = np.zeros((N, N)); cur = alpha.copy()
        for k in range(10):
            h += cur
            cur = cur & np.roll(cur, 1, 0) & np.roll(cur, -1, 0) & np.roll(cur, 1, 1) & np.roll(cur, -1, 1)
        h = np.sqrt(h / 10.0)
        gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)); gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0))
        nx, ny, nz = -gx * 2.2, gy * 2.2, np.ones_like(h)
        l = np.sqrt(nx**2 + ny**2 + nz**2); nrm = np.dstack([nx / l, ny / l, nz / l]) * .5 + .5
        nimg = np.dstack([nrm * 255, alpha * 255.0]).astype(np.uint8)
        gimg = np.dstack([img[..., :3] * (s.glow & a)[..., None], alpha * 255.0]).astype(np.uint8)
        return img, nimg, gimg

def save(name, s, flip=False):
    img, nimg, gimg = s.render()
    if flip:                                   # enemies face left; mirror normal x too
        img, nimg, gimg = img[:, ::-1].copy(), nimg[:, ::-1].copy(), gimg[:, ::-1].copy()
        nimg[..., 0] = np.where(nimg[..., 3] > 0, 255 - nimg[..., 0], 0)
    Image.fromarray(img, 'RGBA').save(f'{OUT}/{name}.png')
    Image.fromarray(nimg, 'RGBA').save(f'{OUT}/{name}_n.png')
    Image.fromarray(gimg, 'RGBA').save(f'{OUT}/{name}_e.png')

# Feet on row 58, facing right.
# HL-1 iron golem brawler, huge riveted fists, blue eye slit (steel tribe)
s = Spr()
s.layer(1, '#5a6478', lambda d: (d.rectangle([22, 46, 28, 58]), d.rectangle([34, 46, 40, 58])))          # legs
s.layer(2, '#8e98a8', lambda d: d.rounded_rectangle([17, 26, 45, 48], 5))                                 # torso
s.layer(3, '#46597a', lambda d: d.rectangle([21, 34, 41, 40]))                                            # belt plate
s.layer(2, '#8e98a8', lambda d: d.rounded_rectangle([22, 13, 42, 28], 4))                                 # head
s.layer(4, '#2d3445', lambda d: d.rectangle([30, 19, 42, 22]))                                            # visor
s.layer(5, '#6fe0ff', lambda d: d.rectangle([33, 20, 41, 21]), glow=True)                                 # eye slit
s.layer(1, '#5a6478', lambda d: (d.rectangle([10, 28, 18, 40]), d.rectangle([44, 28, 50, 38])))           # arms
s.layer(6, '#a7b1c0', lambda d: (d.rounded_rectangle([4, 36, 20, 52], 4), d.rounded_rectangle([44, 32, 60, 48], 4)))  # fists
s.layer(4, '#2d3445', lambda d: [d.point((x, y)) for x, y in ((8, 40), (15, 40), (8, 47), (15, 47), (48, 36), (55, 36), (48, 43), (55, 43))])
save('hl1', s)

# Ember fox mage (fire tribe): pointed ears, flame tail
s = Spr()
s.layer(1, '#b8471f', lambda d: d.polygon([(8, 44), (2, 26), (10, 32), (12, 20), (18, 34), (22, 46)]))     # tail
s.layer(7, '#ffb238', lambda d: d.polygon([(6, 34), (5, 26), (10, 31), (12, 24), (15, 36)]), glow=True)    # tail flame
s.layer(2, '#e0662a', lambda d: (d.ellipse([18, 32, 44, 56]), d.rectangle([24, 52, 29, 58]), d.rectangle([35, 52, 40, 58])))
s.layer(3, '#f7d9a8', lambda d: d.ellipse([30, 38, 42, 52]))                                              # chest
s.layer(2, '#e0662a', lambda d: (d.ellipse([24, 14, 48, 36]), d.polygon([(26, 20), (24, 4), (34, 16)]), d.polygon([(38, 16), (44, 3), (46, 20)])))
s.layer(3, '#f7d9a8', lambda d: d.polygon([(40, 26), (54, 28), (46, 34), (36, 33)]))                       # muzzle
s.layer(4, '#2a1410', lambda d: (d.rectangle([40, 22, 42, 25]), d.point((53, 28))))
s.layer(5, '#d4a23a', lambda d: d.rectangle([44, 34, 46, 50]))                                            # staff
s.layer(7, '#ffd966', lambda d: d.ellipse([41, 28, 49, 36]), glow=True)
save('fox', s)

# Gale owl (wind tribe)
s = Spr()
s.layer(1, '#cfeee0', lambda d: d.polygon([(10, 22), (2, 40), (14, 48), (22, 34)]))                        # back wing
s.layer(2, '#5fc9a0', lambda d: (d.ellipse([16, 18, 46, 54]), d.rectangle([24, 52, 27, 58]), d.rectangle([35, 52, 38, 58])))
s.layer(3, '#e9fbf3', lambda d: d.ellipse([28, 30, 44, 52]))
s.layer(2, '#5fc9a0', lambda d: (d.polygon([(20, 20), (22, 8), (28, 18)]), d.polygon([(38, 18), (44, 8), (44, 22)])))
s.layer(4, '#fff6d8', lambda d: (d.ellipse([26, 20, 35, 29]), d.ellipse([35, 20, 44, 29])))
s.layer(5, '#1f2b3a', lambda d: (d.rectangle([30, 23, 32, 26]), d.rectangle([39, 23, 41, 26])))
s.layer(6, '#e8a43a', lambda d: d.polygon([(35, 28), (40, 30), (35, 34)]))
s.layer(1, '#cfeee0', lambda d: d.polygon([(40, 32), (56, 26), (50, 42), (42, 46)]))                       # front wing
save('owl', s)

# Rift spirit (spirit tribe) - floats, rune ring
s = Spr()
s.layer(1, '#7c6cd8', lambda d: d.ellipse([10, 46, 54, 56], outline=1, width=2), glow=True)               # rune ring
s.layer(2, '#8fd0ff', lambda d: (d.ellipse([20, 12, 44, 38]), d.polygon([(20, 28), (44, 28), (40, 46), (32, 52), (24, 46)])))
s.layer(3, '#c9ecff', lambda d: d.ellipse([24, 15, 36, 25]))
s.layer(4, '#ffffff', lambda d: (d.rectangle([34, 22, 36, 26]), d.rectangle([40, 22, 42, 26])), glow=True)
s.layer(5, '#5a8fd8', lambda d: d.polygon([(32, 30), (26, 38), (32, 46), (38, 38)]))
s.layer(6, '#e0f6ff', lambda d: d.polygon([(32, 33), (29, 38), (32, 43), (35, 38)]), glow=True)
save('spirit', s)

# Enemy: horned brute (demon tribe)
s = Spr()
s.layer(1, '#3e2150', lambda d: (d.rectangle([20, 48, 27, 58]), d.rectangle([37, 48, 44, 58])))
s.layer(2, '#6b2d6e', lambda d: d.polygon([(14, 30), (50, 30), (46, 50), (18, 50)]))
s.layer(3, '#8c2f3c', lambda d: d.polygon([(22, 34), (42, 34), (38, 46), (26, 46)]))
s.layer(2, '#6b2d6e', lambda d: d.ellipse([20, 12, 44, 34]))
s.layer(4, '#d9c7a0', lambda d: (d.polygon([(22, 18), (12, 6), (16, 2), (26, 14)]), d.polygon([(42, 18), (52, 6), (48, 2), (38, 14)])))
s.layer(5, '#ff5a4a', lambda d: (d.rectangle([35, 20, 38, 22]), d.rectangle([41, 20, 43, 22])), glow=True)
s.layer(1, '#3e2150', lambda d: (d.rectangle([6, 30, 14, 46]), d.rectangle([50, 30, 58, 46])))
s.layer(4, '#d9c7a0', lambda d: (d.polygon([(4, 46), (16, 46), (12, 52), (8, 52)]), d.polygon([(48, 46), (60, 46), (56, 52), (52, 52)])))
save('brute', s, True)

# Enemy: storm lizard (lightning tribe)
s = Spr()
s.layer(1, '#8a5fd0', lambda d: d.polygon([(4, 50), (16, 40), (22, 46), (10, 54)]))                      # tail
s.layer(2, '#f2cc3a', lambda d: (d.ellipse([14, 30, 44, 54]), d.rectangle([20, 50, 24, 58]), d.rectangle([34, 50, 38, 58])))
s.layer(2, '#f2cc3a', lambda d: d.polygon([(30, 18), (56, 24), (52, 32), (34, 36)]))                       # head
s.layer(3, '#fff1a8', lambda d: d.ellipse([28, 38, 42, 52]))
s.layer(4, '#7a3fe0', lambda d: [d.polygon([(x, 30), (x + 3, 20), (x + 6, 30)]) for x in (14, 20, 26)], glow=True)  # zigzag spikes
s.layer(5, '#2a1c3a', lambda d: d.rectangle([44, 23, 46, 25]))
save('lizard', s, True)
print('ok', sorted(os.listdir(OUT)))
