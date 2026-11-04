// ชุด 80: หาตัวคูณบอส · node lab/bossmult.mjs [n] — % ชนะบอส (เฉลี่ยทุกบอสที่เปิด) เมื่อคูณ HP/พลังโจมตีบอสด้วย m (เทียบค่าบอสครั้งที่ 1)
// แถว: ทีมจาก run จำลองตอนรอบ 5/10/15 (บอทเล่นแทนผู้เล่น · รวมค่าถาวร · ไม่มีรูน) + ทีมสุ่ม Lv2 / Lv3
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { stageDefaults } from '../core/stage.js';
import { simRun } from '../core/botteams.js';
import { simulate } from '../core/battle.js';
import { bossUnit } from '../core/boss.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { makeRng } from '../core/rng.js';
import { randomTeam } from './analyze.js';

const n = +process.argv[2] || 120, MS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1, 1.2, 1.5, 2, 2.5, 3];
const chars = buildCharacterList(), st = stageDefaults(), cm = makeCharMap(chars), bosses = st.bosses.filter(b => b.on);
const at = { 5: [], 10: [], 15: [] };
for (let s = 0; s < 300 && Object.values(at).some(a => a.length < n); s++) simRun(chars, RULES, (77 + Math.imul(s + 1, 0x9E3779B1)) >>> 0, null, m => { if (at[m.round] && at[m.round].length < n) at[m.round].push(m.team); });
const rng = makeRng(99), groups = [['รอบ 5 (ทีมจริง)', at[5]], ['รอบ 10 (ทีมจริง)', at[10]], ['รอบ 15 (ทีมจริง)', at[15]],
  ['ทีมสุ่ม Lv2', Array.from({ length: n }, () => randomTeam(rng, chars, 2))], ['ทีมสุ่ม Lv3', Array.from({ length: n }, () => randomTeam(rng, chars, 3))]];
console.log('ตัวคูณ ' + MS.map(m => ('×' + m).padStart(6)).join(''));
for (const [name, teams] of groups) {
  const row = MS.map(m => { let w = 0, g = 0; for (const t of teams) for (const b of bosses) { const u = bossUnit({ ...b, mult10: m }, 2); w += simulate(buildTeam(t, cm, RULES), [u], { rules: RULES, log: false }).winner === 0 ? 1 : 0; g++; } return w / g * 100; });
  console.log(name.padEnd(18) + row.map(x => x.toFixed(0).padStart(6)).join(''));
}
