import { RULES } from './rules.js';
// งบค่าพลัง (combat-rules V1.20): วัดความแรงจากค่าพลังพื้นฐาน ไม่นับสกิล ใช้เป็นราวกันตอนบาลานซ์
// แต้มพลังพื้นฐาน = √(เลือดรวม × ดาเมจต่อวินาที) · คิดแบบเกมสู้เรียลไทม์ (ยืนได้นาน × ตีแรง)
//   ดาเมจต่อวินาที = (พลังโจมตี + ไฟ/ฮิต × ค่าไฟ + ช็อต/ฮิต × ค่าช็อต) × มัลติฮิต ÷ คูลดาวน์
//   เลือดรวม = HP + (เกราะ/ฮิต + ฟื้น/ฮิต) × ฮิตต่อวินาที × เวลายืนโดยประมาณ
// ค่าคงที่อยู่ใน RULES.power (ค่าเสนอ ปรับได้)

export function basePower(c, L = 0, rules = RULES) {
  const k = rules.power, cd = c.cdMs[L] / 1000, hps = c.multi[L] / cd;
  const dps = (c.atk[L] + c.burn[L] * k.burnStack + c.shock[L] * k.shockStack) * hps;
  const ehp = c.hp[L] + ((c.armorHit ? c.armorHit[L] : 0) + (c.healHit ? c.healHit[L] : 0)) * hps * k.armorLifeSec; // ฟื้น/ฮิต นับเป็นเลือดรวมแบบเดียวกับเกราะ/ฮิต (ชุด 18 ผู้ใช้เลือก)
  return { dps, ehp, points: Math.sqrt(Math.max(0, dps * ehp)) };
}


// ---- team power (set 107, user D1: the enemy follows the player's power) ----
// units = buildTeam output (level, perm included · runes NOT counted, same for player and bot teams)
// power = √(team dps × team effective hp) × (1 + tribeW × active tribe tiers) · uniform hp+atk scale ×f → power ×f (roughly)
export const TEAM_POWER = { tribeW: 0.08 }; // ค่าเสนอ (internal)
export function teamPower(units, rules = RULES) {
  if (!Array.isArray(units) || !units.length) return 0;
  const k = rules.power;
  let dps = 0, ehp = 0;
  const ids = new Set(), cnt = {};
  for (const u of units) {
    const hps = (u.multi || 1) / Math.max(0.1, (u.cdMs || 1000) / 1000);
    dps += (u.atk + (u.burnHit || 0) * k.burnStack + (u.shockHit || 0) * k.shockStack) * hps;
    ehp += u.maxHp + (u.startArmor || 0) + ((u.armorHit || 0) + (u.healHit || 0)) * hps * k.armorLifeSec;
    if (!ids.has(u.id)) { ids.add(u.id); for (const t of [u.tribe, ...(u.extraTribes || [])]) cnt[t] = (cnt[t] || 0) + 1; }
  }
  let tiers = 0;
  for (const t in cnt) tiers += rules.tribeSteps.filter(x => cnt[t] >= x).length;
  return Math.sqrt(Math.max(0, dps * ehp)) * (1 + TEAM_POWER.tribeW * tiers);
}
