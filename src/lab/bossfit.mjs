// ชุด 81: หาตัวคูณ HP+atk ต่อบอส ให้ทีมสุ่ม Lv2 ชนะบอสครั้งที่ 1 ได้ตามเป้า · node lab/bossfit.mjs [n] [m1,m2,...]
// พิมพ์ % ชนะ + เผ่าที่แย่สุด/ดีสุด (นับเฉพาะเผ่าที่มีทีม ≥ 40) ต่อบอส ต่อตัวคูณ
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { stageDefaults } from '../core/stage.js';
import { bossRanking } from './analyze.js';
const n = +process.argv[2] || 300, MS = (process.argv[3] || '0.6,0.7,0.8,0.9,1').split(',').map(Number);
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const chars = buildCharacterList(), st = stageDefaults();
export const scaleBoss = (b, m) => ({ ...b, hp: Math.round(b.hp * m / 50) * 50, atk: Math.round(b.atk * m),
  phases: b.phases.map(p => ({ ...p, stats: typeof p.stats?.atk === 'number' ? { ...p.stats, atk: Math.round(p.stats.atk * m) } : p.stats })) });
for (const b of st.bosses.filter(b => b.on && (!ONLY || ONLY.includes(b.id)))) {
  for (const m of MS) {
    const s2 = { ...st, bosses: st.bosses.map(x => x.id === b.id ? scaleBoss(x, m) : x) };
    const r = await bossRanking(chars, RULES, s2, { bossIds: [b.id], k: 1, level: 2, n });
    const br = r.bossRows[0], tr = Object.entries(br.tribeWin).filter(([, v]) => v.teams >= n * 0.13).sort((a, c) => a[1].win - c[1].win);
    console.log(`${b.id} ×${m} hp ${scaleBoss(b, m).hp} atk ${scaleBoss(b, m).atk} · ชนะ ${br.win.toFixed(0)}% · ` + tr.map(([t, v]) => t + ' ' + v.win.toFixed(0)).join(' '));
  }
}
