# set 307 x: tribe badge height levels: now (w2) / X1 +1 / X2 +2 / X3 +3 units — x4 card tops, PC row, phone row. Usage: python S307x-compare.py
from PIL import Image, ImageDraw, ImageFont
F = r"D:\GitHub\automon-scratch\g286\data\fonts\IBMPlexSansThai-SemiBold.ttf"; lab = ImageFont.truetype(F, 26)
O = r"D:\GitHub\automon-scratch\out\s302_%s\8_prepH_hybrid.png"
cut = lambda tag, box: Image.open(O % tag).convert("RGB").crop(box)
def tops(tag):
    ims = [cut(tag, (x, 38, x + 110, 100)) for x in (585, 835, 1085)]
    o = Image.new("RGB", (3 * 110 + 8, 62), (24, 28, 36)); [o.paste(im, (i * 114, 0)) for i, im in enumerate(ims)]
    return o.resize((o.width * 4 // 1, o.height * 4), Image.NEAREST)
def fit(im, ww): return im.resize((ww, int(im.height * ww / im.width)), Image.LANCZOS if im.width > ww else Image.NEAREST)
w = 1272
LV = [("s307w2_pc", "s307w2_ph", "ตอนนี้ (กลางแถบชื่อ)"), ("s307x_1", "s307x_ph_1", "X1 ขึ้น 1 หน่วย"),
      ("s307x_2", "s307x_ph_2", "X2 ขึ้น 2 หน่วย"), ("s307x_3", "s307x_ph_3", "X3 ขึ้น 3 หน่วย")]
blocks = []
for pc, ph, t in LV: blocks.append((t, [fit(tops(pc), w), fit(cut(pc, (580, 40, 1340, 240)), w), fit(cut(ph, (560, 20, 1500, 180)), w)]))
H = sum(44 + sum(im.height + 8 for im in ims) + 22 for _, ims in blocks)
out = Image.new("RGB", (w + 40, H + 10), (24, 28, 36)); d = ImageDraw.Draw(out); y = 10
for t, ims in blocks:
    d.text((20, y), t + "   (ซูม x4 หัวการ์ด · PC · มือถือ)", font=lab, fill=(230, 220, 160)); y += 44
    for im in ims: out.paste(im, (20, y)); y += im.height + 8
    y += 22
out.save("S307x-badge-up.png"); print(out.size)
