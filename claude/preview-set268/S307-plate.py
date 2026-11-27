# set 307 shop plate (owner: "only the rectangle, the rest gets added later"): plain 2-cut-corner plate from GPT attempt 2.
# GPT #2 has a Lv tab + raised right step on the top edge -> keep its bottom half (square BL, cut BR) and make the top half
# = the bottom half rotated 180 deg (cut TL, square TR). Key per chatgpt.md §3 (alpha from magenta, despill), 9-sliced in r43.gd.
import numpy as np
from PIL import Image
a = np.asarray(Image.open("S307-gpt-plate-2.png").convert("RGB")).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
al = 1 - np.clip(((np.minimum(r, b) - g) - 60) / 120, 0, 1)
m = np.minimum(r, b) - g; sp = np.clip(m, 0, None) * (1 - al)   # despill r/b toward g on soft edges
rgb = np.dstack([r - sp, g, b - sp]).clip(0, 255)
img = np.dstack([rgb, al * 255]).astype(np.uint8)
X0, X1, Y1 = 44, 2128, 552           # body x range, bottom
H = 176                               # half height (bottom half rows Y1-H .. Y1)
bot = img[Y1 - H:Y1, X0:X1]
top = bot[::-1, ::-1]
out = np.concatenate([top, bot], axis=0)
Image.fromarray(out).save("S307-plate.png"); print(out.shape)
