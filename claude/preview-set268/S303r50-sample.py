# set 303 r50 sample sheet: target cards + ours now (r49c) + our 6 tribe tints on the grey body + brief
import colorsys, sys
from PIL import Image, ImageDraw, ImageFont
cmp_ = Image.open("S303r49c-card-compare.png").convert("RGB")
W = cmp_.width
top = cmp_.crop((0, 0, W, 230))            # TARGET row
ours = cmp_.crop((0, 470, W, cmp_.height))  # r49c row
body = Image.open("S303r49b-card_body.png").convert("RGBA")
frame = Image.open("S303r49c-card_frame.png").convert("RGBA")
tribes = [("steel","เหล็กกล้า","#97a6b5"),("fire","เพลิงเผา","#f0764b"),("bolt","สายฟ้า","#f0c445"),
          ("wind","วายุ","#4cc49e"),("spirit","ภูติ","#7d62c6"),("fiend","อสูร","#e0566f")]
cw = 180; chh = int(body.height * cw / body.width)
F = lambda s, b=False: ImageFont.truetype("C:/Windows/Fonts/" + ("leelawdb.ttf" if b else "leelawad.ttf"), s)
row = Image.new("RGB", (W, chh + 40), (24, 24, 24)); d = ImageDraw.Draw(row)
for i, (k, th, hx) in enumerate(tribes):
    r, g, b = [int(hx[j:j+2], 16)/255 for j in (1, 3, 5)]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    tr, tg, tb = colorsys.hsv_to_rgb(h, min(max(s*0.85, 0.5), 0.7), 0.95)
    px = body.copy(); pd = px.load()
    for y in range(px.height):
        for x in range(px.width):
            R, G, B, A = pd[x, y]
            pd[x, y] = (int(R*tr), int(G*tg), int(B*tb), A)
    c = Image.alpha_composite(px, frame).resize((cw, chh), Image.LANCZOS)
    x0 = 12 + i * (cw + 14)
    row.paste(c, (x0, 34), c)
    d.text((x0, 4), th, font=F(20, True), fill=(240, 235, 220))
hdr = lambda t: (lambda im: (ImageDraw.Draw(im).text((10, 6), t, font=F(24, True), fill=(255, 214, 106)), im)[1])(Image.new("RGB", (W, 42), (16, 16, 16)))
brief = [
 "แผนที่จะสั่ง GPT (ยังไม่เรียก — รอเจ้าของแก้ก่อน):",
 "• วาดพื้นหลังการ์ด 6 แบบ = 1 แบบต่อเผ่า (ตอนนี้ = พื้นเทาแผ่นเดียว ย้อมสีในโค้ด)",
 "• ทั้ง 6 แบบวาดในภาพเดียว ให้แสง/ความเข้ม/สไตล์เท่ากัน · ไม่มีตัวละคร ไม่มีตัวหนังสือ",
 "• ใช้กรอบทองเดิม (r49c) ทับเหมือนเดิม — วาดแค่ด้านใน · มุมตัด 2 มุม บนซ้าย + ล่างขวา",
 "• แสงสว่างที่เท้าตัวละคร (ล่างกลาง) เหมือนภาพเป้าหมาย · ด้านบนมืดใต้แถบชื่อ",
 "• ลวดลายจาง ๆ ตามเผ่า (ถ้าเจ้าของเลือก) ต้องจางพอไม่แย่งสายตาจากตัวละคร",
 "• ตัวที่มี 2 เผ่า = ใช้พื้นของเผ่าหลัก (เผ่าแรก) · ไอคอนเผ่ามุมซ้ายบนคงเดิม",
]
bt = Image.new("RGB", (W, 34 * len(brief) + 16), (16, 16, 16)); bd = ImageDraw.Draw(bt)
for i, t in enumerate(brief):
    bd.text((14, 8 + i * 34), t, font=F(22, i == 0), fill=(245, 240, 223))
parts = [hdr("ภาพเป้าหมาย (พื้นการ์ดแต่ละเผ่า = สีไล่ + แสงที่เท้า)"), top,
         hdr("ของเราตอนนี้ r49c (ในเกม)"), ours,
         hdr("ของเราตอนนี้: พื้นเทาย้อมสีทั้ง 6 เผ่า (สตีล + ภูติ ไม่มีในภาพเกม)"), row, bt]
out = Image.new("RGB", (W, sum(p.height for p in parts)), (16, 16, 16)); y = 0
for p in parts: out.paste(p, (0, y)); y += p.height
out.save(sys.argv[1] if len(sys.argv) > 1 else "S303r50-tribe-bg-sample.png")
