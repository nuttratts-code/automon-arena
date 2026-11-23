import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "tests" / "s239_prep.gd"
s = p.read_text(encoding="utf-8")
old = """		DisplayServer.window_set_title("set 268 real fight sample - close the window to stop")
		while true:
			await process_frame
"""
assert old in s, "anchor missing"
new = """		DisplayServer.window_set_title("set 268 real fight sample - close the window to stop")
		var rf := 0
		var rp := OS.get_environment("S286REPRO") == "1"
		while true:
			await process_frame
			if rp:   # s286 repro: pause, then hover the stop button, log the clock
				rf += 1
				var bv = app.battle.view
				if rf == 30: app.battle._on_stop(); print("S286 paused playing=", bv.playing, " clock=", bv.clock)
				if rf > 60 and rf < 180:
					var r: Rect2 = app.battle.btn_stop.get_global_rect()
					var mm := InputEventMouseMotion.new(); mm.position = r.get_center() + Vector2(float(rf % 7) - 3.0, 0.0); mm.global_position = mm.position
					get_root().push_input(mm)
				if rf % 20 == 0: print("S286 f=", rf, " playing=", bv.playing, " clock=", snappedf(bv.clock, 0.1), " hover=", app.battle.btn_stop.is_hovered(), " lbl=", app.battle.clock.text)
				if rf == 200: quit()
"""
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("ok")
