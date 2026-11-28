# set 307 card frames j (owner): card frame colour follows the creature rarity. Owner picks: A1 whole frame recoloured, metal
# shading kept · B1 common = silver grey (gem colour) · C1 sample shop = one card per rarity. Gold pixels of g286 ui_r48/card_frame.png
# (hue 15-60 deg, sat > 0.18) get the rarity colour scaled by their brightness vs the median gold; navy strip + dark outline untouched.
# set 307 v (owner A2 + B1): the hard mask left the near-white top flare untinted with a stepped edge -> soft weight
# w = smoothstep(sat 0..0.30) * smoothstep(hue 5..15) * (1 - smoothstep(hue 62..75)); the untinted share of bright pixels
# turns pure white (no gold cream cast) -> white flare core fading into the rarity colour. Hard mask still sets the median.
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
def ss(e0, e1, x): t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
w = (ss(0.0, 0.30, sat) * ss(5, 15, hue) * (1 - ss(62, 75, hue)) * (a[..., 3] > 0))[..., None]   # set 307 v soft weight
nb = ss(0.55, 0.85, mx)[..., None]   # only bright pixels lose the gold cast (dark outline untouched)
keep = np.repeat(mx[..., None], 3, -1) * 255 * nb + a[..., :3] * (1 - nb)
yref = np.median(Y[gold])
RAR = {"mute": "#a7b6c6", "r-unc": "#7fd18c", "r-rare": "#7fb2f0", "r-epic": "#c9a2f2"}
for tok, hx in RAR.items():
    cr, cg, cb = (int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)); h, s, v = colorsys.rgb_to_hsv(cr, cg, cb)
    col = np.array(colorsys.hsv_to_rgb(h, min(1, s * (0.9 if tok == "mute" else 1.25)), 1.0))   # metal: full value, shading from the gold
    cy = 0.299 * col[0] + 0.587 * col[1] + 0.114 * col[2]
    t = (Y / yref * 0.66)[..., None]   # 0.66 = same visual weight as the painted gold (0.80 read brighter than gold)
    base = np.clip(col * t, 0, 1)
    hi = np.clip(t - 1, 0, 1); out = base * (1 - hi) + hi   # above full colour -> towards white (specular)
    res = a.copy(); res[..., :3] = out * 255 * w + keep * (1 - w)   # set 307 v: was np.where(gold, out, a) = hard cut
    Image.fromarray(res.round().astype(np.uint8), "RGBA").save(os.path.join(g, "ui_r48", "card_frame_%s.png" % tok))
src.save(os.path.join(g, "ui_r48", "card_frame_r-legend.png")); print("frames ok", int(gold.sum()), "gold px, median Y", round(float(yref), 3))
