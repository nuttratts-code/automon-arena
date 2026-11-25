# set 299 round 36e (sample, after s299r36d): owner "round box to the top" → round / gold / hearts tab = top centre (own plate
#   instance in Top, HUD buttons stay top-left) · board rect bottom h − 130 (only the shop row is at the bottom now) ·
#   harness: S299LIVEP=1 skips the run-end stills so a LIVE=1 --clip window shows the prep screen during the camera move
import sys, pathlib, re
here = pathlib.Path(__file__).parent
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
src = (here / "s299r36-prep.gd.txt").read_text(encoding="utf-8")
src = re.sub(r"(?m)^((?:    )+)", lambda m: "\t" * (len(m.group(1)) // 4), src)
(g / "scripts/ui/s299_prep.gd").write_text(src, encoding="utf-8")
pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
for nm, l, r in (("HudTitle", "-X + 4.0, -84, 6, 34", "172, 330, 2, 32"), ("ChipGold", "-70, 70, 4, 34", "-70, 70, 2, 32"), ("ChipHearts", "84, 160, 4, 34", "84, 160, 2, 32")):
	old = '\t\t_mv299(tr.get_node_or_null("%s"), tr, 0.5, %s)\n' % (nm, l)
	assert p.count(old) == 1, nm
	p = p.replace(old, '\t\t_mv299(tr.get_node_or_null("%s"), top, 0.5, %s)   # r36e: top centre\n' % (nm, r))
old = '\tvar bar: Control = PZS.new()\n'
assert p.count(old) == 1
p = p.replace(old, '\tif top != null:   # r36e: plate behind the round tab, drawn under Top\'s parts\n'
	'\t\tvar tb: Control = PZS.new()\n\t\ttb.mode = "bar"\n\t\ttb.tray = top\n\t\ttop.add_child(tb)\n\t\ttop.move_child(tb, 0)\n' + old)
pp.write_text(p, encoding="utf-8")
pa = g / "scripts/ui/app.gd"; a = pa.read_text(encoding="utf-8")
old = 'size.y - 56.0 - 168.0)'
assert a.count(old) == 1
a = a.replace(old, 'size.y - 56.0 - 130.0)')
pa.write_text(a, encoding="utf-8")
ph = g / "tests/s239_prep.gd"; h = ph.read_text(encoding="utf-8")
old = '\tif OS.get_environment("KEEPUI") == "1": # set 268: run end screen over the battle view\n'
assert h.count(old) == 1
h = h.replace(old, '\tif OS.get_environment("KEEPUI") == "1" and OS.get_environment("S299LIVEP") != "1": # set 268: run end screen over the battle view\n')
ph.write_text(h, encoding="utf-8")
print("ok r36e")
