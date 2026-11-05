// Set 95: boss win % when the player collects runes (phase 2b run flow) · node lab/runerun.mjs [runs] [diff ง่าย|กลาง|ยาก|off] [--write t1 t2 t3]
// The player bot (core/bot.js, focus rotating over the 6 tribes) plays real runs against the game's bot teams at the picked difficulty
// (pickBotTeamAt, like the game) and handles runes with a simple greedy policy (harness only, not game rules):
//   offer → highest rarity, battle runes before run-only ones · rune shop → buys the highest-rarity card it can afford before the unit shop
//   when gold ≥ price + RESERVE · "one" runes sit on the strongest unit (level, then rarity), partner on the 2nd strongest.
// diff "off" = no runes, opponents by wins (pickBotTeam) = the lab/bossrun.mjs baseline.
// Prints boss win % per boss round (k1 round 5 · k2 round 10 · k3 round 15) and run results.
// --write: like lab/bossrun.mjs but the collected boss-round teams carry their runes → re-tunes core/stage-user.js bosses.
import { readFileSync, writeFileSync } from 'node:fs';
import { simulate } from '../core/battle.js';
import { botShop } from '../core/bot.js';
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { pickBotTeam, pickBotTeamAt, tribeList, validateBotTeams } from '../core/botteams.js';
import { dataHash } from '../core/save.js';
import { RUN_STAGE, runBossAt, runBossTeam } from '../core/runboss.js';
import { RUNE_RUN_ONLY, equipRunes } from '../core/runes.js';
import { RN_RARS, rnBuy, rnEquips, rnMakeOffer, rnPlace, rnPrice, rnRec, rnTakeOffer, rnNeedsSlot, rnNeedsPartner } from '../core/runrunes.js';
import { endMatch, newRun, startRound, teamEntries } from '../core/shop.js';
import { buildTeam, makeCharMap } from '../core/team.js';

const argv = process.argv.slice(2), WRITE = argv.includes('--write');
const args = argv.filter(a => !a.startsWith('--'));
const runs = +args[0] || 600, DIFF = args[1] || 'กลาง', RUNES = DIFF !== 'off';
const T1 = +(args[2] || 75), T2 = +(args[3] || 62), T3 = +(args[4] || 50);
const RESERVE = +(process.env.RESERVE ?? 6), NOSHOP = !!process.env.NOSHOP; // harness: gold kept for the unit shop when buying a rune · NOSHOP = offers only
const chars = buildCharacterList(), cm = makeCharMap(chars), tribes = tribeList(chars);
const RAR = ['ธรรมดา', 'ไม่ธรรมดา', 'หายาก', 'หายากมาก', 'ตำนาน'];
const bt = validateBotTeams(BOT_TEAMS, cm, RULES, dataHash(chars, RULES));
if (!bt.ok) { console.log('bot teams not usable: run node lab/botgen.mjs first'); process.exit(1); }

const rRank = r => RN_RARS.indexOf(r.rarity) * 2 + (RUNE_RUN_ONLY.includes(r.eff) ? 0 : 1);
const strength = u => u.level * 10 + RAR.indexOf(cm[u.id].rarity);
function placeRunes(P) {
  const units = [];
  P.board.forEach((row, ri) => row.forEach((u, li) => { if (u) units.push({ u, s: [ri, li] }); }));
  units.sort((a, b) => strength(b.u) - strength(a.u));
  for (const id of Object.keys(P.rn.bag)) {
    const r = rnRec(id); if (!r) continue;
    if (rnNeedsSlot(r)) rnPlace(P, id, units[0] ? units[0].s : null, RULES);
    if (rnNeedsPartner(r)) rnPlace(P, id, units[1] ? units[1].s : null, RULES, true);
  }
}
function buyRunes(P) {
  for (;;) {
    let best = -1, bi = -1;
    P.rn.shop.forEach((s, i) => { const r = rnRec(s.id); if (r && P.gold >= rnPrice(r) + RESERVE && (P.rn.bag[r.id] | 0) < (r.max || 1) && rRank(r) > best) { best = rRank(r); bi = i; } });
    if (bi < 0 || !rnBuy(P, bi).ok) return;
  }
}

const goldLog = Array.from({ length: 16 }, () => []);
const normal = [0, 0];
const out = { 1: [0, 0], 2: [0, 0], 3: [0, 0] }, teams = { 1: [], 2: [], 3: [] }, finish = { wins: 0, runs: 0 }, held = [];
const t0 = Date.now();
for (let r = 0; r < runs; r++) {
  const seed = (8800 + Math.imul(r + 1, 0x9E3779B1)) >>> 0, focus = tribes[r % tribes.length];
  const P = newRun(chars, seed, RULES);
  let streak = 0;
  for (let g = 0; g < 40 && !P.over; g++) {
    startRound(P, chars, RULES); if (P.round < 16) goldLog[P.round].push(P.gold);
    if (RUNES && !NOSHOP) buyRunes(P);
    botShop(P, chars, RULES, { focus });
    if (RUNES) placeRunes(P);
    const rb = runBossAt(P.round, P.seed);
    const foe = rb ? null : RUNES ? pickBotTeamAt(BOT_TEAMS, P.wins, P.seed, P.round, DIFF) : pickBotTeam(BOT_TEAMS, P.wins, P.seed, P.round);
    const mine = teamEntries(P);
    const e = equipRunes(buildTeam(mine, cm, RULES), RUNES ? rnEquips(P) : [], { winStreak: streak });
    const opts = { rules: RULES, log: false, ...(e.tribeExtra.length ? { tribeExtra: e.tribeExtra } : {}) };
    const res = simulate(e.units, rb ? runBossTeam(rb.boss, rb.k) : buildTeam(foe.team, cm, RULES), opts);
    const won = res.winner !== 1;
    if (!rb) { normal[0]++; normal[1] += won ? 1 : 0; }
    if (rb && out[rb.k]) { out[rb.k][0]++; out[rb.k][1] += won ? 1 : 0; teams[rb.k].push({ units: e.units, opts }); }
    streak = won ? streak + 1 : 0;
    endMatch(P, won, chars, RULES, (res.perm || []).filter(x => x.side === 0));
    if (RUNES && won && !P.over) {
      const o = rnMakeOffer(P, rb ? 'boss' : DIFF);
      if (o) { let bi = 0; o.ids.forEach((id, i) => { if (rRank(rnRec(id)) > rRank(rnRec(o.ids[bi]))) bi = i; }); rnTakeOffer(P, bi); }
    }
  }
  finish.runs++; finish.wins += P.wins >= RULES.shop.winsToFinish ? 1 : 0;
  if (RUNES) held.push(Object.values(P.rn.bag).reduce((a, n) => a + n, 0));
}
const pct = (a, b) => (b ? (a / b * 100).toFixed(1) : '-');
console.log(`diff ${DIFF} · runs ${runs} · ${((Date.now() - t0) / 1000).toFixed(0)} s · run cleared ${pct(finish.wins, finish.runs)}%${RUNES ? ` · runes held at end avg ${(held.reduce((a, b) => a + b, 0) / held.length).toFixed(1)}` : ''}`);
console.log(`normal rounds won ${pct(normal[1], normal[0])}%`);
for (const k of [1, 2, 3]) console.log(`boss k${k}: reached ${out[k][0]} · won ${pct(out[k][1], out[k][0])}%`);

if (WRITE) {
  // same search as lab/bossrun.mjs, on rune-equipped teams
  const scale = (b, s) => ({ ...b, hp: Math.max(10, Math.round(b.hp * s / 10) * 10), atk: Math.max(1, Math.round(b.atk * s)),
    phases: b.phases.map(p => ({ ...p, stats: typeof p.stats?.atk === 'number' ? { ...p.stats, atk: Math.max(1, Math.round(p.stats.atk * s)) } : p.stats })) });
  const winPct = (b, k, list) => { let w = 0; for (const t of list) w += simulate(t.units, runBossTeam(b, k), t.opts).winner !== 1 ? 1 : 0; return w / list.length * 100; };
  const search = (lo, hi, f, target, up) => { for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; (up ? f(m) > target : f(m) < target) ? (up ? lo = m : hi = m) : (up ? hi = m : lo = m); } return (lo + hi) / 2; };
  const S = RUN_STAGE.settings, K3 = (S.bossesPerRun | 0) >= 3;
  const res = RUN_STAGE.bosses.map(b0 => {
    const s = search(0.3, 4, x => winPct(scale(b0, x), 1, teams[1]), T1, true);
    let b = scale(b0, s);
    const m10 = search(1, 6, x => winPct({ ...b, mult10: x }, 2, teams[2]), T2, true);
    b = { ...b, mult10: Math.round(m10 * 100) / 100 };
    if (K3 && teams[3].length) { const ep = search(0, 300, x => winPct({ ...b, endlessPct: x }, 3, teams[3]), T3, true); b = { ...b, endlessPct: Math.round(ep) }; }
    console.log(`${b0.id}: s ${s.toFixed(2)} hp ${b0.hp}→${b.hp} atk ${b0.atk}→${b.atk} mult10 ${b0.mult10}→${b.mult10}${K3 ? ` endless ${b0.endlessPct}→${b.endlessPct}` : ''} · k1 ${winPct(b, 1, teams[1]).toFixed(1)} k2 ${winPct(b, 2, teams[2]).toFixed(1)}${K3 ? ` k3 ${winPct(b, 3, teams[3]).toFixed(1)}` : ''}`);
    return b;
  });
  console.log('write: reuse lab/bossrun.mjs write code after review', res.length);
}
if (process.env.GOLD) console.log('gold per round start avg', JSON.stringify(goldLog.map(a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : 0)));
