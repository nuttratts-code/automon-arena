# set 213 R2b: HUD icons = plain silhouettes (no outline: tinted to ink the outline swallowed the holes), 24 px
import sys, os
from PIL import Image
src, out, px = sys.argv[1], sys.argv[2], int(sys.argv[3])
for key, name in {"rune": "book_open", "enemy": "skull", "legend": "notepad"}.items():
    a = Image.open(os.path.join(src, name + ".png")).convert("RGBA").getchannel("A").resize((px, px), Image.BOX)
    a = a.point(lambda v: 255 if v >= 140 else 0)
    im = Image.new("RGBA", (px, px), (255, 255, 255, 0))
    im.putalpha(a)
    im.save(os.path.join(out, key + ".png"))
    print(key, px)
