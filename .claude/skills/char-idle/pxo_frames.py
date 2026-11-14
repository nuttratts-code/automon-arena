# pxo_frames.py <file.pxo> <out_dir> [ms=250] (set 225) — read the owner's Pixelorama save (B5 trap) back into
# idle_0..N.png + sheet_Nx1_<W>x<H>.png + anim.png (APNG) + preview.gif (x4 on grey, FASTOCTREE palette, no dither).
# .pxo = zip: data.json (size_x/size_y, frames[i].cels[l] image_size/offset as "Vector2i(a, b)") +
# image_data/frames/<i+1>/layer_<l+1> = raw RGBA of the cel size, placed at its offset; layers composited bottom-up.
import sys, os, re, json, zipfile, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]; MS = int(sys.argv[3]) if len(sys.argv) > 3 else 250
os.makedirs(out, exist_ok=True)
z = zipfile.ZipFile(src); d = json.loads(z.read('data.json')); W, H = d['size_x'], d['size_y']; names = set(z.namelist())
def v2(s, dflt):
    if s is None: return dflt
    if isinstance(s, list): return [int(x) for x in s]
    s = s[s.index('(') + 1:] if '(' in s else s          # "Vector2i(101, 84)" -> skip the "2" in the type name
    return [int(float(x)) for x in re.findall(r'-?\d+\.?\d*', s)][:2]
ims = []
for i, fr in enumerate(d['frames']):
    L = Image.new('RGBA', (W, H))
    for l, cel in enumerate(fr['cels']):
        key = f'image_data/frames/{i + 1}/layer_{l + 1}'
        if key not in names: continue
        w, h = v2(cel.get('image_size'), [W, H]); off = v2(cel.get('offset'), [0, 0])
        a = np.frombuffer(z.read(key), np.uint8).reshape(h, w, 4).copy()
        T = Image.new('RGBA', (W, H)); T.paste(Image.fromarray(a), tuple(off)); L = Image.alpha_composite(L, T)
    ims.append(L); L.save(f'{out}/idle_{i}.png')
N = len(ims); sh = Image.new('RGBA', (W * N, H))
for k, im in enumerate(ims): sh.paste(im, (k * W, 0))
sh.save(f'{out}/sheet_{N}x1_{W}x{H}.png')
ims[0].save(f'{out}/anim.png', save_all=True, append_images=ims[1:], duration=MS, loop=0, disposal=1)
g = []
for im in ims:
    c = Image.new('RGB', (W * 4 + 20, H * 4 + 20), (120, 128, 140)); b = im.resize((W * 4, H * 4), Image.NEAREST); c.paste(b, (10, 10), b)
    g.append(c.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.Dither.NONE))
g[0].save(f'{out}/preview.gif', save_all=True, append_images=g[1:], duration=MS, loop=0)
print(f'{N} frames {W}x{H} -> {out}')
