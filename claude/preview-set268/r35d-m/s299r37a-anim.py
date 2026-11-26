# set 299 r37a MOCK: r36y v1 light on the r37a flush frame; mask = the real frame geometry (cell rect, ring 6 base px = 13.3 screen px, cut 6, + strip), whole ring incl. top + left (owner)
# technique (Unity ShineEffector / CSS sweep / melonJS ShineEffect): soft gradient band, light-ADDING blend (screen, tinted by
# the frame colour so it does not go grey), ~30 deg slant, band ~18 % of the card, ease-in-out motion, x4 supersampled mask
# (no stair-steps), soft mask edge, pause between sweeps. v1 = one soft band · v2 = soft halo + thin bright core
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
src, outp, ver, zoom = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
base = np.asarray(Image.open(src).convert('RGB').crop((570, 24, 1830, 250))).astype(np.float32) / 255
H, W, _ = base.shape
cards = [(578 + 250 * i - 570, 8, 815 + 250 * i - 570, 211) for i in range(5)]
st = 32 - 24 + (92 - 23) * 1920 / 868   # strip top (cell coords)
S = 4   # supersample the clip mask
clip = Image.new('L', (W * S, H * S), 0)
cd = ImageDraw.Draw(clip)
SC = 1920 / 868   # base px -> screen px
def cutpoly(x0, y0, x1, y1, a):
    return [((x0 + a) * S, y0 * S), (x1 * S, y0 * S), (x1 * S, (y1 - a) * S), ((x1 - a) * S, y1 * S), (x0 * S, y1 * S), (x0 * S, (y0 + a) * S)]
for x0, y0, x1, y1 in cards:
    k, fw = 6 * SC, 6 * SC
    cd.polygon(cutpoly(x0, y0, x1, y1, k), fill=255)
    ai = max(0.0, k - fw * 0.5858)
    cd.polygon(cutpoly(x0 + fw, y0 + fw, x1 - fw, st, ai), fill=0)   # art window stays dark
clip = np.asarray(clip.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 255
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
N, T, SW = 48, 3.0, 1.1   # 48 frames, 3 s loop, sweep 1.1 s
ease = lambda u: 0.5 - 0.5 * np.cos(np.pi * u)
frames = []
for f in range(N):
    t = f / N * T
    a = np.zeros((H, W), np.float32)
    for i, (x0, y0, x1, y1) in enumerate(cards):
        u = (t - i * 0.10) / SW
        if not 0 <= u <= 1:
            continue
        cw = x1 - x0
        bw = cw * 0.18
        cx = x0 - bw * 2 + (cw + bw * 4) * ease(u)
        d = (xx - cx) + (yy - (y0 + y1) / 2) * np.tan(np.radians(30))   # slanted distance
        inside = (xx >= x0) & (xx <= x1)
        if ver == 1:
            band = np.exp(-(d / (bw * 0.45)) ** 2) * 0.55
        else:
            band = np.exp(-(d / (bw * 0.55)) ** 2) * 0.32 + np.exp(-(d / (bw * 0.10)) ** 2) * 0.55
        a = np.maximum(a, band * inside)
    a = (a * clip)[..., None]
    tint = np.clip(base * 0.5 + 0.6, 0, 1)   # light in the frame's own hue
    out = 1 - (1 - base) * (1 - a * tint)    # screen blend = adds light
    img = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    if zoom > 1:
        img = img.crop((0, 0, 510, H)).resize((510 * zoom, H * zoom), Image.NEAREST)
    frames.append(img)
frames[0].save(outp, save_all=True, append_images=frames[1:], duration=int(T / N * 1000), loop=0, lossless=True)
print(outp)
