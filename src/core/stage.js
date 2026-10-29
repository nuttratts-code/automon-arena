// Stage mode (demo) data — phase 1 (29 Oct 2026): runes, bosses, stage settings that the Balance Room edits.
// The battle engine does NOT use these yet (phase 2). Every number = proposal (ค่าเสนอ) until the user confirms.
// Design notes: claude/backlog.md "Stage mode" · claude/review-2026-10-28-runes.md · claude/review-2026-10-29-stage-baseline.md
import { TRIBES } from './rules.js';

// Rune fields: [key, label, default, min, max, unit] · text uses {key} for the value.
export const STAGE_RUNES = [
  { id: 'T1', kind: 'team', name: 'ทอง', text: 'ได้เงินเพิ่ม {gold} ทุกด่าน', f: [['gold', 'เงิน/ด่าน', 2, 0, 20, '']] },
  { id: 'T2', kind: 'team', name: 'ดอกเบี้ย', text: 'มีเงินเก็บทุก {per} ได้เพิ่ม {gold} (สูงสุด {max})', f: [['per', 'ทุกๆ เงิน', 5, 1, 50, ''], ['gold', 'ได้เพิ่ม', 1, 0, 10, ''], ['max', 'สูงสุด', 3, 0, 20, '']] },
  { id: 'T3', kind: 'team', name: 'แผงใหญ่', text: 'ร้านเพิ่ม {slots} ช่อง', f: [['slots', 'ช่องเพิ่ม', 1, 0, 3, '']] },
  { id: 'T4', kind: 'team', name: 'สุ่มฟรี', text: 'สุ่มร้านฟรี {free} ครั้งต่อรอบ', f: [['free', 'ครั้งฟรี/รอบ', 1, 0, 5, '']] },
  { id: 'T5', kind: 'team', name: 'คม', text: 'ดาเมจทั้งทีม +{dmgPct}%', f: [['dmgPct', 'ดาเมจ', 15, 0, 200, '%']] },
  { id: 'T6', kind: 'team', name: 'แนวหน้า', text: 'แถวหน้าได้เกราะ {armorPct}% ของ HP สูงสุด ตอนเริ่มแมตช์', f: [['armorPct', 'เกราะ', 20, 0, 200, '%']] },
  { id: 'T7', kind: 'team', name: 'แนวหลัง', text: 'แถวหลังคูลดาวน์ −{cdPct}%', f: [['cdPct', 'คูลดาวน์ลด', 15, 0, 80, '%']] },
  { id: 'T8', kind: 'team', name: 'ธงเผ่า', text: 'เผ่าที่เลือกนับเพิ่ม {count} ตัว (รูนนี้พาไปได้ไม่เกินขั้น {maxTier})', f: [['count', 'นับเพิ่ม', 1, 0, 4, 'ตัว'], ['maxTier', 'ขั้นสูงสุด', 4, 2, 6, '']] },
  { id: 'T9', kind: 'team', name: 'ล่าบอส', text: 'ดาเมจใส่บอส +{dmgPct}%', f: [['dmgPct', 'ดาเมจใส่บอส', 40, 0, 300, '%']] },
  { id: 'T10', kind: 'team', name: 'คนสุดท้าย', text: 'เหลือตัวเดียว: ดาเมจ +{dmgPct}% คูลดาวน์ −{cdPct}%', f: [['dmgPct', 'ดาเมจ', 50, 0, 300, '%'], ['cdPct', 'คูลดาวน์ลด', 30, 0, 80, '%']] },
  { id: 'T11', kind: 'team', name: 'เติบโต', text: 'ชนะติดกัน ดาเมจ +{stepPct}% ต่อด่าน (สูงสุด {maxPct}%) แพ้แล้วรีเซ็ต', f: [['stepPct', 'ต่อด่าน', 3, 0, 50, '%'], ['maxPct', 'สูงสุด', 30, 0, 300, '%']] },
  { id: 'T12', kind: 'team', name: 'แก้วบาง', text: 'ดาเมจ +{dmgPct}% แต่ HP สูงสุดทั้งทีม −{hpPct}%', f: [['dmgPct', 'ดาเมจ', 35, 0, 300, '%'], ['hpPct', 'HP ลด', 20, 0, 90, '%']] },
  { id: 'U1', kind: 'unit', name: 'DNA', text: 'เพิ่มเผ่าที่เลือก {tribes} เผ่า (นับเฉพาะโบนัสเผ่า)', f: [['tribes', 'เผ่าเพิ่ม', 1, 0, 2, '']] },
  { id: 'U2', kind: 'unit', name: 'ชุบ', text: 'ฟื้น {times} ครั้ง/แมตช์ ด้วย HP {hpPct}%', f: [['times', 'ครั้ง/แมตช์', 1, 0, 3, ''], ['hpPct', 'HP ตอนฟื้น', 50, 1, 100, '%']] },
  { id: 'U3', kind: 'unit', name: 'เร่ง', text: 'คูลดาวน์ −{cdPct}%', f: [['cdPct', 'คูลดาวน์ลด', 20, 0, 80, '%']] },
  { id: 'U4', kind: 'unit', name: 'โล่', text: 'เกราะ {armorPct}% ของ HP สูงสุด และศัตรูต้องตีตัวนี้ก่อน', f: [['armorPct', 'เกราะ', 30, 0, 300, '%']] },
  { id: 'U5', kind: 'unit', name: 'เพลิงติด', text: 'ตีแต่ละฮิตติดไฟ +{burn}', f: [['burn', 'ไฟ/ฮิต', 2, 0, 50, '']] },
  { id: 'U6', kind: 'unit', name: 'ลูกโซ่', text: 'มัลติฮิต +{multi}', f: [['multi', 'มัลติฮิต', 1, 0, 3, '']] },
  { id: 'U7', kind: 'unit', name: 'คงทน', text: 'ค่าถาวรที่ได้ +{permPct}%', f: [['permPct', 'ค่าถาวร', 50, 0, 300, '%']] },
  { id: 'U8', kind: 'unit', name: 'เงา', text: 'ขายแล้วได้ตัว Lv1 คืนที่ม้านั่ง ({times} ครั้ง/run)', f: [['times', 'ครั้ง/run', 1, 0, 3, '']] },
];

// Boss special rules: [id, label, default value, min, max, unit] (unit '' with max 0 = no value)
export const BOSS_RULES = [
  ['none', 'ไม่มีกฎพิเศษ', 0, 0, 0, ''],
  ['backSilence', 'แถวหลังของผู้เล่นใช้สกิลไม่ได้ ช่วงแรก (วิ)', 10, 1, 180, 'วิ'],
  ['healCut', 'ผู้เล่นฟื้นเลือดได้น้อยลง', 50, 1, 100, '%'],
  ['armorCut', 'เกราะผู้เล่นลดลง', 50, 1, 100, '%'],
  ['tribeOff', 'ปิดโบนัสเผ่าของผู้เล่น', 0, 0, 0, ''],
  ['enrage', 'บอสตีแรงขึ้นทุก 10 วิ', 20, 1, 200, '%'],
  ['reflect', 'สะท้อนดาเมจกลับ', 10, 1, 100, '%'],
  ['cdSlow', 'คูลดาวน์ผู้เล่นช้าลง', 20, 1, 200, '%'],
];
// Boss stats = at its first appearance (stage 5) · stage 10 = × mult10 · after stage 10 each boss + endlessPct%
export const BOSS_STATS = [['hp', 'HP', 1, 1e6], ['atk', 'พลังโจมตี', 0, 1e5], ['cdMs', 'คูลดาวน์ (มิลลิวินาที)', 300, 60000], ['multi', 'มัลติฮิต', 1, 10], ['armor', 'เกราะเริ่ม', 0, 1e6], ['burn', 'ไฟ/ฮิต', 0, 1e4], ['shock', 'ช็อต/ฮิต', 0, 1e4]];
const stageBoss = (id, name, tribe, hp, atk, cdMs, rule, ruleV) => ({ id, name, tribe, hp, atk, cdMs, multi: 1, armor: 0, burn: 0, shock: 0, rule, ruleV, mult10: 2, endlessPct: 15, on: true });
// Sized from the stage baseline (median player at stage 5: ~7 dmg/s, team HP ~756) → boss lasts ~60 s, kills the team in ~60 s.
export const STAGE_BOSSES = [
  stageBoss('B1', 'ผู้เฝ้าประตู', 'เหล็กกล้า', 450, 25, 2000, 'armorCut', 50),
  stageBoss('B2', 'เงาหลังม่าน', 'ภูติ', 400, 22, 1800, 'backSilence', 10),
  stageBoss('B3', 'อสุรกายคลั่ง', 'อสูร', 420, 20, 2000, 'enrage', 20),
  stageBoss('B4', 'กระจกสะท้อน', 'สายฟ้า', 380, 22, 2000, 'reflect', 10),
];
export const STAGE_SETTINGS = [
  ['bossEvery', 'บอสทุกกี่ด่าน', 5, 1, 20, 'ด่าน'], ['bossesPerRun', 'บอสใน run หลัก', 2, 1, 10, 'ตัว'],
  ['dropHard', 'โอกาสได้รูน ด่านยาก', 50, 0, 100, '%'], ['dropNormal', 'โอกาสได้รูน ด่านกลาง', 30, 0, 100, '%'], ['dropEasy', 'โอกาสได้รูน ด่านง่าย', 10, 0, 100, '%'], ['dropBoss', 'โอกาสได้รูน บอส', 100, 0, 100, '%'],
];

export function stageDefaults() {
  return {
    runes: Object.fromEntries(STAGE_RUNES.map(r => [r.id, { on: true, ...Object.fromEntries(r.f.map(([k, , v]) => [k, v])) }])),
    bosses: STAGE_BOSSES.map(b => ({ ...b })),
    settings: Object.fromEntries(STAGE_SETTINGS.map(([k, , v]) => [k, v])),
  };
}

// External data (database / pasted code) → only known keys, numbers in range, names cleaned. Unknown/bad parts fall back to defaults.
export function cleanStage(o) {
  const out = stageDefaults();
  if (!o || typeof o !== 'object') return out;
  const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  if (isObj(o.runes)) for (const r of STAGE_RUNES) {
    const x = o.runes[r.id]; if (!isObj(x)) continue;
    if (typeof x.on === 'boolean') out.runes[r.id].on = x.on;
    for (const [k, , , lo, hi] of r.f) if (num(x[k], lo, hi)) out.runes[r.id][k] = x[k];
  }
  if (isObj(o.settings)) for (const [k, , , lo, hi] of STAGE_SETTINGS) if (num(o.settings[k], lo, hi)) out.settings[k] = o.settings[k];
  if (Array.isArray(o.bosses) && o.bosses.length >= 1 && o.bosses.length <= 12) {
    const ids = new Set(), list = [];
    for (const x of o.bosses) {
      if (!isObj(x) || typeof x.id !== 'string' || !/^B\d{1,2}$/.test(x.id) || ids.has(x.id)) continue;
      ids.add(x.id);
      const base = STAGE_BOSSES.find(b => b.id === x.id) || stageBoss(x.id, 'บอสใหม่', TRIBES[0], 400, 20, 2000, 'none', 0);
      const b = { ...base };
      const nm = typeof x.name === 'string' ? x.name.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 24) : ''; if (nm) b.name = nm;
      if (TRIBES.includes(x.tribe)) b.tribe = x.tribe;
      for (const [k, , lo, hi] of BOSS_STATS) if (num(x[k], lo, hi)) b[k] = x[k];
      const rule = BOSS_RULES.find(r => r[0] === x.rule); if (rule) { b.rule = rule[0]; b.ruleV = rule[4] ? (num(x.ruleV, rule[3], rule[4]) ? x.ruleV : rule[2]) : 0; }
      if (num(x.mult10, 0.1, 20)) b.mult10 = x.mult10;
      if (num(x.endlessPct, 0, 500)) b.endlessPct = x.endlessPct;
      if (typeof x.on === 'boolean') b.on = x.on;
      list.push(b);
    }
    if (list.length) out.bosses = list;
  }
  return out;
}

// Boss stats at a stage (k = 1 first boss, 2 second, 3+ endless) — for display now, battle later.
export function bossAt(b, k) {
  const m = k <= 1 ? 1 : b.mult10 * (1 + b.endlessPct / 100) ** Math.max(0, k - 2);
  return { hp: Math.round(b.hp * m), atk: Math.round(b.atk * m), armor: Math.round(b.armor * m), dps: b.atk * m * b.multi / (b.cdMs / 1000) };
}
