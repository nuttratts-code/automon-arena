#!/usr/bin/env python3
# set 295 round 35t: wireframe mockups of 6 bottom-reading-area layouts (cards removed), drawn over a real battle shot
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
src, out = sys.argv[1], sys.argv[2]
base0 = Image.open(src).convert("RGB")
W, H = base0.size
# hide the old cards + old buttons (wireframe only): blur the foe card zone, bottom card row and button corner
for box in [(790, 10, 1900, 170), (20, 940, 1130, 1050), (1570, 900, 1900, 1050), (20, 80, 230, 165)]:
    reg = base0.crop(box).filter(ImageFilter.GaussianBlur(28))
    base0.paste(reg, box)
F = lambda s: ImageFont.truetype("C:/Windows/Fonts/tahomabd.ttf", s)
INK = (22, 32, 42)
BLUE, RED = (79, 127, 196), (192, 86, 79)
TAG = [(200, 56, 79), (229, 138, 31), (216, 184, 28), (79, 134, 176), (63, 158, 88)]

def plate(d, r, a=180, line=None):
    d.rectangle(r, fill=INK + (a,))
    if line: d.rectangle((r[0], r[1], r[2], r[1] + 2), fill=line + (255,))

def top(d):
    plate(d, (36, 22, 210, 82)); d.text((60, 32), "3.8 วิ", font=F(30), fill=(235, 240, 245))
    for i, s in enumerate(["II", ">>"]):
        x = 1720 + i * 92
        plate(d, (x, 22, x + 80, 82)); d.text((x + 24, 34), s, font=F(30), fill=(235, 240, 245))

def slot(d, x, y, w, h, side, k, compact=False):
    plate(d, (x, y, x + w, y + h), 175, BLUE if side == 0 else RED)
    cx, cy = x + 30, y + h // 2
    d.polygon([(cx, cy - 20), (cx + 20, cy), (cx, cy + 20), (cx - 20, cy)], fill=(70, 80, 95, 255), outline=(BLUE if side == 0 else RED) + (255,))
    nums = [("12", TAG[3]), ("4", TAG[1]), ("3", TAG[2])][: 1 + (k % 3)]
    tx = x + 60
    for t, c in nums:
        d.rectangle((tx, y + 10, tx + 34, y + 30), fill=c + (235,)); d.text((tx + 6, y + 10), t, font=F(16), fill=(255, 255, 255)); tx += 38
    if not compact:
        for j in range(k % 4):
            c = BLUE if j % 2 == 0 else RED
            d.rectangle((x + 60 + j * 26, y + 36, x + 82 + j * 26, y + 58), fill=c + (255,))

def panel(d, r, side=0):
    plate(d, r, 205, BLUE if side == 0 else RED)
    x0, y0 = r[0] + 18, r[1] + 14
    d.text((x0, y0), "ชื่อตัวละคร · เลเวล 2", font=F(22), fill=(240, 240, 240))
    d.rectangle((x0, y0 + 40, x0 + 230, y0 + 48), fill=(94, 154, 69, 255))
    d.text((x0, y0 + 56), "ตีทุก 6.0 วิ", font=F(18), fill=(200, 210, 220))
    cw = (r[2] - r[0] - 300) // 2
    d.text((x0 + 280, y0), "ค่าประจำตัว (6 แถว)", font=F(18), fill=(160, 175, 190))
    d.text((x0 + 280 + cw, y0), "สถานะตอนนี้ (คำ)", font=F(18), fill=(160, 175, 190))
    for i in range(3):
        d.rectangle((x0 + 280, y0 + 34 + i * 26, x0 + 280 + cw - 30, y0 + 50 + i * 26), fill=(60, 72, 86, 255))
        d.rectangle((x0 + 280 + cw, y0 + 34 + i * 26, x0 + 260 + 2 * cw, y0 + 50 + i * 26), fill=(60, 72, 86, 255))

def L1(d):   # Claude A1: one strip, 12 slots, panel above
    w = 148
    for i in range(12):
        side = 0 if i < 6 else 1
        x = 20 + i * (w + 6) + (24 if side else 0)
        slot(d, x, 975, w, 66, side, i)
    panel(d, (300, 800, 1620, 960), 0)

def L2(d):   # Claude A2: panel only at the bottom, statuses on the units
    panel(d, (300, 900, 1620, 1050), 1)
    for (x, y) in [(265, 640), (480, 640), (690, 640), (190, 832), (470, 832), (750, 832), (1230, 640), (1440, 640), (1655, 640), (1170, 832), (1450, 832), (1730, 832)]:
        d.rectangle((x - 30, y - 50, x - 8, y - 30), fill=TAG[1] + (235,)); d.rectangle((x - 4, y - 50, x + 18, y - 30), fill=BLUE + (255,))

def L3(d):   # Claude A3: panel replaces the strip while open
    panel(d, (20, 900, 1900, 1050), 0)
    d.text((1500, 1012), "แตะซ้ำ = กลับเป็น 12 ช่อง", font=F(18), fill=(200, 210, 220))

def L4(d):   # Gemini 1: two 2x3 mini boards + centre console always on
    w, h = 150, 58
    for side in (0, 1):
        for i in range(6):
            x = (20 if side == 0 else 1430) + (i % 3) * (w + 6)
            y = 920 + (i // 3) * (h + 6)
            slot(d, x, y, w, h, side, i, compact=True)
    panel(d, (500, 920, 1420, 1046), 0)

def L5(d):   # Gemini 2: two full-width ribbons (foe over own), corner flyout
    w = 300
    for row, side in ((0, 1), (1, 0)):
        for i in range(6):
            slot(d, 20 + i * (w + 16), 905 + row * 74, w, 66, side, i)
    panel(d, (20, 740, 1100, 895), 0)

def L6(d):   # Gemini 4: two corner docks, centre open, panel above the dock
    w, h = 100, 64
    for side in (0, 1):
        for i in range(6):
            x = (20 if side == 0 else 1260) + i * (w + 6)
            slot(d, x, 975, w, h, side, i, compact=True)
    panel(d, (20, 800, 1000, 960), 0)

labels = [("1 (Claude A1) แถบล่าง 12 ช่อง + รายละเอียดเปิดเหนือแถบ", L1),
          ("2 (Claude A2) ล่าง = รายละเอียดเมื่อแตะ · สถานะไปอยู่บนตัว", L2),
          ("3 (Claude A3) รายละเอียดขึ้นแทนแถบ 12 ช่องชั่วคราว", L3),
          ("4 (Gemini) กระดานจิ๋ว 2×3 สองมุม + กลาง = รายละเอียดตลอด", L4),
          ("5 (Gemini) 2 แถวเต็มจอ (ศัตรูบน · เราล่าง) + รายละเอียดมุม", L5),
          ("6 (Gemini) 2 มุมล่าง กลางโล่ง + รายละเอียดเหนือมุม", L6)]
tw, th = W // 2, H // 2
sheet = Image.new("RGB", (tw * 2, (th + 50) * 3), (18, 22, 28))
sd = ImageDraw.Draw(sheet)
for n, (lab, fn) in enumerate(labels):
    im = base0.copy().convert("RGBA")
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    top(d); fn(d)
    im = Image.alpha_composite(im, ov).convert("RGB")
    im.save(out.replace(".png", f"-{n + 1}.png"))
    x, y = (n % 2) * tw, (n // 2) * (th + 50)
    sheet.paste(im.resize((tw, th)), (x, y + 50))
    sd.text((x + 12, y + 10), lab, font=F(26), fill=(240, 240, 240))
sheet.save(out)
print(out, sheet.size)
