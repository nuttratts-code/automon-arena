// Set 122: per-character results from "real-player" bot runs (core/bot.js, same flow as lab/runerun.mjs) · node lab/charstat.mjs [runs=600]
// Counts every unit fielded in normal (non-boss) matches, both sides (player bot + the real bot team it met).
// Per character: fielded count, round-adjusted win (won − average win of that side at that round, in points),
// share of team damage dealt / taken (vs a fair share 1/team size), compared with the average of characters of the same price.
// Read-only measure: changes nothing. Pick count is biased: the bot judges characters by base stats only (skills not counted).
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { pickFoe, simRun, tribeList, validateBotTeams } from '../core/botteams.js';
import { dataHash } from '../core/save.js';
import { RUN_STAGE } from '../core/runboss.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { teamEntries } from '../core/shop.js';

const runs = +process.argv[2] || 600;
const chars = buildCharacterList(), cm = makeCharMap(chars), tribes = tribeList(chars);
const bt = validateBotTeams(BOT_TEAMS, cm, RULES, dataHash(chars, RULES));
if (!bt.ok) { console.log('bot teams not usable: run node lab/botgen.mjs first'); process.exit(1); }

const rows = []; // { id, lv, side, round, won, ds, ts }
const t0 = Date.now();
for (let r = 0; r < runs; r++) {
  const seed = (8800 + Math.imul(r + 1, 0x9E3779B1)) >>> 0;
  simRun(chars, RULES, seed, p => pickFoe(BOT_TEAMS, buildTeam(teamEntries(p), cm, RULES), p.round, p.seed, p.extra), m => {
    if (m.boss || m.extra) return;
    const us = m.res.units || [];
    for (const side of [0, 1]) {
      const mine = us.filter(u => u.side === side); if (!mine.length) continue;
      const D = mine.reduce((a, u) => a + u.dealt, 0) || 1, T = mine.reduce((a, u) => a + u.taken, 0) || 1;
      const won = side === 0 ? m.winner !== 1 : m.winner === 1;
      const lvOf = side === 0 ? Object.fromEntries(m.units.map(u => [u.uid, u.level])) : null;
      const foeLv = side === 1 ? (m.foe || []).map(e => e.level) : null;
      mine.forEach((u, i) => { const lv = side === 0 ? lvOf[u.uid] : foeLv[i]; if (!cm[u.id] || !lv) return; // summoned extra units: not counted as a character (their damage stays in the team total)
        rows.push({ id: u.id, lv, side, round: m.round, won: won ? 1 : 0, ds: u.dealt / D * mine.length, ts: u.taken / T * mine.length }); });
    }
  }, RUN_STAGE, { focus: tribes[r % tribes.length], runes: true });
}
// expected win per side × round
const exp = {};
for (const x of rows) { const k = x.side + ':' + x.round; (exp[k] = exp[k] || [0, 0])[0]++; exp[k][1] += x.won; }
const per = {};
for (const x of rows) {
  const p = (per[x.id] = per[x.id] || { n: 0, adj: 0, ds: 0, ts: 0, lv: [0, 0, 0], round: 0 });
  const e = exp[x.side + ':' + x.round]; p.n++; p.adj += x.won - e[1] / e[0]; p.ds += x.ds; p.ts += x.ts; p.lv[Math.min(3, x.lv) - 1]++; p.round += x.round;
}
const total = rows.length;
const list = chars.map(c => { const p = per[c.id]; return p ? { c, n: p.n, pick: p.n / total * 100, adj: p.adj / p.n * 100, ds: p.ds / p.n * 100, ts: p.ts / p.n * 100, lv: p.lv.map(v => Math.round(v / p.n * 100)), round: p.round / p.n } : { c, n: 0 }; });
const byPrice = {};
for (const x of list) if (x.n >= 30) (byPrice[x.c.price] = byPrice[x.c.price] || []).push(x);
const avg = (a, f) => a.reduce((s, x) => s + f(x) * x.n, 0) / a.reduce((s, x) => s + x.n, 0);
console.log(`runs ${runs} · ${((Date.now() - t0) / 1000).toFixed(0)} s · units fielded ${total} (normal matches, both sides)`);
console.log('id\tname\tprice\tfielded\tavgRound\tLv1/2/3%\twinAdj\tvsPrice\tdealt%\tvsPrice\ttaken%\tvsPrice');
for (const price of Object.keys(byPrice).sort((a, b) => a - b)) {
  const g = byPrice[price], aA = avg(g, x => x.adj), aD = avg(g, x => x.ds), aT = avg(g, x => x.ts);
  console.log(`-- price ${price}: avg winAdj ${aA.toFixed(1)} · dealt ${aD.toFixed(0)}% · taken ${aT.toFixed(0)}%`);
  for (const x of g.sort((a, b) => (b.adj - aA) - (a.adj - aA)))
    console.log([x.c.id, x.c.name, price, x.n, x.round.toFixed(1), x.lv.join('/'), x.adj.toFixed(1), (x.adj - aA).toFixed(1), x.ds.toFixed(0), (x.ds - aD).toFixed(0), x.ts.toFixed(0), (x.ts - aT).toFixed(0)].join('\t'));
}
const rare = list.filter(x => x.n < 30);
if (rare.length) console.log('fielded < 30 (too few to judge): ' + rare.map(x => `${x.c.id} ${x.c.name} (${x.n})`).join(' · '));
