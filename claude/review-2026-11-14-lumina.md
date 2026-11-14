# Review 2026-11-14 — Luminati (gitlab stubborn-hug/lumina) vs the set 217 arena (ideas only)

Source: gitlab.com/stubborn-hug/lumina. It is an HD-2D engine for three.js r186 (plain JS, WebGL 2), MIT licence (© 2026 Luminati), 5 commits, last commit 5 Nov 2026. Every asset is generated in code at runtime. I made a shallow clone in the scratchpad and read only docs/architecture/RENDER_PIPELINE.md §1, §5, §7, §8.1–8.3, plus one screenshot (cinderwatch-ruins-fight). The docs total ~490 KB, so the rest is unread.

**Licence:** MIT allows reuse with credit. But it is three.js/JavaScript, so nothing drops into Godot as it is. Any port is our own GDScript/shader written from the ideas. If a formula is ported closely, record source + licence + credit (HARD RULE 9 part 2) and get the owner's OK first.

**Quality seen:** the battle screenshot is very close to our target look. It has pixel-art textures on 3D blocks at the same pixel density as the sprites, dense pixel grass tufts, warm golden light, a blurred foreground band, a campfire glow that lights the set, and small floating embers.

## Ideas and how they compare with ours

| # | Luminati | Ours (set 217) | Use |
|---|---|---|---|
| 1 | Sprites cast full-silhouette shadows. A hidden shadow copy of each sprite turns to face the sun and uses the current frame with alpha test, so a billboard never shadows itself. A soft blob under the feet adds contact darkness | Shadow cards under stones (R19 L2). Real sun shadows wait on the set 214 web-brightness bug | P2/P4, after the set 214 fix: sprite shadow copy turned to the sun · until then, blob only (gap item 12) |
| 2 | DOF keeps **in-focus pixels pixel-exact**. It combines depth blur with a screen tilt band, and a small extra blur keeps the edge of the focus band gradual | Screen-only tilt band on mipmaps (s217_hd2d.gd). Owner said "too much blur" (R20) | P4: check that the sharp band is exactly unchanged (no mip sampling at all inside the band) · consider a gentler ramp at the band edge. Matches the player complaint "everything off-centre is blurred" |
| 3 | Fog colour = the sky's horizon colour, so far ground melts into the sky. The first (camera distance − 7) units have no fog | Fog depth 15→260, light fog #a9bccd (P1t) | P4: set the fog colour from the far sky card's horizon colour |
| 4 | Bloom only above a threshold, with a soft knee and a brightness clamp so single hot pixels can't flicker. The wider glow is tinted warm | Rune bloom from mips (R19) | P4: clamp the brightest value in our bloom so specks don't flicker |
| 5 | Grade: white balance, contrast, saturation, and **split toning** (one tint for shadows, one for highlights) | Warm grade + vignette (R19) | P4 gap item 17: split toning gives "warm highlights + cool shadows" in one pass, cheaper than a lilac ambient |
| 6 | Embers / glow particles use colours > 1 so they bloom. The campfire point light lights the set | Pollen motes. Phase 5 item 21 (light flash per effect) | P5: skill VFX glow through bloom + a short point light (already in the plan, confirmed) |
| 7 | "Warm-up": every shader compiles at load, so no stutter in play | Not in our plan | **New for P7:** in gl_compatibility each new material compiles on first sight. Show each VFX/material once behind the loading screen |
| 8 | God-ray quads following the sun | art-style §8 bans big light shafts | Skip |
| 9 | Pixel textures on 3D blocks at the sprites' density + dense pixel grass tufts | R19 "pixel textures at sprite density" point; grass removed R21 waiting for owner art | Screenshot confirms the direction. Good reference for the owner's new grass picture (phase 3 item 13) |

## Takeaways tagged to the gaps phases
- P2: blob foot shadow now · sun-facing sprite shadow copy only after the set 214 fix.
- P4: pixel-exact sharp band + gentler band edge · fog colour = sky horizon · bloom clamp · split toning for item 17.
- P5: emissive VFX + short point light (already planned).
- P7: shader warm-up at load (new).

Security line: the clone stays in the scratchpad and is never committed or shipped. No code was copied.
