# set 303 r50b: fill the hole in the frame's bottom inner bevel (S303r50b-frame-fix.py). Texture only.
# Usage: python s302r50b-patch.py <g286> (after s302r50; PNG beside this file)
import sys, os, shutil
here = os.path.dirname(os.path.abspath(__file__))
shutil.copy(os.path.join(here, "S303r50b-card_frame.png"), os.path.join(sys.argv[1], "ui_r48", "card_frame.png"))
print("r50b ok")
