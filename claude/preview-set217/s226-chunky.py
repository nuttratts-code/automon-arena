# chunky.py <sheet.png> <out.png> <K>: 8x1 idle sheet -> each frame shrunk K times (box colour, hard alpha),
# <= 24 colours, 1 px outline = the inside colour x0.45 (sel-out). Shown K x bigger in the scene = same size, bigger pixels.
import sys
from PIL import Image
import numpy as np
src, dst, K = sys.argv[1], sys.argv[2], float(sys.argv[3])
sh = Image.open(src).convert("RGBA"); fw = sh.width // 8; fh = sh.height
nw, nh = round(fw / K), round(fh / K)
frames = []
for i in range(8):
    f = sh.crop((i * fw, 0, (i + 1) * fw, fh))
    a = np.asarray(f).astype(float)
    pm = a.copy(); pm[..., :3] *= a[..., 3:4] / 255.0          # premultiply so the edge does not go dark
    s = np.asarray(Image.fromarray(pm.astype(np.uint8)).resize((nw, nh), Image.BOX)).astype(float)
    al = s[..., 3]; rgb = np.where(al[..., None] > 0, s[..., :3] * 255.0 / np.maximum(al[..., None], 1), 0)
    keep = al > 110
    frames.append((np.clip(rgb, 0, 255), keep))
# one palette for all frames
big = np.concatenate([fr[0][fr[1]] for fr in frames]).astype(np.uint8).reshape(-1, 1, 3)
pal = Image.fromarray(big).quantize(24, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
out = Image.new("RGBA", (nw * 8, nh))
for i, (rgb, keep) in enumerate(frames):
    q = np.asarray(Image.fromarray(rgb.astype(np.uint8)).quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB")).astype(float)
    o = np.zeros((nh, nw, 4)); o[keep, :3] = q[keep]; o[keep, 3] = 255
    # outline: inside pixels with an empty 4-neighbour become dark versions of themselves
    pad = np.pad(keep, 1)
    edge = keep & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    o[edge, :3] = o[edge, :3] * 0.45
    out.paste(Image.fromarray(o.astype(np.uint8), "RGBA"), (i * nw, 0))
out.save(dst); print(dst, out.size)
