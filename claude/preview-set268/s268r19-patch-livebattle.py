# set 268 round 19 (owner 21 Nov: "open the battle screen for me to see"): harness LIVEB=1 = a Godot window that stays on the
# battle screen after the 1_battle still: the timeline runs on its sample cooldowns, the clock counts, pause / fast-forward
# work by mouse (pause freezes the clock, fast-forward cycles 1-2-4-8-16). The real fight stays frozen (BHOLD) so no result
# sheet pops up; the 12 units are the round 3 stand-ins (no attacks). Close the window to stop. Run after s268r18.
import sys, os
g = sys.argv[1]
p = os.path.join(g, "tests/s239_prep.gd")
t = open(p, encoding="utf-8").read()
a = "\tif OS.get_environment(\"S268STATES\") == \"1\":"
assert a in t
b = ("\tif OS.get_environment(\"LIVEB\") == \"1\":   # set 268 round 19: live battle screen window\n"
     "\t\tvar bt = app.battle\n"
     "\t\tvar ics: Dictionary = bt._icons\n"
     "\t\tfor cn in bt.btn_stop.pressed.get_connections(): bt.btn_stop.pressed.disconnect(cn[\"callable\"])\n"
     "\t\tfor cn in bt.btn_stop.toggled.get_connections(): bt.btn_stop.toggled.disconnect(cn[\"callable\"])\n"
     "\t\tbt.btn_stop.pressed.connect(func() -> void: ics[\"pause\"].paused = not ics[\"pause\"].paused)\n"
     "\t\tDisplayServer.window_set_title(\"set 268 battle screen sample - close the window to stop\")\n"
     "\t\tvar ms := 0.0\n"
     "\t\tvar last := Time.get_ticks_msec()\n"
     "\t\twhile true:\n"
     "\t\t\tawait process_frame\n"
     "\t\t\tvar now := Time.get_ticks_msec()\n"
     "\t\t\tif not ics[\"pause\"].paused: ms += float(now - last) * float(ics[\"ff\"].speed)\n"
     "\t\t\tlast = now\n"
     "\t\t\tbt.view.clock = ms\n"
     "\t\t\tbt.clock.text = \"%.1f วิ\" % (ms / 1000.0)\n")
t = t.replace(a, b + a, 1)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok live battle")
