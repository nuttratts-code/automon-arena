# set 268 R6 (owner: "use the frames I cut, on the top"): the owner's hub icons (form 3, newest icon_f3 round per creature)
# -> res://tests/s268icons/<ID>.png for the timeline (s268_timeline.gd _icon). Run after r2 (copies the timeline again).
import sys, os, glob, shutil
g = sys.argv[1]
hub = sys.argv[2] if len(sys.argv) > 2 else "D:/GitHub/automon-arena/art/hub/files"
here = os.path.dirname(os.path.abspath(__file__))
dst = os.path.join(g, "tests/s268icons"); os.makedirs(dst, exist_ok=True)
for cid in ["HL-1", "WN-1", "PL-1", "SF-1", "WY-1", "PT-1"]:
    fs = sorted(glob.glob(os.path.join(hub, cid, "icon_f3_*.png")), key=os.path.getmtime)
    assert fs, cid
    shutil.copy(fs[-1], os.path.join(dst, cid + ".png"))
    print(cid, os.path.basename(fs[-1]))
shutil.copy(os.path.join(here, "r2-timeline.gd.txt"), os.path.join(g, "scripts/ui/s268_timeline.gd"))
print("ok icons")
