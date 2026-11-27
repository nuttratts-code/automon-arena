# set 307 g: owner "compare the card background with the tribe badge — they should be one colour".
# Rows: painted card body (g286 ui_r48/card_body_<tribe>.png) · badge f now (tone.json hue, s .87 v .93) ·
# g1 = card-body hue, s .87 v .93 · g2 = card-body hue + the card's own saturation (x1.3, cap .87), v .93.
import colorsys, numpy as np
from PIL import Image, ImageDraw, ImageFont
G = r"D:\GitHub\automon-scratch\g286"
cols = {}
for line in open(G + r"\data\tone.json", encoding="utf-8"):
    line = line.strip().rstrip(",")
    if line.startswith('"t-'):
        k, v = line.split(":"); cols[k.strip('" ')] = v.strip(' "')
orb = np.asarray(Image.open("S307-orb.png")).astype(np.float32) / 255
spec = np.asarray(Image.open("S307-orb-spec.png")).astype(np.float32) / 255
def badge(k, tc):
    rgb = orb[..., :3] * np.array(tc); a = orb[..., 3:4]; sa = spec[..., 3:4]; rgb = rgb * (1 - sa) + sa
    img = Image.fromarray(np.dstack([rgb * 255, a * 255]).astype(np.uint8))
    gs = int(256 * 0.57); gl = Image.open(G + r"\data\ui_icons\r38w\owner_%s.png" % k).convert("RGBA").resize((gs, gs), Image.LANCZOS)
    cr = Image.new("RGBA", (gs, gs), (250, 246, 241, 0)); cr.putalpha(gl.getchannel("A"))
    img.alpha_composite(cr, ((256 - gs) // 2, (256 - gs) // 2)); return img
TR = ["steel", "fire", "bolt", "wind", "spirit", "fiend"]
CW, CH, B = 150, 190, 120
out = Image.new("RGB", (140 + len(TR) * (CW + 20), CH + 3 * (B + 20) + 70), (24, 28, 36)); d = ImageDraw.Draw(out)
f = ImageFont.truetype(r"C:\Windows\Fonts\tahoma.ttf", 18)
for j, lab in enumerate(["การ์ด", "ตรา f ตอนนี้", "g1 สีการ์ด สด", "g2 สีการ์ด ความสดตามการ์ด"]):
    y = 20 + (CH // 2 if j == 0 else CH + 20 + (j - 1) * (B + 20) + B // 2)
    d.text((10, y), lab, fill=(230, 230, 230), font=f, anchor="lm")
for i, k in enumerate(TR):
    x = 140 + i * (CW + 20)
    body = Image.open(G + r"\ui_r48\card_body_%s.png" % k).convert("RGBA").resize((CW, CH), Image.LANCZOS)
    out.paste(body, (x, 20), body)
    a = np.asarray(Image.open(G + r"\ui_r48\card_body_%s.png" % k).convert("RGBA")).astype(float)
    m = np.median(a[..., :3][a[..., 3] > 200], axis=0) / 255; hc, sc, vc = colorsys.rgb_to_hsv(*m)
    hx = cols["t-" + k].lstrip("#"); ht = colorsys.rgb_to_hsv(*(int(hx[q:q + 2], 16) / 255 for q in (0, 2, 4)))[0]
    for j, tc in enumerate([colorsys.hsv_to_rgb(ht, .87, .93), colorsys.hsv_to_rgb(hc, .87, .93), colorsys.hsv_to_rgb(hc, min(.87, sc * 1.3), .93)]):
        b = badge(k, tc).resize((B, B), Image.LANCZOS)
        out.paste(b, (x + (CW - B) // 2, 20 + CH + 20 + j * (B + 20)), b)
    d.text((x + CW // 2, out.height - 25), k + (" (ภูติ)" if k == "spirit" else ""), fill=(230, 230, 230), font=f, anchor="mm")
out.save("S307g-card-vs-badge.png"); print("ok")
