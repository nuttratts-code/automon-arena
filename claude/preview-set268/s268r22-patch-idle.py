# set 268 round 22 — battle sample units = the owner's starred form-1 idle sheets from the hub (PixelLab 8 frames)
# own = hub team (settings.team.ids), foe = the other six creatures with a starred idle. Timeline icons = form-1 icons.
# usage: python s268r22-patch-idle.py <g268 folder>   (reads D:/GitHub/automon-arena/art/hub)
import json, os, shutil, sys
from PIL import Image

G = sys.argv[1]
HUB = "D:/GitHub/automon-arena/art/hub"
d = json.load(open(HUB + "/hub.json", encoding="utf-8"))
own = d["settings"]["team"]["ids"]
have = [k for k, v in d["items"].items() if v.get("kind") == "character" and any(
    r.get("star") and r.get("slot") == "frames" and r.get("form") == 1 and not r.get("archived") for r in v["rounds"])]
foe = [k for k in have if k not in own][:6]
assert len(own) == 6 and len(foe) == 6, (own, foe)

dst = os.path.join(G, "tests", "s225")
icd = os.path.join(G, "tests", "s268icons")
bak = os.path.join(G, "tests", "s268icons_f3")
if not os.path.isdir(bak):
    shutil.copytree(icd, bak)
meta = {}
for cid in own + foe:
    v = d["items"][cid]
    fr = [r for r in v["rounds"] if r.get("star") and r.get("slot") == "frames" and r.get("form") == 1 and not r.get("archived")][-1]
    m = fr["meta"]
    src = HUB + "/files/" + fr["file"][len("hub/"):]
    key = "i1" + cid.replace("-", "")
    im = Image.open(src).convert("RGBA")
    im.save(os.path.join(dst, key + ".png"))
    # rows under the lowest opaque pixel across all frames (feet line)
    a = im.getchannel("A")
    bb = a.getbbox()
    pad_b = im.height - bb[3]
    k = float((v.get("scale") or {}).get("k", 4))
    meta[key] = {"hf": int(m["cols"]), "pad_b": pad_b, "ms": int(m.get("ms", 150)), "k": k}
    ics = [r for r in v["rounds"] if r.get("slot") == "icon" and r.get("form") == 1 and not r.get("archived")]
    st = [r for r in ics if r.get("star")]
    ic = (st or ics)[-1]
    shutil.copyfile(HUB + "/files/" + ic["file"][len("hub/"):], os.path.join(icd, cid + ".png"))
    print(key, meta[key], "icon", ic["file"].split("_")[-1], "star" if st else "newest")
json.dump(meta, open(os.path.join(dst, "s268i1_meta.json"), "w"), indent=1)

# timeline: accept the i1 prefix as well as f3
tl = os.path.join(G, "scripts", "ui", "s268_timeline.gd")
s = open(tl, encoding="utf-8").read()
if 'trim_prefix("i1")' not in s:
    s = s.replace('.trim_prefix("f3")', '.trim_prefix("f3").trim_prefix("i1")')
    open(tl, "w", encoding="utf-8").write(s)
print("OWN=" + "/".join("i1" + c.replace("-", "") for c in own))
print("FOE=" + "/".join("i1" + c.replace("-", "") for c in foe))
