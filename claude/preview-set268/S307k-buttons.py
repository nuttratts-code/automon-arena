# set 307 buttons k (owner A1 + "GPT only paints the gradient shading"): lock / reroll button = our painted shop plate
# (S307-plate.png 9-slice, gold trim, TL + BR cut) whose inside is replaced by the GPT fill (S307k-gpt-fill-1 grey = lock,
# -2 blue = reroll). Sizes = game rects x4 (lock 202x40, reroll 202x52 units). Usage: python S307k-buttons.py <g286>
import sys, os
from PIL import Image, ImageDraw, ImageFilter, ImageChops
plate = Image.open("S307-plate.png").convert("RGBA")
def nine(w, h, m=80, d=40):
    out = Image.new("RGBA", (w, h)); tw, th = plate.size
    sx = [0, m, tw - m, tw]; sy = [0, m, th - m, th]; dx = [0, d, w - d, w]; dy = [0, d, h - d, h]
    for i in range(3):
        for j in range(3):
            out.paste(plate.crop((sx[i], sy[j], sx[i + 1], sy[j + 1])).resize((dx[i + 1] - dx[i], dy[j + 1] - dy[j]), Image.LANCZOS), (dx[i], dy[j]))
    return out
def button(w, h, fill):
    b = nine(w, h)
    px = b.load(); m = Image.new("L", (w, h), 0); mp = m.load()
    for y in range(h):
        for x in range(w):
            r, g, bb, a = px[x, y]
            gold = r > bb + 25 and r > 70   # trim pixels (warm), everything else dark navy
            mp[x, y] = 0 if (gold or a < 250) else 255
    ImageDraw.floodfill(m, (w // 2, h // 2), 128)   # the inside = the dark region connected to the centre
    m = m.point(lambda v: 255 if v == 128 else 0).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    f = Image.open(fill).convert("RGBA").resize((w, h), Image.LANCZOS)
    b.paste(f, (0, 0), m)
    # set 307 k3 (owner: k2 band was flat = a sticker; target = ONE crisp edge, the other side fades smoothly): light ramps from 0
    # (soft, left) to SHEEN_A at the crisp right edge, which leans right at the top; tiny noise = no 8-bit banding steps
    import numpy as np
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    edge = w * (0.55 + 0.12 * (1 - yy / (h - 1)))
    u = edge - xx; W = w * 0.35
    al = np.where((u >= 0) & (u <= W), SHEEN_A * np.clip(1 - u / W, 0, 1) ** 1.5, 0.0)
    al = al * (np.asarray(m) / 255.0)
    arr = np.asarray(b).astype(float)
    arr[..., :3] = arr[..., :3] * (1 - al[..., None]) + np.array(SHEEN_C) * al[..., None] + np.random.default_rng(7).uniform(-0.5, 0.5, (h, w, 1))
    b = Image.fromarray(np.clip(arr + 0.5, 0, 255).astype(np.uint8), "RGBA")
    return b
g = sys.argv[1] if len(sys.argv) > 1 else None
SHEEN_A = 0.20
for nm, fl, (w, h) in [("lock", "S307k-gpt-fill-1.png", (808, 160)), ("reroll", "S307k-gpt-fill-2.png", (808, 208))]:
    SHEEN_C = (181, 154, 101) if nm == "lock" else (117, 166, 189)   # r47 sheen colours (warm lock, cool reroll)
    im = button(w, h, fl); im.save("S307k-btn_%s.png" % nm)
    if g: im.save(os.path.join(g, "ui_r48", "btn_%s.png" % nm))
print("buttons ok")
