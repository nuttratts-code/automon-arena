# set 286 = set 268 round 35c: refresh the sample from the LATEST hub (owner: "use + update values from the newest hub")
# and take the set 285 creature data (new IDs) from origin/main. Re-runnable.
# Every character with a starred form-1 idle sheet (frames) -> tests/s225/i1<ID>.png + s268i1_meta.json (all hub settings the
# sample can use: frames, ms, size k, mirror, feet, cast shadow) + tests/s268icons/<ID>.png (starred icon, else newest).
# Prints the pool (S286POOL=...) the random-team switch uses.
# usage: python s286r35c-hub.py <g folder>
import json, os, shutil, subprocess, sys
from PIL import Image

G = sys.argv[1]
REPO = "D:/GitHub/automon-arena"
HUB = REPO + "/art/hub"
# 1) set 285 data (new IDs) from origin/main
for f in ["game.json", "labels.json", "art.json"]:
    b = subprocess.run(["git", "-C", REPO, "show", "origin/main:godot/data/" + f], capture_output=True, check=True).stdout
    open(os.path.join(G, "data", f), "wb").write(b)
# 2) hub art + settings
d = json.load(open(HUB + "/hub.json", encoding="utf-8"))
print("hub rev", d.get("rev"))
def live(r): return not r.get("archived")
def frames(v): return [r for r in v["rounds"] if r.get("star") and r.get("slot") == "frames" and r.get("form") == 1 and live(r)]
def stills(v): return [r for r in v["rounds"] if r.get("star") and r.get("slot") in ("still", "cut") and r.get("form", 1) == 1 and live(r)]
# idle sheet if starred, else the starred form-1 still (one frame, no idle motion) so random teams can use every creature
have = sorted(k for k, v in d["items"].items() if v.get("kind") == "character" and (frames(v) or stills(v)))
dst = os.path.join(G, "tests", "s225")
icd = os.path.join(G, "tests", "s268icons")
old = os.path.join(G, "tests", "s268icons_pre285")
if not os.path.isdir(old):
    shutil.copytree(icd, old)
for fn in os.listdir(icd):              # old-numbering icons would show the wrong creature
    if fn.endswith(".png"): os.remove(os.path.join(icd, fn))
meta = {}
warn = []
ks = sorted(float(v["scale"]["k"]) for v in d["items"].values() if v.get("kind") == "character" and (v.get("scale") or {}).get("k"))
K_MED = ks[len(ks) // 2] if ks else 4.0
print("median hub size k", K_MED, "from", len(ks))
for cid in have:
    v = d["items"][cid]
    fr = (frames(v) or stills(v))[-1]
    m = fr.get("meta") or {} if fr.get("slot") == "frames" else {"cols": 1}
    if fr.get("slot") != "frames": warn.append("%s: no starred idle -> still only (no motion)" % cid)
    key = "i1" + cid.replace("-", "")
    im = Image.open(HUB + "/files/" + fr["file"][len("hub/"):]).convert("RGBA")
    im.save(os.path.join(dst, key + ".png"))
    bb = im.getchannel("A").getbbox()
    sc = v.get("scale") or {}
    fh = im.height  # one frame = full height (sheets are one row)
    k = float(sc["k"]) if "k" in sc else K_MED   # no size in the hub -> the median size the owner set (same pixel scale)
    if "k" not in sc: warn.append("%s: no size in hub -> median hub size k %.2f" % (cid, k))
    pic = [r for r in v["rounds"] if r.get("slot") in ("still", "cut") and r.get("form", 1) == 1 and r.get("star")]
    mir = bool(pic and pic[-1].get("flip"))
    sh = v.get("shadow") or {}
    ft = sh.get("feet") or [0.5, 1.0]
    ca = sh.get("cast") or {}
    meta[key] = {"hf": int(m["cols"]), "pad_b": im.height - bb[3], "ms": int(m.get("ms", 150)), "k": k, "mirror": mir,
                 "fx": float(ft[0]), "fy": float(ft[1]), "len": float(ca.get("len", 1)), "str": float(ca.get("str", 0.5)),
                 "blur": float(ca.get("blur", 0.3)), "ox": float(ca.get("ox", 0)), "oy": float(ca.get("oy", 0)),
                 "pingpong": bool(m.get("pingpong", False))}
    nope = [n for n, on in [("per-frame feet", sh.get("frames")), ("corner k", ca.get("k")), ("oval", (sh.get("oval") or {}).get("on")),
                            ("shadow ox/oy", ca.get("ox") or ca.get("oy")), ("ping-pong", m.get("pingpong"))] if on]
    if nope: warn.append("%s: %s" % (cid, ", ".join(nope)))
    ics = [r for r in v["rounds"] if r.get("slot") == "icon" and r.get("form") == 1 and live(r)]
    st = [r for r in ics if r.get("star")]
    if ics:
        ico = Image.open(HUB + "/files/" + (st or ics)[-1]["file"][len("hub/"):])
        if mir: ico = ico.transpose(Image.FLIP_LEFT_RIGHT)
        ico.save(os.path.join(icd, cid + ".png"))
    else:   # no icon in the hub: head square at the top-right of the picture (same rule as the queue portrait, R3)
        fw = im.width // max(1, int(m["cols"]))
        f0 = im.crop((0, 0, fw, im.height)); ub = f0.getchannel("A").getbbox()
        side = int(min((ub[3] - ub[1]) * 0.8, ub[2] - ub[0]))
        ico = f0.crop((ub[2] - side, ub[1], ub[2], ub[1] + side))
        msk = Image.new("L", ico.size, 0)          # diamond like the hub icons (transparent outside)
        from PIL import ImageDraw
        n = ico.size[0]
        ImageDraw.Draw(msk).polygon([(n / 2, 0), (n - 1, n / 2), (n / 2, n - 1), (0, n / 2)], fill=255)
        ico.putalpha(Image.composite(ico.getchannel("A"), Image.new("L", ico.size, 0), msk))
        if mir: ico = ico.transpose(Image.FLIP_LEFT_RIGHT)
        ico.save(os.path.join(icd, cid + ".png"))
        warn.append("%s: no form-1 icon -> head cut from the still" % cid)
json.dump(meta, open(os.path.join(dst, "s268i1_meta.json"), "w"), indent=1)
print("pool", len(have))
for w in warn: print("WARN not applied by this sample ->", w)
print("S286POOL=" + "/".join(have))
