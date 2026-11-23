# set 286 = set 268 round 35: bottom team panel (6 own cards) + white outline on the picked unit + stun time in the cdl log.
# Needs scripts/ui/s286_team.gd (copy: claude/preview-set268/r35-s286_team.gd.txt). Run after s268r34i-patch-shadeblue.py.
import sys, pathlib
g = pathlib.Path(sys.argv[1])

def sub(rel, old, new):
    p = g / rel
    s = p.read_text(encoding="utf-8")
    assert old in s, (rel, old[:60])
    p.write_text(s.replace(old, new, 1), encoding="utf-8")

# battle screen: overlay panel, fed like the queue
sub("scripts/ui/battle.gd",
    "var _tl: Control = null\nfunc _process(_d: float) -> void:\n\tif _tl != null:\n\t\t_tl.view = view\n\t\t_tl.stage = app.stage\n",
    "var _tl: Control = null\nvar _team: Control = null # s286r35\nfunc _process(_d: float) -> void:\n\tif _tl != null:\n\t\t_tl.view = view\n\t\t_tl.stage = app.stage\n"
    "\tif _team == null and _tl != null:\n"
    "\t\t_team = load(\"res://scripts/ui/s286_team.gd\").new()\n"
    "\t\t_team.name = \"TeamPanel\"\n"
    "\t\tadd_child(_team)\n"
    "\t\t_team.anchor_left = 0.0; _team.anchor_right = 1.0; _team.anchor_top = 1.0; _team.anchor_bottom = 1.0\n"
    "\t\t_team.offset_left = 16.0; _team.offset_right = -150.0; _team.offset_top = -64.0; _team.offset_bottom = -10.0\n"
    "\tif _team != null:\n"
    "\t\t_team.view = view; _team.stage = app.stage; _team.tl = _tl\n")

# sim (sample copy): stun left per unit next to the cooldown left
sub("scripts/battle.gd",
    "\t\t\tvar cdl := {}\n\t\t\tfor f in F:\n\t\t\t\tif _up(f) and f.cdLeft < 1.0e9: cdl[str(f.uid)] = f.cdLeft + f.stunLeft\n\t\t\t_log(\"cdl\", {\"m\": cdl})\n",
    "\t\t\tvar cdl := {}\n\t\t\tvar stl := {} # s286r35\n\t\t\tfor f in F:\n\t\t\t\tif _up(f) and f.cdLeft < 1.0e9: cdl[str(f.uid)] = f.cdLeft + f.stunLeft\n\t\t\t\tif _up(f) and f.stunLeft > 0.0: stl[str(f.uid)] = f.stunLeft\n\t\t\t_log(\"cdl\", {\"m\": cdl, \"s\": stl})\n")

# view: keep stun left + when it was logged
sub("scripts/ui/battle_view.gd",
    "\t\t\t\t\tcu[\"cdl\"] = float(m[kk]); cu[\"cdlT\"] = float(e[\"t\"])\n",
    "\t\t\t\t\tcu[\"cdl\"] = float(m[kk]); cu[\"cdlT\"] = float(e[\"t\"])\n"
    "\t\t\t\t\tvar sm: Dictionary = e.get(\"s\", {}) # s286r35\n"
    "\t\t\t\t\tcu[\"stunL\"] = float(sm.get(kk, 0.0)); cu[\"stunT\"] = float(e[\"t\"])\n")
print("ok")
