# set 307 buttons k (owner A1 = shrink the painted shop plate into the lock / reroll buttons; B = "GPT paints the sheen").
# Sample sheet BEFORE the GPT call (memory show-sample-before-gpt): target crop · ours now · plate shrunk (no sheen) · brief points.
from PIL import Image, ImageDraw, ImageFont
F = r"D:\GitHub\automon-scratch\g286\data\fonts\IBMPlexSansThai-SemiBold.ttf"
T = Image.open(r"D:\GitHub\automon-arena\claude\preview-set301\S301-owner-target.webp").convert("RGB").crop((90, 78, 392, 276))
N = Image.open(r"D:\GitHub\automon-scratch\out\s302_S307frame1\8_prepH_hybrid.png").convert("RGB").crop((60, 30, 520, 250))
plate = Image.open("S307-plate.png").convert("RGBA")
def nine(w, h, m=80, d=14):
    out = Image.new("RGBA", (w, h)); tw, th = plate.size
    sx = [0, m, tw - m, tw]; sy = [0, m, th - m, th]; dx = [0, d, w - d, w]; dy = [0, d, h - d, h]
    for i in range(3):
        for j in range(3):
            out.paste(plate.crop((sx[i], sy[j], sx[i + 1], sy[j + 1])).resize((dx[i + 1] - dx[i], dy[j + 1] - dy[j]), Image.LANCZOS), (dx[i], dy[j]))
    return out
P = Image.new("RGB", (460, 220), (40, 46, 40))
for y in (14, 112):
    b = nine(420, 92); P.paste(b, (20, y), b)
lab = ImageFont.truetype(F, 24); sm = ImageFont.truetype(F, 20)
W = 3 * 470 + 40; out = Image.new("RGB", (W, 900), (24, 28, 36)); d = ImageDraw.Draw(out)
for i, (im, t) in enumerate([(T, "เป้าหมาย (รูปของคุณ)"), (N, "ของเราตอนนี้ (วาดด้วยโค้ด)"), (P, "A1 ย่อแผ่นร้าน (ยังไม่มีเงา)")]):
    x = 20 + i * 470; d.text((x, 14), t, font=lab, fill=(230, 220, 160))
    im2 = im.resize((450, int(im.height * 450 / im.width)), Image.LANCZOS); out.paste(im2, (x, 52))
brief = ["สิ่งที่จะสั่ง GPT (เรียก 1 ครั้ง ขอมา 2 แบบ):",
         "• ปุ่มเปล่า 2 ชิ้น: ล็อก (กรมท่าเทาเข้ม) · สุ่มใหม่ (กรมท่าอมฟ้า) — ไม่มีตัวหนังสือ ไม่มีไอคอน",
         "• ฐาน = แผ่นร้านของเรา (กรมท่า + ขอบทองบาง) ทรงตัดมุมซ้ายบน + ขวาล่างเท่านั้น",
         "• เงา: แสงจากซ้ายบน (ขอบบน/ซ้ายสว่าง · ล่าง/ขวามืด) + แถบเงาสะท้อนเฉียงจาง ๆ แบบรูปเป้าหมาย",
         "• สัดส่วนปุ่ม ~5 : 1 · ไม่มีเงาตกนอกปุ่ม · ไม่เรืองแสง · พื้นหลังชมพู #FF00FF (ไว้ตัดออก)",
         "• แนบรูป: แผ่นร้านของเรา + ภาพปุ่มเป้าหมาย ×2",
         "• ได้ภาพแล้ว: ตัดพื้นชมพู → ใส่ในเกมตัวอย่าง → ถ่าย PC + มือถือ + เทียบก่อน/หลัง"]
y = 52 + int(T.height * 450 / T.width) + 24
for i, t in enumerate(brief):
    d.text((20, y), t, font=lab if i == 0 else sm, fill=(230, 220, 160) if i == 0 else (215, 215, 215)); y += 44 if i == 0 else 38
out = out.crop((0, 0, W, y + 20)); out.save("S307k-btn-sample.png"); print(out.size)
