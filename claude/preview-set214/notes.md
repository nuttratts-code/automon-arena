# Set 214 — find-cause: the 3D floor looked white (art-look)

Probe: `fogprobe.gd.txt` (copy to godot/tests/zz_fogprobe.gd, run with the shots command line + `-- <outdir> [dark]`, delete after). Bare stage, battle pose, 1366×768, gl_compatibility, pixel colours sampled on plaza / tiles / grass.

| Test (light theme) | plaza RGB | far grass RGB |
|---|---|---|
| as shipped (sun 1.15 + shadows, exp fog 0.012) | 255,255,255 | 255,255,255 |
| fog off | 255,255,255 | 207,255,175 |
| fog off, sun 0 | 105,144,155 | 67,134,93 |
| fog off, sun shadows off | 205,205,193 | 155,197,126 |
| ambient_light_energy 0 (any case) | no change | no change |

Causes (with evidence):
1. **Main: shadowed sun 3–5× too bright.** Same sun, shadows on vs off, linear tonemap: the added light is not linear in energy (0.1 → +0.043, 0.2 → +0.073) and equals sRGB-space addition exactly (far grass: base 41,84,64 + sRGB(linear add of the unshadowed light) = 87,139,89; measured 87,140,88). Glow on and HDR 2D on: no change. So in this renderer the shadow pass adds light in the wrong colour space.
2. **Fog counted from the camera.** Camera is 20–36 units from the board, so exp density 0.012 put ~30 % near-white haze on the board and on the sprites (they are unshaded but still fogged — see claude/preview-set213/R2-1366x768-light-prep-late.png: washed units).
3. **Dead knob:** with AMBIENT_SOURCE_SKY, ambient_light_energy (0.55 / 0.8) changed nothing; the blue-grey cast on stone comes from the sky ambient (real knob = ambient_light_sky_contribution).

Fix (godot/scripts/ui/stage3d.gd): sun.shadow_enabled = false (units keep blob shadows) · fog_mode DEPTH, begin 34, end 110, density 0.6 (haze only behind the board) · dead ambient line removed. Look values (sun 1.15, pale stone colours) unchanged = owner Gate 2.

Not fixed (out of scope): black blocks beside some sprites are inside the placeholder sprite pictures (they were grey under the fog before), not cast shadows.
