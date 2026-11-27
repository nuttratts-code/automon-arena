# set 307 odds gems i (owner pick F2 = faceted + gold setting, S307h-gems.png): the rarity dot before each % on the r43 odds tag
# becomes a gem texture ui_r48/gem_<token>.png (export: python S307h-gems.py <g286>). Usage: python s307gem-patch.py <g286> (after s307odds)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "prep.gd")
if not os.path.exists(p + ".s307gem"): shutil.copy(p, p + ".s307gem")
s = open(p, encoding="utf-8", newline="").read()
old = '\t\tvar dot := SHAPE.make("circle", RAR_TOK.get(r, "mute"), 10)\n'
new = ('\t\tvar dot: Control = SHAPE.make("circle", RAR_TOK.get(r, "mute"), 10)\n'
       '\t\tif OS.get_environment("S302R43") == "1":   # set 307 i (owner F2): faceted gem in our 2-cut-corner shape, gold setting\n'
       '\t\t\tdot.queue_free()\n'
       '\t\t\tvar gt := TextureRect.new()\n'
       '\t\t\tgt.texture = (load("res://scripts/ui/r43.gd") as GDScript)._tex("gem_" + String(RAR_TOK.get(r, "mute")))\n'
       '\t\t\tgt.expand_mode = TextureRect.EXPAND_IGNORE_SIZE\n'
       '\t\t\tgt.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED\n'
       '\t\t\tgt.custom_minimum_size = Vector2(11, 11)\n'
       '\t\t\tgt.mouse_filter = Control.MOUSE_FILTER_IGNORE\n'
       '\t\t\tdot = gt\n')
if new not in s:
    assert old in s; s = s.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="").write(s); print("prep.gd ok")
