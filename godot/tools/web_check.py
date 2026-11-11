"""Set 201 (plan-set196 7f1): check the Godot web export in a real browser (ui_smoke-style).

  python3 -I godot/tools/web_check.py [build_dir=build/web] [shots_dir=/tmp/automon-godot-web]

1. The PCK ships every data/*.json, data/fonts/*.ttf + OFL *.txt, and nothing from tests/ tools/ or *.md (HARD RULE 9 ④).
2. Serves build_dir on 127.0.0.1 (local only), opens it in Chromium at 1366x768 · 844x390 · 667x375 · 740x330 · 390x844 (portrait = rotate notice) and checks:
   no page errors / console errors · the engine started (loader hidden) · canvas fills the window · no horizontal
   scroll · the picture is not blank (the name screen drew something). Screenshots go to shots_dir.
Last line: "WEB CHECK: PASS" or "WEB CHECK: FAIL n" (exit 1). Needs python playwright + chromium
(cloud: /opt/pw-browsers/chromium is found by playwright; CI: python -m playwright install chromium).
"""
import functools
import http.server
import os
import re
import sys
import threading

from playwright.sync_api import sync_playwright

SIZES = [(1366, 768), (844, 390), (667, 375), (740, 330), (390, 844)]  # 7f2: + 740x330 (short phone sideways) + 390x844 portrait (rotate notice)
DATA = ["art.json", "colours.json", "credits.json", "game.json", "labels.json", "ui_th.json"]
FONTS = ["Mitr-Medium.ttf", "Mitr-SemiBold.ttf", "IBMPlexSansThai-Regular.ttf", "IBMPlexSansThai-SemiBold.ttf",
         "IBMPlexMono-Medium.ttf", "OFL-Mitr.txt", "OFL-IBMPlexSansThai.txt", "OFL-IBMPlexMono.txt"]


def check_pck(build):
    fails = []
    pck = open(os.path.join(build, "index.pck"), "rb").read()
    for f in DATA:
        if ("data/" + f).encode() not in pck:
            fails.append("pck lacks data/" + f)
    for f in FONTS:
        if ("data/fonts/" + f).encode() not in pck:
            fails.append("pck lacks data/fonts/" + f)
    for bad in re.findall(rb"(?<![\w/.])(?:res://)?(?:tests|tools)/[\w.-]+\.(?:gd|gdc|py|sh|json|txt|cfg)\b|(?<![\w/.])[\w-]+\.md\b", pck):
        fails.append("pck ships a non-game file: " + bad.decode(errors="replace"))
    return fails[:20]


class Quiet(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".wasm": "application/wasm", ".js": "text/javascript"}

    def log_message(self, *a):
        pass


def blank(png):
    try:
        from PIL import Image
        import io
        im = Image.open(io.BytesIO(png)).convert("RGB").resize((64, 32))
        return len(set(im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata())) < 4  # one flat colour = nothing drawn
    except ImportError:
        return False  # no PIL: skip this one check


def main():
    build = sys.argv[1] if len(sys.argv) > 1 else "build/web"
    shots = sys.argv[2] if len(sys.argv) > 2 else "/tmp/automon-godot-web"
    os.makedirs(shots, exist_ok=True)
    fails = check_pck(build)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=build))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = "http://127.0.0.1:%d/index.html" % srv.server_address[1]
    with sync_playwright() as p:
        exe = "/opt/pw-browsers/chromium"  # cloud chats: the pre-installed browser (python playwright may expect another build)
        kw = {"executable_path": exe} if os.path.exists(exe) else {}
        br = p.chromium.launch(**kw, args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        for w, h in SIZES:
            tag = "%dx%d" % (w, h)
            page = br.new_page(viewport={"width": w, "height": h})
            errs = []
            page.on("pageerror", lambda e, errs=errs: errs.append("pageerror: %s" % e))
            page.on("console", lambda m, errs=errs: errs.append("console.%s: %s" % (m.type, m.text)) if m.type == "error" else None)
            page.goto(url)
            try:  # Godot's shell removes #status once the engine runs the main scene
                page.wait_for_function("() => !document.getElementById('status')", timeout=90000)
            except Exception:
                fails.append("%s: engine did not start (loader still shown) %s" % (tag, page.inner_text("#status")[:200] if page.query_selector("#status") else ""))
            page.wait_for_timeout(1500)
            m = page.evaluate("""() => { const c = document.getElementById('canvas'); const r = c.getBoundingClientRect();
                return {cw: r.width, ch: r.height, sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight} }""")
            if abs(m["cw"] - m["iw"]) > 1 or abs(m["ch"] - m["ih"]) > 1:
                fails.append("%s: canvas %sx%s does not fill the window %sx%s" % (tag, m["cw"], m["ch"], m["iw"], m["ih"]))
            if m["sw"] > m["iw"]:
                fails.append("%s: horizontal scroll (scrollWidth %s > %s)" % (tag, m["sw"], m["iw"]))
            png = page.screenshot(path=os.path.join(shots, "web-%s.png" % tag))
            if blank(png):
                fails.append("%s: picture is blank (nothing drawn)" % tag)
            fails += ["%s: %s" % (tag, e) for e in errs]
            print("%s: canvas %sx%s · errors %d" % (tag, m["cw"], m["ch"], len(errs)))
            page.close()
        br.close()
    srv.shutdown()
    for f in fails:
        print("FAIL " + f)
    print("WEB CHECK: PASS" if not fails else "WEB CHECK: FAIL %d" % len(fails))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
