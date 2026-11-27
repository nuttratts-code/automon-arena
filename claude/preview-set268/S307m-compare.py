# set 307 m: compare sheets before (l) / now (m). PC crop of the button column + odds tag (x1.5), phone top strip.
# Usage: python S307m-compare.py
from PIL import Image, ImageDraw, ImageFont
F = r"D:\GitHub\automon-scratch\g286\data\fonts\IBMPlexSansThai-SemiBold.ttf"; lab = ImageFont.truetype(F, 26)
O = r"D:\GitHub\automon-scratch\out\s302_%s\8_prepH_hybrid.png"
def sheet(rows, name, w):
    hs = [int(im.height * w / im.width) for im, _ in rows]
    out = Image.new("RGB", (w + 40, sum(hs) + 60 * len(rows) + 20), (24, 28, 36)); d = ImageDraw.Draw(out); y = 10
    for (im, t), h in zip(rows, hs):
        d.text((20, y), t, font=lab, fill=(230, 220, 160)); out.paste(im.resize((w, h), Image.LANCZOS), (20, y + 44)); y += h + 60
    out.save(name); print(name, out.size)
pc = lambda tag: Image.open(O % tag).convert("RGB").crop((60, 20, 900, 280))
sheet([(pc("S307l"), "ก่อน (l)"), (pc("S307m"), "ตอนนี้ m: ไม่มีเส้นขาวใต้ล็อก · สุ่มใหม่ + เหรียญบรรทัดเดียว · เส้นหลัง Lv หนาเท่าเส้นคั่นร้าน")], "S307m-btn-compare.png", 1260)
ph = lambda tag: Image.open(O % tag).convert("RGB").crop((0, 0, 1688, 230))
sheet([(ph("S307lphone"), "มือถือ ก่อน (l)"), (ph("S307mphone"), "มือถือ ตอนนี้ (m)")], "S307m-btn-phone-demo.png", 1688)
