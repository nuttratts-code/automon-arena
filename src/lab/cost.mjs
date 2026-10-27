// ราคาแต้มต่อค่าพลัง +1 ที่ Lv1 (budget-notes.md) · รัน: node lab/cost.mjs
import { buildCharacterList } from '../core/characters.js';
import { basePower } from '../core/power.js';
import { RULES } from '../core/rules.js';
const chars = buildCharacterList();
const bump = (c, k, d) => { const x = JSON.parse(JSON.stringify(c)); if (!x[k]) x[k] = [0,0,0]; x[k][0] += d; return x; };
const tests = [['atk',1],['hp',10],['burn',1],['shock',1],['armorHit',1],['multi',1],['cdMs',-100]];
const by = {};
for (const c of chars) { const p0 = basePower(c,0).points; const row = tests.map(([k,d]) => basePower(bump(c,k,d),0).points - p0); (by[c.rarity] ||= []).push({id:c.id, row, p0, c}); }
console.log('budget', JSON.stringify(RULES.power.budget));
for (const [r, list] of Object.entries(by)) {
  const avg = tests.map((_, i) => list.reduce((a, x) => a + x.row[i], 0) / list.length);
  const mn = tests.map((_, i) => Math.min(...list.map(x => x.row[i]))), mx = tests.map((_, i) => Math.max(...list.map(x => x.row[i])));
  console.log(r, list.length, 'p0avg', (list.reduce((a,x)=>a+x.p0,0)/list.length).toFixed(1), tests.map(([k,d],i)=>`${k}${d>0?'+':''}${d}: ${avg[i].toFixed(2)} (${mn[i].toFixed(2)}–${mx[i].toFixed(2)})`).join(' | '));
}
