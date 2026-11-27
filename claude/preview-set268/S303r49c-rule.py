# r49c: owner "make the strip rule thicker and with no black line cutting it" -> redraw the gold rule band in the frame layer:
# 9 px tall (was 5), gold gradient light -> dark, glint at the centre, joined to the side frames' gold (the dark inner
# side lines and the black line above no longer cut it). Usage: python S303r49c-rule.py <in frame png> <out png>
import sys
from PIL import Image; import numpy as np
f = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(float)
H, W = f.shape[:2]
def isgold(p): return p[3] > 200 and p[0] > 120 and p[0] - p[2] > 60
y = 150
xl = 0
while not isgold(f[y, xl]): xl += 1
while isgold(f[y, xl]): xl += 1          # first non-gold x after the left frame
xr = W - 1
while not isgold(f[y, xr]): xr -= 1
while isgold(f[y, xr]): xr -= 1          # last non-gold x before the right frame
y0, y1 = 70, 79                           # new band rows (old rule 72-76 + black 71 + half-black 77)
top = np.array([246, 214, 120]); mid = np.array([214, 168, 72]); bot = np.array([128, 92, 34])
for yy in range(y0, y1):
    t = (yy - y0) / (y1 - y0 - 1)
    c = top * (1 - t) * (1 - t) + mid * 2 * t * (1 - t) + bot * t * t
    for xx in range(xl - 5, xr + 6):
        g = np.exp(-((xx - W / 2) / (W * 0.16)) ** 2) * (1 - abs(t - 0.3)) * 0.55   # centre glint
        col = c * (1 - g) + np.array([255, 246, 214]) * g
        f[yy, xx, :3] = col; f[yy, xx, 3] = 255
# soft dark shadow line under the band (1 px, 45 %) so it still separates strip from body
f[y1, xl:xr + 1, :3] = f[y1, xl:xr + 1, :3] * 0.0; f[y1, xl:xr + 1, 3] = 115
Image.fromarray(f.clip(0, 255).astype(np.uint8), 'RGBA').save(sys.argv[2])
print('xl', xl, 'xr', xr)
