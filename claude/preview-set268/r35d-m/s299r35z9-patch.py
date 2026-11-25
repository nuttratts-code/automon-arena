# set 299 round 35z9 (sample): bottom text clear — env S299CLR
#   0/empty = as before · 1 = every text colour full opacity, greys -> near white, hues a bit brighter,
#   dark outline full opacity · 2 = 1 + outline 1 px thinner (crisper edge)
# Wraps the colour arg of every draw_string / draw_string_outline call in scripts/ui/s286_team.gd.
import re, sys, pathlib
g = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"D:/GitHub/automon-scratch/g286")
p = g / "scripts/ui/s286_team.gd"
s = p.read_text(encoding="utf-8")
assert "_vc299(" not in s, "already patched"

def split_args(body):
    out, depth, cur, q = [], 0, "", None
    for ch in body:
        if q:
            cur += ch
            if ch == q: q = None
            continue
        if ch in "\"'": q = ch; cur += ch; continue
        if ch in "([{": depth += 1
        if ch in ")]}": depth -= 1
        if ch == "," and depth == 0: out.append(cur); cur = ""; continue
        cur += ch
    out.append(cur)
    return out

def patch_calls(src, name, fn):
    res, i, n = "", 0, 0
    pat = re.compile(r"\b" + name + r"\(")
    while True:
        m = pat.search(src, i)
        if not m: res += src[i:]; break
        j = m.end(); depth = 1; q = None
        while depth:
            ch = src[j]
            if q:
                if ch == q: q = None
            elif ch in "\"'": q = ch
            elif ch == "(": depth += 1
            elif ch == ")": depth -= 1
            j += 1
        args = split_args(src[m.end():j - 1])
        args = fn(args)
        res += src[i:m.end()] + ",".join(args) + ")"
        i = j; n += 1
    return res, n

def f_str(a):
    if len(a) >= 7: a[6] = " _vc299(" + a[6].strip() + ")"
    return a
def f_out(a):
    if len(a) >= 8:
        a[6] = " _vs299(" + a[6].strip() + ")"
        a[7] = " _vo299(" + a[7].strip() + ")"
    return a

body, defs = s, ""
body, n1 = patch_calls(body, "draw_string_outline", f_out)
body, n2 = patch_calls(body, "draw_string", f_str)
print("wrapped draw_string", n2, "outline", n1)
assert n1 > 10 and n2 > 10

helpers = '''

# ---------- s299 r35z9: S299CLR = clear bottom text ----------
static var _clr299 := -1
static func _clrm299() -> int:
	if _clr299 < 0: _clr299 = int(OS.get_environment("S299CLR")) if OS.get_environment("S299CLR") != "" else 0
	return _clr299
static func _vc299(c: Color) -> Color:
	if _clrm299() == 0 or c.a <= 0.01: return c
	var o := Color(c.r, c.g, c.b, 1.0)
	if o.s < 0.18: return o.lerp(Color.WHITE, 0.7)
	o.v = minf(1.0, o.v * 1.15 + 0.05)
	return o
static func _vo299(c: Color) -> Color:
	if _clrm299() == 0 or c.a <= 0.01: return c
	return Color(0.02, 0.03, 0.04, 1.0)
static func _vs299(sz: int) -> int:
	return maxi(1, sz - 1) if _clrm299() >= 2 else sz
'''
body = body.rstrip("\n") + "\n" + helpers.replace("    ", "\t")
p.write_text(body, encoding="utf-8")
print("ok")
