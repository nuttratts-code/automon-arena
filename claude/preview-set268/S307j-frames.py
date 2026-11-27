# set 307 card frames j (owner): card frame colour follows the creature rarity. Owner picks: A1 whole frame recoloured, metal
# shading kept · B1 common = silver grey (gem colour) · C1 sample shop = one card per rarity. Gold pixels of g286 ui_r48/card_frame.png
# (hue 15-60 deg, sat > 0.18) get the rarity colour scaled by their brightness vs the median gold; navy strip + dark outline untouched.
# Legend keeps the painted gold. Usage: python S307j-frames.py <g286>  -> ui_r48/card_frame_<token>.png
import sys, os, colorsys
import numpy as np
from PIL import Image
g = sys.argv[1]; src = Image.open(os.path.join(g, "ui_r48", "card_frame.png")).convert("RGBA")
a = np.asarray(src).astype(float); rgb = a[..., :3] / 255.0
mx = rgb.max(-1); mn = rgb.min(-1); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
r, gg, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
hue = np.degrees(np.arctan2(np.sqrt(3) * (gg - b), 2 * r - gg - b)) % 360
gold = (hue > 15) & (hue < 60) & (sat > 0.18) & (a[..., 3] > 0)
Y = 0.299 * r + 0.587 * gg + 0.114 * b
yref = np.median(Y[gold])
RAR = {"mute": "#a7b6c6", "r-unc": "#7fd18c", "r-rare": "#7fb2f0", "r-epic": "#c9a2f2"}
for tok, hx in RAR.items():
    cr, cg, cb = (int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)); h, s, v = colorsys.rgb_to_hsv(cr, cg, cb)
    col = np.array(colorsys.hsv_to_rgb(h, min(1, s * (0.9 if tok == "mute" else 1.25)), 1.0))   # metal: full value, shading from the gold
    cy = 0.299 * col[0] + 0.587 * col[1] + 0.114 * col[2]
    t = (Y / yref * 0.66)[..., None]   # 0.66 = same visual weight as the painted gold (0.80 read brighter than gold)
    base = np.clip(col * t, 0, 1)
    hi = np.clip(t - 1, 0, 1); out = base * (1 - hi) + hi   # above full colour -> towards white (specular)
    res = a.copy(); res[..., :3] = np.where(gold[..., None], out * 255, a[..., :3])
    Image.fromarray(res.astype(np.uint8), "RGBA").save(os.path.join(g, "ui_r48", "card_frame_%s.png" % tok))
src.save(os.path.join(g, "ui_r48", "card_frame_r-legend.png")); print("frames ok", int(gold.sum()), "gold px, median Y", round(float(yref), 3))
