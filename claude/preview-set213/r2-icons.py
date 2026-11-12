# set 213 R2: Kenney Board Game Icons (CC0) → small pixel icons matching the sprites (DO 16: no smooth vector next to pixel art)
# white fill + 1-px near-black outline, hard alpha. Usage: python -I r2_icons.py <kenney PNG/Double dir> <out dir> <px>
import sys, os
from PIL import Image

src, out, px = sys.argv[1], sys.argv[2], int(sys.argv[3])
PICK = {"rune": "book_open", "enemy": "skull", "legend": "notepad", "atk": "sword", "hp": "suit_hearts", "cd": "hourglass"}
os.makedirs(out, exist_ok=True)
for key, name in PICK.items():
    im = Image.open(os.path.join(src, name + ".png")).convert("RGBA")
    inner = px - 2
    a = im.getchannel("A").resize((inner, inner), Image.BOX)
    a = a.point(lambda v: 255 if v >= 110 else 0)
    canvas = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    fill = Image.new("RGBA", (inner, inner), (255, 255, 255, 255))
    mask = Image.new("L", (px, px), 0)
    mask.paste(a, (1, 1))
    # outline = mask grown by 1 px (4-neighbour)
    grown = Image.new("L", (px, px), 0)
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        sh = Image.new("L", (px, px), 0)
        sh.paste(a, (1 + dx, 1 + dy))
        grown = Image.composite(sh, grown, sh)
    canvas.paste((20, 22, 30, 235), (0, 0), grown)
    canvas.paste(fill, (1, 1), a)
    canvas.save(os.path.join(out, key + ".png"))
    print(key, name, px)
