import sys
from PIL import Image, ImageFilter
import numpy as np
src, dst = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
r, g, b = im[...,0], im[...,1], im[...,2]
m = np.clip((np.minimum(r, b) - g - 15) / 50.0, 0, 1)   # magenta-ness
a = (m < 0.35).astype(np.uint8) * 255
a = np.asarray(Image.fromarray(a).filter(ImageFilter.MinFilter(5)))   # eat the pink fringe (2 px)
# despill everywhere magenta leaks: r and b may not exceed g by much
r2 = np.minimum(r, g * 1.05 + 10); b2 = np.minimum(b, g * 0.9 + 5)
img = Image.fromarray(np.clip(np.dstack([r2, g, b2, a]), 0, 255).astype(np.uint8), "RGBA")
img = img.crop(img.getbbox())
if img.width > 1024:
    img = img.resize((1024, round(img.height * 1024 / img.width)), Image.LANCZOS)
img.save(dst); print(img.size)
