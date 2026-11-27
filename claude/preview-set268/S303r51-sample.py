# set 303 r51 sample sheet: target pills + coin vs ours now (r50d) + brief. NEAREST enlargement only (note 234).
import sys
from PIL import Image, ImageDraw, ImageFont
TGT = sys.argv[1]            # claude/preview-set301/S301-owner-target.webp (main)
OUR = "S303r50d.png"
F = lambda s, b=False: ImageFont.truetype("C:/Windows/Fonts/" + ("leelawdb.ttf" if b else "leelawad.ttf"), s)
t = Image.open(TGT).convert("RGB").crop((408, 74, 890, 274))      # Pangofan + Firasheep cards
o = Image.open(OUR).convert("RGB").crop((586, 92, 1054, 284))
up = lambda im, k: im.resize((im.width * k, im.height * k), Image.NEAREST)
W = 1000
def hdr(s):
    im = Image.new("RGB", (W, 42), (16, 16, 16)); ImageDraw.Draw(im).text((10, 6), s, font=F(24, True), fill=(255, 214, 106)); return im
def pad(im):
    c = Image.new("RGB", (W, im.height + 12), (24, 24, 24)); c.paste(im, (10, 6)); return c
def zrow(a, b, la, lb):
    c = Image.new("RGB", (W, max(a.height, b.height) + 40), (24, 24, 24)); d = ImageDraw.Draw(c)
    d.text((10, 4), la, font=F(20, True), fill=(240, 235, 220)); d.text((510, 4), lb, font=F(20, True), fill=(240, 235, 220))
    c.paste(a, (10, 34)); c.paste(b, (510, 34)); return c
tp = up(t.crop((4, 52, 74, 156)), 4); op = up(o.crop((4, 48, 80, 128)), 4)     # pills
tcn = up(t.crop((168, 16, 200, 46)), 8); ocn = up(o.crop((156, 12, 186, 42)), 8)  # coin
brief = [
 "แผนที่จะสั่ง GPT (ยังไม่เรียก — รอเจ้าของแก้ก่อน):",
 "• ป้าย 7 แบบ วาดเปล่า (ไม่มีตัวเลข/ไอคอน) ครบทุกสีในภาพเดียว · สีอย่างเดียว ไม่มีไอคอน (F2)",
 "• แต่ละป้ายมีลายตามความหมาย ทับราวครึ่งป้าย (เช่น ป้ายไฟมีเปลวไฟครึ่งล่าง) ลายต้องไม่บังตัวเลข",
 "• ทรงป้าย: ตัด 2 มุม บนซ้าย + ล่างขวา (A1) · ขอบเข้ม · เงาวาวด้านบน มืดลงด้านล่าง",
 "• เหรียญ: เหรียญทองเปล่า 1 เหรียญ ทรงรีเห็นขอบ แบบภาพเป้าหมาย (C1) · ใช้เฉพาะบนการ์ด (D1)",
 "• พื้นชมพูม่วง (ตัดออกทีหลัง) · ตัวเลขเขียนด้วยโค้ด ใส่ขอบดำบาง ๆ แบบภาพเป้าหมาย",
 "• แสดงเฉพาะค่าที่ไม่เป็น 0 · เรียงแถวเดียวทางซ้าย (G1) · ไม่มีป้ายคูลดาวน์ (E1)",
 "• ลำดับบนการ์ด: HP · ATK · ×ฮิต · ไฟ · ช็อต · เกราะ · ฟื้น",
]
pills = [("HP", "#3f8a46", "เขียว", "เส้นชีพจรจาง ๆ"),
         ("ATK", "#a3363a", "แดง", "รอยกรงเล็บ 3 เส้น"),
         ("×ฮิต", "#8a6fc4", "ม่วง", "เส้นความเร็วซ้อน 3 ชั้น"),
         ("ไฟ", "#d9702a", "ส้ม", "เปลวไฟครึ่งล่าง"),
         ("ช็อต", "#d4ad22", "เหลือง", "สายฟ้าซิกแซกพาดกลาง"),
         ("เกราะ", "#5f7f99", "ฟ้าเหล็ก", "หมุด + รอยต่อแผ่นเหล็ก"),
         ("ฟื้น", "#4fb39a", "เขียวมิ้นต์", "ใบไม้ + ประกายเล็ก ๆ")]
sw = Image.new("RGB", (W, 46 * len(pills) + 20), (24, 24, 24)); sd = ImageDraw.Draw(sw)
for i, (nm, hx, cn, mo) in enumerate(pills):
    y0 = 12 + i * 46; x0, x1, y1, k = 14, 104, y0 + 32, 7
    sd.polygon([(x0 + k, y0), (x1, y0), (x1, y1 - k), (x1 - k, y1), (x0, y1), (x0, y0 + k)], fill=hx, outline=(20, 14, 10))
    sd.text((x0 + 30, y0 + 3), "12", font=F(20, True), fill=(250, 248, 240), stroke_width=2, stroke_fill=(0, 0, 0))
    sd.text((124, y0 + 3), "%s — สี%s · ลาย: %s" % (nm, cn, mo), font=F(21), fill=(240, 235, 220))
bt = Image.new("RGB", (W, 34 * len(brief) + 16), (16, 16, 16)); bd = ImageDraw.Draw(bt)
for i, s in enumerate(brief):
    bd.text((14, 8 + i * 34), s, font=F(21, i == 0), fill=(245, 240, 223))
parts = [hdr("ภาพเป้าหมาย (ขยาย ×2)"), pad(up(t, 2)),
         hdr("ของเราตอนนี้ r50d ในเกม (ขยาย ×2)"), pad(up(o, 2)),
         hdr("ซูมป้าย HP/ATK (×4)"), zrow(tp, op, "เป้าหมาย", "ของเรา"),
         hdr("ซูมเหรียญ (×8)"), zrow(tcn, ocn, "เป้าหมาย", "ของเรา"),
         hdr("ป้าย 7 แบบที่จะสั่ง (สี + ลาย = ข้อเสนอ แก้ได้ · ภาพนี้แค่บอกสี ยังไม่ใช่ลายจริง)"), sw, bt]
out = Image.new("RGB", (W, sum(p.height for p in parts)), (16, 16, 16)); y = 0
for p in parts: out.paste(p, (0, y)); y += p.height
out.save(sys.argv[2] if len(sys.argv) > 2 else "S303r51-pill-coin-sample.png")
