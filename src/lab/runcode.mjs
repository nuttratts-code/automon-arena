// Read a run code (set 105) a tester copied from the game page ("คัดลอกโค้ดผลการเล่น") and pasted in chat.
// Usage: node lab/runcode.mjs <file with the ARUN1 code> [--detail]
// Prints: run history entries, then every match (round, result, time, difficulty, runes, both teams) and re-simulates it on
// this repo's values to check the result still matches (✓ / ✗). --detail adds per-unit damage of each match. Changes nothing.
import fs from 'fs';
import { simulate } from '../core/battle.js';
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { dataHash, parseRunCode } from '../core/save.js';
import { RUN_STAGE, runBossById, runBossTeam } from '../core/runboss.js';
import { equipRunes } from '../core/runes.js';
import { rnFoeScale, rnFromCompact } from '../core/runrunes.js';
import { buildTeam, makeCharMap } from '../core/team.js';

const args = process.argv.slice(2);
if (!args[0]) { console.log('usage: node lab/runcode.mjs <file> [--detail]'); process.exit(1); }
const detail = args.includes('--detail');
const chars = buildCharacterList(), CM = makeCharMap(chars), HASH = dataHash(chars);
const rc = parseRunCode(fs.readFileSync(args[0], 'utf8'), CM, RULES);
const when = ms => new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + 'Z';
const res = w => (w === 0 ? 'WIN ' : w === 1 ? 'LOSS' : 'DRAW');
const team = t => t.map(u => `${u.id}(${(CM[u.id] || {}).name || '?'}) L${u.level} r${u.row}${u.lane}${u.perm && Object.keys(u.perm).length ? ' +perm' : ''}`).join(' · ');

console.log(`copied ${when(rc.at)} · page data ${rc.page} · this repo ${HASH}`);
for (const h of rc.hist) console.log(`history: ${when(h.at)} ${h.won ? 'CLEARED' : 'ended'} · wins ${h.wins} · hearts ${h.hearts} · rounds ${h.rounds} · matches ${h.matches} · top ${h.top} ${h.topDmg} · team ${h.team.map(u => u.id + ' L' + u.level).join(', ')}`);
if (!rc.runs.length) console.log('no replays in code (no match yet, or replays cleared)');
rc.runs.forEach((run, k) => {
console.log(`\n=== ${k === 0 ? 'latest' : 'previous'} run ${run.run} · ${run.list.length} matches (game keeps the last 40 per run)${run.data !== HASH ? ' ⚠ made on other values — re-sim may differ' : ''}`);
let wins = 0, ok = 0;
for (const x of run.list) {
  if (x.w === 0) wins++;
  let r = null;
  try {
    const e = equipRunes(buildTeam(x.a, CM), rnFromCompact(x.n || []), { winStreak: x.g | 0 });
    const boss = !Array.isArray(x.b) ? runBossById(x.b.boss) : null;
    const foe = Array.isArray(x.b) ? rnFoeScale(buildTeam(x.b, CM), x.d || null, RUN_STAGE, x.r) : boss ? runBossTeam(boss, x.b.k) : null;
    if (foe) r = simulate(e.units, foe, { ...(e.tribeExtra.length ? { tribeExtra: e.tribeExtra } : {}), detail });
  } catch (err) { r = null; }
  const same = r && r.winner === x.w && Math.floor(r.timeMs) === x.t; if (same) ok++;
  console.log(`\nround ${x.r} ${res(x.w)} ${(x.t / 1000).toFixed(1)}s ${same ? '✓' : '✗ re-sim differs'}${x.d ? ' · ' + x.d : ''}${x.n ? ' · runes ' + x.n.map(q => q.id + (q.n > 1 ? '×' + q.n : '')).join(',') + ' · streak ' + (x.g | 0) : ''}`);
  console.log('  me : ' + team(x.a));
  console.log('  foe: ' + (Array.isArray(x.b) ? team(x.b) : `BOSS ${x.b.boss} k${x.b.k}`));
  if (detail && same && r.stats) console.log('  dmg: ' + JSON.stringify(r.stats).slice(0, 600));
}
console.log(`\nwins ${wins}/${run.list.length} · re-sim matched ${ok}/${run.list.length}`);
});
