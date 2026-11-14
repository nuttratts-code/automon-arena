# painted_idle.py <video.mp4> <out_dir> [n=32] [height=150]  (set 227: painted creature, green bg)
# loop = most alike frame pair 1.2-3.0 s apart; n frames evenly between; green key + largest blob; union crop
import sys, os, cv2, numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont
from scipy import ndimage
vid, out = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 32
HT = int(sys.argv[4]) if len(sys.argv) > 4 else 150
os.makedirs(out, exist_ok=True)
cap = cv2.VideoCapture(vid); fps = cap.get(5); F = []
while True:
    ok, f = cap.read()
    if not ok: break
    F.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
print('fps', fps, 'frames', len(F), F[0].shape)
sm = [cv2.resize(f, (240, 135), interpolation=cv2.INTER_AREA).astype(float) for f in F]
lo, hi = int(1.2 * fps), int(3.0 * fps)
best = min((np.abs(sm[a] - sm[b]).mean(), a, b) for a in range(len(F)) for b in range(a + lo, min(len(F), a + hi + 1)))
d, a, b = best; print('loop', a, '->', b, 'diff %.2f' % d, 'len %.2fs' % ((b - a) / fps))
idx = [a + round(i * (b - a) / N) for i in range(N)]
print('frames', idx)
def cut(x):
    x = x.astype(float); r, g, bl = x[..., 0], x[..., 1], x[..., 2]
    gx = g - np.maximum(r, bl); al = np.clip(1 - (gx - 8) / 20, 0, 1)
    lab, n = ndimage.label(al > 0.5); s = ndimage.sum(np.ones_like(al), lab, range(1, n + 1))
    al = al * ndimage.binary_dilation(lab == 1 + int(np.argmax(s)), iterations=3)
    x[..., 1] = np.minimum(g, np.maximum(r, bl) * 1.05)
    A = Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))
    o = Image.fromarray(x.astype(np.uint8)); o.putalpha(A); return o
cuts = [cut(F[i]) for i in idx]
bb = [c.getbbox() for c in cuts]
U = (min(q[0] for q in bb) - 6, min(q[1] for q in bb) - 6, max(q[2] for q in bb) + 6, max(q[3] for q in bb) + 2)
feet = [q[3] for q in bb]; print('feet row min/max', min(feet), max(feet), 'union', U)
h0 = bb[0][3] - bb[0][1]
def scaled(H): return [c.crop(U).resize((round((U[2] - U[0]) * H / h0), round((U[3] - U[1]) * H / h0)), Image.LANCZOS) for c in cuts]
fr = scaled(HT); W, H = fr[0].size
sh = Image.new('RGBA', (W * N, H))
for i, f in enumerate(fr): sh.paste(f, (i * W, 0))
sh.save(f'{out}/sheet_{N}x1_{W}x{H}.png'); print('sheet', sh.size)
ms = round((b - a) / fps * 1000 / N); print('ms per frame', ms)
big = scaled(300); G = []
for f in big:
    c = Image.new('RGBA', (f.width + 40, f.height + 40), (104, 108, 94, 255)); c.alpha_composite(f, (20, 20)); G.append(c.convert('RGB'))
G[0].save(f'{out}/preview.gif', save_all=True, append_images=G[1:], duration=ms, loop=0)
