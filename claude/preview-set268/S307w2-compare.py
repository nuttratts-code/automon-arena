# set 307 w2: W2 (0.65) before / after the edge fix: x3 close-ups (green + blue card), PC row, phone row. Usage: python S307w2-compare.py
from PIL import Image, ImageDraw, ImageFont
F = r"D:\GitHub\automon-scratch\g286\data\fonts\IBMPlexSansThai-SemiBold.ttf"; lab = ImageFont.truetype(F, 26)
O = r"D:\GitHub\automon-scratch\out\s302_%s\8_prepH_hybrid.png"
cut = lambda tag, box: Image.open(O % tag).convert("RGB").crop(box)
def z3(tag):
    a = cut(tag, (835, 38, 1060, 245)); b = cut(tag, (1085, 38, 1305, 245))
    o = Image.new("RGB", (a.width + b.width + 4, a.height), (24, 28, 36)); o.paste(a, (0, 0)); o.paste(b, (a.width + 4, 0))
    return o.resize((o.width * 3 // 1, o.height * 3 // 1), Image.NEAREST)
def fit(im, ww): return im.resize((ww, int(im.height * ww / im.width)), Image.LANCZOS if im.width > ww else Image.NEAREST)
w = 1340
rows = [(fit(z3("s307w_0.65"), w), "ก่อน — W2 มีเส้นดำด้านใน (ซ้าย ขวา ล่าง + มุมล่างขวาเป็นเส้นคู่) ซูม x3"),
        (fit(z3("s307w2_pc"), w), "หลัง — W2 เก็บขอบแล้ว ซูม x3"),
        (fit(cut("s307w2_pc", (580, 40, 1340, 240)), w), "หลัง — PC ร้านจริง"),
        (fit(cut("s307w2_ph", (560, 20, 1500, 180)), w), "หลัง — มือถือ")]
out = Image.new("RGB", (w + 40, sum(im.height + 56 for im, _ in rows) + 20), (24, 28, 36)); d = ImageDraw.Draw(out); y = 10
for im, t in rows:
    d.text((20, y), t, font=lab, fill=(230, 220, 160)); out.paste(im, (20, y + 40)); y += im.height + 56
out.save("S307w2-edge-fix.png"); print(out.size)
