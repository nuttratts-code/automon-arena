# set 307 copy of S303r51b-bake-pills.py at 26:13 (owner: shop numbers are short -> shorter pills)
# set 303 r51b: GPT attempt 1 (S303r51b-gpt-1.png) = 7 plain pills on magenta (left) + 7 white pattern strips on black (right).
# Bake each final pill texture at 34:13 (fits "100K", the longest tested value, set 286 r35j):
#   plain pill -> 3-slice in PIL (caps 42 % of height keep the 2-cut chamfers; middle is plain so stretching is safe)
#   strip -> brightness = alpha, window = pill width from the strip's centre, white at PAT alpha,
#   masked by the pill's own alpha shrunk 3 px (pattern fills the whole pill, stays inside the outline; note 232).
import sys
import numpy as np
from PIL import Image, ImageFilter
src = Image.open(sys.argv[1] if len(sys.argv) > 1 else "S303r51b-gpt-1.png").convert("RGB")
im = np.asarray(src).astype(np.float32)
Hs, Ws = im.shape[:2]
names = ["hp", "atk", "multi", "burn", "shock", "armor", "heal"]
OH, OW, PAT = 104, 208, 0.30          # set 307: 26:13 (shop numbers are short)
def bands(mask):
    rows = mask.any(1); out, y = [], 0
    while y < len(rows):
        if rows[y]:
            y0 = y
            while y < len(rows) and rows[y]: y += 1
            if y - y0 > 15: out.append((y0, y))
        y += 1
    return out
# split point = first column that is mostly black
blackcol = ((im.max(2) < 30).mean(0) > 0.6)
xs = int(np.argmax(blackcol))
L = im[:, :xs]; R = im[:, xs:]
r, g, b = L[..., 0], L[..., 1], L[..., 2]
a = 1.0 - np.clip(((np.minimum(r, b) - g) - 60.0) / 120.0, 0.0, 1.0)
spill = np.clip(np.minimum(r, b) - g, 0, None) * (1.0 - a)
rgba = np.dstack([np.stack([r - spill, g, b - spill], -1).clip(0, 255), a * 255.0]).astype(np.uint8)
pb = bands(a > 0.5); sb = bands(R.max(2) > 60)
assert len(pb) == 7 and len(sb) == 7, (pb, sb)
SMAX = max(s1 - s0 for s0, s1 in sb)
for nm, (y0, y1), (s0, s1) in zip(names, pb, sb):
    cols = np.where((a[y0:y1] > 0.5).any(0))[0]
    p = Image.fromarray(rgba[y0:y1, cols[0]:cols[-1] + 1])
    k = OH / p.height
    p = p.resize((max(1, int(round(p.width * k))), OH), Image.LANCZOS)
    cap = int(round(OH * 0.42))
    out = Image.new("RGBA", (OW, OH))
    out.paste(p.crop((0, 0, cap, OH)), (0, 0))
    out.paste(p.crop((cap, 0, p.width - cap, OH)).resize((OW - 2 * cap, OH), Image.LANCZOS), (cap, 0))
    out.paste(p.crop((p.width - cap, 0, p.width, OH)), (OW - cap, 0))
    # pattern strip: crop rows of the band, scale to the pill height, take a centred window
    sc = np.where((R[s0:s1].max(2) > 60).any(0))[0]
    st = Image.fromarray(R[s0:s1, sc[0]:sc[-1] + 1].astype(np.uint8)).convert("L")
    ks = (OH - 16) / SMAX                                   # one scale for every strip (keeps their own sizes)
    st = st.resize((int(st.width * ks), max(1, int(st.height * ks))), Image.LANCZOS)
    x0 = max(0, (st.width - OW) // 2)
    win = Image.new("L", (OW, OH)); win.paste(st.crop((x0, 0, x0 + OW, st.height)), (0, (OH - st.height) // 2))
    inner = out.getchannel("A").filter(ImageFilter.MinFilter(7))          # 3 px inside the outline
    pa = (np.asarray(win).astype(np.float32) / 255.0) * PAT * (np.asarray(inner).astype(np.float32) / 255.0)
    o = np.asarray(out).astype(np.float32)
    o[..., :3] = o[..., :3] * (1 - pa[..., None]) + 255.0 * pa[..., None]
    Image.fromarray(o.clip(0, 255).astype(np.uint8)).save("S307-pill_%s.png" % nm)
    print(nm, "pill", (y0, y1), "strip", (s0, s1), st.size)
