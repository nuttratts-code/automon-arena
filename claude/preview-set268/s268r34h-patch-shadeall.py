# set 268 round 34h — owner: "the thin white band comes and goes, keep it on always" -> the group shade (white a0.10) is
# drawn for single-unit groups too (was only for groups of 2+). usage: python s268r34h-patch-shadeall.py <g268> (after r34g)
import os, sys
p = os.path.join(sys.argv[1], "scripts", "ui", "s268_timeline.gd")
s = open(p, encoding="utf-8").read()
a = """		if float(gr[1]) > float(gr[0]):
			draw_rect(Rect2(a, ly,"""
b = """		if true: # s268r34h: every group, singles too
			draw_rect(Rect2(a, ly,"""
if "s268r34h" not in s:
    assert a in s
    s = s.replace(a, b, 1)
    open(p, "w", encoding="utf-8").write(s)
print("ok")
