# set 216 R7: owner "shop on top, faint background" — Dock + odds + reroll move under the top bar (parent Top),
# message line below the odds, board fitted into the lower part, shop cards see-through (alpha 0.55)
import sys, os, re
g = sys.argv[1]
p = os.path.join(g, "scenes/prep_layout.tscn")
t = open(p, encoding="utf-8").read()

def node_block(name, parent):
    m = re.search(r'\[node name="%s" type="[A-Za-z]+" parent="%s"[^\]]*\]\n(.*?)(?=\n\[node )' % (name, re.escape(parent)), t, re.S)
    assert m, name
    return m

def set_props(name, parent, newparent, props):
    global t
    m = node_block(name, parent)
    head = t[m.start():m.start(1)].replace('parent="%s"' % parent, 'parent="%s"' % newparent)
    body = m.group(1)
    for k in ["anchors_preset", "anchor_left", "anchor_right", "anchor_top", "anchor_bottom", "offset_left", "offset_right", "offset_top", "offset_bottom", "grow_horizontal", "grow_vertical"]:
        body = re.sub(r'^%s = .*\n' % k, '', body, flags=re.M)
    body = body.replace("layout_mode = 1\n", "layout_mode = 1\n" + "".join("%s = %s\n" % kv for kv in props), 1) if "layout_mode = 1\n" in body else "".join("%s = %s\n" % kv for kv in props) + body
    t = t[:m.start()] + head + body + t[m.end():]

# Top is x 16..W-16, y 12..81 on screen; children may hang below it
set_props("Dock", "Tray", "Top", [("anchor_left", "0.5"), ("anchor_right", "0.5"), ("offset_left", "-242.0"), ("offset_right", "322.0"), ("offset_top", "40.0"), ("offset_bottom", "138.0")])
set_props("ShopOdds", "Tray", "Top", [("anchor_left", "0.5"), ("anchor_right", "0.5"), ("offset_left", "-130.0"), ("offset_right", "210.0"), ("offset_top", "138.0"), ("offset_bottom", "162.0")])
set_props("Reroll", "Tray", "Top", [("anchor_left", "1.0"), ("anchor_right", "1.0"), ("offset_left", "-74.0"), ("offset_right", "0.0"), ("offset_top", "40.0"), ("offset_bottom", "136.0")])
for old, new in [('parent="Tray/Dock', 'parent="Top/Dock'), ('parent="Tray/ShopOdds', 'parent="Top/ShopOdds'), ('parent="Tray/Reroll', 'parent="Top/Reroll')]:
    assert old in t, old
    t = t.replace(old, new)
# message line under the odds row
t = t.replace('anchors_preset = 10\nanchor_right = 1.0\noffset_top = 45.0\noffset_bottom = 69.0', 'anchors_preset = 10\nanchor_right = 1.0\noffset_top = 164.0\noffset_bottom = 188.0', 1)
open(p, "w", encoding="utf-8", newline="\n").write(t)

def sub(path, pairs):
    q = os.path.join(g, path)
    s = open(q, encoding="utf-8").read()
    for a, b in pairs:
        a = a.replace("    ", "\t"); b = b.replace("    ", "\t")
        assert a in s, (path, a[:70])
        s = s.replace(a, b, 1)
    open(q, "w", encoding="utf-8", newline="\n").write(s)

# board in the lower part (below the shop row), any earlier R3/R6 prep rect replaced
q = os.path.join(g, "scripts/ui/app.gd")
s = open(q, encoding="utf-8").read()
s, n = re.subn(r'pr = pf\.grow_individual\([^\n]*\)', 'pr = Rect2(pf.position.x + prep.board_side_room(), 168.0, pf.size.x - 2.0 * prep.board_side_room(), size.y - 168.0 - 8.0)', s, count=1)
assert n == 1
open(q, "w", encoding="utf-8", newline="\n").write(s)
# see-through shop cards
sub("scripts/ui/slot_cell.gd", [("        bg = Color(TH.c(\"panel\"), GLASS)\n", "        bg = Color(TH.c(\"panel\"), 0.55)\n")])
print("ok shoptop")
