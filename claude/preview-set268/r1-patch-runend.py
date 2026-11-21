# set 216 R1: run end sample — new run_end.gd + the 3D plaza stays on behind it with the final team on the right half
import sys, shutil, os
g = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, "r1-run_end.gd.txt") if os.path.exists(os.path.join(here, "r1-run_end.gd.txt")) else os.path.join(here, "run_end_sample.gd")
shutil.copy(src, os.path.join(g, "scripts/ui/run_end.gd"))

def sub(path, pairs):
    p = os.path.join(g, path)
    t = open(p, encoding="utf-8").read()
    for a, b in pairs:
        a = a.replace("    ", "\t"); b = b.replace("    ", "\t")
        assert a in t, (path, a[:60])
        t = t.replace(a, b, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(t)

sub("scripts/ui/app.gd", [
    ("    var on := prep.visible or battle.visible\n", "    var on := prep.visible or battle.visible or run_end.visible\n"),
    ("    battle.visibility_changed.connect(_sync_stage)\n", "    battle.visibility_changed.connect(_sync_stage)\n    run_end.visibility_changed.connect(_sync_stage)\n"),
    ("    var pf: Rect2 = prep.field.get_global_rect()\n    if pf.size.x > 40.0 and pf.size.y > 40.0:",
     "    var pf: Rect2 = prep.field.get_global_rect()\n    if run_end.visible:\n        pr = Rect2(size.x * 0.48, 24.0, size.x * 0.52 - 16.0, size.y - 150.0)\n    elif pf.size.x > 40.0 and pf.size.y > 40.0:"),
    ("        run_end.visible = true\n        run_end.render()\n", "        prep.render()\n        run_end.visible = true\n        run_end.render()\n        refit_stage.call_deferred()\n"),
])
sub("tests/shots.gd", [
    ('    app.run_end.get_node("Scroll").scroll_vertical = 100000\n', '    app.run_end.show_details(true)\n'),
    ('    app.run_end.get_node("Scroll").scroll_vertical = 0\n', '    app.run_end.show_details(false)\n'),
])
print("ok runend")
