# set 303 r50: cut GPT's 6 tribe backgrounds (3x2 on magenta) and mask each to our card body shape.
# Usage: python -I S303r50-split-bg.py <gpt sheet> <card_body.png> <out dir>
import sys, os
import numpy as np
from PIL import Image
src = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int)
body = Image.open(sys.argv[2]).convert("RGBA")
out = sys.argv[3]
mag = (src[..., 0] > 200) & (src[..., 2] > 200) & (src[..., 1] < 90)
def runs(v, thr):
    on = v > thr; r = []; s = None
    for i, x in enumerate(on):
        if x and s is None: s = i
        if not x and s is not None: r.append((s, i)); s = None
    if s is not None: r.append((s, len(on)))
    return [p for p in r if p[1] - p[0] > 100]
cols = runs((~mag).mean(0), 0.3); rows = runs((~mag).mean(1), 0.3)
assert len(cols) == 3 and len(rows) == 2, (cols, rows)
names = ["steel", "fire", "bolt", "wind", "spirit", "fiend"]
x0, y0, x1, y1 = body.getbbox()
alpha = body.split()[3]
for i, n in enumerate(names):
    (cx0, cx1), (ry0, ry1) = cols[i % 3], rows[i // 3]
    p = Image.fromarray(src[ry0 + 3:ry1 - 3, cx0 + 3:cx1 - 3].astype("uint8"))
    p = p.resize((x1 - x0, y1 - y0), Image.LANCZOS)
    c = Image.new("RGBA", body.size, (0, 0, 0, 0)); c.paste(p, (x0, y0))
    c.putalpha(alpha)
    c.save(os.path.join(out, "S303r50-card_body_%s.png" % n))
print("split ok", cols, rows)
