// Test fixture (set 110): play a whole run the way the game page does — journal every action (core/runlog.js), fight for real
// (same player/foe sides as the page), store a replay per match — so lab/runlogread.js can be checked on a realistic run code.
import { simulate } from '../core/battle.js';
import { botShop } from '../core/bot.js';
import { foeSide } from '../core/botteams.js';
import { makeRng } from '../core/rng.js';
import { RULES } from '../core/rules.js';
import { RUN_STAGE, runBossAt, runBossOpts, runBossTeam } from '../core/runboss.js';
import { equipRunes } from '../core/runes.js';
import { rnCompact, rnFromCompact } from '../core/runrunes.js';
import { newRunLog, rlApply, rlGains, rlPush, rlRef } from '../core/runlog.js';
import { replayEntry } from '../core/save.js';
import { endMatch, newRun, startRound, teamEntries } from '../core/shop.js';
import { buildTeam } from '../core/team.js';

export function fxPlayRun(chars, cm, hash, seed, name = '', maxRounds = 14) {
  const rng = makeRng(seed ^ 0x5151), pick = n => Math.floor(rng.next() * n);
  const P = newRun(chars, seed), B = newRun(chars, (seed ^ 0xA5A5A5A5) >>> 0), L = newRunLog(seed, hash, 1000, name), list = [];
  let clock = 1000;
  const J = e => { const g0 = P.gold, snap = JSON.stringify(P), r = rlApply(P, e, chars); clock += 1500; if (e[0] === 'of' || (r && r.ok) || JSON.stringify(P) !== snap) rlPush(L, e[0], e.slice(4), g0, P.gold, clock); return r; };
  const refs = () => P.bench.map((u, i) => (u ? { at: 'bench', i } : null)).filter(Boolean);
  for (let n = 0; n < maxRounds && !P.over; n++) {
    J(['st', 0, 0, 0]); startRound(B, chars, RULES);
    for (let k = 0; k < 10; k++) {
      const x = pick(6);
      if (x < 3) J(['by', 0, 0, 0, pick(P.shop.length), rlRef({ at: 'board', row: pick(3), lane: pick(2) })]);
      else if (x < 4) J(['rr', 0, 0, 0]);
      else if (x < 5 && refs().length) J(['mv', 0, 0, 0, rlRef(refs()[0]), rlRef({ at: 'board', row: pick(3), lane: pick(2) })]);
      else J(['by', 0, 0, 0, pick(P.shop.length), '-']);
    }
    const rb = runBossAt(P), round = P.round, teamA = teamEntries(P), runes = rnCompact(P);
    if (!rb) botShop(B, chars, RULES);
    const teamB = rb ? { boss: rb.boss.id, k: rb.k } : teamEntries(B);
    const e = equipRunes(buildTeam(teamA, cm), rnFromCompact(runes), { winStreak: 0 });
    const fo = rb ? { units: runBossTeam(rb.boss, rb.k), opts: runBossOpts(rb.boss) } : foeSide({ team: teamB, pct: 100, rn: [], s: 0 }, cm, RULES, RUN_STAGE, round);
    const res = simulate(e.units, fo.units, { ...(e.tribeExtra.length ? { tribeExtra: e.tribeExtra } : {}), ...fo.opts });
    const won = res.winner !== 1, gain = (res.perm || []).filter(g => g.side === 0);
    J(['en', 0, 0, 0, won ? 1 : 0, rb ? 1 : 0, rlGains(gain)]);
    if (!rb) { endMatch(B, res.winner === 1, chars, RULES, (res.perm || []).filter(g => g.side === 1)); B.over = false; B.hearts = RULES.shop.hearts; }
    if (won && !P.over) { J(['of', 0, 0, 0, rb ? 'boss' : 'win']); if (P.rn.offer) J(['tk', 0, 0, 0, 0]); }
    list.push(replayEntry(round, teamA, teamB, res, runes, 0));
  }
  return { P, L, list };
}
