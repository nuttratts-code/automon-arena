import sys
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]
res = []
def check(n, ok, info=""):
    res.append(bool(ok)); print(("PASS " if ok else "FAIL ") + n + (f"  [{info}]" if info != "" else ""))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1366, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("dialog", lambda d: d.accept())
    hub = lambda: pg.evaluate("fetch('/api/hub').then(r=>r.json())")
    pg.goto("http://127.0.0.1:5188/"); pg.wait_for_timeout(1200)
    pg.evaluate("ui.tab='chars'; ui.step='still'; ui.sel=null; openItem('WN-1')"); pg.wait_for_timeout(1200)
    n0 = len(hub()["items"]["WN-1"]["rounds"])
    pg.locator(".actbar button", has_text="แก้พิกเซล").click(); pg.wait_for_timeout(1200)
    check("editor opens", pg.locator("dialog.pxed-dlg[open] .pxed-cv").count() == 1)
    check("header no longer says faces left", "หันซ้าย" not in pg.locator("dialog.pxed-dlg").text_content())
    info = pg.evaluate("(()=>{const c=document.querySelector('.pxed-cv');const z=parseInt(document.querySelector('.pxed b').textContent.slice(1));return {cw:c.width,ch:c.height,z,mir:c.classList.contains('flipx')}})()")
    z = info["z"]; W = info["cw"] // z; H = info["ch"] // z; MIR = info["mir"]
    print("size", W, H, "z", z, "mirror", MIR)
    def grabAll():
        pg.mouse.move(5, 5); pg.wait_for_timeout(50)
        return pg.evaluate(f"(()=>{{const c=document.querySelector('.pxed-cv'),g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data,o=[];for(let y=0;y<{H};y++)for(let x=0;x<{W};x++){{const i=((y*{z}+({z}>>1))*c.width+x*{z}+({z}>>1))*4;o.push([d[i],d[i+1],d[i+2],d[i+3]])}}return o}})()")
    def scr(x, y):
        bb = pg.locator(".pxed-cv").bounding_box(); s = bb["width"] / W
        sx = bb["x"] + bb["width"] - (x + 0.5) * s if MIR else bb["x"] + (x + 0.5) * s
        return sx, bb["y"] + (y + 0.5) * s
    def drag(pts, shift=False):
        if shift: pg.keyboard.down("Shift")
        pg.mouse.move(*scr(*pts[0])); pg.mouse.down()
        for q in pts[1:]: pg.mouse.move(*scr(*q), steps=4)
        pg.mouse.up()
        if shift: pg.keyboard.up("Shift")
        pg.wait_for_timeout(80)
    # background white so transparent reads as the stage colour: use the alpha-preserving read on the canvas (cleared canvas = alpha 0)
    A0 = grabAll()
    op = [(i % W, i // W) for i, c in enumerate(A0) if c[3] == 255]
    x0 = min(x for x, y in op); x1 = max(x for x, y in op); y0 = min(y for x, y in op); y1 = max(y for x, y in op)
    print("creature box", x0, y0, x1, y1)
    # 1) rectangle select + copy + paste + arrows + Enter
    pg.locator(".pxed-side .seg button", has_text="เลือก ▭").click()
    check("select tool explains keys", "Ctrl+C" in pg.locator(".pxed-mode").text_content())
    check("copy disabled before selecting", pg.locator(".pxed-selrow button", has_text="คัดลอก").is_disabled())
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    # a spot on the creature's outline: opaque with a transparent neighbour to the right
    ex, ey = next((x, y) for (x, y) in sorted(op, key=lambda q: abs(q[0]-cx)+abs(q[1]-cy)) if x + 12 < W and y + 14 < H and A0[y * W + x + 1][3] == 0)
    sa, sb = (cx - 6, cy - 6), (cx + 5, cy + 5)  # 12x12 piece from the middle of the creature (mixed colours)
    drag([sa, sb])
    check("selection made -> copy enabled", not pg.locator(".pxed-selrow button", has_text="คัดลอก").is_disabled())
    pg.keyboard.press("Control+c"); pg.wait_for_timeout(200)
    pg.keyboard.press("Control+v"); pg.wait_for_timeout(200)
    check("paste = floating piece with place/flip buttons", pg.locator(".pxed-float").is_visible())
    # move the piece so it overlaps the creature edge (part over transparent, part over opaque)
    dx = 9
    for _ in range(dx): pg.keyboard.press("ArrowRight")
    pg.keyboard.press("Shift+ArrowDown"); pg.wait_for_timeout(100)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    check("Enter places it", not pg.locator(".pxed-float").is_visible())
    A1 = grabAll()
    fx = dx * (-1 if MIR else 1)  # arrow right = right on screen; file x is mirrored
    bad = 0; checked = 0; kept = 0
    for yy in range(12):
        for xx in range(12):
            s = A0[(sa[1] + yy) * W + sa[0] + xx]; tx = sa[0] + xx + fx; ty = sa[1] + yy + 10
            if not (0 <= tx < W and 0 <= ty < H): continue
            got = A1[ty * W + tx]; under = A0[ty * W + tx]
            want = s if s[3] > 0 else under
            if s[3] == 0: kept += 1
            checked += 1
            if got != want: bad += 1
    check("pasted pixels land 1px per arrow, Shift = 10", bad == 0, f"{bad}/{checked} wrong")
    outside = sum(1 for i in range(W * H) if A1[i] != A0[i] and not (sa[0] + fx <= i % W < sa[0] + fx + 12 and sa[1] + 10 <= i // W < sa[1] + 22))
    check("nothing outside the pasted box changed", outside == 0, outside)
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(150)
    check("undo removes the paste", grabAll() == A0)
    # B1 on the outline: piece with see-through pixels pasted 2px down over the creature
    drag([(ex - 5, ey - 5), (ex + 6, ey + 6)]); pg.keyboard.press("Control+c"); pg.keyboard.press("Control+v")
    pg.keyboard.press("ArrowDown"); pg.keyboard.press("ArrowDown"); pg.keyboard.press("Enter"); pg.wait_for_timeout(150)
    B = grabAll(); bad = kept = 0
    for yy in range(12):
        for xx in range(12):
            s0 = A0[(ey - 5 + yy) * W + ex - 5 + xx]; t = (ey - 3 + yy) * W + ex - 5 + xx
            want = s0 if s0[3] > 0 else A0[t]
            if s0[3] == 0 and A0[t][3] > 0: kept += 1
            if B[t] != want: bad += 1
    check("see-through pixels of the piece keep the picture underneath (B1)", bad == 0 and kept > 0, f"bad {bad}, kept {kept}")
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(150)
    # 2) Shift adds a second rectangle; Delete clears both
    drag([(cx - 10, cy), (cx - 7, cy + 3)])
    drag([(cx + 7, cy), (cx + 10, cy + 3)], shift=True)
    pg.keyboard.press("Delete"); pg.wait_for_timeout(150)
    A2 = grabAll()
    c1 = all(A2[y * W + x][3] == 0 for y in range(cy, cy + 4) for x in range(cx - 10, cx - 6))
    c2 = all(A2[y * W + x][3] == 0 for y in range(cy, cy + 4) for x in range(cx + 7, cx + 11))
    ch = sum(1 for i in range(W * H) if A2[i] != A0[i])
    check("Shift adds to the selection + Delete clears both boxes", c1 and c2 and ch > 0 and ch <= 32, (c1, c2, ch))
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(150)
    check("undo after delete", grabAll() == A0)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    check("Esc drops the selection, editor stays open", pg.locator("dialog.pxed-dlg[open]").count() == 1 and pg.locator(".pxed-selrow button", has_text="คัดลอก").is_disabled())
    # 3) lasso triangle + cut + paste flipped
    pg.locator(".pxed-side .seg button", has_text="เลือกวาดเอง").click()
    tri = [(cx - 8, cy - 8), (cx + 8, cy - 8), (cx, cy + 8), (cx - 8, cy - 8)]
    pts = []
    for a, bq in zip(tri, tri[1:]):
        for t in range(8): pts.append((round(a[0] + (bq[0] - a[0]) * t / 8), round(a[1] + (bq[1] - a[1]) * t / 8)))
    drag(pts)
    pg.keyboard.press("Control+x"); pg.wait_for_timeout(150)
    A3 = grabAll()
    check("lasso + Ctrl+X clears inside the loop", A3[(cy - 4) * W + cx][3] == 0 and A3[cy * W + cx][3] == 0, (A0[cy * W + cx], A3[cy * W + cx]))
    check("lasso leaves outside alone", A3[(cy + 8) * W + cx - 8] == A0[(cy + 8) * W + cx - 8] and A3[(cy - 9) * W + cx] == A0[(cy - 9) * W + cx])
    pg.keyboard.press("Control+v"); pg.wait_for_timeout(150)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    check("Esc cancels the paste (cut hole stays)", grabAll() == A3 and pg.locator("dialog.pxed-dlg[open]").count() == 1)
    pg.keyboard.press("Control+v"); pg.wait_for_timeout(150)
    pg.locator(".pxed-float button", has_text="กลับซ้าย-ขวา").click()
    pg.locator(".pxed-float button", has_text="วางลง").click(); pg.wait_for_timeout(150)
    A4 = grabAll()
    # the piece box = bounding box of the cleared pixels; flipped left-right inside it
    cl = [i for i in range(W * H) if A3[i] != A0[i]]
    bx0 = min(i % W for i in cl); bx1 = max(i % W for i in cl)
    bad = 0
    for i in cl:
        x, y = i % W, i // W; mx = bx0 + bx1 - x
        src = A0[y * W + mx] if A3[y * W + mx] != A0[y * W + mx] else [0, 0, 0, 0]
        want = src if src[3] > 0 else A3[i]
        if A4[i] != want: bad += 1
    check("flip left-right then place", bad == 0, f"{bad}/{len(cl)}")
    pg.screenshot(path=f"{OUT}/s1_flip.png")
    # 4) drag inside a selection = drag out a COPY (owner set 248: select is for copying); Esc drops the copy
    for _ in range(3): pg.keyboard.press("Control+z"); pg.wait_for_timeout(100)
    check("undo back to the start", grabAll() == A0)
    pg.locator(".pxed-side .seg button", has_text="เลือก ▭").click()
    drag([sa, sb])
    drag([(cx, cy), (cx + 3, cy)])
    cols = range(9, 12) if MIR else range(0, 3)  # columns the copy (moved 3 px right on screen) does not cover
    strip = [(sa[1] + yy) * W + sa[0] + xx for yy in range(12) for xx in cols]
    G = grabAll()
    check("drag inside the selection = floating copy, original untouched", pg.locator(".pxed-float").is_visible() and all(G[i] == A0[i] for i in strip) and any(A0[i][3] > 0 for i in strip))
    pg.screenshot(path=f"{OUT}/s2_lift.png")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    check("Esc drops the copy, picture unchanged, editor stays open", grabAll() == A0 and pg.locator("dialog.pxed-dlg[open]").count() == 1)
    drag([sa, sb]); drag([(cx, cy), (cx + 3, cy)])
    pg.mouse.click(*scr(2, 2)); pg.wait_for_timeout(150)
    A5 = grabAll()
    keep = all(A5[i] == A0[i] for i in strip) and any(A0[i][3] > 0 for i in strip)
    check("click outside places the copy; the original pixels stay (no hole)", A5 != A0 and keep and not pg.locator(".pxed-float").is_visible())
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(150)
    check("one undo removes the placed copy", grabAll() == A0)
    # 4b) changing tool drops the selection marks (owner set 248 bug)
    drag([sa, sb])
    pg.locator(".pxed-side .seg button", has_text="ดินสอ").click(); pg.wait_for_timeout(100)
    check("switching to pencil clears the selection", pg.locator(".pxed-selrow button", has_text="คัดลอก").is_disabled() and grabAll() == A0)
    pg.locator(".pxed-side .seg button", has_text="เลือก ▭").click(); pg.wait_for_timeout(100)
    check("back to select: no old marks", pg.locator(".pxed-selrow button", has_text="คัดลอก").is_disabled())
    drag([sa, sb])
    pg.locator(".pxed-side .seg button", has_text="เลือกวาดเอง").click(); pg.wait_for_timeout(100)
    check("rect -> lasso also clears it", pg.locator(".pxed-selrow button", has_text="คัดลอก").is_disabled())
    pg.keyboard.press("Control+v"); pg.wait_for_timeout(100)
    pg.locator(".pxed-side .seg button", has_text="ดินสอ").click(); pg.wait_for_timeout(100)
    check("switching tool places a floating paste", not pg.locator(".pxed-float").is_visible())
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(100)
    drag([sa, sb]); drag([(cx, cy), (cx + 3, cy)]); pg.mouse.click(*scr(2, 2)); pg.wait_for_timeout(150)
    # 5) save -> new round
    pg.locator("dialog.pxed-dlg button", has_text="บันทึกและใช้เลย").click(); pg.wait_for_timeout(1800)
    check("save makes a new round", len(hub()["items"]["WN-1"]["rounds"]) == n0 + 1)
    pg.locator(".actbar button", has_text="แก้พิกเซล").click(); pg.wait_for_timeout(1200)
    check("clipboard kept for the next editor (paste enabled)", not pg.locator(".pxed-selrow button", has_text="วาง").first.is_disabled())
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    check("Esc with nothing selected closes the editor", pg.locator("dialog.pxed-dlg[open]").count() == 0)
    check("no page errors", not errs, errs[:3])
    print("SUMMARY", sum(res), "/", len(res))
    b.close()
