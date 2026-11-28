# set 307 v: before (u2) / after (v soft flare) sheet: PC real shop, PC every pill kind, phone, x4 close-up. Usage: python S307v-compare.py
from PIL import Image, ImageDraw, ImageFont
F = r"D:\GitHub\automon-scratch\g286\data\fonts\IBMPlexSansThai-SemiBold.ttf"; lab = ImageFont.truetype(F, 26)
O = r"D:\GitHub\automon-scratch\out\s302_%s\8_prepH_hybrid.png"
cut = lambda tag, box, z=1.0: (lambda im: im.resize((int(im.width * z), int(im.height * z)), Image.LANCZOS if z < 2 else Image.NEAREST))(Image.open(O % tag).convert("RGB").crop(box))
PC, PH, ZM = (580, 40, 1340, 240), (560, 20, 1500, 180), (1085, 40, 1300, 200)
rows = [(cut("S307u2", PC), "ก่อน — PC ร้านจริง"), (cut("s307v_pc", PC), "หลัง — PC ร้านจริง (แสงไล่จางนุ่ม)"),
        (cut("S307u2demo", PC), "ก่อน — PC เม็ดค่าทุกแบบ"), (cut("s307v_demo", PC), "หลัง — PC เม็ดค่าทุกแบบ"),
        (cut("S307u2phone", PH), "ก่อน — มือถือ"), (cut("s307v_ph", PH), "หลัง — มือถือ"),
        (cut("S307u2demo", ZM, 4), "ก่อน — ซูม x4 การ์ดสีฟ้า + เม็ดค่า (ขอบบนมีก้อนแสงเหลืองตัดแข็ง)"), (cut("s307v_demo", ZM, 4), "หลัง — ซูม x4 (แสงขาวไล่จางเข้าสีกรอบ)")]
w = 1140; hs = [int(im.height * w / im.width) for im, _ in rows]
out = Image.new("RGB", (w + 40, sum(hs) + 56 * len(rows) + 20), (24, 28, 36)); d = ImageDraw.Draw(out); y = 10
for (im, t), h in zip(rows, hs):
    d.text((20, y), t, font=lab, fill=(230, 220, 160)); out.paste(im.resize((w, h), Image.LANCZOS if im.width > w else Image.NEAREST), (20, y + 40)); y += h + 56
out.save("S307v-flare-compare.png"); print(out.size)
