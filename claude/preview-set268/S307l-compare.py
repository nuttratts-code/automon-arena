# set 307 l: compare sheets. PC: target / before (k3, S307btn3) / now (S307l), x2 crop of the button column + first card.
# Phone: before / now full width top strip. Usage: python S307l-compare.py
from PIL import Image, ImageDraw, ImageFont
F = r"D:\GitHub\automon-scratch\g286\data\fonts\IBMPlexSansThai-SemiBold.ttf"; lab = ImageFont.truetype(F, 26)
O = r"D:\GitHub\automon-scratch\out\s302_%s\8_prepH_hybrid.png"
T = Image.open(r"D:\GitHub\automon-arena\claude\preview-set301\S301-owner-target.webp").convert("RGB").crop((60, 60, 600, 300))
def sheet(rows, name, w):
    hs = [int(im.height * w / im.width) for im, _ in rows]
    out = Image.new("RGB", (w + 40, sum(hs) + 60 * len(rows) + 20), (24, 28, 36)); d = ImageDraw.Draw(out); y = 10
    for (im, t), h in zip(rows, hs):
        d.text((20, y), t, font=lab, fill=(230, 220, 160)); out.paste(im.resize((w, h), Image.LANCZOS), (20, y + 44)); y += h + 60
    out.save(name); print(name, out.size)
pc = lambda tag: Image.open(O % tag).convert("RGB").crop((60, 20, 900, 270))
sheet([(T, "เป้าหมาย (รูปของคุณ)"), (pc("S307btn3"), "ก่อน (k3)"), (pc("S307l"), "ตอนนี้ l: ปุ่มเท่าแถวการ์ด · ไอคอน GPT · เหรียญการ์ด")], "S307l-btn-compare.png", 1260)
ph = lambda tag: Image.open(O % tag).convert("RGB").crop((0, 0, 1688, 230))
sheet([(ph("S307btn3phone"), "มือถือ ก่อน (k3)"), (ph("S307lphone"), "มือถือ ตอนนี้ (l)")], "S307l-btn-phone-demo.png", 1688)
