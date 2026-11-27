# set 307 o (owner A1 after "the pills look pasted on"): from the ORIGINAL pills (S307-pill_<k>.png, round n's saturation x1.3
# dropped): value x VAL (ours v 0.54 / 0.73 vs target 0.37 / 0.53 = x0.69 / x0.73) + a top-light -> bottom-dark ramp over the
# pill height (x TOP at the top row, x BOT at the bottom) = lit from above like the target. Hue, saturation, marks, alpha kept.
# The drop shadow + 2-unit gap from the frame are in code (s307o-patch.py). Usage: python S307o-pills.py [<g286>]
import sys, os
import numpy as np
from PIL import Image
VAL, TOP, BOT = 0.72, 1.18, 0.80
g = sys.argv[1] if len(sys.argv) > 1 else None
for k in ("hp", "atk", "multi", "burn", "shock", "armor", "heal"):
    im = Image.open("S307-pill_%s.png" % k).convert("RGBA")
    a = im.getchannel("A"); h = im.height
    hsv = np.asarray(im.convert("RGB").convert("HSV")).astype(float)
    ramp = np.linspace(TOP, BOT, h)[:, None]
    hsv[..., 2] = np.clip(hsv[..., 2] * VAL * ramp, 0, 255)
    out = Image.fromarray(hsv.round().astype(np.uint8), "HSV").convert("RGB"); out.putalpha(a)
    out.save("S307o-pill_%s.png" % k)
    if g: out.save(os.path.join(g, "ui_r48", "pill_%s.png" % k))
print("pills ok")
