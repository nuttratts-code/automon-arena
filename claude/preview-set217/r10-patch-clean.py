# set 217 R10 (sample copy only): owner — "take out the HP numbers, everything, for now".
# Hides every in-field overlay: unit HP bar + numbers + status chips, floating damage numbers, the rune rings under the
# slots, the stars + tribe mark at the units' feet. Shop / HUD / buttons stay.
#   python -I r10-patch-clean.py <godot copy>
import sys
g = sys.argv[1]

def patch(rel, pairs):
    p = g + "/" + rel
    s = open(p, encoding="utf-8").read()
    for old, new in pairs:
        if new in s:
            continue
        assert old in s, (rel, old[:40])
        s = s.replace(old, new, 1)
    open(p, "w", encoding="utf-8", newline="").write(s)

patch("scripts/ui/battle_view.gd", [
    ("\tcell.add_child(card)\n", "\tcell.add_child(card)\n\tcard.visible = false # R10 sample: no HP bar / numbers\n"),
    ("func _float(v: Dictionary, text: String, cls: String) -> void:\n",
     "func _float(v: Dictionary, text: String, cls: String) -> void:\n\treturn # R10 sample: no damage numbers\n"),
])
patch("scripts/ui/stage3d.gd", [
    ("\tmi.name = nm\n\tmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF\n",
     "\tmi.name = nm\n\tmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF\n\tmi.layers = 0 # R10 sample: no slot rings (no camera draws layer 0)\n"),
    ("\tshp.double_sided = true\n", "\tshp.double_sided = true\n\tstar.visible = false # R10 sample: no stars / tribe mark\n\tshp.visible = false\n"),
])
print("ok")
