# set 268 round 22c — owner rule: every hub setting. Sample units stand on the hub FEET point (shadow tab, file fractions,
# mirrored with the flip) instead of "lowest opaque row", and the sun-cast shadow uses the hub cast numbers:
# silhouette = rows above the feet only, anchored at the feet x, strength = str, length x len, soft edge = blur (hub: blur*0.12*fh px).
# Arena sun direction stays the scene's (art-look), not the hub preview sunAngle.
# usage: python s268r22c-patch-hubfeet.py <g268>   (after s268r22-patch-idle.py)
import os, sys
G = sys.argv[1]
pr = os.path.join(G, "tests", "s239_prep.gd")
t = open(pr, encoding="utf-8").read()
if "s268hubfeet" not in t:
    a = '				var hh := wpp * kk9 * (float(img.get_height()) * 0.5 - pb9)\n'
    b = ('				var hh := wpp * kk9 * (float(img.get_height()) * 0.5 - pb9)\n'
         '				var hx := 0.0 # s268hubfeet: hub feet point on the slot\n'
         '				if im.has("fy"):\n'
         '					var fw9 := float(img.get_width()) / float(hf9)\n'
         '					hh = wpp * kk9 * (float(im["fy"]) - 0.5) * float(img.get_height())\n'
         '					hx = wpp * kk9 * (0.5 - float(im["fx"])) * fw9 * (-1.0 if sp.flip_h else 1.0)\n'
         '				sp.set_meta("hubsh", im)\n')
    assert a in t, "hh line"
    t = t.replace(a, b)
    a2 = '				sp.position = feet + nl * hh\n'
    assert a2 in t, "pos line"
    t = t.replace(a2, '				sp.position = feet + nl * hh + Vector3(hx, 0.0, 0.0)\n')
    # shadow: per-unit hub cast numbers
    a3 = '			m.set_shader_parameter("tex", stex); m.set_shader_parameter("flip", 1.0 if spr.flip_h else 0.0)\n'
    assert a3 in t, "shader line"
    t = t.replace(a3, a3 +
        '			var hs: Dictionary = spr.get_meta("hubsh", {}) # s268hubfeet\n'
        '			var hfy := float(hs.get("fy", 1.0)); var hfx := float(hs.get("fx", 0.5))\n'
        '			m.set_shader_parameter("feet_v", hfy); m.set_shader_parameter("feet_u", hfx)\n'
        '			m.set_shader_parameter("blur_px", float(hs.get("blur", 0.0)) * 0.12 * float(stex.get_height()))\n'
        '			m.set_shader_parameter("tex_px", Vector2(stex.get_width(), stex.get_height()))\n')
    a4 = '			m.set_shader_parameter("width", wide); m.set_shader_parameter("strength", float(cfg[0]))\n'
    assert a4 in t, "width line"
    t = t.replace(a4, '			m.set_shader_parameter("width", wide); m.set_shader_parameter("strength", float(cfg[0]) * float(spr.get_meta("hubsh", {}).get("str", 0.5)) / 0.5)\n')
    a5 = '			m.set_shader_parameter("dir", g2 * tall * minf(reach, float(cfg[1])))\n'
    assert a5 in t, "dir line"
    t = t.replace(a5, '			m.set_shader_parameter("dir", g2 * tall * float(spr.get_meta("hubsh", {}).get("fy", 1.0)) * minf(reach, float(cfg[1])) * float(spr.get_meta("hubsh", {}).get("len", 1.0)))\n')
    open(pr, "w", encoding="utf-8").write(t)

sp = os.path.join(G, "tests", "s239_unitshadow.gdshader")
s = open(sp, encoding="utf-8").read()
if "feet_v" not in s:
    s = s.replace('uniform vec3 tint', 'uniform float feet_v = 1.0;   // s268 22c: hub feet row (fraction) - silhouette = rows above it\n'
                  'uniform float feet_u = 0.5;   // hub feet x (fraction of the file) = shadow anchor\n'
                  'uniform float blur_px = 0.0;  // hub cast blur in texture px\n'
                  'uniform vec2 tex_px = vec2(64.0);\nuniform vec3 tint')
    s = s.replace('	VERTEX = side * u * width + dir * v;',
                  '	float uf = mix(u + 0.5 - feet_u, u + 0.5 - (1.0 - feet_u), flip);   // feet x at the origin\n'
                  '	VERTEX = side * uf * width + dir * v;')
    s = s.replace('	float a = step(0.5, texture(tex, uv).a);',
                  '	uv.y = UV.y * feet_v;   // rows above the feet\n'
                  '	float a = 0.0;\n'
                  '	vec2 st = blur_px / max(tex_px, vec2(1.0));\n'
                  '	for (int i = -1; i <= 1; i++) { for (int j = -1; j <= 1; j++) { a += step(0.5, texture(tex, uv + vec2(float(i), float(j)) * st).a); } }\n'
                  '	a /= 9.0;')
    assert s.count("feet_v") >= 2 and "uf" in s
    open(sp, "w", encoding="utf-8").write(s)
print("ok")
