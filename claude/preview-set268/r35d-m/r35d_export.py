# Export picked R35d icons for the g286 sample: <key>.png (white fill) + <key>_o.png (dilated outline mask), 128 px, 10 px pad.
import sys, os
from PIL import Image, ImageFilter
SRC, DST = sys.argv[1], sys.argv[2]
PICK = {"atk": "atk_1", "armor": "armor_1", "burn": "burn_1", "shock": "shock_1", "stun": "stun_r2_1", "heal": "heal_1",
        "cd": "cd_1", "multi": "multi_r2_3", "vuln": "vuln_1", "armhit": "armhit_1", "h2a": "h2a_1",
        "pause": "btn_1", "play": "btn_2", "ff": "btn_3"}
os.makedirs(DST, exist_ok=True)
for key, src in PICK.items():
    a = Image.open(os.path.join(SRC, src + ".png")).convert("RGBA").split()[3]
    a = a.resize((108, 108), Image.LANCZOS)
    pad = Image.new("L", (128, 128), 0); pad.paste(a, (10, 10))
    fill = Image.new("RGBA", (128, 128), (255, 255, 255, 0)); fill.putalpha(pad); fill.save(os.path.join(DST, key + ".png"))
    o = pad.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(1.2))
    ol = Image.new("RGBA", (128, 128), (255, 255, 255, 0)); ol.putalpha(o); ol.save(os.path.join(DST, key + "_o.png"))
print("ok", len(PICK))
