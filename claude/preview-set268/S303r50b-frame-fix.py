# set 303 r50b: owner "why is the bottom edge chipped?" -> cause: the r49b split (S303r49b-split-card.py) took the
# frame's bright inner bevel (rows 344-352 of 364) in the bottom-centre for body, because GPT's near-white feet glow
# had the same grey level -> hole x~178-288 (since r49b; r49c copied it). Fix: rebuild those rows by blending the
# good columns either side (x=172 and x=294) across the hole. Usage: python -I S303r50b-frame-fix.py <in> <out>
import sys
from PIL import Image
f = Image.open(sys.argv[1]).convert("RGBA"); px = f.load()
L, R = 172, 294
for y in range(343, 353):
    a, b = px[L, y], px[R, y]
    for x in range(L + 1, R):
        t = (x - L) / (R - L)
        px[x, y] = tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(4))
f.save(sys.argv[2])
