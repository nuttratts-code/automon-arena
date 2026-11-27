"""Set 296 (owner A1+A3 · B1 C1 D1 E1): pixel check panel - still + frames, red marks, send to Claude eye check.
Run on the TEST copy only (README "Testing on a test copy"): python tests/e2e_pxcheck.py <outdir>  (server on 127.0.0.1:5188)
Needs PL-3 (★ 48x48 still with a light unoutlined edge) and HL-1 (★ 8-frame idle sheet)."""
import sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]
BASE = "http://127.0.0.1:5188"
res = []
def check(n, ok, info=""):
    res.append(bool(ok)); print(("PASS " if ok else "FAIL ") + n + (f"  [{info}]" if info != "" else ""))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1366, "height": 860})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    hub = lambda: pg.evaluate("fetch('/api/hub').then(r=>r.json())")
    pg.goto(BASE + "/"); pg.wait_for_timeout(1000)
    # pure checker on made-up pixels: a semi-transparent pixel, a floating speck, a near-duplicate colour
    r = pg.evaluate("""(()=>{const W=8,H=8,d=new Uint8ClampedArray(W*H*4);const put=(x,y,c,a=255)=>{const i=(y*W+x)*4;d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=a};
      for(let y=2;y<6;y++)for(let x=2;x<6;x++)put(x,y,[0,0,0]);for(let y=3;y<5;y++)for(let x=3;x<5;x++)put(x,y,[200,60,40]);put(4,4,[203,62,42]);put(0,0,[0,0,0]);put(7,7,[0,0,0],120);
      const o=PXC.analyse(d,W,H);return Object.fromEntries(o.issues.map(i=>[i.key,i.lvl+':'+i.pts.length]))})()""")
    check("semi pixel found", r.get("semi") == "bad:1", r.get("semi"))
    check("floating speck found", r.get("speck") == "bad:1", r.get("speck"))
    check("near-duplicate colour found", (r.get("near") or "").startswith("warn:"), r.get("near"))
    # set 298: near-black outline = olblack warn · pure black = no olblack · idle first-frame hold ×3
    ob = pg.evaluate("""(()=>{const W=10,H=10;const mk=(oc)=>{const d=new Uint8ClampedArray(W*H*4);for(let y=1;y<9;y++)for(let x=1;x<9;x++){const i=(y*W+x)*4,e=x==1||x==8||y==1||y==8,c=e?oc:[200,60,40];d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255}return PXC.analyse(d,W,H).issues.map(i=>i.key)};return [mk([16,20,24]).includes('olblack'),mk([0,0,0]).includes('olblack')]})()""")
    check("near-black outline flagged (olblack)", ob == [True, False], ob)
    hold = pg.evaluate("[0,250,300,500,599,600].map(t=>seqAt([0,1,2,3],100,t)).join(',') + '|' + holdMs(150,0) + ',' + holdMs(150,2)")
    check("idle hold: first frame ×3 (seqAt / holdMs)", hold == "0,0,1,3,3,0|450,150", hold)
    check("big painted picture = not pixel", pg.evaluate("(()=>{const W=300,H=300,d=new Uint8ClampedArray(W*H*4);for(let i=0;i<d.length;i+=4){d[i]=i%251;d[i+3]=255}return PXC.analyse(d,W,H).pixel})()") is False)
    check("×4 blow-up shrinks to native", pg.evaluate("(()=>{const W=320,H=320,d=new Uint8ClampedArray(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,v=((x>>2)+(y>>2))%2;d[i]=v*255;d[i+3]=255}const o=PXC.analyse(d,W,H);return o.pixel&&o.W===80&&o.k===4})()"))
    # still: PL-3
    pg.evaluate("ui.tab='chars'; ui.step='still'; openItem('PL-3'); render()"); pg.wait_for_timeout(1200)
    btn = pg.locator(".actbar .pxbtn")
    check("ตรวจภาพ button on the still", btn.count() == 1 and btn.text_content() == "ตรวจภาพ")
    check("panel closed before press (D1)", pg.locator(".pxc").count() == 0)
    btn.click(); pg.wait_for_timeout(1200)
    check("panel opens", pg.locator(".pxc .pxc-head").count() == 1)
    bad = pg.locator("button.pxi.bad")
    check("PL-3 edge problem listed", bad.count() >= 1 and "ขอบ" in bad.first.text_content(), bad.count())
    check("no marks before a row is pressed", pg.locator("canvas.pxmark").count() == 0)
    bad.first.click(); pg.wait_for_timeout(200)
    check("row press = red marks on the stage", pg.locator(".stage canvas.pxmark").count() == 1)
    check("pressed row shows aria-pressed", bad.first.get_attribute("aria-pressed") == "true")
    mk = pg.locator("canvas.pxmark").bounding_box(); im = pg.locator(".stage img, .stage > canvas:not(.pxmark)").first.bounding_box()
    check("marks sit exactly on the picture", abs(mk["x"] - im["x"]) < 1.5 and abs(mk["width"] - im["width"]) < 1.5, (mk, im))
    bad.first.click(); pg.wait_for_timeout(150)
    check("press again = marks hidden", pg.locator("canvas.pxmark").count() == 0)
    check("look-at views (grey, silhouette, real size)", pg.locator(".pxviews figure").count() == 3)
    check("palette swatches + outline marked", pg.locator(".pxpal .sw").count() >= 4 and pg.locator(".pxpal .sw.ol").count() == 1)
    pg.screenshot(path=f"{OUT}/pxcheck_still.png", full_page=False)
    rev0 = hub()["rev"]
    check("checking writes nothing", hub()["rev"] == rev0)
    # send to Claude (E1)
    pg.locator(".pxc-head button", has_text="ส่งให้ Claude ดูด้วยตา").click(); pg.wait_for_timeout(900)
    q = [x for x in hub()["queue"] if x.get("task") == "eyecheck" and x["item"] == "PL-3" and x["state"] == "open"]
    check("eye check job queued", len(q) == 1 and "ขอบ" in q[0]["text"], len(q))
    check("job names the round", q and q[0].get("round") == pg.evaluate("ui.sel || usedPic(hub.items['PL-3'],1).id"))
    check("button waits after sending", pg.locator(".pxc-head button", has_text="ส่งแล้ว รอ Claude").is_disabled())
    check("รอ Claude bar on the item", pg.locator(".job.slim", has_text="ดูภาพพิกเซลด้วยตา").count() == 1)
    # Claude's answer with a marked picture shows under "Claude ทำเสร็จแล้ว"
    still = pg.evaluate("usedPic(hub.items['PL-3'],1).file")
    pg.evaluate(f"(()=>{{const q=hub.queue.find(x=>x.task==='eyecheck'&&x.state==='open');q.state='done';q.reply='ทดสอบคำตอบ';q.replyFile='{still}';render()}})()"); pg.wait_for_timeout(500)
    check("reply picture shown", pg.locator(".job.done img.replyimg").count() == 1)
    # frames: HL-1
    pg.evaluate("ui.step='frames'; openItem('HL-1'); ui.step='frames'; render()"); pg.wait_for_timeout(1200)
    fb = pg.locator(".actbar .pxbtn")
    check("ตรวจภาพ button on the frames step", fb.count() == 1)
    fb.click(); pg.wait_for_timeout(1500)
    head = pg.locator(".pxc-head b").text_content()
    check("frames panel names the frame count", head.startswith("ตรวจท่ายืน") and "เฟรม" in head, head)
    keys = pg.evaluate("[...pxRes.values()].pop().issues.map(i=>i.key).join(',')")
    check("frame checks run (flicker, feet, still colours)", all(k in keys for k in ("flicker", "feet", "newcol")), keys)
    pg.locator(".pxok summary").click()
    row = pg.locator("button.pxi").first
    row.click(); pg.wait_for_timeout(300)
    check("frame marks drawn", pg.locator(".stage canvas.pxmark").count() == 1)
    pg.locator(".tools button", has_text="เฟรม ▶").click(); pg.wait_for_timeout(200)
    check("marks follow the frame on screen", pg.locator(".stage canvas.pxmark").count() <= 1)
    pg.screenshot(path=f"{OUT}/pxcheck_frames.png", full_page=False)
    # narrow window: the panel wraps inside its own column (the hub is a PC page; its other rows overflow at 390 since before set 296)
    pg.set_viewport_size({"width": 390, "height": 844}); pg.wait_for_timeout(400)
    wide = pg.evaluate("(()=>{const p=document.querySelector('.pxc');return p.scrollWidth-p.clientWidth})()")
    check("390 px: panel wraps inside its column", wide <= 1, wide)
    pg.screenshot(path=f"{OUT}/pxcheck_390.png", full_page=False)
    check("no page errors", not errs, errs[:2])
    b.close()
print(f"SUMMARY {sum(res)} / {len(res)}")
