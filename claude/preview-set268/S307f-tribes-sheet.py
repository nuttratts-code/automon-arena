# set 307 f: list sheet of all 6 tribe badges (owner asked "spirit too?") = same maths as r43.gd: orb x from_hsv(h,0.87,0.93) + white spec + cream glyph 57 %
import json, colorsys, numpy as np
from PIL import Image, ImageDraw, ImageFont
G = r"D:\GitHub\automon-scratch\g286"
cols = {}
for line in open(G + r"\data\tone.json", encoding="utf-8"):
    line = line.strip().rstrip(",")
    if line.startswith('"t-'):
        k, v = line.split(":"); cols[k.strip('" ')] = v.strip(' "')
orb = np.asarray(Image.open("S307-orb.png")).astype(np.float32) / 255
spec = np.asarray(Image.open("S307-orb-spec.png")).astype(np.float32) / 255
TR = [("steel", "เหล็กกล้า"), ("fire", "เพลิงเผา"), ("bolt", "สายฟ้า"), ("wind", "วายุ"), ("spirit", "ภูติ"), ("fiend", "อสูร")]
S = 200; Z = 6; small = 15
out = Image.new("RGB", (len(TR) * (S + 20) + 20, S + small * Z + 90), (24, 28, 36)); d = ImageDraw.Draw(out)
try: f = ImageFont.truetype(r"C:\Windows\Fonts\tahoma.ttf", 20)
except Exception: f = None
for i, (k, th) in enumerate(TR):
    hx = cols["t-" + k].lstrip("#"); r, g, b = (int(hx[j:j + 2], 16) / 255 for j in (0, 2, 4))
    h = colorsys.rgb_to_hsv(r, g, b)[0]; tc = np.array(colorsys.hsv_to_rgb(h, 0.87, 0.93))
    rgb = orb[..., :3] * tc; a = orb[..., 3:4]
    sa = spec[..., 3:4]; rgb = rgb * (1 - sa) + sa
    img = Image.fromarray(np.dstack([rgb * 255, a * 255]).astype(np.uint8))
    gl = Image.open(G + r"\data\ui_icons\r38w\owner_%s.png" % k).convert("RGBA")
    gs = int(256 * 0.57); gl = gl.resize((gs, gs), Image.LANCZOS)
    ga = np.asarray(gl)[..., 3]
    cream = Image.new("RGBA", (gs, gs), (250, 246, 241, 0)); cream.putalpha(Image.fromarray(ga))
    img.alpha_composite(cream, ((256 - gs) // 2, (256 - gs) // 2))
    x = 20 + i * (S + 20)
    big = img.resize((S, S), Image.LANCZOS); out.paste(big, (x, 20), big)
    sm = img.resize((small, small), Image.LANCZOS).resize((small * Z, small * Z), Image.NEAREST)
    out.paste(sm, (x + (S - small * Z) // 2, S + 30), sm)
    d.text((x + S // 2, S + small * Z + 45), k + ("  ← ภูติ" if k == "spirit" else ""), fill=(230, 230, 230), anchor="mt", font=f)
out.save("S307f-tribes-sheet.png"); print("ok")
