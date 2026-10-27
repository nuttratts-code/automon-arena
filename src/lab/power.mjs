// วัดงบค่าพลังทั้งชุด (combat-rules V1.20) · รัน: node lab/power.mjs [แมตช์ต่อรอบ]
// 1) แต้มพื้นฐาน = basePower (Lv1) · 2) k = อัตราชนะที่เพิ่มต่อ 1 แต้ม (วัดจากการเพิ่ม HP+โจมตี 10% ในตัวอย่าง)
// 3) แต้มสกิล = (อัตราชนะมีสกิล − ไม่มีสกิล) ÷ k · 4) งบของตัวนั้น = แต้มรวม + (เป้าอัตราชนะ − อัตราชนะจริง) ÷ k
// ผล → lab/power-result.json (ห้องบาลานซ์/เอกสารใช้ดูว่าแต่ละตัวใช้งบเกินหรือขาด)
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { basePower } from '../core/power.js';
import { charRanking } from './analyze.js';
import { targetsFor } from './formula.mjs';
import fs from 'fs';

const n = +(process.argv[2] || 6000), seed = 777;
const SHOP = ['buy', 'sell', 'merge', 'matchEnd', 'matchWin', 'shopStart'];
const base = buildCharacterList();
const rank = async chars => Object.fromEntries((await charRanking(chars, RULES, { n, seed, level: 'mix' })).rows.map(r => [r.id, r.win]));
const W = await rank(base);
const mean = Object.values(W).reduce((a, b) => a + b, 0) / base.length;
const P = Object.fromEntries(base.map(c => [c.id, basePower(c).points]));
// k: เพิ่ม HP และพลังโจมตี 10% (แต้มพื้นฐาน +10%) ทีละตัวในตัวอย่าง แล้วดูอัตราชนะที่เพิ่ม
const sample = ['HL-1', 'PL-1', 'SF-1', 'WY-1', 'PT-1', 'WN-1', 'PL-8', 'SF-4'];
let ks = [];
for (const id of sample) {
  const ch = structuredClone(base); const c = ch.find(x => x.id === id);
  c.hp = c.hp.map(v => Math.round(v * 1.1)); c.atk = c.atk.map(v => Math.max(1, Math.round(v * 1.1)));
  const w = await rank(ch); ks.push((w[id] - W[id]) / (basePower(c).points - P[id]));
}
const k = ks.reduce((a, b) => a + b, 0) / ks.length;
const out = [];
for (const c of base) {
  let skillPts = 0, dWin = 0;
  if (c.skills.some(s => !SHOP.includes(s.when))) {
    const ch = structuredClone(base); const x = ch.find(y => y.id === c.id); x.skills = x.skills.filter(s => SHOP.includes(s.when));
    const w = await rank(ch); dWin = W[c.id] - w[c.id]; skillPts = dWin / k;
  }
  out.push({ id: c.id, rarity: c.rarity, tribe: c.tribe, base: P[c.id], skillWin: dWin, skill: skillPts, total: P[c.id] + skillPts, win: W[c.id] });
}
const tg = targetsFor(base, mean);
for (const o of out) { o.target = tg[o.id]; o.budget = o.total + (o.target - o.win) / k; }
const byR = {};
for (const o of out) (byR[o.rarity] ??= []).push(o.budget);
const budgets = Object.fromEntries(Object.entries(byR).map(([r, a]) => [r, a.reduce((x, y) => x + y, 0) / a.length]));
fs.writeFileSync('lab/power-result.json', JSON.stringify({ n, k, mean, budgets, chars: out }, null, 1));
console.log('k (อัตราชนะ % ต่อ 1 แต้ม) =', k.toFixed(3), '· ตัวอย่าง', ks.map(x => x.toFixed(2)).join(' '));
console.log('งบเฉลี่ยตามความหายาก:', Object.entries(budgets).map(([r, b]) => `${r} ${b.toFixed(1)}`).join(' · '));
for (const o of out) console.log(o.id, o.rarity, 'พื้นฐาน', o.base.toFixed(1), 'สกิล', o.skill.toFixed(1), `(${o.skillWin.toFixed(1)}%)`, 'รวม', o.total.toFixed(1), 'งบ', budgets[o.rarity].toFixed(1), 'ชนะ', o.win.toFixed(1), 'เป้า', o.target.toFixed(1));
