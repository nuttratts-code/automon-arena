# scenematch.py <sheet_8x1.png> <out.png> <step 1-4>  (set 226 R6, owner A1 + B1)
# 1 = 64 px spec: each frame shrunk /2.4 (box colour, hard alpha), 24 colours, outline = inside x0.45
# 2 = + 16 colours, desaturate 0.7, value range squeezed toward the scene's mid (0.78), warm-olive cast
# 3 = + outline = inside x0.7 (soft sel-out, no near-black ring like the painted scene)
# 4 = + sky rim: top-facing edge pixels mixed 35 % toward the sky colour (cool light from above)
import sys
from PIL import Image
import numpy as np
src, dst, step = sys.argv[1], sys.argv[2], int(sys.argv[3])
K = 2.4
sh = Image.open(src).convert("RGBA"); fw = sh.width // 8; fh = sh.height
nw, nh = round(fw / K), round(fh / K)
fr = []
for i in range(8):
    a = np.asarray(sh.crop((i * fw, 0, (i + 1) * fw, fh))).astype(float)
    pm = a.copy(); pm[..., :3] *= a[..., 3:4] / 255.0
    s = np.asarray(Image.fromarray(pm.astype(np.uint8)).resize((nw, nh), Image.BOX)).astype(float)
    al = s[..., 3]; rgb = np.where(al[..., None] > 0, s[..., :3] * 255.0 / np.maximum(al[..., None], 1), 0)
    fr.append((np.clip(rgb, 0, 255), al > 110))
def grade(c):
    c = c / 255.0
    l = (c * np.array([0.3, 0.59, 0.11])).sum(-1, keepdims=True)
    c = l + (c - l) * 0.7                         # desaturate
    c = 0.42 + (c - 0.42) * 0.78                  # squeeze values toward the scene mid
    c = c * np.array([1.02, 1.0, 0.9])            # warm-olive cast of the set
    return np.clip(c * 255.0, 0, 255)
if step >= 2:
    fr = [(grade(r), k) for r, k in fr]
ncol = 16 if step >= 2 else 24
big = np.concatenate([r[k] for r, k in fr]).astype(np.uint8).reshape(-1, 1, 3)
pal = Image.fromarray(big).quantize(ncol, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
outk = 0.7 if step >= 3 else 0.45
sky = np.array([150.0, 178.0, 190.0])
out = Image.new("RGBA", (nw * 8, nh))
for i, (rgb, keep) in enumerate(fr):
    q = np.asarray(Image.fromarray(rgb.astype(np.uint8)).quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB")).astype(float)
    o = np.zeros((nh, nw, 4)); o[keep, :3] = q[keep]; o[keep, 3] = 255
    pad = np.pad(keep, 1)
    up, dn, lf, rt = pad[:-2, 1:-1], pad[2:, 1:-1], pad[1:-1, :-2], pad[1:-1, 2:]
    edge = keep & ~(up & dn & lf & rt)
    if step >= 4:  # pixels just under the top edge (one row in) catch the sky
        top = keep & ~up
        inner = np.zeros_like(top); inner[1:] = top[:-1] & keep[1:]
        for m in (inner,):
            o[m, :3] = o[m, :3] * 0.65 + sky * 0.35
    o[edge, :3] = o[edge, :3] * outk
    out.paste(Image.fromarray(np.clip(o, 0, 255).astype(np.uint8), "RGBA"), (i * nw, 0))
out.save(dst); print(dst, out.size)
