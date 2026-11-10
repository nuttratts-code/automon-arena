// Real-player stats (set 175): lab/humanstats.js pools run codes → counts must match what the runs really contain and be identical on re-run
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { dataHash, makeReplays, makeRunCode } from '../core/save.js';
import { makeCharMap } from '../core/team.js';
import { hsCharRows, hsRunSync } from '../lab/humanstats.js';
import { eq, ok } from './helpers.js';
import { fxPlayRun } from './runlog-fixture.js';

const hsMkRun = (chars, cm, H, seed, name) => {
  const { L, list } = fxPlayRun(chars, cm, H, seed, name);
  return { L, list, code: makeRunCode([makeReplays(L.seed, H, list)], null, H, 5000, RULES, [JSON.stringify(L)], name) };
};
export const TESTS_HUMANSTATS = [
  ['ชุด 175: สถิติผู้เล่นจริง — นับตรง · รันซ้ำได้เลขเดิม · แพตช์เก่าแยกออก · โค้ดซ้ำไม่นับสอง', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars), H = dataHash(chars), ctx = { chars, CM: cm, rules: RULES, hash: H };
    const a = hsMkRun(chars, cm, H, 4, 'A'), b = hsMkRun(chars, cm, H, 777, 'B'); // seed 4: wins a match and takes a rune card
    const old = makeRunCode([makeReplays(a.L.seed, '12345678', a.list)], null, H, 5000, RULES, [], 'C');
    const texts = [a.code, b.code, a.code, old, 'ARUN1 {nope'];
    const R = hsRunSync(texts, ctx), R2 = hsRunSync(texts, ctx);
    eq(JSON.stringify(R), JSON.stringify(R2), 're-run gives the same numbers (fights are deterministic)');
    eq([R.codes, R.bad.length, R.runs.length, R.dupRuns, R.players.slice().sort()], [4, 1, 2, 1, ['A', 'B']], 'codes / bad / used runs / duplicates / players (old-patch run owner not counted)');
    eq(R.old, { '12345678': 1 }, 'other game values → counted as old patch, not mixed in');
    eq(R.matches, a.list.length + b.list.length, 'matches = stored matches of the two current runs');
    eq(R.unsim, 0, 'every match re-simulates');
    const buys = x => x.L.ev.filter(e => e[0] === 'by' || e[0] === 'bm').length;
    const bought = Object.values(R.chars).reduce((s, c) => s + c.bought, 0);
    ok(bought > 0 && bought <= buys(a) + buys(b), `purchases counted from the journal (${bought} ≤ ${buys(a) + buys(b)} attempts)`);
    const tk = Object.values(R.runes).reduce((s, r) => s + r.taken, 0), of = Object.values(R.runes).reduce((s, r) => s + r.offered, 0);
    const tkLog = a.L.ev.filter(e => e[0] === 'tk').length + b.L.ev.filter(e => e[0] === 'tk').length;
    ok(tk > 0 && tk === tkLog && of >= tk, `rune cards: taken ${tk} = journal tk events ${tkLog}, offered ${of} ≥ taken`);
    const rows = hsCharRows(R, chars, 0);
    ok(rows.length > 0 && rows.every(r => r.g >= r.w), 'wins ≤ fielded');
    const dmg = rows.reduce((s, r) => s + (r.combat ? r.combat.out : 0), 0);
    ok(dmg > 0, 'combat damage collected');
    for (const L of [1, 2, 3]) ok(hsCharRows(R, chars, L).every(r => r.g >= 0), `level ${L} rows`);
  }],
];
