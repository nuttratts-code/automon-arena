"""Form-3 still batch for one creature (set 265, owner OK on all six -1 creatures). Key from env PIXELLAB_API_KEY only.
  python -I pixellab_f3.py <ID> --still <hub still png> --tribe <tribe> --noun "a fire ram monster"
         --keep "the colours and the curled horn shape" --style <pmd-ref number> [--extra "#ffe066,#5a2410"] [--size 56] [--dry]
         [--palette <png>]  colours from this png instead of --still (owner idea picture as --still → pass the form-1 still here)
Request = generate-image-v2: reference_images = the ★ form-1 still with usage "take only <keep> from this creature",
short desc "the final evolved form of the reference creature, <noun>, with a clear dark outline, side view facing right, full body",
style_image = a NEW unused pmd-ref sprite (outline/detail/shading only), target_palette = the still's colours + --extra.
Writes D:/GitHub/automon-scratch/still-batches/<tribe>_f3/ (g00..g15, sheet.png, request.json, style.png, batch.json with
item + form 3 = ID locked on /pick, still_batch add writes form 3). Outside the repo until the owner picks.
"""
import argparse, base64, importlib.util, io, json, os, re, sys, time
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("pls", os.path.join(HERE, "pixellab_still.py"))
pls = importlib.util.module_from_spec(spec); spec.loader.exec_module(pls)
SCR = "D:/GitHub/automon-scratch"


def frame(n, row=2):  # pmd-ref idle sheet, row 2 = facing right, first frame, trimmed
    d = f"{SCR}/pmd-ref/sprite/{n}"
    x = open(d + "/AnimData.xml").read()
    m = re.search(r"<Name>Idle</Name>.*?<FrameWidth>(\d+)</FrameWidth>\s*<FrameHeight>(\d+)</FrameHeight>", x, re.S)
    w, h = int(m[1]), int(m[2])
    f = Image.open(d + "/Idle-Anim.png").convert("RGBA").crop((0, row * h, w, row * h + h))
    return f.crop(f.getbbox())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("item"); ap.add_argument("--still", required=True); ap.add_argument("--tribe", required=True)
    ap.add_argument("--noun", required=True); ap.add_argument("--keep", required=True); ap.add_argument("--style", required=True)
    ap.add_argument("--extra", default=""); ap.add_argument("--size", type=int, default=56); ap.add_argument("--out", default="")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--palette", default="", help="png whose colours form target_palette (default: --still); set 282: lock form-1 colours when --still is an owner idea picture")
    a = ap.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", a.item) or not re.fullmatch(r"\d{4}", a.style):
        sys.exit("bad item or style number")
    used = [f for f in os.listdir(f"{SCR}/still-batches") if os.path.isfile(f"{SCR}/still-batches/{f}/batch.json")
            and json.load(open(f"{SCR}/still-batches/{f}/batch.json")).get("style_src") == "pmd-ref " + a.style]
    if used:
        print("WARNING style pmd-ref %s already used by %s (owner: new style ref every batch)" % (a.style, used))
    extra = [c.strip() for c in a.extra.split(",") if c.strip()]
    if not all(re.fullmatch(r"#[0-9a-fA-F]{6}", c) for c in extra):
        sys.exit("--extra = #rrggbb,#rrggbb")
    out = a.out or f"{SCR}/still-batches/{a.tribe}_f3"
    still = Image.open(a.still).convert("RGBA"); still = still.crop(still.getbbox())
    st = frame(a.style)
    pal = Image.open(a.palette).convert("RGBA") if a.palette else still
    cols = sorted({"#%02x%02x%02x" % p[:3] for p in pal.get_flattened_data() if p[3] > 0} | {c.lower() for c in extra})
    desc = "the final evolved form of the reference creature, %s, with a clear dark outline, side view facing right, full body" % a.noun
    body = {"description": desc, "image_size": {"width": a.size, "height": a.size}, "no_background": True,
            "style_image": {"image": pls.b64(st), "size": {"width": st.width, "height": st.height},
                            "usage_description": "copy only the outline, pixel detail and shading"},
            "style_options": {"color_palette": False, "outline": True, "detail": True, "shading": True},
            "target_palette": {"colors": cols},
            "reference_images": [{"image": pls.b64(still), "size": {"width": still.width, "height": still.height},
                                  "usage_description": "take only %s from this creature" % a.keep}]}
    show = {k: v for k, v in body.items() if k not in ("style_image", "reference_images")}
    show["style_image"] = "<pmd-ref %s %dx%d>" % (a.style, st.width, st.height)
    show["reference_images"] = ["<%s %s %dx%d: %s>" % (a.item, os.path.basename(a.still), *still.size, a.keep)]
    print(json.dumps(show, indent=1))
    if a.dry:
        return
    os.makedirs(out, exist_ok=True)
    json.dump(show, open(out + "/request.json", "w"), indent=1); st.save(out + "/style.png")
    jid = pls.call("POST", "/generate-image-v2", body)["background_job_id"]
    for _ in range(120):
        time.sleep(5); r = pls.call("GET", "/background-jobs/" + jid)
        if r.get("status") not in ("processing", "pending", "queued"):
            break
    lr = r.get("last_response") or {}; imgs = lr.get("images") or []
    if r.get("status") != "completed" or not imgs:
        sys.exit("job %s ended %s" % (jid, r.get("status")))
    Z, C, N = 4, a.size + 4, 5
    sheet = Image.new("RGBA", (C * Z * N, C * Z * ((len(imgs) + N - 1) // N)), (232, 232, 232, 255))
    for i, im in enumerate(imgs):
        g = Image.open(io.BytesIO(base64.b64decode(im["base64"].split(",")[-1]))).convert("RGBA"); g.save(out + "/g%02d.png" % i)
        sheet.alpha_composite(g.resize((g.width * Z, g.height * Z), Image.NEAREST), ((i % N) * C * Z + 2 * Z, (i // N) * C * Z + 2 * Z))
    sheet.convert("RGB").save(out + "/sheet.png")
    json.dump({"tribe": a.tribe, "job": jid, "seed": str(lr.get("seed")), "style_src": "pmd-ref " + a.style,
               "palette_src": "custom: %s colours + %s" % (os.path.basename(a.palette) if a.palette else a.item + " still", " ".join(extra)), "ref": "%s %s (reference_images)" % (a.item, os.path.basename(a.still)),
               "item": a.item, "form": 3, "note": "form 3 batch (pixellab_f3.py)"}, open(out + "/batch.json", "w"))
    print(a.item, "job", jid, "seed", lr.get("seed"), "images", len(imgs), "->", out)


if __name__ == "__main__":
    main()
