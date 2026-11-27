# set 307 copy of S303r51c-pills.py at 26:13 (writes S307-pill_heal / _multi_v2 / _atk_v2)
# set 303 r51c: owner edits on r51b, PIL only (no GPT):
#   heal  = the r51 heal pattern (mixed-size sparkles, S303r51-gpt-pills-2.png row 7) re-laid across the 34:13 pill
#   multi = "x" marks only, staggered up/down (glyphs from S303r51b-gpt-1.png strip row 3)
#   atk   = bigger middle claw, left/right claws spread out (glyph from S303r51b-gpt-1.png strip row 2)
# Plain pills = the r51b ones without pattern (same 3-slice as S303r51b-bake-pills.py).
# Variants: multi v1/v2, atk v1/v2 -> list sheet S303r51c-sheet.png; chosen ones -> S303r51c-pill_<kind>.png
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

OH, OW, PAT = 104, 208, 0.30
names = ["hp", "atk", "multi", "burn", "shock", "armor", "heal"]

def bands(mask, minh=15):
    rows = mask.any(1); out, y = [], 0
    while y < len(rows):
        if rows[y]:
            y0 = y
            while y < len(rows) and rows[y]: y += 1
            if y - y0 > minh: out.append((y0, y))
        y += 1
    return out

def key_magenta(L):
    r, g, b = L[..., 0], L[..., 1], L[..., 2]
    a = 1.0 - np.clip(((np.minimum(r, b) - g) - 60.0) / 120.0, 0.0, 1.0)
    spill = np.clip(np.minimum(r, b) - g, 0, None) * (1.0 - a)
    rgba = np.dstack([np.stack([r - spill, g, b - spill], -1).clip(0, 255), a * 255.0]).astype(np.uint8)
    return a, rgba

# ---- r51b source: plain pills + white strips
im = np.asarray(Image.open("S303r51b-gpt-1.png").convert("RGB")).astype(np.float32)
xs = int(np.argmax(((im.max(2) < 30).mean(0) > 0.6)))
Lh, R = im[:, :xs], im[:, xs:]
a, rgba = key_magenta(Lh)
pb = bands(a > 0.5); sb = bands(R.max(2) > 60)
assert len(pb) == 7 and len(sb) == 7
SMAX = max(s1 - s0 for s0, s1 in sb)
KS = (OH - 16) / SMAX                     # r51b strip scale (keeps glyph sizes as in r51b)

def plain(nm):
    y0, y1 = pb[names.index(nm)]
    cols = np.where((a[y0:y1] > 0.5).any(0))[0]
    p = Image.fromarray(rgba[y0:y1, cols[0]:cols[-1] + 1])
    p = p.resize((max(1, int(round(p.width * OH / p.height))), OH), Image.LANCZOS)
    cap = int(round(OH * 0.42)); out = Image.new("RGBA", (OW, OH))
    out.paste(p.crop((0, 0, cap, OH)), (0, 0))
    out.paste(p.crop((cap, 0, p.width - cap, OH)).resize((OW - 2 * cap, OH), Image.LANCZOS), (cap, 0))
    out.paste(p.crop((p.width - cap, 0, p.width, OH)), (OW - cap, 0))
    return out

def strip_glyphs(nm):
    """glyphs of one strip = column segments separated by empty columns, as L images at r51b scale"""
    s0, s1 = sb[names.index(nm)]
    band = R[s0:s1].max(2)
    on = (band > 60).any(0)
    segs, x = [], 0
    while x < len(on):
        if on[x]:
            x0 = x
            while x < len(on) and on[x]: x += 1
            segs.append((x0, x))
        x += 1
    out = []
    for x0, x1 in segs:
        g = band[:, x0:x1]
        ys = np.where((g > 60).any(1))[0]
        g = Image.fromarray(g[ys[0]:ys[-1] + 1].astype(np.uint8))
        out.append(g.resize((max(1, int(g.width * KS)), max(1, int(g.height * KS))), Image.LANCZOS))
    return out

# ---- r51 heal: sparkles = pixels lighter than the pill's own smooth base
im2 = np.asarray(Image.open("S303r51-gpt-pills-2.png").convert("RGB")).astype(np.float32)
left = im2[:, :700]
a2, _ = key_magenta(left)
hb = bands(a2 > 0.5)[6]
cols = np.where((a2[hb[0]:hb[1]] > 0.5).any(0))[0]
pill = left[hb[0]:hb[1], cols[0]:cols[-1] + 1]
lum = pill.mean(2)
base = ndimage.median_filter(lum, size=31)
diff = np.clip((lum - base - 6) / 30.0, 0, 1)
inner2 = ndimage.binary_erosion(a2[hb[0]:hb[1], cols[0]:cols[-1] + 1] > 0.5, iterations=12)
diff *= inner2
raw, _ = ndimage.label(diff > 0.06)
gl = np.zeros_like(diff, bool)   # drop the wide top gloss band before joining arms
for j, sl in enumerate(ndimage.find_objects(raw)):
    if sl[1].stop - sl[1].start > diff.shape[1] * 0.4: gl |= raw == j + 1
diff[gl] = 0
lab, n = ndimage.label(ndimage.binary_dilation(diff > 0.06, iterations=4))   # faint arms join their star
PH, PW = pill.shape[:2]
k2 = OH / PH
heal_stars = []
for i, sl in enumerate(ndimage.find_objects(lab)):
    h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
    if h < 12 or w < 12 or w > PW * 0.4: continue   # skip tiny specks + the top gloss band
    cy, cx = (sl[0].start + sl[0].stop) / 2 / PH, (sl[1].start + sl[1].stop) / 2 / PW
    pad = 0
    ys = slice(max(0, sl[0].start - pad), sl[0].stop + pad); xs_ = slice(max(0, sl[1].start - pad), sl[1].stop + pad)
    g = Image.fromarray((diff[ys, xs_] * 255).astype(np.uint8))
    heal_stars.append((cx, cy, g))
heal_stars.sort(key=lambda t: t[0])
print("heal stars", [(round(c, 2), round(d, 2), g.size) for c, d, g in heal_stars])

def bake(pl, layer):
    inner = pl.getchannel("A").filter(ImageFilter.MinFilter(7))
    pa = (np.asarray(layer).astype(np.float32) / 255.0) * PAT * (np.asarray(inner).astype(np.float32) / 255.0)
    o = np.asarray(pl).astype(np.float32)
    o[..., :3] = o[..., :3] * (1 - pa[..., None]) + 255.0 * pa[..., None]
    return Image.fromarray(o.clip(0, 255).astype(np.uint8))

def put(layer, g, cx, cy, s=1.0):
    if s != 1.0: g = g.resize((max(1, int(g.width * s)), max(1, int(g.height * s))), Image.LANCZOS)
    tmp = Image.new("L", layer.size); tmp.paste(g, (int(round(cx - g.width / 2)), int(round(cy - g.height / 2))))
    return Image.fromarray(np.maximum(np.asarray(layer), np.asarray(tmp)))

out = {}
# heal: r51 layout (relative x/y kept, x squeezed into the 34:13 pill), glyph size as r51 x 0.85
L = Image.new("L", (OW, OH))
xs0, xs1 = heal_stars[0][0], heal_stars[-1][0]
for cx, cy, g in heal_stars:
    x = 26 + (cx - xs0) / (xs1 - xs0) * (OW - 52)
    L = put(L, g, x, cy * OH, k2 * 1.0)
out["heal"] = bake(plain("heal"), L)

# multi: x marks only, staggered
xg = strip_glyphs("multi")[0::2][1]           # an "x" (strip goes x, star, x, ...)
for v, (cnt, s) in {"v1": (5, 0.75), "v2": (4, 0.9)}.items():
    L = Image.new("L", (OW, OH))
    for i in range(cnt):
        x = 40 + i * (OW - 80) / (cnt - 1)
        L = put(L, xg, x, OH * (0.36 if i % 2 == 0 else 0.64), s)
    out["multi_" + v] = bake(plain("multi"), L)

# atk: one claw glyph; middle bigger, sides moved out
cg = strip_glyphs("atk")[4]
for v, (sm, ss, sx) in {"v1": (1.3, 0.9, 0.17), "v2": (1.45, 0.75, 0.12)}.items():
    L = Image.new("L", (OW, OH))
    L = put(L, cg, OW * sx, OH / 2, ss)
    L = put(L, cg, OW * (1 - sx), OH / 2, ss)
    L = put(L, cg, OW / 2, OH / 2, sm)
    out["atk_" + v] = bake(plain("atk"), L)

for k, v in out.items(): v.save("S307-pill_%s.png" % k)

# ---- list sheet: r51b vs r51c at x2 (as 8x textures shown at 2x of 34x13 = 68x26 ... shown big at 272x104)
from PIL import ImageDraw, ImageFont
try: F = ImageFont.truetype("C:/Windows/Fonts/tahoma.ttf", 22)
except Exception: F = ImageFont.load_default()
rows = [("heal", "S303r51b-pill_heal.png", ["heal"]),
        ("x hit", "S303r51b-pill_multi.png", ["multi_v1", "multi_v2"]),
        ("ATK", "S303r51b-pill_atk.png", ["atk_v1", "atk_v2"])]
W = 150 + 3 * (OW + 30); Hh = 50 + len(rows) * (OH + 40) + 40 + 3 * 13 * 3 + 30
sh = Image.new("RGBA", (W, Hh), (24, 26, 30, 255)); d = ImageDraw.Draw(sh)
d.text((150, 10), "r51b (old)", fill="white", font=F)
d.text((150 + OW + 30, 10), "r51c v1", fill="white", font=F)
d.text((150 + 2 * (OW + 30), 10), "r51c v2", fill="white", font=F)
y = 50
for lab_, old, new in rows:
    d.text((10, y + 38), lab_, fill="white", font=F)
    sh.alpha_composite(Image.open(old), (150, y))
    for j, k in enumerate(new): sh.alpha_composite(out[k], (150 + (j + 1) * (OW + 30), y))
    y += OH + 40
d.text((10, y), "real size x3 (34x13):", fill="white", font=F); y += 34
x = 10
for k in ["heal", "multi_v1", "multi_v2", "atk_v1", "atk_v2"]:
    sh.alpha_composite(out[k].resize((34 * 3, 13 * 3), Image.LANCZOS), (x, y)); x += 34 * 3 + 20
pass
print("ok", list(out))
