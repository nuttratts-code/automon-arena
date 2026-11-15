# เจนเสาหินใหม่ 4 แบบ (set 238) — คำสั่ง Gemini + ขั้นตอน Hunyuan3D

เป้าหมาย: ลายผิวหินต้องคมเหมือนหินรูนต้นใหญ่ (StoneBig) — รอยแตก เม็ดหิน ไลเคน ชัด ไม่เบลอเป็นริ้ว

## วิธีใช้ (ทำทุกครั้ง)
1. แนบ **ภาพมุมกล้องเกม** (target_lowangle_clean) ไปกับคำสั่ง เพื่อให้สีและสไตล์ตรงกับฉาก
2. วาง **คำสั่งกลาง** แล้วต่อด้วย **คำสั่งเฉพาะชิ้น** ของหินก้อนนั้น
3. เจน **ทีละก้อน ทีละภาพ**
4. ตรวจภาพ: ถ้ามีตัวอักษรจริง (F, P, R, ᚠ) หรือพื้นผิวเบลอ/เรียบเกินไป → เจนใหม่
5. ใน Hunyuan3D: อัปโหลดภาพ → สร้างโมเดลพร้อมลายผิว → เลือก **คุณภาพลายผิวสูงสุด** (ถ้ามีปุ่ม HD / enhance texture ให้เปิด) → ดาวน์โหลด **.glb**
6. หมุนดูในเว็บก่อนโหลด: ถ้าลายผิวเลือนเป็นแถบ → เจนซ้ำ (อาจต้อง 2–3 รอบ)
7. ส่ง .glb ทั้ง 4 ไฟล์ในแชทใหม่ พร้อมบอกว่าไฟล์ไหนคือหินแบบไหน

## คำสั่งกลาง (ใช้กับทุกก้อน)
```
Use the attached picture as the style and colour reference. Paint ONE single isolated standing stone only,
centred, the whole stone visible with empty margin around it, nothing cropped. Three-quarter front view from
slightly above (about 20 degrees), as a 3D model reference: clear silhouette, readable form on all visible sides.
Crisp, highly detailed stone surface: sharp cracks and chips, visible rock grain, small lichen speckles, moss with
clear edges. Everything in sharp focus, no blur, no smudged or streaky brush strokes, no depth of field.
Soft even daylight from the upper left, gentle shadows, no black shadows, no cast shadow on the floor,
no ground plane, no scenery, no text, no watermark.
Background: plain flat light grey (#D0D0D0), no gradient.
```

## คำสั่งเฉพาะชิ้น
| # | แทนหิน | คำสั่งเฉพาะชิ้น (วางต่อท้ายคำสั่งกลาง) |
|---|---|---|
| 1 | หินตั้งสูง | `A tall standing stone (menhir), about 2 times taller than wide, slightly irregular rounded top, deep vertical cracks, moss on the lower third, warm grey stone. Two or three small carved invented abstract glyphs on the front face, NOT real runes, NOT Latin letters.` |
| 2 | หินสูงเรียบมีมอส | `A tall plain standing stone, about 2 times taller than wide, flat front face, no carvings, weathered warm grey stone with thick moss patches on the top and down one side.` |
| 3 | หินหักทรงเรียว | `A broken standing stone that tapers toward a snapped jagged top, about 2 times taller than wide, no carvings, sharp fracture surface at the top, moss and small grass tufts at its foot.` |
| 4 | หินหักทรงเหลี่ยม | `A blocky broken standing stone, square-ish cross-section, about 1.5 times taller than wide, jagged broken top with chipped corners, no carvings, moss in the cracks and at its foot.` |
