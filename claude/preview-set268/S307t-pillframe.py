# set 307 t (owner after s): pick s3 (sat x1.45) as the default + "fit the pill to the frame — gaps show at the cut corners".
# The pill's own cuts (TL x+y<34, BR ~34) are much bigger than the frame's, so its TL / BR corners are rebuilt SQUARE first:
# pixels inside x+y < T (TL, T=50 = cut + outline + light band) / u+v < 44 (BR) copy the nearest pixel along the row (upper
# half of the triangle -> top edge bands continue) or the column (lower half -> side bands continue), then the frame's inner
# shape clips it. Writes pill_fr_<k>_<tok>.png only (sat x1.45). Usage: python S307t-pillframe.py <g286> [S]
# --- round s header kept below ---
# set 307 s (owner after r): "the frame covers the pill's white light · more vivid · number fitted to the pill".
# Picks A1 = the WHOLE p4 pill (light edge, cut corners) shrunk into the frame's inner box, gaps behind it = pill colour x0.35 ·
# B1 = 3 saturation levels to pick: files pill_fr_<k>_<tok>_s1/_s2/_s3 (sat x1.15 / x1.3 / x1.45), no suffix = x1.0.
# Same frame-only build as round r (S307r-pillframe.py). Usage: python S307s-pillframe.py <g286> [S]
import sys, os
import numpy as np
from PIL import Image, ImageDraw
g = sys.argv[1]; S = float(sys.argv[2]) if len(sys.argv) > 2 else 0.7
UI = os.path.join(g, "ui_r48")
W, H, M = 208, 104, 40
TOKS = {"gold": "card_frame.png", "mute": "card_frame_mute.png", "r-unc": "card_frame_r-unc.png",
        "r-rare": "card_frame_r-rare.png", "r-epic": "card_frame_r-epic.png", "r-legend": "card_frame_r-legend.png"}

def metal_mask(gold):   # metal = saturated gold pixels of the ORIGINAL frame (tinted frames are pixel-aligned copies)
    a = np.asarray(gold).astype(int)
    return (a[..., 3] > 128) & ((a[..., :3].max(-1) - a[..., :3].min(-1)) > 40)

GOLD = Image.open(os.path.join(UI, "card_frame.png")).convert("RGBA")
MET = metal_mask(GOLD)

def frame_only(im):
    a = np.asarray(im).copy(); w = a.shape[1]
    for y in range(18, 70):   # name strip: clear between the left metal run and the right metal run
        row = MET[y]; x0 = 0
        while x0 < w and not row[x0]: x0 += 1
        while x0 < w and row[x0]: x0 += 1
        x1 = w - 1
        while x1 > 0 and not row[x1]: x1 -= 1
        while x1 > 0 and row[x1]: x1 -= 1
        if x1 > x0: a[y, x0:x1 + 1] = 0
    for y in range(70, 82): a[y] = a[200]   # divider rows -> a plain side-bar row
    for y in range(10, 18):   # dark specks inside the top-left cut (hidden by the strip on the card)
        for x in range(0, 60):
            if not MET[y, x] and a[y, x, 3] > 0 and a[y, x, :3].max() < 80 and MET[y, :x].any(): a[y, x] = 0
    return Image.fromarray(a, "RGBA")

def nine(im, w, h, m, s):
    tw, th = im.size; d = round(m * s); out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sx = [0, m, tw - m, tw]; sy = [0, m, th - m, th]; dx = [0, d, w - d, w]; dy = [0, d, h - d, h]
    for i in range(3):
        for j in range(3):
            pc = im.crop((sx[i], sy[j], sx[i + 1], sy[j + 1])).resize((dx[i + 1] - dx[i], dy[j + 1] - dy[j]), Image.LANCZOS)
            out.alpha_composite(pc, (dx[i], dy[j]))
    return out

def inside(fr):   # everything not reachable from the canvas edge through transparent pixels
    al = fr.getchannel("A").point(lambda v: 255 if v > 60 else 0)
    m = Image.new("L", fr.size, 0); m.paste(al)
    ImageDraw.floodfill(m, (0, 0), 128); ImageDraw.floodfill(m, (W - 1, H - 1), 128)
    ImageDraw.floodfill(m, (W - 1, 0), 128); ImageDraw.floodfill(m, (0, H - 1), 128)
    return m.point(lambda v: 0 if v == 128 else 255)

frames = {t: nine(frame_only(Image.open(os.path.join(UI, f)).convert("RGBA")), W, H, M, S) for t, f in TOKS.items()}
SAT = {"": 1.45}
def square(p, T=50, T2=44):
    a = np.asarray(p).copy(); h, w = a.shape[:2]; src = a.copy()
    for y in range(T):
        for x in range(T - y):
            a[y, x] = src[y, T - y] if y < x else src[T - x, x]
    for v in range(T2):
        for u in range(T2 - v):
            a[h - 1 - v, w - 1 - u] = src[h - 1 - v, w - 1 - (T2 - v)] if v < u else src[h - 1 - (T2 - u), w - 1 - u]
    return Image.fromarray(a, "RGBA")
for t, fr in frames.items():
    ins = inside(fr); fa = np.asarray(fr.getchannel("A")); im_ = np.asarray(ins) > 0
    yy, xx = np.nonzero(im_ & (fa < 30)); box = (xx.min(), yy.min(), xx.max() + 1, yy.max() + 1)
    if t == "gold": print("inner box", box)
    for k in ("hp", "atk", "multi", "burn", "shock", "armor", "heal"):
        p = square(Image.open(os.path.join(UI, "pill_%s.png" % k)).convert("RGBA"))
        for suf, sat in SAT.items():
            q = p
            if sat != 1.0:
                hsv = np.asarray(p.convert("RGB").convert("HSV")).astype(float); hsv[..., 1] = np.clip(hsv[..., 1] * sat, 0, 255)
                q = Image.fromarray(hsv.round().astype(np.uint8), "HSV").convert("RGBA"); q.putalpha(p.getchannel("A"))
            a = np.asarray(q); mean = a[a[..., 3] > 250][:, :3].mean(0) * 0.35
            fill = Image.new("RGBA", (W, H), tuple(int(v) for v in mean) + (255,))
            fill.alpha_composite(q.resize((box[2] - box[0] + 2, box[3] - box[1] + 2), Image.LANCZOS), (box[0] - 1, box[1] - 1))
            fill.putalpha(ins)
            out = Image.new("RGBA", (W, H), (0, 0, 0, 0)); out.alpha_composite(fill); out.alpha_composite(fr)
            out.save(os.path.join(UI, "pill_fr_%s_%s%s.png" % (k, t, suf)))
print("pill_fr t ok, scale", S)
