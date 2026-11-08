# Rune text review (8 Nov 2026) — NOT applied, waiting for the user
Source: core/stage.js runeText() with current stage-user values (game shows the same text via run.template.html rnDesc).
Checked against core/battle.js, core/runes.js, core/runrunes.js, core/shop.js.

| # | Rune | Now | Problem | Proposed |
|---|---|---|---|---|
| R1 | X1 กระหายเลือด | ดูดเลือด (% ของดาเมจตีตรง ไม่นับไฟ/ช็อต) 30% | WRONG: code counts popped shock (battle.js:633 taken += shock; skill text already says รวมช็อตที่แตก) | ตัวที่ใส่: ดูดเลือด 30% ของดาเมจฮิตนั้น (รวมช็อตที่แตก ไม่นับไฟ) — or change code |
| R2 | T12 · T11 · T10 (+ allyDownDmg) | ดาเมจ +x% | Only normal hits (hitAmp, battle.js:164/628); burn/shock/skill dmg not boosted | ดาเมจตี +x% |
| R3 | T10 สองคนเพื่อนตาย | ตัวเดียว: เหลือตัวเดียว: ดาเมจ +50% คูลดาวน์ −30% | "ตัวเดียว" twice | ตัวที่ใส่: เมื่อเหลือรอดตัวเดียว ดาเมจตี +50% คูลดาวน์ −30% |
| R4 | T8 ธงเผ่า | …พาไปได้ไม่เกินขั้น 6… | tribes have 3 tiers (2/4/6) → cap 6 means nothing | hide cap when ≥ 3 (or "ไม่เกินขั้น 3") |
| R5 | all scope-one stat runes | ตัวเดียว: … | reads as "only one"; specials say ตัวนี้ | ตัวที่ใส่: … |
| R6 | U2 หวนคืน | ฟื้น 1 ครั้ง/แมตช์ ด้วย HP 50% | ฟื้น = heal elsewhere | ชุบชีวิต 1 ครั้ง/แมตช์ ด้วย HP 50% ของ HP สูงสุด |
| R7 | C7 ข่ายแสง | …(ทุกตัวในขอบเขต · ตัวเดียว = ตัวที่ใส่รูน) | editor note shown to players | ทั้งทีม: ทุก 10 วินาที ฟื้น HP 20% ของ HP สูงสุด |
| R8 | U8 เงา | ขายแล้วได้ตัว Lv1 คืนที่ม้านั่ง (1 ครั้ง/run) | English "run"; needs an empty bench slot | ขายตัวนี้ → ได้ตัวเดิม Lv1 คืนที่ม้านั่ง (ต้องมีช่องว่าง) 1 ครั้งต่อเกม |
| R9 | X8 หัวการค้า | ลดหัวใจ 1 ดวง ได้เงิน 25 · ใช้ได้ครั้งเดียวต่อรูน 1 อัน (รอบละครั้ง · …น้อยกว่า 2) | wordy | เสียหัวใจ 1 ดวง รับเงิน 25 · รูนละ 1 ครั้ง ไม่เกินรอบละครั้ง · ต้องมีหัวใจอย่างน้อย 2 |
| R10 | X7 ตามมา | …(ครั้งละชุด · ตีตามต่อไม่ได้) | jargon | …ตีตาม 1 ครั้งต่อการโจมตี 1 ชุด (การตีตามไม่ทำให้ตีตามซ้ำ) |
| R11 | X9 ทำนาย | long | shorter | ก่อนสู้ แตะรูนนี้เพื่อดูทีมศัตรู (ตำแหน่ง เลเวล รูน) |
| R12 | skill runes (none now) | สกิลรูน (ทำงานตอนสู้) | no detail | use skillLine |
| N1 | U3 name | กองรองเท้่าหนัง | typo (extra ่) | กองรองเท้าหนัง |
| N2 | S1 เกราะไม้คู่ · C3 เกราะไม้ | give HP | "เกราะ" is the armor stat → confusing | user renames (or keep) |
| N3 | T6 โล่ไม้คู่ = C5 โล่เหล็กคู่ | both แถวหน้า เกราะตอนเริ่ม +20% | same effect, different rarity | intended? |
