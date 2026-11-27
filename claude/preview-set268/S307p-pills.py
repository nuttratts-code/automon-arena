# set 307 p (owner: round o "too dark, not pretty" -> "try several"): 4 variants from the ORIGINAL pills (S307-pill_<k>.png),
# all keep the round-o shadow + 2-unit gap (code). p1 = original colour · p2 = original + soft top-light ramp 1.10 -> 0.90 ·
# p3 = value x0.86 (half of o) + ramp · p4 = saturation x0.85 (dusty like the target) + ramp. Writes ui_r48/pill_<k>_p<N>.png;
# the game picks one with S307PILLV=p<N> (s307p-patch.py). Usage: python S307p-pills.py <g286>
import sys, os
import numpy as np
from PIL import Image
V = {"p1": (1.0, 1.0, 1.0, 1.0), "p2": (1.0, 1.0, 1.10, 0.90), "p3": (0.86, 1.0, 1.10, 0.90), "p4": (1.0, 0.85, 1.10, 0.90)}
g = sys.argv[1]
for k in ("hp", "atk", "multi", "burn", "shock", "armor", "heal"):
    im = Image.open("S307-pill_%s.png" % k).convert("RGBA"); a = im.getchannel("A")
    for nm, (val, sat, top, bot) in V.items():
        hsv = np.asarray(im.convert("RGB").convert("HSV")).astype(float)
        hsv[..., 1] = np.clip(hsv[..., 1] * sat, 0, 255)
        hsv[..., 2] = np.clip(hsv[..., 2] * val * np.linspace(top, bot, im.height)[:, None], 0, 255)
        out = Image.fromarray(hsv.round().astype(np.uint8), "HSV").convert("RGB"); out.putalpha(a)
        out.save(os.path.join(g, "ui_r48", "pill_%s_%s.png" % (k, nm)))
print("variants ok")
