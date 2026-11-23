# R35d (set 286 follow-up): crisp Kenney (CC0) + own-shape icons replace the pixel grids on the battle screen:
# card values / hit chips (s286_team.gd) and the pause / fast-forward buttons (s268_icon.gd).
# Icons: g286/data/ui_icons/r35d/<key>.png (+ <key>_o.png outline), made by kenney_bgi/tools/r35d_export.py.
# Loaded at runtime with Image.load_from_file + mipmaps (sample only: no import step; ทำจริง = imported SVG/PNG with mipmaps).
import sys, io
G = sys.argv[1]


def patch(path, pairs):
    s = io.open(path, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            raise SystemExit('anchor not found in %s: %r' % (path, a[:60]))
        s = s.replace(a, b, 1)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(s)


T = G + '/scripts/ui/s286_team.gd'
patch(T, [
    ("var _pre := false\n",
     "var _pre := false\n"
     "# r35d: crisp icons drawn on a child layer with linear+mipmap filtering (this node stays NEAREST for the hub pixel icons)\n"
     "const ICON_DIR := \"res://data/ui_icons/r35d/\"\n"
     "const ISZ := 11.0\n"
     "static var _itex := {}\n"
     "var _ic_layer: Control = null\n"
     "var _ic_q: Array = []\n"),
    ("\ttexture_filter = CanvasItem.TEXTURE_FILTER_NEAREST\n",
     "\ttexture_filter = CanvasItem.TEXTURE_FILTER_NEAREST\n"
     "\t_ic_layer = Control.new()\n"
     "\t_ic_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE\n"
     "\t_ic_layer.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS\n"
     "\t_ic_layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)\n"
     "\tadd_child(_ic_layer)\n"
     "\t_ic_layer.draw.connect(_draw_icons)\n"),
    ("func _draw() -> void:\n\t_rects.clear()\n\tif view == null: return\n",
     "func _draw() -> void:\n\t_rects.clear()\n\t_ic_q.clear()\n\tif _ic_layer != null: _ic_layer.queue_redraw()\n\tif view == null: return\n"),
    ("\treturn float((ICONS[kind][0] as String).length()) * 1.5 + 2.0 + TH.font(\"mono\")",
     "\treturn ISZ + 1.0 + TH.font(\"mono\")"),
    ("\tvar g: Array = ICONS[kind]\n\tvar gw := float((g[0] as String).length()) * px\n",
     "\tvar gw := ISZ - 1.0\n"),
    ("\t_pix(Vector2(p.x, p.y + 1.0), g, ICON_COL[kind], px, a)\n",
     "\t_ic_q.append([Rect2(p.x - 1.0, p.y - 0.5, ISZ, ISZ), kind, ICON_COL[kind], a])\n"),
    ("func _pix(o: Vector2, g: Array, col: Color, px: float, a: float) -> void:\n",
     "static func icon_tex(key: String) -> Texture2D:\n"
     "\tif not _itex.has(key):\n"
     "\t\tvar img := Image.load_from_file(ICON_DIR + key + \".png\")\n"
     "\t\tif img == null or img.is_empty():\n"
     "\t\t\t_itex[key] = null\n"
     "\t\telse:\n"
     "\t\t\timg.generate_mipmaps()\n"
     "\t\t\t_itex[key] = ImageTexture.create_from_image(img)\n"
     "\treturn _itex[key]\n\n"
     "func _draw_icons() -> void:\n"
     "\tfor q in _ic_q:\n"
     "\t\tvar r: Rect2 = q[0]\n"
     "\t\tvar a: float = q[3]\n"
     "\t\tvar o := icon_tex(String(q[1]) + \"_o\")\n"
     "\t\tvar f := icon_tex(String(q[1]))\n"
     "\t\tif o != null: _ic_layer.draw_texture_rect(o, r, false, Color(OUT, OUT.a * a))\n"
     "\t\tif f != null: _ic_layer.draw_texture_rect(f, r, false, Color(q[2], a))\n\n"
     "func _pix(o: Vector2, g: Array, col: Color, px: float, a: float) -> void:\n"),
])

I = G + '/scripts/ui/s268_icon.gd'
patch(I, [
    ("func _draw() -> void:\n",
     "const TEAM := preload(\"res://scripts/ui/s286_team.gd\")\n\n"
     "func _draw() -> void:   # r35d: crisp own-shape icons (pause || both states · ff = 1 or 2 triangles, 4x+ = more)\n"
     "\tif TEAM.icon_tex(\"pause\") != null:\n"
     "\t\t_draw_crisp()\n"
     "\t\treturn\n"
     "\t_draw_px()\n\n"
     "func _draw_crisp() -> void:\n"
     "\ttexture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS\n"
     "\tvar on := (kind == \"pause\" and paused) or (kind == \"ff\" and speed > 1)\n"
     "\tvar a := 0.95 if on else 0.55\n"
     "\tvar s := roundf(minf(size.x, size.y) * 0.62)\n"
     "\tvar keys: Array = [\"pause\"]\n"
     "\tif kind == \"ff\":\n"
     "\t\tvar n := {1: 1, 2: 1, 4: 2, 8: 3, 16: 4}.get(speed, 1) as int\n"
     "\t\tkeys = [\"play\"] if n == 1 else ([\"ff\"] if n == 2 else [])\n"
     "\t\tif keys.is_empty():\n"
     "\t\t\tfor i in n: keys.append(\"play\")\n"
     "\tvar step := s if keys.size() == 1 else s * 0.55\n"
     "\tvar tw := s + step * float(keys.size() - 1)\n"
     "\tvar x0 := roundf((size.x - tw) * 0.5)\n"
     "\tvar y0 := roundf((size.y - s) * 0.5)\n"
     "\tfor i in keys.size():\n"
     "\t\tvar r := Rect2(x0 + step * float(i), y0, s, s)\n"
     "\t\tvar o := TEAM.icon_tex(String(keys[i]) + \"_o\")\n"
     "\t\tif o != null: draw_texture_rect(o, r, false, Color(OUT, OUT.a * a))\n"
     "\tfor i in keys.size():\n"
     "\t\tvar r := Rect2(x0 + step * float(i), y0, s, s)\n"
     "\t\tdraw_texture_rect(TEAM.icon_tex(String(keys[i])), r, false, Color(LIT, a))\n"
     "\t_word(on, a)\n\n"
     "func _word(on: bool, a: float) -> void:\n"
     "\tif on:\n"
     "\t\tvar fnt := ThemeDB.fallback_font\n"
     "\t\tvar word := \"STOP\" if kind == \"pause\" else \"FAST\"\n"
     "\t\tvar fs := 12\n"
     "\t\tvar tw := fnt.get_string_size(word, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x\n"
     "\t\tvar at := Vector2(roundf((size.x - tw) * 0.5), size.y + 1.0)\n"
     "\t\tdraw_string_outline(fnt, at, word, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 4, Color(OUT, OUT.a * a))\n"
     "\t\tdraw_string(fnt, at, word, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(BASE, a))\n\n"
     "func _draw_px() -> void:\n"),
])
print('r35d patch ok')
