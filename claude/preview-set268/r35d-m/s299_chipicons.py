# set 299 r35w15: bake the picked chip parts for Godot (owner picks r35w11-14):
#   icons cropped + same ink size (ข) + sword flipped (tip top-left), placed in a 128 canvas with pad 0.10 → n_<key>.png / n_<key>_o.png
#   small smooth + / − (0.32 of the chip, top-right, moved in; minus higher) → n_plus.png / n_minus.png
# usage: python s299_chipicons.py <icon dir>   (writes next to the source icons)
import sys, pathlib
from PIL import Image, ImageDraw
IC = pathlib.Path(sys.argv[1]); S = 128; SS = 8
KEYS = ["stun", "atk", "burn", "shock", "armor", "heal", "cd", "vuln"]   # h2a left out (owner r35w13)
FLIP = {"atk"}

def area(im): return sum(1 for v in im.split()[3].get_flattened_data() if v > 60)

for k in KEYS:
    o = Image.open(IC / f"{k}_o.png").convert("RGBA"); f = Image.open(IC / f"{k}.png").convert("RGBA")
    bb = o.split()[3].getbbox()
    o, f = o.crop(bb), f.crop(bb)
    if k in FLIP: o, f = o.transpose(Image.FLIP_LEFT_RIGHT), f.transpose(Image.FLIP_LEFT_RIGHT)
    inner = S * 0.80
    sc = min(inner / max(o.size), (0.50 * inner * inner / area(o)) ** 0.5)
    sz = (max(1, round(o.width * sc)), max(1, round(o.height * sc)))
    for im, name in [(o, f"n_{k}_o.png"), (f, f"n_{k}.png")]:
        c = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        c.alpha_composite(im.resize(sz, Image.LANCZOS), ((S - sz[0]) // 2, (S - sz[1]) // 2))
        c.save(IC / name)

for mk, name in [("+", "n_plus.png"), ("-", "n_minus.png")]:
    B = S * SS; im = Image.new("RGBA", (B, B), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    L = 0.32 * B; t = L * 0.30; cx = B - L * 0.5 - B * 0.07; cy = L * 0.5 + B * 0.10; o = max(2, B * 0.045)
    if mk == "-": cy -= L * 0.22
    bars = [(cx - L/2, cy - t/2, cx + L/2, cy + t/2)] + ([(cx - t/2, cy - L/2, cx + t/2, cy + L/2)] if mk == "+" else [])
    for b in bars: d.rounded_rectangle((b[0]-o, b[1]-o, b[2]+o, b[3]+o), radius=t/2+o, fill=(22, 32, 42, 240))
    for b in bars: d.rounded_rectangle(b, radius=t/2, fill=(255, 255, 255, 255))
    im.resize((S, S), Image.LANCZOS).save(IC / name)
print("ok", len(KEYS))
