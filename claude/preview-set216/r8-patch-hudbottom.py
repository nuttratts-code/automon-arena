# set 216 R8 (after R7): owner "move the old top-bar things to the bottom" — round title + hearts + gold = bottom row
# between the bench and Fight; HUD icon buttons under the bench (bottom-left); shop row slides up to the very top
import sys, os, re
g = sys.argv[1]
p = os.path.join(g, "scenes/prep_layout.tscn")
t = open(p, encoding="utf-8").read()

def set_props(name, parent, newparent, props):
    global t
    m = re.search(r'\[node name="%s" type="[A-Za-z]+" parent="%s"[^\]]*\]\n(.*?)(?=\n\[node )' % (name, re.escape(parent)), t, re.S)
    assert m, name
    head = t[m.start():m.start(1)].replace('parent="%s"' % parent, 'parent="%s"' % newparent)
    body = m.group(1)
    for k in ["anchors_preset", "anchor_left", "anchor_right", "anchor_top", "anchor_bottom", "offset_left", "offset_right", "offset_top", "offset_bottom", "grow_horizontal", "grow_vertical", "alignment"]:
        body = re.sub(r'^%s = .*\n' % k, '', body, flags=re.M)
    add = "".join("%s = %s\n" % kv for kv in props)
    body = body.replace("layout_mode = 1\n", "layout_mode = 1\n" + add, 1) if "layout_mode = 1\n" in body else add + body
    t = t[:m.start()] + head + body + t[m.end():]

# Tray = x 16..W-16, y H-150..H-12 (138 tall); bottom row y 102..136 inside it; bench ends at y 32, Fight is x W-96.. y 62..138
set_props("HudButtons", "Top", "Tray", [("offset_left", "0.0"), ("offset_right", "150.0"), ("offset_top", "100.0"), ("offset_bottom", "136.0"), ("alignment", "0")])
set_props("HudTitle", "Top", "Tray", [("offset_left", "284.0"), ("offset_right", "434.0"), ("offset_top", "100.0"), ("offset_bottom", "136.0")])
set_props("ChipHearts", "Top", "Tray", [("offset_left", "440.0"), ("offset_right", "510.0"), ("offset_top", "100.0"), ("offset_bottom", "136.0")])
set_props("ChipGold", "Top", "Tray", [("offset_left", "518.0"), ("offset_right", "664.0"), ("offset_top", "100.0"), ("offset_bottom", "136.0")])
for nm in ["HudButtons", "ChipHearts", "ChipGold"]:
    t = t.replace('parent="Top/%s' % nm, 'parent="Tray/%s' % nm)
# shop row to the very top (Top starts at y 12)
for nm, a, b in [("Dock", "40.0", "138.0"), ("Reroll", "40.0", "136.0"), ("ShopOdds", "138.0", "162.0")]:
    m = re.search(r'(\[node name="%s" type="[A-Za-z]+" parent="Top"[^\]]*\]\n.*?)offset_top = %s\noffset_bottom = %s' % (nm, re.escape(a), re.escape(b)), t, re.S)
    assert m, nm
    na, nb = {"Dock": ("0.0", "98.0"), "Reroll": ("0.0", "96.0"), "ShopOdds": ("98.0", "122.0")}[nm]
    t = t[:m.start()] + m.group(1) + "offset_top = %s\noffset_bottom = %s" % (na, nb) + t[m.end():]
assert 'offset_top = 164.0\noffset_bottom = 188.0' in t
t = t.replace('offset_top = 164.0\noffset_bottom = 188.0', 'offset_top = 124.0\noffset_bottom = 148.0', 1)
open(p, "w", encoding="utf-8", newline="\n").write(t)

q = os.path.join(g, "scripts/ui/app.gd")
s = open(q, encoding="utf-8").read()
assert "168.0, pf.size.x" in s
s = s.replace("168.0, pf.size.x - 2.0 * prep.board_side_room(), size.y - 168.0 - 8.0", "150.0, pf.size.x - 2.0 * prep.board_side_room(), size.y - 150.0 - 50.0")
open(q, "w", encoding="utf-8", newline="\n").write(s)
print("ok hudbottom")

# a node must come after its parent in a .tscn → move the reparented blocks (with their children) to the end
t = open(p, encoding="utf-8").read()
blocks = re.split(r'(?=\n\[node )', t)
keep, moved = [], []
for b in blocks:
    m = re.match(r'\n\[node name="([^"]+)" type="[^"]+" parent="([^"]+)"', b)
    if m and (m.group(2) in ("Tray",) and m.group(1) in ("HudButtons", "HudTitle", "ChipHearts", "ChipGold") or re.match(r'Tray/(HudButtons|ChipHearts|ChipGold)', m.group(2))):
        moved.append(b)
    else:
        keep.append(b)
t = "".join(keep).rstrip("\n") + "\n" + "".join(moved).rstrip("\n") + "\n"
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok reorder", len(moved))
