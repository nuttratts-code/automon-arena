# set 307 icons l (owner B1): GPT draws the gold padlock + glowing cyan reroll arrow as in the target picture.
# Sample sheet BEFORE the GPT call (memory show-sample-before-gpt): target icons · ours now · brief points.
# Also writes S307l-ref-lock.png / S307l-ref-reroll.png = the target crops x4 to attach to the GPT call.
from PIL import Image, ImageDraw, ImageFont
F = r"D:\GitHub\automon-scratch\g286\data\fonts\IBMPlexSansThai-SemiBold.ttf"
T = Image.open(r"D:\GitHub\automon-arena\claude\preview-set301\S301-owner-target.webp").convert("RGB")
N = Image.open(r"D:\GitHub\automon-scratch\out\s302_S307fit1\8_prepH_hybrid.png").convert("RGB")
crops = [(T.crop((308, 92, 366, 150)), "เป้าหมาย: กุญแจทอง"), (T.crop((305, 188, 369, 244)), "เป้าหมาย: ลูกศรฟ้าเรือง"),
         (N.crop((420, 62, 488, 120)), "ของเราตอนนี้: กุญแจ"), (N.crop((418, 150, 490, 214)), "ของเราตอนนี้: ลูกศร")]
crops[0][0].resize((232, 232), Image.LANCZOS).save("S307l-ref-lock.png")
crops[1][0].resize((256, 224), Image.LANCZOS).save("S307l-ref-reroll.png")
lab = ImageFont.truetype(F, 22); sm = ImageFont.truetype(F, 20)
W = 4 * 300 + 40; out = Image.new("RGB", (W, 760), (24, 28, 36)); d = ImageDraw.Draw(out)
for i, (im, t) in enumerate(crops):
    x = 20 + i * 300; d.text((x, 14), t, font=lab, fill=(230, 220, 160))
    s = 280 / max(im.size); out.paste(im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS), (x, 52))
brief = ["สิ่งที่จะสั่ง GPT (เรียก 1 ครั้ง ขอ 2 ภาพ: กุญแจ 1 · ลูกศร 1):",
         "• กุญแจล็อกทองแบบรูปเป้าหมาย: ตัวกุญแจทองเงา ห่วงโค้งด้านบน รูกุญแจเข้มตรงกลาง ขอบเข้มบาง",
         "• ลูกศรสุ่มใหม่: วงกลมเกือบครบ หัวลูกศรขวาบน สีฟ้าน้ำแข็งเรืองแสง (กลางขาว-ฟ้า ขอบฟ้าเข้ม)",
         "• มองตรง ภาพคม ไม่มีตัวหนังสือ ไม่มีกรอบ ไม่มีเงาตก · พื้นหลังชมพู #FF00FF (ไว้ตัดออก)",
         "• แสงเรืองรอบลูกศร: Claude ใส่เองหลังตัดพื้น (ถ้าให้ GPT วาดเรืองบนชมพู ขอบจะเลอะสีชมพู)",
         "• แนบรูป: ไอคอนเป้าหมาย 2 ชิ้น (ขยาย ×4) · เกมต้นฉบับของเราเอง ห้ามลอกเกมอื่น",
         "• ได้ภาพแล้ว: ตัดพื้น → ใส่ปุ่มล็อก/สุ่มใหม่ในเกมตัวอย่าง → ถ่าย PC + มือถือ + เทียบก่อน/หลัง"]
y = 52 + 290
for i, t in enumerate(brief):
    d.text((20, y), t, font=lab if i == 0 else sm, fill=(230, 220, 160) if i == 0 else (215, 215, 215)); y += 44 if i == 0 else 38
out = out.crop((0, 0, W, y + 20)); out.save("S307l-icon-sample.png"); print(out.size)
