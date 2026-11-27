# set 307 buttons k: lock / reroll draw the composed painted buttons ui_r48/btn_lock.png / btn_reroll.png (S307k-buttons.py)
# instead of the r47 code plate + sheen; hover = 12 % brighter. S307BTN=0 = old code look. Usage: python s307btn-patch.py <g286>
import sys, os, shutil
p = os.path.join(sys.argv[1], "scripts", "ui", "r43.gd")
if not os.path.exists(p + ".s307btn"): shutil.copy(p, p + ".s307btn")
s = open(p, encoding="utf-8", newline="").read()
old = '\tvar p := _cut(r, 6.0)\n\tvar rr := nm == "Reroll"'
new = ('\tif OS.get_environment("S307BTN") != "0":   # set 307 k (owner): painted shop plate + GPT gradient fill, light from the top-left\n'
       '\t\tci.draw_texture_rect(_tex("btn_reroll" if nm == "Reroll" else "btn_lock"), r, false, Color(1.12, 1.12, 1.12) if hv else Color.WHITE)\n'
       '\t\treturn\n' + old)
if new not in s:
    assert old in s; s = s.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="").write(s); print("r43.gd ok")
