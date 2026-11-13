# set 217 R5 (sample only): cut the owner's full target picture into the two far layers.
#   python -I r5-cut-far.py <target.jpg> <out_dir>
# far_sky.png   = sky + blue mountains + hills, stones painted out (opaque), rows 0..560
# far_hills.png = only the green hills + the arch (alpha from a green mask), same rows, stones painted out
import sys
import numpy as np
import cv2

src, out = sys.argv[1], sys.argv[2]
im = cv2.imread(src, cv2.IMREAD_COLOR)
assert im is not None and im.shape[1] == 2000, im.shape if im is not None else None
H = 560
im = im[:H].copy()

# standing stones / rocks that rise into the band (x0, y0, x1, y1) in the 2000x1116 picture
STONES = [(30, 300, 310, H), (345, 230, 575, H), (615, 375, 750, H), (1230, 490, 1565, H), (1585, 290, 2000, H)]
mask = np.zeros(im.shape[:2], np.uint8)
for x0, y0, x1, y1 in STONES:
    mask[y0:y1, x0:x1] = 255
# fill each hole row by row: blend the colours just left and right of it (hills run sideways), plus a little grain
# (overlapping stones are merged into one box so a fill never samples another stone)
clean = im.astype(np.float32)
blur = cv2.GaussianBlur(clean, (0, 0), 2)
for x0, y0, x1, y1 in STONES:
    l, r = max(x0 - 6, 0), min(x1 + 5, 1999)
    t = np.linspace(0, 1, x1 - x0)[None, :, None]
    lc = blur[y0:y1, l:l + 1] if x0 > 0 else blur[y0:y1, r:r + 1]
    rc = blur[y0:y1, r:r + 1] if x1 < 2000 else lc
    base = lc * (1 - t) + rc * t
    rng = np.random.default_rng(x0)
    clean[y0:y1, x0:x1] = base + cv2.GaussianBlur(rng.normal(0, 6, base.shape).astype(np.float32), (0, 0), 1.2)
clean = clean.clip(0, 255)
soft = cv2.GaussianBlur(mask, (0, 0), 3).astype(np.float32)[..., None] / 255.0
edge = cv2.GaussianBlur(clean, (0, 0), 1.5)
clean = (clean * (1 - soft * 0.5) + edge * soft * 0.5).astype(np.uint8)
cv2.imwrite(out + "/far_sky.png", clean)

# green hills (+ the arch on its hill): hue 30..95 and some saturation, below the mountain tops
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)  # the original: the filled boxes are blurry
g = ((hsv[..., 0] >= 30) & (hsv[..., 0] <= 88) & (hsv[..., 1] >= 35)).astype(np.uint8) * 255
g[:280] = 0
g[470:] = 255  # the meadow behind the plaza is always solid
g[300:400, 1350:1450] = np.maximum(g[300:400, 1350:1450], ((hsv[300:400, 1350:1450, 1] < 90) & (hsv[300:400, 1350:1450, 2] < 170)).astype(np.uint8) * 255)  # the arch (grey)
arch = g[300:400, 1350:1450].copy()
# silhouette per column: the first row from which 8 rows in a row are green; everything below is solid
top = np.full(2000, 470)
for x in range(2000):
    col = g[280:470, x] > 0
    run = np.convolve(col.astype(int), np.ones(8, int), "valid")
    hit = np.flatnonzero(run == 8)
    if hit.size:
        top[x] = 280 + hit[0]
top = top.astype(np.float32)
for x0, y0, x1, y1 in STONES:  # under a stone: draw the hill line straight across from edge to edge
    l, r = top[max(x0 - 3, 0)], top[min(x1 + 2, 1999)] if x1 < 2000 else top[max(x0 - 3, 0)]
    top[x0:x1] = np.linspace(l, r, x1 - x0)
top = np.array([np.median(top[max(0, x - 6):x + 7]) for x in range(2000)])
yy = np.arange(H)[:, None]
g = (yy >= top[None, :]).astype(np.uint8) * 255
g[300:400, 1350:1450] = np.maximum(g[300:400, 1350:1450], arch)
a = cv2.GaussianBlur(g, (0, 0), 1.2)
a[H - 70:] = (a[H - 70:] * np.linspace(1, 0, 70)[:, None]).astype(np.uint8)  # the meadow fades into the 3D ground
cv2.imwrite(out + "/far_hills.png", np.dstack([clean, a]))
print("ok", clean.shape, int((a > 128).mean() * 100), "% opaque hills")
