# Set 217 — ชิ้นงานที่ต้องเจน + คำสั่ง Gemini + ค่า Stable Fast 3D

โฟลว์: ภาพต้นฉบับ (ลานรูน) → **Gemini** แยกชิ้นตามรายการนี้ → ชิ้นที่ติด 🧊 นำไปเข้า **Stable Fast 3D** ส่วนชิ้นที่ติด 🖼 ใช้เป็นภาพแผ่น → วางไฟล์ตามชื่อที่กำหนด → Claude ประกอบใน Godot (`scenes/arena_dressing.tscn`) → คุณจัดตำแหน่งต่อ

## 0. วิธีใช้ (ทำทุกครั้ง)
- แนบ**ภาพต้นฉบับ**ไปกับคำสั่งทุกครั้ง แล้ววาง "คำสั่งกลาง" ตามด้วย "คำสั่งเฉพาะชิ้น"
- เจน**ทีละชิ้น ทีละภาพ** อย่าเจนหลายชิ้นในภาพเดียว เพราะต้องตัดแยกเอง และ Stable Fast 3D รับได้ครั้งละหนึ่งชิ้น
- ภาพที่ได้ควรเป็นสี่เหลี่ยมจัตุรัส ขนาด 1024 ขึ้นไป
- ถ้าภาพไหนออกมามีตัวอักษรจริง (F, P, R, ᚠ ฯลฯ) ให้เจนใหม่ (art-style §8)
- ตั้งชื่อไฟล์ตามคอลัมน์ "ไฟล์" แล้ววางใน `godot/art/s217/src/` (ภาพ) และ `godot/art/s217/3d/` (.glb)

### คำสั่งกลาง (ใช้กับทุกชิ้น)
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes,
warm afternoon daylight, muted natural colours, moss green and warm grey stone. Paint ONE single isolated object
only, centred, the whole object visible with empty margin around it, nothing cropped. No ground plane, no cast
shadow on the floor, no scenery, no text, no watermark. Light comes softly from the upper left; keep shadows
gentle (no black shadows). Any carved symbols must be invented abstract glyphs — NOT real runes, NOT Latin
letters or numbers.
```

### พื้นหลังของภาพ (ต่อท้ายคำสั่ง)
- ชิ้น 🧊 (หิน): `Background: plain flat light grey (#D0D0D0), no gradient.` (Stable Fast 3D ตัดพื้นหลังเรียบ ๆ ได้เอง)
- ชิ้น 🖼 สีเขียว (หญ้า/ดอกไม้): `Background: plain flat magenta (#FF00FF), no gradient, no magenta in the object.` (หญ้าเป็นสีเขียว จึงห้ามใช้พื้นหลังเขียว)
- ชิ้น 🖼 อื่น ๆ: `Background: plain flat pure green (#00FF00), no gradient.`

## 1. ชิ้น 3D 🧊 (Stable Fast 3D)
คำสั่งเพิ่มสำหรับทุกชิ้นในหมวดนี้: `Three-quarter front view from slightly above (about 20°), as a 3D model reference: clear silhouette, readable form on all visible sides.`

| # | ไฟล์ | คำสั่งเฉพาะชิ้น |
|---|---|---|
| 1 | stone_a_tall | `A tall slender standing stone (menhir), about 4 times taller than wide, leaning slightly, sharp broken top, deep vertical cracks, moss on the lower third. Three glowing pale-cyan invented glyphs carved in a vertical line on the front face.` |
| 2 | stone_b_round | `A wide rounded standing stone, egg-shaped, about 2 times taller than wide, heavy moss on the bottom half, a cluster of small glowing pale-cyan invented glyphs on the front face.` |
| 3 | stone_c_slim | `A thin standing stone with a natural spiral twist along its height, pointed top, light lichen, a short row of glowing pale-cyan invented glyphs following the twist.` |
| 4 | stone_d_pillar | `A square-cut ancient stone pillar on a low square base, weathered edges, chipped corners, moss in the cracks, glowing pale-cyan invented glyphs on two faces.` |
| 5 | stone_e_short | `A short broken standing stone, only about 1.5 times taller than wide, jagged snapped top, moss and small grass at its foot, one large glowing pale-cyan invented glyph.` |
| 6 | stone_fallen | `A large flat stone slab lying tilted on the ground, one end resting on smaller rocks, cracked surface with moss, glowing pale-cyan invented glyphs along its top face.` |
| 7 | rune_block | `A small broken carved stone block, knee height, cube-like with a cracked corner, two glowing pale-cyan invented glyphs on the front, a little moss on top.` |
| 8 | boulder_big | `A big weathered boulder, rounded grey stone with flat layered faces, patches of moss and a few grass tufts growing in its cracks.` |
| 9 | rocks_small | `A small group of 3 to 5 loose grey rocks of different sizes touching each other, some moss.` |

**ค่า Stable Fast 3D (ทุกชิ้น)**
| ค่า | ชิ้น 1–6 | ชิ้น 7–9 |
|---|---|---|
| Foreground ratio | 0.85 | 0.85 |
| Remesh | Triangle | Triangle |
| Target vertex count | 3000 | 1500 |
| Texture size | 1024 | 512 |
| ไฟล์ที่ได้ | `.glb` ชื่อเดียวกับภาพ เช่น `stone_a_tall.glb` | |

รวมแล้วไม่ถึง 25k เหลี่ยม (ฉากชุด 215 มี 145k)

ตรวจผลก่อนส่ง: หมุนดูโมเดล ถ้าด้านหน้าบิดเบี้ยว มีรูโหว่ หรือพื้นหลังติดมาด้วย ให้กลับไปเจนภาพใหม่ หรือลด Foreground ratio เป็น 0.75 ส่วนด้านหลังเบลอได้ เพราะกล้องเกมไม่เห็น

## 2. ภาพแผ่น 🖼 (Gemini อย่างเดียว ไม่ต้องแปลง 3D)
| # | ไฟล์ | คำสั่งเฉพาะชิ้น | ใช้ทำอะไร |
|---|---|---|---|
| 10 | grass_a | `A dense clump of tall meadow grass, blades bending slightly, a few seed heads.` | กอหญ้า |
| 11 | grass_b | `A low wide patch of soft grass with small purple wildflowers.` | กอหญ้า |
| 12 | grass_c | `A clump of grass with yellow buttercup flowers.` | กอหญ้า |
| 13 | grass_d | `A clump of grass with tiny white flowers.` | กอหญ้า |
| 14 | grass_e | `A clump of tall dark-green and golden grass blades with wild oat seed heads.` | กอหญ้า |
| 15 | grass_front | `A wide horizontal strip of tall foreground grass and wildflowers (yellow, purple, white), 3 times wider than tall, blades reaching up at the top edge, bottom edge solid.` | แถบหญ้าหน้ากล้อง (ล่างสุดของจอ) |
| 16 | plaza_top | `Strictly top-down orthographic view (camera straight above) of an ancient circular flagstone plaza: concentric rings of worn pale stone slabs, thin moss and grass in the joints, a small round stone at the centre, a raised ring of edge stones. Perfect circle filling the square image edge to edge, evenly lit, no shadows, no perspective.` | ลายพื้นลาน (Claude ปูบนแผ่นกลมในเกม) |
| 17 | ground_tile | `Strictly top-down view of short meadow grass with tiny scattered wildflowers and a few small pebbles, evenly lit, no shadows. SEAMLESS TILEABLE texture: the left edge continues the right edge and the top edge continues the bottom edge. Fill the whole square, no background colour.` | พื้นหญ้ารอบลาน (ปูซ้ำได้) |
| 18 | backdrop_far | `Wide panorama 2:1 of distant layered green hills fading into blue mist, faraway blue mountains on the right, a small ruined stone arch on a hill slightly right of centre. No foreground flowers, no rocks at the bottom. The sky must be EMPTY plain pure green (#00FF00) so it can be removed.` | ฉากไกล (ใช้แทนภาพเนินเขาเดิม) |
| 19 | sky_clouds | `Wide panorama 2:1 of a bright blue sky with big soft cumulus clouds, warm pink-gold light on their edges, painterly. Sky only, no land.` (ไม่ต้องใส่คำสั่งพื้นหลัง) | ท้องฟ้า (Claude ทำให้เมฆเลื่อนช้า ๆ) |

## 3. สิ่งที่ไม่ต้องเจน (Claude ทำในเกม)
- แสงเรืองของรูน: Claude ทำให้สีฟ้าบนลายเรืองแสงเอง
- หมอก ฝุ่นแสงลอย เงาที่โคนหิน แสงอาทิตย์
- วงรูน 12 ช่องยืน (มีอยู่แล้ว)

## 4. ส่งงาน
- วางภาพใน `godot/art/s217/src/` และ `.glb` ใน `godot/art/s217/3d/` บน branch `ccr-882ceb4b-0ewtk1` แล้วให้แชทบน PC commit + push หรือแนบไฟล์มาในแชทนี้
- จด**เว็บที่ใช้แปลง 3D** และวันที่ไว้ด้วย เพราะต้องบันทึกใน `art/PROVENANCE.csv` (กฎความปลอดภัยข้อ ②) สัญญาอนุญาตของ Stable Fast 3D (ตามความจำของ Claude ซึ่งยังไม่ได้ตรวจ) ใช้ฟรีถ้ารายได้ต่อปีไม่เกิน 1 ล้านดอลลาร์ ให้เช็คเงื่อนไขของเว็บที่ใช้จริงด้วย
- จากนั้น Claude จะ: นำ .glb เข้า Godot · ใส่วัสดุ (แสงเรืองของรูน, แสงฉาก) · แทนแผ่นภาพใน `arena_dressing.tscn` ตามตำแหน่งเดิม · ปูลายพื้นลานกับพื้นหญ้า · ทำฉากไกลกับท้องฟ้า · ทำภาพตัวอย่าง R3 ให้ดู

## 5. v2 (12 พ.ย.) — ชิ้นหิน: ภาพ 5 มุมเพื่อให้ Claude ขึ้นรูปเองใน Blender (แทนหมวด 1 + Stable Fast 3D)
Claude สร้างรูปทรงจากเส้นขอบของภาพ 4 ด้าน แล้วแปะภาพลายจากทุกด้าน + ด้านบน (Blender, ไม่ใช้โปรแกรม AI 3D) · แสงต้อง**เท่ากันทุกทิศ** (ให้แสงในเกมทำหน้าที่แทน) · พื้นหลัง magenta (หินเป็นสีเทา ใช้พื้นเทาจะตัดยาก) · ไฟล์: `ชื่อชิ้น_front/right/back/left/top.png` → `godot/art/s217/src/`
คำสั่งที่ใช้อยู่ในแชท set 217 (ข้อความตอบล่าสุด) — หมวด 2 (หญ้า ลาน พื้น ฉากไกล ฟ้า) ยังใช้คำสั่งเดิม

## 6. v3 (13 พ.ย., R6) — เริ่มใหม่จากภาพต้นแบบ "ทุ่งหินรูน" (เจ้าของเลือก B1 · C1 · D1 · เรื่องมุมกล้องรอดูหลังได้ภาพครบ)
แนบ**ภาพต้นแบบทุ่งหินรูน**ทุกครั้ง แล้ววาง "คำสั่งกลาง" (หมวด 0) ตามด้วยคำสั่งเฉพาะชิ้น · เจนทีละชิ้น ทีละภาพ · ถ้ามีตัวอักษรจริงปนออกมา ให้เจนใหม่

### 6.1 หิน 🧊 → Hunyuan3D (6 ชิ้น)
ต่อท้ายทุกชิ้น: `Three-quarter front view from slightly above (about 20°). Even soft light from all sides, no strong shadows. Background: plain flat white, no gradient.`
ใช้คำสั่งของชิ้นที่ 1–6 จากหมวด 1 (stone_a_tall · stone_b_round · stone_c_slim · stone_d_pillar · stone_e_short · stone_fallen) โดยตั้งค่า Hunyuan3D แบบเดียวกับก้อนที่ทำไปแล้ว ส่งไฟล์ .glb มาได้เลย Claude จะลดขนาดโมเดลเหลือ 2–3k เหลี่ยมใน Blender และปรับสีให้อุ่นเหมือนภาพต้นแบบ

### 6.2 ฉากไกล 🖼 (2 ภาพ, สัดส่วน 2:1)
| ไฟล์ | คำสั่งเฉพาะชิ้น (ไม่ต้องใช้บรรทัด "ONE single isolated object" ของคำสั่งกลาง) |
|---|---|
| far_hills | `Wide panorama 2:1 matching the attached painting: rolling green meadow hills fading into blue mist, distant blue mountain ranges, a small ruined stone arch on a hill right of centre. NO standing stones, NO plaza, NO flowers in front. The bottom quarter is plain meadow grass. The sky must be EMPTY plain flat magenta (#FF00FF), no clouds, no gradient.` |
| sky_clouds | `Wide panorama 2:1 of the sky from the attached painting: bright blue sky with big soft cumulus clouds, warm cream-gold light on their edges, painterly. Sky only, no land, no mountains.` |
(ภาพเนินเขาใช้ท้องฟ้าสีบานเย็น ไม่ใช้สีเขียวตามหมวด 2 ข้อ 18 เพราะเนินเขาเป็นสีเขียว ถ้าใช้พื้นเขียวจะตัดฉากออกยาก)

### 6.3 พื้น 🖼 (2 ภาพ, จัตุรัส ≥1024)
ใช้คำสั่งของชิ้นที่ 16 `plaza_top` และ 17 `ground_tile` จากหมวด 2 แล้วต่อท้าย `Colours to match the attached painting: pale warm grey slabs, yellow-green meadow.`

### 6.4 ส่งงาน
แนบไฟล์มาในแชทนี้ หรือวางใน `godot/art/s217/src/` (ภาพ) และ `godot/art/s217/3d/` (.glb) · ชื่อไฟล์ตามคอลัมน์ "ไฟล์" · กอหญ้าใช้ของเดิม (grass0–5) ไม่ต้องเจนใหม่

## 7. v4 (14 พ.ย., set 221) — ภาพที่ต้องเจนเพื่อเริ่ม phase 2/3 (คำสั่งครบในก้อนเดียว คัดลอกวางได้เลย)

### 7.0 วิธีใช้
- เปิดแชท Gemini ใหม่ · **แนบภาพต้นแบบ "ทุ่งหินรูน"** ทุกครั้ง (ยกเว้นตัวละครหมวด 7.4 ที่ใช้ภาพต้นแบบตัวละครแทน)
- คัดลอก**ทั้งก้อน**ของแต่ละภาพไปวาง · เจน**ทีละภาพ** · ขอภาพจัตุรัส 1024 ขึ้นไป
- ถ้าภาพออกมามีตัวอักษรจริง (F, P, R, ᚠ, ตัวเลข), มีเงาบนพื้น หรือพื้นหลังไม่เรียบ ให้เจนใหม่
- ห้ามเติมชื่อเกมอื่น ชื่อศิลปิน หรือคำว่า HD-2D ในคำสั่ง
- สีพื้นหลัง: หิน = เทา #D0D0D0 · หญ้า/ดอกเหลือง/ดอกขาว = บานเย็น #FF00FF · **ดอกชมพู = น้ำเงิน #0000FF** (ชมพูกับบานเย็นคล้ายกันเกินไป ตัดพื้นหลังยาก)
- วางไฟล์: ภาพ → `godot/art/s217/src/` · .glb → `godot/art/s217/3d/` · ตัวละคร → `art/sprites/src/` (หรือแนบในแชท)

### 7.1 หญ้า 🖼 (แผ่นภาพที่โยกตามลมในเกม · 5 ภาพ)
เกมจะตัดพื้นหลัง วางภาพเป็นแผ่นตั้งรอบลาน และโยกเฉพาะปลายหญ้า **ขอบล่างต้องเป็นแนวโคนหญ้าตรง** เพื่อให้ปักลงพื้นได้สนิท

**grass_tuft_a** — กอสูง
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours. Paint ONE single isolated clump of tall meadow grass, seen from the side at eye level. About as tall as it is wide. Thin blades fanning upward and bending slightly to the right, tips lighter yellow-green, base darker olive green, a few pale seed heads on top. The bottom edge is a straight horizontal line where the blades meet the ground (no soil, no roots, no ground plane). Whole clump visible with empty margin, nothing cropped. No cast shadow, no scenery, no text. Soft light from the upper left. Background: plain flat magenta (#FF00FF), no gradient, no magenta or pink anywhere in the grass.
```

**grass_tuft_b** — กอเตี้ยกว้าง
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours. Paint ONE single isolated low wide patch of soft meadow grass, seen from the side at eye level. Twice as wide as it is tall. Short dense blades, a few longer blades sticking up, yellow-green tips, darker olive base. The bottom edge is a straight horizontal line (no soil, no ground plane). Whole patch visible with empty margin, nothing cropped. No cast shadow, no scenery, no text. Soft light from the upper left. Background: plain flat magenta (#FF00FF), no gradient, no magenta or pink anywhere in the grass.
```

**grass_tuft_c** — กอหญ้าป่าสีทอง
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours. Paint ONE single isolated clump of wild grass mixing green and dry golden blades, with drooping wild-oat seed heads, seen from the side at eye level. Slightly taller than wide. The bottom edge is a straight horizontal line (no soil, no ground plane). Whole clump visible with empty margin, nothing cropped. No cast shadow, no scenery, no text. Soft light from the upper left. Background: plain flat magenta (#FF00FF), no gradient, no magenta or pink anywhere in the grass.
```

**grass_tuft_d** — กอเล็กมาก (โรยตามขอบลาน)
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours. Paint ONE single isolated very small tuft of short grass, 8 to 12 blades, seen from the side at eye level, slightly wider than tall, fresh yellow-green. The bottom edge is a straight horizontal line (no soil, no ground plane). Whole tuft visible with empty margin, nothing cropped. No cast shadow, no scenery, no text. Soft light from the upper left. Background: plain flat magenta (#FF00FF), no gradient, no magenta or pink anywhere in the grass.
```

**grass_strip_front** — แถบหญ้าหน้ากล้อง (ภาพยาว 3:1)
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours. Paint ONE wide horizontal strip of tall foreground meadow grass, 3 times wider than tall, seen from the side at eye level. Blades of varied heights reaching up along the top edge with an uneven natural silhouette, a few yellow and white wildflowers mixed in. The bottom edge is a straight horizontal line, solid and dense. No cast shadow, no scenery, no text. Soft light from the upper left. Background: plain flat magenta (#FF00FF), no gradient, no magenta or pink anywhere in the grass.
```

### 7.2 ดอกไม้ 🖼 (3 ภาพ · แผ่นภาพแบบเดียวกับหญ้า)

**flowers_yellow**
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours. Paint ONE single isolated small clump of meadow wildflowers: 5 to 7 bright yellow buttercup-like flowers on thin stems among a few green leaves and grass blades, seen from the side at eye level, about as wide as tall. The bottom edge is a straight horizontal line (no soil, no ground plane). Whole clump visible with empty margin, nothing cropped. No cast shadow, no scenery, no text. Soft light from the upper left. Background: plain flat magenta (#FF00FF), no gradient, no magenta anywhere in the plant.
```

**flowers_pink**
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours. Paint ONE single isolated small clump of meadow wildflowers: 5 to 7 soft pink round clover-like blossoms on thin stems among a few green leaves and grass blades, seen from the side at eye level, about as wide as tall. The bottom edge is a straight horizontal line (no soil, no ground plane). Whole clump visible with empty margin, nothing cropped. No cast shadow, no scenery, no text. Soft light from the upper left. Background: plain flat pure blue (#0000FF), no gradient, no blue anywhere in the plant.
```

**flowers_white**
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours. Paint ONE single isolated small clump of meadow wildflowers: many tiny white daisy-like flowers with yellow centres on thin stems among green leaves and grass blades, seen from the side at eye level, slightly wider than tall. The bottom edge is a straight horizontal line (no soil, no ground plane). Whole clump visible with empty margin, nothing cropped. No cast shadow, no scenery, no text. Soft light from the upper left. Background: plain flat magenta (#FF00FF), no gradient, no magenta or pink anywhere in the plant.
```

### 7.3 หินตั้ง 5 แบบ + หินเล็ก 🧊 → Hunyuan3D (8 ภาพ)
ภาพหินแต่ละภาพ → อัปโหลดเข้า Hunyuan3D (ตั้งค่าเหมือนก้อนเดิม) → ดาวน์โหลด .glb ชื่อเดียวกับภาพ · Claude ลดเหลี่ยมใน Blender เอง · ขนาดในภาพไม่สำคัญ Claude ปรับสเกลในเกม แต่**สัดส่วนสูง:กว้าง**ต้องตรงตามคำสั่ง
จดไว้ให้ Claude ด้วย: ชื่อเว็บ/รุ่นที่ใช้ + วันที่ (สำหรับ art/PROVENANCE.csv)

**stone_a_tall** — หินสูงเรียว (ตัวเอก)
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours, moss green and warm grey stone. Paint ONE single isolated tall slender standing stone (menhir), about 4 times taller than wide, leaning slightly to the left, sharp broken top, deep vertical cracks, moss on the lower third. Three glowing pale-cyan invented abstract glyphs carved in a vertical line on the front face — NOT real runes, NOT Latin letters or numbers. Three-quarter front view from slightly above (about 20°), as a 3D model reference: clear silhouette, readable form on all visible sides. Whole stone visible with empty margin, nothing cropped. No ground plane, no cast shadow, no scenery, no text. Even soft light from all sides, no strong shadows. Background: plain flat light grey (#D0D0D0), no gradient.
```

**stone_b_round** — หินกลมป้อม
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours, moss green and warm grey stone. Paint ONE single isolated wide rounded standing stone, egg-shaped, about 2 times taller than wide, heavy moss on the bottom half, a cluster of small glowing pale-cyan invented abstract glyphs on the front face — NOT real runes, NOT Latin letters or numbers. Three-quarter front view from slightly above (about 20°), as a 3D model reference: clear silhouette, readable form on all visible sides. Whole stone visible with empty margin, nothing cropped. No ground plane, no cast shadow, no scenery, no text. Even soft light from all sides, no strong shadows. Background: plain flat light grey (#D0D0D0), no gradient.
```

**stone_c_slim** — หินบิดเกลียว
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours, moss green and warm grey stone. Paint ONE single isolated thin standing stone with a natural spiral twist along its height, about 5 times taller than wide, pointed top, light pale lichen, a short row of glowing pale-cyan invented abstract glyphs following the twist — NOT real runes, NOT Latin letters or numbers. Three-quarter front view from slightly above (about 20°), as a 3D model reference: clear silhouette, readable form on all visible sides. Whole stone visible with empty margin, nothing cropped. No ground plane, no cast shadow, no scenery, no text. Even soft light from all sides, no strong shadows. Background: plain flat light grey (#D0D0D0), no gradient.
```

**stone_d_pillar** — เสาหินเหลี่ยม
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours, moss green and warm grey stone. Paint ONE single isolated square-cut ancient stone pillar standing on a low square base, about 3 times taller than wide, weathered rounded edges, chipped corners, moss in the cracks, glowing pale-cyan invented abstract glyphs on the two visible faces — NOT real runes, NOT Latin letters or numbers. Three-quarter front view from slightly above (about 20°), as a 3D model reference: clear silhouette, readable form on all visible sides. Whole pillar visible with empty margin, nothing cropped. No ground plane, no cast shadow, no scenery, no text. Even soft light from all sides, no strong shadows. Background: plain flat light grey (#D0D0D0), no gradient.
```

**stone_e_short** — หินหักเตี้ย
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours, moss green and warm grey stone. Paint ONE single isolated short broken standing stone, only about 1.5 times taller than wide, jagged snapped top, moss and a little grass at its foot, one large glowing pale-cyan invented abstract glyph on the front — NOT a real rune, NOT a Latin letter or number. Three-quarter front view from slightly above (about 20°), as a 3D model reference: clear silhouette, readable form on all visible sides. Whole stone visible with empty margin, nothing cropped. No ground plane, no cast shadow, no scenery, no text. Even soft light from all sides, no strong shadows. Background: plain flat light grey (#D0D0D0), no gradient.
```

**rock_a / rock_b / rock_c** — หินก้อนเล็ก 3 แบบ (ใช้คำสั่งเดียวกัน เปลี่ยนเฉพาะ [SHAPE])
- rock_a: `a rounded knee-high boulder with flat layered faces`
- rock_b: `a low flat slab-like rock, 3 times wider than tall, cracked across the top`
- rock_c: `a sharp angular rock with two jagged points, slightly taller than wide`
```
Use the attached painting as the style reference: painterly hand-painted fantasy game art, soft brush strokes, warm afternoon daylight, muted natural colours, moss green and warm grey stone. Paint ONE single isolated small rock: [SHAPE]. Weathered warm grey stone with patches of moss and a few tiny grass tufts in its cracks, no glyphs. Three-quarter front view from slightly above (about 20°), as a 3D model reference: clear silhouette, readable form on all visible sides. Whole rock visible with empty margin, nothing cropped. No ground plane, no cast shadow, no scenery, no text. Even soft light from all sides, no strong shadows. Background: plain flat light grey (#D0D0D0), no gradient.
```

### 7.4 ตัวละคร 64×64 (เริ่มที่ตัวต้นแบบ HL-1 ก่อน · art-style §4–§7)
จำนวนเฟรมด้านล่างเป็น **(ค่าเสนอ)** · Gemini มักวาดเฟรมต่อเนื่องได้ไม่ตรงกัน จึงทำ 3 ขั้น:
**ขั้น A** ภาพตัวละครนิ่ง 1 ภาพ (ทำจนชอบ = ภาพต้นแบบ) → **ขั้น B** แถบท่าทางทีละท่า โดยแนบภาพต้นแบบทุกครั้ง → **ขั้น C** เก็บงานใน Aseprite / Pixelorama (ย่อแบบ Nearest เป็น 64×64 ต่อเฟรม · ลดสีเหลือ ~16 · ลบพื้นหลัง · เท้าอยู่แถวที่ 58 ทุกเฟรม)

**ขั้น A-0: ข้อความตั้งต้น** (วางครั้งแรกในแชทใหม่ = art-style §5)
```
You are helping me make ORIGINAL character sprites for my indie auto-battler game.
Style rules for every image:
- True pixel art sprite, 64x64 pixel grid, every pixel a clean square block, no anti-aliasing, no blur.
- Chibi-heroic proportions (head : body about 1 : 2.5), full body, 3/4 view facing right.
- 1-pixel dark outline tinted with the main colour (not pure black).
- Light from top-left, 2-3 shade steps per colour, max 16 colours.
- Warm high-fantasy mood, rich but not neon colours.
- Plain flat solid #FF00FF magenta background, nothing else, no ground, no shadow, no text, no signature, no frame.
- Must be original: do not resemble any existing game, franchise or character.
Reply "ready" and wait for my character descriptions.
```

**ขั้น A-1: HL-1 ภาพนิ่ง**
```
Character: HL-1 — small iron golem brawler with oversized metal gauntlets
Tribe look: steel tribe: silver-grey and muted blue, boxy plate armour, broad shoulders
Rarity: common (simple, few ornaments)
Pose: idle battle stance, fists raised
Key feature: huge riveted fists, glowing blue eye slit
Size: the character is about 46 pixels tall inside the 64x64 frame, feet on the 58th pixel row, centred.
```

**ขั้น B: แถบท่าทาง** (แนบภาพต้นแบบ HL-1 ทุกครั้ง · ทีละท่า · เปลี่ยน [N] และ [MOTION])
| ท่า | [N] เฟรม | [MOTION] |
|---|---|---|
| idle | 4 | `breathing idle: body rises 1 pixel on frames 2-3, fists bob slightly, eye slit pulses brighter on frame 3` |
| attack | 4 | `punch attack: frame 1 wind-up leaning back, frame 2 lunge forward, frame 3 fist fully extended with a small impact spark, frame 4 recover to stance` |
| hit | 2 | `taking a hit: frame 1 flinch back with body tilted away and eye slit squinting, frame 2 return halfway to stance` |
| die | 4 | `defeat: frame 1 stagger, frame 2 drop to one knee, frame 3 fall forward, frame 4 lying flat with the eye light off` |
```
Same character as the attached image: identical design, colours, palette, outline and size. Make a horizontal sprite strip of [N] frames side by side, each frame exactly 64x64 pixels on the same pixel grid, total image [N x 64] x 64. Animation: [MOTION]. Feet stay on the 58th pixel row in every frame (except where the motion says the character falls), and the character does not drift sideways between frames except for the lunge. 3/4 view facing right. Plain flat solid #FF00FF magenta background, no ground, no shadow, no text, no frame borders between frames.
```
ชื่อไฟล์: `HL-1.png` (ภาพนิ่ง) · `HL-1_idle.png` · `HL-1_attack.png` · `HL-1_hit.png` · `HL-1_die.png` · พอ HL-1 ผ่านแล้ว ตัวต่อไปใช้แม่แบบ art-style §6 + "same pixel style, palette and size as the attached image"

### 7.5 ไม่ต้องเจน
ท้องฟ้า เนินไกล พื้นลาน และพื้นหญ้าใช้ของเดิม (P1t) · เงา แสง หมอก การโยกตามลม แสงเรืองของรูน และเอฟเฟกต์ Claude ทำในเกมเอง
