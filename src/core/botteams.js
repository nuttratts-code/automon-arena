import { simulate } from './battle.js';
import { botShop } from './bot.js';
import { makeRng } from './rng.js';
import { RULES } from './rules.js';
import { continueExtra, endMatch, newRun, startRound, teamEntries } from './shop.js';
import { buildTeam, makeCharMap } from './team.js';
import { validateTeam } from './validate.js';
import { RUN_STAGE, runBossAt, runBossTeam } from './runboss.js';
// Pre-built bot teams (set 23) · pure data, no screen code
// set 99 (user picked B, 6 Nov 2026): the enemy is picked by the player's ROUND only (shop level + income follow the round
// since sets 89/96, wins only add +2 gold) · old cells (wins × loss span, set 24 "rounds ≤ span start") gave a 3-unit round-1
// team to a player at round 2–3 who had lost once.
// - one cell per round 1 … winsToFinish + hearts − 1 (19) · each cell = ง่าย/กลาง/ยาก × BOT_PER teams from players at that round
//   (any wins) · a cell with no sample uses the previous round (never a later one) · rounds past the last cell use the last cell
// - samples come from bot-vs-bot runs (team when the fight starts, with the gold/perm values it really had) · runs keep
//   playing extra matches after 10 wins so late rounds have samples
// - strength = win rate vs reference teams of the same cell → 25/50/75% rank = ง่าย/กลาง/ยาก (ค่าเสนอ)
// - in play: 1 team of the picked tier from the round's cell by run seed + round (same team after loading a save)
// - checked on load with the same team validator as the player · hash mismatch / bad data = unused (live bot instead)
export const BOT_TIERS = ['ง่าย', 'กลาง', 'ยาก'];
export const BOT_GEN = { runs: 2400, seed: 2310, perTribe: 40, refOpp: 30, pct: [25, 50, 75], near: 5 }; // set 96: runs 1200 → 2400 · ค่าเสนอ
// set 87: each tier holds BOT_PER teams → the 12 teams of a cell cover all 6 tribes twice (main tribe = most units)
export const BOT_PER = 4;
// number of round cells = the last round a main run can reach (10 wins + 9 losses = 19)
export const botRounds = (rules = RULES) => rules.shop.winsToFinish + rules.shop.hearts - 1;
export const roundCell = (round, n) => Math.max(1, Math.min(n, round | 0)) - 1;

// ---------- run จำลอง 1 รอบ (ผู้เล่น = บอท) · ใช้ทั้งสร้างทีมและวัดความยาวแมตช์ ----------
// opponent(P, B, round) → entries ของคู่แข่ง หรือ null = ใช้บอทซื้อสด B · onMatch(info) เรียกทุกแมตช์
// stage = boss settings (default = the game's; the Balance Room passes the stage it is editing) · info.res = full battle result
// opts.focus / opts.foeFocus (set 87) = tribe the player bot / spare bot B leans toward (core/bot.js teamStrength) · none = plain bot
// opts.extra (set 99) = after the run is cleared keep playing extra matches (like a player who continues) until hearts run out or round ≥ opts.extra
export function simRun(chars, rules, seed, opponent, onMatch, stage = RUN_STAGE, opts = {}) {
  const cm = makeCharMap(chars);
  const P = newRun(chars, seed >>> 0, rules), B = newRun(chars, ((seed ^ 0xA5A5A5A5) >>> 0), rules);
  for (let guard = 0; guard < 40 && !P.over; guard++) {
    startRound(P, chars, rules); startRound(B, chars, rules);
    botShop(P, chars, rules, { focus: opts.focus || null });
    // set 85: boss rounds (core/runboss.js) — same as the game: the boss replaces the bot team, the spare bot B sits out
    const rb = runBossAt(P, stage);
    const preset = rb ? null : opponent ? opponent(P) : null;
    if (!preset && !rb) botShop(B, chars, rules, { focus: opts.foeFocus || null });
    const mine = teamEntries(P), theirs = rb ? null : preset || teamEntries(B);
    const res = simulate(buildTeam(mine, cm, rules), rb ? runBossTeam(rb.boss, rb.k) : buildTeam(theirs, cm, rules), { rules, log: false });
    const wins = P.wins, round = P.round, gold = P.gold, hearts = P.hearts;
    const gain = side => (res.perm || []).filter(g => g.side === side);
    endMatch(P, res.winner !== 1, chars, rules, gain(0), !!rb);
    if (!preset && !rb) { endMatch(B, res.winner === 1, chars, rules, gain(1)); B.over = false; B.hearts = rules.shop.hearts; B.lastWon = P.lastWon; }
    if (opts.extra && P.over && P.hearts > 0 && P.round < opts.extra) continueExtra(P);
    if (onMatch) onMatch({ stage: wins, round, gold, hearts, team: mine, foe: theirs, res, winner: res.winner, timeMs: res.timeMs, aborted: res.aborted || null, boss: rb ? rb.boss.id : null, k: rb ? rb.k : 0 });
  }
  return P;
}

// ---------- สร้างชุดทีม (รันใน node ผ่าน lab/botgen.mjs) ----------
export const tribeList = chars => [...new Set(chars.map(c => c.tribe))];
// main tribe of a team = the tribe most units belong to (extra tribes count) · tie → pref if tied, else the first in list order
export function teamTribe(team, cm, pref = null) {
  const n = {};
  for (const e of team) for (const t of [cm[e.id].tribe, ...cm[e.id].extraTribes]) n[t] = (n[t] || 0) + 1;
  const top = Math.max(...Object.values(n));
  return pref && n[pref] === top ? pref : Object.keys(n).find(t => n[t] === top);
}
// samples per round cell: pool[round − 1] = teams of players at that round (any wins)
export function gatherBotPool(chars, rules = RULES, opt = {}) {
  const g = { ...BOT_GEN, ...opt }, n = botRounds(rules);
  const pool = Array.from({ length: n }, () => []);
  const tribes = tribeList(chars), cm = makeCharMap(chars);
  for (let r = 0; r < g.runs; r++) {
    // set 87: every run's bot leans toward one tribe in turn (and its sparring bot toward another) → every tribe gets sample teams
    const focus = tribes[r % tribes.length], foeFocus = tribes[(r + 3) % tribes.length];
    simRun(chars, rules, (g.seed + Math.imul(r + 1, 0x9E3779B1)) >>> 0, null, m => {
      if (m.team.length && !m.boss && m.round >= 1 && m.round <= n) pool[m.round - 1].push({ team: m.team, round: m.round, tribe: teamTribe(m.team, cm, focus) });
    }, RUN_STAGE, { focus, foeFocus, extra: n });
  }
  return pool;
}
// samples of cell i · none = the previous round's cell (lower round, never higher) · from = cell really used
export function roundPool(pool, i) {
  for (let s = i; s >= 0; s--) if (pool[s].length) return { from: s, list: pool[s] };
  return { from: i, list: [] };
}
// cells = round cells to compute (split over processes) · cells not computed = null
export function genBotTeams(chars, rules = RULES, opt = {}, pool = null) {
  const g = { ...BOT_GEN, ...opt }, cm = makeCharMap(chars);
  pool = pool || gatherBotPool(chars, rules, g);
  const only = g.cells ? new Set(g.cells) : null;
  const rounds = pool.map((_, k) => {
    if (only && !only.has(k)) return null;
    {
      const { from, list } = roundPool(pool, k);
      if (!list.length) return [];
      const rng = makeRng((g.seed ^ Math.imul(k + 1, 0x85EBCA6B)) >>> 0);
      const pick = (arr, m) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rng.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, m); };
      const tribes = tribeList(chars), shuffled = pick(list, list.length), byT = {};
      for (const x of shuffled) { const l = byT[x.tribe] || (byT[x.tribe] = []); if (l.length < g.perTribe) l.push({ ...x }); }
      const cand = tribes.flatMap(t => byT[t] || []), ref = pick(list, g.refOpp).map(x => buildTeam(x.team, cm, rules));
      // ความแรง = อัตราชนะ (เสมอ = ครึ่ง) เมื่อสู้กับทีมอ้างอิงชุดเดียวกันของขั้น+ช่วงนั้น
      for (const c of cand) {
        const mine = buildTeam(c.team, cm, rules); let s = 0;
        for (const o of ref) { const w = simulate(mine, o, { rules, log: false }).winner; s += w === 0 ? 1 : w == null ? 0.5 : 0; }
        c.power = Math.round((s / ref.length) * 1000) / 10;
      }
      const sorted = cand.slice().sort((a, b2) => a.power - b2.power || a.round - b2.round);
      const target = g.pct.map(p => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))].power);
      const rot = k % tribes.length, order = tribes.map((_, i) => tribes[(i + rot) % tribes.length]);
      const used = new Set(), useN = {}, perT = {}, out = [];
      for (let j = 0; j < BOT_TIERS.length * BOT_PER; j++) {
        const ti = Math.floor(j / BOT_PER), want = order[j % order.length], tg = target[ti];
        let pool2 = cand.filter(c => !used.has(c) && c.tribe === want);
        if (!pool2.length) { // this tribe has no sample left → the tribe picked least so far
          const left = cand.filter(c => !used.has(c)); if (!left.length) break;
          const lo = Math.min(...left.map(c => perT[c.tribe] || 0)); pool2 = left.filter(c => (perT[c.tribe] || 0) === lo);
        }
        // nearest strength; among those within `near` points, the team whose characters were used least in this cell
        const d = c => Math.abs(c.power - tg), best = Math.min(...pool2.map(d));
        const score = c => c.team.reduce((a, e) => a + (useN[e.id] || 0), 0);
        const c = pool2.filter(x => d(x) <= best + g.near).sort((x, y) => score(x) - score(y) || d(x) - d(y) || x.round - y.round)[0];
        used.add(c); perT[c.tribe] = (perT[c.tribe] || 0) + 1; for (const e of c.team) useN[e.id] = (useN[e.id] || 0) + 1;
        out.push({ tier: BOT_TIERS[ti], from, round: c.round, power: c.power, team: structuredClone(c.team) });
      }
      return out;
    }
  });
  const sizes = pool.map((_, k) => roundPool(pool, k).list.length);
  return { v: 5, gen: { ...g, per: BOT_PER }, sizes, rounds };
}

// ---------- check bot data on load ----------
export const btOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export const btObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
export function validateBotTeams(data, cm, rules = RULES, hash = null) {
  const errors = [], n = botRounds(rules);
  if (!btObj(data) || data.v !== 5 || !Array.isArray(data.rounds)) return { ok: false, errors: ['ข้อมูลทีมบอทผิดรูปแบบ'] };
  if (hash != null && data.hash !== hash) return { ok: false, errors: ['ทีมบอทสร้างจากค่าเกมชุดเก่า (แฮชไม่ตรง) ต้องสร้างใหม่'] };
  if (data.rounds.length !== n) errors.push(`ต้องมี ${n} รอบ`);
  data.rounds.forEach((list, k) => {
    if (!Array.isArray(list) || list.length !== BOT_TIERS.length * BOT_PER) { errors.push(`รอบ ${k + 1}: ต้องมี ${BOT_TIERS.length * BOT_PER} ทีม`); return; }
    list.forEach((t, i) => {
      const at = `รอบ ${k + 1} ทีม ${i + 1}`;
      if (!btObj(t) || !Object.keys(t).every(x => ['tier', 'from', 'round', 'power', 'team'].includes(x))) { errors.push(`${at}: ผิดรูปแบบ`); return; }
      if (t.tier !== BOT_TIERS[Math.floor(i / BOT_PER)]) errors.push(`${at}: ระดับผิด`);
      if (!Number.isInteger(t.from) || t.from < 0 || t.from > k) errors.push(`${at}: รอบที่มาผิด`);
      // the team's round never passes the cell's round (the player there is at this round)
      if (!Number.isInteger(t.round) || t.round < 1 || t.round !== t.from + 1) errors.push(`${at}: รอบผิด/เกินรอบของผู้เล่น`);
      if (typeof t.power !== 'number' || !(t.power >= 0 && t.power <= 100)) errors.push(`${at}: ความแรงผิด`);
      if (!Array.isArray(t.team) || !t.team.length) { errors.push(`${at}: ทีมว่าง`); return; }
      const v = validateTeam(t.team, cm, rules);
      if (!v.ok) errors.push(`${at}: ${v.errors[0]}`);
    });
  });
  return { ok: errors.length === 0, errors };
}

// ---------- pick the enemy: cell = the player's round (past the last cell = last cell) · tier = picked difficulty ----------
// same seed + round + tier → same team (scout preview = real fight) · tier null/unknown = any of the 12 teams
export function pickBotTeam(data, round, seed, tier = null) {
  const k = roundCell(round, data.rounds.length), all = data.rounds[k], ti = BOT_TIERS.indexOf(tier);
  const list = ti < 0 ? all : all.filter(t => t.tier === tier);
  const salt = ti < 0 ? 0 : Math.imul(ti + 1, 0x165667B1);
  const i = makeRng(((seed >>> 0) ^ Math.imul((round | 0) + 1, 0x27D4EB2F) ^ salt) >>> 0).int(list.length);
  const t = list[i];
  return { tier: t.tier, stage: k, span: 0, round: k + 1, team: structuredClone(t.team) };
}
