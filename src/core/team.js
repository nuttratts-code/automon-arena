import { RULES, SHARE_TO, SHOP_WHEN, TRIBES, upMul } from './rules.js';
// Godot port (set 195): also in godot/scripts/team.gd (golden (d) teams.jsonl exact, tests/test_team.gd) — change both
import { validateTeam } from './validate.js';
// ตัวจัดทีมกลาง: ตัวละคร + เลเวล + ค่าถาวร → ทีมพร้อมสู้ · ทุกหน้า (เกม, Lab) ใช้ตัวนี้ตัวเดียว


export const pctOf = (base, pct) => (pct ? upMul(base, 1 + pct / 100) : base);

export function makeCharMap(chars) {
  const m = Object.create(null);
  for (const c of chars) m[c.id] = c;
  return m;
}

// คืนรายการนักสู้ (ยังไม่มีสถานะระหว่างสู้) · ทีมผิดกฎ → โยน error พร้อมเหตุผล
export function buildTeam(entries, charMap, rules = RULES) {
  const check = validateTeam(entries, charMap, rules);
  if (!check.ok) { const err = new Error('ทีมไม่ถูกกฎ: ' + check.errors.join(' · ')); err.details = check.errors; throw err; }
  return entries.map(e => unitOf(charMap[e.id], e, rules, charMap));
}

// นักสู้ 1 ตัวจากข้อมูลตัวละคร · สกิลเรียกตัว (summon) แนบตัวที่จะเรียกไว้ล่วงหน้า (เลเวลเดียวกัน ช่องเดิม ไม่มีค่าถาวร)
export function unitOf(c, e, rules, charMap) {
  {
    const L = e.level - 1, p = e.perm || {};
    const cdPct = Math.min(p.cdPct || 0, rules.permCaps.cdPct ?? Infinity);
    const cdMult = Math.max(0, 1 - cdPct / 100); // ชุด 27: ไม่มีเพดาน → เกิน 100% ไม่ติดลบ (คูลดาวน์จริงติดขั้นต่ำ minCooldownMs ใน battle.js)
    return {
      id: c.id, name: c.name, tribe: c.tribe, extraTribes: c.extraTribes.slice(), level: e.level,
      row: e.row, lane: e.lane,
      // ค่าถาวรแบบ % (ชุด 6): คิดจากค่าเลเวลปัจจุบัน + ค่าถาวรแบบตัวเลข แล้วปัดลง
      maxHp: pctOf(c.hp[L] + (p.hp || 0), p.hpPct),
      atk: pctOf(c.atk[L] + (p.atk || 0), p.atkPct),
      startArmor: Math.min(p.armor || 0, rules.permCaps.armor ?? Infinity), // เกราะเริ่มมาจากค่าถาวรเท่านั้น (เกราะตอนเริ่มของตัวละครเป็นสกิล 19 ต.ค.)
      burnHit: pctOf(c.burn[L] + Math.min(p.burn || 0, rules.permCaps.burn ?? Infinity), p.burnPct),
      shockHit: pctOf(c.shock[L] + Math.min(p.shock || 0, rules.permCaps.shock ?? Infinity), p.shockPct),
      // ความสามารถถาวรจากสกิลระหว่างสู้ที่ตั้งถาวร (22 ต.ค.) · ไม่มีเพดาน
      cdStart: p.cdStart || 0, shareArmor: p.shareArmor || 0, healToAtk: p.healToAtk || 0,
      armorAmp: p.armorAmp || 0, cdAmp: p.cdAmp || 0, shockAmp: p.shockAmp || 0, burnNoDecay: (p.burnNoDecay || 0) > 0,
      healAmp: p.healAmp || 0, hitAmp: p.hitAmp || 0, burnAmp: p.burnAmp || 0,
      shareTo: Object.fromEntries(SHARE_TO.filter(t => p['share_' + t] > 0).map(t => [t, p['share_' + t]])), // แบ่งเกราะถาวรแยกผู้รับ (ชุด 7)
      armorHit: pctOf((c.armorHit ? c.armorHit[L] : 0) + (p.armorHit || 0), p.armorHitPct), // เกราะ/ฮิต (ค่าถาวรได้จากชุด 6)
      healHit: (c.healHit ? c.healHit[L] : 0) + (p.healHit || 0), // ฟื้น/ฮิต (ชุด 18) · ค่าถาวรได้จากสกิลถาวร healHitUp (28 ต.ค.)
      multi: c.multi[L] + Math.min(p.multi || 0, rules.permCaps.multi ?? Infinity), // มัลติฮิตแยกเลเวล (19 ต.ค.)
      cdMs: Math.max(0, Math.round((c.cdMs[L] - (p.cdMs || 0)) * cdMult)), // คูลดาวน์แยกเลเวล (20 ต.ค.) · ค่าถาวรลดเป็นมิลลิวินาที (ชุด 6) · ค่าต่ำสุดตัดตอนสู้
      // สกิลร้านค้าไม่ใช้ระหว่างสู้ · สกิลที่ระบุเลเวลใช้เฉพาะเลเวลนั้น · idx = ลำดับสกิลบนการ์ด (ใช้แสดงผลจำลอง)
      skills: c.skills.map((s, idx) => ({ ...s, idx })).filter(s => !SHOP_WHEN.includes(s.when) && (!s.lv || s.lv.includes(e.level))).map(s => {
        const x = { ...s, value: s.v[L] };
        if (s.do === 'summon') { const t = charMap && Object.prototype.hasOwnProperty.call(charMap, s.summon) ? charMap[s.summon] : null; if (t && t.id !== c.id) { const u = unitOf(t, { id: t.id, level: e.level, row: e.row, lane: e.lane }, rules, null); u.skills = u.skills.filter(y => y.do !== 'summon'); x.unit = u; } }
        return x;
      }),
    };
  }
}

// นับเผ่าบนบอร์ด: ตัวซ้ำชื่อเดียวกันนับครั้งเดียว · เผ่าเพิ่มนับด้วย · ตัวที่ล้มยังนับ
export function countTribes(entries, charMap) {
  const counts = Object.fromEntries(TRIBES.map(t => [t, 0]));
  const ids = new Set(entries.map(e => e.id));
  for (const id of ids) {
    const c = charMap[id];
    if (!c) continue;
    for (const t of [c.tribe, ...c.extraTribes]) counts[t]++;
  }
  return counts;
}

// ขั้นโบนัสที่เปิด (2/4/6) · ตัวเลขโบนัสพักไว้ จึงยังไม่มีผลในการต่อสู้
export function tribeSteps(counts, rules = RULES) {
  const out = {};
  for (const [t, n] of Object.entries(counts)) {
    const step = rules.tribeSteps.filter(s => n >= s).pop() || 0;
    if (step) out[t] = step;
  }
  return out;
}

