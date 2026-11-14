# set 221 demo: cut-out rig (Skeleton2D-style) on HL-1 vs code idle. Sample only, not game code.
# run: python -I s221-rig-demo.py <hl1_px.png> <out.gif>
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
spr = np.asarray(Image.open(src).convert('RGBA')).copy()
H, W = spr.shape[:2]
ys, xs = np.mgrid[0:H, 0:W]
solid = spr[:, :, 3] > 0
eye = (spr[:, :, 2].astype(int) > spr[:, :, 0].astype(int) + 70) & solid

# ---- part labels from the coordinate grid (84x80) ----
lab = np.full((H, W), 'torso', dtype=object)
lab[(ys < 21) & (xs >= 28) & (xs <= 57)] = 'head'
lab[(xs >= 55) & (ys < 54)] = 'armR'
lab[((xs < 31) & (ys < 58)) | (xs < 18)] = 'armL'
lab[(ys >= 57) & (xs >= 18) & (xs < 62)] = 'legs'
lab[~solid] = ''

DARK = np.array([12, 12, 38, 255], np.uint8)  # outline navy = fills holes behind moved parts

def layer(name):
    a = np.zeros_like(spr)
    m = lab == name
    a[m] = spr[m]
    return a

parts = {n: layer(n) for n in ('legs', 'torso', 'armL', 'head', 'armR')}
# right arm = shoulder (stays near the body) + fist (travels); the gap is filled by repeating the forearm column
SPLIT = 64
shoulderR = parts['armR'].copy(); shoulderR[:, SPLIT:] = 0
fistR = parts['armR'].copy(); fistR[:, :SPLIT] = 0
forearm = parts['armR'][:, SPLIT - 1:SPLIT].copy()
# back fill: dark silhouette of the whole body, so a part that moves 1-2 px shows a dark joint, not a hole
back = np.zeros_like(spr)
back[solid] = DARK

PAD_L, PAD_R, PAD_T = 4, 16, 6
CW, CH = W + PAD_L + PAD_R, H + PAD_T + 2

def paste(canvas, arr, dx, dy):
    im = Image.fromarray(arr)
    canvas.alpha_composite(im, (PAD_L + dx, PAD_T + dy))

def glow(img_arr, t):
    a = img_arr.copy()
    k = 0.5 + 0.5 * np.sin(t * 2 * np.pi)
    m = a[:, :, 3] > 0
    e = eye_mask_for(a)
    a[e, :3] = np.clip(a[e, :3].astype(int) + (k * np.array([60, 80, 40])).astype(int), 0, 255)
    return a

def eye_mask_for(a):
    return (a[:, :, 2].astype(int) > a[:, :, 0].astype(int) + 70) & (a[:, :, 3] > 0)

def forearm_at(dx, dy):
    a = np.zeros((H + 4, W + 20, 4), np.uint8)  # wide enough for the punch reach
    a[2 + dy:2 + dy + H, SPLIT - 1 + dx:SPLIT + dx] = forearm
    return a[2:2 + H]

def rig_frame(off, t):
    c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    paste(c, back, *off['torso'])
    order = ['legs', 'armL', 'torso', 'head', 'armR']
    for n in order:
        if n == 'armR':
            sx, sy = off.get('shoulderR', off['armR'])
            fx, fy = off['armR']
            paste(c, shoulderR, sx, sy)
            for g in range(sx, fx):          # stretch the forearm across the gap
                paste(c, forearm_at(g + 1, fy), 0, 0)
            paste(c, fistR, fx, fy)
            continue
        arr = parts[n]
        if n == 'head':
            arr = glow(arr, t)
        paste(c, arr, *off[n])
    return c

def code_frame(t):
    # option 1 + eye glow: squash anchored at the feet, 2.5% / 1.5%
    s = 0.5 - 0.5 * np.cos(t * 2 * np.pi)
    nh = round(H * (1 - 0.025 * s)); nw = round(W * (1 + 0.015 * s))
    im = Image.fromarray(glow(spr, t)).resize((nw, nh), Image.NEAREST)
    c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    c.alpha_composite(im, (PAD_L + (W - nw) // 2, PAD_T + H - nh))
    return c

N = 24  # 24 frames @ 12 fps = 2 s loop
def idle_off(i):
    t = i / N
    def step(phase):  # 0/1 pixel wave
        return 1 if np.sin((t + phase) * 2 * np.pi) > 0.3 else 0
    return {
        'legs': (0, 0),
        'torso': (0, step(0.0)),
        'head': (0, step(-0.08)),           # head follows the chest a little late
        'armL': (0, step(0.12) + step(0.0)),  # heavy fist sinks 0-2 px
        'armR': (0, -step(0.25)),            # raised fist bobs opposite
    }, t

PUNCH = [  # (frames, armR dx, armR dy, torso dx, head dx)
    (4, 0, 0, 0, 0), (2, -2, 1, -1, -1), (2, -3, 1, -1, -1),   # wind-up
    (1, 6, 0, 1, 1), (3, 10, -1, 2, 2),                        # strike + hold
    (2, 6, 0, 1, 1), (2, 2, 0, 0, 0), (4, 0, 0, 0, 0)]          # return
def punch_offs():
    res = []
    for n, ax, ay, tx, hx in PUNCH:
        for _ in range(n):
            res.append({'legs': (0, 0), 'torso': (tx, 0), 'head': (hx, 0),
                        'armL': (tx, 0), 'armR': (ax + tx, ay),
                        'shoulderR': (tx + (ax // 3 if ax > 0 else ax), 0)})
    return res

pf = punch_offs()
Z = 4
font = ImageFont.truetype('C:/Windows/Fonts/tahoma.ttf', 18)
titles = ['1 โค้ดยืดหด + ตาเรือง', 'A1 ริก idle (ชิ้นส่วนขยับ)', 'A1 ริก ท่าต่อย']
frames = []
T = max(N, len(pf)) * 2
for f in range(T):
    t = (f % N) / N
    panels = [code_frame(t), rig_frame(*idle_off(f % N)), rig_frame(pf[f % len(pf)], t)]
    sheet = Image.new('RGB', (CW * Z * 3 + 40, CH * Z + 40), (58, 70, 62))
    d = ImageDraw.Draw(sheet)
    for k, p in enumerate(panels):
        x0 = 10 + k * (CW * Z + 10)
        # simple ground shadow
        d.ellipse([x0 + (PAD_L + 14) * Z, (PAD_T + H - 3) * Z + 30, x0 + (PAD_L + 66) * Z, (PAD_T + H + 2) * Z + 30], fill=(40, 50, 44))
        sheet.paste(p.resize((CW * Z, CH * Z), Image.NEAREST), (x0, 30), p.resize((CW * Z, CH * Z), Image.NEAREST))
        d.text((x0 + 4, 4), titles[k], font=font, fill=(240, 240, 230))
    frames.append(sheet)
frames[0].save(out, save_all=True, append_images=frames[1:], duration=83, loop=0, disposal=2)
print('ok', len(frames), sheet.size)
