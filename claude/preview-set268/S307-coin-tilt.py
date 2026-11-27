# set 307 b: owner "where is the deep recess I asked for" -> the coin face is sunk in (inner oval darker, shadow band
# inside the top-left edge, light band inside the bottom-right edge, dark ring line), like the target coin's inset face.
# set 307: owner "coin should be diagonal" -> tilt 50 deg (owner pick on S307-coin-angles.png) + dark outline and a deep
# drop shadow under it like the owner target picture (S301-owner-target.webp). Source = the GPT coin at full size
# (S303r51-gpt-pills-2.png, right half), keyed like S303r51-split-pills.py. Out: S307-coin.png (RGBA, 64 px tall).
import numpy as np
from PIL import Image, ImageFilter
im = np.asarray(Image.open("S303r51-gpt-pills-2.png").convert("RGB")).astype(np.float32)[:, 700:]
r, g, b = im[..., 0], im[..., 1], im[..., 2]
a = 1.0 - np.clip(((np.minimum(r, b) - g) - 60.0) / 120.0, 0.0, 1.0)
spill = np.clip(np.minimum(r, b) - g, 0, None) * (1.0 - a)
rgba = np.dstack([np.stack([r - spill, g, b - spill], -1).clip(0, 255), a * 255.0]).astype(np.uint8)
# --- recess on the face (before rotation). Face ellipse measured on the GPT coin: x 57-675, top 274, face height ~390.
H0, W0 = rgba.shape[:2]
yy, xx = np.mgrid[0:H0, 0:W0].astype(np.float32)
fcx, fcy, fa, fb = 366.0, 274 + 195.0, 309.0, 195.0
def ell(k, dx=0.0, dy=0.0):
    return (((xx - fcx - dx) / (fa * k)) ** 2 + ((yy - fcy - dy) / (fb * k)) ** 2) <= 1.0
inner = ell(0.80)
d = 16.0
shadow_band = inner & ~ell(0.80, d, d * 0.65)        # top-left inside edge
light_band = inner & ~ell(0.80, -d, -d * 0.65)       # bottom-right inside edge
ring = ell(0.815) & ~ell(0.785)
col = rgba[..., :3].astype(np.float32)
col[inner] *= 0.80
col[shadow_band] *= 0.62
col[light_band] = col[light_band] * 0.55 + np.array([255, 236, 150]) * 0.45
col[ring & ~light_band] *= 0.55
rgba = np.dstack([col.clip(0, 255), rgba[..., 3:]]).astype(np.uint8)
c = Image.fromarray(rgba); c = c.crop(c.getbbox())
c = c.rotate(50, resample=Image.BICUBIC, expand=True); c = c.crop(c.getbbox())
H = c.height; ol = int(H * 0.035); sh = int(H * 0.09)          # outline + shadow drop, as share of coin height
pad = ol + sh + 4
W2, H2 = c.width + 2 * pad, c.height + 2 * pad
alpha = Image.new("L", (W2, H2)); alpha.paste(c.getchannel("A"), (pad, pad))
outl = alpha.filter(ImageFilter.MaxFilter(2 * ol + 1))
shad = Image.new("L", (W2, H2)); shad.paste(outl, (int(sh * 0.35), sh))
shad = shad.filter(ImageFilter.GaussianBlur(ol * 0.6))
dark = (26, 14, 3)
out = Image.new("RGBA", (W2, H2))
out.alpha_composite(Image.merge("RGBA", [Image.new("L", (W2, H2), v) for v in dark] + [shad.point(lambda v: int(v * 0.85))]))
out.alpha_composite(Image.merge("RGBA", [Image.new("L", (W2, H2), v) for v in dark] + [outl]))
out.alpha_composite(c, (pad, pad))
out = out.crop(out.getbbox())
out = out.resize((max(1, round(out.width * 64 / out.height)), 64), Image.LANCZOS)
out.save("S307-coin.png"); print(out.size)
