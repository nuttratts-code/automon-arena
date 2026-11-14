# set 222: Gemini idle video -> 8 real-pixel frames (route B of skill char-idle). Sample/art tool, not game code.
# Minimal processing on purpose (owner set 222: "the more it is cleaned, the worse it looks"):
#   snap to the video's pixel grid -> background key (colour read from frame 0's border: green #00FF00 or magenta,
#   set 225b) -> peel the background-tinted fringe on the silhouette (<= 4 px deep) + loose specks
#   -> pick the best loop inside the part where the camera is still -> 8 evenly spaced frames -> fill missing dark outline.
# No palette, no temporal median, no optical flow.
# run: python -I video_idle.py <video.mp4> <still_px.png> <out_dir> [n_frames=8] [ms=250] [--frames a,b,c,...]
#   --frames = use these raw frame numbers instead of the automatic loop pick (printed on every run).
import sys, os
import numpy as np, cv2
from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith('--frames')]
force = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--frames=')), None)
vid, still_p, out = args[0], args[1], args[2]
N = int(args[3]) if len(args) > 3 else 8
MS = int(args[4]) if len(args) > 4 else 250
os.makedirs(out, exist_ok=True)

cap = cv2.VideoCapture(vid); fps = cap.get(cv2.CAP_PROP_FPS) or 24
# frames are kept as uint8 and cropped to frame 0's character box + a wide margin: a 1080p clip as int arrays ran
# out of memory on the owner's PC (set 225b)
raw = []; box = None; FW = FH = 0
while True:
    ok, f = cap.read()
    if not ok: break
    f = cv2.cvtColor(f, cv2.COLOR_BGR2RGB)
    if box is None:
        FH, FW = f.shape[:2]
        BGC = np.median(np.concatenate([f[:6].reshape(-1, 3), f[-6:].reshape(-1, 3)]), 0).astype(int)
        ys, xs = np.where(np.abs(f.astype(int) - BGC).sum(-1) >= 90); M = max(60, FH // 8)
        box = (max(0, ys.min() - M), min(FH, ys.max() + M), max(0, xs.min() - M), min(FW, xs.max() + M))
    raw.append(f[box[0]:box[1], box[2]:box[3]].copy())
H0, W0 = raw[0].shape[:2]
GREEN = BGC[1] > BGC[0] + 40 and BGC[1] > BGC[2] + 40
print(f'video {FW}x{FH} {fps:.0f} fps {len(raw)} frames ({len(raw)/fps:.1f} s)  background #%02x%02x%02x (%s)' % (*BGC, 'green' if GREEN else 'magenta'))

def magenta(g): return np.abs(g.astype(int) - BGC).sum(-1) < 90        # = background key (name kept from set 222)
def tint(f):                                                          # pixel mixed with the background colour
    r, g, b = (f[..., k].astype(int) for k in range(3))
    # green bg: dark outline + green -> low red; a yellow spark on green keeps a high red, so it is NOT bleed (SF-1 set 225b)
    return ((g > r + 10) & (g > b + 10) & (r < 140)) if GREEN else (b >= g + 12)

# ---- 1 pixel grid from frame 0 (period by Fourier on edge strength, phase by least change inside blocks) ----
a = raw[0].astype(int); m = ~magenta(a); ys, xs = np.where(m)
reg = a[max(0, ys.min() - 8):ys.max() + 8, max(0, xs.min() - 8):xs.max() + 8].mean(-1)
def spectrum(g):
    g = g - g.mean(); n = np.arange(len(g)); P = np.arange(4, 24, 0.02)
    s = np.array([abs((g * np.exp(2j * np.pi * n / p)).sum()) for p in P]); return P, s / s.max()
P, sx = spectrum(np.abs(np.diff(reg, axis=1)).sum(0)); _, sy = spectrum(np.abs(np.diff(reg, axis=0)).sum(1))
B = P[(sx + sy).argmax()]                                  # one block size that fits both axes
def blockvar(ox, oy):
    yy = (oy + B * np.arange(int((H0 - 5 - oy) / B))).astype(int); xx = (ox + B * np.arange(int((W0 - 5 - ox) / B))).astype(int)
    return sum(np.abs(a[yy + d][:, xx + d] - a[yy + 1][:, xx + 1]).sum() for d in range(2, int(B) - 1))
_, ox, oy = min((blockvar(x, y), x, y) for x in np.arange(0, B, 0.5) for y in np.arange(0, B, 0.5))
cy = (oy + B * (np.arange(int((H0 - 5 - oy) / B) - 1) + 0.5)).astype(int)
cx = (ox + B * (np.arange(int((W0 - 5 - ox) / B) - 1) + 0.5)).astype(int)
print(f'grid block {B:.2f} px  phase ({ox}, {oy})')

# ---- 2 snap + key every frame ----
snap = []
for f in raw:
    g = np.median(np.stack([f[cy + dy][:, cx + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)]), 0).astype(np.uint8)   # 3x3 median: less video noise
    snap.append(np.dstack([g, np.where(magenta(g), 0, 255)]).astype(np.uint8))
snap = np.array(snap)

# ---- 3 camera still? the feet are planted, so the feet strip (bottom 8 rows) must not move or grow ----
# (sparks / lightning change the top and sides of the silhouette, so the whole box is not a good test)
def feet(f):
    al = f[..., 3] > 0; yy, xx = np.where(al); y1 = yy.max(); s = al[y1 - 7:y1 + 1]
    sx = np.where(s.any(0))[0]; return np.array([y1, sx.min(), sx.max()]), int(s.sum())
b0, n0 = feet(snap[0]); stable = len(snap)
for i, f in enumerate(snap):
    b, n = feet(f)
    if np.abs(b - b0).max() > 1 or abs(n - n0) > 0.08 * n0: stable = i; break
print(f'camera still for frames 0..{stable - 1}' + ('' if stable == len(snap) else f'  (zoom/move after {stable})'))
n0 = int((snap[0][..., 3] > 0).sum())

def chg(x, y):
    return ((np.abs(x[..., :3].astype(int) - y[..., :3].astype(int)).max(-1) > 24) | ((x[..., 3] > 0) != (y[..., 3] > 0))).sum()

# ---- 4 loop pick: start/end pair that look most alike, length 1.2-3.0 s, inside the still part ----
if force:
    pick = [int(v) for v in force.split(',')]; print('frames given by hand', pick)
else:
    lo, hi = int(1.2 * fps), int(3.0 * fps); best = None
    for i in range(stable):
        for j in range(i + lo, min(stable, i + hi + 1)):
            c = chg(snap[i], snap[j])
            if best is None or c < best[0]: best = (c, i, j)
    if best is None: sys.exit('video too short or camera never still: need >= 1.2 s of still camera')
    _, i, j = best; L = j - i
    pick = [i + round(k * L / N) for k in range(N)]
    print(f'loop {i}->{j} ({L/fps:.2f} s, seam change {100*best[0]/n0:.1f}%)  frames {",".join(map(str, pick))}')
fr = snap[pick]

# ---- 5 crop to the union box of the picked frames ----
mm = (fr[..., 3] > 0).any(0); yy, xx = np.where(mm)
fr = fr[:, yy.min():yy.max() + 1, xx.min():xx.max() + 1].copy()
H, W = fr.shape[1:3]

def edge(al):
    p = np.pad(al, 1); return al & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
def n4(mask):
    p = np.pad(mask, 1); return p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]

# outline colour = most common dark edge colour of the picked video frames, so filled pixels match the video's own line
# (still_px.png is only a fallback when the video has no dark edge at all)
se = np.concatenate([f[edge(f[..., 3] > 0) & ~tint(f)][:, :3] for f in fr]).astype(int); se = se[se.sum(1) < 150]
if not len(se):
    st = np.asarray(Image.open(still_p).convert('RGBA')); se = st[edge(st[..., 3] > 0)][:, :3].astype(int); se = se[se.sum(1) < 150]
v, c = np.unique(se, axis=0, return_counts=True); OUT = v[c.argmax()]
print('outline colour #%02x%02x%02x' % tuple(OUT))

# effects outside the body (sparks, lightning, loose glow) never get a dark rim (owner rule set 225).
# effect pixel = outside the body core AND a colour the still does not have (so a swaying tail, which is outside
# the core but in body colours, still counts as body and keeps its outline).
# body core = pixels present in >= 5 of the 8 frames, grown by 2 px. Dark rim pixels the video drew around an
# effect (dark, outside the core, touching an effect pixel) are made transparent; no outline is added next to effects.
def grow(m, k):
    for _ in range(k): m = m | n4(m)
    return m
core = grow((fr[..., 3] > 0).sum(0) >= 5, 2)
_st = np.asarray(Image.open(still_p).convert('RGBA')); PAL = np.unique(_st[_st[..., 3] > 0][:, :3], axis=0).astype(int)
def offpal(f, d=60):
    px = f[..., :3].reshape(-1, 3).astype(int); best = np.full(len(px), 1 << 30)
    for c in PAL: best = np.minimum(best, ((px - c) ** 2).sum(1))
    return (best > d * d).reshape(f.shape[:2])
added = []; fxrim = []; peeled = []
for f in fr:
    np_ = 0
    for _ in range(4):                                            # background-tinted rim, silhouette inward (set 225b)
        al = f[..., 3] > 0; k = al & n4(~al) & tint(f)
        if not k.any(): break
        f[k, 3] = 0; np_ += int(k.sum())
    for _ in range(3):                                            # 1-px spurs
        al = f[..., 3] > 0; p = np.pad(al, 1)
        nb = sum(p[1 + dy:1 + dy + al.shape[0], 1 + dx:1 + dx + al.shape[1]].astype(int) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)
        k = al & (nb <= 1)
        if not k.any(): break
        f[k, 3] = 0; np_ += int(k.sum())
    nc, lab, st_, _c = cv2.connectedComponentsWithStats((f[..., 3] > 0).astype(np.uint8), connectivity=8)
    small = np.isin(lab, [k for k in range(1, nc) if st_[k, cv2.CC_STAT_AREA] < 4]); f[small, 3] = 0
    f[f[..., 3] == 0, :3] = 0; peeled.append(np_ + int(small.sum()))
    al = f[..., 3] > 0
    dark = f[..., :3].astype(int).sum(-1) < 150
    fx = al & ~core & ~dark & offpal(f)                           # effect pixels outside the body
    nc, lab = cv2.connectedComponents(al.astype(np.uint8), connectivity=8)
    loose = np.isin(lab, [k for k in range(1, nc) if not (core & (lab == k)).any()])   # bits not touching the body = effect, any colour
    rim = al & ~core & dark & (n4(fx) | loose)                    # video's own dark rim around them
    fx = fx | (loose & ~dark)
    f[rim, 3] = 0; fxrim.append(int(rim.sum()))
    al = f[..., 3] > 0
    light = edge(al) & ~dark & ~fx                                # body edge pixel that is not dark = outline missing
    add = n4(light) & ~al & ~n4(fx)
    f[add, :3] = OUT; f[add, 3] = 255; added.append(int(add.sum()))
print('background rim + specks removed per frame', peeled)
print('outline pixels added per frame', added)
print('dark rim removed around effects per frame', fxrim)

# ---- 6 export ----
ims = [Image.fromarray(f) for f in fr]
for k, im in enumerate(ims): im.save(f'{out}/idle_{k}.png')
sheet = Image.new('RGBA', (W * N, H))
for k, im in enumerate(ims): sheet.paste(im, (k * W, 0))
sheet.save(f'{out}/sheet_{N}x1_{W}x{H}.png')
ims[0].save(f'{out}/anim.png', save_all=True, append_images=ims[1:], duration=MS, loop=0, disposal=1)   # APNG: Pixelorama opens it as frames
Z = 4; g = []
for im in ims:
    c2 = Image.new('RGB', (W * Z + 20, H * Z + 20), (120, 128, 140))
    big = im.resize((W * Z, H * Z), Image.NEAREST); c2.paste(big, (10, 10), big)
    g.append(c2.convert('P', palette=Image.ADAPTIVE, colors=255))
g[0].save(f'{out}/preview.gif', save_all=True, append_images=g[1:], duration=MS, loop=0)
print(f'size {W}x{H}  {N} frames x {MS} ms -> {out}')
