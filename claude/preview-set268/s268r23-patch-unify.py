# set 268 round 23 (SAMPLE, no merge) — owner: "battle screen OK, lock this concept, make the other screens follow"
# Battle look carried to prep + run end: no plates. Buttons = icon/word alone with the clock's dark outline;
# the main action and panels = fading bands (darkest at the edge they hang from, clear toward the scene), like the
# timeline bands. Run after s268r22c. Usage: python s268r23-patch-unify.py <g268 folder>
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

BAND = '''
# R23 (set 268): battle look on every screen — a fading band instead of a plate (timeline bands: darkest at the edge,
# half by 30 %, clear at the far end). frm/to = gradient direction in 0..1 box space (frm = darkest end).
const R23_INK := Color("#16202a")
const R23_OWN := Color("#1f4f86")
static func band(col: Color, a: float, frm: Vector2, to: Vector2, pad_x: int = 12, pad_y: int = 7, mid: float = 0.5, mid_at: float = 0.3, radial: bool = false) -> StyleBoxTexture:
    var g := Gradient.new()
    g.set_color(0, Color(col, a))
    g.set_color(1, Color(col, 0.0))
    g.add_point(mid_at, Color(col, a * mid))
    var gt := GradientTexture2D.new()
    gt.gradient = g
    gt.width = 128
    gt.height = 128
    gt.fill_from = frm
    gt.fill_to = to
    if radial: # corner glow: radius = one box side, so the far edges are clear
        gt.fill = GradientTexture2D.FILL_RADIAL
        gt.fill_to = frm + (to - frm).normalized() * 1.35
    var s := StyleBoxTexture.new()
    s.texture = gt
    s.content_margin_left = pad_x
    s.content_margin_right = pad_x
    s.content_margin_top = pad_y
    s.content_margin_bottom = pad_y
    return s

static func clear_box(pad_x: int = 12, pad_y: int = 7) -> StyleBoxFlat:
    return box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 2, 0, pad_x, pad_y)

static func line_box(pad_x: int = 12, pad_y: int = 7) -> StyleBoxFlat:
    var s := clear_box(pad_x, pad_y)
    s.border_width_bottom = 2
    s.border_color = Color(1, 1, 1, 0.45)
    return s

# The app theme:'''

patch("scripts/ui/theme.gd", [
    ("\n# The app theme:", BAND),
    # theme buttons: no plate, word alone with the clock outline (#16202a 80 %, 4 px)
    ('''        t.set_color("font_outline_color", cls, Color(0.03, 0.06, 0.09, 0.75))''',
     '''        t.set_color("font_outline_color", cls, Color(R23_INK, 0.8))'''),
    ('''        var b := box(Color(c("panel"), BTN_A), c("line"))
        if st == "hover" or st == "pressed":
            b.bg_color = Color(c("soft"), BTN_A)''',
     '''        var b: StyleBox = line_box()
        if st == "hover" or st == "pressed":
            b = band(R23_INK, 0.55, Vector2(0.5, 1), Vector2(0.5, 0), 12, 7)'''),
    # primary = own-side blue band from the bottom-right corner (the thumb), clear toward the top-left
    ('''        var s := box(Color(c("accent"), 0.75), c("line"), 2, 1)
        if st == "hover" or st == "pressed":
            s.bg_color = Color(c("accent").darkened(0.12), 0.75)
        b.add_theme_stylebox_override(st, s)''',
     '''        var s: StyleBox = band(R23_OWN, 0.95 if st != "pressed" else 1.0, Vector2(1, 1), Vector2(0, 0), 12, 7, 0.8, 0.5, true)
        b.add_theme_stylebox_override(st, s)'''),
    ('''        b.add_theme_color_override(k, c("on-accent"))''',
     '''        b.add_theme_color_override(k, Color("#eef3f6"))'''),
])

patch("scripts/ui/prep.gd", [
    # hud / reroll buttons: icon + word alone (battle buttons R10/R11)
    ('''        var s := TH.box(Color(TH.c("soft") if st == "hover" or st == "pressed" else TH.c("panel"), TH.BTN_A), TH.c("line"))
        TH.ledge(s, st == "pressed") # set 213 (H1): a plate on the table like the Fight button (hard ledge, never a soft shadow)
        b.add_theme_stylebox_override(st, s)''',
     '''        var s: StyleBox = TH.clear_box() if st != "pressed" else TH.band(TH.R23_INK, 0.5, Vector2(0.5, 1), Vector2(0.5, 0))
        b.add_theme_stylebox_override(st, s)'''),
    # heart / gold chips: no plate
    ('''        var cs := TH.box(glass(TH.c(bg)), TH.c(bg).darkened(0.28), 20, 0, 12, 3)
        TH.ledge(cs, false) # set 213 (H1)
        c.add_theme_stylebox_override("panel", cs)''',
     '''        c.add_theme_stylebox_override("panel", TH.clear_box(12, 3))'''),
])

patch("scripts/ui/slot_cell.gd", [
    ('''    var st := TH.box(bg, line.darkened(0.22) if bw == 1 else line, 10, bw, 3, 2)
    if filled or shop: # set 213 (H1): bench rows + shop cards (sold slots too) sit on the table as plates
        TH.ledge(st, false)''',
     '''    var st: StyleBox = TH.box(bg, line.darkened(0.22) if bw == 1 else line, 10, bw, 3, 2)'''),
    ('''    if not stage_slot.is_empty(): # set 207 P0''',
     '''    # R23: no plates — shop cards hang a dark band from their bottom (text side), bench rows from the left edge;
    # empty bench = a faint band only; a state (lock / merge / pick / drop) keeps its coloured frame on a clear box
    if bw >= 2 and (filled or shop):
        st = TH.box(Color(TH.R23_INK, 0.35), line, 2, 1, 3, 2)
    elif shop:
        st = TH.band(TH.R23_INK, 0.85 if filled else 0.4, Vector2(0.5, 1), Vector2(0.5, 0), 3, 2, 0.55, 0.45)
    elif filled:
        st = TH.band(TH.R23_INK, 0.8, Vector2(0, 0.5), Vector2(1, 0.5), 3, 2)
    else:
        st = TH.band(TH.R23_INK, 0.3, Vector2(0, 0.5), Vector2(1, 0.5), 3, 2)
    if not stage_slot.is_empty(): # set 207 P0'''),
])

patch("scripts/ui/run_end.gd", [
    # sheets: dark band hanging from the screen edge they sit on (left sheet = left, details = right), clear toward the scene
    ('''func _sheet_box(alpha: float) -> StyleBoxFlat:
    var s := TH.box(Color(TH.c("panel"), alpha), TH.c("line"), 7, 1, 16, 12)
    TH.ledge(s, false)
    return s''',
     '''func _sheet_box(alpha: float) -> StyleBox:
    var right := alpha > 0.92 # details sheet (0.94) hangs from the right edge
    var s := TH.band(TH.R23_INK, 0.88, Vector2(1, 0.5) if right else Vector2(0, 0.5), Vector2(0, 0.5) if right else Vector2(1, 0.5), 16, 12, 0.8, 0.6)
    s.content_margin_top = 30
    s.content_margin_bottom = 30
    if right:
        s.content_margin_left = 120
        s.content_margin_right = 36
    else:
        s.content_margin_right = 120
        s.content_margin_left = 36
    return s'''),
    ('''    sheet.anchor_right = 0.46''', '''    sheet.anchor_right = 0.56'''),
    ('''    sheet.offset_left = 16
    sheet.offset_top = 14
    sheet.offset_bottom = -14''', '''    sheet.offset_left = 0
    sheet.offset_top = 0
    sheet.offset_bottom = 0'''),
    ('''    details.offset_right = -16
    details.offset_top = 14
    details.offset_bottom = -140''', '''    details.offset_right = 0
    details.offset_top = 0
    details.offset_bottom = -140'''),
    # stat tiles: no box
    ('''TH.box(Color(TH.c("bg"), 0.55), Color(0, 0, 0, 0), 6, 0, 8, 4)''', '''TH.clear_box(8, 4)'''),
])
print("R23 done")
