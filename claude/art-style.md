# แนวภาพ Automon Arena — "ภาพวาดในฉากแสงจริง" V2.0 (ค่าเสนอทั้งไฟล์ รอผู้ใช้ยืนยัน ยกเว้นข้อที่เขียนว่า "ตัดสินแล้ว")

> **V2.0 (ตัดสินแล้ว · ผู้ใช้ชุด 227, 15 พ.ย. 2026):** ตัวละครเปลี่ยนจาก**พิกเซลอาร์ต**เป็น**ภาพวาด 2D สไตล์เดียวกับฉาก** (พิกเซลทุกแบบ K0–K4 รวมภาพชั่วคราว DCSS วางในสนามแล้วไม่เข้ากับฉากที่เป็นภาพวาด · หมูป่าภาพวาดเข้ากันกว่า) · ท่ายืน = **วิดีโอ Veo → 32 เฟรม** (ผู้ใช้เลือกจากเทียบ 16/32/64 · 64 กินหน่วยความจำ 2 เท่าแต่ตาแทบไม่เห็นต่าง) · ทางสำรอง = ยืดภาพหายใจด้วยโค้ด (M3) · ทุกตัวต้อง**ดูแฟนตาซี + เห็นเอกลักษณ์เผ่าชัด**ทั้งสีและทรง · หน้าไม่โหดมาก (ผู้ใช้ชุด 227) · ร่าง 1 ก่อนทุกตัว · ขั้นตอน: สกิล char-idle เส้นทาง P · ภาพเทียบ: `ccr-882ceb4b-0ewtk1:claude/preview-set217/notes.md` s227 R1–R6
> - **ข้อที่พิกเซลเท่านั้น (ใช้ไม่ได้แล้วกับตัวใหม่):** ข้อ 2 ผืน 64×64 / เส้นขอบ 1 px / 16 สี / ขยาย 2× · ท่ายืน 8 เฟรม 250 ms + เกลาใน Pixelorama · ข้อ 4 ขั้น 4 และ 6 (ย่อ/ลดสี/S2) · ข้อความตั้งต้นพิกเซลเดิม (ดูประวัติ git V1.6) · PL-1/SF-1 พิกเซลเดิม = ต้องวาดใหม่แบบภาพวาด
> - **ภาพวาดในเกม:** ตัวสูง ~150 px บนจอ 1920×1080 (1 จุดภาพ = 1 จุดจอ · ค่าเสนอ) · ภาพแบนไม่รับแสงแดด (ลองแบบรับแสงแล้วตัวมืดแบน) · แผ่นภาพ 32 เฟรมเรียงเป็น**ตาราง**ไม่เกินกว้าง 4096 px ตอนทำจริง (มือถือโหลดภาพกว้างเกินไม่ได้)
> - **ยังไม่ตัดสิน:** เงา — ลองเงาตามรูปตัวแบบนุ่ม/คม (s227 R6) ผู้ใช้ว่า "ยังแปลกๆ" จดไว้แก้ทีหลัง · ตอนนี้ใช้เงากลมเดิม (ชุด 226)

**สถานะ (6 พ.ย. 2026):** พักงานภาพไว้ระหว่าง MVP1 · ตัดสินแล้ว: หลัง MVP1 ย้ายเกมไป Godot (ภาพ HD-2D แท้ต้องใช้ฉาก 3D) · ผลทดลอง: AI วาดตัวละครพิกเซลได้ดี (HL-1 ผ่าน) แต่ฉากจาก AI ดูเป็น AI/ไม่ใช่ HD-2D → ฉากใช้ 3D (Blender ทดลองแล้ว: art/blender/arena_scene.py รันด้วย `pip install bpy pillow` แล้ว `python arena_scene.py <out.png>`) · ยังไม่ตัดสิน: ขนาดตัว 64/96 px · ภาพเปลี่ยนตามเลเวลหรือไม่

แรงบันดาลใจ: แนว HD-2D (ตัวละครพิกเซลอาร์ต + ฉากมีแสง เงา มิติ แบบ 3D) — **ออกแบบเป็นของเราเอง** ไม่ลอกตัวละคร ฉาก หรือสัญลักษณ์ของเกมใด

## 1. ภาพรวม
- ตัวละคร = **พิกเซลอาร์ต** ขอบคม สีจำกัด เห็นเม็ดพิกเซลชัด
- ฉากสนาม = **ภาพวาดนุ่ม มีแสง** ขอบบน/ล่างเบลอเหมือนกล้องถ่ายของจิ๋ว (tilt-shift) ตรงกลางคม
- แสงและเอฟเฟกต์ (เรืองแสง ประกาย ฝุ่นแสง เงาใต้ตัว แสงสกิล) = **โค้ดทำให้** ไม่ต้องวาดลงในภาพ
- อารมณ์: แฟนตาซีอบอุ่น แสงเย็นยามเย็น สีอิ่มแต่ไม่จัดจ้า

## 2. สเปกภาพตัวละคร (ค่าเสนอ)
- ผืนภาพ **64×64 พิกเซล** พื้นโปร่งใส · ตัวสูงประมาณ 44–52 px · เท้าอยู่แถวที่ 58 ทุกตัว
- มุมมอง: เฉียง 3/4 หันไปทาง**ขวา** (เกมกลับด้านให้ฝั่งศัตรูเอง)
- สัดส่วน: หัวต่อตัว ~1:2.5 (ตัวเล็กน่ารักแต่ดูเท่)
- เส้นขอบ 1 px สีเข้มของสีหลัก (ไม่ใช่ดำสนิท) · แสงจากซ้ายบน · สีรวมไม่เกิน ~16 สีต่อตัว
- ในเกมขยาย 2× แบบไม่เบลอ (เห็นเม็ดพิกเซล)
- **ท่าทาง (ตัดสินแล้ว · ผู้ใช้ชุด 221, 14 พ.ย. 2026 — เลือก A2 ก่อน แล้วลองเจนท่าโจมตีแล้วยาก จึงเปลี่ยนเป็น idle อย่างเดียว):** ตัวละครทุกตัววาดแค่ **ภาพนิ่ง 1 ภาพต่อร่าง** (ร่างดูข้อถัดไป · Gemini เจนแถบ idle ไม่ดี) · **idle (ผู้ใช้ชุด 222 L1, 14 พ.ย. 2026) = วิดีโอก่อน:** ผู้ใช้เจนวิดีโอ Gemini 1 คลิปจากภาพนิ่ง (คำสั่งตายตัวในสกิล char-idle) · **พื้นหลังภาพแนบ (ตัดสินแล้ว · ผู้ใช้ชุด 225b): ใช้สีตรงข้ามกับตัว** — ตัวโทนแดง/ส้ม/น้ำตาล/เหลือง = พื้นเขียว #00FF00 · ตัวโทนเขียว = พื้นชมพู #FF00FF (พื้นชมพูกับตัวแดงทำให้ขอบฟุ้ง) · **ตั้งค่าเจน: Veo 3.1 · Frames · 16:9 · 1080p · โหลดเป็น .mp4 เท่านั้น** (ห้าม GIF · ห้ามคำสั่งค้างท่าแบบ stop-motion — ลองแล้วพัง) → Claude ตัดเป็น **8 เฟรม** จากวิดีโอตรงๆ ปรับน้อยที่สุด (จัดลงพิกเซล ลบพื้นชมพู เติมขอบดำที่หาย — ห้ามล้างภาพหนัก ผู้ใช้ว่ายิ่งปรับยิ่งเละ) · เฟรมละ **250 ms** (รอบละ 2 วิ · ผู้ใช้เลือก ชุด 225b จากช่วงที่เกมพิกเซลนิยม 125–250 ms · ปรับรายตัวได้ ตัวว่องไวเร็วกว่า ตัวหนักช้ากว่า) · ผู้ใช้เกลาต่อเองใน Pixelorama · เอฟเฟกต์ในวิดีโอ (ประกายตา สายฟ้า) เก็บไว้ได้ · ภาพสั่นนิดๆ ระหว่างเฟรมยอมรับได้ · วิดีโอไม่ผ่าน 2 ครั้ง (หรือผู้ใช้สั่ง) → ใช้ **idle โค้ด** ด้านล่างแทน · HL-1 = วิดีโอ (ชุด 222) · **idle โค้ด (ทางสำรอง · ผู้ใช้เลือกแบบ 1 + ตาเรือง จากตัวอย่าง s221-idle-options.gif):** ยืดหดทั้งตัวแบบหายใจ ยึดเท้า + จุดเรืองแสงของตัว (ตา/รูน/คริสตัล) สว่างขึ้นลงตามจังหวะ · **ค่าตั้งต้น = แบบ 3 (ผู้ใช้เลือกจาก s221-squash-variants.gif ชุด 221) แต่เลือกแยกรายตัว: ทุกตัวต้องทำภาพ 8 แบบให้ผู้ใช้เลือกเอง (สกิล char-idle) แล้วจดใน claude/idle-picks.csv · แบบ 3 =** สูงลด ~1.2% กว้างเพิ่ม ~0.8% (ค่าเสนอ) · จังหวะหายใจ เข้า 35% → ค้าง 15% → ออก 35% → พัก 15% ของรอบ ~2.4 วิ (ค่าเสนอ) · ย่อด้วย scale ของ Sprite3D ที่ขนาดจอ ห้ามย่อตัวภาพที่ขนาดสไปรต์ (แบบนั้นเม็ดพิกเซลหาย-โผล่สุ่ม ผู้ใช้ว่าแปลก) · หาจุดเรืองด้วยสีสดสว่างอัตโนมัติ ถ้าหาผิดตัวไหนค่อยทำภาพมาสก์แยก · ไม่มีภาพท่าโจมตี · ท่าโจมตีในเกม = โค้ดพุ่งตัวไปข้างหน้าแล้วถอยกลับ (ยืด-หดตัวนิดหน่อย + แสงวาบจากเอฟเฟกต์สกิล) · โดนตี = โค้ดล้วน (กะพริบขาว สั่น เด้งถอย) · **ตาย (ผู้ใช้กำหนด ชุด 221) = ตัวค่อยๆ มืดเป็นเงาดำ + ดาวพิกเซลเล็กๆ หมุนวนเหนือหัว แล้วจางหายไป** (โค้ดทำทั้งหมด ดาววาดด้วยโค้ด · ความเร็ว/จำนวนดาว = ค่าเสนอ: มืดลง ~0.4 วิ · ดาว 3 ดวง หมุน ~0.8 วิ · จางหาย ~0.3 วิ) ไม่ต้องวาด · เหตุผล: ตัวละคร 48 ตัว วาดครบ 4 ท่าต่อตัวงานเยอะเกิน
- **2 ร่าง (ตัดสินแล้ว · ผู้ใช้ชุด 224, 14 พ.ย. 2026):** ดาว 1–2 = **ร่าง 1** · ดาว 3 = **ร่าง 3** (ร่างวิวัฒน์ ตัวเดิมโตขึ้น: ชนิด/หน้า/สีหลัก/ขนาดเม็ดเดิม ใหญ่ขึ้น ~20% (ค่าเสนอ) ท่ามั่นขึ้น เกราะ/ของประดับมากขึ้น + จุดเด่นใหม่ 1 อย่าง) · ร่าง 3 สั่งหลังร่าง 1 ของตัวนั้นผ่านแล้วเท่านั้น โดยแนบร่าง 1 ไป · **ตอนนี้ทำร่าง 1 ก่อนทุกตัว** (ผู้ใช้ชุด 224) ร่าง 3 ทำทีหลัง · ทุกร่างมี idle ของตัวเอง (สกิล char-idle) · claude/idle-picks.csv มีช่อง `form` (1 / 3) · โค้ดเปลี่ยนร่างตอนรวมร่างขึ้นดาว 3 ใน Godot = ทำตอนทำจริงตามสั่ง
- **จุดเอฟเฟกต์ประจำตัว (ตัดสินแล้ว · ผู้ใช้ชุด 224):** ออกแบบทุกตัวให้มี **จุดเอฟเฟกต์ 1–2 จุด** ที่ติดตัว เช่น HL-1 ตาเรือง + ปล่อยสายฟ้าจากกำปั้น · PL-1 ไฟที่ปลายหาง · ใช้ 2 ทาง: ① บรรทัด EFFECT ในวิดีโอ idle ② จุดยึดเอฟเฟกต์สกิลในเกม (โค้ดทำแสง/อนุภาคที่จุดนั้น ข้อ 1) · จดจุดไว้ในคำสั่งภาพ (บรรทัด `Effect spot` ข้อ 6)
- **ห้าม / ไม่ควร ในภาพนิ่ง (ผู้ใช้ชุด 224 จากรีวิวภาพชุดแรก):** ห้าม: เงา/พื้นใต้ตัว · สีชมพูหรือม่วงอมชมพูบนตัว (ตัดพื้นชมพูแล้วขอบเพี้ยน) · ตัวชิด/ล้นขอบภาพ · คล้ายตัวในเกมดัง — ไม่ควร: ทั้งตัวสีเข้มหมด (ย่อแล้วเป็นก้อนมืด) · ชิ้นเล็กลอยแยกจากตัวเยอะ (ไม่เกิน 2–3 ชิ้นและติดตัว) · ตัวระดับธรรมดาดูหรูเกิน · หาง/ปีกยาวจนภาพกว้างกว่าตัวอื่นมาก · ต้องไม่ใช่มนุษย์ = สัตว์/สิ่งมีชีวิตแฟนตาซี (ผู้ใช้ชุด 224)
- ความหายากสูง = รายละเอียด/ชิ้นเกราะ/ของประดับมากขึ้น ตัวใหญ่ขึ้นได้ (ตำนานเต็ม 64 px)

## 3. เผ่า: สี + โครงร่าง (ให้จำได้แม้ไม่มีกรอบสี)
| เผ่า | สีหลัก | โครงร่าง/ลักษณะ |
|---|---|---|
| เหล็กกล้า | เทาเงิน + น้ำเงินหม่น | เหลี่ยม ไหล่กว้าง เกราะแผ่น โล่ |
| เพลิงเผา | แดงส้ม + ทอง | แหลมขึ้นด้านบน เขา หงอนเปลว |
| สายฟ้า | เหลือง + ม่วงไฟฟ้า | ทรงข้าวหลามตัด หนามซิกแซก ผอมเร็ว |
| วายุ | เขียวมิ้นต์ + ขาว | ทรงกลมพลิ้ว ผ้าคลุม ปีก ขนนก |
| ภูติ | ฟ้าอมม่วงโปร่ง | ลอยตัว มีรูน วงแหวนเวท หกเหลี่ยม |
| อสูร | ม่วงเข้ม + แดงเลือดหมู | ห้าเหลี่ยม เขาโค้ง เงี่ยงหนา ตาเรือง |

## 4. ขั้นตอนกับ Gemini
1. เปิดแชทใหม่ใน Gemini วาง **ข้อความตั้งต้น (ข้อ 5)** ก่อนครั้งเดียว
2. ขอทีละตัวด้วย **แม่แบบตัวละคร (ข้อ 6)** · ทำ HL-1 ก่อน จนชอบ = **ภาพต้นแบบ**
3. ตัวต่อไป: แนบภาพต้นแบบทุกครั้ง (ตอนนี้ = `art/library/pictures/sprites/PL-1_still2_veo_2026-11-14.jpg`) เพื่อลอก**แค่สไตล์พิกเซล**: ขนาดเม็ด ขอบ การลงเงา โทนสีหม่น · **ม่อนแต่ละตัวต้องเป็นสัตว์คนละชนิด ทรงตัวไม่ซ้ำ** (ผู้ใช้ชุด 225b — ด้วง SF-1 รอบแรกออกมาเป็นกิ้งก่าตัวเดิมเปลี่ยนสี) · สีสดเกิน → สั่งให้หม่นลงตามต้นแบบ
4. ภาพจาก AI มักเป็น "พิกเซลปลอม" (เม็ดไม่เท่ากัน ขอบฟุ้ง) → เก็บงานใน **Aseprite** (หรือ Pixelorama ฟรี):
   ย่อเป็น 64×64 แบบ Nearest Neighbor → ลดสีเหลือ ~16 → ลบพื้นหลัง → แก้เม็ดเพี้ยน → จัดเท้าแถว 58 → บันทึก PNG
5. ตั้งชื่อไฟล์ตาม ID เช่น `HL-1.png` แล้วส่งมาให้ Claude ต่อเข้าเกม
6. **ปรับเข้าฉาก S2 (ตัดสินแล้ว · ผู้ใช้ชุด 226 เลือกจากภาพเทียบ s226-scenematch-S0-S4 — ตัวเจนสีจัดเกินฉาก):** หลัง idle 8 เฟรมผ่านแล้ว Claude ทำแผ่นภาพ S2 อีกชุดด้วย `scenematch.py <sheet> <out> 2` (สกิล char-idle B5c): ย่อ ÷2.4 ให้ได้ขนาดสเปกข้อ 2 · เหลือ 16 สี · ความสดเหลือ 70% · บีบความต่างสว่าง-มืดเหลือ 78% เข้าหากลาง · โทนอุ่นอมเขียวมะกอก — ตัวเลขชุดนี้มาจากตัวอย่างที่ผู้ใช้เลือก ปรับได้รายตัว · ไฟล์ S2 = ตัวที่ใช้ในเกม (ไฟล์เดิมเก็บไว้) · ข้อความตั้งต้นข้อ 5 เพิ่มบรรทัดสี/ลาย (ชุด 226) ให้ตัวใหม่หม่นตั้งแต่ตอนเจน
- ห้ามพิมพ์ชื่อเกมอื่น ชื่อตัวละครเกมอื่น ชื่อศิลปิน หรือคำว่า HD-2D ในคำสั่ง (บรรยายลักษณะแทน)

## 5. ข้อความตั้งต้น — ภาพวาด V2.0 (วางใน Gemini ครั้งแรก · แนบภาพฉาก `art/library/pictures/originals/target_rune_meadow_gemini_2026-11-13.jpeg` · ผู้ใช้ชุด 227)
```
You are helping me paint ORIGINAL creatures for my indie fantasy auto-battler game.
Style rules for every image:
- Copy ONLY the painting style, brushwork, colour mood and warm top-left sunlight of the attached landscape painting, so every creature looks painted by the same artist and belongs in that scene. Do not copy anything else from it.
- Soft painterly fantasy illustration with clear readable shapes and a slightly darker painted edge. NOT pixel art, NOT 3D render, NOT anime, NOT a cute mascot or toy.
- Clearly a FANTASY creature, not a normal animal: start from a real animal for believable anatomy, then add magical features of its tribe (horns, crystals, runes, plates, glowing parts) so nobody would mistake it for a real animal.
- Faces are expressive and likeable: confident, determined or curious — never horror, never gore, no snarling rage face.
- TRIBE IDENTITY is the most important rule. Each creature belongs to one of 6 tribes and must be recognisable by colour AND silhouette even without a frame:
  - steel: silver-grey and muted blue, boxy plate armour, broad shoulders, shield-like plates, rivets
  - fire: red-orange and gold, shapes pointing upward, horns, flame crests
  - storm: yellow and electric purple, diamond shapes, zigzag spikes, lean and fast
  - wind: mint green and white, round flowing shapes, cloak-like membranes, wings, feathers
  - spirit: translucent sky-blue to lavender-blue, floating, runes, magic rings, hexagon patterns
  - demon: dark purple and oxblood red, pentagon-shaped heavy body, curved horns, thick spikes, glowing eyes
- Colours stay earthy and slightly greyed like the painting; markings use neighbouring shades of the main colour; no neon, no pure white, no pink on the body.
- Every creature has 1-2 effect spots built into its body (glowing eyes, ember veins, a crystal, a rune) where magic can shine.
- Full body, 3/4 view facing LEFT, feet planted (spirits hover). Whole body inside the middle 80% of the image, empty space on every side; body about as wide as it is tall; no very long tails or wings.
- Plain flat solid background in the colour I name (pure green #00FF00, or magenta #FF00FF for green creatures), edge to edge — no painted frame or border.
- Each creature has 2 forms: FORM 1 (basic, young, simpler, fewer ornaments) and FORM 3 (evolved max-level form: the same creature grown about 20% bigger, stronger pose, more armour or ornaments, one new signature feature). I will always say which form I want; FORM 3 comes later with the approved FORM 1 attached.
NEVER: shadow, ground, floor, grass, text, frame, border, glow spilling onto the background, smoke, loose floating particles, the background colour on the creature, resembling any existing game, monster-collecting franchise or character.
Reply "ready".
```

## 6. แม่แบบตัวละคร — ภาพวาด (เปลี่ยนเฉพาะในวงเล็บ · ตัวอย่างที่ผ่าน = WN-1 ชุด 227)
```
FORM 1. Character: [ID] — [young + creature in a few words — a species no other creature uses] ([rarity]: simple, few ornaments)
Tribe: [tribe] — make the [tribe] identity obvious: [silhouette + tribe features from rule list]
Fantasy features: [2-3 magical features in tribe colours]
Face: [confident / curious ...] — not scary
Effect spots: [1-2 spots]
Pose: [ready stance ...], feet planted
Background: [pure green #00FF00 / magenta #FF00FF if green creature]
```
WN-1 ที่ผ่าน (ชุด 227): `young demon boar fighter · short thick curved horns · ridge of short dark spikes · cracked oxblood-red plates on shoulders/forehead with ember-orange veins · small pentagon rune on the shoulder plate · face confident and a little cheeky · effect spots: glowing ember eyes + ember veins in the horn cracks · pure green`
ชนิดสัตว์ที่เลือกแล้ว (ผู้ใช้ชุด 227): HL-1 ปูเปลือกเหล็ก · WY-1 เหยี่ยวเล็ก · WN-1 หมูป่าเขาโค้ง · PT-1 ผีเสื้อกลางคืนเรืองแสง · PL-1 กิ้งก่าไฟ · SF-1 ด้วงสายฟ้า (PL-1/SF-1 วาดใหม่แบบภาพวาด)
ร่าง 3 (แนบร่าง 1 ที่ผ่านแล้วของตัวนั้นแทนภาพต้นแบบ):
```
FORM 3 of the attached creature (its evolved max-level form).
Evolved: [สิ่งที่โตขึ้น/เพิ่มขึ้น 1 บรรทัด]
Keep: the same species, same face, same main colours, same effect spots and same pixel size, so it is clearly the same creature grown up.
Change: about 20% bigger, stronger pose, more armour or ornaments, one new signature feature. Still fits the middle 80% of the image.
```

## 7. ตัวทดลองตัวแรก: HL-1 (กำปั้นเหล็ก)
```
Character: HL-1 — small iron golem brawler with oversized metal gauntlets
Tribe look: steel tribe: silver-grey and muted blue, boxy plate armour, broad shoulders
Rarity: common (simple, few ornaments)
Pose: idle battle stance, fists raised
Key feature: huge riveted fists, glowing blue eye slit
```

## 8. ฉากสนาม (ชุด 132 · 7 พ.ย. 2026 · ผู้ใช้เลือกทำฉากก่อนตัวละคร · ทำสนามหลัก 1 ฉากก่อน)
- **ตัดสินแล้ว: ฉาก "ลานรูนบนทุ่งสูง"** · ภาพเป้าหมาย `art/scene/target-runeplaza.jpg` (Gemini วาดจากคำสั่งของเรา ใช้เป็นเป้าหมายสี/แสง/อารมณ์ ไม่ใช่ภาพในเกม)
  - ลานหินวงกลมโบราณ หญ้า/มอสแทรกรอยต่อ · เสาหินตั้งล้อมวง สลักรูนเรืองแสงฟ้า · ซุ้มหินร้างบนเนินไกล (จุดจำของฉาก) · เนินเขาเขียวซ้อนชั้นจางเป็นหมอกฟ้า · เมฆก้อนใหญ่ขอบบนอมชมพู/ทอง · ดอกไม้ป่าหน้ากล้อง · กลางวัน
  - ห้ามมี (คล้ายเกมต้นแบบเกินไป ผู้ใช้ปฏิเสธ 7 พ.ย.): ทุ่งหญ้า + ต้นไม้ใหญ่มีลำแสง + ลำธารคดเคี้ยว + ทางดินกลางภาพ (ฉาก meadow v1 ถูกยกเลิก · สคริปต์ `art/blender/meadow_scene.py` ใช้เป็นฐานโค้ดเท่านั้น)
  - สัญลักษณ์รูนบนเสา = ออกแบบเอง ไม่ใช้อักษรรูนจริงหรืออักษรละติน · เสาหน้าสุดถอยไปขอบนอก ไม่บังตัวละคร · ลายวงบนพื้นจัดให้ตรงกับ 12 ช่อง
- **มุมกล้อง: A มองลงจากสูงแบบภาพเป้าหมาย** (เส้นขอบฟ้า ~40% จากบน · แถวหน้า/หลังแยกชัด) — ผู้ใช้เลือก 7 พ.ย.
- ทำเป็น **3D ใน Blender** (pip bpy 5.2 ใช้ได้บนคลาวด์ · เรนเดอร์เต็ม 1600×740 ≈ 5 นาที) · post pass: `art/blender/post_meadow.py` (ฟ้า/เมฆ ลำแสง เรืองแสง เบลอบน-ล่าง + ภาพตัวอย่างกล่องสีบน 12 ช่อง) · บันทึกตำแหน่งช่องบนจอเป็น `<ชื่อ>_cells.json`
- กระดาน: 2 ฝั่ง × 3 คอลัมน์ (หน้า/กลาง/หลัง) × 2 แถว · ผู้เล่นซ้าย ศัตรูขวา · ตัวละครไม่อยู่ในฉาก (เกมวาดพิกเซลทับ) · ไฟล์ 3D ใช้ต่อใน Godot (หลัง MVP1: หญ้า/ต้นไม้ต้องทำใหม่แบบเบา · เว็บใช้โหมดภาพเบา)
- ยังไม่ตัดสิน: ความสูงตัวบนจอ · ฉากอื่นเพิ่ม (เผ่า/บอส)
- **ชุด 215 (12 พ.ย.):** ฉากลานรูนเข้าเกม Godot เป็น 3D จริงแล้ว — ส่งออกจากไฟล์ Blender v5 (ผู้ใช้เลือก A2) · ช่องยืน = วงแหวนรูนกลมเรืองฟ้า (B1) · ธีมมืด = พลบค่ำ (C1) · ตัดหญ้าใบ (1.6 ล้านเหลี่ยม) ออก เหลือพื้นเขียว · กล้องเกมก้ม 40° จึงเห็นแค่ลานกับขอบหญ้า เสาหิน/เนินเขา/ซุ้มหินแทบไม่เข้าจอ (ภาพเป้าหมายใช้กล้องต่ำกว่า)
