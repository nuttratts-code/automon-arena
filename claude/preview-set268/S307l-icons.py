# set 307 icons l (owner B1): key the GPT icons (S307l-gpt-icon-1 = gold padlock, -2 = cyan reroll arrow) off magenta,
# crop, scale to 128 px tall (~2x the PC size), reroll gets a soft cyan glow made from its own alpha (GPT drew none on purpose:
# a glow painted on magenta keys out pink). Writes S307l-icon_lock.png / S307l-icon_reroll.png (+ g286/ui_r48/icon_*.png).
# The reroll file is padded by PAD on each side for the glow: the game draws it PAD-scaled (see s307icon-patch.py).
# Usage: python S307l-icons.py [<g286>]
import sys, os
import numpy as np
from PIL import Image, ImageFilter
PAD = 0.25   # glow room per side, as a share of the icon height
def key(fn):
    a = np.asarray(Image.open(fn).convert("RGB")).astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    al = 1 - np.clip(((np.minimum(r, b) - g) - 60) / 120, 0, 1)   # chatgpt.md §Painted UI pieces step 3
    m = np.minimum(r, b) - g                                          # despill: pull magenta out of the edge pixels
    sp = np.clip(m, 0, None) * (1 - al)
    a[..., 0] -= sp; a[..., 2] -= sp
    im = Image.fromarray(np.dstack([np.clip(a, 0, 255), al * 255]).astype(np.uint8), "RGBA")
    return im.crop(im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
def fit(im, h=128):
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
g = sys.argv[1] if len(sys.argv) > 1 else None
lock = fit(key("S307l-gpt-icon-1.png"))
rr = fit(key("S307l-gpt-icon-2.png"))
p = round(rr.height * PAD)
W, H = rr.width + 2 * p, rr.height + 2 * p
al = Image.new("L", (W, H), 0); al.paste(rr.getchannel("A"), (p, p))
glow = np.asarray(al.filter(ImageFilter.GaussianBlur(p * 0.42))).astype(float) / 255.0
glow = np.clip(glow * 1.6, 0, 1) * 0.55                               # soft halo, strongest next to the ring
base = np.zeros((H, W, 4)); base[..., 0], base[..., 1], base[..., 2] = 0x4F, 0xD8, 0xFF; base[..., 3] = glow * 255
out = Image.fromarray(base.astype(np.uint8), "RGBA")
out.alpha_composite(rr, (p, p))
for nm, im in (("lock", lock), ("reroll", out)):
    im.save("S307l-icon_%s.png" % nm)
    if g: im.save(os.path.join(g, "ui_r48", "icon_%s.png" % nm))
print("icons ok", lock.size, out.size, "pad", p)
