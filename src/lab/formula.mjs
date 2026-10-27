// สูตรบาลานซ์ (19 ต.ค. 2026 · ปรับ 20 ต.ค.) · รันด้วย node lab/formula.mjs [รอบ] [แมตช์ต่อรอบ] [เมล็ด] [เผ่าที่ปรับ]
// ไม่ได้อยู่ในหน้าเว็บ ใช้ปรับ core/characters.js แล้วให้คนตรวจก่อนใช้จริง
//
// สูตร (ค่าเสนอ ปรับได้ที่ FORMULA ด้านล่าง):
//   เป้าอัตราชนะของตัวละคร = ค่าเฉลี่ยทั้งเกม + SLOPE × (ราคา − 5) − SHOP_DISCOUNT (ถ้ามีสกิลร้านค้า)
//   วัดอัตราชนะด้วยตัวคำนวณเดียวกับเกม: ทีมสุ่ม 6 ตัว เลเวลผสม วางตามแถวแนะนำ (แบบห้องบาลานซ์)
//   ตัวที่ห่างจากเป้า → ปรับ HP และพลังโจมตีพร้อมกัน (ผลคูณ HP × พลังโจมตีเปลี่ยนตามตัวคูณ²)
//   20 ต.ค.: ปรับทุกเลเวลด้วยตัวคูณเดียวกัน (คงสัดส่วน Lv1/2/3 ที่ผู้ออกแบบตั้งไว้) · ไม่ปรับค่าพลังรวมทั้งเกม
//   ตัวใน FIXED และตัวนอกเผ่าที่เลือก ไม่ปรับ (แต่ยังนับในค่าเฉลี่ย)
//   สกิล ความเร็ว มัลติฮิต ไฟ/ช็อต/เกราะต่อฮิต ไม่แตะ (เป็นตัวตนของตัวละคร)
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { charRanking, targetsFor } from './analyze.js';

export const FORMULA = {
  SLOPE: 5,            // อัตราชนะเพิ่มกี่ % ต่อราคา +1 (ราคา 3/4/5/6/8 → −10 / −5 / 0 / +5 / +15) · 20 ต.ค. ผู้ใช้ขอให้ห่างกันมากขึ้น (เดิม 2.5)
  SHOP_DISCOUNT: 2,    // ตัวที่มีสกิลร้านค้า เป้าต่ำลง (ค่าของสกิลร้านค้าไม่โผล่ในการวัดการต่อสู้)
  STEP: 0.012,         // ความแรงในการปรับต่อ 1% ที่ห่างเป้า
  MAX_STEP: 0.12,      // ปรับได้ไม่เกิน ±12% ต่อรอบ
  FIXED: [],           // 21 ต.ค.: WY-8 ใส่คูลดาวน์สกิลแล้ว เอาออกจากรายการที่ไม่ปรับ
};

// เป้า (targetsFor) ย้ายไปอยู่ใน lab/analyze.js ชุด 13 ให้ห้องบาลานซ์ใช้สูตรเดียวกัน · SLOPE/SHOP_DISCOUNT ด้านบนเหลือไว้อ้างอิง (ค่าจริงอยู่ที่ TARGET_RULE)
export { targetsFor };

// ตัวคูณสะสมคิดจากค่าตั้งต้นทุกครั้ง (กันปัดเศษสะสมจนสัดส่วนเลเวลเพี้ยน) · ปัดพลังโจมตีแล้วชดเชยด้วย HP รายเลเวล
const BASE = new Map();
function rescale(c, f) {
  if (!BASE.has(c.id)) BASE.set(c.id, { hp: c.hp.slice(), atk: c.atk.slice(), f: 1 });
  const b = BASE.get(c.id); b.f *= f;
  c.atk = b.atk.map(a => Math.max(1, Math.round(a * b.f)));
  c.hp = b.hp.map((h, L) => Math.max(10, Math.round(h * (b.f * b.f) / (c.atk[L] / b.atk[L]) / 5) * 5));
}

export async function tune(chars, { rounds = 8, n = 12000, seed = 4242, tribe = null, only = null, log = console.log } = {}) {
  let last;
  const canTune = c => !FORMULA.FIXED.includes(c.id) && (!tribe || c.tribe === tribe) && (!only || only.includes(c.id));
  for (let k = 0; k <= rounds; k++) {
    const res = await charRanking(chars, RULES, { n, seed, level: 'mix' });
    const mean = res.rows.reduce((a, r) => a + r.win, 0) / res.rows.length;
    const tg = targetsFor(chars, mean);
    const err = Object.fromEntries(res.rows.map(r => [r.id, r.win - tg[r.id]]));
    const mine = chars.filter(canTune).map(c => Math.abs(err[c.id]));
    log(`รอบ ${k}: ตัวที่ปรับ ห่างเป้ามากสุด ${Math.max(...mine).toFixed(1)}% · เฉลี่ย ${(mine.reduce((a, x) => a + x, 0) / mine.length).toFixed(2)}% · แมตช์ ${res.avgTime.toFixed(1)} วิ`);
    last = { res, err, mean, tg };
    if (k === rounds) break;
    chars.forEach(c => { if (canTune(c)) rescale(c, Math.exp(Math.max(-FORMULA.MAX_STEP, Math.min(FORMULA.MAX_STEP, -FORMULA.STEP * err[c.id])))); });
  }
  return last;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // ชุด 19: --tribes HL,PL,SF,WY = ทีมสุ่ม/ค่าเฉลี่ยเฉพาะตัวที่เผ่าหลัก (ตาม ID) อยู่ในรายการ (เหมือน lab/measure.mjs)
  const argv = process.argv.slice(), ti = argv.indexOf('--tribes');
  const tribes = ti >= 0 ? argv.splice(ti, 2)[1].split(',').filter(t => /^[A-Z]{2}$/.test(t)) : null;
  const chars = buildCharacterList().filter(c => !tribes || tribes.includes(c.id.split('-')[0]));
  const only = argv[6] ? argv[6].split(',') : null;
  const out = await tune(chars, { rounds: +(argv[2] || 8), n: +(argv[3] || 12000), seed: +(argv[4] || 4242), tribe: argv[5] && argv[5] !== '-' ? argv[5] : null, only });
  const fs = await import('fs');
  fs.writeFileSync('lab/formula-result.json', JSON.stringify({ chars: chars.map(c => ({ id: c.id, hp: c.hp, atk: c.atk })), err: out.err, mean: out.mean, win: Object.fromEntries(out.res.rows.map(r => [r.id, r.win])), target: out.tg }, null, 1));
  console.log('บันทึก lab/formula-result.json');
}
