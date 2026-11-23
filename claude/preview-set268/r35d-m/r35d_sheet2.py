# R35d round 2: stun without stars + thinner crossed swords. Own shapes drawn in code; swords = Kenney sword (CC0) thinned.
import sys, os, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
SRC, FONTS, OUT, ICONDIR = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
S = 256
SS = 4


def alpha(im): return im.split()[3]


def white(mask):
    im = Image.new('RGBA', mask.size, (255, 255, 255, 0)); im.putalpha(mask); return im


def blank(): return Image.new('RGBA', (S, S), (0, 0, 0, 0))


def over(a, b):
    o = a.copy(); o.alpha_composite(b); return o


def cut(base, cutter, grow=9):
    return white(ImageChops.subtract(alpha(base), alpha(cutter).filter(ImageFilter.MaxFilter(grow))))


def canvas(): return Image.new('L', (S * SS, S * SS), 0)
def done(m): return white(m.resize((S, S), Image.LANCZOS))
def U(v): return v * S * SS / 64.0


def spiral(turns=2.6, r0=3.0, r1=27.0, w=6.5, cx=32, cy=32):
    m = canvas(); d = ImageDraw.Draw(m); n = 400; pts = []
    for i in range(n + 1):
        t = i / n; a = t * turns * 2 * math.pi; r = r0 + (r1 - r0) * t
        pts.append((U(cx + r * math.cos(a)), U(cy + r * math.sin(a))))
    d.line(pts, fill=255, width=int(U(w)), joint='curve')
    rr = U(w) / 2
    for p in (pts[0], pts[-1]): d.ellipse([p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr], fill=255)
    return done(m)


def ring_dots():
    m = canvas(); d = ImageDraw.Draw(m)
    d.ellipse([U(6), U(22), U(58), U(46)], outline=255, width=int(U(5.5)))
    ring = done(m); out = ring
    for cx, cy, r in [(32, 22, 7.5), (8, 34, 6), (56, 34, 6)]:
        mm = canvas(); ImageDraw.Draw(mm).ellipse([U(cx - r), U(cy - r), U(cx + r), U(cy + r)], fill=255)
        dot = done(mm); out = over(cut(out, dot, 13), dot)
    return out


def swirl_eyes():  # two small spirals side by side ("dizzy eyes")
    a = spiral(turns=1.9, r0=1.5, r1=12.5, w=4.6, cx=17, cy=32)
    b = spiral(turns=1.9, r0=1.5, r1=12.5, w=4.6, cx=17, cy=32).transpose(Image.FLIP_LEFT_RIGHT)
    return over(a, b)


def small(im, f=0.5, dx=0, dy=0):
    sz = int(S * f); s = im.resize((sz, sz), Image.LANCZOS); o = blank()
    o.alpha_composite(s, (int((S - sz) / 2 + dx), int((S - sz) / 2 + dy))); return o


sword = Image.open(os.path.join(SRC, 'sword.png')).convert('RGBA').resize((S, S), Image.LANCZOS)
def thin(im, px): return white(alpha(im).filter(ImageFilter.MinFilter(px)))


def crossed(sw, f=0.92, gap=11):
    a = small(sw, f); b = small(sw.transpose(Image.FLIP_LEFT_RIGHT), f)
    return over(cut(a, b, gap), b)


def own_sword():  # thin straight sword pointing up-right: blade, guard, grip, pommel
    m = canvas(); d = ImageDraw.Draw(m)
    blade = [(58, 4), (60, 6), (24, 42), (20, 40), (22, 38)]
    d.polygon([(U(x), U(y)) for x, y in [(60, 4), (58, 12), (25, 45), (19, 39), (52, 6)]], fill=255)
    d.line([(U(12), U(36)), (U(28), U(52))], fill=255, width=int(U(5)))  # guard
    d.line([(U(20), U(44)), (U(9), U(55))], fill=255, width=int(U(4.5)))  # grip
    d.ellipse([U(4), U(53), U(11), U(60)], fill=255)  # pommel
    return done(m)


osw = own_sword()
opts_stun = [("S1 ก้นหอย (หมุนหัว)", spiral(turns=1.75, r0=2.5, r1=26, w=8)), ("S2 วงรี + จุด 3 จุด", ring_dots()), ("S3 ตาก้นหอยคู่", swirl_eyes())]
opts_multi = [("M1 ดาบ Kenney บางลงนิด", crossed(thin(sword, 21), gap=11)), ("M2 ดาบ Kenney บางลงมาก", crossed(thin(sword, 33), gap=9)),
              ("M3 ดาบเส้นบางวาดเอง", crossed(osw, 0.96, 9)), ("เดิม (รอบก่อน)", crossed(sword, 0.86, 15))]
rows = [("stun", "มึนงง — แบบใหม่ ไม่มีดาว", (232, 238, 242), opts_stun),
        ("multi", "ตีหลายครั้ง — ดาบบางลง", (224, 210, 180), opts_multi),
        ("ref", "เทียบกับไอคอนที่ใช้คู่กัน", (224, 210, 180), [("ดาบ (พลังโจมตี)", sword), ("สายฟ้า A1 (เลือกแล้ว)", None)])]
fT = ImageFont.truetype(os.path.join(FONTS, 'Mitr-Medium.ttf'), 17)
fS = ImageFont.truetype(os.path.join(FONTS, 'IBMPlexSansThai-Regular.ttf'), 13)
fN = ImageFont.truetype(os.path.join(FONTS, 'IBMPlexMono-Medium.ttf'), 11)


def tint(im, col, size):
    a = alpha(im).resize((size, size), Image.LANCZOS)
    o = Image.new('RGBA', (size, size), col + (0,)); o.putalpha(a); return o


def outline(im):
    a = alpha(im).filter(ImageFilter.MaxFilter(3)); o = Image.new('RGBA', im.size, (22, 32, 42, 0))
    o.putalpha(a.point(lambda v: int(v * 0.8))); o.alpha_composite(im); return o


bolt_p = os.path.join(ICONDIR, 'shock_1.png')
W = 1200; RH = 112; H = 60 + RH * len(rows) + 10
sheet = Image.new('RGB', (W, H), (14, 20, 27)); d = ImageDraw.Draw(sheet)
d.text((16, 14), "R35d รอบ 2 — มึนงงแบบใหม่ (ไม่ใช่ดาว) · ตีหลายครั้งดาบบางลง · ใหญ่ = รูปทรง · กล่องเล็ก = ขนาดจริง 12 px (+ ซูม 3 เท่า)", font=fS, fill=(200, 212, 222))
os.makedirs(ICONDIR, exist_ok=True)
for r, (key, label, col, opts) in enumerate(rows):
    y = 44 + r * RH
    d.rectangle([8, y, W - 8, y + RH - 8], fill=(22, 32, 42)); d.text((18, y + 10), label, font=fT, fill=col)
    for i, (ol, im) in enumerate(opts):
        if im is None:
            im = Image.open(bolt_p).convert('RGBA').resize((S, S), Image.LANCZOS); c = (242, 214, 75)
        else:
            c = col
        x = 250 + i * 236
        big = tint(im, c, 64); sheet.paste(big, (x, y + 12), big)
        chip = Image.new('RGBA', (40, 18), (22, 32, 42, 205)); chip.alpha_composite(outline(tint(im, c, 12)), (3, 3))
        ImageDraw.Draw(chip).text((18, 2), "12", font=fN, fill=(201, 211, 218))
        sheet.paste(chip, (x + 72, y + 14), chip)
        z = chip.resize((120, 54), Image.NEAREST); sheet.paste(z, (x + 72, y + 34), z) if False else None
        z2 = chip.resize((80, 36), Image.NEAREST); sheet.paste(z2, (x + 120, y + 8), z2)
        d.text((x + 72, y + 64), ol, font=fS, fill=(215, 222, 230))
        if key != 'ref':
            tint(im, (255, 255, 255), 128).save(os.path.join(ICONDIR, f"{key}_r2_{i + 1}.png"))
sheet.save(OUT)
