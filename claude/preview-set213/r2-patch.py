# set 213 sample R2 (owner H1 + free icons): plate ledge on buttons/chips/cards · pixel icons (Kenney Board Game Icons, CC0)
# on the top-right buttons + card stats · tribe shapes get a dark edge + a small top-left highlight.
# Needs art/ui_icons/*.png in the copy (tools/r2_icons.py).
import sys
g = sys.argv[1]

def sub(path, old, new):
    p = g + "/" + path
    s = open(p, encoding="utf-8").read()
    assert old in s, (path, old[:60])
    s = s.replace(old, new, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(s)

T = "scripts/ui/theme.gd"
sub(T, "static func crop_square(img: Image) -> Image:",
    "static var _uicons := {}\n"
    "static func uicon(key: String) -> Texture2D: # set 213 sample: pixel icons from art/ui_icons (Kenney CC0)\n"
    "\tif not _uicons.has(key):\n"
    "\t\tvar img := Image.load_from_file(ProjectSettings.globalize_path(\"res://art/ui_icons/%s.png\" % key))\n"
    "\t\t_uicons[key] = ImageTexture.create_from_image(img) if img != null else null\n"
    "\treturn _uicons[key]\n\n"
    "static func crop_square(img: Image) -> Image:")

P = "scripts/ui/prep.gd"
# plate ledge (same language as the Fight plate: light from the top-left → dark bottom 4 / right 2) · pressed = pushed in
sub(P, "\t\tvar s := TH.box(glass(TH.c(\"soft\") if st == \"hover\" or st == \"pressed\" else TH.c(\"panel\")), TH.c(\"line\"))\n",
    "\t\tvar s := TH.box(glass(TH.c(\"soft\") if st == \"hover\" or st == \"pressed\" else TH.c(\"panel\")), TH.c(\"line\").darkened(0.22))\n"
    "\t\ts.border_width_bottom = 2 if st == \"pressed\" else 4\n"
    "\t\ts.border_width_right = 2\n"
    "\t\tif st == \"pressed\":\n"
    "\t\t\ts.content_margin_top += 2\n")
sub(P, "c.add_theme_stylebox_override(\"panel\", TH.box(glass(TH.c(bg)), TH.c(bg), 20, 0, 12, 3))",
    "var cs := TH.box(glass(TH.c(bg)), TH.c(bg).darkened(0.28), 20, 0, 12, 3)\n"
    "\t\tcs.border_width_bottom = 4\n"
    "\t\tcs.border_width_right = 2\n"
    "\t\tc.add_theme_stylebox_override(\"panel\", cs)")
# icons on the top-right buttons: icon + number (TFT-style), "?" becomes the notepad icon
sub(P, "\tbtn_menu = _part(lay, \"MenuBtn\", \"Button\")\n",
    "\tbtn_menu = _part(lay, \"MenuBtn\", \"Button\")\n"
    "\tfor pr in [[btn_runes, \"rune\"], [btn_diff, \"enemy\"], [btn_legend, \"legend\"]]:\n"
    "\t\tvar bb: Button = pr[0]\n"
    "\t\tbb.icon = TH.uicon(pr[1])\n"
    "\t\tbb.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST\n"
    "\t\tfor k in [\"icon_normal_color\", \"icon_hover_color\", \"icon_pressed_color\", \"icon_focus_color\"]:\n"
    "\t\t\tbb.add_theme_color_override(k, TH.c(\"ink\"))\n"
    "\t\tbb.add_theme_constant_override(\"h_separation\", 4)\n"
    "\tbtn_legend.text = \"\"\n")
sub(P, "\tbtn_runes.text = \"%s %d\" % [TH.ui_text(\"rune\"), held]",
    "\tbtn_runes.text = \"%d\" % held")
sub(P, "else TH.ui_text(\"foe_lbl\") + _n(BT.foe_want_pct(bool(st[\"extra\"]))) + \"%\"",
    "else _n(BT.foe_want_pct(bool(st[\"extra\"]))) + \"%\"")

S = "scripts/ui/slot_cell.gd"
sub(S, "\tvar st := TH.box(bg, line, 10, bw, 3, 2)\n",
    "\tvar st := TH.box(bg, line.darkened(0.22) if bw == 1 else line, 10, bw, 3, 2)\n"
    "\tif filled or shop: # set 213 sample: cards sit on the table as plates (dark bottom/right ledge)\n"
    "\t\tst.border_width_bottom = bw + 3\n"
    "\t\tst.border_width_right = bw + 1\n")

H = "scripts/ui/shape.gd"
sub(H, "\ts.mouse_filter = Control.MOUSE_FILTER_IGNORE\n\treturn s",
    "\ts.mouse_filter = Control.MOUSE_FILTER_IGNORE\n\ts.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST\n\treturn s")
sub(H, "\tif kind in [\"lock\", \"unlock\", \"atk\", \"hp\", \"cd\"]:\n",
    "\tif kind in [\"atk\", \"hp\", \"cd\"] and TH.uicon(kind) != null:\n"
    "\t\tdraw_texture_rect(TH.uicon(kind), Rect2(Vector2.ZERO, size), false, col)\n"
    "\telif kind in [\"lock\", \"unlock\", \"atk\", \"hp\", \"cd\"]:\n")
sub(H, "\t\tdraw_circle(Vector2(w, h) / 2.0, minf(w, h) / 2.0, col, true, -1.0, true)\n",
    "\t\tdraw_circle(Vector2(w, h) / 2.0, minf(w, h) / 2.0, col, true, -1.0, true)\n"
    "\t\tdraw_circle(Vector2(w, h) / 2.0, minf(w, h) / 2.0 - 0.75, col.darkened(0.45), false, 1.5, true)\n"
    "\t\tdraw_circle(Vector2(w * 0.36, h * 0.32), minf(w, h) * 0.12, Color(1, 1, 1, 0.55), true, -1.0, true)\n")
sub(H, "\t\tdraw_colored_polygon(pts, col)\n\telse:",
    "\t\tdraw_colored_polygon(pts, col)\n"
    "\t\tvar cl := pts.duplicate()\n"
    "\t\tcl.append(pts[0])\n"
    "\t\tdraw_polyline(cl, col.darkened(0.45), 1.5, true)\n"
    "\t\tdraw_circle(Vector2(w * 0.38, h * 0.38), minf(w, h) * 0.11, Color(1, 1, 1, 0.5), true, -1.0, true)\n"
    "\telse:")
print("R2 patch ok")
