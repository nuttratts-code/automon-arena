// วิธีวัดบาลานซ์มาตรฐาน (ตกลง 21 ต.ค.) · รันด้วย node lab/measure.mjs [แมตช์] [เมล็ด]
// - ทีมสุ่ม 6 ตัว วางตามแถวแนะนำ · วัด 4 ชุด: เลเวลผสม + Lv1 + Lv2 + Lv3 (เมล็ดเดิมทุกครั้ง)
// - ผ่าน = เลเวลผสมห่างเป้าไม่เกิน ±6 จุด และแต่ละเลเวลไม่เกิน ±10 จุด (ค่าเสนอ · ตกลง 21 ต.ค.)
//   เป้า = สูตรใน lab/formula.mjs (ค่าเฉลี่ย + ขั้นตามความหายาก −10/−5/0/+5/+15 − ส่วนลดสกิลร้านค้า · set 122)
// - ใกล้ขอบ = ผสมห่าง ≥5 หรือรายเลเวล ≥9 → วัดซ้ำด้วยแมตช์มากขึ้นก่อนสรุป
// - แมตช์เริ่มต้น 12000 ≈ 3000 ครั้งที่ลงสนามต่อตัว (มากกว่าขั้นต่ำ 1,000)
// - ชุด 19: --tribes HL,PL,SF,WY = วัดเฉพาะตัวที่เผ่าหลักอยู่ในรายการ (ทีมสุ่มก็สุ่มจากกลุ่มนี้ · เป้า/ค่าเฉลี่ยคิดในกลุ่มนี้) · ไม่ใส่ = วัดปกติทุกเผ่า
// - ชุด 17: แมตช์ที่ตัวตัดนิรภัยหยุด (ฮิต/ผลสกิลเกินเพดาน) พิมพ์บรรทัด "ผิดปกติ" = ไม่ผ่าน ห้ามเผยแพร่
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { measureAll, verdict, MEASURE } from './analyze.js';
import fs from 'fs';

// ชุด 13: ตัววัดย้ายไปอยู่ใน lab/analyze.js (measureAll) ห้องบาลานซ์ใช้ตัวเดียวกัน
export const BAND = MEASURE.band, NEAR = MEASURE.near, LV_BAND = MEASURE.lvBand;
export const measure = (chars, { n = 12000, seed = 4242, levels = MEASURE.levels } = {}) => measureAll(chars, RULES, { n, seed, levels });

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2), ti = args.indexOf('--tribes');
  const only = ti >= 0 ? args.splice(ti, 2)[1].split(',').map(t => t.trim()).filter(Boolean) : null;
  if (only && !only.every(t => /^[A-Z]{2}$/.test(t))) throw new Error('--tribes ต้องเป็นรหัสเผ่า 2 ตัวอักษร คั่นด้วย , เช่น HL,PL');
  const all = buildCharacterList(), chars = only ? all.filter(c => only.includes(c.id.split('-')[0])) : all;
  if (only) console.log(`กรองเผ่า ${only.join(',')} (เผ่าหลักตาม ID) · ${chars.length}/${all.length} ตัว · ผลเทียบเกมจริงไม่ได้`);
  const r = await measure(chars, { n: +(args[0] || 12000), seed: +(args[1] || 4242) });
  fs.writeFileSync('lab/measure-result.json', JSON.stringify(r, null, 1));
  const name = Object.fromEntries(chars.map(c => [c.id, c.name]));
  console.log(`แมตช์ต่อชุด ${r.n} · เมล็ด ${r.seed} · เวลาแมตช์เฉลี่ย`, r.avgTime);
  const ab = Object.values(r.aborted || {}).reduce((a, b) => a + b, 0);
  if (ab) console.log(`ผิดปกติ ${ab} แมตช์ถูกตัวตัดนิรภัยหยุด (รายชุด ${JSON.stringify(r.aborted)}) · ตัวอย่างทีม ${JSON.stringify(r.abortSample)}`);
  for (const c of chars) {
    const e = Object.fromEntries(Object.entries(r.levels).map(([lv, m]) => [lv, m[c.id].err]));
    const v = verdict(e), out = v === 'out';
    if (v !== 'ok') console.log(`${out ? 'หลุด' : 'ใกล้ขอบ'} ${c.id} (${name[c.id]}) ผสม ${e.mix} · Lv1 ${e[1]} · Lv2 ${e[2]} · Lv3 ${e[3]}`);
  }
  console.log('เผ่าในทีมที่ชนะ (เลเวลผสม):', Object.fromEntries(Object.entries(r.tribeWin).map(([k, v]) => [k, +v.inWinners.toFixed(1)])));
}
