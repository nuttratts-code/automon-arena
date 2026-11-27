# set 307 n (owner: "the stat pills are much paler than the picture"): A2 = more saturated, brightness kept · B2 stripes/marks
# kept · C1 all 7 kinds. Measured PC (S307m vs target, median HSV of the pill body): HP ours s 0.44 v 0.54 / target s 0.55 v 0.37,
# ATK ours s 0.59 v 0.73 / target s 0.61 v 0.53. HSV: s' = min(1, s * SAT), h and v unchanged, alpha unchanged (white marks
# have low s, so they stay white). Source = S307-pill_<k>.png (= the ui_r48 files before this round). Usage: python S307n-pills.py [<g286>]
import sys, os
import numpy as np
from PIL import Image
SAT = 1.3
g = sys.argv[1] if len(sys.argv) > 1 else None
for k in ("hp", "atk", "multi", "burn", "shock", "armor", "heal"):
    im = Image.open("S307-pill_%s.png" % k).convert("RGBA")
    a = im.getchannel("A")
    hsv = np.asarray(im.convert("RGB").convert("HSV")).astype(float)
    hsv[..., 1] = np.clip(hsv[..., 1] * SAT, 0, 255)
    out = Image.fromarray(hsv.round().astype(np.uint8), "HSV").convert("RGB"); out.putalpha(a)
    out.save("S307n-pill_%s.png" % k)
    if g: out.save(os.path.join(g, "ui_r48", "pill_%s.png" % k))
print("pills ok, sat x", SAT)
