# set 299 r35w10: sheet of chip mark styles (crop of the own bottom cards, x3 nearest)
import sys
from PIL import Image, ImageDraw, ImageFont
out, base = sys.argv[1], sys.argv[2]
names = {"0": "เดิม (+/−)", "1": "M1 มุมพับ", "2": "M2 ลูกศรเล็ก", "3": "M3 แถบขอบ", "4": "M4 สามเหลี่ยมทึบ",
         "5": "M5 มุมตัดสว่าง", "6": "M6 จุดที่มุม", "7": "M7 แถบข้างขวา"}
box = (140, 925, 550, 1045); S = 3
w, h = (box[2]-box[0])*S, (box[3]-box[1])*S
try: font = ImageFont.truetype("C:/Windows/Fonts/tahomabd.ttf", 30)
except Exception: font = ImageFont.load_default()
sheet = Image.new("RGB", (2*w + 30, 4*(h + 46) + 10), (24, 28, 34))
d = ImageDraw.Draw(sheet)
for i, m in enumerate("01234567"):
    im = Image.open(f"{base}/s299w_w10_{m}/1_battle.png").convert("RGB").crop(box).resize((w, h), Image.NEAREST)
    x = 10 + (i % 2) * (w + 10); y = 10 + (i // 2) * (h + 46)
    d.text((x, y), names[m], fill=(235, 235, 235), font=font)
    sheet.paste(im, (x, y + 40))
sheet.save(out)
print(sheet.size)
