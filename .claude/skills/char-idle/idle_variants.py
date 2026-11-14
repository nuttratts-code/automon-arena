# char-idle skill (set 221): 8 code-idle variants for ONE character still, side by side, for the owner to pick.
# run: python -I idle_variants.py <still.png> <out.gif> [neck_row waist_row hip_row] [--glow=H0-H1:S:V[:Y0-Y1] ...] [--glow-k=1.0]
#   --glow (set 225, repeatable) = glow mask by hue range in degrees (H0>H1 wraps, e.g. 340-45 = reds), min saturation, min value 0..1,
#   optional sprite rows Y0-Y1; replaces the default blue rule. --glow-k = glow strength (1.0 = old default).
#   rows = sprite rows (0 = top) where the neck / waist / hip are; default = 28% / 56% / 70% of the height.
#   still.png = grid-snapped RGBA (snap.py). Glow = pixels with blue > red + 70 (eyes, runes); none found = no glow.
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

GLOW = [a[7:] for a in sys.argv if a.startswith('--glow=')]
GK = float(next((a[9:] for a in sys.argv if a.startswith('--glow-k=')), 1.0))
sys.argv = [a for a in sys.argv if not a.startswith('--')]
src, out = sys.argv[1], sys.argv[2]
spr = np.asarray(Image.open(src).convert('RGBA')).copy()
H, W = spr.shape[:2]
if len(sys.argv) >= 6:
    NECK, WAIST, HIP = (int(v) for v in sys.argv[3:6])
else:
    NECK, WAIST, HIP = round(H * .28), round(H * .56), round(H * .70)
Z = 3                      # screen pixels per sprite pixel (in game ~3-5)
FPS, SEC = 20, 2.4
N = int(FPS * SEC)
PAD = 6
CW, CH = (W + 2 * PAD) * Z, (H + PAD + 2) * Z

def eye_mask(a):
    if not GLOW:
        return (a[:, :, 2].astype(int) > a[:, :, 0].astype(int) + 70) & (a[:, :, 3] > 0)
    f = a[:, :, :3] / 255.; mx = f.max(2); d = mx - f.min(2) + 1e-9; r, g, b = f[..., 0], f[..., 1], f[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    sat = d / (mx + 1e-9); yy = np.arange(a.shape[0])[:, None] + np.zeros(a.shape[1])
    m = np.zeros(a.shape[:2], bool)
    for rule in GLOW:
        p = rule.split(':'); h0, h1 = (float(x) for x in p[0].split('-'))
        hm = (h >= h0) & (h <= h1) if h0 <= h1 else (h >= h0) | (h <= h1)
        k = hm & (sat > float(p[1])) & (mx > float(p[2]))
        if len(p) > 3:
            y0, y1 = (int(x) for x in p[3].split('-')); k &= (yy >= y0) & (yy <= y1)
        m |= k
    return m & (a[:, :, 3] > 0)

def glow(a, k):
    a = a.copy(); e = eye_mask(a)
    a[e, :3] = np.clip(a[e, :3].astype(int) + (GK * k * np.array([60, 80, 40])).astype(int), 0, 255)
    return a

def breath(t, hold=False):
    """0..1..0 ; hold=True: in 35%, hold 15%, out 35%, rest 15%."""
    if not hold:
        return 0.5 - 0.5 * np.cos(t * 2 * np.pi)
    if t < .35: x = t / .35; return x * x * (3 - 2 * x)
    if t < .50: return 1.0
    if t < .85: x = (t - .5) / .35; return 1 - x * x * (3 - 2 * x)
    return 0.0

def place(a, dx=0, dy=0, zoom=True):
    im = Image.fromarray(a)
    if zoom:
        im = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
    c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    c.alpha_composite(im, ((CW - im.width) // 2 + dx, CH - 2 * Z - im.height + dy))
    return c

def screen_squash(a, sx, sy):
    big = Image.fromarray(a).resize((W * Z, H * Z), Image.NEAREST)
    return place(np.asarray(big.resize((round(W * Z * (1 + sx)), round(H * Z * (1 - sy))), Image.NEAREST)), zoom=False)

def drop_rows(a, rows):
    keep = [y for y in range(H) if y not in rows]
    return np.vstack([np.zeros((H - len(keep), W, 4), np.uint8), a[keep]])

def v1(t):  # sprite-res scale (rows pop at random) — reference only
    s = breath(t)
    nh, nw = round(H * (1 - .025 * s)), round(W * (1 + .015 * s))
    return place(np.asarray(Image.fromarray(glow(spr, s)).resize((nw, nh), Image.NEAREST)))
def v2(t):  # 2.5% / 1.5% at screen res
    s = breath(t); return screen_squash(glow(spr, s), .015 * s, .025 * s)
def v3(t):  # 1.2% / 0.8% + breath hold (default, set 221)
    s = breath(t, True); return screen_squash(glow(spr, s), .008 * s, .012 * s)
def v4(t):  # accordion: drop a row at the waist, then the neck
    s = breath(t, True)
    return place(drop_rows(glow(spr, s), [] if s < .33 else [WAIST] if s < .8 else [WAIST, NECK]))
def v5(t):  # upper body sinks 1 px and holds
    s = breath(t, True); return place(drop_rows(glow(spr, s), [HIP] if s > .5 else []))
def v6(t):  # v3 + top half sways 1 px
    s = breath(t, True); a = glow(spr, s).copy()
    a[:WAIST] = np.roll(a[:WAIST], 1 if np.sin(t * 2 * np.pi) > .4 else 0, axis=1)
    return screen_squash(a, .008 * s, .012 * s)
def v7(t):  # hover: whole body floats 0-2 px (flying / ghost / spirit)
    s = breath(t); return place(glow(spr, s), dy=-round(2 * Z * s))
def v8(t):  # glow only, body still (stone / object / statue)
    return place(glow(spr, breath(t)))

V = [(v1, '1 ย่อที่ขนาดสไปรต์'), (v2, '2 ยืดหดแรง (จอ)'), (v3, '3 ยืดหดเบา+ค้าง (หลัก)'), (v4, '4 หีบเพลง เอว→คอ'),
     (v5, '5 ท่อนบนยุบ 1px'), (v6, '6 แบบ 3 + โยก'), (v7, '7 ลอยขึ้นลง'), (v8, '8 นิ่ง เรืองอย่างเดียว')]
font = ImageFont.truetype('C:/Windows/Fonts/tahoma.ttf', 14)
COLS, GAP, TOP = 4, 8, 22
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
print('ok', W, 'x', H, 'rows neck/waist/hip', NECK, WAIST, HIP, 'glow px', int(eye_mask(spr).sum()), 'gif', sheet.size)
