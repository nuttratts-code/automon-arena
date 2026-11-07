# Post for stone_test.py: a "painted" version of each shot (Kuwahara brush filter + warm grade + canvas grain),
# saved side by side with the plain render.  Run: python post_test.py <out>   (reads <out>-stone_raw.png, <out>-arch_raw.png)
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import uniform_filter, gaussian_filter

def kuwahara(img, r):
    # classic Kuwahara: for each pixel pick the mean of the least-varied of 4 quadrants -> flat brush-like patches
    lum = img @ np.array([.3, .59, .11]); k = r + 1
    m = np.stack([uniform_filter(img[..., c], k) for c in range(3)], -1)
    ml = uniform_filter(lum, k); vl = uniform_filter(lum * lum, k) - ml * ml
    best = None; bv = None; o = r // 2
    for dy in (-o, o):
        for dx in (-o, o):
            sv = np.roll(vl, (dy, dx), (0, 1)); sm = np.roll(m, (dy, dx), (0, 1))
            if best is None: best, bv = sm, sv
            else:
                w = sv < bv; best = np.where(w[..., None], sm, best); bv = np.minimum(bv, sv)
    return best

def paint(img):
    a = kuwahara(img, 6); a = kuwahara(a, 3)
    lum = a @ np.array([.3, .59, .11])
    sh = np.clip(1 - lum * 1.6, 0, 1)[..., None]; hi = np.clip(lum * 1.4 - .4, 0, 1)[..., None]
    a = a + sh * np.array([-.02, .0, .06]) * .9 + hi * np.array([.06, .03, -.04])     # cool shadows, warm lights
    a = lum[..., None] + (a - lum[..., None]) * 1.12                                  # a little more colour
    g = gaussian_filter(np.random.default_rng(1).normal(0, 1, a.shape[:2]), 1.2)[..., None]
    return np.clip(a + g * .015, 0, 1)

out = sys.argv[1]
for tag in ('stone', 'arch'):
    im = np.asarray(Image.open(f'{out}-{tag}_raw.png').convert('RGB'), np.float32) / 255
    pt = paint(im); H, W = im.shape[:2]
    both = Image.new('RGB', (W * 2 + 12, H + 34), (24, 24, 28))
    both.paste(Image.fromarray((im * 255).astype(np.uint8)), (0, 34)); both.paste(Image.fromarray((pt * 255).astype(np.uint8)), (W + 12, 34))
    d = ImageDraw.Draw(both)
    try: f = ImageFont.truetype('arial.ttf', 20)
    except Exception: f = ImageFont.load_default()
    d.text((10, 6), 'A: render (real-looking)', fill='white', font=f); d.text((W + 22, 6), 'B: painted (like the target)', fill='white', font=f)
    both.save(f'{out}-{tag}.jpg', quality=90)
print('post done')
