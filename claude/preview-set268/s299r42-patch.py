# set 299 r42: hook the §10 rebuild (s299r42_block.gd) into var299.gd + Fight ready in the sample. Run from g286/.
import sys
g = sys.argv[1] if len(sys.argv) > 1 else "."
p = g + "/scripts/ui/var299.gd"
s = open(p, encoding="utf-8", newline="").read()
nl = "\r\n" if "\r\n" in s else "\n"
blk = open(__file__.replace("s299r42-patch.py", "s299r42_block.gd"), encoding="utf-8").read().replace("\r\n", "\n").replace("\n", nl)
reps = [
    ("static func plate(ci: CanvasItem, r: Rect2, k: float, a: float) -> void:", "\tif r42():" + nl + "\t\tplate42(ci, r, a)" + nl + "\t\treturn"),
    ("static func button(ci: CanvasItem, r: Rect2, nm: String, hv: bool) -> void:", "\tif r42():" + nl + "\t\tbutton42(ci, r, nm, hv)" + nl + "\t\treturn"),
    ("static func button_text(b: Button) -> void:   # the Fight button's own text", "\tif r42():" + nl + "\t\tbutton_text42(b)" + nl + "\t\treturn"),
    ("static func text(l: Label) -> void:   # every label in the HUD (replaces the C3 heavy outline + shadow)", "\tif r42():" + nl + "\t\ttext42(l)" + nl + "\t\treturn"),
    ("static func slot(ci: Control, filled: bool, shop: bool, line: Variant) -> void:", "\tif r42():" + nl + "\t\tslot42(ci, filled, shop, line)" + nl + "\t\treturn"),
    ("static func card(cell: Control, c: Dictionary, ts: Array, cant: bool, owned: bool) -> void:", "\tif r42():" + nl + "\t\tcard42(cell, c, ts, cant, owned)" + nl + "\t\treturn"),
]
if "static func r42()" not in s:
    for a, b in reps:
        a2 = a + nl
        assert s.count(a2) == 1, a
        s = s.replace(a2, a2 + b + nl)
    s = s.rstrip() + nl + blk
    open(p, "w", encoding="utf-8", newline="").write(s)
# prep.gd: Fight shows its ready state in the sample (S299FREADY=1), the real rule (faded while the team is empty) stays otherwise
q = g + "/scripts/ui/prep.gd"
t = open(q, encoding="utf-8", newline="").read()
a = "btn_fight.modulate = Color(1, 1, 1, 0.7) if entries.is_empty() else Color.WHITE"
if "S299FREADY" not in t:
    assert t.count(a) == 1
    t = t.replace(a, "btn_fight.modulate = Color(1, 1, 1, 0.7) if entries.is_empty() and OS.get_environment(\"S299FREADY\") != \"1\" else Color.WHITE")
    open(q, "w", encoding="utf-8", newline="").write(t)
print("r42 patch ok")
