// Set 95 → set 107: run results with the game's real flow · node lab/runerun.mjs [runs=600] [--write t1 t2 t3] [--floor=N]
// set 108: bosses on fixed rounds (5 10 15 20 …, k by round, lost boss does not come back) · real bot teams (no scaling) up to round foeRealUntil
// set 107 (user 6 Nov): no modes · the enemy is picked by the player's power + win streak (core/botteams.js pickFoe, like the game)
// · both sides carry runes (player bot takes rune offers, bot teams have the runes their bot held) · the player bot = core/bot.js
// (merge-first, focus rotating over the 6 tribes) · harness plays extra matches after 10 wins (boss 3+ lives there).
// Prints normal-round win %, win % by win streak, boss win % per boss (k1 = 1st boss …), run cleared %.
// --write t1 t2 t3: re-tunes core/stage-user.js bosses (k1 base scale, k2 mult10, k3 endlessPct) to those boss win % on the collected teams.
import { readFileSync, writeFileSync } from 'node:fs';
import { simulate } from '../core/battle.js';
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { validateBotTeams } from '../core/botteams.js';
import { dataHash } from '../core/save.js';
import { RUN_STAGE, runBossTeam } from '../core/runboss.js';
import { makeCharMap } from '../core/team.js';
import { runPlayStats } from './analyze.js';
// set 138: the run loop lives in lab/analyze.js runPlayStats (also the Balance Room "รันจริง (บอท)" tab) → same numbers on both

const argv = process.argv.slice(2), WRITE = argv.includes('--write');
// set 127: --floor=N overrides the stage setting foeFloor for this measure (0 = no floor) → compare R1 on/off
const FL = argv.find(a => a.startsWith('--floor=')); if (FL) RUN_STAGE.settings.foeFloor = +FL.slice(8);
// set 129 measure (user B, 7 Nov): --dyn=STEP[,CAP[,START]] = floor starts START (default 0) · each win +STEP · each loss −STEP · clamp 0..CAP (default 100) → overrides foeFloor per match
const DY = argv.find(a => a.startsWith('--dyn=')); const DYN = DY ? DY.slice(6).split(',').map(Number) : null;
const args = argv.filter(a => !a.startsWith('--'));
const runs = +args[0] || 600;
const T1 = +(args[1] || 60), T2 = +(args[2] || 50), T3 = +(args[3] || 40);
const chars = buildCharacterList();
const bt = validateBotTeams(BOT_TEAMS, makeCharMap(chars), RULES, dataHash(chars, RULES));
if (!bt.ok) { console.log('bot teams not usable: run node lab/botgen.mjs first', bt.errors.slice(0, 2)); process.exit(1); }

const t0 = Date.now();
const S = await runPlayStats(chars, RULES, RUN_STAGE, { n: runs, dyn: DYN, keepTeams: WRITE });
const teams = S.teams || { 1: [], 2: [], 3: [] };
const f1 = x => (x == null ? '-' : x.toFixed(1));
console.log(`runs ${runs} · ${((Date.now() - t0) / 1000).toFixed(0)} s · run cleared ${f1(S.cleared)}% · enemy scale % p10/p50/p90 ${S.foePct ? `${S.foePct.p10}/${S.foePct.p50}/${S.foePct.p90}` : '-'}`);
console.log(`normal rounds won ${f1(S.normalWin)}% · by wins in a row: ` + S.byWs.map(x => `${x.ws}${x.ws === 5 ? '+' : ''}: ${f1(x.win)}% (${x.games})`).join(' · '));
for (const x of S.bossK) console.log(`boss k${x.k}: reached ${x.games} · won ${f1(x.win)}%`);
console.log(`set 119 normal run: second chance used ${f1(S.second)}% of runs · bosses in the normal run: ` + S.bossK.filter(x => x.mainWin != null).map(x => `k${x.k} reached ${f1(x.mainReach)}% of runs · won ${f1(x.mainWin)}%`).join(' · '));
console.log('set 133 first Lv3 on board (share of runs · median round · p25/p75): ' + S.lv3First.map(x => `${x.rarity} ${f1(x.share)}% · r${x.med} (${x.p25}/${x.p75})`).join(' · '));

if (WRITE) {
  const scale = (b, s) => ({ ...b, hp: Math.max(10, Math.round(b.hp * s / 10) * 10), atk: Math.max(1, Math.round(b.atk * s)),
    phases: b.phases.map(p => ({ ...p, stats: typeof p.stats?.atk === 'number' ? { ...p.stats, atk: Math.max(1, Math.round(p.stats.atk * s)) } : p.stats })) });
  const winPct = (b, k, list) => { let w = 0; for (const t of list) w += simulate(t.units, runBossTeam(b, k), t.opts).winner !== 1 ? 1 : 0; return w / list.length * 100; };
  const search = (lo, hi, f, target) => { for (let i = 0; i < 10; i++) { const m = (lo + hi) / 2; if (f(m) > target) lo = m; else hi = m; } return (lo + hi) / 2; };
  const res = RUN_STAGE.bosses.filter(x => x.on).map(b0 => {
    const s = search(0.3, 4, x => winPct(scale(b0, x), 1, teams[1]), T1);
    let b = scale(b0, s);
    const m10 = search(1, 8, x => winPct({ ...b, mult10: x }, 2, teams[2]), T2);
    b = { ...b, mult10: Math.round(m10 * 100) / 100 };
    if (teams[3].length) { const ep = search(0, 300, x => winPct({ ...b, endlessPct: x }, 3, teams[3]), T3); b = { ...b, endlessPct: Math.round(ep) }; }
    console.log(`${b0.id}: s ${s.toFixed(2)} hp ${b0.hp}→${b.hp} atk ${b0.atk}→${b.atk} mult10 ${b0.mult10}→${b.mult10} endless ${b0.endlessPct}→${b.endlessPct} · k1 ${winPct(b, 1, teams[1]).toFixed(1)} k2 ${winPct(b, 2, teams[2]).toFixed(1)}${teams[3].length ? ` k3 ${winPct(b, 3, teams[3]).toFixed(1)}` : ''}`);
    return b;
  });
  const f = new URL('../core/stage-user.js', import.meta.url);
  let src = readFileSync(f, 'utf8');
  for (const nb of res) {
    const m = src.match(new RegExp(`(\\{[^\\n]*id: '${nb.id}'[^\\n]*\\},?)\\n`)); if (!m) { console.log('not found', nb.id); continue; }
    let line = m[1].replace(/ atk: \d+(\.\d+)?, bars:/, ` atk: ${nb.atk}, bars:`).replace(/ hp: \d+, id:/, ` hp: ${nb.hp}, id:`).replace(/mult10: [\d.]+/, `mult10: ${nb.mult10}`).replace(/endlessPct: -?\d+/, `endlessPct: ${nb.endlessPct}`);
    let i = 0; line = line.replace(/stats: \{ atk: \d+ \}/g, () => { while (i < nb.phases.length && typeof nb.phases[i].stats?.atk !== 'number') i++; return `stats: { atk: ${nb.phases[i++].stats.atk} }`; });
    src = src.replace(m[1], line);
  }
  writeFileSync(f, src);
  console.log('core/stage-user.js written');
}
// set 144: rune stats (what-if without each held battle rune, main run only)
if (S.runes) {
  const R = S.runes, f = x => (x == null ? '-' : x.toFixed(1));
  console.log(`runes (main-run matches ${R.matches}) · median uplift by rarity: ` + Object.entries(R.med).map(([k, v]) => `${k} ${f(v)}`).join(' · '));
  for (const x of R.rows) console.log(`${x.id.padEnd(4)} ${x.rarity.padEnd(6)} held ${f(x.held).padStart(5)}% · games ${String(x.games).padStart(5)} · win ${f(x.win).padStart(5)}%` +
    (x.runOnly ? ` · run-only: avg wins held ${f(x.wins)} vs not ${f(x.noWins)}` : ` · uplift ${f(x.uplift).padStart(5)} ±${f(x.se)} (n ${x.cfN}) · decided ${f(x.decided)}% · game ${f(x.game)}`) + (x.flags && x.flags.length ? '  [' + x.flags.join(' ') + ']' : '') + `  ${x.name}`);
}
