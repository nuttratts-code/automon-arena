# set 307 odds tag h (owner): the rarity dots before each % -> small gems in OUR 2-cut-corner shape (cut TL + BR).
# Owner picks: A3 = Claude draws first (GPT only if none pass) · B3 = faceted AND glossy versions on one sheet.
# Gems are drawn at 16x supersample and shrunk to game size; the in-game rows paint them over the real dots of S307odds10 (PC 1920).
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
F = r"D:\GitHub\automon-scratch\g286\data\fonts\IBMPlexSansThai-SemiBold.ttf"
SHOT = r"D:\GitHub\automon-scratch\out\s302_S307odds10\8_prepH_hybrid.png"
RAR = ["#a7b6c6", "#7fd18c", "#7fb2f0", "#c9a2f2", "#f0c860"]   # tone.json mute · r-unc · r-rare · r-epic · r-legend
DOTS = [(171, 195), (257, 281), (321, 346), (385, 410), (450, 474)]   # dot x runs at y 262 in SHOT
CY = 262
INK = (12, 16, 24)
import colorsys
def hx(c):   # rarity colour, saturation x1.45 so it reads as a stone, not a pastel chip
    r, g, b = (int(c[i:i + 2], 16) / 255 for i in (1, 3, 5)); h, s, v = colorsys.rgb_to_hsv(r, g, b)
    return tuple(int(x * 255) for x in colorsys.hsv_to_rgb(h, min(1, s * 1.45), v * 0.95))
def mix(a, b, t): return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))
def shade(c, b):   # b 0 = deep, 0.5 = base, 1 = light
    dark = tuple(v * 0.30 for v in c); light = mix(c, (255, 255, 255), 0.65)
    return mix(dark, c, b * 2) if b < 0.5 else mix(c, light, (b - 0.5) * 2)
def hexp(S, c, d):   # our motif: square S, 45deg cuts of leg c at TL + BR, inset by d
    L = c - d * (2 - math.sqrt(2))
    return [(d + L, d), (S - d, d), (S - d, S - d - L), (S - d - L, S - d), (d, S - d), (d, d + L)]
def mask(S, poly):
    m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).polygon(poly, fill=255); return m
GOLD_A, GOLD_B = (246, 222, 150), (120, 88, 34)
def lin(S, a, b):   # diagonal gradient top-left a -> bottom-right b
    t = (np.add.outer(np.arange(S), np.arange(S)) / (2 * S - 2))[..., None]
    return Image.fromarray((np.array(a) * (1 - t) + np.array(b) * t).astype(np.uint8), "RGB")

def gem(size, col, style, k=16):
    S = size * k; c = 0.32 * S; px = k   # 1 game pixel = k
    col = hx(col); im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    im.paste(INK + (255,), (0, 0), mask(S, hexp(S, c, 0)))   # 1 px dark outline all round
    d0 = 1 * px
    if "bezel" in style:   # thin gold setting, 1.5 px
        im.paste(lin(S, GOLD_A, GOLD_B), (0, 0), mask(S, hexp(S, c, d0)))
        d0 += 1.5 * px
        im.paste(INK + (255,), (0, 0), mask(S, hexp(S, c, d0))); d0 += 0.5 * px
    O = hexp(S, c, d0)
    if style.startswith("facet"):
        bev = (0.26 if "deep" not in style else 0.20) * S
        I = hexp(S, c, d0 + bev)
        light = [0.80, 0.30, 0.12, 0.20, 0.62, 0.98]   # edges: top, right, BR cut, bottom, left, TL cut (light from top-left)
        dr = ImageDraw.Draw(im)
        for i in range(6):
            j = (i + 1) % 6
            dr.polygon([O[i], O[j], I[j], I[i]], fill=tuple(int(v) for v in shade(col, light[i])) + (255,))
        im.paste(lin(S, shade(col, 0.62), shade(col, 0.40)), (0, 0), mask(S, I))   # table
        dr.polygon([I[0], I[1], I[4], I[5]], fill=tuple(int(v) for v in shade(col, 0.70)) + (255,))   # table split on the TR-BL diagonal: lit half
        dr.polygon([I[1], I[2], I[3], I[4]], fill=tuple(int(v) for v in shade(col, 0.42)) + (255,))   # shadow half
        # sparkle on the table, top-left
        sx, sy = I[5][0] + 0.10 * S, I[0][1] + 0.10 * S; r = 0.11 * S; w = 0.035 * S
        sp = Image.new("L", (S, S), 0); sd = ImageDraw.Draw(sp)
        sd.polygon([(sx, sy - r), (sx + w, sy), (sx, sy + r), (sx - w, sy)], fill=255)
        sd.polygon([(sx - r, sy), (sx, sy - w), (sx + r, sy), (sx, sy + w)], fill=255)
        im.paste((255, 255, 255, 255), (0, 0), sp)
    else:   # glossy cabochon: lit top-left, deep bottom-right, darker rim, soft highlight + small bounce light
        g = np.zeros((S, S, 3)); yy, xx = np.mgrid[0:S, 0:S] / (S - 1)
        t = np.clip((xx * 0.45 + yy * 0.55), 0, 1)
        base = np.array(shade(col, 0.66)) * (1 - t)[..., None] + np.array(shade(col, 0.22)) * t[..., None]
        m = np.array(mask(S, O)) / 255.0
        rim = np.array(mask(S, O).filter(ImageFilter.GaussianBlur(1.6 * px))) / 255.0   # 1 near centre, falls at the edge
        b = base * (0.55 + 0.45 * rim[..., None])
        im2 = Image.fromarray(np.clip(b, 0, 255).astype(np.uint8), "RGB")
        im.paste(im2, (0, 0), mask(S, O))
        hl = Image.new("L", (S, S), 0); hd = ImageDraw.Draw(hl)
        hd.ellipse((0.26 * S, 0.19 * S, 0.52 * S, 0.34 * S), fill=220)
        hl = hl.rotate(28, center=(0.43 * S, 0.285 * S)).filter(ImageFilter.GaussianBlur(0.9 * px))
        bo = Image.new("L", (S, S), 0); ImageDraw.Draw(bo).ellipse((0.50 * S, 0.66 * S, 0.80 * S, 0.80 * S), fill=90)
        bo = bo.rotate(28, center=(0.65 * S, 0.73 * S)).filter(ImageFilter.GaussianBlur(0.9 * px))
        inside = mask(S, hexp(S, c, d0 + 0.5 * px))
        from PIL import ImageChops
        im.paste((255, 255, 255, 255), (0, 0), ImageChops.multiply(hl, inside))
        im.paste(tuple(int(v) for v in shade(col, 0.85)) + (255,), (0, 0), ImageChops.multiply(bo, inside))
    out = im.resize((size, size), Image.LANCZOS)
    if "pixel" in style:   # crisp: hard alpha, 6-ish colours
        a = out.getchannel("A").point(lambda v: 255 if v > 110 else 0)
        out = out.convert("RGB").quantize(8, method=Image.Quantize.MEDIANCUT).convert("RGBA"); out.putalpha(a)
    return out

VAR = [("F1", "facet", "เจียระไน"), ("F2", "facet-bezel", "เจียระไน + ขอบทอง"), ("F3", "facet-pixel", "เจียระไน แบบพิกเซลคม"),
       ("G1", "gloss", "ผิวมนเงา"), ("G2", "gloss-bezel", "ผิวมนเงา + ขอบทอง")]
shot = Image.open(SHOT).convert("RGB")
crop_box = (90, 236, 530, 288)
def ingame(style, size=24):
    im = shot.copy(); px = im.load()
    for x0, x1 in DOTS:   # erase the dot: copy the tag background column just left of the dot, row by row
        for y in range(CY - 13, CY + 14):
            ref = px[x0 - 2, y]
            for x in range(x0 - 1, x1 + 2): px[x, y] = ref
    for (x0, x1), colr in zip(DOTS, RAR):
        g = gem(size, colr, style); cx = (x0 + x1) // 2
        im.paste(g, (cx - size // 2, CY - size // 2), g)
    return im.crop(crop_box)

lab = ImageFont.truetype(F, 26); small = ImageFont.truetype(F, 20)
BIG = 96; Z = 2
cw = (crop_box[2] - crop_box[0]) * Z; ch = (crop_box[3] - crop_box[1]) * Z
rowh = max(BIG, ch) + 56
W = 40 + 5 * (BIG + 14) + 30 + cw + 20
out = Image.new("RGB", (W, 70 + rowh * (len(VAR) + 1)), (24, 28, 36)); d = ImageDraw.Draw(out)
d.text((20, 18), "อัญมณีหน้า %  ·  ซ้าย = ขยายดูทรง  ·  ขวา = ขนาดจริงในเกม (PC 1920) ขยาย ×2", font=lab, fill=(230, 220, 160))
y = 70
d.text((20, y + 6), "เดิม: วงกลม", font=small, fill=(200, 200, 200))
out.paste(shot.crop(crop_box).resize((cw, ch), Image.LANCZOS), (40 + 5 * (BIG + 14) + 30, y + 36))
y += rowh
for key, style, name in VAR:
    d.text((20, y + 6), "%s  %s" % (key, name), font=small, fill=(230, 220, 160))
    for i, colr in enumerate(RAR):
        g = gem(BIG, colr, style.replace("-pixel", "")) if "pixel" not in style else gem(24, colr, style).resize((BIG, BIG), Image.NEAREST)
        out.paste(g, (40 + i * (BIG + 14), y + 36), g)
    out.paste(ingame(style).resize((cw, ch), Image.LANCZOS), (40 + 5 * (BIG + 14) + 30, y + 36 + (BIG - ch) // 2))
    y += rowh
out.save("S307h-gems.png"); print(out.size)
