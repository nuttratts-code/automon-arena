# set 307 icons l (owner B1): lock / reroll buttons draw the GPT icons (S307l-icons.py -> ui_r48/icon_lock.png, icon_reroll.png)
# instead of the code SHAPE padlock / arrow. Sizes from the target picture (icon ~ 45-50 % of the button height):
# padlock 18 units tall, reroll ring 20 units tall (+ the glow padding 25 % per side = 30-unit box).
# S307ICON=0 = old code icons. Usage: python s307icon-patch.py <g286> (after s307fit; backup prep.gd.s307icon)
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "prep.gd")
if not os.path.exists(p + ".s307icon"): shutil.copy(p, p + ".s307icon")
s = open(p, encoding="utf-8", newline="").read()
F = 'OS.get_environment("S302R43") == "1" and OS.get_environment("S307ICON") != "0"'
def tr(var, tex, w, h, ind):
    t = "\t" * ind
    return (t + 'var %s := TextureRect.new()\n' % var +
            t + '%s.texture = (load("res://scripts/ui/r43.gd") as GDScript)._tex("%s")\n' % (var, tex) +
            t + '%s.expand_mode = TextureRect.EXPAND_IGNORE_SIZE\n' % var +
            t + '%s.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED\n' % var +
            t + '%s.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS\n' % var +
            t + '%s.custom_minimum_size = Vector2(%s, %s)\n' % (var, w, h) +
            t + '%s.mouse_filter = Control.MOUSE_FILTER_IGNORE\n' % var)
old1 = '\t\tcc.add_child(SHAPE.make("lock" if on or OS.get_environment("S302R43") == "1" else "unlock"'
new1 = ('\t\tif ' + F + ':   # set 307 l B1: GPT gold padlock\n' + tr("lki", "icon_lock", 14, 18, 3) +
        '\t\t\tcc.add_child(lki)\n\t\t\treturn\n' + old1)
old2 = '\t\tcol.anchor_left = 0.62\n'   # the reroll arrow lives in scenes/prep_layout.tscn -> swap it at runtime (r39p reroll)
new2 = (old2 + '\t\tif ' + F + ':   # set 307 l B1: GPT glowing cyan arrow (file padded for the glow)\n' +
        '\t\t\tvar oi := col.get_node_or_null("RerollIcon") as Control\n' +
        '\t\t\tif oi != null:\n' +
        '\t\t\t\toi.visible = false\n' + tr("rri", "icon_reroll", 30, 30, 4) +
        '\t\t\t\trri.size_flags_horizontal = Control.SIZE_SHRINK_CENTER\n' +
        '\t\t\t\tcol.add_child(rri)\n' +
        '\t\t\t\tcol.move_child(rri, oi.get_index())\n')
for old, new in ((old1, new1), (old2, new2)):
    if new in s: continue
    assert s.count(old) == 1, old; s = s.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="").write(s); print("prep.gd ok")
