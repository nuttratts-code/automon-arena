"""Set 267 (owner A1 B1 C1): form 3 (ร่าง 3) in the icon crop, the shadow tab and the team tab.
Run on the TEST copy only (README "Testing on a test copy"): python tests/e2e_form3.py <outdir> <T>  (server on 127.0.0.1:5188)
Needs a character with a form-1 and a form-3 still (live data: HL-1)."""
import json, sys
from playwright.sync_api import sync_playwright
OUT, T = sys.argv[1], sys.argv[2]
BASE = "http://127.0.0.1:5188"
ID = "HL-1"
res = []
def check(n, ok, info=""):
    res.append(bool(ok)); print(("PASS " if ok else "FAIL ") + n + (f"  [{info}]" if info != "" else ""))
W = "await new Promise(r=>setTimeout(r,%d));"
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1366, "height": 768})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "/"); pg.wait_for_timeout(1200)
    f1 = pg.evaluate(f"JSON.stringify({{s: hub.items['{ID}'].shadow || null, k: hub.items['{ID}'].scale || null, c: hub.items['{ID}'].iconCrop || null}})")
    has3 = pg.evaluate(f"!!usedPic(hub.items['{ID}'], 3)")
    check("test creature has a form-3 still", has3)
    # icon crop uses the form-3 picture
    r = pg.evaluate("(async()=>{ui.tab='chars'; ui.step='still'; ui.form=3; openItem('%s'); %s const b=[...document.querySelectorAll('.iconbox button')].find(x=>/ตัดกรอบ/.test(x.textContent)); b.click(); %s const src=usedPic(hub.items['%s'],3); const img=await loadImg(src.file); return {cv: document.querySelector('.icon-cv').width, w: img.naturalWidth}})()" % (ID, W % 900, W % 1200, ID))
    z = pg.evaluate("Math.round(document.querySelector('.icon-cv').width / (%d + 48))" % r["w"])
    check("icon crop opens the form-3 picture", r["cv"] == (r["w"] + 48) * z, r)
    pg.evaluate("(async()=>{[...document.querySelectorAll('#dlg button')].find(b=>b.textContent==='บันทึกและใช้เลย').click(); %s})()" % (W % 2000))
    pg.wait_for_timeout(2200)
    ic = pg.evaluate(f"(()=>{{const it=hub.items['{ID}']; return {{f3: it.rounds.filter(r=>r.slot==='icon'&&r.form===3&&r.star).length, f1: it.rounds.filter(r=>r.slot==='icon'&&(r.form||1)===1&&r.star).length, c3: !!it.iconCrop3, c1: JSON.stringify(it.iconCrop||null)}}}})()")
    check("form-3 icon saved as its own ★ (form-1 ★ kept)", ic["f3"] == 1 and (ic["f1"] == 1 or json.loads(f1)["c"] is None), ic)
    check("form-3 crop remembered in iconCrop3, form-1 crop untouched", ic["c3"] and ic["c1"] == json.dumps(json.loads(f1)["c"], separators=(",", ":")), ic)
    # shadow tab: ร่าง 1/3 switch, form 3 writes shadow3 only
    r = pg.evaluate("(async()=>{ui.step='shadow'; ui.form=3; render(); %s const sw=[...document.querySelectorAll('.tools .seg button')].map(b=>b.textContent); const s=document.querySelector('.sliders input[type=range]'); s.value='1.3'; s.dispatchEvent(new Event('input',{bubbles:true})); %s const it=hub.items['%s']; return {sw, s3: it.shadow3 && it.shadow3.cast.len, r3: it.shadow3 && it.shadow3.round, u3: usedPic(it,3).id}})()" % (W % 1500, W % 1500, ID))
    check("shadow step shows the ร่าง 1/3 switch", "ร่าง 3" in r["sw"], r["sw"])
    check("form-3 shadow saved in shadow3 on the form-3 picture", r["s3"] == 1.3 and r["r3"] == r["u3"], r)
    s1 = pg.evaluate(f"JSON.stringify(hub.items['{ID}'].shadow || null)")
    check("form-1 shadow unchanged", s1 == json.dumps(json.loads(f1)["s"], separators=(",", ":"), ensure_ascii=False) or json.loads(s1) == json.loads(f1)["s"])
    pg.screenshot(path=f"{OUT}/form3_shadow.png")
    # team tab: per-slot ร่าง switch, size per form, swap carries the form, undo
    r = pg.evaluate("(async()=>{const t=teamCfg(); t.ids[1]='%s'; t.forms=[1,1,1,1,1,1]; ui.tab='team'; ui.teamSel=1; render(); %s const fb=[...document.querySelectorAll('.teamform button')]; fb[1].click(); %s [...document.querySelectorAll('.snaps button')].find(b=>b.textContent==='2.5×').click(); %s const it=hub.items['%s']; return {forms: t.forms.slice(), k3: it.scale3 && it.scale3.k, tag: [...document.querySelectorAll('.fslot')].some(b=>b.textContent.includes('ร่าง 3'))}})()" % (ID, W % 1500, W % 1500, W % 400, ID))
    check("team slot switched to form 3", r["forms"][1] == 3, r)
    check("form-3 size saved in scale3", r["k3"] == 2.5, r)
    check("slot button shows the ร่าง 3 tag", r["tag"])
    k1 = pg.evaluate(f"JSON.stringify(hub.items['{ID}'].scale || null)")
    check("form-1 size unchanged", json.loads(k1) == json.loads(f1)["k"], k1)
    pg.screenshot(path=f"{OUT}/form3_team.png")
    r = pg.evaluate("(async()=>{const tg=[...document.querySelectorAll('.fslot')].find(b=>b.textContent.startsWith('1')); const dt=new DataTransfer(); dt.setData('text/plain','1'); tg.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true})); %s const t=teamCfg(); const a=[t.ids[0], t.forms[0], t.forms[1]]; teamApi.undo(); %s return {a, u: [t.ids[1], teamCfg().forms[1]]}})()" % (W % 800, W % 800))
    check("swap moves the form with the creature", r["a"][0] == ID and r["a"][1] == 3 and r["a"][2] == 1, r)
    check("undo brings the slot and form back", r["u"] == [ID, 3], r)
    pg.wait_for_timeout(1500)
    # export writes units_f3 / scale_f3 (test copy only)
    ex = pg.evaluate("api('/api/export', { method: 'POST' })")
    d = json.load(open(f"{T}/godot/data/unit_shadows.json", encoding="utf-8"))
    check("export has units_f3 + scale_f3 for the creature", ID in d.get("units_f3", {}) and d.get("scale_f3", {}).get(ID, {}).get("k") == 2.5 and d["units_f3"][ID]["cast"]["len"] == 1.3, ex)
    check("no page errors", not errs, errs[:3])
    b.close()
print(f"SUMMARY {sum(res)} / {len(res)}")
