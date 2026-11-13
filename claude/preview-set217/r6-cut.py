# set 217 R6 (sample only): the owner's Gemini pictures (v3 list) → game textures.
#   python -I r6-cut.py <sky.jpeg> <hills.jpeg> <ground.jpeg> <out_dir>
# sky_clouds.png 2048 wide · far_hills_v3.png 2048 wide, magenta sky → alpha (no pink halo) · ground_tile.png 1024
import sys
import numpy as np
import cv2

sky, hills, ground, out = sys.argv[1:5]
s = cv2.imread(sky)
assert s is not None
cv2.imwrite(out + "/sky_clouds.png", cv2.resize(s, (2048, round(2048 * s.shape[0] / s.shape[1])), interpolation=cv2.INTER_AREA))

h = cv2.imread(hills)
assert h is not None
h = h[: int(h.shape[0] * 0.70)].astype(np.float32)  # drop the big foreground meadow: the 3D ground is the foreground
b, g, r = h[..., 0], h[..., 1], h[..., 2]
# how magenta a pixel is: red + blue high, green low (jpeg noise → soft ramp)
mag = np.clip(((np.minimum(r, b) - g) - 60) / 80, 0, 1)
mag = cv2.GaussianBlur(mag, (0, 0), 1.0)
a = 1 - mag
# un-mix the magenta from the edge pixels so no pink rim stays
key = np.array([255, 0, 255], np.float32)
col = (h - key * mag[..., None]) / np.maximum(a[..., None], 0.05)
col = np.clip(col, 0, 255)
rgba = np.dstack([col, a * 255]).astype(np.uint8)
w = 2048
rgba = cv2.resize(rgba, (w, round(w * rgba.shape[0] / rgba.shape[1])), interpolation=cv2.INTER_AREA)
n = rgba.shape[0] // 10  # the bottom 10 % fades out so the painted meadow melts into the 3D ground
rgba[-n:, :, 3] = (rgba[-n:, :, 3] * np.linspace(1, 0, n)[:, None]).astype(np.uint8)
cv2.imwrite(out + "/far_hills_v3.png", rgba)

gr = cv2.imread(ground)
assert gr is not None
cv2.imwrite(out + "/ground_tile.png", cv2.resize(gr, (1024, 1024), interpolation=cv2.INTER_AREA))
print("ok", rgba.shape, "hills opaque %d%%" % int((rgba[..., 3] > 128).mean() * 100))
