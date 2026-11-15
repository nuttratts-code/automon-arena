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
