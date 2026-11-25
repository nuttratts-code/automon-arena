# set 299 round 36 (sample, after s299r35z23): team-setup (prep) screen in the battle-screen look (owner B1)
#   env S299PREP (default on, 0 = old): shop cards + bench cells = P6 cut-corner plates (state frames lock / merge / pick / drop
#   keep their colour as a 2 px edge; owned kind = gold edge) · one P6 plate behind the bottom HUD row · Fight = picked-colour
#   plate with cream edge · C3 text (brighter colour + opaque near-black outline) on every label of the prep layout
#   needs s299r36-prep.gd.txt beside this file → scripts/ui/s299_prep.gd
import sys, pathlib, re
here = pathlib.Path(__file__).parent
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
src = (here / "s299r36-prep.gd.txt").read_text(encoding="utf-8")
src = re.sub(r"(?m)^((?:    )+)", lambda m: "\t" * (len(m.group(1)) // 4), src)
(g / "scripts/ui/s299_prep.gd").write_text(src, encoding="utf-8")

ps = g / "scripts/ui/slot_cell.gd"; s = ps.read_text(encoding="utf-8")
old = 'var stage: Node3D = null\n'
assert s.count(old) == 1
s = s.replace(old, old + 'var _pz299 := {}   # s299 r36: plate state for _draw\nstatic var _PZ299: Variant = null\n')
old = '\tadd_theme_stylebox_override("panel", st)\n\tmodulate ='
assert s.count(old) == 1
s = s.replace(old, '\t_pz299 = {}\n'
	'\tif stage_slot.is_empty() and OS.get_environment("S299PREP") != "0":   # s299 r36: P6 cut-corner plate instead of the band\n'
	'\t\t_pz299 = {"filled": filled, "shop": shop, "line": line, "bw": bw, "owned": owned and filled and shop}\n'
	'\t\tst = TH.box(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 10, 0, 3, 2)\n'
	'\tqueue_redraw()\n' + old)
s += ('\nfunc _draw() -> void:   # s299 r36\n'
	'\tif _pz299.is_empty():\n\t\treturn\n'
	'\tif _PZ299 == null:\n\t\t_PZ299 = load("res://scripts/ui/s299_prep.gd")\n'
	'\tvar f: bool = _pz299["filled"]\n'
	'\tvar bw: int = _pz299["bw"]\n'
	'\tvar edge: Variant = null\n'
	'\tvar ew := 1.0\n'
	'\tif bw >= 2 and (f or _pz299["shop"]):\n'
	'\t\tedge = Color(_pz299["line"], 1.0)\n\t\tew = 2.0\n'
	'\telif _pz299["owned"]:\n'
	'\t\tedge = Color(TH.c("gold"), 0.75)\n'
	'\t_PZ299.plate(self, Rect2(Vector2.ZERO, size), 6.0 if _pz299["shop"] else 5.0, picked, 1.0 if f else 0.45, edge, ew)\n')
ps.write_text(s, encoding="utf-8")

pp = g / "scripts/ui/prep.gd"; p = pp.read_text(encoding="utf-8")
old = '# set 213 (A1): phone notch / rounded corners'
assert p.count(old) == 1
p = p.replace(old, (
	'func _s299_prep(lay: Control) -> void:   # s299 r36: bottom HUD plate + Fight plate + C3 text\n'
	'\tif OS.get_environment("S299PREP") == "0":\n\t\treturn\n'
	'\tvar PZS: GDScript = load("res://scripts/ui/s299_prep.gd")\n'
	'\tvar tr := lay.get_node_or_null("Tray") as Control\n'
	'\tif tr == null:\n\t\treturn\n'
	'\tvar bar: Control = PZS.new()\n\tbar.mode = "bar"\n\tbar.tray = tr\n\ttr.add_child(bar)\n\ttr.move_child(bar, 0)\n'
	'\tif btn_fight != null:\n'
	'\t\tvar bb: Control = PZS.new()\n\t\tbb.mode = "btn"\n\t\tbb.btn = btn_fight\n\t\tbtn_fight.add_child(bb)\n\t\tbtn_fight.move_child(bb, 0)\n\n') + old)
old = '\tbtn_fight.pressed.connect(func() -> void: fight.emit())\n'
assert p.count(old) == 1
p = p.replace(old, old + '\t_s299_prep(lay)\n')
pp.write_text(p, encoding="utf-8")
print("ok r36")
