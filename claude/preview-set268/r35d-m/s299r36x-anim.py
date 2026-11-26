import sys, math
from PIL import Image, ImageDraw, ImageChops
src, outp, mode, zoom = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
base = Image.open(src).convert('RGB').crop((570, 24, 1830, 250))   # shop row
W, H = base.size
cards = [(578 + 250 * i - 570, 32 - 24, 815 + 250 * i - 570, 235 - 24) for i in range(5)]
strip_top = 186 - 24
N, T = 40, 2.4
frames = []
for f in range(N):
    t = f / N * T
    glow = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(glow)
    for i, (x0, y0, x1, y1) in enumerate(cards):
        u = (t - i * 0.12) / 0.9   # sweep takes 0.9 s, cards staggered
        if 0 <= u <= 1:
            cw = x1 - x0
            cx = x0 - 60 + (cw + 120) * u
            sl = (y1 - y0) * 0.45
            m = Image.new('L', (W, H), 0)
            md = ImageDraw.Draw(m)
            for wd, a in ((22, 70), (8, 140)):
                md.polygon([(cx + sl, y0), (cx + sl + wd, y0), (cx + wd - sl, y1), (cx - sl, y1)], fill=a)
            clip = Image.new('L', (W, H), 0)
            cd = ImageDraw.Draw(clip)
            if mode == 'A':   # strip + frame only
                cd.rectangle((x0, strip_top, x1, y1), fill=255)
                for k in range(4):
                    cd.rectangle((x0 + k, y0 + k, x1 - k, y1 - k), outline=255)
            else:             # whole card face
                cd.polygon([(x0 + 5, y0), (x1, y0), (x1, y1 - 5), (x1 - 5, y1), (x0, y1), (x0, y0 + 5)], fill=255)
            glow = ImageChops.lighter(glow, ImageChops.multiply(m, clip))
    img = Image.composite(Image.new('RGB', (W, H), (255, 255, 240)), base, glow)
    if mode == 'B':   # twinkling glints
        gd = ImageDraw.Draw(img)
        for i, (x0, y0, x1, y1) in enumerate(cards):
            for j, (gx, gy) in enumerate(((x1 - 7, y0 + 3), (x0 + 4, y1 - 6))):
                s = max(0.0, math.sin(2 * math.pi * (t / 1.2 + i * 0.21 + j * 0.5)))
                r = 1.5 + 4.5 * s
                if r > 2:
                    q = r * 0.22
                    gd.polygon([(gx, gy - r), (gx + q, gy - q), (gx + r, gy), (gx + q, gy + q), (gx, gy + r), (gx - q, gy + q), (gx - r, gy), (gx - q, gy - q)], fill=(255, 255, 255))
    if zoom > 1:
        img = img.crop((0, 0, 510, H)).resize((510 * zoom, H * zoom), Image.NEAREST)
    frames.append(img)
frames[0].save(outp, save_all=True, append_images=frames[1:], duration=int(T / N * 1000), loop=0, lossless=True)
print(outp)
