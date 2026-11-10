// Real-player stats (set 175, user 10 Nov): many run codes (ARUN1) pasted together → one pooled report for the Balance Room tab
// "ผู้เล่นจริง". Pure data: no page code, no DOM. All names start with hs (the build bundles every file into one script).
// What is counted (everything is rebuilt, nothing new is stored by the game):
//   - what the player bought / sold  ← run journal (core/runlog.js) replayed from its seed
//   - rune cards offered / taken / skipped / placed  ← the same journal
//   - fielded matches + wins per character and per level, runes held in a fight  ← stored matches of the run
//   - damage / heal / armor / kills per character  ← every stored match re-simulated with detail on (same numbers as the match tab)
//   - per run: rounds, wins, losses, round(s) lost, final team
// A fight is deterministic from its two teams + runes (core/battle.js seeds from the team hashes), so the numbers are the same on every
// re-run — but only with the SAME game values: a run whose data hash differs from ctx.hash is counted under "old patch" and left out.
import { simulate } from '../core/battle.js';
import { foeSide } from '../core/botteams.js';
import { RUN_STAGE, runBossById, runBossOpts, runBossTeam } from '../core/runboss.js';
import { equipRunes } from '../core/runes.js';
import { rnFromCompact } from '../core/runrunes.js';
import { rlReplay, rlUnref } from '../core/runlog.js';
import { parseRunCode, replayPct } from '../core/save.js';
import { get } from '../core/shop.js';
import { buildTeam } from '../core/team.js';
import { mxCombatAdd } from './matchcalc.js';

// one stored match (save.js replay entry) → the full simulate result with the detail log, or null (cannot rebuild)
export function hsSimDetail(x, CM, rules) {
  try {
    const e = equipRunes(buildTeam(x.a, CM), rnFromCompact(x.n || []), { winStreak: x.g | 0 });
    let fo;
    if (Array.isArray(x.b)) fo = foeSide({ team: x.b, pct: replayPct(x.d), rn: x.fn || [], s: x.fs | 0 }, CM, rules, RUN_STAGE, x.r);
    else { const rec = runBossById(x.b.boss); if (!rec) return null; fo = { units: runBossTeam(rec, x.b.k, RUN_STAGE, x.b.x === 1), opts: runBossOpts(rec) }; }
    return simulate(e.units, fo.units, { ...(e.tribeExtra.length ? { tribeExtra: e.tribeExtra } : {}), ...fo.opts, detail: true });
  } catch (err) { return null; }
}

const hsNew = () => ({ bought: 0, sold: 0, g: [0, 0, 0, 0], w: [0, 0, 0, 0], final: 0 }); // g/w[level] = matches fielded / won at that level (index 0 = all)
const hsRune = () => ({ offered: 0, taken: 0, placed: 0, held: 0, heldWon: 0 });

// texts = list of run-code strings · ctx = { chars, CM, rules, hash } → generator: yields [done, total] after each run, returns the report
// (a generator so tests can run it synchronously and the page can pause between runs to stay responsive)
export function* hsSteps(texts, ctx) {
  const { chars, CM, rules, hash } = ctx;
  const out = {
    codes: 0, bad: [], players: [], runs: [], old: {}, dupRuns: 0, matches: 0, unsim: 0,
    chars: {}, runes: {}, loseRound: {}, offers: 0, skips: 0, cb: {}, cbLv: { 1: {}, 2: {}, 3: {} },
  };
  const players = new Set(), seen = new Set();
  const ch = id => (out.chars[id] ||= hsNew()), rn = id => (out.runes[id] ||= hsRune());
  const pending = []; // { rc, run, log }
  texts.forEach((t, i) => {
    let rc; try { rc = parseRunCode(t, CM, rules); } catch (e) { out.bad.push({ i: i + 1, error: e.message }); return; }
    out.codes++;
    const seeds = new Set([...rc.runs.map(r => r.run), ...rc.logs.map(l => l.seed)]);
    for (const seed of seeds) {
      const run = rc.runs.find(r => r.run === seed) || null, log = rc.logs.find(l => l.seed === seed) || null;
      const data = (run && run.data) || (log && log.data), key = seed + '/' + data; // the same run sent twice = same seed + same game values
      if (seen.has(key)) { out.dupRuns++; continue; }
      seen.add(key);
      if (data !== hash) { out.old[data] = (out.old[data] || 0) + 1; continue; }
      pending.push({ nm: rc.nm || '', seed, run, log });
    }
  });
  let done = 0;
  for (const p of pending) {
    if (p.nm) players.add(p.nm);
    // ---- journal: purchases + rune cards
    if (p.log) {
      let R = null; try { R = rlReplay(p.log, chars, rules, true); } catch (e) { R = null; }
      if (R) for (const s of R.steps) {
        const t = s.e[0], a = s.e.slice(4), ok = s.res && s.res.ok;
        if ((t === 'by' || t === 'bm') && ok) { const id = s.before.shop[a[0]] && s.before.shop[a[0]].id; if (id) ch(id).bought++; }
        else if (t === 'sl' && ok) { const u = get(s.before, rlUnref(a[0])); if (u) ch(u.id).sold++; }
        else if (t === 'of' && s.res && s.res.offer) { out.offers++; for (const id of s.res.offer.ids) rn(id).offered++; }
        else if (t === 'tk' && ok) { const o = s.before.rn && s.before.rn.offer; if (o && o.ids[a[0]]) rn(o.ids[a[0]]).taken++; }
        else if (t === 'sk') out.skips++;
        else if (t === 'pl' && ok && typeof a[0] === 'string' && a[1] !== '-') rn(a[0]).placed++;
      }
    }
    // ---- stored matches: fielded / won by level, runes held, combat numbers, losses
    const list = p.run ? p.run.list.slice().sort((x, y) => x.r - y.r) : [];
    let wins = 0, losses = 0; const lost = [];
    for (const x of list) {
      out.matches++;
      const won = x.w === 0; won ? wins++ : (losses++, lost.push({ round: x.r, boss: !Array.isArray(x.b) }));
      if (!won) out.loseRound[x.r] = (out.loseRound[x.r] || 0) + 1;
      for (const id of new Set(x.a.map(e => e.id))) { const c = ch(id); c.g[0]++; c.w[0] += won ? 1 : 0; }
      for (const k of new Set(x.a.map(e => e.id + '#' + e.level))) { const [id, L] = k.split('#'), c = ch(id); if (c.g[L] != null) { c.g[L]++; c.w[L] += won ? 1 : 0; } }
      for (const r of x.n || []) { const q = rn(r.id); q.held++; q.heldWon += won ? 1 : 0; }
      const res = hsSimDetail(x, CM, rules);
      if (res) mxCombatAdd(out.cb, res, 0, out.cbLv); else out.unsim++;
    }
    const last = list[list.length - 1];
    if (last) for (const id of new Set(last.a.map(e => e.id))) ch(id).final++;
    out.runs.push({
      nm: p.nm, seed: p.seed, at: p.log ? p.log.at : 0, matches: list.length, wins, losses, lost,
      rounds: last ? last.r : 0, lastWon: !!last && last.w === 0,
      final: last ? last.a.map(e => ({ id: e.id, level: e.level })) : [], journal: !!p.log, cut: !!(p.log && p.log.cut),
    });
    done++; yield [done, pending.length];
  }
  out.players = [...players];
  return out;
}

// page use: pauses between runs and reports progress
export async function hsAggregate(texts, ctx, onTick = null) {
  const g = hsSteps(texts, ctx);
  for (;;) {
    const s = g.next(); if (s.done) return s.value;
    if (onTick) onTick(s.value[0], s.value[1]);
    await new Promise(r => setTimeout(r, 0));
  }
}
export function hsRunSync(texts, ctx) { const g = hsSteps(texts, ctx); let s; while (!(s = g.next()).done); return s.value; }

// pooled rows for the character table at one level (0 = all) → [{ id, name, tribe, rarity, bought, sold, g, w, final, combat }]
export function hsCharRows(R, chars, L = 0) {
  const cb = L ? R.cbLv[L] || {} : R.cb;
  return chars.filter(c => R.chars[c.id] || cb[c.id]).map(c => {
    const x = R.chars[c.id] || hsNew();
    return { id: c.id, name: c.name, tribe: c.tribe, rarity: c.rarity, bought: x.bought, sold: x.sold, g: x.g[L], w: x.w[L], final: x.final, combat: cb[c.id] || null };
  });
}
