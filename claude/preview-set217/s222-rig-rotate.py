# set 222 demo: HL-1 cut into 5 parts and ROTATED around joints (neck, shoulders, hip). Sample only, not game code.
# Panels: 1 code squash v3 · R1 rotate at sprite resolution (RotSprite: EPX x8 -> rotate -> back to 1x, stays pixel art)
#         · R2 rotate at screen resolution (what Godot Skeleton2D does without pixel snap: mixels)
# run: python -I s222-rig-rotate.py <hl1_px.png> <out.gif>
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
spr = np.asarray(Image.open(src).convert('RGBA')).copy()
H, W = spr.shape[:2]
ys, xs = np.mgrid[0:H, 0:W]
solid = spr[:, :, 3] > 0

# ---- parts (coordinates from the 84x80 grid) ----
lab = np.full((H, W), 'torso', dtype=object)
lab[(ys < 14) | ((ys < 26) & (xs >= 30) & (xs <= 50))] = 'head'
lab[(xs >= 56) & (ys < 56)] = 'armR'
lab[((xs < 28) & (ys < 58)) | ((xs < 35) & (ys >= 34) & (ys < 58))] = 'armL'
lab[(ys >= 57) & (lab != 'armL')] = 'legs'
lab[~solid] = ''
PIV = {'torso': (40, 56), 'head': (40, 25), 'armL': (27, 23), 'armR': (55, 25), 'legs': (40, 70)}
PARENT = {'head': 'torso', 'armL': 'torso', 'armR': 'torso', 'torso': None, 'legs': None}
DARK = np.array([12, 12, 38, 255], np.uint8)

def layer(mask):
    a = np.zeros_like(spr); a[mask] = spr[mask]; return a
parts = {n: layer(lab == n) for n in ('legs', 'armL', 'torso', 'head', 'armR')}
back = np.zeros_like(spr); back[solid & (lab != 'legs')] = DARK      # dark fill so turning joints show no holes

def epx(a):
    """Scale2x: doubles the image and rounds diagonal edges (first step of RotSprite)."""
    h, w = a.shape[:2]
    p = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode='edge')
    P = p[1:-1, 1:-1]; A = p[:-2, 1:-1]; B = p[1:-1, 2:]; C = p[1:-1, :-2]; D = p[2:, 1:-1]
    eq = lambda x, y: (x == y).all(-1)
    o = np.zeros((h * 2, w * 2, 4), a.dtype)
    o[0::2, 0::2] = np.where((eq(C, A) & ~eq(C, D) & ~eq(A, B))[..., None], A, P)
    o[0::2, 1::2] = np.where((eq(A, B) & ~eq(A, C) & ~eq(B, D))[..., None], B, P)
    o[1::2, 0::2] = np.where((eq(D, C) & ~eq(D, B) & ~eq(C, A))[..., None], C, P)
    o[1::2, 1::2] = np.where((eq(B, D) & ~eq(B, A) & ~eq(D, C))[..., None], D, P)
    return o
up8 = {n: epx(epx(epx(a))) for n, a in parts.items()}
up8['back'] = epx(epx(epx(back)))
parts['back'] = back

def mat(rot_deg, piv, dx=0.0, dy=0.0):
    r = np.radians(rot_deg); c, s = np.cos(r), np.sin(r); px, py = piv
    R = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1.0]])
    T1 = np.array([[1, 0, -px], [0, 1, -py], [0, 0, 1.0]]); T2 = np.array([[1, 0, px + dx], [0, 1, py + dy], [0, 0, 1.0]])
    return T2 @ R @ T1

PAD = 6
CW, CH = W + 2 * PAD, H + PAD + 2

def render(pose, k, hi):
    """k = output pixels per sprite pixel. hi=True samples the EPX x8 part (RotSprite look)."""
    M = {}
    for n in ('torso', 'legs', 'head', 'armL', 'armR'):
        rot, dx, dy = pose.get(n, (0, 0, 0))
        m = mat(rot, PIV[n], dx, dy)
        M[n] = (M[PARENT[n]] @ m) if PARENT[n] else m
    M['back'] = M['torso']
    oy, ox = np.mgrid[0:CH * k, 0:CW * k]
    pts = np.stack([(ox + 0.5) / k - PAD, (oy + 0.5) / k - PAD, np.ones_like(ox, float)], 0).reshape(3, -1)
    can = np.zeros((CH * k, CW * k, 4), np.uint8)
    for n in ('back', 'legs', 'armL', 'torso', 'head', 'armR'):
        inv = np.linalg.inv(M[n]) @ pts
        srcimg, s = (up8[n], 8) if hi else (parts[n], 1)
        sx = np.floor(inv[0] * s).astype(int); sy = np.floor(inv[1] * s).astype(int)
        ok = (sx >= 0) & (sy >= 0) & (sx < W * s) & (sy < H * s)
        px = np.zeros((sx.size, 4), np.uint8); px[ok] = srcimg[sy[ok], sx[ok]]
        px = px.reshape(CH * k, CW * k, 4); m = px[..., 3] > 0
        can[m] = px[m]
    return can

def breath(t):
    if t < .35: x = t / .35; return x * x * (3 - 2 * x)
    if t < .50: return 1.0
    if t < .85: x = (t - .5) / .35; return 1 - x * x * (3 - 2 * x)
    return 0.0

def glow(a, k):
    a = a.copy(); e = (a[..., 2].astype(int) > a[..., 0].astype(int) + 70) & (a[..., 3] > 0)
    a[e, :3] = np.clip(a[e, :3].astype(int) + (k * np.array([60, 80, 40])).astype(int), 0, 255); return a

def pose(t):
    s = breath(t); sh = breath((t - 0.06) % 1)              # head and arms follow the chest a little late
    return {'torso': (-1.5 * s, 0, -1.0 * s),                 # chest leans back + rises 1 px
            'head': (2.0 * sh, 0, 0),
            'armL': (-3.0 * sh, 0, 0),                        # heavy fist swings up a little
            'armR': (4.0 * sh, 0, 0)}                         # raised fist rocks back

Z = 3
FPS, SEC = 24, 2.4
N = int(FPS * SEC)
font = ImageFont.truetype('C:/Windows/Fonts/tahoma.ttf', 14)
titles = ['1 โค้ด squash แบบ 3', 'R1 หมุนชิ้น (ยังเป็นพิกเซล)', 'R2 หมุนชิ้น (ละเอียดจอ)']
frames = []
for f in range(N):
    t = f / N; s = breath(t); p = pose(t)
    # 1 squash
    b = Image.fromarray(glow(spr, s)).resize((W * Z, H * Z), Image.NEAREST)
    b = b.resize((round(W * Z * (1 + .008 * s)), round(H * Z * (1 - .012 * s))), Image.NEAREST)
    c1 = Image.new('RGBA', (CW * Z, CH * Z)); c1.alpha_composite(b, ((CW * Z - b.width) // 2, (PAD + H) * Z - b.height))
    r1 = Image.fromarray(glow(render(p, 1, True), s)).resize((CW * Z, CH * Z), Image.NEAREST)
    r2 = Image.fromarray(glow(render(p, Z, False), s))
    sheet = Image.new('RGB', (CW * Z * 3 + 40, CH * Z + 30), (52, 56, 66))
    d = ImageDraw.Draw(sheet)
    for i, im in enumerate((c1, r1, r2)):
        x0 = 10 + i * (CW * Z + 10)
        sheet.paste(im, (x0, 26), im); d.text((x0 + 4, 4), titles[i], font=font, fill=(240, 240, 230))
    frames.append(sheet.convert('P', palette=Image.ADAPTIVE, colors=255))
frames[0].save(out, save_all=True, append_images=frames[1:], duration=round(1000 / FPS), loop=0)
frames[N // 2].convert('RGB').save(out.replace('.gif', '_mid.png'))
print('ok', N, sheet.size)
