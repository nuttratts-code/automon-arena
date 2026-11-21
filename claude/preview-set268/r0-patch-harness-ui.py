# set 268 R0: the v47 live harness keeps the game UI (KEEPUI=1) so the set 216 screen samples sit on the new arena.
# battle stills = battle screen as is · before the prep zoom shots the UI flips to the prep screen (3D groups kept: world.moving)
import sys, os
g = sys.argv[1]
p = os.path.join(g, "tests/s239_prep.gd")
t = open(p, encoding="utf-8").read()
pairs = [
    ("    for cl in app.find_children(\"*\", \"CanvasLayer\", true, false): (cl as CanvasLayer).visible = false\n",
     "    if OS.get_environment(\"KEEPUI\") != \"1\":\n        for cl in app.find_children(\"*\", \"CanvasLayer\", true, false): (cl as CanvasLayer).visible = false\n"),
    ("    var zoom_pos := Vector3.INF\n",
     "    if OS.get_environment(\"KEEPUI\") == \"1\": # set 268: prep screen UI over the prep zoom shots, 3D stand-ins stay\n        app.world.moving = true\n        app.battle.visible = false; app.prep.visible = true; app.screen = \"prep\"\n        await _frames()\n    var zoom_pos := Vector3.INF\n"),
]
for a, b in pairs:
    a = a.replace("    ", "\t"); b = b.replace("    ", "\t")
    assert a in t, a[:70]
    t = t.replace(a, b, 1)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok harness-ui")
