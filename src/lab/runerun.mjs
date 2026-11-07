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
import { pickFoe, simRun, tribeList, validateBotTeams } from '../core/botteams.js';
import { dataHash } from '../core/save.js';
import { RUN_STAGE, runBossTeam } from '../core/runboss.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { teamEntries } from '../core/shop.js';

const argv = process.argv.slice(2), WRITE = argv.includes('--write');
// set 127: --floor=N overrides the stage setting foeFloor for this measure (0 = no floor) → compare R1 on/off
const FL = argv.find(a => a.startsWith('--floor=')); if (FL) RUN_STAGE.settings.foeFloor = +FL.slice(8);
// set 129 measure (user B, 7 Nov): --dyn=STEP[,CAP[,START]] = floor starts START (default 0) · each win +STEP · each loss −STEP · clamp 0..CAP (default 100) → overrides foeFloor per match
const DY = argv.find(a => a.startsWith('--dyn=')); const DYN = DY ? DY.slice(6).split(',').map(Number) : null;
const args = argv.filter(a => !a.startsWith('--'));
const runs = +args[0] || 600;
const T1 = +(args[1] || 60), T2 = +(args[2] || 50), T3 = +(args[3] || 40);
const chars = buildCharacterList(), cm = makeCharMap(chars), tribes = tribeList(chars);
const bt = validateBotTeams(BOT_TEAMS, cm, RULES, dataHash(chars, RULES));
if (!bt.ok) { console.log('bot teams not usable: run node lab/botgen.mjs first', bt.errors.slice(0, 2)); process.exit(1); }

const normal = [0, 0], byWs = {}, out = {}, teams = { 1: [], 2: [], 3: [] }, pcts = [];
let cleared = 0, seconds = 0; const nb = {}, lens = {};
// set 133: first round a Lv3 unit of each rarity is on the board (per run) → shop odds check
const rarOf = Object.fromEntries(chars.map(c => [c.id, c.rarity])), lv3 = {};
const t0 = Date.now();
for (let r = 0; r < runs; r++) {
  const seed = (8800 + Math.imul(r + 1, 0x9E3779B1)) >>> 0;
  const seen = {}; let wasOver = false, fl = DYN ? (DYN[2] || 0) : 0;
  const P = simRun(chars, RULES, seed, p => { const stg = DYN ? { ...RUN_STAGE, settings: { ...RUN_STAGE.settings, foeFloor: fl } } : RUN_STAGE; const f = pickFoe(BOT_TEAMS, p.fp | 0, p.round, p.seed, p.extra, stg, undefined, p.ls | 0); pcts.push(DYN ? fl : f.pct); return f; }, m => {
    if (DYN) fl = Math.max(0, Math.min(DYN[1] ?? 100, fl + (m.winner !== 1 ? DYN[0] : -DYN[0])));
    if (m.second) seconds++;
    for (const e of m.team || []) if (e.level >= 3) { const r0 = rarOf[e.id]; if (!seen[r0]) { seen[r0] = 1; (lv3[r0] = lv3[r0] || []).push(m.round); } }
    if (!m.extra) { if (m.boss && m.boss !== 'DUMMY') { const q = (nb[m.k] = nb[m.k] || [0, 0]); q[0]++; q[1] += m.winner !== 1 ? 1 : 0; } }
    const won = m.winner !== 1;
    if (!m.boss) { normal[0]++; normal[1] += won ? 1 : 0; const w = Math.min(5, m.ws); (byWs[w] = byWs[w] || [0, 0])[0]++; byWs[w][1] += won ? 1 : 0; }
    else if (m.boss !== 'DUMMY') { (out[m.k] = out[m.k] || [0, 0])[0]++; out[m.k][1] += won ? 1 : 0; if (teams[m.k]) teams[m.k].push({ units: m.units, opts: m.opts }); }
    if (m.stage + (won ? 1 : 0) >= RULES.shop.winsToFinish && !wasOver && won) { wasOver = true; cleared++; }
  }, RUN_STAGE, { focus: tribes[r % tribes.length], runes: true, extra: RUN_STAGE.settings.lastStage });
  void P;
}
const pct = (a, b) => (b ? (a / b * 100).toFixed(1) : '-');
pcts.sort((a, b) => a - b);
console.log(`runs ${runs} · ${((Date.now() - t0) / 1000).toFixed(0)} s · run cleared ${pct(cleared, runs)}% · enemy scale % p10/p50/p90 ${pcts[Math.floor(pcts.length * 0.1)]}/${pcts[Math.floor(pcts.length / 2)]}/${pcts[Math.floor(pcts.length * 0.9)]}`);
console.log(`normal rounds won ${pct(normal[1], normal[0])}% · by wins in a row: ` + Object.keys(byWs).map(k => `${k}${k === '5' ? '+' : ''}: ${pct(byWs[k][1], byWs[k][0])}% (${byWs[k][0]})`).join(' · '));
for (const k of Object.keys(out)) console.log(`boss k${k}: reached ${out[k][0]} · won ${pct(out[k][1], out[k][0])}%`);
console.log(`set 119 normal run: second chance used ${pct(seconds, runs)}% of runs · bosses in the normal run: ` + Object.keys(nb).map(k => `k${k} reached ${pct(nb[k][0], runs)}% of runs · won ${pct(nb[k][1], nb[k][0])}%`).join(' · '));

console.log('set 133 first Lv3 on board (share of runs · median round · p25/p75): ' + Object.keys(lv3).map(k => { const a = lv3[k].sort((x, y) => x - y); return `${k} ${pct(a.length, runs)}% · r${a[a.length >> 1]} (${a[a.length >> 2]}/${a[(a.length * 3) >> 2]})`; }).join(' · '));

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
