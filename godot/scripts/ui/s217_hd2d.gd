extends ColorRect
# SET 217 SAMPLE ONLY (R19, owner L1 + L4): HD-2D screen pass over the 3D arena, under every 2D screen (UI stays sharp,
# art-look §1 item 7). The gl_compatibility renderer has no depth of field / reliable glow, so it is one canvas shader on
# the screen texture (its mipmaps = cheap blur):
#   L1 tilt-shift: sharp band where the units stand, top + bottom softly blurred (art-look §1 item 2)
#   L1 vignette: darker edges (item 3) · L1 rune glow: pale-cyan bright pixels bloom (item 3 bright accents)
#   L4 warm grade: a little warmer + softer contrast so the cold AI stone backs sit in the scene
# app.gd adds it right after the stage, so it reads only the 3D (+ the bg) and every screen draws above it.

const SHADER := """
shader_type canvas_item;
uniform sampler2D scr : hint_screen_texture, filter_linear_mipmap;
uniform float focus_top = 0.16;    // screen y (0 = top) where the sharp band starts
uniform float focus_bottom = 0.86; // … and ends
uniform float soft = 0.30;         // blur ramp length
uniform float max_lod = 1.0;       // strongest blur (mip level)
uniform float vignette = 0.38;
uniform vec3 warm = vec3(1.05, 1.0, 0.9);
uniform float glow = 0.9;
uniform float sat = 0.95;          // s225: saturation (1 = none)
uniform float contrast = 0.96;     // s225: 1 = none, <1 softer
uniform vec3 lift = vec3(0.0);     // s225: shadow lift colour (FFR meadow ~ 0.009/0.018/0.028)
uniform float bloom_all = 0.0;     // s225: bloom of any bright saturated pixel (lava, halo, sparks)
void fragment() {
	vec2 uv = SCREEN_UV;
	float d = max(focus_top - uv.y, uv.y - focus_bottom);
	float b = smoothstep(0.0, soft, d);
	vec3 c = textureLod(scr, uv, b * max_lod).rgb;
	// rune glow: pale-cyan, bright pixels, gathered from a blurred mip so they bloom past their edges
	vec3 g = vec3(0.0);
	for (int i = 0; i < 2; i++) {
		vec3 s = textureLod(scr, uv, 2.5 + float(i) * 1.5).rgb;
		float cy = clamp((s.b - s.r) * 3.0, 0.0, 1.0) * smoothstep(0.55, 0.85, max(s.g, s.b));
		g += s * cy;
	}
	c += g * glow * 0.5;
	if (bloom_all > 0.0) {
		vec3 bb = vec3(0.0);
		for (int i = 0; i < 2; i++) {
			vec3 s = textureLod(scr, uv, 2.0 + float(i) * 1.5).rgb;
			float mx = max(s.r, max(s.g, s.b)); float mn = min(s.r, min(s.g, s.b));
			bb += s * smoothstep(0.35, 0.7, mx - mn) * smoothstep(0.6, 0.9, mx);
		}
		c += bb * bloom_all * 0.5;
	}
	float l = dot(c, vec3(0.3, 0.59, 0.11));
	c = mix(vec3(l), c, sat) * warm;
	c = mix(vec3(0.5), c, contrast);
	c += lift * (1.0 - clamp(l, 0.0, 1.0)) * 4.0;
	// vignette
	vec2 v = (uv - vec2(0.5, 0.52)) * vec2(1.25, 1.0);
	c *= 1.0 - vignette * smoothstep(0.35, 0.85, length(v));
	COLOR = vec4(c, 1.0);
}
"""

func _init() -> void:
	name = "HD2D"
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var sm := ShaderMaterial.new()
	var sh := Shader.new(); sh.code = SHADER
	sm.shader = sh
	material = sm
