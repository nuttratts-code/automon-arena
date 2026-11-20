"""Still batch picker on the hub server (set 260). Run against the TEST server (port 5188, HUB_ROOT=<T>, STILL_BATCHES=<T>/sb
with copies of 3 batches: fire, steel, spirit; the test adds fire_f3 = a copy of fire locked to PL-1, form 3 (set 265)).
Picks file = <T>/art/hub/stillpicks/ (delete it before a run).
  python tests/e2e_pick.py <outdir> <T>"""
import json, os, shutil, sys, urllib.request, urllib.error
from playwright.sync_api import sync_playwright
OUT, T = sys.argv[1], sys.argv[2]
URL = "http://127.0.0.1:5188"
PK = os.path.join(T, "art", "hub", "stillpicks")
res = []
def check(n, ok, info=""):
    res.append(bool(ok)); print(("PASS " if ok else "FAIL ") + n + (f"  [{info}]" if info != "" else ""))
def latest(): return json.load(open(os.path.join(PK, "latest.json"), encoding="utf-8"))
def hist(): return [json.loads(l) for l in open(os.path.join(PK, "history.jsonl"), encoding="utf-8") if l.strip()]
def post(body, origin=URL, path="/api/stillpicks"):
    rq = urllib.request.Request(URL + path, data=json.dumps(body).encode(), method="POST", headers={"Content-Type": "application/json", **({"Origin": origin} if origin else {})})
    try:
        with urllib.request.urlopen(rq) as r: return r.status
    except urllib.error.HTTPError as e: return e.code
def get(path):
    try:
        with urllib.request.urlopen(URL + path) as r: return r.status
    except urllib.error.HTTPError as e: return e.code
os.makedirs(OUT, exist_ok=True)
F3 = os.path.join(T, "sb", "fire_f3")  # set 265: a batch made for one creature, form 3 -> ID locked on the page
shutil.rmtree(F3, ignore_errors=True); shutil.copytree(os.path.join(T, "sb", "fire"), F3)
m = json.load(open(os.path.join(F3, "batch.json"), encoding="utf-8")) if os.path.exists(os.path.join(F3, "batch.json")) else {"tribe": "fire"}
m.update(item="PL-1", form=3); json.dump(m, open(os.path.join(F3, "batch.json"), "w", encoding="utf-8"))
# set 265 (owner I1): a hub round from fire g07 -> g07 first on /pick, tagged
HJ = os.path.join(T, "art", "hub", "hub.json"); hub = json.load(open(HJ, encoding="utf-8"))
J8 = str(json.load(open(os.path.join(T, "sb", "fire", "batch.json"), encoding="utf-8")).get("job", ""))[:8]
rr = hub["items"]["PL-1"]["rounds"]; rr[:] = [r for r in rr if r.get("id") != "re2etest"]
rr.append({"id": "re2etest", "slot": "still", "form": 1, "file": "hub/PL-1/none.png", "archived": True, "star": False, "meta": {"batch": "batches/2026-01-01_" + J8, "pick": "g07"}})
json.dump(hub, open(HJ, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for f in ("latest.json", "history.jsonl"):
    if os.path.exists(os.path.join(PK, f)): os.remove(os.path.join(PK, f))

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1280, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("dialog", lambda d: d.accept())
    pg.goto(URL + "/pick"); pg.wait_for_timeout(1200)
    check("4 batches listed", pg.locator(".batch").count() == 4, pg.locator(".batch").count())
    check("tribe tabs", pg.locator(".tabs button").count() == 3)
    check("status says never saved", "ยังไม่เคยบันทึก" in pg.locator("#save").text_content())
    pg.locator(".tabs button[data-tribe=fire]").click(); pg.wait_for_timeout(200)
    box = pg.locator("#b_fire")
    check("fire batch visible, others hidden", box.is_visible() and not pg.locator("#b_steel").is_visible())
    check("25 pictures load from the outside folder", box.locator(".p img").count() == 25 and pg.evaluate("[...document.querySelectorAll('#b_fire .p img')].slice(0,3).every(i=>i.complete&&i.naturalWidth>0)") )
    check("picture already in the hub comes first, tagged", box.locator(".p").first.get_attribute("data-n") == "g07" and box.locator(".p[data-n=g07] .hubtag").count() == 1 and box.locator(".p[data-n=g00] .hubtag").count() == 0, box.locator(".p").first.get_attribute("data-n"))
    check("style input shown for the eye check", box.locator(".ref img").count() == 1)
    opts = box.locator("select option").all_text_contents()
    check("ID menu = fire tribe only", len(opts) == 9 and all(o.startswith("PL-") for o in opts[1:]), opts[:3])
    box.locator(".p[data-n=g03]").click(); box.locator(".p[data-n=g11]").click()
    check("eye passes by default (owner set 260)", not box.locator("input.eye").is_checked())
    box.locator("select").select_option("PL-1"); box.locator("input.eye").check(); pg.wait_for_timeout(500)
    check("ticking the warning = eye no", latest()["batches"]["fire"]["eye"] is False if os.path.exists(os.path.join(PK, "latest.json")) else False)
    box.locator("input.eye").uncheck()
    pg.wait_for_timeout(900)
    L = latest()
    check("click saves latest.json (no paste)", L["batches"]["fire"] == {"id": "PL-1", "form": 1, "pick": ["g03", "g11"], "eye": True, "hidden": False, "closed": False}, L["batches"].get("fire"))
    check("status shows saved", "บันทึกแล้ว" in pg.locator("#save").text_content())
    check("latest names the batch folder", L.get("batchDir", "").replace("\\", "/").rstrip("/").endswith("/sb"))
    h = hist()
    check("history has lines, last = current picks", h and h[-1]["line"].startswith("fire>PL-1:g03,g11:ok"), h[-1]["line"] if h else "")
    n = len(h)
    box.locator(".fold").click(); pg.wait_for_timeout(700)
    check("fold saved but no new history line", latest()["batches"]["fire"]["closed"] and len(hist()) == n)
    box.locator(".fold").click(); pg.wait_for_timeout(700)
    box.locator(".p[data-n=g11]").click(); pg.wait_for_timeout(700)
    check("unpick -> new history line", len(hist()) == n + 1 and hist()[-1]["picks"]["fire"]["pick"] == ["g03"])
    # set 265: locked form-3 batch
    f3 = pg.locator("#b_fire_f3")
    check("form-3 batch: badge ร่าง 3 + ID locked, no menu", f3.locator(".form3").text_content() == "ร่าง 3" and f3.locator(".lock").text_content().startswith("🔒 PL-1") and f3.locator("select").count() == 0)
    f3.locator(".p[data-n=g05]").click(); pg.wait_for_timeout(900)
    check("form-3 pick saves its own ID + form 3", latest()["batches"]["fire_f3"] == {"id": "PL-1", "form": 3, "pick": ["g05"], "eye": True, "hidden": False, "closed": False}, latest()["batches"].get("fire_f3"))
    # reload keeps picks (from the file, not the browser)
    pg2 = b.new_context().new_page(); pg2.goto(URL + "/pick"); pg2.wait_for_timeout(1200)
    pg2.locator(".tabs button[data-tribe=fire]").click(); pg2.wait_for_timeout(200)
    check("fresh browser shows saved picks", pg2.locator("#b_fire .p.on").count() == 1 and pg2.locator("#b_fire select").input_value() == "PL-1")
    check("tab shows star count (fire + fire_f3)", "★2" in pg2.locator(".tabs button[data-tribe=fire]").text_content())
    # second page edits -> first page gets 409, reloads
    pg2.locator("#b_fire .p[data-n=g20]").click(); pg2.wait_for_timeout(800)
    box.locator(".p[data-n=g21]").click(); pg.wait_for_timeout(900)
    check("stale page gets the newer picks back", "อีกหน้า" in pg.locator("#save").text_content() and pg.locator("#b_fire .p.on").count() == 2, pg.locator("#save").text_content())
    # hide batch + restore
    pg.locator(".tabs button[data-tribe=steel]").click(); pg.wait_for_timeout(200)
    pg.locator("#b_steel .del").click(); pg.wait_for_timeout(800)
    check("hide saved", latest()["batches"]["steel"]["hidden"] and "steel" not in hist()[-1]["picks"])
    pg.locator("#hidden button").click(); pg.wait_for_timeout(800)
    check("restore saved", not latest()["batches"]["steel"]["hidden"])
    # import old page lines
    pg.locator("#imp summary").click()
    pg.locator("#impText").fill("STILLPICK\nspirit -> PT-1 : g02,g07 · eye ok\nsteel -> ? : - · eye no\nnope -> X : g01 · eye ok")
    pg.locator("#impGo").click(); pg.wait_for_timeout(900)
    L = latest()["batches"]
    check("import fills spirit", L["spirit"]["id"] == "PT-1" and L["spirit"]["pick"] == ["g02", "g07"] and L["spirit"]["eye"])
    check("import reports unknown batch", "nope" in pg.locator("#impMsg").text_content())
    pg.screenshot(path=os.path.join(OUT, "pick_1280.png"))
    pg.set_viewport_size({"width": 390, "height": 844}); pg.wait_for_timeout(300)
    check("phone: no sideways scroll", pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
    pg.screenshot(path=os.path.join(OUT, "pick_390.png"))
    check("no page errors", not errs, errs[:2])
    # server-side guards
    r0 = latest()["rev"]
    check("POST from another site refused", post({"rev": r0, "batches": {}}, origin="http://evil.example") == 403)
    check("POST without Origin refused", post({"rev": r0, "batches": {}}, origin=None) == 403)
    check("unknown batch refused", post({"rev": r0, "batches": {"zzz": {"id": "", "pick": []}}}) == 400)
    check("picture not in batch refused", post({"rev": r0, "batches": {"fire": {"id": "", "pick": ["g99"]}}}) == 400)
    check("locked batch keeps its ID whatever is sent", post({"rev": r0, "batches": {**latest()["batches"], "fire_f3": {"id": "PL-2", "pick": []}}}) == 200 and latest()["batches"]["fire_f3"]["id"] == "PL-1")
    r0 = latest()["rev"]
    check("bad id refused", post({"rev": r0, "batches": {"fire": {"id": "../x", "pick": []}}}) == 400)
    check("old rev refused (409)", post({"rev": r0 - 1, "batches": {}}) == 409)
    check("path escape on /sb refused", get("/sb/fire/..%2F..%2Fhub.json") == 400 and get("/sb/fire/request.json") == 400 and get("/sb/fire/g00.png") == 200)
    check("picks page served", get("/pick") == 200 and get("/pick.js") == 200)
    b.close()
print(f"SUMMARY {sum(res)} / {len(res)}")
