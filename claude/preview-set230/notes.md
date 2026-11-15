# Set 230 — plaza texture 4096 / 2048 in the arena (sample only, scratch Godot copy from set 229)

Scratch copy: `%TEMP%/claude/6778d44212994c0a/e44da554-341a-472f-839e-ef20a29a07a0/scratchpad/g` (same as set 229). Godot exe moved to `Documents/GitHub/Godot_v4.7.2-stable_win64.exe/` (shot.sh fixed).

## What was done
- Pulled albedo + normal (4096, RGB) out of `art/library/3d/originals/plaza_hunyuan_2026-11-14_766336cf.glb` → `plaza_O4096`, `plaza_ON4096`, LANCZOS 2048 copies. Same mesh/UVs as the arena plaza (150,000 indices), so a texture swap is enough.
- Same colour transfer as set 229 plaza_T1 (YCbCr mean/std, re-derived from 1024 src → T1, error 0.5/255) → `plaza_T4096`, `plaza_T2048`.
- `s226.gd.txt`: `ptex` now loads with mipmaps + anisotropic filter (`--e:pmip=0` = old way), new `--e:pnor=<file>` swaps the plaza normal map.
- Shots: current best args + `ptex=plaza_T1 / T2048 / T4096 / T4096 + pnor=plaza_ON4096` → `s230-plaza-res-1to1.png` (1:1 crops).

## Result
- Edge sharpness on the plaza (mean pixel step): 1024 9.99 · 2048 10.72 · 4096 10.92 · 4096+normal 11.05 (stones 6.5, in the blur band). Plaza colour unchanged (129,108,79).
- Cause: the Hunyuan texture is painted soft — 4096 vs 1024 differs by only 1.46/255 on average (contrast std 35.9). More pixels do not add detail; texel density (set 229 item 6) was a real gap but not the visible one.
- So: 4096 ≈ 2048 ≈ 1024 on screen. If kept, 2048 is enough (cost ×4 memory of 1024, 4096 = ×16 for no gain).

## Next (owner picks)
A2 detail overlay (pillar-stone detail tiled ~1 m on the plaza, `detail_*` on StandardMaterial3D) · or repaint/regenerate the plaza texture with more grain · then colour pass.

## Why the plaza looks yellow (owner asked, same chat)
- Cause = the set 229 "best" tint `--e:plaza=0.72,0.6,0.38`: blue ×0.38 vs red ×0.72 → plaza R/B 1.63 (stones R/B 1.04). The texture itself is a grey stone (untinted R/B 1.20).
- Shots `s230-plaza-tint.png`: 1 current tint · 2 no tint (1,1,1) · 3 light warm grey (0.75,0.73,0.68, R/B 1.23). Owner picks.
- **Owner pick: 3** → current best args now `S229_SMOOTH=1 … --e:lod=1.2 --e:stone_tone=0.88,0.86,0.8 --e:pzn=1 --e:ptex=plaza_T2048 --e:plaza=0.75,0.73,0.68` (2048 = same look as 4096, ¼ memory).

## How FF Resonance builds its floor (skill hd-2d-ref, lighting-and-materials §3–4 · numbers only, no assets)
- One master material for floor AND rocks/cliffs (Basecolor_Base family) → ground and stones share one colour family by construction.
- Layers: Base texture tiled by `Base_Scale` (0.02 far ground · 0.1 outer ground · 1.0 rocks) · vertex colour R = dirt path layer · G = stone/cliff layer · Top layer world-aligned (grass on up-facing faces, dirt patches on grass) masked by slope + a noise texture · `Brightness` multiplier (0.5 cliffs · 0.6 far ground).
- Textures are 256–1024, smooth (not pixel); detail comes from tiling, not from one big unique texture. Path colour in a screenshot = (179,163,123) warm beige; whole picture paler/softer, cool shadows.
- For Automon: plaza = one unique Hunyuan texture (soft, 25 px/m) vs stones with their own textures → explains both the soft look and the colour gap. FFR-style fix = A2+: a tiled stone detail layer (world-aligned, ~1 m) + a shared moss/grass Top layer (noise mask) on BOTH plaza and stones, same Brightness family.

## FF Re-style floor sample (owner: "Make the sample")
- Own code only: `s230_floor.gdshader.txt` → `<g>/tests/s230_floor.gdshader` (import before shots, trap 1). `s226.gd` `--e:ffr=1` swaps plaza + Stone*/Fallen*/Rock* (15 meshes) to it: base texture × tint · world-aligned triplanar detail (`dsc` m per tile, `damt`) · moss on up-facing faces masked by world noise (`mamt`, `mcut`, `msc`, `mcol`, `mstone=0`) · `bri`.
- Detail source: `--e:dnoise=1` = FastNoiseLite grain (`dcell=1` cellular, 0 = smooth mottling, `dfreq`), no picture, no repeat. Without it = high-pass crop of the fallen-stone atlas (`tests/s225/det_stone.png`) → reads as a grid even after rot/flip averaging (D) — dropped.
- Sheet `s230-ffr-floor.png`: A tint 3 only · B `dnoise=1 damt=0.35 dsc=2` · C `dnoise=1 dcell=0 damt=0.5 dsc=2 mamt=0.7 mcut=0.5` · D picture detail. Owner picks.
- Rendered plaza mean colour barely moves (A 133,125,109 → B/C ~126,123,103); the change is texture, not colour.
- **Owner: B/C "worse than before"** → layered noise detail rejected. Owner asked what a full FF Re floor would need.

## Full FF Re floor = what changes (answer to owner, hd-2d-ref scene-anatomy §3 arena 01Gra_67 + lighting §3–4)
1. Floor = one big ground mesh + layered material from small TILEABLE painted textures (256–1024: flagstone · dirt · grass/moss) mixed by a painted mask (vertex colour), not one unique AI texture (our plaza_hy).
2. Loose stones/gravel = separate small meshes on top (arena: templestone ×27, gravel ×22), same master material family as floor + rocks.
3. Baked light (lightmap + sun shadow bake, all 234 pieces) = contact shade under every stone/rock → ties them to the floor. We have none (Compatibility: no live sun shadows; LightmapGI bake in Compatibility = to verify).
4. Grass layer on top of rocks + grass cards at bases; paler, softer grade, cool shadows.
- Needs: owner tileable textures (Gemini "seamless tileable" or CC0 with OK, HARD RULE 9 ②) · Blender ground mesh + mask paint · bake test · rule-change art-style §8 (set 217 plaza_hy + hand-placed stones, set 226 plaza tone).
- Why the noise sample failed: FF Re detail comes from painted tile textures with real stone shapes; one-scale noise reads as dirt/static.

## Full FF Re rebuild — round 1 (owner A2 CC0 · B2 free flagstones · C1 keep stones · D1; art-style V2.2, plan-set230.md)
- CC0 picks (Poly Haven, CC0, licence page checked; owner OK to download): `grey_stone_path` (Amal Kumar, 1.8 m real size) + `mossy_rock` (Rob Tuytel, 3 m), 1k diff + nor_gl + rough PNG, md5 = API. Kept in scratch `cc0/` + `<g>/tests/s225/`, NOT in the repo. Credit + art/PROVENANCE.csv row when anything ships. Thumbnails were ~250 KB each (told owner 0.5 MB total — wrong estimate, said so).
- `--e:gnd=1` (s226.gd.txt `_s230_ground` + `s230_ground.gdshader.txt`): hides Plaza, adds a flat disc (CylinderMesh r = plaza box × `grs` 0.92 = 11.7 units) with world-xz flagstone (`gtile`, `gtint`), moss by joint luminance (linear `jlo` 0.03 / `jhi` 0.065) + noise patches (`pamt`, `pcut`) + rim band (`gedge`); stones keep own textures + same moss on up faces (`smoss`, `mtint`).
- Scale: scene units ≠ metres — real-size tile 1.8 gives pebble-size slabs; `gtile=8` ≈ old slab size. mossy_rock is mostly grey lichen rock → needs `mtint` green (1.9 = neon, 0.9,1.6,0.5 ok).
- Sheet `s230-cc0-ground.png`: A now · B `gtile=8 gtint=1.25,1.22,1.15` · C B + `mtint=0.9,1.6,0.5 jamt=1 jhi=0.09 pamt=0.3 gedge=0.78 smoss=0.6 gbri=1.1`.
- Own read: photo flagstones read realistic next to painted stones/creatures; moss lands as scattered patches, not in joints (luminance mask catches dark spots). Not done yet: plan step 4 baked contact shade, grass cards at rim.

## Round 2 — owner "C, then bake shadows"
- Moss into joints: `tests/s225/gsp_joint.png` made from the CC0 diffuse (darker than a 20 px blur by > 14 levels, median 5, wrap-tiled → seamless, 5 % coverage); shader `use_joint_tex` (`--e:jtex=1 --e:jlo=0.2 --e:jhi=0.6`). Works — moss now follows the joints.
- "Bake" (`--e:shade=1`, `_s230_shade`): rasterises all Stone/Fallen/Rock mesh vertices (84k) into a 512² height grid over ±26 units, casts along the sun direction (length = h / tan elevation) + blurred footprint AO → one blend_mul plane at y 0.02 over plaza + grass; hides the set 226 `Shadow*` cards (`--e:skeep=1` keeps them). Args `shd` `sao` `saor` `sblur` `sres` `sext`. Godot LightmapGI not tried (bake needs the editor + a RenderingDevice; this CPU map works in Compatibility for sure).
- Sheet `s230-bake.png`: C round 1 · C2 `shd 0.45 sao 0.55` · C3 `shd 0.55 sao 0.8 saor 14` · C4 = C3 + `sunel=27` (FF Re arena sun pitch −27°). Base args: notes round 1 C + `jtex=1 jlo=0.2 jhi=0.6 jamt=1 pamt=0.15 gedge=0.85`.
- Own read / open: (1) the shadow behind the back fallen slab lands on its LEFT although the stones are lit from the left → check the map orientation (PlaneMesh UV vs grid z, or the light direction sign) with find-cause before the next round · (2) joint moss reads neon at 1:1 → lower `mtint` green · (3) most shadows fall away from the camera, so the bake shows little; FF Re's sun (yaw 75) would need an owner pick on sun direction.

## Round 3 (set 231) — shadow direction find-cause + calmer moss
- Base args now in `shot231.sh.txt` (= shot.sh look G + best args + round 1 C + joint moss; copy to `<scratch>/tools/`).
- Repro: `--e:sdbg=1` (new) paints the shade map red = stone footprint, blue = sun shadow. Footprints sit under the stones, shadows run to the RIGHT/away (sun travels +x, base `sunel=32 sunaz=-55`, map top view checked, PlaneMesh UV checked: u = +x, v = +z).
- **Cause:** the shade plane sits at y 0.02 but the round-1 ground disc (`gnd=1`) tops out at y 0.31 → the depth test hides the whole map over the plaza; only the shadow TAILS that reach the grass showed. The dark patch "left of the back slab" = tail of the left pillars' long shadow, cut off from its pillar → read as a wrong-way shadow. Same trap as art-look §8d.4. Proof: `sy=0.34` makes the blue show on the plaza edge.
- **Fix:** `s230_ground.gdshader` samples the shade map by world xz (`use_shade`, `shade_tex`, `shade_ext`); `_s230_shade` hands it to `S230Ground` (`--e:sgnd=0` = old way) and measures height above the disc top inside the disc (shadow length no longer counts the 0.31 lift). Check: diff fix on/off = 13,170 px darker (mean −27) along the plaza's back-left edge = the pillar shadow, nothing else moved.
- **Moss:** `mtint 0.9,1.6,0.5` → moss mean (98,171,43) = neon. New `mtint=0.88,1.1,0.66` → (95,117,57) olive. Joint moss now quiet at 1:1 (may be too faint — owner says).
- Sheet `s231-shade-fix.png`: before (C4 old) · C2 · C3 · C4 (all new moss + fix) · 1:1 before/C4 · debug map · diff. Owner picks C2/C3/C4 + moss strength + sun direction (most stones stand at the back, so shadows falling away from the camera show little; a sun from the front-left would put shadows toward the camera).
- **Owner pick (set 231): C3** = `--e:shade=1 --e:shd=0.55 --e:sao=0.8 --e:saor=14` + `--e:mtint=0.88,1.1,0.66` on the shot231 base; sun stays at the base (`sunel=32 sunaz=-55`, no FF Re low sun); moss strength not commented → kept as is.

## Round 4 (set 231) — grass at the rim + stone bases (owner: "Grass at the edge")
- `--e:rg=1` (`_s231_grass`, needs `gnd=1`): tufts from the existing `art/s217/grass0-5` cards (own placeholder set) all round the ground disc edge (`rgn`, band `rgin`–`rgout` × radius, width `rgw0`–`rgw1`) + around each top-level Stone/Fallen/Rock footprint (`sgn` per stone, `sgw0`–`sgw1`), tint `rgt` 0.55,0.66,0.5. Seed 23101.
- Sheet `s231-rim-grass.png` (all on C3): C3 · G1 thin `rgn=80 sgn=4` · G2 medium (defaults: rgn 140, sgn 7) · G3 thick `rgn=260 rgout=1.12 rgw1=1.1 sgn=12 sgw1=1.0` · 1:1 C3 vs G2.
- Own read: G2 softens the hard plaza/grass line and ties the stones down; front rim sits under the foreground strip. Cards are unshaded (no baked shade on them) — fine at this size.

## Round 5 (set 231) — FF Re grass, done the FF way (owner: grass cards "look odd")
- FF Re grass re-checked from the extracted mesh (hd-2d-ref lighting-and-materials, new [DATA] block): grass003 = ~168 small blade cards in a low wide patch (4.3 × 6.4 × 0.72 m), leaning 10–40° from vertical in every direction, **normals all straight up** (lit like the ground → reads flat/painted), vertex colour 0 root / 1 tip, Brightness 1.4, Saturation 0.8, slow wind; one texture + 3 patch shapes instanced ~120×. Arena map 01Gra_67 lists no grass.
- Owner made 3 Gemini blade sheets (magenta bg, `Downloads/download (1).zip`) → keyed (`min(R,B)−G` alpha 30–110, despill) → `<g>/tests/s225/bladesA/B/C.png` (scratch only; into art/library only when the owner keeps them).
- `--e:pg=1` (`_s231_patches` + `s231_patch.gdshader`, own code): rim patches (`pgn`, size `pgr`, ragged ellipse along the rim) + one patch per stone footprint (`pgs`); per blade a quad showing a random ⅓ slice of a sheet, height `pgh`, density `pgd`; shader forces the normal up on both faces (cull_disabled flips back faces → black blades — found in p1), root darkening `pgroot`, wind `pgw`, baked shade map sampled by world xz.
- Sheet `s231-ffr-grass.png`: old G2 cards · C3 · H1 `pg=1 pgh=1.0 pgd=40 pgb=1.4 pgroot=0.7 pgt=0.95,1.2,0.75` (16 rim patches) · H2 = H1 + `pgn=10` · 1:1 G2 vs H1. Tried and dropped: pgh 1.4 (reads as a hedge), untinted (grey).

## Round 6 — flowers in the grass patches (set 231)
- Owner made 2 Gemini wildflower sheets (magenta bg, `Downloads/download (2).zip`, 20 stems). Keyed by colour distance to the sampled bg (not the grass keyer: its despill kills blue/lilac) → 19 stems packed into equal cells, bottom-aligned → `<g>/tests/s225/flowersA.png` (2774×374). Keyer: scratchpad `tools/key_flowers.py` (copy: key_flowers.py.txt).
- `_s231_patches` args: `pgf` chance of a flower per blade (0.06 ≈ 1 per 16 blades) · `pgfn` stems in the sheet (19) · `pgfh` height × pgh · `pgft` tint. Flowers lean ±12°, own mesh `S231Flowers%d`, same patch shader (root_dark 0.8).
- Sheet: s231-flowers.png (H1 / H2 + `--e:pgf=0.06`). Waiting for owner pick.
- **Owner pick (set 231): H1 + flowers** = C3 args + `--e:pg=1 --e:pgh=1.0 --e:pgd=40 --e:pgb=1.4 --e:pgroot=0.7 --e:pgt=0.95,1.2,0.75 --e:pgf=0.06`. Sheets stored in art/library/pictures/s231/ (INDEX rows).
- Stand-in units (owner, set 231 B2): 4 creature renders from ANOTHER game/web (owl shaman, winged brute, axe ogre, stone golem) = look stand-ins for arena samples ONLY — scratchpad, never commit, never ship (HARD RULE 9 part 2). Old sample units (beetle, lizard) kept, not used in new shots.
- Stand-in shot args: H1 args + `--e:ids=XO/XA/XD/XG/XA/XO --e:foe=XG/XD/XA/XO/XD/XG --e:hf=1`; `<g>/tests/s225/X?.png` = bbox crop, height 170/165/170/140 px (scratch only — the shot itself is never committed).

## Round 7 (set 232) — plan step 4c stand-in fit (owner A1)
- Ids: XO owl · XA axe ogre (red) · XD winged dragon (= the "winged brute", the flyer) · XG stone golem. Base args: `shot232.sh.txt` (= shot231 + C3 + H1 + flowers + stand-in ids; copy to `<scratch>/tools/`).
- ① `--e:fs=1` (`_s232_foot`): the stage blob mesh is resized to the sprite's own foot span (opaque columns in the lowest `fsb` 0.3 of the body, centred on their mean x, flip-aware) × `fsw` 0.9, depth `fsd` 0.32, dark `fsc` #10141c, alpha `fsa` 0.8, hard edge `fse` 0.25, shifted `fsx` 0.04 right (sun from the left). `--e:fly=XD:0.45` lifts that unit; its shadow stays on the ground, smaller (÷1+0.4h), lighter (÷1+0.9h), softer. `fsdbg=1` = red test. Found: old blob was there but too soft/pale to read.
- ② `--e:sm=1` (`_s232_sun`, on the picture before it becomes a texture): soft saturation cap (`smcap` / `smk`, global `smsat`) · light from screen-left `smdir` · darker feet `smao` · warm rim on the sun-side edge (`smrim`, `smrw` px, `smrc`) · floor colour bleed `smmix` toward `smmc` #8a8a78. Plus `stint`.
  - S2 = `smsat=0.85 smcap=0.3 smk=0.35 smdir=0.24 smao=0.3 smrim=0.35 stint=0.92,0.9,0.86`
  - S3 = `smsat=0.8 smcap=0.25 smk=0.3 smdir=0.3 smao=0.35 smrim=0.45 smrw=4 smmix=0.15 stint=0.9,0.88,0.84`
- Sheet (stand-ins → scratch only, never committed): before · F1 (`fs=1 fly=XD:0.45`) · S2 · S3 + zoom. Own read: F1 grounds every unit, flyer reads as flying; S3 calms the red ogre most; rim light barely shows at this size. Waiting for owner pick.
- ③ Note for owner art (Gemini prompts): creature main colour must contrast grey stone + green grass (stone golem disappears on the floor — avoid grey/olive bodies or add a bright accent colour); ask for light from the upper-left in every prompt; flyers drawn without a ground shadow (code adds it).
- **Owner pick (set 232): F1 + S2** = `--e:fs=1 --e:fly=XD:0.45 --e:sm=1 --e:smsat=0.85 --e:smcap=0.3 --e:smk=0.35 --e:smdir=0.24 --e:smao=0.3 --e:smrim=0.35 --e:stint=0.92,0.9,0.86` — now baked into `shot232.sh.txt` (the base for later shots).

## Round 8 (set 233) — old grass out + motion sample (owner: "แก้หญ้า ลบของเก่าทิ้ง … ภาพเคลื่อนไหว")
- Old grass removed from the shot: s217 tuft cards ring (`tufts=0`), corner cards (`fg=0`), front `grass_strip_front` (`fgs=0`, new switch in `_g`). Not touched: `scripts/ui/s217_grass.gd` (not in the shot path).
- New: `_s231_patches` takes `pgfar` patches in the old tuft ring (r `pgfr0`–`pgfr1` 14–21, height × `pgfarh`, flowers × `pgfarf` 0.3) + `pgfg` patches along the front edge (z `pgfgz` 7.6, height × `pgfgh`, flowers × `pgfgf` 0.4). Picked: pgfar 40 · pgfg 14 · pgfarh 1.0 · pgfgh 1.2 (1.5/1.6 = a wall of grass + flower carpet). Base args: `shot233.sh.txt`.
- `--e:anim=1 --frames N` (`_s233_anim`, own code) + `GDX="--fixed-fps 30"` (new hook in shot.sh): grass wind, pollen, units breathe from the feet, flyer hovers (shadow shrinks), one lunge every `beat` 0.9 s alternating sides, target flashes + shakes. 120 frames 1280×720 ≈ 53 s. Clip = stand-ins → scratch only, never committed.
- Waiting for owner: grass OK? → then plan step 5 ทำจริง.

## Round 9 (set 233) — owner A1 broken plaza edge + B1 rolling ground (owner: "ลานกลมเกินไป · พื้นหลังไม่เหมือนภูมิประเทศจริง")
- A1 `--e:rag=1` (s230_ground.gdshader `ragged`): disc mesh ×1.18, outline warped by low noise (`ragamp` 0.22), slabs drop out toward the rim (`raghole` 0.5), a few loose slabs past it (`ragloose` 0.18), moss/grime along the broken line. Discard = no side wall.
- B1 `--e:terr=1` (`_s233_terrain` + `s233_terrain.gdshader`, copy: s233_terrain.gdshader.txt; patch script patch233b.py.txt): th() = shelf at the rim (−0.04 → −0.15) + positive-only fbm mounds from 1.35× plaza r (`tamp`) + the old plateau drop; near mesh 110×90 m at 0.4 m grid + old far Ground on the same shader sunk 0.08. Colour: hollows darker/bluer, crests warmer (`thue`), dry patches (`tdry`), worn dirt ring under the broken edge + bare spots + dirt track toward the arch (`tdirt`, `tpath`). Grass patches sit on th() (GDScript copy `_s233_th` — change both).
- tamp 1.6 = mounds hidden by grass · 3.5 = real hill but hides the arch + back slab · **sample = 2.5**. Shots: before/after still + HD clip (stand-ins → scratch only).
- Waiting for owner: OK / taller-lower mounds / path more visible.

## Round 10 (set 233) — FF layout check + owner C1 / D1 / E1 / keep path
- FF Re field 00Com_60 (hd-2d-ref scene-anatomy): no plaza shape (fight on plain meadow, 0–10 m clear) · rim 8–20 m grass/flowers/small rocks · mid 13–40 m real trees + cliffs · 20–100 m land FALLS 5–17 m (plateau, ~35 % sky) · 140–220 m painted mountain cards in the world · sky dome 300 m. Ours: plaza disc fills the frame, mid layer empty, hills/sky = camera-fixed cards.
- Owner picks: **C1** land falls past the rim · **D1** broken edge + grass in the joints · **E1** mid rocks + low clumps · **path kept** (owner: no copyright problem; art-style §8 bans "meadow + big lit tree + stream + dirt path in the middle" — owner chose to keep this off-centre track, noted here).
- Code (patch233c.py.txt): `tfall` m drop between `tf0`–`tf1` (ellipse dr) replaces the old 60 m plateau term + far −40 m at 90–140 · `pgin` small low patches at 0.8–0.99 r · `pgmid` big low clumps 17–32 m (`pgm0/pgm1/pgmh`) · `rmid` owner rock/fallen-slab glbs on th() (`rm0/rm1`, `rmtone`). Near terrain mesh now 160×130 m.
- Shots: tfall 10 / tf 16–70 = endless flat plain up to the hills card (worse: the camera-fixed cards need the drop close) · tfall 8 / 19–32 = a green wall · **tfall 14 / 19–40 = plateau edge, hills + arch + sea back (sample)**. Mid rocks/clumps sit below the edge → hardly visible; next round could put them on the down-slope lip.
- Owner rule (set 233): sample rounds = HD stills only, no motion clips unless asked.

## Round 11 (set 233) — match the owner painting (rune ring on a hilltop, valley hills, arch on far hill) · owner G2 + H2
- Owner painting (Gemini, chat only, not stored): round irregular flagstone plaza flush with the meadow, stones in a ring at its edge, land falls into a valley, 2–3 hazy ridge layers, arch on a far hill, flowers + small rocks in front, ~40 % sky.
- **G2 lower camera** `--e:cpitch=7 --e:cpos=x,y,z` (`_s233_cam`: sprites re-lean to the new pitch, feet kept; re-applied before capture). K1 = (0,8,42) whole plaza in view, units ~0.7× on screen · K2 = (0,6,29.4) unit size as now, plaza front edge off screen. Both = rule change at ทำจริง (art-style §8 camera, set 217 A2 FOV 19.2/PITCH 14; test_ui pins).
- **H2 stones moved** `--e:ring=1` (`RING233` table in s226.gd, sample only, .tscn untouched; stage "Shadow"+name cards move along).
- Valley: `thill1/thill2` = two gaussian ridges at dr 95 / 190 m on the fallen ground (−30 m past 250–330), `thaze`/`thazec` haze toward distance; near Gemini hills card off, far card raised (`hc2y`); 3D arch off (`arch=0`, the card has one). Meadow: `tdirt=0 tpath=0` (painting has no dirt) · `rfront` small rocks · `pgfgf` more flowers. Code: patch233d.py.txt.
- Tried: hills as smoothstep bands (a green wall over the sky) · thill2 28–30 (a pale wall). Final args: `--e:rag=1 --e:terr=1 --e:tamp=1.0 --e:tfall=14 --e:tf0=19 --e:tf1=40 --e:pgin=26 --e:pgmid=24 --e:pgm0=17 --e:pgm1=32 --e:pgmh=1.3 --e:rmid=10 --e:rm0=18 --e:rm1=34 --e:ring=1 --e:thill1=15 --e:thill2=15 --e:thaze=0.8 --e:thazec=#8fb0cf --e:tdirt=0 --e:tpath=0 --e:rfront=10 --e:pgfgf=1.5 --e:fog=#9fb8cc --e:arch=0 --e:hc2y=30` + camera.
- Waiting for owner: K1 / K2 + tweaks.

## Round 12 (set 233) — owner picked K2, tune: J1 back row clear + J2 the "sea" band → hills
- Owner: K2 (unit size as now) · J1 + J2 · "the background looks like a sea in between" = the flat valley floor under heavy haze (thaze 0.8) read as water.
- Rule found: with the low camera the sky only shows above the hill crests, so every crest must sit BELOW the plateau (sky band ≈ 5° → crest at 200 m ≤ ~−9 m). Valley now deep: `tfall=30 tf0=19 tf1=55`; ridges inside it: `thill1=16` (95 m) · `thill3=19` (140 m, new) · `thill2=24` (190 m) · `tvroll=6` rolling floor (new, from 38 m); haze `thaze=0.5`; far mountain card `hc2y=14`. Tried first: ridges on a −14 m valley (q1) = a green wall over the whole sky.
- J1: `cpitch=8.5 cpos=0,6.8,29.4` (was 7 / 6.0) — right-side dragon now overlaps the back golem less; still some overlap (slot layout, not the camera alone).
- Args: `--e:rag=1 --e:terr=1 --e:tamp=1.0 --e:tfall=30 --e:tf0=19 --e:tf1=55 --e:pgin=26 --e:pgmid=24 --e:pgm0=17 --e:pgm1=32 --e:pgmh=1.3 --e:rmid=10 --e:rm0=18 --e:rm1=34 --e:ring=1 --e:thill1=16 --e:thill2=24 --e:thaze=0.5 --e:thazec=#8fb0cf --e:tdirt=0 --e:tpath=0 --e:rfront=10 --e:pgfgf=1.5 --e:fog=#9fb8cc --e:arch=0 --e:hc2y=14 --e:tvroll=6 --e:thill3=19 --e:cpitch=8.5 --e:cpos=0,6.8,29.4`. Shader copy updated (s233_terrain.gdshader.txt); GDScript mirror in s226.gd (`thill3`, `tvroll`).

## Round 13 (set 233) — sea in the valley (owner: "or make it a sea, looks nice" → W1 sea fills the valley)
- FF data (hd-2d-ref): 00Com_60 water001 = ONE flat mesh 35×95 m, ~59 m out, 4.8 m below the field, far left beside cliffs [DATA]; its material instance is empty (open question 15) → look is ours [APPROX].
- `--e:wl=<y>` (`_s233_water`, patch233f.py.txt): flat 800×520 sheet; shader = terrain shader's uniforms + th() (cut from its code, so the shore follows the same ground) + unshaded fresnel deep→sky colour, slow 2-noise ripples, sparkles, light shoreline (`shore_w` 2.2 m depth); colours `wdeep` `wskyc` `wshore_c`. Note: art-style §8 bans a "stream" in the meadow — a sea/bay is not that; flagged to owner.
- Level: −21 hidden behind the crests · −15 = only a white strip at the horizon · **−10 = bay below the plateau + the 140 m ridge as a long island + open sea (sample)**; first colours too white (grazing fresnel + fog) → deep #1d5672, sky #7fa8c6.
- Args: `--e:rag=1 --e:terr=1 --e:tamp=1.0 --e:tfall=30 --e:tf0=19 --e:tf1=55 --e:pgin=26 --e:pgmid=24 --e:pgm0=17 --e:pgm1=32 --e:pgmh=1.3 --e:rmid=10 --e:rm0=18 --e:rm1=34 --e:ring=1 --e:thill1=16 --e:thill2=24 --e:thaze=0.5 --e:thazec=#8fb0cf --e:tdirt=0 --e:tpath=0 --e:rfront=10 --e:pgfgf=1.5 --e:fog=#9fb8cc --e:arch=0 --e:hc2y=14 --e:tvroll=6 --e:thill3=19 --e:cpitch=8.5 --e:cpos=0,6.8,29.4 --e:wl=-10 --e:wskyc=#7fa8c6 --e:wdeep=#1d5672 --e:wshore_c=#b9cfc2`.

## Round 14 (set 233) — sea like the owner's round-11 K2 screenshot ("make the sea like this picture")
- The pale band in that screenshot was the hazy far ridge (thill2) over a shallow valley, not water. Rebuilt it as real water: round-11 shallow valley (`tfall=14 tf0=19 tf1=40`, `thill1=15`, `thill2=0`) + sea `wl=-9` → one calm band behind the green ridge, mountains card behind.
- Colour trap: on this far, grazing band fog + tonemap lift the water a lot (debug all-red water showed pink) → light colours (#9fbccb / #d3e3e8) render pure white. Use darker inputs: `wskyc=#4f7f96 wdeep=#365e72 wshore_c=#a9c4bf` → pale grey-blue on screen.
- Args: round-11 args (r11 list above) with `--e:thill2=0 --e:cpitch=8.5 --e:cpos=0,6.8,29.4 --e:wl=-9 --e:wskyc=#4f7f96 --e:wdeep=#365e72 --e:wshore_c=#a9c4bf`.

## Round 15 (set 233) — owner FF screenshot (stream with white rapids + meadow): A2 waterfall into the sea · B2 plaza joined to a natural meadow
- Conflict flagged first: the screenshot = meadow + big tree with light shafts + winding stream + dirt path = exactly the art-style §8 ban (set 132, 7 Nov). Owner picked A2 (our own water: a waterfall) instead of changing §8.
- A2 `--e:wfall=<x>` (`_s233_fall`, patch233g/h.py.txt): owner rock `rock_cliff_hy.glb` as a sea cliff + scrolling streak sheet + foam on the water + mist card [APPROX]. Placement: the plateau's own edge is hidden from the camera, and the first shore found (near side of the 95 m ridge) put the cliff on grass in front of the sea → the scan now skips past the ridge into the VISIBLE sea (`wfoff` m further). Sample: `wfall=-26 wfh=14 wfrx=0.9 wfw=3.6 wfoff=35 wffront=1.0` → cliff + fall left of the back-left stone.
- B2 why "two different places": cool grey plaza vs saturated yellow-green lawn, hard seam at the rim, lawn too smooth, different contrast. Fix: plaza tint warmer `ptint=1.3,1.2,1.02` (was gtint 1.25,1.22,1.15 — note `ptint` is a multiplier on the stone texture, values < 1 go dark/green) · meadow `teal=0.12 tgrade=0.94,0.92,0.84` (new shared grade) + `tclump=0.8` (new dark/light clumps) + `tdry=0.7` · dirt ring back `tdirt=1` · more joint grass `pgin=60 pginh=0.6` · more mid clumps `pgmid=60`. Tried `pamt=0.38/0.5` = plaza goes swampy dark; keep 0.22.
- Args: tools r15_args.txt = round-14 args + `--e:tdirt=1 --e:tdry=0.7 --e:teal=0.12 --e:tclump=0.8 --e:tgrade=0.94,0.92,0.84 --e:ptint=1.3,1.2,1.02 --e:pamt=0.22 --e:pgin=60 --e:pginh=0.6 --e:pgmid=60 --e:wfall=-26 --e:wfh=14 --e:wfrx=0.9 --e:wfw=3.6 --e:wfoff=35 --e:wffront=1.0`.

## Round 16 (set 234) — owner: waterfall out (A3) + sea "sparkly like this picture" + B1 bluer sea · C3 plaza kept · D1 light shaft kept
- Owner ref = other-game screenshot of a stream with bright white flecks (scratch only, never committed). Borrowed only the water-surface glint, not the stream (art-style §8 ban stays).
- Waterfall: all `--e:wf*` args dropped (code `_s233_fall` kept, off). Sea colours `wdeep=#245c80 wskyc=#3f84ab`.
- New glints in WATER233 (s226.gd): `glit` strength · `gsx`/`gsz` cell scale across/along the view (z smaller = flecks stretched sideways like sun glitter) · `gthr` threshold on the product of two moving value noises, × (0.4 + 0.6 fresnel). Tried: gsx 0.7 / gsz 0.18 / gthr 0.55 = big white blobs like snow patches · **gsx 3 / gsz 0.9 / gthr 0.75 / glit 1.4 = fine flecks (sample b)** · gsx 5 / gsz 1.5 / gthr 0.85 / glit 1.8 = finer, denser (c, offered as alt).
- Args: r16_args.txt (round-15 list minus wf*, + sea colours + glints). Waiting for owner: b / c / tweaks → then ทำจริง.

## Round 17 (set 234) — owner AI picture (Gemini-style render of our clean shot: empty plaza, thick grass ring, warm light, low mist) as target · owner A1 whole picture · B1 rocks + low bushes on the empty back slope · C1 plaza warm beige like the picture
- Clean shot for the owner's AI: new `--e:noui=1` (hides CanvasLayers, Labels/Buttons, Control backgrounds outside the 3D view) · `--e:nounits=1` (unit sprites + shadows + small foot-shadow planes) · `--e:pg=0` = no grass. AI picture = chat only (scratch), not stored.
- Height profile behind the plaza (debug print, z = −d): 20 m −0.1 · 30 −5.2 · 40–60 ≈ −13 (bay, hidden by the plateau edge) · 80 −5.4 · 90–100 ≈ −1.5 (ridge face = the visible "empty slope") · 120+ < −9 = open sea. So back-slope props go at 74–92 m; anything at 55–70 m is hidden, past 100 m it sits on the sea like floating islands.
- Grass ring: `pgin=130 pginh=1.1 pgfar=90 pgfr0=12.5 pgfr1=18 pgfarh=1.3 pgfarf=0.15 pgfg=24 pgfgh=1.4`. Back slope: `pgmid=50 pgm0=74 pgm1=92 pgmh=1.8` (3.0 = floating grass mats) + `rmid=24 rm0=74 rm1=92 rmonly=1 rmsc=0.9 rmsy=0.45` (new: rmonly drops the boxy fallen slabs, rmsc/rmsy scale + flatten).
- Mist (`_s234_mist`, MIST234 shader, new): `mist=9 mista=0.7 mz0=30 mz1=60 mx0=15 mx1=90 mty=-1.5 mh=0.9 mistw=1.3` = banks rising out of the bay on the right; on the ridge at th() they sat above the crest (red debug showed big blobs in the sky).
- Light/plaza: `sunc=#ffd59a sun=1.3 fog=#c4cbbd ptint=1.38,1.27,1.06 pamt=0.1`. Plaza now a bit orange vs the picture's grey-beige — next tweak if the owner wants.
- Args: r17_args.txt (clean = with noui/nounits; drop both for the game view). Waiting for owner: OK / tweaks → ทำจริง.

## Round 18 (set 234) — owner: "not alike at all — match the picture first, add extras later"
- All round-17 extras off: back-slope rocks/bushes (`rmid=0 pgmid=0`), front rocks (`rfront=0`), every flower (`pgf=0 pgfarf=0 pgfgf=0`).
- Match moves: grass deeper green + taller (`pgt=0.74,1.05,0.48 pgb=1.25 pgfarh=1.7 pginh=1.4`) · front grass only at the two bottom corners (new `pgfgx` = skip front patches with |x| < it: `pgfg=40 pgfgx=5 pgfgh=1.9 pgfgz=7.0`) · plaza grey-beige + brighter (`ptint=1.16,1.13,1.07 gbri=1.18`) · fog `#c9cab8` · mist on the right slope only (`mist=8 mista=0.45 mz0=74 mz1=95 mx0=4 mx1=30 mty=-3 mistw=1.4`).
- Camera kept K2: the AI picture's stones, ring line and horizon land on the same screen rows as our K2 shot; a pulled-back camera (0,8,38 / pitch 10) was clearly worse. Width trap: at ~100 m the view is only ~±30 m wide, so mist at x 25–90 was off screen.
- Still different from the picture: AI flagstones bigger with crisper joints · warmer orange clouds · AI mist softer and wider · fallen rune slab hidden in our grass.
- Tool: cmp234.sh.txt (render + stack the AI ref over our shot). Args: r18_args.txt.

## Round 19 (set 234) — owner: "grass a bit lower"
- Ring/joint/corner grass ~25 % lower: `pgfarh=1.25 pginh=1.0 pgfgh=1.45` (was 1.7 / 1.4 / 1.9). The fallen rune slab on the right shows again. Args: r19_args.txt (= r18 + these).

## Round 20 (set 234) — owner: "lower again"
- `pgfarh=0.9 pginh=0.7 pgfgh=1.05` (~half of round 18). Ring now a low lawn edge; stones stand clear. Args: r20_args.txt.

## Round 21 (set 234) — owner: "does the grass look floating?" → yes → F1 plaza ends under the grass
- Cause (1:1 crop): front corner patches stood on the flagstones with a straight bottom edge and nothing under them; back joint tufts stood on slab faces.
- F1 `--e:gmask=1` (`_s234_gmask` in s226.gd + `use_gmask` in s230_ground.gdshader): 512² top-down mask (±`gmext` 16 m) of every grass patch within 1.3 r of the plaza (ellipse × `gmk`, soft edge) → plaza shader: noise + joints break the cut, inside = soil (`gmsoil` #33261a, mossy speckle), a dirty slab rim just outside. Picked `gmk=1.5 gmcut=0.4` (gmk 1.0 = tufts still on slabs). Roots darker `pgroot=0.85`.
- Bare soil now shows a bit past the corner grass — reads as worn earth; shrink with gmk 1.2–1.3 if the owner wants less.
- Args: r21_args.txt (= r20 + gmask). Shader copy: s230_ground.gdshader.txt.

## Round 22 (set 234) — owner: round 21 soil "not pretty at all — try shadow" (= F2)
- Same mask, new mode `--e:gmsh=<k>` (`gm_shadow` in s230_ground.gdshader): slabs stay, ALBEDO × (1 − k·smoothstep(0, 0.9, mask)) = soft dark contact shade under every patch, no soil, no broken slab rim. Picked `gmk=1.25 gmsh=0.55` + `pgroot=0.85`. gmsh = 0 falls back to the round-21 soil mode.
- Args: r22_args.txt.

## Round 23 (set 234) — owner: round 22 shadow "pretty"; front clumps should grow along the stone joints, not as a blob
- `--e:pgcrack=1`: front corner patches spread wider (`pgcs`), each blade tries `pgct` spots and is kept only where the plaza joint mask (tests/s225/gsp_joint.png, tiled by `gtile` 1.8 like the shader) is > `pgcj`; density × `pgcd`. Those patches skip the shadow mask (the dark joint is the root).
- Trap (find-cause): first tries sampled one pixel for every blade — GDScript `posmod` is integer-only and floored p/tile to 0; use `fposmod`. Also `_s230_tex(..).get_image()` is fine but the direct PNG load is simpler.
- Variants: **a** `pgcj=0.3 pgcs=2.0 pgcd=0.6 pgct=10` = fuller tufts in the cracks · **b** `pgcs=2.4 pgcd=0.4 pgct=6 pgfgh=0.9` = sparse sprigs. r23_args.txt = a. Waiting for owner pick.

## Round 24 (set 234) — owner: crack grass "many from the edge, fewer and fewer inward"
- Each crack blade (after the joint test) is kept with prob lerp(1, `pgcmin`, inn) and its height × lerp(1, `pgch`, inn). First `inn` = distance inside the plaza rim (`pgcf`) → wrong: the front corners sit 2–4 m inside the rim, so everything thinned. Now `pgcxo` set → inn by screen side: dense at |x| ≥ `pgcxo` (frame edge ≈ ±6.6 m at the front row z 7), sparse by |x| = `pgcxi`. Front patches allowed from |x| 3 (`pgfgx=3.0`).
- **a** `pgcs=2.0 pgcd=1.6 pgcxo=6.5 pgcxi=2.5 pgcmin=0.05 pgch=0.5` = short fade · **b** `pgcd=2.2 pgcxo=7.0 pgcxi=1.5 pgcmin=0.1 pgch=0.45` = longer fade reaching further in. Args: r24a_args.txt / r24b_args.txt. Waiting for owner pick.

## Round 25 (set 235) — owner picked r24 **b** (long fade); A1 = close the remaining gaps vs the AI picture
- Bigger flagstones: `gtile=11` (was 8; 12 slightly too big). Crack grass follows the same tile (jtile = gtile), so fewer joints → `pgcd=3.0` to keep the corner density.
- Warmer clouds: `sky=0.8,0.78,0.78` (tints the whole sky texture — 0.95,0.86,0.76 killed the blue; a clouds-only tint would need shader work).
- Clearer distance + softer mist: `thaze=0.3` (was 0.8) · `fogd=0.22` (was 0.35) · mist `mista=0.4 mistw=1.9 mh=1.2` (0.6/2.2 + mx0=0 = a white glow wall).
- Still different: AI sky deeper blue with brighter orange cloud tops · AI corner grass thicker (owner chose crack grass, kept) · sun glare on the sea a bit strong.
- Args: r25_args.txt. Waiting for owner: OK → extras back / tweaks.

## Round 26 (set 235) — owner: round 25 "looks odd" → picked A2 = front corner grass (small separate tufts stuck on the big slabs)
- Cause: bigger tiles (gtile 11) = fewer joints, so crack blades only landed in a few spots.
- Fix: joint test looser + more tries + wider + denser: `pgcj=0.2 pgct=16 pgcs=2.4 pgcd=4.5` → blades now run as lines along the joints, still dense at the frame edge, thinning inward (r24 b fade kept). Other odd spots offered (A1 blurry big slabs, A3 glare, A4 banded meadow) — owner did not pick them.
- Args: r26_args.txt.
