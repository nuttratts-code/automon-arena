# part_copy.py <frames_dir> <out_dir> <x0> <x1> <y0> <y1> (set 225, SF-1 ears) — a part the video smeared (muddy colour)
# is replaced in frames 2..8 by frame 1's same box, moved with the body: per frame the best offset (-3..3 px, alpha
# shape first, then colour) is found and frame 1's box is pasted there. Keep the box on the part only (above the
# head/body line) so the seam stays hidden; the part no longer bends on its own, it only rides with the body.
import sys, numpy as np
from PIL import Image
src, out = sys.argv[1:3]; X0, X1, Y0, Y1 = (int(v) for v in sys.argv[3:7])
f = [np.array(Image.open(f'{src}/idle_{k}.png').convert('RGBA')).astype(int) for k in range(8)]
box = f[0][Y0:Y1, X0:X1]
for k in range(1, 8):
    a = f[k]; best = None
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            if Y0 + dy < 0 or X0 + dx < 0 or Y1 + dy > a.shape[0] or X1 + dx > a.shape[1]: continue
            t = a[Y0 + dy:Y1 + dy, X0 + dx:X1 + dx]
            s = ((t[..., 3] > 0) != (box[..., 3] > 0)).sum() * 300 + (np.abs(t[..., :3] - box[..., :3]).sum(-1) * ((t[..., 3] > 0) & (box[..., 3] > 0))).sum() / 50
            if best is None or s < best[0]: best = (s, dx, dy)
    _, dx, dy = best; a[Y0 + dy:Y1 + dy, X0 + dx:X1 + dx] = box; print('frame', k + 1, 'offset', dx, dy)
ims = [Image.fromarray(x.astype(np.uint8)) for x in f]; W, H = ims[0].size
for k, im in enumerate(ims): im.save(f'{out}/idle_{k}.png')
sh = Image.new('RGBA', (W * 8, H))
for k, im in enumerate(ims): sh.paste(im, (k * W, 0))
sh.save(f'{out}/sheet_8x1_{W}x{H}.png')
ims[0].save(f'{out}/anim.png', save_all=True, append_images=ims[1:], duration=250, loop=0, disposal=1)
