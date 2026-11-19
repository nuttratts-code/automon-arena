"""PixelLab PixMiniMax idle for one creature (set 258, art-style V2.7, skill char-idle).

Key: only from the env var PIXELLAB_API_KEY (owner H1) - never printed, never written.

  python -I tools/asset-hub/pixellab_idle.py balance
  python -I tools/asset-hub/pixellab_idle.py enhance WN-1 [--direction east]
  python -I tools/asset-hub/pixellab_idle.py run WN-1 [--direction east] [--suffix "..."] [--desc "..."] [--hub]

run = enhance (engine pixminimax, first + last frame = the ★ still) -> print the text ->
append the body suffix -> animate-pixminimax (8 frames, side, no background) -> poll the job ->
frames 1..8 (index 0 = the input) -> G1: every pixel mapped to the nearest ★-still colour ->
8x1 sheet + GIF + numbers in claude/preview-set258/<ID>_<job8>/. --desc skips the enhance step.
Owner flow (set 258): --pad always (default 12) · --dry first, show the request, wait for OK ·
run (no --hub) · send preview.gif + sheet_x2.png, wait for OK · only then
  python -I tools/asset-hub/pixellab_idle.py hub <ID> claude/preview-set258/<ID>_<job8>
adds the frames round (by claude, not starred, 150 ms ค่าเสนอ, rev +1).
"""
import argparse, base64, io, json, os, secrets, sys, time, urllib.error, urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image

API = "https://api.pixellab.ai/v2"
ROOT = Path(__file__).resolve().parents[2]
HUB = ROOT / "art" / "hub" / "hub.json"
FILES = ROOT / "art" / "hub" / "files"
OUT = ROOT / "claude" / "preview-set258"
BASE_DESC = ("idle breathing loop, subtle body rise and fall, feet planted, "
             "no camera move, ends exactly on the first pose")
SUFFIX = "Hooves stay planted, legs and tail barely move, static camera, no zoom."
DIRS = ["south", "north", "east", "west", "south-east", "south-west", "north-east", "north-west"]
MS = 150  # ค่าเสนอ


def key():
    k = os.environ.get("PIXELLAB_API_KEY", "").strip()
    if not k:
        sys.exit("PIXELLAB_API_KEY is not set in this process (owner: set it in Windows, then restart the app).")
    return k


def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method,
                                 data=None if body is None else json.dumps(body).encode(),
                                 headers={"Authorization": "Bearer " + key(),
                                          "Content-Type": "application/json",
                                          "User-Agent": "automon-idle/1"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        txt = e.read().decode(errors="replace")[:800]
        sys.exit(f"HTTP {e.code} on {method} {path}: {txt}")


def b64img(img):
    buf = io.BytesIO(); img.save(buf, "PNG")
    return {"type": "base64", "base64": base64.b64encode(buf.getvalue()).decode(), "format": "png"}


def unb64(obj):
    s = obj.get("base64") if isinstance(obj, dict) else obj
    if not isinstance(s, str):
        raise ValueError("image entry without base64 string")
    if s.startswith("data:"):
        s = s.split(",", 1)[1]
    raw = base64.b64decode(s, validate=False)
    if len(raw) > 8_000_000:
        raise ValueError("image too large")
    im = Image.open(io.BytesIO(raw)); im.load()
    if im.width > 256 or im.height > 256:
        raise ValueError(f"unexpected size {im.size}")
    return im.convert("RGBA")


def star_still(item_id):
    hub = json.loads(HUB.read_text(encoding="utf8"))
    it = hub["items"].get(item_id)
    if not it:
        sys.exit(f"no hub item {item_id}")
    rs = [r for r in it.get("rounds") or [] if r.get("slot") in ("still", "cut")
          and r.get("star") and not r.get("archived")]
    if not rs:
        sys.exit(f"{item_id}: no ★ still / cut in the hub")
    r = rs[-1]
    rel = r["file"].removeprefix("hub/")
    p = (FILES / rel).resolve()
    if FILES.resolve() not in p.parents:
        sys.exit("still path outside art/hub/files")
    return r, Image.open(p).convert("RGBA")


def enhance(still, direction, action):
    res = call("POST", "/enhance-animation-v3-prompt", {
        "first_frame": b64img(still), "last_frame": b64img(still),
        "action": action, "engine": "pixminimax", "frame_count": 8})
    return res["enhanced_prompt"].strip(), res.get("usage")


def palette_map(frames, still):
    """G1: alpha cut at 128, every opaque pixel -> nearest colour of the ★ still."""
    s = np.asarray(still)
    pal = np.unique(s[s[..., 3] >= 128][:, :3], axis=0).astype(np.int32)
    out, newc = [], 0
    for f in frames:
        a = np.asarray(f).copy()
        op = a[..., 3] >= 128
        px = a[op][:, :3].astype(np.int32)
        newc = max(newc, len({tuple(c) for c in np.unique(px, axis=0)} - {tuple(c) for c in pal}))
        d = ((px[:, None, :] - pal[None, :, :]) ** 2).sum(-1)
        a[op, :3] = pal[d.argmin(1)].astype(np.uint8)
        a[op, 3] = 255
        a[~op] = 0
        out.append(Image.fromarray(a, "RGBA"))
    return out, len(pal), newc


def measure(frames, still):
    def rows(im):
        al = np.asarray(im)[..., 3] >= 128
        ys = np.where(al.any(1))[0]
        return (int(ys.min()), int(ys.max())) if len(ys) else (-1, -1)
    def mean_top(im):  # average first opaque row over columns = body rise / fall
        al = np.asarray(im)[..., 3] >= 128
        cols = al.any(0)
        return round(float(al.argmax(0)[cols].mean()), 2) if cols.any() else -1
    top, feet = zip(*(rows(f) for f in frames))
    st, sf = rows(still)
    mt = [mean_top(f) for f in frames]
    arr = [np.asarray(f).astype(np.int16) for f in frames]
    step = []
    for i in range(len(arr)):
        j = (i + 1) % len(arr)
        step.append(round(float((np.abs(arr[i] - arr[j]).sum(-1) > 0).mean() * 100), 2))
    s = np.asarray(still).astype(np.int16)
    vs = [round(float((np.abs(a - s).sum(-1) > 0).mean() * 100), 2) for a in arr]
    return {"still_top": st, "still_feet": sf, "top": list(top), "feet": list(feet),
            "still_mean_top": mean_top(still), "mean_top": mt,
            "step_pct": step, "vs_still_pct": vs}


def gif(frames, path, zoom=3):
    bg = (40, 44, 52, 255)
    ims = []
    for f in frames:
        b = Image.new("RGBA", f.size, bg); b.alpha_composite(f)
        ims.append(b.convert("RGB").resize((f.width * zoom, f.height * zoom), Image.NEAREST))
    ims[0].save(path, save_all=True, append_images=ims[1:], duration=MS, loop=0)


def add_round(item_id, sheet_path, still_round, info):
    hub = json.loads(HUB.read_text(encoding="utf8"))
    it = hub["items"][item_id]
    rid = "r" + secrets.token_hex(4)
    day = datetime.now().strftime("%Y-%m-%d")
    name = f"frames_idle_f1_{day}_{rid[1:]}.png"
    dst = FILES / item_id / name
    dst.write_bytes(Path(sheet_path).read_bytes())
    w, h = info["fw"], info["fh"]
    it.setdefault("rounds", []).append({
        "id": rid, "slot": "frames", "form": still_round.get("form", 1), "move": "idle",
        "file": f"hub/{item_id}/{name}", "orig": f"pixellab API PixMiniMax job {info['job']} (frames 1-8 of 9)",
        "t": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"), "by": "claude",
        "note": (f"set 258 API: first + last = ★ still {still_round['id']} · side, {info['direction']} · 8 frames · "
                 f"G1 palette map to the still ({info['pal']} colours) · description = enhance (pixminimax) + suffix · "
                 f"{MS} ms ค่าเสนอ"),
        "star": False, "archived": False, "licence": "AI placeholder - UNVERIFIED",
        "promptId": still_round.get("promptId", "p1"),
        "meta": {"cols": 8, "rows": 1, "fw": w, "fh": h, "n": 8, "ms": MS,
                 **({"pad": [info["pad"], info["pad"], info["pad"], min(info["pad"], 2)]} if info.get("pad") else {})}})
    hub["rev"] = hub.get("rev", 0) + 1
    HUB.write_text(json.dumps(hub, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    return rid, dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["balance", "enhance", "run", "hub"])
    ap.add_argument("item", nargs="?")
    ap.add_argument("run_dir", nargs="?", help="hub: the checked run folder")
    ap.add_argument("--direction", default="east", choices=DIRS)
    ap.add_argument("--action", default=BASE_DESC)
    ap.add_argument("--suffix", default=SUFFIX)
    ap.add_argument("--desc", help="full description; skips enhance")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--pad", type=int, default=12, help="transparent px added left/right/top (bottom max 2)")
    ap.add_argument("--dry", action="store_true", help="print the full request, send nothing to animate")
    ap.add_argument("--hub", action="store_true", help="add the sheet to the hub as a frames round")
    a = ap.parse_args()

    if a.cmd == "balance":
        b = call("GET", "/balance")
        sub = b.get("subscription") or {}
        print(f"credits usd {b.get('credits', {}).get('usd')} · plan {sub.get('plan')} · "
              f"generations {sub.get('generations')}/{sub.get('total')} · {sub.get('status')}")
        return
    if not a.item:
        sys.exit("item id needed")
    if a.cmd == "hub":  # owner looked at the GIF and said OK -> add that run (set 258 owner flow)
        d = Path(a.run_dir).resolve()
        if OUT.resolve() not in d.parents:
            sys.exit("run dir must be inside claude/preview-set258")
        sheets = list(d.glob("sheet_8x1_*.png"))
        req = json.loads((d / "request.json").read_text(encoding="utf8"))
        if len(sheets) != 1:
            sys.exit("need exactly one sheet in the run dir")
        sr, still = star_still(a.item)
        w, h = (int(x) for x in sheets[0].stem.split("_")[-1].split("x"))
        pad = (w - still.width) // 2
        rid, dst = add_round(a.item, sheets[0], sr, {"fw": w, "fh": h, "job": d.name.split("_")[-1],
                                                      "direction": req["direction"], "pal": len(np.unique(
                                                          np.asarray(still)[np.asarray(still)[..., 3] >= 128][:, :3], axis=0)),
                                                      "pad": pad})
        print(f"HUB: round {rid} -> {dst.relative_to(ROOT)} (not starred, rev +1)")
        return
    sr, still = star_still(a.item)
    print(f"★ still {sr['id']} {still.size}")
    if a.pad:  # transparent margin so the motion is not cut at the canvas edge (set 258)
        side, bot = a.pad, min(a.pad, 2)
        big = Image.new("RGBA", (still.width + 2 * side, still.height + side + bot), (0, 0, 0, 0))
        big.paste(still, (side, side))
        still = big
        print(f"padded {side} px (bottom {bot}) -> {still.size}")
    if still.width > 256 or still.height > 256:
        sys.exit("padded still > 256 px")

    if a.desc:
        desc = a.desc
    else:
        enh, use = enhance(still, a.direction, a.action)
        print("ENHANCED:", enh)
        print("enhance usage:", use)
        if a.cmd == "enhance":
            return
        desc = f"{enh} {a.suffix}".strip()
    if len(desc) > 1000:
        sys.exit(f"description {len(desc)} chars > 1000")
    print("DESCRIPTION:", desc)

    body = {"first_frame": b64img(still), "last_frame": b64img(still), "description": desc,
            "frame_count": 8, "view": "side", "direction": a.direction, "no_background": True,
            "enhance_prompt": False, "seed": a.seed}
    shown = dict(body, first_frame=f"<★ still {sr['id']} {still.width}x{still.height}>",
                 last_frame=f"<★ still {sr['id']} {still.width}x{still.height}>")
    print("REQUEST (POST /v2/animate-pixminimax, key not shown):")
    print(json.dumps(shown, ensure_ascii=False, indent=1))
    if a.dry:
        print("DRY: nothing sent to animate (0 generations).")
        return
    res = call("POST", "/animate-pixminimax", body)
    job = res["background_job_id"]
    print(f"job {job} · usage {res.get('usage')}")
    t0 = time.time()
    while True:
        time.sleep(4)
        j = call("GET", f"/background-jobs/{job}")
        st = j.get("status")
        if st == "completed":
            break
        if st == "failed" or time.time() - t0 > 900:
            lr = j.get("last_response") or {}
            sys.exit(f"job {st}: {str(lr.get('detail') or lr)[:500]}")
    lr = j.get("last_response") or {}
    imgs = lr.get("images")
    if not isinstance(imgs, list):
        sys.exit(f"no images list; last_response keys = {list(lr)}")
    print(f"done in {time.time() - t0:.0f} s · {len(imgs)} images · usage {j.get('usage')} · keys {list(lr)}")
    raw = [unb64(x) for x in imgs]
    if len(raw) != 9:
        print(f"WARNING: expected 9 images, got {len(raw)}")
    gen = raw[1:9]
    if any(f.size != still.size for f in gen):
        sys.exit(f"frame size {gen[0].size} != still {still.size}")

    d = OUT / f"{a.item}_{job[:8]}"
    d.mkdir(parents=True, exist_ok=True)
    (d / "description.txt").write_text(desc + "\n", encoding="utf8")
    (d / "request.json").write_text(json.dumps(shown, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    for i, f in enumerate(raw):
        f.save(d / f"raw_{i}.png")
    mapped, npal, newc = palette_map(gen, still)
    w, h = still.size
    sheet = Image.new("RGBA", (w * 8, h))
    for i, f in enumerate(mapped):
        sheet.paste(f, (i * w, 0))
    sp = d / f"sheet_8x1_{w}x{h}.png"
    sheet.save(sp)
    gif(mapped, d / "preview.gif")
    gif(gen, d / "preview_raw.gif")
    big = Image.new("RGBA", sheet.size, (40, 44, 52, 255)); big.alpha_composite(sheet)  # zoomed sheet for the owner
    big.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save(d / "sheet_x2.png")
    m = measure(mapped, still)
    m.update({"input_same_as_still": bool((np.asarray(raw[0]) == np.asarray(still)).all()),
              "palette": npal, "new_colours_before_map": newc})
    (d / "measure.json").write_text(json.dumps(m, indent=1) + "\n", encoding="utf8")
    print("MEASURE:", json.dumps(m))
    print("OUT:", d)
    if a.hub:
        rid, dst = add_round(a.item, sp, sr, {"fw": w, "fh": h, "job": job, "direction": a.direction,
                                              "pal": npal, "pad": a.pad})
        print(f"HUB: round {rid} -> {dst.relative_to(ROOT)} (not starred, rev +1)")


if __name__ == "__main__":
    main()
