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

