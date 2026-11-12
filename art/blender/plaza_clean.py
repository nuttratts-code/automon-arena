# Set 215: paint the 12 old ring marks out of the plaza picture made by export_godot.py (they sit where the old
# Blender camera wanted the slots; the game draws its own rune rings on the real slots, owner pick B1).
# Run (system python, numpy + Pillow only):  python -I art/blender/plaza_clean.py <dir with plaza.png + plaza_glow.png> <out.png>
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
img = np.asarray(Image.open(src + "/plaza.png").convert("RGBA")).astype(np.float32)
glow = np.asarray(Image.open(src + "/plaza_glow.png").convert("RGBA")).astype(np.float32)
alpha = img[:, :, 3] > 127
mask = (glow[:, :, 0] > 90) & alpha  # the core of each ring + centre dot (the soft glow halo is not drawn in the colours)

def grow(m, n):
    for _ in range(n):
        g = m.copy()
        g[1:, :] |= m[:-1, :]
        g[:-1, :] |= m[1:, :]
        g[:, 1:] |= m[:, :-1]
        g[:, :-1] |= m[:, 1:]
        m = g
    return m

mask = grow(mask, 2) & alpha
# thin line holes: fill from the edges inward (each pass a hole pixel next to known pixels takes their mean)
known = alpha & ~mask
rgb = img[:, :, :3].copy()
for _ in range(60):
    hole = mask & ~known
    if not hole.any():
        break
    acc = np.zeros_like(rgb)
    cnt = np.zeros(rgb.shape[:2], np.float32)
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)):
        k = np.roll(np.roll(known, dy, 0), dx, 1)
        acc += np.roll(np.roll(rgb, dy, 0), dx, 1) * k[:, :, None]
        cnt += k
    edge = hole & (cnt > 0)
    rgb[edge] = acc[edge] / cnt[edge][:, None]
    known = known | edge
rng = np.random.default_rng(215)  # a little stone grain so the filled lines are not smooth
rgb = np.where(mask[:, :, None], rgb + rng.normal(0.0, 5.0, rgb.shape[:2])[:, :, None], rgb)
res = np.dstack([np.clip(rgb, 0, 255), img[:, :, 3]]).astype(np.uint8)
Image.fromarray(res, "RGBA").save(out, optimize=True)
print("plaza_clean: filled", int(mask.sum()), "px ->", out)
