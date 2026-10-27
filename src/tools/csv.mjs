// สร้าง claude/characters.csv จาก core/characters.js (สำเนาให้คนอ่าน)
// รัน: node tools/csv.mjs [ไฟล์ characters.js ชุดก่อนแก้ สำหรับคอลัมน์เทียบ]  → เขียน characters.csv
import { buildCharacterList } from '../core/characters.js';
import { skillLine } from '../game/labels.js';
import { WHEN_KIND } from '../core/rules.js';
import fs from 'fs';
import path from 'path';
const beforeFile = process.argv[2];
const before = beforeFile ? Object.fromEntries((await import(path.resolve(beforeFile))).buildCharacterList().map(c => [c.id, c])) : {};
const q = s => /[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s);
const rows = [['ID','ชื่อชั่วคราว','เผ่า','เผ่าเพิ่ม','ความหายาก','ราคา','แถวแนะนำ','HP Lv1','HP Lv2','HP Lv3','พลังโจมตี Lv1','พลังโจมตี Lv2','พลังโจมตี Lv3','คูลดาวน์ Lv1/2/3 (วิ)','มัลติฮิต Lv1/2/3','ไฟ/ฮิต Lv1/2/3','ช็อต/ฮิต Lv1/2/3','เกราะ/ฮิต Lv1/2/3','ฟื้น/ฮิต Lv1/2/3','สกิล [แท็ก] (ระหว่างสู้ + ร้านค้า)','ดาเมจ/วิ Lv1','ก่อนแก้: HP Lv1','ก่อนแก้: พลังโจมตี Lv1']];
for (const c of buildCharacterList()) {
  const b = before[c.id];
  rows.push([c.id, c.name, c.tribe, c.extraTribes.join(' '), c.rarity, c.price, c.rowHint, ...c.hp, ...c.atk, c.cdMs.map(x => (x / 1000).toFixed(1)).join('/'), c.multi.join('/'),
    c.burn.join('/'), c.shock.join('/'), c.armorHit.join('/'), (c.healHit || [0, 0, 0]).join('/'), c.skills.map(s => '[' + [WHEN_KIND[s.when], ...(s.tags || [])].join(' ') + '] ' + skillLine(s, 0, true)).join(' · ') || 'ไม่มีสกิล',
    (c.atk[0] * c.multi[0] / (c.cdMs[0] / 1000)).toFixed(1), b ? b.hp[0] : '-', b ? b.atk[0] : '-']);
}
fs.writeFileSync('characters.csv', '﻿' + rows.map(r => r.map(q).join(',')).join('\n') + '\n');
console.log('characters.csv', rows.length - 1, 'ตัว');
