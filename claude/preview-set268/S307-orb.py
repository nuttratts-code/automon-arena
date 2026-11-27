# set 307 tribe badge b: owner "not like a coin — make it look like a sphere". PIL-rendered grey glossy orb
# (lambert + soft specular top-left + rim light bottom-right + thin dark outline), tinted per tribe in code like the medallion.
import numpy as np
from PIL import Image
N = 256; R = N / 2 - 6
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
x = (xx - N / 2 + 0.5) / R; y = (yy - N / 2 + 0.5) / R
d2 = x * x + y * y
inside = d2 <= 1.0
z = np.sqrt(np.clip(1 - d2, 0, 1))
L = np.array([-0.60, -0.70, 0.40]); L /= np.linalg.norm(L)
lam = np.clip(x * L[0] + y * L[1] + z * L[2], 0, 1)
H = L + np.array([0, 0, 1.0]); H /= np.linalg.norm(H)
spec = np.clip(x * H[0] + y * H[1] + z * H[2], 0, 1) ** 90
rim = np.clip((x * 0.6 + y * 0.7), 0, 1) * (1 - z) ** 2       # bounce light bottom-right edge
v = 0.55 + 0.50 * lam + 0.30 * rim
v = np.clip(v, 0, 1)
col = v * 240.0 + spec * 255.0 * 0.7
col = np.clip(col, 0, 255)
r = np.sqrt(d2) * R
edge = np.clip((R + 4.5 - r), 0, 1)                         # outline band 4.5 px (at 256)
outline = (r > R - 0.5)
a = np.clip(R + 4.5 + 0.5 - r, 0, 1)
rgb = np.where(inside, col, 28.0)
img = np.dstack([rgb, rgb, rgb, a * 255]).astype(np.uint8)
Image.fromarray(img).save("S307-orb.png"); print("ok")
