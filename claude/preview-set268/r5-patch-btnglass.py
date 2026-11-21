# set 268 R5 (owner: "buttons more see-through"): every button body 60 % (was opaque / 85 %), the Fight plate 75 % so the
# main action still reads first. Panels/cards keep GLASS 0.85. Run after r4-patch-refshape.
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

sub("scripts/ui/theme.gd", [
    ("const CUT_MAX := 7\n", "const CUT_MAX := 7\nconst BTN_A := 0.60  # R5: button see-through\n"),
    ("        var b := box(c(\"panel\"), c(\"line\"))\n        if st == \"hover\" or st == \"pressed\":\n            b.bg_color = c(\"soft\")\n",
     "        var b := box(Color(c(\"panel\"), BTN_A), c(\"line\"))\n        if st == \"hover\" or st == \"pressed\":\n            b.bg_color = Color(c(\"soft\"), BTN_A)\n"),
    ("        var s := box(c(\"accent\"), c(\"line\"), 2, 1)\n", "        var s := box(Color(c(\"accent\"), 0.75), c(\"line\"), 2, 1)\n"),
    ("            s.bg_color = c(\"accent\").darkened(0.12) if not dark else c(\"accent\").lightened(0.12)\n",
     "            s.bg_color = Color(c(\"accent\").darkened(0.12), 0.75)\n"),
])
sub("scripts/ui/prep.gd", [
    ("        var s := TH.box(glass(TH.c(\"soft\") if st == \"hover\" or st == \"pressed\" else TH.c(\"panel\")), TH.c(\"line\").darkened(0.22))\n",
     "        var s := TH.box(Color(TH.c(\"soft\") if st == \"hover\" or st == \"pressed\" else TH.c(\"panel\"), TH.BTN_A), TH.c(\"line\"))\n"),
])
print("ok btnglass")
