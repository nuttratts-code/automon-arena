# set 268 round 12 (owner 21 Nov): pause / fast-forward show their state.
# Pause: icon stays || (B1) · idle = faint · paused = more solid + small "STOP" under the button.
# Fast-forward: 1x = one faint triangle · 2x = one solid triangle · 4x = two · 8x = three · 16x = four (TEST ONLY —
# owner: 16x goes out on release day) · then back to 1x · small "FAST" under the button above 1x (C1: no number).
# Harness: S268STATES=1 shoots extra battle stills, one per state (1_battle_<state>.png), in the same run.
# Run after s268r11-patch-tonedown.
import sys, os
g = sys.argv[1]

def sub(path, pairs):
    p = os.path.join(g, path)
    t = open(p, encoding="utf-8").read()
    for a, b in pairs:
        a = a.replace("    ", "\t"); b = b.replace("    ", "\t")
        assert a in t, (path, a[:70])
        t = t.replace(a, b, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(t)

sub("scripts/ui/s268_icon.gd", [
    ("    modulate.a = 0.8\n", "    modulate.a = 1.0   # round 12: alpha per state in _draw\n"),
    ("    if kind == \"pause\" and not paused:\n", "    if kind == \"pause\":   # round 12 (B1): || in both states\n"),
    ("# ▶▶\n        for y in range(2, 11):\n            var w := 4 - absi(y - 6)\n            for x0 in [1, 7]:\n",
     "# ▶▶ round 12: 1x/2x = one triangle, 4x two, 8x three, 16x four (test only)\n        var n := {1: 1, 2: 1, 4: 2, 8: 3, 16: 4}.get(speed, 1) as int\n        var x0s := []\n        for i in n:\n            x0s.append(i * 6 - (n - 1) * 3 + 4)\n        for y in range(2, 11):\n            var w := 4 - absi(y - 6)\n            for x0 in x0s:\n"),
    ("    var o := (size - Vector2(GRID, GRID) * px) * 0.5\n",
     "    var on := (kind == \"pause\" and paused) or (kind == \"ff\" and speed > 1)\n    var a := 0.95 if on else 0.55   # round 12: faint at rest, more solid when on\n    var o := (size - Vector2(GRID, GRID) * px) * 0.5\n"),
    ("        draw_rect(Rect2(o + Vector2(q) * px, Vector2(px, px)), OUT)\n",
     "        draw_rect(Rect2(o + Vector2(q) * px, Vector2(px, px)), Color(OUT, OUT.a * a))\n"),
    ("        draw_rect(Rect2(o + Vector2(p) * px, Vector2(px, px)), c)\n",
     "        draw_rect(Rect2(o + Vector2(p) * px, Vector2(px, px)), Color(c, a))\n"),
    ("    if kind == \"ff\" and speed > 1:\n        var fnt := ThemeDB.fallback_font\n        var at := Vector2(size.x - 16.0, size.y - 3.0)\n        draw_string_outline(fnt, at, \"%d×\" % speed, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, 4, OUT)\n        draw_string(fnt, at, \"%d×\" % speed, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, LIT)\n",
     "    if on:   # round 12: small word under the button (C1: FAST without a number)\n        var fnt := ThemeDB.fallback_font\n        var word := \"STOP\" if kind == \"pause\" else \"FAST\"\n        var fs := 12\n        var tw := fnt.get_string_size(word, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x\n        var at := Vector2(roundf((size.x - tw) * 0.5), size.y + 1.0)\n        draw_string_outline(fnt, at, word, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 4, Color(\"#16202a\", 0.9))\n        draw_string(fnt, at, word, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(\"#e4ebef\"))\n"),
])

sub("scripts/ui/battle.gd", [
    ("        b.custom_minimum_size = Vector2(58, 54)\n",
     "        b.custom_minimum_size = Vector2(58, 54) if pair[1] == \"pause\" else Vector2(70, 54)   # round 12: room for 4 triangles\n"),
])

sub("tests/s239_prep.gd", [
    ("    await _shot(out, \"1_battle\")\n",
     "    await _shot(out, \"1_battle\")\n    if OS.get_environment(\"S268STATES\") == \"1\":   # set 268 round 12: one still per button state\n        var ics: Dictionary = app.battle._icons\n        for stt in [[false, 1, \"idle\"], [true, 1, \"stop\"], [false, 2, \"x2\"], [false, 4, \"x4\"], [false, 8, \"x8\"], [false, 16, \"x16\"]]:\n            ics[\"pause\"].paused = stt[0]\n            ics[\"ff\"].speed = stt[1]\n            await _shot(out, \"1_battle_\" + stt[2])\n        ics[\"pause\"].paused = false\n        ics[\"ff\"].speed = 1\n"),
])
print("ok states")
