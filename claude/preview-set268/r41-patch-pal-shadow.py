# set 299 round 41 (owner 27 Nov): colour palettes S299PAL 0-3 for the r40 variants + B1 shadows (S299BLOB dark contact blob, S299NORING hides the rarity ring)
import sys, pathlib
g = pathlib.Path(sys.argv[1])

def sub(path, pairs):
    p = g / path
    t = p.read_bytes().decode("utf-8")
    crlf = "\r\n" in t
    for old, new, n in pairs:
        if crlf:
            old, new = old.replace("\n", "\r\n"), new.replace("\n", "\r\n")
        c = t.count(old)
        assert c == n, (path, old, c)
        t = t.replace(old, new)
    p.write_bytes(t.encode("utf-8"))

# --- palettes in var299.gd: every chrome hex becomes P("role")
hexes = {"#1a1e23": "pan", "#454c55": "edge", "#101317": "slot", "#14181d": "card", "#2a2d36": "pan2",
         "#1b1d24": "slot2", "#1d3842": "tint", "#cfe6ee": "rule", "#0f1215": "pan4", "#3a4048": "sedge"}
v = (g / "scripts/ui/var299.gd").read_bytes().decode("utf-8")
pairs = []
for h, k in hexes.items():
    c = v.count('Color("%s")' % h)
    assert c >= 1, h
    pairs.append(('Color("%s")' % h, 'P("%s")' % k, c))
pal = '''
# ---------------- r41 palettes (S299PAL): 0 cool now · 1 umber (scene shadow) · 2 moss (foliage shadow) · 3 dusk plum ----------------
const PALS := [
	{"pan": "#1a1e23", "edge": "#454c55", "slot": "#101317", "card": "#14181d", "pan2": "#2a2d36", "slot2": "#1b1d24", "tint": "#1d3842", "rule": "#cfe6ee", "pan4": "#0f1215", "sedge": "#3a4048"},
	{"pan": "#251d15", "edge": "#6a5640", "slot": "#1a140e", "card": "#1d1711", "pan2": "#3b2f23", "slot2": "#2a2119", "tint": "#3d2b1a", "rule": "#f3dfc0", "pan4": "#1c150f", "sedge": "#5a4834"},
	{"pan": "#1b2217", "edge": "#56663f", "slot": "#121810", "card": "#161d12", "pan2": "#2d3624", "slot2": "#20281a", "tint": "#2b3b22", "rule": "#dfeec6", "pan4": "#131a10", "sedge": "#4a5838"},
	{"pan": "#231b25", "edge": "#64506a", "slot": "#170f18", "card": "#1b141d", "pan2": "#372b3a", "slot2": "#271e29", "tint": "#36273d", "rule": "#ecd9f2", "pan4": "#171019", "sedge": "#54445a"},
]
static var _pal := -1
static func P(k: String) -> Color:
	if _pal < 0:
		_pal = clampi(int(OS.get_environment("S299PAL")), 0, PALS.size() - 1)
	return Color(PALS[_pal][k])
'''
anchor = "static func _sq(r: Rect2)"
pairs.append((anchor, pal.lstrip("\n") + "\n" + anchor, 1))
pairs = [(a.replace("    ", "\t"), b, n) for a, b, n in pairs]
sub("scripts/ui/var299.gd", pairs)

# --- shadows in stage3d.gd
sub("scripts/ui/stage3d.gd", [
    ("\tsh.material_override = sm\n\tsh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF\n",
     "\tif OS.get_environment(\"S299BLOB\") != \"\": # r41 B1: darker contact shadow at the feet\n\t\tsm.albedo_color = Color(0.10, 0.07, 0.04, clampf(float(OS.get_environment(\"S299BLOB\")), 0.0, 1.0))\n\t\tpm.size *= 1.12\n\tsh.material_override = sm\n\tsh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF\n", 1),
    ("\tif rt != \"\": # rarity = a thin coloured ring",
     "\tif rt != \"\" and OS.get_environment(\"S299NORING\") != \"1\": # rarity = a thin coloured ring", 1),
])
print("r41 patch ok")
