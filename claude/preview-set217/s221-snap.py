# set 221: snap an AI "fake pixel" still (e.g. Gemini 2000x2000) to its real pixel grid.
# run: python -I s221-snap.py <in.jpg> <out.png> <block_px> <offset_px> <grid_n>
# HL-1: block 20.0, offset 2, grid 99 -> 84x80. Find block/offset by zooming on the source edges.
# Background must be magenta (#FF00FF); it becomes transparent. Eye/glow mask = blue > red + 70.
import sys
import numpy as np
from PIL import Image
src, out, b, off, n = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
a = np.asarray(Image.open(src).convert('RGB')).astype(int)
c = (off + b * (np.arange(n) + 0.5)).astype(int)
g = a[c][:, c].astype(np.uint8)
mag = (g[:, :, 0] > 190) & (g[:, :, 1] < 110) & (g[:, :, 2] > 190)
ys, xs = np.where(~mag)
rgba = np.dstack([g, np.where(mag, 0, 255).astype(np.uint8)])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
Image.fromarray(rgba).save(out)
print('ok', rgba.shape[1], 'x', rgba.shape[0])
