"""PixelLab Pro still batch (set 259): style image + forced palette -> 25 variants at 48 px for 10 generations.

Key only from env PIXELLAB_API_KEY (never printed). Outputs stay OUTSIDE the repo unless the owner OKs a pick.
  python -I pixellab_still.py --desc "..." --style style.png --palette pal.png --out <dir> [--size 48] [--seed N] [--dry]
--style: a single creature on transparency (cropped to its bbox). --palette: any image; its opaque colours (<=256)
become target_palette. style_options.color_palette=false so colours come only from --palette; outline/detail/shading
(and, in practice, pose/stance) come from --style. No --seed = random; a seed changes the WHOLE batch, not each image,
so variety comes from changing --desc or --style per call. Writes g00..g24.png + sheet.png (4x) + request.json.
"""
import argparse, base64, io, json, os, sys, time, urllib.error, urllib.request
from PIL import Image

API = "https://api.pixellab.ai/v2"


def b64(im):
    b = io.BytesIO(); im.save(b, "PNG"); return {"type": "base64", "base64": base64.b64encode(b.getvalue()).decode(), "format": "png"}


def call(m, p, body=None):
    k = os.environ.get("PIXELLAB_API_KEY", "").strip() or sys.exit("PIXELLAB_API_KEY not set")
    r = urllib.request.Request(API + p, method=m, data=None if body is None else json.dumps(body).encode(),
                               headers={"Authorization": "Bearer " + k, "Content-Type": "application/json", "User-Agent": "automon-still/1"})
    try:
        with urllib.request.urlopen(r, timeout=180) as x:
            return json.loads(x.read().decode())
    except urllib.error.HTTPError as e:
        sys.exit("HTTP %d on %s %s: %s" % (e.code, m, p, e.read().decode(errors="replace")[:600]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--desc", required=True); ap.add_argument("--style", required=True); ap.add_argument("--palette", required=True)
    ap.add_argument("--out", required=True); ap.add_argument("--size", type=int, default=48); ap.add_argument("--seed", type=int)
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    st = Image.open(a.style).convert("RGBA"); st = st.crop(st.getbbox())
    pal = Image.open(a.palette).convert("RGBA")
    cols = sorted({"#%02x%02x%02x" % p[:3] for p in pal.get_flattened_data() if p[3] > 0})
    if not 2 <= len(cols) <= 256:
        sys.exit("palette image gives %d colours (need 2-256)" % len(cols))
    body = {"description": a.desc, "image_size": {"width": a.size, "height": a.size}, "seed": a.seed, "no_background": True,
            "style_image": {"image": b64(st), "size": {"width": st.width, "height": st.height}},
            "style_options": {"color_palette": False, "outline": True, "detail": True, "shading": True},
            "target_palette": {"colors": cols}}
    show = dict(body, style_image="<%s %dx%d>" % (os.path.basename(a.style), st.width, st.height))
    print(json.dumps(show, indent=1))
    if a.dry:
        return
    os.makedirs(a.out, exist_ok=True)
    json.dump(show, open(os.path.join(a.out, "request.json"), "w"), indent=1)
    b0 = call("GET", "/balance")["subscription"]["generations"]
    jid = call("POST", "/generate-image-v2", body)["background_job_id"]
    for _ in range(120):
        time.sleep(5); r = call("GET", "/background-jobs/" + jid)
        if r.get("status") not in ("processing", "pending", "queued"):
            break
    lr = r.get("last_response") or {}
    imgs = lr.get("images") or []
    if r.get("status") != "completed" or not imgs:
        sys.exit("job %s ended %s" % (jid, r.get("status")))
    Z, C = 4, a.size + 4
    sheet = Image.new("RGBA", (C * Z * 5, C * Z * ((len(imgs) + 4) // 5)), (232, 232, 232, 255))
    for i, im in enumerate(imgs):
        g = Image.open(io.BytesIO(base64.b64decode(im["base64"].split(",")[-1]))).convert("RGBA")
        g.save(os.path.join(a.out, "g%02d.png" % i))
        sheet.alpha_composite(g.resize((g.width * Z, g.height * Z), Image.NEAREST), ((i % 5) * C * Z + 2 * Z, (i // 5) * C * Z + 2 * Z))
    sheet.convert("RGB").save(os.path.join(a.out, "sheet.png"))
    print("job", jid, "seed", lr.get("seed"), "images", len(imgs), "spent", round(b0 - call("GET", "/balance")["subscription"]["generations"], 2))


if __name__ == "__main__":
    main()
