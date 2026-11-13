import functools, http.server, os, sys, threading
from playwright.sync_api import sync_playwright

build, shots = sys.argv[1], sys.argv[2]
os.makedirs(shots, exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=build))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = "http://127.0.0.1:%d/index.html" % srv.server_address[1]
exe = os.environ.get("CHROMIUM_PATH", "")
with sync_playwright() as p:
    kw = {"executable_path": exe} if exe and os.path.exists(exe) else {}
    br = p.chromium.launch(**kw, headless=False, args=["--window-size=900,500"])
    page = br.new_page(viewport={"width": 844, "height": 390})
    errs = []
    page.on("console", lambda m: errs.append("%s: %s" % (m.type, m.text)) if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: errs.append("pageerror: %s" % e))
    page.goto(url)
    info = page.evaluate("""() => { const g = document.createElement('canvas').getContext('webgl2');
        const d = g && g.getExtension('WEBGL_debug_renderer_info');
        return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : String(!!g) }""")
    print("GPU", info)
    for n in (1, 2, 3):
        page.wait_for_function("t => document.title === t", arg="STATE %d" % n, timeout=180000)
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(shots, "web-STATE_%d.png" % n))
        print("shot", n)
    for e in errs[:15]:
        print(e[:220])
    br.close()
