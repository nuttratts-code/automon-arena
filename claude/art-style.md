# แนวภาพ Automon Arena — "พิกเซลแสงจริง" V0.1 (ค่าเสนอทั้งไฟล์ รอผู้ใช้ยืนยัน)

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
3. ตัวต่อไป: แนบภาพต้นแบบทุกครั้ง + "same pixel style, palette and size as the attached image"
4. ภาพจาก AI มักเป็น "พิกเซลปลอม" (เม็ดไม่เท่ากัน ขอบฟุ้ง) → เก็บงานใน **Aseprite** (หรือ Pixelorama ฟรี):
   ย่อเป็น 64×64 แบบ Nearest Neighbor → ลดสีเหลือ ~16 → ลบพื้นหลัง → แก้เม็ดเพี้ยน → จัดเท้าแถว 58 → บันทึก PNG
5. ตั้งชื่อไฟล์ตาม ID เช่น `HL-1.png` แล้วส่งมาให้ Claude ต่อเข้าเกม
- ห้ามพิมพ์ชื่อเกมอื่น ชื่อตัวละครเกมอื่น ชื่อศิลปิน หรือคำว่า HD-2D ในคำสั่ง (บรรยายลักษณะแทน)

## 5. ข้อความตั้งต้น (วางใน Gemini ครั้งแรก)
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

## 6. แม่แบบตัวละคร (เปลี่ยนเฉพาะในวงเล็บ)
```
Character: [ID] — [creature/role in a few words]
Tribe look: [ข้อ 3 แปลเป็นอังกฤษ เช่น "steel tribe: silver-grey and muted blue, boxy plate armour, broad shoulders"]
Rarity: [common / uncommon / rare / epic / legendary] (more ornaments and size for higher rarity)
Pose: [idle battle stance / holding a big shield / ...]
Key feature: [จุดเด่นจากสกิล 1 อย่าง]
```

## 7. ตัวทดลองตัวแรก: HL-1 (กำปั้นเหล็ก)
```
Character: HL-1 — small iron golem brawler with oversized metal gauntlets
Tribe look: steel tribe: silver-grey and muted blue, boxy plate armour, broad shoulders
Rarity: common (simple, few ornaments)
Pose: idle battle stance, fists raised
Key feature: huge riveted fists, glowing blue eye slit
```

## 8. ฉากสนาม (ทำหลังได้ตัวละคร 3–4 ตัว)
- 1 ภาพ ขนาด 1920×1080 ภาพวาดนุ่ม (ไม่ใช่พิกเซล) มุมมองจากด้านข้างเฉียงลง ลานหินกลางป่า/ซากปราสาท แสงเย็น ตรงกลางโล่งให้ตัวละครยืน 2 ฝั่ง
- เบลอขอบบน/ล่าง ฝุ่นแสง และไฟ = โค้ดทำ
