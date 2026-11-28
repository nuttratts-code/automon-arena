# set 307 r (owner, 28 Nov): "shrink the card frame and use it as the stat pill background" + picture of framed pills.
# Owner picks A1 frame colour = that card's frame (rarity) · B1 inside = the p4 pill colour with its faint marks · C2 number size kept.
# Frame-only = card_frame_<tok>.png with the name strip (dark fill rows 18-69) and the gold divider (rows 70-80) removed,
# then 9-sliced (corner 40 src px, scale S) onto the pill canvas 208x104 (= pill texture size, so _three(0.42) stays).
# Fill = centre crop of ui_r48/pill_<k>.png (p4) clipped to the inside of the frame. Writes ui_r48/pill_fr_<k>_<tok>.png.
# Usage: python S307r-pillframe.py <g286> [S]   (S = frame scale, default 0.7 -> metal border ~10 % of the pill height)
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
for k in ("hp", "atk", "multi", "burn", "shock", "armor", "heal"):
    p = Image.open(os.path.join(UI, "pill_%s.png" % k)).convert("RGBA"); pw, ph = p.size
    fill = p.crop((int(pw * 0.20), int(ph * 0.12), int(pw * 0.80), int(ph * 0.88))).resize((W, H), Image.LANCZOS)
    mean = tuple(int(v) for v in np.asarray(fill)[np.asarray(fill)[..., 3] > 250][:, :3].mean(0))
    base = Image.new("RGBA", (W, H), mean + (255,)); base.alpha_composite(fill); fill = base   # crop corners may hit the pill's own cut
    for t, fr in frames.items():
        out = Image.new("RGBA", (W, H), (0, 0, 0, 0)); f2 = fill.copy(); f2.putalpha(inside(fr))
        out.alpha_composite(f2); out.alpha_composite(fr)
        out.save(os.path.join(UI, "pill_fr_%s_%s.png" % (k, t)))
print("pillfr ok, scale", S)
