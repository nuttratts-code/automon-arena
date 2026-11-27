# set 303 r51: key GPT attempt 2 (S303r51-gpt-pills-2.png) -> 7 stat pills + 1 coin.
# Pills: keep left cap + a middle window (centred on the pattern) + right cap so the texture has the on-screen
# aspect (no squashing of the pattern); coin: trimmed whole. Edge safety (note 232): the mask only removes
# magenta; pieces are cut by bbox from their own alpha, nothing masks into a piece.
import sys
import numpy as np
from PIL import Image
src = sys.argv[1] if len(sys.argv) > 1 else "S303r51-gpt-pills-2.png"
im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
a = 1.0 - np.clip(((np.minimum(r, b) - g) - 60.0) / 120.0, 0.0, 1.0)
# despill: pull magenta-tinted edges toward their own green level
spill = np.clip(np.minimum(r, b) - g, 0, None) * (1.0 - a)
rgb = np.stack([r - spill, g, b - spill], -1).clip(0, 255)
rgba = np.dstack([rgb, a * 255.0]).astype(np.uint8)
A = a > 0.5
H, W = A.shape
# pills = left column (x < 45 % of width), coin = right part
colL = A[:, : int(W * 0.45)]
rows = colL.any(1)
bands, y = [], 0
while y < H:
    if rows[y]:
        y0 = y
        while y < H and rows[y]: y += 1
        if y - y0 > 20: bands.append((y0, y))
    y += 1
assert len(bands) == 7, bands
names = ["hp", "atk", "multi", "burn", "shock", "armor", "heal"]
ASPECT = 28.0 / 13.0          # on-screen pill w:h (base units)
for nm, (y0, y1) in zip(names, bands):
    xs = np.where(colL[y0:y1].any(0))[0]
    x0, x1 = xs[0], xs[-1] + 1
    p = rgba[y0:y1, x0:x1]
    h, w = p.shape[:2]
    cap = int(round(h * 0.42))                      # chamfer + outline stay whole
    mw = int(round(h * ASPECT)) - 2 * cap           # middle window width
    body = p[int(h * 0.25):int(h * 0.75), cap:w - cap, :3].astype(np.float32)
    det = np.abs(body - np.median(body, axis=1, keepdims=True)).sum((0, 2))   # pattern detail per column
    cs = np.convolve(det, np.ones(mw), "valid")
    m0 = cap + int(np.argmax(cs))
    out = np.concatenate([p[:, :cap], p[:, m0:m0 + mw], p[:, w - cap:]], 1)
    Image.fromarray(out).resize((int(round(26 * ASPECT * 4)), 26 * 4), Image.LANCZOS).save("S303r51-pill_%s.png" % nm)
    print(nm, (x0, y0, x1, y1), "cap", cap, "win", m0, mw)
cr = A[:, int(W * 0.45):]
ys = np.where(cr.any(1))[0]; xs = np.where(cr.any(0))[0] + int(W * 0.45)
c = Image.fromarray(rgba[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1])
c.thumbnail((64, 64), Image.LANCZOS)
c.save("S303r51-coin.png"); print("coin", c.size)
