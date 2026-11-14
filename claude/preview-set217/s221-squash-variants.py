# set 221 demo: 6 ways to do the code squash idle on one still (HL-1). Sample only, not game code.
# run: python -I s221-squash-variants.py <hl1_px.png> <out.gif>
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
spr = np.asarray(Image.open(src).convert('RGBA')).copy()
H, W = spr.shape[:2]
Z = 3                      # screen pixels per sprite pixel (in game it is ~3-5)
FPS, SEC = 20, 2.4
N = int(FPS * SEC)
PAD = 6
CW, CH = (W + 2 * PAD) * Z, (H + PAD + 2) * Z
WAIST, NECK, HIP = 45, 22, 56   # rows from the coordinate grid

def eye_mask(a):
    return (a[:, :, 2].astype(int) > a[:, :, 0].astype(int) + 70) & (a[:, :, 3] > 0)

def glow(a, k):
    a = a.copy(); e = eye_mask(a)
    a[e, :3] = np.clip(a[e, :3].astype(int) + (k * np.array([60, 80, 40])).astype(int), 0, 255)
    return a

def breath(t, hold=False):
    """0..1..0 ; hold=True: in 35%, hold 15%, out 35%, rest 15% (more natural)."""
    if not hold:
        return 0.5 - 0.5 * np.cos(t * 2 * np.pi)
    if t < .35: x = t / .35; return x * x * (3 - 2 * x)
    if t < .50: return 1.0
    if t < .85: x = (t - .5) / .35; return 1 - x * x * (3 - 2 * x)
    return 0.0

def place(a, dx=0, dy=0, zoom=True):
    """sprite-res array -> panel image, feet on the same line."""
    im = Image.fromarray(a)
    if zoom:
        im = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
    c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    c.alpha_composite(im, ((CW - im.width) // 2 + dx, CH - 2 * Z - im.height + dy))
    return c

def drop_rows(a, rows):
    """remove the given rows (top part sinks), pad on top: pixel-exact squash."""
    keep = [y for y in range(H) if y not in rows]
    b = a[keep]
    return np.vstack([np.zeros((H - len(keep), W, 4), np.uint8), b])

# 1 original: scale at SPRITE resolution (rows pop at random places)
def v1(t):
    s = breath(t)
    nh, nw = round(H * (1 - .025 * s)), round(W * (1 + .015 * s))
    return place(np.asarray(Image.fromarray(glow(spr, s)).resize((nw, nh), Image.NEAREST)))

# 2 same numbers but scaled at SCREEN resolution (= how Sprite3D scale looks in game)
def v2(t):
    s = breath(t)
    big = Image.fromarray(glow(spr, s)).resize((W * Z, H * Z), Image.NEAREST)
    big = big.resize((round(W * Z * (1 + .015 * s)), round(H * Z * (1 - .025 * s))), Image.NEAREST)
    return place(np.asarray(big), zoom=False)

# 3 smaller (1.2%), slower curve with a hold, screen resolution
def v3(t):
    s = breath(t, hold=True)
    big = Image.fromarray(glow(spr, s)).resize((W * Z, H * Z), Image.NEAREST)
    big = big.resize((round(W * Z * (1 + .008 * s)), round(H * Z * (1 - .012 * s))), Image.NEAREST)
    return place(np.asarray(big), zoom=False)

# 4 accordion: drop 1 row at the waist, then 1 at the neck (legs never move, no random pops)
def v4(t):
    s = breath(t, hold=True)
    rows = [] if s < .33 else [WAIST] if s < .8 else [WAIST, NECK]
    return place(drop_rows(glow(spr, s), rows))

# 5 upper body only: everything above the hip sinks 1 px, held, legs fixed (classic 2-frame idle)
def v5(t):
    s = breath(t, hold=True)
    return place(drop_rows(glow(spr, s), [HIP] if s > .5 else []))

# 6 screen-res squash + 1 px side sway of the top half (breathing + weight shift)
def v6(t):
    s = breath(t, hold=True)
    a = glow(spr, s)
    sway = 1 if np.sin(t * 2 * np.pi) > .4 else 0
    a2 = np.zeros_like(a); a2[:] = a
    a2[:WAIST] = np.roll(a[:WAIST], sway, axis=1)
    big = Image.fromarray(a2).resize((W * Z, H * Z), Image.NEAREST)
    big = big.resize((round(W * Z * (1 + .008 * s)), round(H * Z * (1 - .012 * s))), Image.NEAREST)
    return place(np.asarray(big), zoom=False)

V = [(v1, '1 เดิม: ย่อที่ขนาดสไปรต์'), (v2, '2 เท่าเดิม แต่ย่อที่ขนาดจอ'),
     (v3, '3 เบาลงครึ่ง + ค้างหายใจ'), (v4, '4 หีบเพลง: ตัดเอว→คอ'),
     (v5, '5 ท่อนบนยุบ 1 px ค้าง'), (v6, '6 แบบ 3 + โยกซ้ายขวา')]
font = ImageFont.truetype('C:/Windows/Fonts/tahoma.ttf', 15)
COLS, GAP, TOP = 3, 8, 24
SW, SH = COLS * (CW + GAP) + GAP, 2 * (CH + TOP + GAP) + GAP
frames = []
for i in range(N):
    t = i / N
    sheet = Image.new('RGB', (SW, SH), (58, 70, 62)); d = ImageDraw.Draw(sheet)
    for k, (fn, name) in enumerate(V):
        x0 = GAP + (k % COLS) * (CW + GAP); y0 = GAP + (k // COLS) * (CH + TOP + GAP)
        d.text((x0 + 4, y0), name, font=font, fill=(240, 240, 230))
        d.ellipse([x0 + CW * .2, y0 + TOP + CH - 5 * Z, x0 + CW * .8, y0 + TOP + CH], fill=(40, 50, 44))
        p = fn(t); sheet.paste(p, (x0, y0 + TOP), p)
    frames.append(sheet)
frames[0].save(out, save_all=True, append_images=frames[1:], duration=1000 // FPS, loop=0)
print('ok', N, sheet.size)
