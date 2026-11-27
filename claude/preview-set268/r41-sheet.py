# set 299 r41: one 2x2 sheet per layout variant (palettes P0-P3), prep shot 8_prepH_hybrid
import sys
from PIL import Image, ImageDraw, ImageFont
OUT = sys.argv[1]
SP = "D:/GitHub/automon-scratch/out"
font = ImageFont.truetype("C:/Windows/Fonts/tahoma.ttf", 30)
pals = ["P0 เทาเย็น (เดิม)", "P1 น้ำตาลอุ่น", "P2 เขียวมอส", "P3 ม่วงหม่น"]
vars_ = {1: "V1 กรอบเงียบ", 2: "V2 มือเดียวพิกเซล", 3: "V3 แผ่นบางสีเย็น", 4: "V4 แถบร้านไม่มีการ์ด"}
for v, vn in vars_.items():
    W, H, pad, lab = 960, 530, 10, 44
    sheet = Image.new("RGB", (pad + 2 * (W + pad), lab + pad + 2 * (H + lab + pad)), (20, 18, 16))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 4), vn + " · เงาใหม่ B1 ทุกภาพ", font=font, fill=(255, 240, 200))
    for i, pn in enumerate(pals):
        im = Image.open(f"{SP}/s299x_v{v}p{i}/8_prepH_hybrid.png").convert("RGB").resize((W, H), Image.LANCZOS)
        x = pad + (i % 2) * (W + pad)
        y = lab + pad + (i // 2) * (H + lab + pad)
        d.text((x, y), pn, font=font, fill=(255, 240, 200))
        sheet.paste(im, (x, y + lab))
    sheet.save(f"{OUT}/S299r41-V{v}.png")
print("sheets ok")
