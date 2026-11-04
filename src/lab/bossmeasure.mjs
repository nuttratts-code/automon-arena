// ชุด 80: วัดบอส · node lab/bossmeasure.mjs [n] — ตาราง % ชนะบอส: ทีมสุ่มแต่ละเลเวล × บอสครั้งที่ k (ไม่มีรูน / สุ่มรูน)
// + ทีมจริงจาก run จำลอง (บอทเล่นแทนผู้เล่น) ตอนรอบ 5/10/15 สู้บอสครั้งที่ 1/2/3
import { RULES } from '../core/rules.js';
import { buildCharacterList } from '../core/characters.js';
import { stageDefaults } from '../core/stage.js';
import { simRun } from '../core/botteams.js';
import { simulate } from '../core/battle.js';
import { bossUnit } from '../core/boss.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { bossRanking } from './analyze.js';

const n = +process.argv[2] || 200, ks = (process.argv[3] || '1,2,3,4,5,6,8,10').split(',').map(Number);
const chars = buildCharacterList(), st = stageDefaults(), cm = makeCharMap(chars);
const bosses = st.bosses.filter(b => b.on);
const pct = x => x.toFixed(0).padStart(4);
const t0 = Date.now();
for (const [mode, rc] of [['none', 0], ['random', 2], ['random', 5]]) {
  console.log(`\n== ทีมสุ่ม · รูน ${mode === 'none' ? 'ไม่มี' : 'สุ่ม ' + rc} · % ชนะบอส (เฉลี่ย ${bosses.map(b => b.id).join(' ')}) · n ${n}/บอส`);
  console.log('Lv   ' + ks.map(k => ('k' + k).padStart(5)).join(''));
  for (const level of [1, 2, 3]) {
    const row = [];
    for (const k of ks) { const r = await bossRanking(chars, RULES, st, { k, level, n, runeMode: mode, runeCount: rc }); row.push(r); }
    console.log(String(level).padEnd(5) + row.map(r => pct(r.winAll).padStart(5)).join(''));
    for (const b of bosses) console.log('  ' + b.id.padEnd(3) + row.map(r => pct(r.bossRows.find(x => x.id === b.id).win).padStart(5)).join('') + '   (แถบที่ลดได้ ' + row.map(r => r.bossRows.find(x => x.id === b.id).bars.toFixed(1)).join(' ') + ')');
  }
}
// ทีมจริงจาก run จำลอง: เก็บทีมตอนรอบ 5/10/15 (ด่านบอส)
const at = { 5: [], 10: [], 15: [] };
for (let s = 0; s < 400; s++) simRun(chars, RULES, (77 + Math.imul(s + 1, 0x9E3779B1)) >>> 0, null, m => { if (at[m.round]) at[m.round].push(m.team); });
console.log('\n== ทีมจาก run จำลอง (บอทเล่นแทนผู้เล่น · ไม่มีรูน · รวมค่าถาวรที่สะสมแล้ว) · % ชนะบอส');
console.log('รอบ  ทีม  ตัว/ทีม  เลเวลเฉลี่ย  %Lv3  ' + ks.map(k => ('k' + k).padStart(5)).join(''));
for (const [round, teams] of Object.entries(at)) {
  if (!teams.length) continue;
  const units = teams.flat(), avgLv = units.reduce((a, e) => a + e.level, 0) / units.length, lv3 = units.filter(e => e.level === 3).length / units.length * 100;
  const row = ks.map(k => { let w = 0, g = 0; for (const t of teams) for (const b of bosses) { const r = simulate(buildTeam(t, cm, RULES), [bossUnit(b, k)], { rules: RULES, log: false }); w += r.winner === 0 ? 1 : 0; g++; } return w / g * 100; });
  console.log(`${round.padEnd(5)}${String(teams.length).padEnd(5)}${(units.length / teams.length).toFixed(1).padEnd(9)}${avgLv.toFixed(2).padEnd(12)}${pct(lv3)}  ` + row.map(x => pct(x).padStart(5)).join(''));
}
console.log(`\nเวลา ${((Date.now() - t0) / 1000).toFixed(0)} วิ`);
