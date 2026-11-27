# set 307 p: pill variant sheet (every kind shown, S303PILLDEMO=1): target / o (too dark) / p1..p4. Usage: python S307p-compare.py
from PIL import Image, ImageDraw, ImageFont
F = r"D:\GitHub\automon-scratch\g286\data\fonts\IBMPlexSansThai-SemiBold.ttf"; lab = ImageFont.truetype(F, 26)
O = r"D:\GitHub\automon-scratch\out\s302_%s\8_prepH_hybrid.png"
T = Image.open(r"D:\GitHub\automon-arena\claude\preview-set301\S301-owner-target.webp").convert("RGB").crop((360, 100, 900, 240))
pc = lambda tag: Image.open(O % tag).convert("RGB").crop((580, 40, 1340, 240))
rows = [(T, "เป้าหมาย"), (pc("S307odemo"), "o (มืดไป)"), (pc("S307p1"), "p1 สีเดิม (มีเงา + ห่างกรอบ)"),
        (pc("S307p2"), "p2 สีเดิม + ไล่แสงบนสว่าง-ล่างมืดเบา ๆ"), (pc("S307p3"), "p3 มืดลงครึ่งหนึ่งของ o + ไล่แสง"),
        (pc("S307p4"), "p4 สีหม่นลงนิด (แบบรูปเป้าหมาย) + ไล่แสง")]
w = 1140; hs = [int(im.height * w / im.width) for im, _ in rows]
out = Image.new("RGB", (w + 40, sum(hs) + 60 * len(rows) + 20), (24, 28, 36)); d = ImageDraw.Draw(out); y = 10
for (im, t), h in zip(rows, hs):
    d.text((20, y), t, font=lab, fill=(230, 220, 160)); out.paste(im.resize((w, h), Image.LANCZOS), (20, y + 44)); y += h + 60
out.save("S307p-pill-variants.png"); print(out.size)
