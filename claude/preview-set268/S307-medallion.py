# set 307 tribe badge: owner "only the circle, our symbols are OK" -> GPT drew an empty light-grey round medallion
# (S307-gpt-medallion-2.png = crisper outline, used). Key magenta (chatgpt.md §Painted UI pieces 3), crop, 256 px.
import numpy as np
from PIL import Image
im = np.asarray(Image.open("S307-gpt-medallion-2.png").convert("RGB")).astype(np.float32)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
a = 1.0 - np.clip(((np.minimum(r, b) - g) - 60.0) / 120.0, 0.0, 1.0)
spill = np.clip(np.minimum(r, b) - g, 0, None) * (1.0 - a)
rgba = np.dstack([np.stack([r - spill, g, b - spill], -1).clip(0, 255), a * 255.0]).astype(np.uint8)
m = Image.fromarray(rgba); m = m.crop(m.getbbox()).resize((256, 256), Image.LANCZOS)
m.save("S307-medallion.png"); print(m.size)
