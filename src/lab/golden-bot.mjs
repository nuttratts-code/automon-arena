// Godot plan step 6e (set 195): golden bot.jsonl = answers of core/bot.js + core/botteams.js helpers for the Godot port.
// The main check is golden (c) runs.jsonl (200 whole bot runs); these lines pin the parts on their own:
//   {kind:'log', xs, ys}                         Math.log on game-like + random inputs (jsmath.gd js_log = V8's own log)
//   {kind:'misc', ...}                           botRounds / roundCell / foe % helpers / tribeList / teamTribe / rows of hint
//   {kind:'foe', i, p, round, seed, extra, ls, ws, sv, res}   pickFoe (power number or a team) on the shipped bot teams
//   {kind:'pick', i, round, seed, tier, res}     pickBotTeam
//   {kind:'shop', i, st0, opts, st, flag}        botShop + botPlaceRunes + botFlagTribe on a state after startRound (live bot, mid-run)
// Random parts use the game's own rng (seeded) → byte-identical every run.
import { RULES, TRIBES, rowsOfHint, pickHintRow, ROW_HINTS } from '../core/rules.js';
import { makeRng } from '../core/rng.js';
import { makeCharMap, buildTeam } from '../core/team.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { RUN_STAGE } from '../core/runboss.js';
import { newRun, startRound, endMatch } from '../core/shop.js';
import { botShop, botPlaceRunes, botFlagTribe, botTakeRune } from '../core/bot.js';
import { botRounds, roundCell, foeWantPct, foeFloorPct, foeWsPct, pickFoe, pickBotTeam, tribeList, teamTribe, BOT_TIERS } from '../core/botteams.js';

const copy = v => JSON.parse(JSON.stringify(v));

function logLine(n) {
  const r = makeRng(1951), xs = [];
  for (let i = 1; i <= 1000; i++) xs.push(i, i + 1e-9);
  for (const row of BOT_TEAMS.rounds) for (const a of row) for (const b of row) xs.push(a.pw / b.pw);
  for (let i = 0; i < n; i++) xs.push(Math.exp((r.next() - 0.5) * 12), r.next() * 3);
  xs.push(5e-324, 1e-310, 1.7976931348623157e308, 1, 0.9999999999999999, 1.0000000000000002);
  return { kind: 'log', xs, ys: xs.map(Math.log) };
}

function stageV() {
  const s = copy(RUN_STAGE);
  Object.assign(s.settings, { foeFloor: 70, foeFloorLs: 1, foeFloorStep: 15, foeFloorMin: 30, foeWsFrom: 3, foeWsStep: 7.5, foeBase: 90, foeBaseExtra: 133, foeExtraPct: 25 });
  const t = copy(RUN_STAGE); for (const k of ['foeFloor', 'foeFloorLs', 'foeFloorStep', 'foeFloorMin', 'foeWsFrom', 'foeWsStep', 'foeBase', 'foeBaseExtra']) delete t.settings[k]; // ?? defaults
  return [RUN_STAGE, s, t];
}

function misc(chars) {
  const cm = makeCharMap(chars), stages = stageV(), r = makeRng(1952);
  const teams = Array.from({ length: 60 }, () => Array.from({ length: 1 + r.int(6) }, () => ({ id: r.pick(chars).id, level: 1, row: 0, lane: 0 })));
  return { kind: 'misc', stages, botRounds: [botRounds(), botRounds(RULES, stages[1])], roundCell: [-2, 0, 1, 5.7, 19, 20, 99, 'x'].map(x => [roundCell(x, 19), roundCell(x, 3)]),
    want: stages.map(s => [foeWantPct(false, s), foeWantPct(true, s)]), floor: stages.map(s => [-1, 0, 1, 2, 3, 4, 6, 9, 20].map(ls => foeFloorPct(ls, s))),
    wsp: stages.map(s => [-1, 0, 1, 2, 3, 5, 12].map(ws => foeWsPct(ws, s))), tribes: tribeList(chars),
    teamTribe: teams.map(t => [teamTribe(t, cm), teamTribe(t, cm, TRIBES[2]), teamTribe(t, cm, 'x')]), teams,
    hints: [...ROW_HINTS, 'x', ''].map(h => [rowsOfHint(h), [0, 0.25, 0.5, 0.99].map(x => pickHintRow(h, x))]) };
}

function* foeLines(n, chars) {
  const r = makeRng(1953), cm = makeCharMap(chars);
  for (let i = 0; i < n; i++) {
    const sv = i % 3, stage = stageV()[sv];
    let p = r.pick([0, -5, 3, 25.5, 40, 80, 150, 300, 1000]) * (r.int(3) ? 1 : r.next() * 2);
    if (r.int(5) === 0) p = buildTeam(Array.from({ length: 1 + r.int(6) }, (_, k) => ({ id: r.pick(chars).id, level: 1 + r.int(3), row: k >> 1, lane: k & 1 })), cm, RULES);
    const round = r.pick([1, 1, 2, 3, 5, 8, 12, 15, 19, 20, 25, 0, 2.5]), seed = r.int(4294967295), extra = r.int(4) === 0, ls = r.int(6), ws = r.int(7);
    const inp = copy({ p, round, seed, extra, ls, ws });
    yield { kind: 'foe', i, ...inp, sv, res: pickFoe(BOT_TEAMS, inp.p, inp.round, inp.seed, inp.extra, stage, RULES, inp.ls, inp.ws) };
  }
}

function* pickLines(n) {
  const r = makeRng(1954);
  for (let i = 0; i < n; i++) {
    const round = r.pick([1, 2, 7, 19, 30, 0, 3.5]), seed = r.int(4294967295), tier = r.int(3) ? r.pick(BOT_TIERS) : r.pick([null, 'x']);
    yield { kind: 'pick', i, round, seed, tier, res: pickBotTeam(BOT_TEAMS, round, seed, tier) };
  }
}

// a live bot mid-run: play a few rounds (startRound → botShop → endMatch) then record one more botShop from that state
function* shopLines(n, chars) {
  const r = makeRng(1955), cm = makeCharMap(chars), tribes = tribeList(chars);
  for (let i = 0; i < n; i++) {
    const st = newRun(chars, r.int(4294967295), RULES), focus = r.int(3) ? r.pick(tribes) : null;
    for (let k = r.int(14); k-- > 0 && !st.over;) {
      startRound(st, chars, RULES); botShop(st, chars, RULES, { focus }); botPlaceRunes(st, cm, RULES);
      const won = r.int(3) > 0; endMatch(st, won, chars, RULES, []); if (won && !st.over) botTakeRune(st, r.pick(['win', 'boss']), cm);
    }
    if (st.over) continue;
    startRound(st, chars, RULES);
    const st0 = copy(st), opts = r.int(5) === 0 ? { focus, maxRerolls: r.int(5) } : { focus };
    botShop(st, chars, RULES, opts); botPlaceRunes(st, cm, RULES);
    yield { kind: 'shop', i, st0, opts, st: copy(st), flag: botFlagTribe(st, cm) };
  }
}

export function* botGolden(cfg, chars) {
  yield logLine(cfg.shopSeqs * 300);
  yield misc(chars);
  yield* foeLines(cfg.shopSeqs * 4, chars);
  yield* pickLines(cfg.shopSeqs);
  yield* shopLines(cfg.shopSeqs, chars);
}
