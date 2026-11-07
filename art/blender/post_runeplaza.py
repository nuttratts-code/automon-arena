# Post pass for runeplaza_scene.py (from post_meadow.py): painted sky with big pink/gold-edged cumulus, rune bloom,
# tilt-shift blur, and an optional preview with placeholder units on the 12 board cells.
# Run: python post_meadow.py <base>   (reads <base>_raw.png + <base>_cells.json, writes <base>.png, <base>_board.png)
import sys, json, math
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont

BASE = sys.argv[1]
raw = Image.open(BASE + '_raw.png').convert('RGBA'); W, H = raw.size
meta = json.load(open(BASE + '_cells.json'))
rgba = np.asarray(raw).astype(np.float32) / 255.0
rgb, alpha = rgba[..., :3], rgba[..., 3:4]
rng = np.random.default_rng(5)

def vnoise(x, y, s):
    xi = np.floor(x).astype(np.int64); yi = np.floor(y).astype(np.int64); xf = x - xi; yf = y - yi
    def h(i, j):
        n = (i.astype(np.uint64) * np.uint64(374761393) + j.astype(np.uint64) * np.uint64(668265263) + np.uint64(s * 7919 + 13)) & np.uint64(0xffffffff)
        n = ((n ^ (n >> np.uint64(13))) * np.uint64(1274126177)) & np.uint64(0xffffffff)
        return ((n ^ (n >> np.uint64(16))) & np.uint64(0xffff)).astype(np.float32) / 65535.0
    u = xf * xf * (3 - 2 * xf); v = yf * yf * (3 - 2 * yf)
    a, b, c, d = h(xi, yi), h(xi + 1, yi), h(xi, yi + 1), h(xi + 1, yi + 1)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v

def fbm(x, y, s, o=6):
    t = 0; amp = .5; nrm = 0
    for k in range(o):
        t = t + amp * vnoise(x * 2 ** k, y * 2 ** k, s + k); nrm += amp; amp *= .5
    return t / nrm

def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

# ---------------- painted sky (cumulus on a perspective plane) ----------------
hz = meta['horizon'] * H
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
up = np.clip((hz - yy) / hz, 0, 1)                       # 0 at horizon, 1 at top
zen = np.array([0.22, 0.47, 0.82]); hor = np.array([0.78, 0.88, 0.95])
sky = hor + (zen - hor) * (up ** 0.7)[..., None]
dep = 1.0 / (up + 0.07)                                  # distance on the cloud plane
u = (xx - W * .5) / W * dep * 2.2; v = dep * 1.6
warp = fbm(u * .6, v * .6, 40, 3)
n = fbm(u * 1.1 + warp * 1.5, v * 1.1 + warp, 10)
dens = sstep(.47, .58, n + .16 * up - .07)
# light from the sun (upper right): sample density toward the sun, lit where it thins
n2 = fbm(u * 1.1 + warp * 1.5 + .09, v * 1.1 + warp - .05, 10)
lit = np.clip(.5 + (n - n2) * 14, 0, 1)
cw = np.array([1.0, .97, .90]); cs = np.array([.70, .73, .84])
warm = np.array([1.0, .80, .74])
cc = cs + (cw - cs) * lit[..., None]
edge = (sstep(.0, .5, dens) * (1 - sstep(.5, 1., dens)))[..., None]
cc = cc + (warm - cc) * edge * (1 - lit[..., None]) * .55   # pink/gold rims
cc = cc + (hor - cc) * (1 - up)[..., None] ** 6 * .5      # clouds fade into haze near horizon
sky = sky + (cc - sky) * dens[..., None] * .35          # thin far streaks only
# big puffy cumulus: clusters of soft blobs with flat bases, lit from the upper left, pink/gold underside
sc_ = W / 1600
field = np.zeros((H, W), np.float32); base_y = np.zeros((H, W), np.float32)
crng = np.random.default_rng(21)
CL = [(.12, .17, 160), (.38, .08, 140), (.60, .22, 95), (.80, .09, 175), (.98, .20, 120)]
for (cxf, cyf, R) in CL:
    R *= sc_; cx = cxf * W; cy = cyf * H + R * .35
    f = np.zeros((H, W), np.float32)
    for k in range(110):
        bx = cx + crng.normal(0, R * .95); by = cy - abs(crng.normal(0, R * .7)) * (1.3 - min(1, abs(bx - cx) / (R * 2))) - R * .1
        br = R * crng.uniform(.18, .42) * (1.2 - abs(bx - cx) / (R * 3))
        if br <= R * .2: continue
        x0, x1 = int(max(0, bx - br * 2)), int(min(W, bx + br * 2)); y0, y1 = int(max(0, by - br * 2)), int(min(H, by + br * 2))
        if x0 >= x1 or y0 >= y1: continue
        d2 = ((xx[y0:y1, x0:x1] - bx) ** 2 + (yy[y0:y1, x0:x1] - by) ** 2) / br ** 2
        f[y0:y1, x0:x1] += np.exp(-d2 * 1.6) * .55
    f *= sstep(cy + R * .12, cy - R * .25, yy)                      # flat underside
    upd = f > field; base_y = np.where(upd, cy, base_y); field = np.maximum(field, f)
det = fbm(xx / (22 * sc_), yy / (22 * sc_), 70, 5)
cd = sstep(.36, .56, field + (det - .5) * .55)
cd = cd * sstep(.18, .32, field)
body = np.asarray(Image.fromarray((np.clip(field, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(18 * sc_)), np.float32) / 255
cd = cd * sstep(.2, .34, body)                                    # drop stray specks away from a cloud body
from scipy import ndimage                                           # keep only big connected cloud bodies
lab, nlab = ndimage.label(ndimage.binary_opening(cd > .25, iterations=int(10 * sc_)))   # cut thin necks first
area = ndimage.sum(np.ones_like(cd), lab, range(1, nlab + 1))
big = np.isin(lab, 1 + np.where(area > 6000 * sc_ ** 2)[0])
keep = np.asarray(Image.fromarray((big * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(4)), np.float32) / 255
cd = cd * keep
lightf = np.roll(np.roll(field + (det - .5) * .45, 9, 0), 12, 1)  # sample toward the upper-left light
litc = np.clip(.55 + (field + (det - .5) * .45 - lightf) * 3.2, 0, 1)
under = np.clip(1 - (base_y - yy) / (90 * sc_), 0, 1) * (base_y > 0)
c_lit = np.array([1.0, .98, .93]); c_sh = np.array([.62, .66, .80]); c_warm = np.array([1.0, .86, .78])
ccol = c_sh + (c_lit - c_sh) * litc[..., None]
ccol = ccol + (c_warm - ccol) * (under ** 1.5)[..., None] * .4
ccol = ccol + (hor - ccol) * (1 - up)[..., None] ** 4 * .4
sky = sky + (ccol - sky) * cd[..., None]
sky = np.clip(sky, 0, 1)

img = rgb * alpha + sky * (1 - alpha)                    # render is straight alpha

# ---------------- sun shafts (radial blur of the sky mask toward the sun) ----------------
sunx, suny = W * 0.08, -H * 0.6
skym = Image.fromarray(((1 - alpha[..., 0]) * 255 * (yy < hz + H * .35)).astype(np.uint8))
acc = np.zeros((H, W), np.float32); N = 40
for k in range(N):
    s = 1 - 0.55 * k / N
    tr = skym.transform((W, H), Image.AFFINE, (s, 0, sunx * (1 - s), 0, s, suny * (1 - s)), Image.BILINEAR)
    acc += np.asarray(tr, np.float32) / 255.0
acc /= N
ray = np.clip(acc - (1 - alpha[..., 0]) * .9, 0, 1)       # only where land/trees are, not on the sky itself
ray = np.asarray(Image.fromarray((ray * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)), np.float32) / 255
img = 1 - (1 - img) * (1 - ray[..., None] * np.array([1.0, .93, .72]) * .25)

# ---------------- bloom + grade ----------------
lum = img @ np.array([.3, .59, .11])
blue = np.clip((img[..., 2] - img[..., 0]) * 2.2 - .2, 0, 1)[..., None] * (lum > .45)[..., None]
bright = np.clip((lum - .72) / .28, 0, 1)[..., None] * img + blue * img * 1.4
bl = np.asarray(Image.fromarray((bright * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14)), np.float32) / 255
img = 1 - (1 - img) * (1 - bl * .45)
bl2 = np.asarray(Image.fromarray((np.clip(blue * img * 1.4, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5)), np.float32) / 255
img = 1 - (1 - img) * (1 - bl2 * .6)
img = np.clip(img * np.array([1.03, 1.01, .97]), 0, 1)

# ---------------- "halfway" look (set 134, user picked option 2): real render, lightly painted + warm grade ----------------
from scipy.ndimage import uniform_filter
def kuwahara(im, r):
    lum = im @ np.array([.3, .59, .11]); k = r + 1; o = r // 2
    m = np.stack([uniform_filter(im[..., c], k) for c in range(3)], -1)
    ml = uniform_filter(lum, k); vl = uniform_filter(lum * lum, k) - ml * ml
    best = bv = None
    for dy in (-o, o):
        for dx in (-o, o):
            sv = np.roll(vl, (dy, dx), (0, 1)); sm = np.roll(m, (dy, dx), (0, 1))
            if best is None: best, bv = sm, sv
            else: w = sv < bv; best = np.where(w[..., None], sm, best); bv = np.minimum(bv, sv)
    return best
PAINT = float(__import__('os').environ.get('PAINT', .45))
if PAINT > 0:
    img = img * (1 - PAINT) + kuwahara(img, 4) * PAINT
lum = img @ np.array([.3, .59, .11])
img = img + np.clip(1 - lum * 1.7, 0, 1)[..., None] * np.array([-.015, .0, .045])           + np.clip(lum * 1.4 - .45, 0, 1)[..., None] * np.array([.05, .025, -.035])    # cool shadows, golden lights
img = np.clip(img, 0, 1)

# ---------------- tilt-shift: blur grows toward the bottom edge (and softly at the far band) ----------------
base = Image.fromarray((img * 255).astype(np.uint8))
b_soft = np.asarray(base.filter(ImageFilter.GaussianBlur(1.6)), np.float32) / 255
b_far = np.asarray(base.filter(ImageFilter.GaussianBlur(5)), np.float32) / 255
fy = yy / H
m_bot = sstep(.90, 1.0, fy)[..., None]
m_mid = (sstep(.86, .93, fy) * (1 - m_bot[..., 0]))[..., None] * .6
m_top = (sstep(.50, .38, fy) * .5)[..., None]
img = img * (1 - m_mid - m_top) + b_soft * (m_mid + m_top)
img = img * (1 - m_bot) + b_far * m_bot
out = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
out.save(BASE + '.png')
out.convert('RGB').save(BASE + '.jpg', quality=88)

# ---------------- preview with placeholder units (coloured shapes, not art) ----------------
pv = out.convert('RGBA'); ov = Image.new('RGBA', pv.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
try: font = ImageFont.truetype('DejaVuSans-Bold.ttf', 15)
except Exception: font = ImageFont.load_default()
for c in sorted(meta['cells'], key=lambda c: c['y']):
    x, y, h = c['x'] * W, c['y'] * H, c['h'] * H; w = h * .55
    d.ellipse((x - w * .7, y - h * .08, x + w * .7, y + h * .08), fill=(20, 30, 10, 110))
    col = (70, 140, 235, 235) if c['side'] == 'P' else (225, 80, 70, 235)
    d.rounded_rectangle((x - w / 2, y - h, x + w / 2, y - h * .02), radius=int(w * .25), fill=col, outline=(20, 25, 40, 255), width=2)
    t = c['side'] + '-' + c['col'][0].upper() + str(c['lane'] + 1)
    d.text((x, y - h * .55), t, fill='white', font=font, anchor='mm')
Image.alpha_composite(pv, ov).convert('RGB').save(BASE + '_board.jpg', quality=88)
print('post done', W, H)
