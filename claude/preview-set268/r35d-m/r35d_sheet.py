# R35d icon sheet: Kenney Board Game Icons (CC0) candidates per battle-screen value + own-drawn substitutes.
import sys, os, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
SRC, FONTS, OUT, ICONDIR = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
S = 256  # work size


def k(n): return Image.open(os.path.join(SRC, n + '.png')).convert('RGBA').resize((S, S), Image.LANCZOS)
def blank(): return Image.new('RGBA', (S, S), (0, 0, 0, 0))


def white(mask):
    im = Image.new('RGBA', (S, S), (255, 255, 255, 0)); im.putalpha(mask); return im


def alpha(im): return im.split()[3]


def cut(base, cutter, grow=9):  # remove a gap around cutter from base
    m = alpha(cutter).filter(ImageFilter.MaxFilter(grow))
    return white(ImageChops.subtract(alpha(base), m))


def over(a, b):
    o = a.copy(); o.alpha_composite(b); return o


def poly(pts, scale=S / 64.0):
    big = Image.new('L', (S * 4, S * 4), 0); d = ImageDraw.Draw(big)
    d.polygon([(x * scale * 4, y * scale * 4) for x, y in pts], fill=255)
    return white(big.resize((S, S), Image.LANCZOS))


def small(im, f=0.5, dx=0, dy=0):
    sz = int(S * f); s = im.resize((sz, sz), Image.LANCZOS); o = blank()
    o.alpha_composite(s, (int((S - sz) / 2 + dx), int((S - sz) / 2 + dy))); return o


def star(cx, cy, r):
    pts = []
    for i in range(8):
        a = math.pi / 4 * i - math.pi / 2; rr = r if i % 2 == 0 else r * 0.38
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts


# own shapes (code-drawn, no outside asset)
bolt = poly([(36, 4), (14, 36), (29, 36), (24, 60), (50, 24), (34, 24), (42, 4)])
st = blank()
for cx, cy, r in [(32, 12, 11), (12, 40, 9), (52, 40, 9)]:
    st = over(st, poly(star(cx, cy, r)))
big = Image.new('L', (S * 4, S * 4), 0); dr = ImageDraw.Draw(big)
dr.ellipse([S * 4 * 0.12, S * 4 * 0.30, S * 4 * 0.88, S * 4 * 0.70], outline=255, width=int(S * 4 * 0.07))
st2 = white(big.resize((S, S), Image.LANCZOS))
for cx, cy, r in [(32, 19, 10), (10, 32, 8), (54, 32, 8)]:
    p = poly(star(cx, cy, r)); st2 = over(cut(st2, p, 11), p)
shield = k('shield'); sword = k('sword'); heart = k('suit_hearts')
crack = poly([(30, 2), (38, 2), (30, 22), (40, 32), (26, 62), (22, 62), (32, 34), (22, 24)])
vuln1 = white(ImageChops.subtract(alpha(shield), alpha(crack)))
left = poly([(0, 0), (31, 0), (24, 22), (34, 32), (24, 64), (0, 64)])
sl = white(ImageChops.multiply(alpha(shield), alpha(left)))
sr = white(ImageChops.subtract(alpha(shield), alpha(left).filter(ImageFilter.MaxFilter(13))))
vuln2 = blank()
vuln2.alpha_composite(sl.rotate(8, center=(S * 0.3, S * 0.9)), (-8, 4))
vuln2.alpha_composite(sr.rotate(-8, center=(S * 0.7, S * 0.9)), (8, 4))
swm = sword.transpose(Image.FLIP_LEFT_RIGHT)
multi1 = over(cut(small(sword, 0.86), small(swm, 0.86), 15), small(swm, 0.86))
multi2 = over(cut(small(sword, 0.72, -22, 14), small(sword, 0.72, 18, -14), 15), small(sword, 0.72, 18, -14))
plus = poly([(44, 30), (52, 30), (52, 40), (62, 40), (62, 48), (52, 48), (52, 58), (44, 58), (44, 48), (34, 48), (34, 40), (44, 40)])
armhit = over(cut(small(shield, 0.78, -12, -6), plus, 13), plus)
h2a = over(cut(small(heart, 0.62, -24, -18), small(sword, 0.62, 22, 18), 13), small(sword, 0.62, 22, 18))
pause = over(poly([(14, 10), (26, 10), (26, 54), (14, 54)]), poly([(38, 10), (50, 10), (50, 54), (38, 54)]))
play = poly([(16, 8), (54, 32), (16, 56)])
ff = over(poly([(4, 12), (32, 32), (4, 52)]), poly([(32, 12), (60, 32), (32, 52)]))


def C(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


rows = [
    ("atk", "พลังโจมตี (ดาบ)", "#e0d2b4", [("Kenney sword", sword)]),
    ("armor", "เกราะ (โล่)", "#a9c3d3", [("Kenney shield", shield)]),
    ("burn", "ไฟ / เผา", "#ef8a3c", [("A1 Kenney fire", k('fire')), ("A2 Kenney campfire", k('campfire'))]),
    ("shock", "สายฟ้า / ช็อต  ! ไม่มีในแพค", "#f2d64b", [("A1 วาดเอง สายฟ้า", bolt), ("A2 Kenney exploding", k('exploding'))]),
    ("stun", "มึนงง  ! ไม่มีในแพค", "#e8eef2", [("A1 วาดเอง ดาว 3 ดวง", st), ("A2 วาดเอง ดาววนรอบ", st2), ("A3 Kenney arrow_rotate", k('arrow_rotate'))]),
    ("heal", "ฮีล (หัวใจ)", "#7fd18a", [("Kenney suit_hearts", heart)]),
    ("cd", "คูลดาวน์ (นาฬิกา)", "#9fc4ea", [("A1 Kenney hourglass", k('hourglass')), ("A2 Kenney timer", k('timer_CW_75'))]),
    ("multi", "ตีหลายครั้ง", "#e0d2b4", [("A1 ดาบไขว้ (ดาบ Kenney x2)", multi1), ("A2 ดาบซ้อน 2 เล่ม", multi2)]),
    ("vuln", "โดนแรงขึ้น (โล่แตก)  ! ไม่มีในแพค", "#e07a7a", [("A1 โล่ Kenney + รอยร้าว", vuln1), ("A2 โล่ Kenney แตก 2 ซีก", vuln2)]),
    ("armhit", "เกราะต่อการตี (โล่+บวก)", "#a9c3d3", [("โล่ Kenney + บวก", armhit)]),
    ("h2a", "ฮีลเป็นพลังโจมตี", "#e88fa0", [("หัวใจ + ดาบ Kenney", h2a)]),
    ("btn", "ปุ่มหยุด / เล่นต่อ / เร่ง  ! ไม่มีในแพค", "#e8eef2", [("หยุด (วาดเอง)", pause), ("เล่นต่อ (วาดเอง)", play), ("เร่ง (วาดเอง)", ff)]),
]
OLD_SRC = {"stun": ["..#.#..", ".#####.", "##.#.##", ".#####.", "..#.#.."], "burn": ["...#...", "..##...", ".####..", "######.", ".####.."],
           "shock": ["...##..", "..##...", ".####..", "...##..", "..##..."], "atk": ["....##", "...##.", "#.##..", ".##...", "#.#..."],
           "armor": ["######", "##..##", "##..##", ".#..#.", "..##.."], "multi": ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
           "armhit": ["####.#.", "#..####", "#..#.#.", ".##....", "......."], "heal": [".#.#.", "#####", "#####", ".###.", "..#.."],
           "cd": [".###.", "#.#.#", "#.###", "#...#", ".###."], "h2a": [".#.#....#", "#####..#.", ".###.##..", "..#..#...", ".....#..."],
           "vuln": ["##.###", "#..#.#", "#.#..#", ".#..#.", "..##.."]}
fT = ImageFont.truetype(os.path.join(FONTS, 'Mitr-Medium.ttf'), 17)
fS = ImageFont.truetype(os.path.join(FONTS, 'IBMPlexSansThai-Regular.ttf'), 13)
fN = ImageFont.truetype(os.path.join(FONTS, 'IBMPlexMono-Medium.ttf'), 11)
BG = (14, 20, 27); PLATE = (22, 32, 42)


def tint(im, col, size):
    a = alpha(im).resize((size, size), Image.LANCZOS)
    o = Image.new('RGBA', (size, size), col + (0,)); o.putalpha(a); return o


def outline(im, px=1):  # dark edge like the card marks
    a = alpha(im).filter(ImageFilter.MaxFilter(px * 2 + 1))
    o = Image.new('RGBA', im.size, (22, 32, 42, 0)); o.putalpha(a.point(lambda v: int(v * 0.8))); o.alpha_composite(im); return o


W = 1200; RH = 104; H = 70 + RH * len(rows) + 40
sheet = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(sheet)
d.text((16, 12), "R35d ไอคอนหน้าสู้ — Kenney Board Game Icons (CC0) · ใหญ่ = ดูรูปทรง · กล่องเล็ก = ขนาดจริงบนการ์ด 12 px (+ ซูม 3 เท่าข้าง ๆ) · ซ้ายสุด = ไอคอนพิกเซลเดิม", font=fS, fill=(200, 212, 222))
d.text((16, 34), "! = แพคไม่มี → มีตัวเลือก A1/A2 (วาดเอง = รูปทรงง่าย ๆ ที่วาดด้วยโค้ด ไม่ใช่ของคนอื่น)", font=fS, fill=(240, 200, 120))
os.makedirs(ICONDIR, exist_ok=True)
for r, (key, label, hexc, opts) in enumerate(rows):
    y = 64 + r * RH; col = C(hexc)
    d.rectangle([8, y, W - 8, y + RH - 8], fill=PLATE)
    d.text((18, y + 8), label, font=fT, fill=col)
    if key in OLD_SRC:
        g = OLD_SRC[key]; px = 4
        for yy, row in enumerate(g):
            for xx, ch in enumerate(row):
                if ch == '#':
                    d.rectangle([20 + xx * px, y + 44 + yy * px, 20 + xx * px + px - 1, y + 44 + yy * px + px - 1], fill=col)
        d.text((20, y + 70), "เดิม", font=fS, fill=(130, 145, 158))
    for i, (ol, im) in enumerate(opts):
        x = 300 + i * 296
        bigi = tint(im, col, 64); sheet.paste(bigi, (x, y + 10), bigi)
        chip = Image.new('RGBA', (40, 18), (22, 32, 42, 205)); ic = outline(tint(im, col, 12)); chip.alpha_composite(ic, (3, 3))
        ImageDraw.Draw(chip).text((18, 2), "12", font=fN, fill=(201, 211, 218))
        sheet.paste(chip, (x + 76, y + 14), chip)
        z = chip.resize((120, 54), Image.NEAREST); sheet.paste(z, (x + 124, y + 4), z)
        d.text((x + 76, y + 64), ol, font=fS, fill=(215, 222, 230))
        tint(im, (255, 255, 255), 128).save(os.path.join(ICONDIR, f"{key}_{i + 1}.png"))
d.text((16, H - 30), "ที่มา: kenney.nl/assets/board-game-icons v1.1 · CC0 1.0 · เครดิต Kenney มีในหน้าเครดิตเกมแล้ว · zip เก็บใน automon-scratch เท่านั้น", font=fS, fill=(130, 145, 158))
sheet.save(OUT)
