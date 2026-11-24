#!/usr/bin/env python3
# set 295 round 35t2: layout 4 at true scale (854x390 base -> 1920x1061, s = 2.25): two 2x3 mini boards + centre console
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
for box in [(790, 10, 1900, 170), (20, 940, 1130, 1050), (1570, 900, 1900, 1050), (20, 80, 230, 165)]:
    im.paste(im.crop(box).filter(ImageFilter.GaussianBlur(28)), box)
s = 2.25
S = lambda v: int(round(v * s))
F = lambda p: ImageFont.truetype("C:/Windows/Fonts/tahomabd.ttf", S(p))
FR = lambda p: ImageFont.truetype("C:/Windows/Fonts/tahoma.ttf", S(p))
INK = (22, 32, 42)
BLUE, RED, TEAL = (79, 127, 196), (192, 86, 79), (29, 96, 121)
ARM, BURN, SHOCK = (79, 134, 176), (229, 138, 31), (216, 184, 28)
WHITE = (240, 244, 248)
ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
def plate(r, col=INK, a=178): d.rectangle([S(r[0]), S(r[1]), S(r[0] + r[2]), S(r[1] + r[3])], fill=col + (a,))
def tag(x, y, t, col):   # E-style colour tag, white number
    w = d.textlength(t, font=F(7)) / s + 5
    d.rectangle([S(x), S(y), S(x + w), S(y + 10)], fill=col + (235,), outline=tuple(min(255, c + 70) for c in col) + (255,))
    d.text((S(x + 2.5), S(y + 0.5)), t, font=F(7), fill=WHITE)
    return w
# --- top: clock left, pause / ff right (same flat plate, 28 base tall)
plate((16, 10, 60, 26)); d.text((S(24), S(13)), "3.8 วิ", font=F(12), fill=WHITE)
for i, t in enumerate(["II", "▶▶"]):
    x = 854 - 16 - 32 - i * 36
    plate((x, 10, 32, 26), TEAL if i == 1 else INK); d.text((S(x + 8), S(15)), [">>", "II"][i], font=F(11), fill=WHITE)
# --- bottom: two 2x3 boards + console
SW, SH, G = 76, 26, 3
BY = im.size[1] / s - 8 - 2 * SH - G   # anchor to the real screen bottom (PC shot is taller than 854x390)
own = [(16 + c * (SW + G), BY + r * (SH + G)) for r in range(2) for c in range(3)]
foe = [(854 - 16 - (3 - c) * (SW + G) + G, BY + r * (SH + G)) for r in range(2) for c in range(3)]
units = [  # icon colour, armour, burn, shock, chips (b = buff, d = debuff)
    [(200, 80, 50), 0, 0, 0, "b"], [(120, 180, 230), 0, 0, 0, ""], [(60, 70, 160), 20, 0, 0, "bb"],
    [(220, 220, 240), 0, 4, 0, "bd"], [(110, 50, 120), 0, 0, 12, "bbddddbb"], [(200, 160, 40), 24, 0, 0, ""],
    [(220, 120, 200), 0, 0, 0, "d"], [(90, 90, 90), 20, 6, 0, "b"], [(150, 150, 160), 12, 0, 0, ""],
    [(40, 50, 140), 0, 0, 0, "bd"], [(200, 170, 120), 10, 0, 0, "b"], [(40, 40, 90), 0, 0, 3, ""]]
pick = 4
for i, (x, y) in enumerate(own + foe):
    side = 0 if i < 6 else 1
    ic, arm, bu, sh, ch = units[i]
    on = i == pick
    plate((x, y, SW, SH), TEAL if on else INK)
    d.rectangle([S(x), S(y), S(x + SW), S(y) + 1], fill=(BLUE if side == 0 else RED) + (255,))
    if on: d.rectangle([S(x), S(y), S(x + SW), S(y + SH)], outline=(255, 255, 255, 240), width=2)
    cx, cy = x + 11, y + SH / 2
    d.polygon([(S(cx), S(cy - 9)), (S(cx + 9), S(cy)), (S(cx), S(cy + 9)), (S(cx - 9), S(cy))], fill=ic + (255,), outline=(BLUE if side == 0 else RED) + (255,))
    # mini HP bar under the icon row (so the slot also shows who is hurt)
    # r35t3 (owner): no mini HP bar — row 2 = buff / debuff chips
    tx = x + 23
    for v, col in ((arm, ARM), (bu, BURN), (sh, SHOCK)):
        if v: tx += tag(tx, y + 3, str(v), col) + 2
    chips = [c for c in ch if c in "bd"]
    cx2, cy2 = x + 23, y + 14
    for k2, c in enumerate(chips):
        if cx2 + 9 + (12 if k2 < len(chips) - 1 else 0) > x + SW - 3:   # keep room for "+N"
            d.rectangle([S(cx2), S(cy2), S(cx2 + 11), S(cy2 + 10)], fill=(60, 72, 86, 255), outline=(220, 228, 236, 255))
            d.text((S(cx2 + 1.5), S(cy2 + 0.5)), f"+{len(chips) - k2}", font=F(7), fill=WHITE); break
        d.rectangle([S(cx2), S(cy2), S(cx2 + 9), S(cy2 + 10)], fill=(BLUE if c == "b" else RED) + (255,))
        cx2 += 11
# console between the boards
CX = 16 + 3 * (SW + G) + 2
CW = 854 - 2 * CX
CY, CH = BY, 2 * SH + G
plate((CX, CY, CW, CH), INK, 200)
d.rectangle([S(CX), S(CY), S(CX + CW), S(CY) + 1], fill=BLUE + (255,))
x0 = CX + 6
d.text((S(x0), S(CY + 3)), "แมงมุมเขา · เลเวล 2", font=F(8), fill=WHITE)
d.rectangle([S(x0), S(CY + 16), S(x0 + 78), S(CY + 19)], fill=(30, 28, 24, 230)); d.rectangle([S(x0), S(CY + 16), S(x0 + 60), S(CY + 19)], fill=(94, 154, 69, 255))
d.text((S(x0), S(CY + 21)), "HP 230/300", font=FR(7), fill=(205, 214, 222))
d.text((S(x0), S(CY + 31)), "ตีทุก 6.0 วิ · อีก 2.2", font=FR(7), fill=(205, 214, 222))
d.rectangle([S(x0), S(CY + 43), S(x0 + 78), S(CY + 45)], fill=(30, 28, 24, 230)); d.rectangle([S(x0), S(CY + 43), S(x0 + 50), S(CY + 45)], fill=BLUE + (255,))
vx = x0 + 88
vals = [("ตี", "30", (200, 56, 79)), ("ครั้ง", "–", (138, 99, 210)), ("ไฟ/ตี", "–", BURN), ("ฟ้า/ตี", "12", SHOCK), ("เกราะ/ตี", "–", ARM), ("ฮีล/ตี", "–", (63, 158, 88))]
for k, (nm, v, col) in enumerate(vals):
    gx, gy = vx + (k % 2) * 46, CY + 4 + (k // 2) * 16
    d.rectangle([S(gx), S(gy + 2), S(gx + 3), S(gy + 9)], fill=col + (255,))
    d.text((S(gx + 5), S(gy)), nm, font=FR(7), fill=(190, 200, 210))
    d.text((S(gx + 33), S(gy)), v, font=F(7), fill=WHITE)
sx = vx + 98
sts = [("b", "ฟ้าแรงขึ้น 30%"), ("b", "ตีแรงขึ้น 20%"), ("d", "โดนไฟแรง 25% (4 วิ)"), ("d", "คูลดาวน์ช้า 10%"), ("d", "เกราะได้ −30%")]
for k, (c, t) in enumerate(sts[:6]):
    gx, gy = sx + (k // 3) * 66, CY + 4 + (k % 3) * 16
    d.rectangle([S(gx), S(gy + 1), S(gx + 8), S(gy + 9)], fill=(BLUE if c == "b" else RED) + (255,))
    d.text((S(gx + 11), S(gy)), t, font=FR(7), fill=(210, 218, 226))
im = Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")
im.save(out)
print(out, "board slot", SW, "x", SH, "base =", S(SW), "x", S(SH), "px; console", CW, "x", CH, "base; bottom zone top y", BY, "base =", S(BY), "px")
