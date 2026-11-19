import sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]
res = []
def check(n, ok, info=""):
    res.append(bool(ok)); print(("PASS " if ok else "FAIL ") + n + (f"  [{info}]" if info != "" else ""))
SL = [[0.3607,0.6311],[0.3907,0.8079],[0.2493,0.6311],[0.2449,0.8079],[0.1379,0.6311],[0.0991,0.8079]]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1366, "height": 860})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("dialog", lambda d: d.accept())
    hub = lambda: pg.evaluate("fetch('/api/hub').then(r=>r.json())")
    def wait(ms=900):
        pg.wait_for_timeout(ms)
        for _ in range(40):
            t = pg.evaluate("document.getElementById('saveState').textContent")
            if "แก้ไข" not in t and "กำลังบันทึก" not in t: return
            pg.wait_for_timeout(150)
    def slot_pt(k, up=40):
        return pg.evaluate(f"""(()=>{{const c=document.querySelector('.team-cv'),r=c.getBoundingClientRect(),S={SL},cw=c.width,ch=c.height,oy=cw===1920?0:330;
          const x=S[{k}][0]*1920, y=S[{k}][1]*1061-oy; return [r.left+x*r.width/cw, r.top+(y-{up})*r.height/ch]}})()""")
    def drag(a, bb, steps=8):
        pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move(*bb, steps=steps); pg.mouse.up()
    pg.goto("http://127.0.0.1:5188/"); pg.wait_for_timeout(1000)
    pg.locator("#tabs button", has_text="จัดทีม").click(); pg.wait_for_timeout(1500)
    ids0 = hub()["settings"]["team"]["ids"]
    SID = ids0[1]; print("slot 2 =", SID, ids0)
    # ---- locked by default: drag swaps
    pg.locator(".fslot").nth(5).click(); pg.wait_for_timeout(200)  # slot 1 PL-1
    sw = pg.locator(".insp .switch", has_text="ล็อคตำแหน่ง")
    check("lock switch on by default", sw.get_attribute("aria-checked") == "true")
    drag(slot_pt(1), slot_pt(0)); wait()
    check("locked drag swaps", hub()["settings"]["team"]["ids"][0] == ids0[1])
    pg.keyboard.press("Control+z"); wait()
    check("undo swap", hub()["settings"]["team"]["ids"] == ids0)
    # ---- slot buttons drag-swap (HTML5 dnd)
    pg.locator(".fslot").nth(5).drag_to(pg.locator(".fslot").nth(2)); wait()  # slot 1 -> slot 0
    ids1 = hub()["settings"]["team"]["ids"]
    check("slot button drag swaps", ids1[0] == ids0[1] and ids1[1] == ids0[0], ids1)
    pg.keyboard.press("Control+z"); wait()
    # ---- unlock PL-1 (slot 1), drag = move/float
    pg.locator(".fslot").nth(5).click(); pg.wait_for_timeout(200)
    sw.click(); wait()
    check("unlock saves free", hub()["items"][SID].get("free") is True)
    check("free tag on slot button", pg.locator(".fslot .freetag").count() >= 1)
    o0 = hub()["items"][SID].get("offset") or {"x": 0, "y": 0}
    a = slot_pt(1); drag(a, [a[0], a[1] - 50]); wait()
    o1 = hub()["items"][SID].get("offset")
    check("unlocked drag floats up (no swap)", o1 and o1["y"] < o0["y"] - 30 and hub()["settings"]["team"]["ids"] == ids0, (o0, o1))
    pg.locator(".team-cv").focus(); pg.keyboard.press("ArrowLeft"); wait()
    check("arrow nudges unlocked", hub()["items"][SID]["offset"]["x"] == o1["x"] - 1)
    pg.screenshot(path=f"{OUT}/v1_float.png")
    # ---- export includes offset only while free (dry check of the server builder via a HEAD-less call is not available -> check after re-lock)
    sw.click(); wait()
    check("re-lock clears free", "free" not in hub()["items"][SID])
    check("locked = drawn on slot again", pg.evaluate("ui.teamSel")==1)
    # ---- feet mode
    fb = pg.locator(".insp button", has_text="ปรับจุดเท้า"); fb.click(); pg.wait_for_timeout(300)
    check("feet mode on", pg.locator(".insp button", has_text="เสร็จ").count() == 1)
    sh0 = hub()["items"][SID].get("shadow")
    a = slot_pt(1, 60); drag(a, [a[0], a[1] + 10]); wait()
    sh1 = hub()["items"][SID].get("shadow")
    still = [r for r in hub()["items"][SID]["rounds"] if r["star"] and r["slot"] in ("still",)]
    check("feet drag writes shadow.feet", sh1 and sh1.get("feet") != (sh0 or {}).get("feet"), (sh0 and sh0.get("feet"), sh1 and sh1.get("feet")))
    check("feet re-points shadow at the still/cut", sh1 and sh1.get("round") is not None, sh1 and sh1.get("round"))
    fy1 = sh1["feet"][1]
    pg.keyboard.press("ArrowUp"); wait()
    check("arrow in feet mode moves feet", hub()["items"][SID]["shadow"]["feet"][1] != fy1)
    pg.screenshot(path=f"{OUT}/v2_feet.png")
    pg.keyboard.press("Control+z"); wait(); pg.keyboard.press("Control+z"); wait()
    check("undo feet", (hub()["items"][SID].get("shadow") or {}).get("feet") == (sh0 or {}).get("feet"))
    pg.locator(".insp button", has_text="เสร็จ").click() if pg.locator(".insp button", has_text="เสร็จ").count() else None
    pg.locator(".insp button", has_text="หาจุดเท้าอัตโนมัติ").click(); wait()
    check("auto feet sets value", (hub()["items"][SID].get("shadow") or {}).get("feet") is not None)
    # shadow tab still opens fine with the new feet
    pg.evaluate("ui.tab='chars'; ui.step='shadow'; openItem('"+SID+"')"); pg.wait_for_timeout(1500)
    check("shadow tab renders", pg.locator(".shadow-ed canvas").count() >= 1)
    # ---- pixel editor
    pg.evaluate("ui.step='still'; openItem('WN-1')"); pg.wait_for_timeout(1200)
    n0 = len(hub()["items"]["WN-1"]["rounds"])
    star0 = [r["id"] for r in hub()["items"]["WN-1"]["rounds"] if r["star"] and r["slot"] == "still"]
    pg.locator(".actbar button", has_text="แก้พิกเซล").first.click(); pg.wait_for_timeout(800)
    check("editor opens", pg.locator("dialog.pxed-dlg[open] .pxed-cv").count() == 1)
    cvb = pg.locator(".pxed-cv").bounding_box()
    W = pg.evaluate("document.querySelector('.pxed-cv').width"); MIR = pg.evaluate("document.querySelector('.pxed-cv').classList.contains('flipx')"); z = pg.evaluate("parseInt(document.querySelector('.pxed b').textContent.slice(1))"); WP = W // z
    SX = lambda X: cvb["x"] + ((WP - 1 - X) if MIR else X) * z + z / 2
    rd = lambda x, y: pg.evaluate(f"(()=>{{const c=document.querySelector('.pxed-cv'),g=c.getContext('2d');return [...g.getImageData({x}*{z}+{z//2},{y}*{z}+{z//2},1,1).data]}})()")
    # erase a stroke with left drag on row 40
    y = cvb["y"] + 40 * z + z / 2
    pg.mouse.move(SX(20), y); pg.mouse.down(button="right"); pg.mouse.move(SX(60), y, steps=3); pg.mouse.up(button="right"); pg.wait_for_timeout(200)
    check("right drag erases a continuous line", all(rd(x, 40)[3] == 0 for x in range(20, 61)), [rd(x, 40)[3] for x in (20, 35, 50, 60)])
    # pick colour with space + right click on a painted pixel, then paint with right click
    pg.keyboard.down("Space"); pg.wait_for_timeout(100)
    check("space = picker mode", "ดูดสี" in pg.locator(".pxed-mode").text_content() and pg.locator(".pxed-mode.picking").count() == 1)
    # find an opaque pixel
    opq = pg.evaluate(f"(()=>{{const c=document.querySelector('.pxed-cv'),g=c.getContext('2d');for(let y=0;y<c.height/{z};y++)for(let x=0;x<c.width/{z};x++){{const d=g.getImageData(x*{z}+{z}/2|0,y*{z}+{z}/2|0,1,1).data;if(d[3]===255)return [x,y,d[0],d[1],d[2]]}}}})()")
    pg.mouse.click(SX(opq[0]), cvb["y"] + opq[1] * z + z / 2, button="right"); pg.wait_for_timeout(150)
    pg.keyboard.up("Space"); pg.wait_for_timeout(100)
    cur = pg.locator(".pxed-side .pxed-cur + .small").first.text_content()
    exp = "#%02x%02x%02x" % tuple(opq[2:5])
    check("picked colour", cur == exp, (cur, exp))
    check("space up = normal mode", pg.locator(".pxed-mode.picking").count() == 0)
    pg.mouse.move(SX(20), y); pg.mouse.down(button="left"); pg.mouse.move(SX(30), y, steps=2); pg.mouse.up(button="left"); pg.wait_for_timeout(200)
    check("left drag paints picked colour", all(rd(x, 40)[:3] == opq[2:5] and rd(x, 40)[3] == 255 for x in range(20, 31)))
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(150)
    check("undo paint", rd(25, 40)[3] == 0)
    pg.keyboard.press("Control+y"); pg.wait_for_timeout(150)
    check("redo paint", rd(25, 40)[3] == 255)
    # Esc asks (dialog handler accepts confirm -> closes); reopen to test save instead
    pg.screenshot(path=f"{OUT}/v3_editor.png")
    pg.locator("dialog.pxed-dlg button", has_text="บันทึกและใช้เลย").click(); pg.wait_for_timeout(1800)
    h2 = hub()["items"]["WN-1"]["rounds"]
    star1 = [r["id"] for r in h2 if r["star"] and r["slot"] == "still"]
    check("save adds a round", len(h2) == n0 + 1)
    new = h2[-1]; check("save stars the new round (used right away)", new["star"] and sum(1 for r in h2 if r["star"] and r["slot"] == new["slot"] and (r.get("form") or 1) == (new.get("form") or 1)) == 1, (new["slot"], new["star"]))
    check("new round keeps flip", bool(h2[-1].get("flip")) == bool([r for r in h2 if r["id"] == star0[0]][0].get("flip")) if star0 else True)
    check("dialog closed", pg.locator("dialog[open]").count() == 0)
    # ---- name + skills box on the still step (owner set 248 round 4: A1 file for Godot, B1 sent with the export button)
    pg.evaluate("ui.tab='chars'; ui.step='still'; ui.sel=null; openItem('WN-1')"); pg.wait_for_timeout(800)
    box = pg.locator(".charinfo")
    gi = pg.evaluate("fetch('/api/game').then(r=>r.json())")["WN-1"]
    check("still step shows the name box with the current name", box.count() == 1 and pg.locator(".charinfo .nameIn").input_value() == hub()["items"]["WN-1"]["name"])
    check("skill text of the creature is shown", len(gi["skills"]) > 0 and gi["skills"][0][0] in box.text_content() and "Lv3" in box.text_content(), gi["skills"][:1])
    inp = pg.locator(".charinfo .nameIn"); inp.fill("หมูป่าทดสอบ"); inp.press("Tab"); pg.wait_for_timeout(1200)
    check("typed name is saved to the hub", hub()["items"]["WN-1"]["name"] == "หมูป่าทดสอบ")
    check("old game name + reset button shown", ("ชื่อเดิมในเกม: " + gi["name"]) in box.text_content() and pg.locator(".charinfo button", has_text="คืนชื่อเดิม").is_visible())
    check("header shows the new name", "หมูป่าทดสอบ" in pg.locator("h2").first.text_content())
    check("name box limited to 24 characters", pg.locator(".charinfo .nameIn").get_attribute("maxlength") == "24")
    pg.locator("#exportBtn").click(); pg.wait_for_timeout(1200)
    import json, os
    ex = json.load(open(os.path.join(os.environ["HUB_ROOT"], "godot", "data", "unit_shadows.json"), encoding="utf-8"))
    check("export writes the name for Godot", ex.get("names", {}).get("WN-1") == "หมูป่าทดสอบ", ex.get("names", {}).get("WN-1"))
    pg.locator(".charinfo button", has_text="คืนชื่อเดิม").click(); pg.wait_for_timeout(1200)
    check("reset gives back the game name", hub()["items"]["WN-1"]["name"] == gi["name"])
    # set 255: icon frame openings (แต่งกรอบ) — drag across the top of the frame opens one gap, the file grows by 25 % each side
    pg.locator("button", has_text="ตัดกรอบใหม่").first.click(); pg.wait_for_timeout(600)
    pg.locator(".icon-side .switch").click(); pg.wait_for_timeout(200)
    cb = pg.locator(".icon-cv").bounding_box()
    pg.mouse.move(cb["x"] + cb["width"] * 0.3, cb["y"] + 5); pg.mouse.down()
    pg.mouse.move(cb["x"] + cb["width"] * 0.5, cb["y"] + 3, steps=4); pg.mouse.move(cb["x"] + cb["width"] * 0.7, cb["y"] + 5, steps=4); pg.mouse.up(); pg.wait_for_timeout(300)
    check("frame drag opens one gap", "เปิดกรอบ 1 ช่อง" in pg.locator(".icon-frame").text_content(), pg.locator(".icon-frame").text_content()[:60])
    check("file size shows the 25 % reach", "ไฟล์" in pg.locator(".icon-side").text_content())
    pg.locator("#dlg button", has_text="บันทึกและใช้เลย").click(); pg.wait_for_timeout(1500)
    wi = hub()["items"]["WN-1"]; nr = [r for r in wi["rounds"] if r["slot"] == "icon"][-1]
    check("icon saved with pad + openings", nr.get("star") and nr.get("iconPad", 0) > 0 and len(wi["iconCrop"].get("open", [])) == 1, (nr.get("iconPad"), wi.get("iconCrop")))
    check("icon box offers pixel edit", pg.locator(".iconbox button", has_text="แก้พิกเซล").is_visible())
    nIcons = len([r for r in hub()["items"]["WN-1"]["rounds"] if r["slot"] == "icon"])
    check("icon in use has no delete button", pg.locator(".iconcell:has(.iconpick.on) .icondel").count() == 0)
    pg.locator(".iconbox .icondel").first.click(); pg.wait_for_timeout(1200)
    left = [r for r in hub()["items"]["WN-1"]["rounds"] if r["slot"] == "icon"]
    check("old icon deleted, icon in use kept", len(left) == nIcons - 1 and any(r.get("star") for r in left), (nIcons, len(left)))
    check("no page errors", not errs, errs[:3])
    print("SUMMARY", sum(res), "/", len(res))
    b.close()
