# set 307 w: card frame thickness levels: now (v) / 0.8 / 0.65 / 0.5 — PC shop row, phone row, x3 close-up. Usage: python S307w-compare.py
from PIL import Image, ImageDraw, ImageFont
F = r"D:\GitHub\automon-scratch\g286\data\fonts\IBMPlexSansThai-SemiBold.ttf"; lab = ImageFont.truetype(F, 26)
O = r"D:\GitHub\automon-scratch\out\s302_%s\8_prepH_hybrid.png"
cut = lambda tag, box: Image.open(O % tag).convert("RGB").crop(box)
PC, PH, ZM = (580, 40, 1340, 240), (560, 20, 1500, 180), (1085, 40, 1300, 240)
LV = [("s307v_pc", "s307v_ph", "ตอนนี้ (หนาเดิม)"), ("s307w_0.8", "s307w_ph_0.8", "W1 บางลง 20%"),
      ("s307w_0.65", "s307w_ph_0.65", "W2 บางลง 35%"), ("s307w_0.5", "s307w_ph_0.5", "W3 บางลง 50%")]
w = 1140; blocks = []
for pc, ph, t in LV:
    z = cut(pc, ZM); z = z.resize((z.width * 3, z.height * 3), Image.NEAREST)
    blocks.append((t, [cut(pc, PC), cut(ph, PH), z]))
def fit(im, ww): return im.resize((ww, int(im.height * ww / im.width)), Image.LANCZOS if im.width > ww else Image.NEAREST)
H = 0
for t, ims in blocks: H += 44 + fit(ims[0], w).height + 8 + fit(ims[1], w).height + 8 + ims[2].height + 30
out = Image.new("RGB", (w + 40, H + 10), (24, 28, 36)); d = ImageDraw.Draw(out); y = 10
for t, ims in blocks:
    d.text((20, y), t + "   (PC · มือถือ · ซูม x3)", font=lab, fill=(230, 220, 160)); y += 44
    for im in (fit(ims[0], w), fit(ims[1], w), ims[2]): out.paste(im, (20, y)); y += im.height + 8
    y += 22
out.save("S307w-frame-thin.png"); print(out.size)
