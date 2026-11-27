# set 307 e: owner supplied the grey orb (S307e-owner-orb.webp) + a red fire target (S307e-owner-orb-fire-target.webp): "use this".
# Measured grey->red: mid grey 150 -> (238,69,31) = the tribe colour, dark 31 -> (92,0,4), white highlight stays white.
# So: base = grey/150 (mid = full tribe colour under the multiply tint), the part above 150 -> white highlight layer (untinted).
import numpy as np
from PIL import Image
im = Image.open("S307e-owner-orb.webp").convert("RGBA")
im = im.crop(im.getbbox())
w, h = im.size; s = max(w, h)
sq = Image.new("RGBA", (s, s), (0, 0, 0, 0)); sq.paste(im, ((s - w) // 2, (s - h) // 2))
sq = sq.resize((256, 256), Image.LANCZOS)
a = np.asarray(sq).astype(np.float32)
g = a[..., :3].mean(axis=2); al = a[..., 3]
base = np.clip(g / 150.0, 0, 1) * 255
spec = np.clip((g - 150.0) / 103.0, 0, 1) * al
Image.fromarray(np.dstack([base, base, base, al]).astype(np.uint8)).save("S307-orb.png")
Image.fromarray(np.dstack([np.full(g.shape + (3,), 255.0), spec]).astype(np.uint8)).save("S307-orb-spec.png")
print("ok")
