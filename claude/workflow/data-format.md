# workflow · รูปแบบข้อมูลตัวละครและสกิล (core/characters.js)

V1.22 · 24 ต.ค. 2026 · แยกจาก workflow.md V1.21 (เนื้อหาเดิม ไม่ตัด · เลขหัวข้อเดิมคงไว้ให้อ้างอิงได้)

## 7. รูปแบบข้อมูลตัวละคร (core/characters.js)
- ROWS: `[ID, ชื่อ, เผ่า, เผ่าเพิ่ม, ความหายาก, ราคา, แถว, HP[3], ATK[3], คูลดาวน์วิ (ตัวเลขเดียว หรือ [3]), มัลติฮิต[3], ไฟ[3], ช็อต[3], เกราะ/ฮิต[3]?, ฟื้น/ฮิต[3]?]` (V1.12 · ฟื้น/ฮิต ต้องมีเกราะ/ฮิตก่อน ใส่ [0,0,0] ได้ · apply-config และ csv.mjs รู้จักแล้ว)
- SKILLS: `{ when, do, to, v[3], cd?(ms), lv?[...], chance?, tags?, summon?(ID เฉพาะ do: 'summon'), perm?(true · สกิลระหว่างสู้ที่ตั้งถาวร เฉพาะ do ที่มี DO_INFO.perm) }` · ฟื้น HP ใช้ได้เฉพาะเผ่าภูติและอสูร
- ผลแบบ % ของ: do = dmgOf / burnOf / shockOf / armorOf / healOf / reflectOf (V1.4) / atkOf ฯลฯ + `of: { stat: atk|armor|maxHp|hp|hpLost|burn|shock, who: self|each|ctx|allEnemies|allAllies|laneEnemies|rowEnemies|laneAllies|rowAllies }` · ผลเดิม (dmgPctAtk dmgPctArmor dmgPctEnemyBurn armorPct healPct burnPctArmor) ห้ามใช้ในข้อมูลใหม่ · แบ่งเกราะ to = ผู้รับ (allAllies = ทั้งทีม)
- ผู้รับฝ่ายเรา: backAlly = ช่องติดกันข้างหลังเท่านั้น · backLaneAlly = ตัวใกล้สุดข้างหลังในเลน ข้ามช่องว่าง (V1.4) · allyAt + `at: { row: front|mid|back|any, lane: same|other|both }` (ชุด 14) · `sameTribe: true` กรองเผ่าเดียวกันได้กับผู้รับฝ่ายเรา (ตรวจด้วย sameTribeOk ใน rules.js)
- สกิลหลังสู้/ร้านค้า: do = permHp/permAtk/permArmor/permBurn/permShock/permMulti/permCdPct หรือ perm_<ชนิด> (สร้างอัตโนมัติจาก DO_INFO.perm · คู่กับผลระหว่างสู้ใน SHOP_PAIR) · ค่าถาวรแบบ % เก็บเป็นชนิด hpPct atkPct burnPct shockPct armorHitPct
- ช่องสกิลเสริม (V1.10 · ชุด 17): `skipSameId: true` (ไม่ให้ผลกับตัวอื่นที่ ID เดียวกัน · ตรวจด้วย skipSameIdOk ใน rules.js) · `cdGrow: 1–500` (% ที่คูลดาวน์สกิลยาวขึ้นทุกครั้งที่ใช้ · ต้องมี cd) · apply-config.mjs รู้จักทั้งสองช่องแล้ว
- ผลใหม่ชุด 20: `{ when: 'hit', do: 'allyStrike', to: 'allyRandom', sameTribe: true, v: [ฮิต] }` (พาเพื่อนไปตีเป้าเดียวกัน · ไม่เข้าคิว ตีทันทีใน trigger · เหตุการณ์ 'carry') · `{ do: 'cleansePct', v: [%] }` (เหตุการณ์ cleanse what:'pct') · `{ when: 'passive', do: 'reflectDebuff', to: 'allAllies', v: [%] }` (เพดาน RULES.reflectDebuffMaxPct · เหตุการณ์ 'reflectDebuff') · ฮิต 1 ครั้งอยู่ในฟังก์ชัน strike() ใน battle.js (ใช้ร่วมกับฮิตที่ถูกพาไป)
- (ชุด 21) ลำดับใน tick ต้องไม่ขึ้นกับฝั่ง: ผลที่ทำทันทีระหว่างฮิตหรือข้ามฝั่ง ให้เก็บคิวแล้วทำหลังคิวที่เกี่ยวข้อง (ดู reflQ revQ summons) · คิวสถานะ/ฟื้นใช้ drainS/drainH · เพิ่มกลไกใหม่ที่อ่าน/แก้ค่าของอีกฝั่ง ต้องตรวจสลับฝั่งเสมอ
- ผลการต่อสู้ `simulate().aborted` = 'hits' | 'effects' เมื่อตัวตัดนิรภัยหยุด (ผล = เสมอ)
- ผลการต่อสู้ `simulate().perm` = [{ side, row, lane, id, key, amount }] → ส่งให้ `endMatch(st, won, chars, rules, gains)` ของฝั่งนั้น
