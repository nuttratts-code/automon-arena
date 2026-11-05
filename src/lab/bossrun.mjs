// Set 88: re-tune run bosses against real-run teams · node lab/bossrun.mjs [runs] [target1] [target2] [--write]
// 1) the player bot (core/bot.js defaults, focus rotating over the 6 tribes) plays `runs` real runs against the game's bot teams
//    (core/botdata.js) and the teams it brings to boss rounds 5 / 10 are kept (k = 1 / 2)
// 2) per boss: binary search a scale s on k1 hp / atk / phase atk so k1 teams win target1 %, then mult10 so k2 teams win target2 %
// (same idea as the set 87 scratch harness) · prints old → new values · --write rewrites core/stage-user.js bosses (hp, atk, phase atk, mult10)
import { readFileSync, writeFileSync } from 'node:fs';
import { simulate } from '../core/battle.js';
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { pickBotTeam, simRun, tribeList, validateBotTeams } from '../core/botteams.js';
import { dataHash } from '../core/save.js';
import { RUN_STAGE, runBossTeam } from '../core/runboss.js';
import { buildTeam, makeCharMap } from '../core/team.js';
const args = process.argv.slice(2).filter(a => !a.startsWith('--')), WRITE = process.argv.includes('--write');
const runs = +args[0] || 600, T1 = +(args[1] || 75), T2 = +(args[2] || 62);
const chars = buildCharacterList(), cm = makeCharMap(chars), tribes = tribeList(chars);
const bt = validateBotTeams(BOT_TEAMS, cm, RULES, dataHash(chars, RULES));
if (!bt.ok) { console.log('bot teams not usable: run node lab/botgen.mjs first ·', bt.errors?.[0] || ''); process.exit(1); }
const teams = { 1: [], 2: [] };
const t0 = Date.now();
for (let r = 0; r < runs; r++) {
  const seed = (8800 + Math.imul(r + 1, 0x9E3779B1)) >>> 0;
  simRun(chars, RULES, seed, P => pickBotTeam(BOT_TEAMS, P.wins, P.seed, P.round).team, m => { if (m.boss && teams[m.k]) teams[m.k].push(buildTeam(m.team, cm, RULES)); }, RUN_STAGE, { focus: tribes[r % tribes.length] });
}
console.log(`teams k1 ${teams[1].length} · k2 ${teams[2].length} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const scale = (b, s) => ({ ...b, hp: Math.max(10, Math.round(b.hp * s / 10) * 10), atk: Math.max(1, Math.round(b.atk * s)),
  phases: b.phases.map(p => ({ ...p, stats: typeof p.stats?.atk === 'number' ? { ...p.stats, atk: Math.max(1, Math.round(p.stats.atk * s)) } : p.stats })) });
const winPct = (b, k, list) => { let w = 0; for (const t of list) { const res = simulate(t, runBossTeam(b, k), { rules: RULES, log: false }); w += res.winner !== 1 ? 1 : 0; } return (w / list.length) * 100; };
// win % falls as the boss grows → search the value giving `target`
function search(lo, hi, f, target, steps = 9) { for (let i = 0; i < steps; i++) { const mid = (lo + hi) / 2; if (f(mid) > target) lo = mid; else hi = mid; } return (lo + hi) / 2; }
const out = [];
for (const b of RUN_STAGE.bosses.filter(x => x.on)) {
  const before = [winPct(b, 1, teams[1]), winPct(b, 2, teams[2])];
  const s = search(0.2, 4, x => winPct(scale(b, x), 1, teams[1]), T1);
  const b1 = scale(b, s);
  const m10 = Math.round(search(0.5, 6, x => winPct({ ...b1, mult10: x }, 2, teams[2]), T2) * 100) / 100;
  const nb = { ...b1, mult10: m10 }, after = [winPct(nb, 1, teams[1]), winPct(nb, 2, teams[2])];
  out.push(nb);
  console.log(`${b.id} ${b.name}: k1 ${before[0].toFixed(0)}% → ${after[0].toFixed(0)}% · k2 ${before[1].toFixed(0)}% → ${after[1].toFixed(0)}% · s ${s.toFixed(2)} hp ${b.hp}→${nb.hp} atk ${b.atk}→${nb.atk} phase atk ${b.phases.map(p => p.stats?.atk ?? '-').join('/')}→${nb.phases.map(p => p.stats?.atk ?? '-').join('/')} · mult10 ${b.mult10}→${m10}`);
}
if (WRITE) {
  const f = new URL('../core/stage-user.js', import.meta.url);
  let src = readFileSync(f, 'utf8');
  for (const nb of out) {
    const re = new RegExp(`(\\{[^\\n]*id: '${nb.id}'[^\\n]*\\},?)\\n`);
    const m = src.match(re); if (!m) { console.log('not found', nb.id); continue; }
    let line = m[1].replace(/ atk: \d+(\.\d+)?, bars:/, ` atk: ${nb.atk}, bars:`).replace(/ hp: \d+, id:/, ` hp: ${nb.hp}, id:`).replace(/mult10: [\d.]+/, `mult10: ${nb.mult10}`);
    let i = 0; line = line.replace(/stats: \{ atk: \d+ \}/g, () => { while (i < nb.phases.length && typeof nb.phases[i].stats?.atk !== 'number') i++; return `stats: { atk: ${nb.phases[i++].stats.atk} }`; });
    src = src.replace(m[1], line);
  }
  writeFileSync(f, src);
  console.log('core/stage-user.js written');
}
