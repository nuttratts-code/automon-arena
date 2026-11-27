# set 307 odds tag f (owner): "make several thinness levels to pick from, and smaller text" -> PIL list sheet at real PC screen size (1920 wide)
# rows = text size (game units 9 / 8 = 20 / 18 px) x gap text-to-edge (4 / 2 / 1 px). Plate = S307-plate.png 9-slice, background = game shot.
from PIL import Image, ImageDraw, ImageFont
F = r"D:\GitHub\automon-scratch\g286\data\fonts\IBMPlexSansThai-SemiBold.ttf"
bg = Image.open(r"D:\GitHub\automon-scratch\out\s302_S307odds8\5_prepD_zoom70.png").convert("RGBA").crop((60, 380, 700, 444))
plate = Image.open("S307-plate.png").convert("RGBA")
def nine(w, h, m=80, d=6):
    out = Image.new("RGBA", (w, h)); tw, th = plate.size
    sx = [0, m, tw - m, tw]; sy = [0, m, th - m, th]; dx = [0, d, w - d, w]; dy = [0, d, h - d, h]
    for i in range(3):
        for j in range(3):
            if dx[i + 1] > dx[i] and dy[j + 1] > dy[j]:
                out.paste(plate.crop((sx[i], sy[j], sx[i + 1], sy[j + 1])).resize((dx[i + 1] - dx[i], dy[j + 1] - dy[j]), Image.LANCZOS), (dx[i], dy[j]))
    return out
ODDS = [("100%", (176, 184, 200)), ("0%", (123, 224, 138)), ("0%", (127, 180, 255)), ("0%", (201, 160, 255)), ("0%", (255, 208, 96))]
def tag(px, gap):
    f = ImageFont.truetype(F, px); asc, desc = f.getmetrics()
    cap = f.getbbox("0%")[3] - f.getbbox("0%")[1]
    dot = int(px * 0.62); sp = int(px * 0.35)
    items = [("Lv.1", (240, 240, 240))]
    w = 8 + f.getlength("Lv.1") + sp + 2 + sp + sum(dot + 2 + f.getlength(t) + sp for t, _ in ODDS) + 4
    h = cap + 2 * gap + 2
    im = nine(int(w), int(h), d=max(3, min(6, int(h / 2) - 1)))
    d = ImageDraw.Draw(im); y0 = gap + 1 - f.getbbox("0%")[1]; x = 6
    d.text((x, y0), "Lv.1", font=f, fill=(240, 240, 240)); x += f.getlength("Lv.1") + sp
    d.rectangle((x, gap + 1, x + 1, h - gap - 2), fill=(201, 164, 92)); x += 2 + sp
    for t, c in ODDS:
        cy = h / 2; d.ellipse((x, cy - dot / 2, x + dot, cy + dot / 2), fill=tuple(int(v * 0.8) for v in c), outline=(30, 34, 44))
        x += dot + 2; d.text((x, y0), t, font=f, fill=c); x += f.getlength(t) + sp
    return im
LV = [(20, 3), (20, 1), (18, 3), (18, 1), (16, 2), (16, 0)]
lab = ImageFont.truetype(F, 22)
rows = [tag(px, g) for px, g in LV]
W = 640; H = sum(max(64, r.height + 20) for r in rows) + 10
out = Image.new("RGB", (W + 200, H), (24, 28, 36)); y = 5
for (px, g), r in zip(LV, rows):
    rh = max(64, r.height + 20)
    out.paste(bg.resize((W, rh)), (200, y))
    out.paste(r, (200 + 40, y + (rh - r.height) // 2), r)
    ImageDraw.Draw(out).text((10, y + rh // 2), "%s ตัว %d · ขอบ %d" % ("ABCDEF"[LV.index((px, g))], px, g), font=ImageFont.truetype(F, 18), fill=(230, 220, 160), anchor="lm")
    y += rh
out = out.resize((out.width * 2, out.height * 2), Image.LANCZOS); out.save("S307f-odds-levels.png"); print(out.size)
