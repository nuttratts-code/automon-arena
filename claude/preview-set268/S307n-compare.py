# set 307 n: pill colour compare. PC: target crop / before (m) / now (n) / now with every pill kind (S303PILLDEMO=1).
# Phone: before / now. Usage: python S307n-compare.py
from PIL import Image, ImageDraw, ImageFont
F = r"D:\GitHub\automon-scratch\g286\data\fonts\IBMPlexSansThai-SemiBold.ttf"; lab = ImageFont.truetype(F, 26)
O = r"D:\GitHub\automon-scratch\out\s302_%s\8_prepH_hybrid.png"
T = Image.open(r"D:\GitHub\automon-arena\claude\preview-set301\S301-owner-target.webp").convert("RGB").crop((360, 100, 900, 240))
def sheet(rows, name, w):
    hs = [int(im.height * w / im.width) for im, _ in rows]
    out = Image.new("RGB", (w + 40, sum(hs) + 60 * len(rows) + 20), (24, 28, 36)); d = ImageDraw.Draw(out); y = 10
    for (im, t), h in zip(rows, hs):
        d.text((20, y), t, font=lab, fill=(230, 220, 160)); out.paste(im.resize((w, h), Image.LANCZOS), (20, y + 44)); y += h + 60
    out.save(name); print(name, out.size)
pc = lambda tag: Image.open(O % tag).convert("RGB").crop((580, 40, 1900, 240))
sheet([(T, "เป้าหมาย (รูปของคุณ)"), (pc("S307m"), "ก่อน (m)"), (pc("S307n"), "ตอนนี้ n: สีสดขึ้น ×1.3 ความสว่างเท่าเดิม ลายเดิม"),
       (pc("S307ndemo"), "ตอนนี้ n: ป้ายครบ 7 แบบ (ร้านตัวอย่าง)")], "S307n-pill-compare.png", 1320)
ph = lambda tag: Image.open(O % tag).convert("RGB").crop((560, 60, 1520, 230))
sheet([(ph("S307mphone"), "มือถือ ก่อน (m)"), (ph("S307nphone"), "มือถือ ตอนนี้ (n)")], "S307n-pill-phone-demo.png", 1320)
