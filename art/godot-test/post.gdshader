shader_type canvas_item;
// tilt-shift (blur top/bottom), vignette, warm grade
uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
uniform float band_center = 0.64;
uniform float band_half = 0.2;
uniform float max_lod = 1.8;
uniform float vignette = 0.55;
uniform bool enabled = true;
void fragment() {
	vec2 uv = SCREEN_UV;
	vec3 c = texture(screen_tex, uv).rgb;
	if (enabled) {
		float d = max(abs(uv.y - band_center) - band_half, 0.0);
		float lod = clamp(d * 6.0, 0.0, 1.0) * max_lod;
		c = textureLod(screen_tex, uv, lod).rgb;
		vec2 v = (uv - 0.5) * vec2(1.25, 1.0);
		c *= mix(1.0, smoothstep(0.85, 0.25, length(v)), vignette);
		c = mix(c, c * vec3(1.05, 0.99, 0.92), 0.6);
	}
	COLOR = vec4(c, 1.0);
}
