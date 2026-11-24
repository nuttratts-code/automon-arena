#!/usr/bin/env python3
# set 295: build a comparison sheet of the on-unit tag variants (crop of the own-unit area, 2x zoom)
import sys, pathlib
from PIL import Image, ImageDraw, ImageFont
root = pathlib.Path(sys.argv[1])          # automon-scratch/out
dst = pathlib.Path(sys.argv[2])
box = tuple(int(x) for x in sys.argv[3].split(","))   # crop box x0,y0,x1,y1 in shot pixels
labels = {"a": "A ตอนนี้ (35s8c)", "b": "B สีใหม่ + ขอบขาว", "c": "C สีใหม่ ไม่มีขอบ", "d": "D สีใหม่ + ขอบเข้ม",
          "e": "E สีใหม่ + ขอบสีอ่อนโทนเดียว", "f": "F สีหม่น + เงาล่าง", "g": "G พื้นเทาเข้ม ตัวเลขสี", "h": "H พื้นเทาเข้ม + แถบสีซ้าย"}
tiles = []
for k in labels:
    im = Image.open(root / f"s286r35_s295_{k}" / "1_battle.png").convert("RGB").crop(box)
    tiles.append((k, im))
w, h = tiles[0][1].size
try:
    font = ImageFont.truetype("C:/Windows/Fonts/tahomabd.ttf", 28)
except OSError:
    font = ImageFont.load_default()
cols = 2
rows = (len(tiles) + 1) // cols
pad = 44
sheet = Image.new("RGB", (cols * w, rows * (h + pad)), (20, 24, 30))
d = ImageDraw.Draw(sheet)
for i, (k, im) in enumerate(tiles):
    x, y = (i % cols) * w, (i // cols) * (h + pad)
    sheet.paste(im, (x, y + pad))
    d.text((x + 10, y + 6), labels[k], fill=(240, 240, 240), font=font)
sheet.save(dst)
print(dst, sheet.size)
