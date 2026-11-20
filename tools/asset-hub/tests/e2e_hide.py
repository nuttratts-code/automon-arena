"""Set 262 (owner): parts outside the current flow are hidden from the screen only; switch "แสดงส่วนที่ซ่อน" shows them again.
Run on the TEST copy only (README "Testing on a test copy"): python tests/e2e_hide.py <outdir>  (server on 127.0.0.1:5188)
Needs WN-1 with a still and a frames round (live data)."""
import sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]
BASE = "http://127.0.0.1:5188"
res = []
def check(n, ok, info=""):
    res.append(bool(ok)); print(("PASS " if ok else "FAIL ") + n + (f"  [{info}]" if info != "" else ""))
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, hgt in ((1100, 860), (390, 844)):
        pg = b.new_page(viewport={"width": w, "height": hgt})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(BASE + "/"); pg.evaluate("localStorage.removeItem('hubShowOld')"); pg.reload(); pg.wait_for_timeout(1000)
        hub0 = pg.evaluate("fetch('/api/hub').then(r=>r.json())")
        steps = lambda: pg.locator(".pipe button b").all_text_contents()
        old_tabs = lambda: pg.evaluate("[...document.querySelectorAll('#tabs [data-old]')].filter(t=>!t.hidden).length")
        if w == 1100:
            check("old tabs hidden by default", old_tabs() == 0)
            check("kept tabs visible", pg.locator("#tabs button", has_text="จัดทีม").is_visible() and pg.locator("#tabs button", has_text="ตัวละคร").is_visible())
        # set 262 B: overview = 8-step flow bar per creature + "ถัดไป" line + who filter
        nchar = sum(1 for it in hub0["items"].values() if it.get("kind") == "character")
        pg.screenshot(path=f"{OUT}/board_{w}.png", full_page=True)
        if w == 1100:
            check("every character tile has an 8-step bar", pg.locator(".tile .flowbar").count() == nchar and pg.locator(".tile .flowbar").first.locator("i").count() == 8, (pg.locator(".tile .flowbar").count(), nchar))
            wn = pg.locator(".tile", has_text="WN-1").first
            exp = pg.evaluate("flowDone(hub.items['WN-1'])")
            check("WN-1 bar matches its data", wn.locator(".flowbar i.on").count() == sum(exp), exp)
            check("WN-1 next line", wn.locator(".nxt").count() == (0 if all(exp) else 1) and (all(exp) or "ถัดไป:" in wn.text_content()))
            check("all-done tile says ครบทุกขั้น, never the old เฟรมเสร็จ", pg.locator(".tile", has_text="เฟรมเสร็จ").count() == 0)
            sel = pg.locator(".filters select")
            sel.select_option("who-claude"); pg.wait_for_timeout(300)
            vis = pg.evaluate("[...document.querySelectorAll('.tile:not([hidden])')].map(t=>t.querySelector('.nxt')?.className||'')")
            check("filter ถึงตา Claude shows only Claude's turn", vis and all("who-claude" in c for c in vis), vis[:4])
            sel.select_option(""); pg.wait_for_timeout(200)
            pg.evaluate("openItem('HL-2')"); pg.wait_for_timeout(1000)
            row = pg.locator("#list button", has_text="HL-2").first
            exp2 = pg.evaluate("flowDone(hub.items['HL-2'])")
            check("rail row has the 8-step bar matching data", row.locator(".flowbar i").count() == 8 and row.locator(".flowbar i.on").count() == sum(exp2), exp2)
            check("rail bar tooltip lists missing steps", ("ขาด:" in (row.locator(".flowbar").get_attribute("title") or "")) != all(exp2))
            pg.screenshot(path=f"{OUT}/rail_{w}.png")
            pg.evaluate("ui.item=null; render()"); pg.wait_for_timeout(600)
            check("old status legend gone", pg.locator(".legend", has_text="รอวิดีโอ").count() == 0 and pg.locator(".legend", has_text="ถึงตาคุณ").count() == 1)
        pg.evaluate("ui.tab='chars'; ui.step='still'; openItem('WN-1')"); pg.wait_for_timeout(1200)
        pg.screenshot(path=f"{OUT}/hide_still_{w}.png", full_page=True)
        if w == 1100:
            check("3 steps: ภาพนิ่ง เฟรม เงา", steps() == ["ภาพนิ่ง", "เฟรม", "เงา"], steps())
            check("form switch kept (owner I2)", pg.locator(".tools .seg button", has_text="ร่าง 3").count() == 1)
            check("no check+veo button", pg.locator("button", has_text="ส่งให้ Claude ตรวจ").count() == 0)
            check("no cut button", pg.locator(".actbar button", has_text="ตัดพื้น").count() == 0)
            check("no P1 checklist", pg.locator(".panel b", has_text="ตรวจภาพนิ่ง").count() == 0)
            check("brief boxes kept (concept + idle)", pg.locator(".brief").count() == 2)
            check("no old-flow job banners (check+veo / frames+shadow)", pg.locator(".job", has_text="พรอมต์วิดีโอ").count() == 0 and pg.locator(".job", has_text="ตัดเฟรม + สร้างเงา").count() == 0)
            check("batch still row has no 'undefined'", "undefined" not in pg.locator(".rounds").first.text_content())
            pg.locator(".head button", has_text="ส่งงานให้ Claude").click(); pg.wait_for_timeout(300)
            check("dialog has no video presets", pg.locator("#dlg button", has_text="ตัดเฟรม + สร้างเงา").count() == 0 and pg.locator("#dlg button", has_text="ตรวจภาพ + เขียน").count() == 0)
            pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
            pg.evaluate("ui.move='attack'; ui.step='frames'; render()"); pg.wait_for_timeout(1200)
            check("frames: no move switch, idle forced", pg.locator(".tools .seg button", has_text="โจมตี").count() == 0 and pg.evaluate("ui.move") == "idle")
            check("frames: no video frame-cut button", pg.locator("button", has_text="ตัดเฟรม + สร้างเงา").count() == 0)
            pg.evaluate("ui.step='prompt'; render()"); pg.wait_for_timeout(600)
            check("hidden step falls back to the first step", pg.evaluate("ui.step") == "still")
            pg.locator("#oldBtn").click(); pg.wait_for_timeout(800)
            check("switch on: 6 steps + old tabs back", len(steps()) == 6 and old_tabs() == 3, (steps(), old_tabs()))
            check("switch on: check+veo button back", pg.locator("button", has_text="ส่งให้ Claude ตรวจ").count() == 1)
            pg.screenshot(path=f"{OUT}/hide_on_{w}.png", full_page=True)
            pg.locator("#tabs button", has_text="งานถึง Claude").click(); pg.wait_for_timeout(500)
            pg.locator("#oldBtn").click(); pg.wait_for_timeout(800)
            check("switch off on a hidden tab -> back to ตัวละคร", pg.evaluate("ui.tab") == "chars" and old_tabs() == 0)
            pg.reload(); pg.wait_for_timeout(1000)
            check("off is remembered after reload", old_tabs() == 0)
            hub1 = pg.evaluate("fetch('/api/hub').then(r=>r.json())")
            check("switch never writes hub.json", hub1.get("rev") == hub0.get("rev"), (hub0.get("rev"), hub1.get("rev")))
        else:
            sw = pg.evaluate("document.documentElement.scrollWidth")
            check("phone 390: no sideways page scroll from the header", sw <= 392 or pg.evaluate("document.querySelector('header').scrollWidth") <= 392, sw)
        check(f"no page errors ({w})", not errs, errs[:3])
        pg.close()
    b.close()
print(f"SUMMARY {sum(res)} / {len(res)}")
