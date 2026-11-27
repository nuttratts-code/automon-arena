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
    # set 307 k2 (owner: the sheen is a CRISP band, as the target): sharp-edged diagonal parallelogram, leaning right at the top
    band = Image.new("L", (w, h), 0)
    x0 = w * 0.45
    ImageDraw.Draw(band).polygon([(x0, 0), (x0 + w * 0.22, 0), (x0 + w * 0.10, h), (x0 - w * 0.12, h)], fill=int(255 * SHEEN_A))
    b.paste(SHEEN_C, (0, 0), ImageChops.multiply(band, m))
    return b
g = sys.argv[1] if len(sys.argv) > 1 else None
SHEEN_A = 0.13
for nm, fl, (w, h) in [("lock", "S307k-gpt-fill-1.png", (808, 160)), ("reroll", "S307k-gpt-fill-2.png", (808, 208))]:
    SHEEN_C = (181, 154, 101) if nm == "lock" else (117, 166, 189)   # r47 sheen colours (warm lock, cool reroll)
    im = button(w, h, fl); im.save("S307k-btn_%s.png" % nm)
    if g: im.save(os.path.join(g, "ui_r48", "btn_%s.png" % nm))
print("buttons ok")
