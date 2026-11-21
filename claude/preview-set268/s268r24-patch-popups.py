# set 268 round 24 (SAMPLE, no merge) — owner: "go on (popups + name screen), no phone yet"
# Locked battle look on popups + the name screen: no shadowed plates. A dialog = dark sheet (#16202a 90 %) with a thin
# white line on top and bottom only (the timeline line), no side frame, no drop shadow; dim = ink blue, not brown.
# Inner cards (rune / offer / foe cells) = dark band hanging from the card bottom like the shop cards (R23).
# Text inputs = clear with a white underline. Harness: POPS=1 shoots p1_tribes, p2_legend, p3_card, p4_offer, p5_name.
# Run after s268r23-patch-unify.py. Usage: python s268r24-patch-popups.py <g268 folder>
import sys, os
root = sys.argv[1]

def T(s):
    return s.replace("    ", "\t")

def patch(rel, pairs):
    p = os.path.join(root, rel)
    s = open(p, encoding="utf-8").read()
    for old, new in pairs:
        old, new = T(old), T(new)
        assert old in s, (rel, old[:70])
        s = s.replace(old, new, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(s)
    print("patched", rel)

patch("scripts/ui/theme.gd", [
    ('''static func line_box(pad_x: int = 12, pad_y: int = 7) -> StyleBoxFlat:''',
     '''# R24: dialog sheet = dark, thin white line top + bottom (accent = gold for the rune offer), no sides, no shadow
static func sheet(pad_x: int = 14, pad_y: int = 12, accent: Color = Color(1, 1, 1, 0.5)) -> StyleBoxFlat:
    var s := box(Color(R23_INK, 0.9), accent, 2, 0, pad_x, pad_y)
    s.border_width_top = 1
    s.border_width_bottom = 1
    s.expand_margin_top = 3
    s.expand_margin_bottom = 3
    return s

const R24_DIM := Color(0.086, 0.125, 0.165, 0.5)

static func card_band(pad: int = 8) -> StyleBoxTexture:
    return band(R23_INK, 0.85, Vector2(0.5, 1), Vector2(0.5, 0), pad, pad, 0.55, 0.45)

static func line_box(pad_x: int = 12, pad_y: int = 7) -> StyleBoxFlat:'''),
    ('''    t.set_stylebox("normal", "LineEdit", box(c("card"), c("ink"), 10, 2, 14, 10))''',
     '''    var le := clear_box(14, 10)
    le.border_width_bottom = 2
    le.border_color = Color(1, 1, 1, 0.7)
    t.set_stylebox("normal", "LineEdit", le)'''),
    ('''    t.set_stylebox("panel", "PanelContainer", box(c("panel"), c("line"), 16, 1, 24, 24))''',
     '''    t.set_stylebox("panel", "PanelContainer", sheet(24, 24))'''),
])

patch("scripts/ui/pop.gd", [
    ('''    dim.color = Color(20 / 255.0, 16 / 255.0, 12 / 255.0, 0.45)''', '''    dim.color = TH.R24_DIM'''),
    ('''    var st := TH.box(TH.c("panel"), TH.c("line"), 14, 1, 14, 12)
    st.shadow_color = Color(0, 0, 0, 0.35)
    st.shadow_size = 16
    _panel.add_theme_stylebox_override("panel", st)''',
     '''    _panel.add_theme_stylebox_override("panel", TH.sheet(14, 12))'''),
])

patch("scripts/ui/rune_offer.gd", [
    ('''    dim.color = Color(20 / 255.0, 16 / 255.0, 12 / 255.0, 0.45)''', '''    dim.color = TH.R24_DIM'''),
    ('''    var st := TH.box(TH.c("panel"), TH.c("gold"), 14, 3, 14, 14)
    st.shadow_color = Color(0, 0, 0, 0.35)''',
     '''    var st := TH.sheet(14, 14, Color(TH.c("gold"), 0.8))'''),
    ('''    card.add_theme_stylebox_override("panel", TH.box(TH.c("soft"), TH.c("line"), 8, 1, 7, 7))''',
     '''    card.add_theme_stylebox_override("panel", TH.card_band(7))'''),
])

patch("scripts/ui/unit_card.gd", [
    ('''    var st := TH.box(TH.c("panel"), TH.c("line"), 12, 1, 10, 8)
    st.shadow_color = Color(0, 0, 0, 0.3)''',
     '''    var st := TH.sheet(10, 8)'''),
])

patch("scripts/ui/popups.gd", [
    ('''    card.add_theme_stylebox_override("panel", TH.box(TH.c("soft"), TH.c("line"), 8, 1, 8, 8))''',
     '''    card.add_theme_stylebox_override("panel", TH.card_band(8))'''),
])

patch("scripts/ui/credits.gd", [
    ('''    _panel.add_theme_stylebox_override("panel", TH.box(TH.c("panel"), TH.c("line"), 14, 1, 14, 12))''',
     '''    _panel.add_theme_stylebox_override("panel", TH.sheet(14, 12))'''),
])

HARN = '''    if OS.get_environment("POPS") == "1": # set 268 R24: popups + name screen in the locked look
        app.popups.open("tribes")
        await _shot(out, "p1_tribes")
        app.popups.open("legend")
        await _shot(out, "p2_legend")
        app.popups.close()
        var pr: Variant = app.prep
        pr.sel = {"at": "shop", "i": 1, "id": pr.shop_id({"at": "shop", "i": 1})}
        pr._refresh_card()
        await _frames()
        pr.card.position = Vector2(vp.x * 0.5 - pr.card.size.x * 0.5, vp.y * 0.30)
        await _shot(out, "p3_card")
        pr.card.visible = false
        pr.sel = null
        load("res://scripts/runrunes.gd").rn_make_offer(app.P, "win")
        app.offer.show_offer(app.P, app.cm)
        app.offer.visible = true
        await _shot(out, "p4_offer")
        app.offer.visible = false
        app.P["rn"]["offer"] = null
        app.prep.visible = false
        app.name_scr.open("")
        app.name_scr.visible = true
        await _shot(out, "p5_name")
        app.name_scr.visible = false
        app.prep.visible = true
    for nd in foe_nodes: (nd as Node3D).visible = true'''

patch("tests/s239_prep.gd", [
    ('''    for nd in foe_nodes: (nd as Node3D).visible = true''', HARN),
])
print("R24 done")
