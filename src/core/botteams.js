import { simulate } from './battle.js';
import { botShop, botPlaceRunes, botTakeRune } from './bot.js';
import { equipRunes } from './runes.js';
import { rnCompact, rnCompactOk, rnFoeScale, rnFromCompact } from './runrunes.js';
import { teamPower } from './power.js';
import { makeRng } from './rng.js';
import { RULES } from './rules.js';
import { continueExtra, endMatch, newRun, startRound, teamEntries } from './shop.js';
import { buildTeam, makeCharMap } from './team.js';
import { validateTeam } from './validate.js';
import { RUN_STAGE, runBossAt, runBossTeam, runBossOpts } from './runboss.js';
// set 107 (user D1/D2): teams carry the runes their bot held (rn, rnCompact form) + its win streak (s) + team power (pw, core/power.js teamPower)
// · the game picks the enemy by the player's power (pickFoe), not by tier
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
// set 141 (user L3): 4th tier แรงมาก = per tribe the strongest real board by teamPower (raises the ceiling the win-streak pick can reach)
export const BOT_TIERS = ['ง่าย', 'กลาง', 'ยาก', 'แรงมาก'];
export const BOT_TOP = 3; // index of the แรงมาก tier (picked by pw, not by win rate)
export const BOT_GEN = { runs: 2400, seed: 2310, perTribe: 40, refOpp: 30, pct: [25, 50, 75], near: 5 }; // set 96: runs 1200 → 2400 · ค่าเสนอ
// set 87: each tier holds BOT_PER teams → the 12 teams of a cell cover all 6 tribes twice (main tribe = most units)
export const BOT_PER = 4;
// number of round cells = the last round a main run can reach (10 wins + 9 losses = 19)
// set 119: hearts 5 → a normal run ends by round 15, but extra matches go to round lastStage − 1 (19) before the dummy → cells for every fought round
export const botRounds = (rules = RULES, stage = RUN_STAGE) => Math.max(rules.shop.winsToFinish + rules.shop.hearts - 1, (stage.settings.lastStage | 0) - 1);
export const roundCell = (round, n) => Math.max(1, Math.min(n, round | 0)) - 1;

// ---------- run จำลอง 1 รอบ (ผู้เล่น = บอท) · ใช้ทั้งสร้างทีมและวัดความยาวแมตช์ ----------
// opponent(P, B, round) → entries ของคู่แข่ง หรือ null = ใช้บอทซื้อสด B · onMatch(info) เรียกทุกแมตช์
// stage = boss settings (default = the game's; the Balance Room passes the stage it is editing) · info.res = full battle result
// opts.focus / opts.foeFocus (set 87) = tribe the player bot / spare bot B leans toward (core/bot.js teamStrength) · none = plain bot
// opts.extra (set 99) = after the run is cleared keep playing extra matches (like a player who continues) until hearts run out or round ≥ opts.extra
// opts.runes (set 107) = both bots take rune offers after wins (core/bot.js botTakeRune) and fight with them, like the game
// opponent(P) may return an entry list or { team, rn, s, pct } (pickFoe form)
export function simRun(chars, rules, seed, opponent, onMatch, stage = RUN_STAGE, opts = {}) {
  const cm = makeCharMap(chars), R = !!opts.runes;
  const P = newRun(chars, seed >>> 0, rules), B = newRun(chars, ((seed ^ 0xA5A5A5A5) >>> 0), rules);
  for (let guard = 0; guard < 220 && !P.over; guard++) { // set 108: up to lastStage rounds
    startRound(P, chars, rules); startRound(B, chars, rules);
    botShop(P, chars, rules, { focus: opts.focus || null });
    if (R) botPlaceRunes(P, cm, rules);
    // set 85: boss rounds (core/runboss.js) — same as the game: the boss replaces the bot team, the spare bot B sits out
    const rb = runBossAt(P, stage);
    const preset = rb ? null : opponent ? opponent(P) : null;
    if (!preset && !rb) { botShop(B, chars, rules, { focus: opts.foeFocus || null }); if (R) botPlaceRunes(B, cm, rules); }
    const mine = teamEntries(P), myRn = R ? rnCompact(P) : [], ws = P.ws | 0;
    const foe = rb ? null : preset ? (Array.isArray(preset) ? { team: preset } : preset) : { team: teamEntries(B), rn: R ? rnCompact(B) : [], s: B.ws | 0 };
    const me = equipRunes(buildTeam(mine, cm, rules), rnFromCompact(myRn, stage), { winStreak: ws });
    const fs = rb ? { units: runBossTeam(rb.boss, rb.k, stage, P.extra), opts: runBossOpts(rb.boss, stage) } : foeSide(foe, cm, rules, stage, P.round);
    const res = simulate(me.units, fs.units, { rules, log: false, ...(me.tribeExtra.length ? { tribeExtra: me.tribeExtra } : {}), ...fs.opts });
    const wins = P.wins, round = P.round, gold = P.gold, hearts = P.hearts, won = res.winner !== 1, ex = P.extra;
    const gain = side => (res.perm || []).filter(g => g.side === side);
    const em = endMatch(P, won, chars, rules, gain(0), !!rb);
    if (R && em.second && !P.over) botTakeRune(P, 'sc', cm); // set 119: second chance → legend pick
    if (!preset && !rb) { endMatch(B, res.winner === 1, chars, rules, gain(1)); B.over = false; B.hearts = rules.shop.hearts; B.lastWon = P.lastWon; if (R && res.winner === 1) botTakeRune(B, 'win', cm); }
    if (opts.extra && P.over && P.hearts > 0 && P.round < opts.extra) continueExtra(P);
    if (R && won && !P.over) botTakeRune(P, rb ? 'boss' : 'win', cm);
    if (onMatch) onMatch({ stage: wins, round, gold, hearts, extra: ex, second: !!em.second, team: mine, rn: myRn, ws, foe: foe ? foe.team : null, foeRn: foe ? foe.rn || [] : [], res, winner: res.winner, timeMs: res.timeMs, aborted: res.aborted || null, boss: rb ? rb.boss.id : null, k: rb ? rb.k : 0, units: me.units, opts: { rules, log: false, ...(me.tribeExtra.length ? { tribeExtra: me.tribeExtra } : {}) }, fs }); // set 144: fs = enemy side as fought (rune what-if replays)
  }
  return P;
}
// enemy bot side for simulate (set 107): team × pct (power match) × extra-round growth, then its runes · tribe flags → opts.tribeExtraB
export function foeSide(foe, cm, rules = RULES, stage = RUN_STAGE, round = 0) {
  const units = rnFoeScale(buildTeam(foe.team, cm, rules), foe.pct || 100, stage, round);
  const e = equipRunes(units, rnFromCompact(foe.rn || [], stage), { winStreak: foe.s | 0 });
  return { units: e.units, opts: e.tribeExtra.length ? { tribeExtraB: e.tribeExtra } : {} };
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
      if (m.team.length && !m.boss && m.round >= 1 && m.round <= n) pool[m.round - 1].push({ team: m.team, rn: m.rn, s: Math.min(99, m.ws), round: m.round, tribe: teamTribe(m.team, cm, focus) });
    }, RUN_STAGE, { focus, foeFocus, extra: n, runes: g.runes !== false });
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
      const cand = tribes.flatMap(t => byT[t] || []), ref = pick(list, g.refOpp).map(x => foeSide(x, cm, rules));
      // ความแรง = อัตราชนะ (เสมอ = ครึ่ง) เมื่อสู้กับทีมอ้างอิงชุดเดียวกันของขั้น+ช่วงนั้น
      for (const c of cand) {
        c.pw = Math.round(teamPower(buildTeam(c.team, cm, rules), rules) * 10) / 10;
        const me = equipRunes(buildTeam(c.team, cm, rules), rnFromCompact(c.rn || []), { winStreak: c.s | 0 }); let s = 0;
        for (const o of ref) { const w = simulate(me.units, o.units, { rules, log: false, ...(me.tribeExtra.length ? { tribeExtra: me.tribeExtra } : {}), ...o.opts }).winner; s += w === 0 ? 1 : w == null ? 0.5 : 0; }
        c.power = Math.round((s / ref.length) * 1000) / 10;
      }
      const sorted = cand.slice().sort((a, b2) => a.power - b2.power || a.round - b2.round);
      const target = g.pct.map(p => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))].power);
      const rot = k % tribes.length, order = tribes.map((_, i) => tribes[(i + rot) % tribes.length]);
      const used = new Set(), useN = {}, perT = {}, out = [];
      for (let j = 0; j < BOT_TIERS.length * BOT_PER; j++) {
        const ti = Math.floor(j / BOT_PER), want = order[j % order.length], tg = ti === BOT_TOP ? 0 : target[ti];
        let pool2 = cand.filter(c => !used.has(c) && c.tribe === want);
        if (!pool2.length) { // this tribe has no sample left → the tribe picked least so far
          const left = cand.filter(c => !used.has(c)); if (!left.length) break;
          const lo = Math.min(...left.map(c => perT[c.tribe] || 0)); pool2 = left.filter(c => (perT[c.tribe] || 0) === lo);
        }
        // nearest strength; among those within `near` points, the team whose characters were used least in this cell
        if (ti === BOT_TOP) { // set 141: strongest board of this tribe by teamPower
          const c = pool2.slice().sort((x, y) => y.pw - x.pw || x.round - y.round)[0];
          used.add(c); perT[c.tribe] = (perT[c.tribe] || 0) + 1; for (const e of c.team) useN[e.id] = (useN[e.id] || 0) + 1;
          out.push({ tier: BOT_TIERS[ti], from, round: c.round, power: c.power, pw: c.pw, rn: structuredClone(c.rn || []), s: c.s | 0, team: structuredClone(c.team) });
          continue;
        }
        const d = c => Math.abs(c.power - tg), best = Math.min(...pool2.map(d));
        const score = c => c.team.reduce((a, e) => a + (useN[e.id] || 0), 0);
        const c = pool2.filter(x => d(x) <= best + g.near).sort((x, y) => score(x) - score(y) || d(x) - d(y) || x.round - y.round)[0];
        used.add(c); perT[c.tribe] = (perT[c.tribe] || 0) + 1; for (const e of c.team) useN[e.id] = (useN[e.id] || 0) + 1;
        out.push({ tier: BOT_TIERS[ti], from, round: c.round, power: c.power, pw: c.pw, rn: structuredClone(c.rn || []), s: c.s | 0, team: structuredClone(c.team) });
      }
      return out;
    }
  });
  const sizes = pool.map((_, k) => roundPool(pool, k).list.length);
  return { v: 6, gen: { ...g, per: BOT_PER }, sizes, rounds };
}

// ---------- check bot data on load ----------
export const btOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export const btObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
export function validateBotTeams(data, cm, rules = RULES, hash = null) {
  const errors = [], n = botRounds(rules);
  if (!btObj(data) || data.v !== 6 || !Array.isArray(data.rounds)) return { ok: false, errors: ['ข้อมูลทีมบอทผิดรูปแบบ'] };
  if (hash != null && data.hash !== hash) return { ok: false, errors: ['ทีมบอทสร้างจากค่าเกมชุดเก่า (แฮชไม่ตรง) ต้องสร้างใหม่'] };
  if (data.rounds.length !== n) errors.push(`ต้องมี ${n} รอบ`);
  data.rounds.forEach((list, k) => {
    if (!Array.isArray(list) || list.length !== BOT_TIERS.length * BOT_PER) { errors.push(`รอบ ${k + 1}: ต้องมี ${BOT_TIERS.length * BOT_PER} ทีม`); return; }
    list.forEach((t, i) => {
      const at = `รอบ ${k + 1} ทีม ${i + 1}`;
      if (!btObj(t) || !Object.keys(t).every(x => ['tier', 'from', 'round', 'power', 'pw', 'rn', 's', 'team'].includes(x))) { errors.push(`${at}: ผิดรูปแบบ`); return; }
      if (typeof t.pw !== 'number' || !(t.pw > 0 && t.pw < 1e7)) errors.push(`${at}: พลังทีมผิด`);
      if (!rnCompactOk(t.rn, rules)) errors.push(`${at}: รูนผิด`);
      if (!Number.isInteger(t.s) || t.s < 0 || t.s > 99) errors.push(`${at}: ชนะติดผิด`);
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
  return { tier: t.tier, stage: k, span: 0, round: k + 1, team: structuredClone(t.team), rn: structuredClone(t.rn), s: t.s };
}
// ---------- set 119 (user 7 Nov, G2 ก): the enemy = the real bot team closest in power to the player's team ----------
// target = max(player board power (teamPower, runes not counted) × foeBase %, round median × foeFloor % (set 127)) · candidates = teams of the rounds within FOE_PICK.win of the
// player's round · the FOE_PICK.near nearest by power ratio, one by seed + round · NEVER scaled in the normal run (pct 100) · set 141: win streak
// raises the wanted power (foeWsPct), extra matches use foeBaseExtra · extra matches (after winsToFinish wins) = the same pick + foeExtraPct % hp/atk (flat)
export const FOE_PICK = { win: 3, near: 4 }; // ค่าเสนอ (internal)
export const foeWantPct = (extra, stage = RUN_STAGE) => 100 + (extra ? Math.max(0, stage.settings.foeExtraPct | 0) : 0);
// set 128 (user X9 A, lock for everyone): myUnits may be a number = the power locked at shop start (st.fp) · power 0 (round 1,
// empty board) = the median power of the round's own cell (ค่าเสนอ internal), else the weakest teams would always be picked
// set 129 → 132 (user 7 Nov): ls = losses in a row (normal + boss, st.ls) · ls ≥ foeFloorLs → foeFloor − foeFloorStep × (ls − foeFloorLs + 1), not below foeFloorMin (or foeFloor if lower)
export const foeFloorPct = (ls, stage = RUN_STAGE) => {
  const s = stage.settings, fl = s.foeFloor ?? 100, k = (ls | 0) - (s.foeFloorLs ?? 2) + 1;
  return Math.max(0, k > 0 ? Math.max(Math.min(fl, s.foeFloorMin ?? 40), fl - (s.foeFloorStep ?? 20) * k) : fl);
};
// set 141: ws = wins in a row before this match (st.ws, boss wins count) → wanted power × (1 + foeWsStep % per win from foeWsFrom) · no cap
export const foeWsPct = (ws, stage = RUN_STAGE) => { const s = stage.settings, k = (ws | 0) - (s.foeWsFrom ?? 2) + 1; return 100 + (k > 0 ? Math.max(0, s.foeWsStep ?? 10) * k : 0); };
export function pickFoe(data, myUnits, round, seed, extra = false, stage = RUN_STAGE, rules = RULES, ls = 0, ws = 0) {
  const n = data.rounds.length, k = roundCell(round, n), want = foeWantPct(extra, stage);
  let pp = typeof myUnits === 'number' ? Math.max(0, myUnits) : teamPower(myUnits, rules);
  // set 141: median over the 3 old tiers only (the แรงมาก tier would lift the floor)
  const pws = data.rounds[k].filter(t => t.tier !== BOT_TIERS[BOT_TOP]).map(t => t.pw).sort((a, b) => a - b), med = pws.length ? pws[pws.length >> 1] : 0;
  if (!(pp > 0)) pp = med;
  // set 127 (user R1 = C): floor = the round cell's median power × foeFloor % (0 = off) → a weak / sandbagged board still meets the round's usual teams
  const floor = med * foeFloorPct(ls, stage) / 100;
  const base = extra ? (stage.settings.foeBaseExtra ?? 120) : (stage.settings.foeBase ?? 100), wsp = foeWsPct(ws, stage);
  const target = Math.max(pp * base / 100, floor) * wsp / 100;
  const cand = [];
  for (let i = Math.max(0, k - FOE_PICK.win); i <= Math.min(n - 1, k + FOE_PICK.win); i++) data.rounds[i].forEach((t, j) => cand.push({ t, d: Math.abs(i - k), j }));
  const gap = x => (target > 0 ? Math.abs(Math.log(x.t.pw / target)) : x.t.pw);
  cand.sort((a, b) => gap(a) - gap(b) || a.d - b.d || a.j - b.j);
  const near = cand.slice(0, FOE_PICK.near);
  const t = near[makeRng(((seed >>> 0) ^ Math.imul((round | 0) + 1, 0x27D4EB2F) ^ 0x7E57F0E5) >>> 0).int(near.length)].t;
  const pct = want;
  return { tier: t.tier, stage: k, span: 0, round: t.round, team: structuredClone(t.team), rn: structuredClone(t.rn), s: t.s, pct, want, wsp, power: Math.round(pp), floor: Math.round(floor) };
}
