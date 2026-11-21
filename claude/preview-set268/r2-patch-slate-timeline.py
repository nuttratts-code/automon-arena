# set 268 R2 (owner D1 A1 B1 C2): dark slate-blue see-through panels on every screen (owner reference picture, 21 Nov)
# + battle top = one cooldown timeline (act point at the left end) instead of the two team HP bars. Run after R1-R8 patches.
import sys, os, json, shutil
g = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))

def sub(path, pairs):
    p = os.path.join(g, path)
    t = open(p, encoding="utf-8").read()
    for a, b in pairs:
        a = a.replace("    ", "\t"); b = b.replace("    ", "\t")
        assert a in t, (path, a[:70])
        t = t.replace(a, b, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(t)

# 1. palette: the UI "light" tokens become the slate set (the 3D scene stays in its light mode — TH.dark also switches 3D)
col = json.load(open(os.path.join(g, "data/colours.json"), encoding="utf-8"))
tone = json.load(open(os.path.join(g, "data/tone.json"), encoding="utf-8"))
slate = {
    "bg": "#1b2533", "panel": "#25334a", "card": "#2c3c55", "soft": "#364a66",
    "line": "#c3d1df", "arena-line": "#5a7088", "ink": "#f2f5f8", "mute": "#a7b6c6",
    "accent": "#3f78a6", "on-accent": "#ffffff", "sel": "#8fd3e6",
    "hp": "#4ccaa6", "hp-bg": "#16202c", "armor": "#9fc0dc",
}
light = dict(col["dark"]); light.update(tone["dark"]); light.update(slate)
tone["light"] = light
open(os.path.join(g, "data/tone.json"), "w", encoding="utf-8", newline="\n").write(json.dumps(tone, ensure_ascii=False, indent=1))

# 2. see-through like the reference (set 212 near-solid 0.94 -> 0.80)
sub("scripts/ui/prep.gd", [("const GLASS := 0.94", "const GLASS := 0.80")])
sub("scripts/ui/slot_cell.gd", [("const GLASS := 0.94", "const GLASS := 0.80")])

# 3. battle top: timeline + clock plate (HP bars, team names out)
shutil.copy(os.path.join(here, "r2-timeline.gd.txt"), os.path.join(g, "scripts/ui/s268_timeline.gd"))
sub("scripts/ui/battle.gd", [
    ("    hud.custom_minimum_size.y = 40\n", "    hud.custom_minimum_size.y = 60\n"),
    ("    hud.add_child(_team_bar(0, TH.label(\"ทีมคุณ\", 13, \"ink\", \"body_b\"), replay_tag))\n",
     "    _tl = load(\"res://scripts/ui/s268_timeline.gd\").new()\n    _tl.name = \"Timeline\"\n    _tl.size_flags_horizontal = Control.SIZE_EXPAND_FILL\n    _tl.custom_minimum_size.y = 60\n    hud.add_child(_tl)\n"),
    ("    hud.add_child(_team_bar(1, title, null))\n", ""),
    ("func _process(_d: float) -> void:\n    if not visible or view == null or _tb_bar[0] == null:\n",
     "var _tl: Control = null\nfunc _process(_d: float) -> void:\n    if _tl != null:\n        _tl.view = view\n        _tl.stage = app.stage\n    if not visible or view == null or _tb_bar[0] == null:\n"),
])
# 4. the real-data path: remember when each unit last acted ("set" event)
sub("scripts/ui/battle_view.gd", [
    ("        \"set\":\n            var a: Variant = units.get(int(e[\"who\"]))\n            if a != null:\n",
     "        \"set\":\n            var a: Variant = units.get(int(e[\"who\"]))\n            if a != null:\n                a[\"lastAct\"] = float(e[\"t\"])\n"),
])
# 5. text that sits straight on the scene gets a dark outline (tell: text on busy ground)
OL = '    {v}.add_theme_constant_override("outline_size", 5)\n    {v}.add_theme_color_override("font_outline_color", Color(0.06, 0.09, 0.13, 0.9))\n    {v}.add_theme_color_override("font_color", Color(0.95, 0.97, 0.99))\n'
sub("scripts/ui/battle.gd", [('    tick.name = "Tick"\n', '    tick.name = "Tick"\n' + OL.format(v="tick"))])
sub("scripts/ui/prep.gd", [('    hud_title = _part(lay, "HudTitle", "Label")\n', '    hud_title = _part(lay, "HudTitle", "Label")\n' + OL.format(v="hud_title"))])
print("ok slate-timeline")
