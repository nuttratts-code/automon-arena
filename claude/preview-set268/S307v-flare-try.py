# scratch: before / soft-A (white core kept) / soft-B (core pale tint) x8 zooms of the top flare, 4 tints + gold
import sys, os, colorsys, numpy as np
from PIL import Image, ImageDraw
sp = sys.argv[1]
src = Image.open("card_frame.png").convert("RGBA"); a = np.asarray(src).astype(float); rgb = a[..., :3]/255
mx = rgb.max(-1); mn = rgb.min(-1); sat = np.where(mx > 0, (mx-mn)/np.maximum(mx, 1e-6), 0)
r, gg, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
hue = np.degrees(np.arctan2(np.sqrt(3)*(gg-b), 2*r-gg-b)) % 360
hard = ((hue > 15) & (hue < 60) & (sat > 0.18) & (a[..., 3] > 0)).astype(float)
def ss(e0, e1, x): t = np.clip((x-e0)/(e1-e0), 0, 1); return t*t*(3-2*t)
soft = ss(0.0, 0.30, sat) * ss(5, 15, hue) * (1-ss(62, 75, hue)) * (a[..., 3] > 0)
Y = 0.299*r + 0.587*gg + 0.114*b; yref = np.median(Y[hard > 0])
RAR = {"mute": "#a7b6c6", "r-unc": "#7fd18c", "r-rare": "#7fb2f0", "r-epic": "#c9a2f2"}
def build(tok, w, floor=0.0, neutral=False):
    hx = RAR[tok]; cr, cg, cb = (int(hx[i:i+2], 16)/255 for i in (1, 3, 5)); h, s, v = colorsys.rgb_to_hsv(cr, cg, cb)
    col = np.array(colorsys.hsv_to_rgb(h, min(1, s*(0.9 if tok == "mute" else 1.25)), 1.0))
    t = (Y/yref*0.66)[..., None]; base = np.clip(col*t, 0, 1); hi = np.clip(t-1, 0, 1); out = base*(1-hi)+hi
    if floor:   # B: white core -> pale rarity colour (white mixed with the tint)
        pale = 1 - (1-col)*floor; out = np.where((w < 1)[..., None], out*w[..., None] + np.clip(rgb*pale, 0, 1)*(1-w[..., None]), out); w = np.ones_like(w)*(a[..., 3] > 0)
    nb = ss(0.55, 0.85, mx)[..., None]   # only bright pixels lose the gold cast (dark outline untouched)
    keep = (np.repeat(mx[..., None], 3, -1)*255*nb + a[..., :3]*(1-nb)) if neutral else a[..., :3]
    res = a.copy(); res[..., :3] = out*255*w[..., None] + keep*(1-w[..., None])
    return Image.fromarray(res.round().astype(np.uint8), "RGBA")
crop = (140, 0, 350, 20); Z = 6
rows = [("gold", [src, src, src, src])] + [(t, [build(t, hard), build(t, soft), build(t, soft, neutral=True), build(t, soft, 0.35)]) for t in RAR]
cw, ch = (crop[2]-crop[0])*Z, (crop[3]-crop[1])*Z
labs = ["before (now) - hard cut", "A1: cream core (gold cast) + soft fade", "A2: pure white core + soft fade", "A3: pale tinted core + soft fade"]
blk = 5*(ch+4) + 26
sheet = Image.new("RGB", (cw + 20, 4*blk + 10), (30, 30, 34)); d = ImageDraw.Draw(sheet)
for j, lab in enumerate(labs):
    y0 = 6 + j*blk; d.text((10, y0), lab, fill=(240, 240, 240))
    for i, (tok, ims) in enumerate(rows):
        z = ims[j].crop(crop).resize((cw, ch), Image.NEAREST); bg = Image.new("RGBA", z.size, (30, 30, 34, 255)); bg.alpha_composite(z)
        sheet.paste(bg.convert("RGB"), (10, y0 + 20 + i*(ch+4)))
sheet.save(os.path.join(sp, "flare_try.png")); print("ok", sheet.size)
