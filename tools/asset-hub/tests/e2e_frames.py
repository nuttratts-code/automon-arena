"""Set 257 (owner C1 + D1): frames step - strip of every frame, per-frame pixel edit, ไป-กลับ (meta.pingpong) switch.
Run on the TEST copy only (README "Testing on a test copy"): python tests/e2e_frames.py <outdir>  (server on 127.0.0.1:5188)
Needs a WN-1 frames round with 8 frames whose newest frames round is the PixelLab trial (r98b2d439, pingpong on)."""
import io, sys, urllib.request, urllib.parse
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops
OUT = sys.argv[1]
BASE = "http://127.0.0.1:5188"
res = []
def check(n, ok, info=""):
    res.append(bool(ok)); print(("PASS " if ok else "FAIL ") + n + (f"  [{info}]" if info != "" else ""))
def png(f):
    return Image.open(io.BytesIO(urllib.request.urlopen(BASE + "/f/" + "/".join(urllib.parse.quote(x) for x in f.split("/"))).read())).convert("RGBA")
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1366, "height": 860})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("dialog", lambda d: d.accept())
    hub = lambda: pg.evaluate("fetch('/api/hub').then(r=>r.json())")
    pg.goto(BASE + "/"); pg.wait_for_timeout(1000)
    check("frameSeq ping-pong 8 -> 14 steps", pg.evaluate("JSON.stringify(frameSeq({n:8,pingpong:true}))") == "[0,1,2,3,4,5,6,7,6,5,4,3,2,1]")
    check("frameSeq plain 8 -> 8 steps", pg.evaluate("frameSeq({n:8}).length") == 8)
    r0 = [r for r in hub()["items"]["WN-1"]["rounds"] if r["slot"] == "frames"][-1]
    # openItem() resets ui.sel, so pick the round after it (set 262: the newest round is no longer the ★ one)
    pg.evaluate(f"ui.tab='chars'; ui.step='frames'; openItem('WN-1'); ui.sel='{r0['id']}'; render()"); pg.wait_for_timeout(1500)
    n = r0["meta"]["n"]
    check("strip shows every frame", pg.locator(".fstrip .fcell").count() == n, pg.locator(".fstrip .fcell").count())
    sw = pg.locator(".tools .switch", has_text="เล่นไป-กลับ")
    check("ไป-กลับ switch shows the saved flag", sw.get_attribute("aria-checked") == ("true" if r0["meta"].get("pingpong") else "false"))
    check("generic แก้พิกเซล hidden on a sheet", pg.locator(".actbar button", has_text="แก้พิกเซล").count() == 0)
    pg.locator(".fstrip .fcell").nth(2).click(); pg.wait_for_timeout(300)
    info = pg.locator(".tools .finfo").text_content()
    check("click a frame = stop there", info.startswith(f"เฟรม 3/{n}"), info)
    pg.wait_for_timeout(600)
    check("stays stopped", pg.locator(".tools .finfo").text_content().startswith(f"เฟรม 3/{n}"))
    pg.screenshot(path=f"{OUT}/frames_step.png")
    pg.locator(".tools button", has_text="แก้พิกเซลเฟรมนี้").click(); pg.wait_for_timeout(1200)
    h3 = pg.locator("dialog.pxed-dlg[open] h3").text_content()
    check("editor opens on one frame", f"เฟรม 3/{n}" in h3 and f"{r0['meta']['fw']}×{r0['meta']['fh']}" in h3, h3)
    W = pg.evaluate("document.querySelector('.pxed-cv').width"); z = pg.evaluate("parseInt(document.querySelector('.pxed b').textContent.slice(1))")
    cvb = pg.locator(".pxed-cv").bounding_box()
    sx = cvb["width"] / W
    # paint 3 pixels on the top-left corner area (transparent there) with the default colour
    for k in range(3):
        pg.mouse.click(cvb["x"] + (2 + k) * z * sx + 1, cvb["y"] + 2 * z * sx + 1)
    pg.wait_for_timeout(200)
    # set 262 (owner A1 B1 C1): switch to frame 5 inside the editor, edit it too, player + onion skin, one save writes both frames
    check("frame bar has every frame", pg.locator(".pxed-frs button").count() == n)
    check("player canvas runs", pg.evaluate("document.querySelector('.pxed-play').width") > 0)
    pg.locator(".pxed-frs button").nth(4).click(); pg.wait_for_timeout(400)
    check("switch to frame 5", f"เฟรม 5/{n}" in pg.locator("dialog.pxed-dlg[open] h3").text_content())
    check("frame 3 marked edited", "edited" in (pg.locator(".pxed-frs button").nth(2).get_attribute("class") or ""))
    on = pg.locator(".pxed-frbar .switch"); on.click(); pg.wait_for_timeout(150)
    check("onion skin switch", on.get_attribute("aria-checked") == "true")
    cvb = pg.locator(".pxed-cv").bounding_box()
    for k in range(2):
        pg.mouse.click(cvb["x"] + (2 + k) * z * sx + 1, cvb["y"] + 3 * z * sx + 1)
    pg.wait_for_timeout(200)
    pg.keyboard.press("Comma"); pg.wait_for_timeout(300)
    check("key , = previous frame", f"เฟรม 4/{n}" in pg.locator("dialog.pxed-dlg[open] h3").text_content())
    pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(300)
    check("→ = next frame", f"เฟรม 5/{n}" in pg.locator("dialog.pxed-dlg[open] h3").text_content())
    pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(300)
    check("← = previous frame", f"เฟรม 4/{n}" in pg.locator("dialog.pxed-dlg[open] h3").text_content())
    # owner set 262: play on the big canvas, click the picture = stop on the showing frame and edit it
    pg.locator(".pxed-bigplay").click(); pg.wait_for_timeout(700)
    ttl = pg.locator("dialog.pxed-dlg[open] h3").text_content()
    check("big play runs on the editing canvas", "กำลังเล่น" in ttl and pg.evaluate("document.querySelector('.pxed-cv').classList.contains('playing')"), ttl)
    pg.wait_for_timeout(400)
    check("big play moves on", pg.locator("dialog.pxed-dlg[open] h3").text_content() != ttl)
    cvb2 = pg.locator(".pxed-cv").bounding_box(); pg.mouse.click(cvb2["x"] + 5, cvb2["y"] + 5); pg.wait_for_timeout(300)
    ttl2 = pg.locator("dialog.pxed-dlg[open] h3").text_content()
    check("click the picture = stop there, ready to edit", "กำลังเล่น" not in ttl2 and pg.locator(".pxed-bigplay").text_content() == "▶ เล่น", ttl2)
    pg.locator(".pxed-frs button").nth(2).click(); pg.wait_for_timeout(300)
    check("back on frame 3 its undo is kept", not pg.locator("dialog.pxed-dlg button", has_text="ย้อน").first.is_disabled())
    pg.screenshot(path=f"{OUT}/frame_editor.png")
    pg.locator("dialog.pxed-dlg button", has_text="บันทึกและใช้เลย").click(); pg.wait_for_timeout(2000)
    rs = [r for r in hub()["items"]["WN-1"]["rounds"] if r["slot"] == "frames"]
    r1 = rs[-1]
    check("save adds a new frames round", r1["id"] != r0["id"] and len(rs) >= 2)
    check("new round keeps layout + ms + ไป-กลับ", r1.get("meta") == r0["meta"], r1.get("meta"))
    check("new round note names both frames", "เฟรม 3, 5" in (r1.get("note") or ""), r1.get("note"))
    a, bb = png(r0["file"]), png(r1["file"])
    check("sheet size unchanged", a.size == bb.size, (a.size, bb.size))
    fw, fh = r0["meta"]["fw"], r0["meta"]["fh"]
    changed = [k for k in range(n) if ImageChops.difference(a.crop((k * fw, 0, k * fw + fw, fh)), bb.crop((k * fw, 0, k * fw + fw, fh))).getbbox()]
    check("only frames 3 and 5 changed", changed == [2, 4], changed)
    check("old round kept", any(r["id"] == r0["id"] for r in rs))
    # toggle ไป-กลับ on the new round
    pg.evaluate(f"ui.step='frames'; ui.sel='{r1['id']}'; render()"); pg.wait_for_timeout(1200)
    on0 = bool(r1["meta"].get("pingpong"))
    pg.locator(".tools .switch", has_text="เล่นไป-กลับ").click(); pg.wait_for_timeout(1800)
    r2 = [r for r in hub()["items"]["WN-1"]["rounds"] if r["id"] == r1["id"]][0]
    check("switch saves meta.pingpong", bool(r2["meta"].get("pingpong")) != on0, r2["meta"])
    check("no page errors", not errs, errs[:3])
    b.close()
print(f"SUMMARY {sum(res)} / {len(res)}")
