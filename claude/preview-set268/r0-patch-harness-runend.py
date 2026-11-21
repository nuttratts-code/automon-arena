# set 268 R0b: run end still on the v47 arena (KEEPUI=1) — a cleared run, battle camera as baked, 3D team kept (world.moving)
import sys, os
g = sys.argv[1]
p = os.path.join(g, "tests/s239_prep.gd")
t = open(p, encoding="utf-8").read()
a = "    for nd in foe_nodes: (nd as Node3D).visible = true\n    gc.transform = base\n"
b = a + """    if OS.get_environment("KEEPUI") == "1": # set 268: run end screen over the battle view
        st.cam.transform = base
        app.P["wins"] = float(load("res://scripts/rules.gd").RULES()["shop"]["winsToFinish"])
        app.P["round"] = 14.0; app.P["hearts"] = 2.0; app.P["over"] = true
        app.stats["matches"] = 14.0; app.stats["w"] = 10.0; app.stats["l"] = 3.0; app.stats["d"] = 1.0; app.stats["best"] = 5.0
        app.stats["timeMs"] = 14.0 * 21500.0
        app.stats["dmg"] = {"XO": 18234.0, "XA": 9120.0, "XD": 4410.0}
        app.screen = "runEnd"
        app.render()
        await _frames()
        st.cam.transform = base; gc.transform = base
        await _shot(out, "9_runend")
        app.run_end.show_details(true)
        await _shot(out, "9b_runend_details")
        app.run_end.show_details(false)
"""
a = a.replace("    ", "\t"); b = b.replace("    ", "\t")
assert a in t
t = t.replace(a, b, 1)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok harness-runend")
