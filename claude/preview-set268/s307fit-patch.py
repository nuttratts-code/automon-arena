# set 307 buttons l (owner A1 + C1): lock / reroll fit the card row and the reroll coin = the painted card coin.
# A1: lock top edge = card top edge, reroll bottom edge = card bottom edge (PC 1920 shot S307btn3: cards y 55..233 px =
# 11.5..94.3 units in Top), gap between the two buttons kept (4 units), heights keep the old 40 : 52 ratio
# -> lock 11.0..45.5, reroll 49.5..95.0 (after measuring round 1); gold divider centred between the buttons and the first card (-180..-179) and as
# tall as the cards. C1: coin under "สุ่มใหม่" = r43 _tex("coin") (TextureRect) instead of the gold chip icon copy.
# S307FIT=0 = old layout + old coin. Usage: python s307fit-patch.py <g286>   (backup prep.gd.s307fit)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "prep.gd")
if not os.path.exists(p + ".s307fit"): shutil.copy(p, p + ".s307fit")
s = open(p, encoding="utf-8", newline="").read()
F = 'OS.get_environment("S307FIT") != "0"'
reps = [
    ('\t\t\t\t_mv299(top.get_node_or_null("Reroll"), top, 0.5, -392, -190, 49, 101)   # r45 B1/B3 · set 307: up 22\n',
     '\t\t\t\t_mv299(top.get_node_or_null("Reroll"), top, 0.5, -392, -190, 49, 101)   # r45 B1/B3 · set 307: up 22\n'
     '\t\t\t\tif ' + F + ': _mv299(top.get_node_or_null("Reroll"), top, 0.5, -392, -190, 49.5, 95.0)   # set 307 l A1: bottom = card bottom\n'),
    ('\t\t\t\t_mv299(lb, top, 0.5, -392, -190, 5, 45)   # r45 B1/B3 · set 307: up 22\n',
     '\t\t\t\t_mv299(lb, top, 0.5, -392, -190, 5, 45)   # r45 B1/B3 · set 307: up 22\n'
     '\t\t\t\tif ' + F + ': _mv299(lb, top, 0.5, -392, -190, 11.0, 45.5)   # set 307 l A1: top = card top\n'),
    ('\t\t\t\t_mv299(gd, top, 0.5, -183, -182, 8, 98)   # set 307: up 22\n',
     '\t\t\t\t_mv299(gd, top, 0.5, -183, -182, 8, 98)   # set 307: up 22\n'
     '\t\t\t\tif ' + F + ': _mv299(gd, top, 0.5, -180, -179, 11.0, 95.0)   # set 307 l A1: centred in the gap, card height\n'),
    ('\t\t\tvar coin: Control = (gi.duplicate() as Control) if gi != null else SHAPE.make("gold", "gold", 14)\n',
     '\t\t\tvar coin: Control = (gi.duplicate() as Control) if gi != null else SHAPE.make("gold", "gold", 14)\n'
     '\t\t\tif OS.get_environment("S302R43") == "1" and ' + F + ':   # set 307 l C1: the painted card coin\n'
     '\t\t\t\tcoin.free()\n'
     '\t\t\t\tvar ctr := TextureRect.new()\n'
     '\t\t\t\tctr.texture = (load("res://scripts/ui/r43.gd") as GDScript)._tex("coin")\n'
     '\t\t\t\tctr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE\n'
     '\t\t\t\tctr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED\n'
     '\t\t\t\tctr.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS\n'
     '\t\t\t\tctr.mouse_filter = Control.MOUSE_FILTER_IGNORE\n'
     '\t\t\t\tcoin = ctr\n'),
]
for old, new in reps:
    if new in s: continue
    assert s.count(old) == 1, old; s = s.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="").write(s); print("prep.gd ok")
