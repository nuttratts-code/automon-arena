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
