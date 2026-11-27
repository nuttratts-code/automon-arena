# set 303 r49c: owner "strip rule a bit thicker, no black line cutting it" -> S303r49c-rule.py redrew the rule in the frame
# layer (9 px of 364, gold gradient + centre glint, joined to the side frames). Only the texture changes.
# Usage: python s302r49c-patch.py <g286> (after s302r49b; PNG beside this file)
import sys, os, shutil
here = os.path.dirname(os.path.abspath(__file__))
shutil.copy(os.path.join(here, "S303r49c-card_frame.png"), os.path.join(sys.argv[1], "ui_r48", "card_frame.png"))
print("r49c ok")
