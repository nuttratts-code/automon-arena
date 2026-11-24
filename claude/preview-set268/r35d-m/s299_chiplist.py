# set 299 r35w11 (owner): sample LIST, not in-game shots.
#  1 chip background at several cut sizes · 2 icons cut out and resized so every icon looks the same size · 3 marks later (+/- kept)
# usage: python s299_chiplist.py <icon dir> <out.png>
import sys, pathlib
from PIL import Image, ImageDraw, ImageFont
IC = pathlib.Path(sys.argv[1]); OUTP = sys.argv[2]
BLUE, RED, EDGE, BG = (47, 109, 181), (184, 52, 58), (22, 32, 42), (30, 36, 30)
REAL = 20          # chip size on the 1920 screen (9 base px x ~2.2)
BIG = 84           # enlarged view
SS = 8             # supersample for smooth edges
CHIPS = [("stun", 0, ""), ("atk", 1, "+"), ("burn", 1, "+"), ("shock", 1, "+"), ("armor", 1, "+"), ("heal", 1, "+"), ("cd", 1, "+"),   # r35w13: h2a removed (no unit uses it)
         ("vuln", 0, "+"), ("burn", 0, "+"), ("shock", 0, "+"), ("armor", 0, "-"), ("cd", 0, "-")]
try:
    F = ImageFont.truetype("C:/Windows/Fonts/tahomabd.ttf", 22); FS = ImageFont.truetype("C:/Windows/Fonts/tahoma.ttf", 17)
except Exception:
    F = FS = ImageFont.load_default()

FLIP = {"atk"}   # r35w12: sword tip to the top-left
def icon(key):   # outline + white fill, cropped to the drawn part
    o = Image.open(IC / f"{key}_o.png").convert("RGBA"); f = Image.open(IC / f"{key}.png").convert("RGBA")
    a = Image.new("RGBA", o.size, (0, 0, 0, 0))
    a.paste(Image.new("RGBA", o.size, EDGE + (230,)), (0, 0), o.split()[3])
    a.paste(Image.new("RGBA", o.size, (255, 255, 255, 250)), (0, 0), f.split()[3])
    a = a.crop(o.split()[3].getbbox())
    return a.transpose(Image.FLIP_LEFT_RIGHT) if key in FLIP else a

def area(im): return sum(1 for v in im.split()[3].get_flattened_data() if v > 60)

def chip(size, col, cut, key=None, mode="now", pad=0.10, mk="", ms=0.40):
    S = size * SS
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    k = cut * S; w = max(1, SS)
    pts = [(k, 0), (S - 1, 0), (S - 1, S - 1 - k), (S - 1 - k, S - 1), (0, S - 1), (0, k)] if cut > 0 else None
    if pts: d.polygon(pts, fill=col + (235,), outline=EDGE + (200,), width=w)
    else: d.rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.12), fill=col + (235,), outline=EDGE + (200,), width=w)
    if key:
        ic = icon(key)
        inner = S * (1 - 2 * pad)
        if mode == "now":       # as in the game today: whole 128 canvas squeezed into the chip, no crop
            full = Image.new("RGBA", (128, 128)); bb = Image.open(IC / f"{key}_o.png").getbbox(); full.paste(ic, bb[:2])
            ic = full; sc = inner / 128
        elif mode == "box":     # longest side = same
            sc = inner / max(ic.size)
        else:                   # same visual weight (ink area), capped by the box
            sc = min(inner / max(ic.size), (0.50 * inner * inner / area(ic)) ** 0.5)
        ic = ic.resize((max(1, int(ic.width * sc)), max(1, int(ic.height * sc))), Image.LANCZOS)
        im.alpha_composite(ic, ((S - ic.width) // 2, (S - ic.height) // 2))
    if mk:   # r35w12: smooth + / - like the symbols: white rounded bars, dark outline, top-right corner
        L = ms * S; t = L * 0.30; cx = S - L * 0.5 - S * 0.07; cy = L * 0.5 + S * 0.10; o = max(2, S * 0.045)   # r35w13: a bit lower / in from the edge
        bars = [(cx - L/2, cy - t/2, cx + L/2, cy + t/2)] + ([(cx - t/2, cy - L/2, cx + t/2, cy + L/2)] if mk == "+" else [])
        for b in bars: d.rounded_rectangle((b[0]-o, b[1]-o, b[2]+o, b[3]+o), radius=t/2+o, fill=EDGE + (240,))
        for b in bars: d.rounded_rectangle(b, radius=t/2, fill=(255, 255, 255, 255))
    return im.resize((size, size), Image.LANCZOS)

rows = []
def row(title, items):   # items = list of chip images (big) ; real-size copies are drawn under each
    rows.append((title, items))

# r35w12: cut 15 % + equal ink (ข) + sword flipped; mark size rows
row("ไม่มีเครื่องหมาย (ตัด 15% · ขนาดเท่ากัน · ดาบปลายบนซ้าย)", [chip(BIG, BLUE if b else RED, 0.15, k, "area") for k, b, m in CHIPS])
for ms, name in [(0.32, "เล็ก"), (0.40, "กลาง"), (0.48, "ใหญ่")]:
    row("เครื่องหมาย + / − มุมบนขวา · " + name, [chip(BIG, BLUE if b else RED, 0.15, k, "area", mk=m, ms=ms) for k, b, m in CHIPS])
W = 40 + 13 * (BIG + 14) + 20
H = 20 + sum(34 + BIG + 12 + REAL + 18 for _ in rows) + 40
sheet = Image.new("RGB", (W, H), (24, 28, 34)); d = ImageDraw.Draw(sheet)
y = 14
for title, items in rows:
    d.text((20, y), title, fill=(235, 235, 235), font=F); y += 34
    for i, im in enumerate(items):
        x = 20 + i * (BIG + 14)
        sheet.paste(BG, (x - 4, y - 4, x + BIG + 4, y + BIG + REAL + 22))
        sheet.paste(im, (x, y), im)
        sm = im.resize((REAL, REAL), Image.LANCZOS)
        sheet.paste(sm, (x + (BIG - REAL) // 2, y + BIG + 10), sm)
    y += BIG + 12 + REAL + 18
d.text((20, y), "รูปเล็กใต้แต่ละอัน = ขนาดจริงในเกม · ฟ้า = บัฟ · แดง = ดีบัฟ · + = ค่าขึ้น · − = ค่าลง", fill=(180, 190, 200), font=FS)
sheet.save(OUTP); print(sheet.size)
