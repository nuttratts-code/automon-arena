// ชุดทดสอบ: ทีมบอท 90 ทีม ขั้นชนะ × ช่วงรอบ เลือกคู่แข่ง บอทซื้อของ · แยกจาก mechanics.js (ชุด D) · ตัวช่วยอยู่ helpers.js
import { simulate } from '../core/battle.js';
import { botShop } from '../core/bot.js';
import { runBossAt, RUN_STAGE } from '../core/runboss.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { BOT_PER, BOT_TIERS, botRounds, genBotTeams, teamTribe, tribeList, pickBotTeam, simRun, roundPool, validateBotTeams } from '../core/botteams.js';
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { dataHash } from '../core/save.js';
import { endMatch, newRun, startRound, teamEntries } from '../core/shop.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { validateTeam } from '../core/validate.js';
import { eq, ok } from './helpers.js';
export const TESTS_BOTS = [
  ['set 99: bot teams = one cell per round (1–19) × ง่าย/กลาง/ยาก × 4 · pass the checker and match the game data', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars), n = botRounds(RULES);
    const v = validateBotTeams(BOT_TEAMS, cm, RULES, dataHash(chars));
    ok(v.ok, 'ทีมบอทใช้ไม่ได้ (ค่าตัวละคร/กฎเปลี่ยน → รัน node lab/botgen.mjs ใหม่): ' + v.errors.slice(0, 3).join(' | '));
    const tiers = BOT_TIERS.flatMap(t => Array(BOT_PER).fill(t));
    eq(BOT_TEAMS.rounds.map(l => l.map(t => t.tier)), Array.from({ length: n }, () => tiers), `${n} rounds × ง่าย/กลาง/ยาก × 4`);
  }],
  ['set 99 (user saw a 3-unit enemy at match 2): every team comes from its own round · from round 2 on every team has ≥ 5 units', () => {
    BOT_TEAMS.rounds.forEach((l, k) => {
      ok(l.every(t => t.round === t.from + 1 && t.from <= k), `round ${k + 1}: team from a later round`);
      if (k >= 1) ok(l.every(t => t.team.length >= 5), `round ${k + 1}: team with ${Math.min(...l.map(t => t.team.length))} units`);
    });
    ok(BOT_TEAMS.rounds.filter((l, k) => l[0].from === k).length >= BOT_TEAMS.rounds.length - 2, 'almost every round has its own samples');
  }],
  ['set 87: bot teams spread over tribes (every cell ≥ 5 main tribes · every tribe ≥ 12% of all teams)', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars), all = {};
    BOT_TEAMS.rounds.forEach((l, k) => {
      const ts = l.map(t => teamTribe(t.team, cm)); ts.forEach(t => { all[t] = (all[t] || 0) + 1; });
      ok(new Set(ts).size >= 5, `รอบ ${k + 1}: เผ่าหลักแค่ ${new Set(ts).size} เผ่า`);
    });
    const tot = BOT_TEAMS.rounds.length * BOT_TIERS.length * BOT_PER;
    for (const t of tribeList(chars)) ok((all[t] || 0) >= 0.12 * tot, `${t}: ${all[t] || 0} ทีม`);
  }],
  ['ชุด 23: ทีมบอทถูกแก้/ผิดรูปแบบ ถูกปฏิเสธ', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars), H = 'abc', n = botRounds(RULES);
    const team = [{ id: chars[0].id, level: 1, row: 0, lane: 0 }];
    const good = { v: 6, hash: H, rounds: Array.from({ length: n }, (_, k) => BOT_TIERS.flatMap(t => Array(BOT_PER).fill(t)).map(tier => ({ tier, from: k, round: k + 1, power: 50, pw: 100, rn: [], s: 0, team: structuredClone(team) }))) };
    ok(validateBotTeams(good, cm, RULES, H).ok, 'ข้อมูลปกติผ่าน');
    const bad = f => { const o = structuredClone(good); f(o); return validateBotTeams(o, cm, RULES, H).ok; };
    eq([bad(o => { o.hash = 'zzz'; }), bad(o => { o.rounds.pop(); }), bad(o => { o.rounds[2].pop(); }), bad(o => { o.rounds[1][0].team[0].id = 'ZZ-9'; }),
      bad(o => { o.rounds[1][0].team[0].level = 4; }), bad(o => { o.rounds[1][0].team[0].perm = { multi: 1e9 }; }), bad(o => { o.rounds[1][0].team[0].perm = { hack: 1 }; }),
      bad(o => { o.rounds[1][0].evil = 1; }), bad(o => { o.rounds[1][0].team = []; }), bad(o => { o.rounds[1][1].tier = 'ยาก'; }), bad(o => { o.rounds[0][0].round = 1.5; }),
      bad(o => { o.rounds[2][0].from = 3; o.rounds[2][0].round = 4; }), bad(o => { o.rounds[2][0].round = 2; }), bad(o => { o.rounds[0][2].power = 'x'; }),
      bad(o => { o.rounds[3][2].team.push({ ...team[0] }); }), bad(o => { o.v = 4; }), bad(o => { o.rounds[0][0].pw = -1; }), bad(o => { o.rounds[0][0].rn = [{ id: 'bad id', n: 1 }]; }), bad(o => { o.rounds[0][0].s = 1.5; })].every(x => x === false), true, 'ทุกแบบที่ผิดถูกปฏิเสธ');
    ok(!validateBotTeams(null, cm, RULES, H).ok && !validateBotTeams('x', cm, RULES, H).ok, 'ไม่ใช่วัตถุ = ปฏิเสธ');
  }],
  ['set 99: empty round cell uses the previous round, never a later one', () => {
    const pool = [[{ round: 1 }], [], [{ round: 3 }], []];
    eq([roundPool(pool, 0).from, roundPool(pool, 1).from, roundPool(pool, 2).from, roundPool(pool, 3).from], [0, 0, 2, 2], 'previous round');
    eq(roundPool([[]], 0).list.length, 0, 'nothing at all = empty');
  }],
  ['set 99: enemy picked by round (+ tier) · same seed = same team · past the last round = last cell · gen repeatable · sim run ends', () => {
    const chars = buildCharacterList(), n = BOT_TEAMS.rounds.length;
    for (let rnd = 1; rnd <= n + 5; rnd++) for (const tier of [null, ...BOT_TIERS]) {
      const a = pickBotTeam(BOT_TEAMS, rnd, 777, tier), b = pickBotTeam(BOT_TEAMS, rnd, 777, tier), k = Math.min(rnd, n) - 1;
      eq(a, b, 'เมล็ด/รอบเดิม = ทีมเดิม'); eq(a.round, k + 1, 'cell = round');
      if (tier) eq(a.tier, tier, 'tier');
      ok(BOT_TEAMS.rounds[k].some(t => t.tier === a.tier && JSON.stringify(t.team) === JSON.stringify(a.team)), 'team from that round');
      a.team.length = 0; ok(BOT_TEAMS.rounds[k].every(t => t.team.length > 0), 'แก้ทีมที่ได้ไม่กระทบข้อมูลต้นฉบับ');
    }
    const seen = new Set(); for (let s = 1; s <= 40; s++) seen.add(pickBotTeam(BOT_TEAMS, 9, s).tier);
    eq(seen.size, 3, 'สุ่มได้ครบ 3 ระดับ');
    const o = { runs: 3, perTribe: 2, refOpp: 3 };
    const g1 = genBotTeams(chars, RULES, o);
    eq(JSON.stringify(g1), JSON.stringify(genBotTeams(chars, RULES, o)), 'สร้างซ้ำได้ผลเดิม');
    eq(JSON.stringify(genBotTeams(chars, RULES, { ...o, cells: [0, 1] }).rounds.slice(0, 2)), JSON.stringify(g1.rounds.slice(0, 2)), 'แบ่งรอบให้หลายโปรเซสได้ผลเดิม');
    let m = 0; const P = simRun(chars, RULES, 5, p => pickBotTeam(BOT_TEAMS, p.round, p.seed).team, () => m++);
    ok(P.over && m === P.round && m >= 10 && m <= 19, `run จำลองกับทีมเตรียมจบได้ (${m} แมตช์)`);
    let x = 0; const Q = simRun(chars, RULES, 5, p => pickBotTeam(BOT_TEAMS, p.round, p.seed).team, () => x++, RUN_STAGE, { extra: 40 });
    ok(Q.over && (Q.hearts <= 0 || Q.round >= 40) && x === Q.round, `extra matches play on until hearts run out (${x} matches, ${Q.wins} wins)`);
  }],
  ['บอท: ซื้อตามกฎ ทีมถูกกฎทุกรอบ ผลเหมือนเดิมทุกครั้ง (20 run)', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars);
    const play = seed => {
      const P = newRun(chars, seed), B = newRun(chars, seed + 1);
      while (!P.over) {
        startRound(P, chars); startRound(B, chars, RULES);
        botShop(P, chars); botShop(B, chars, RULES);
        for (const s of [P, B]) { ok(s.gold >= 0, 'เงินติดลบ'); const v = validateTeam(teamEntries(s), cm); ok(v.ok, v.errors.join(' · ')); }
        const r = simulate(buildTeam(teamEntries(P), cm), buildTeam(teamEntries(B), cm), { log: false });
        endMatch(P, r.winner !== 1, chars); endMatch(B, r.winner === 1, chars); B.over = false; B.lastWon = P.lastWon;
        ok(P.round < 25, 'run ไม่จบ');
      }
      return JSON.stringify(P);
    };
    for (let i = 0; i < 20; i++) eq(play(50 + i) === play(50 + i), true, `run ${i} ผลไม่ตรงกัน`);
  }],
  ['set 99/100: boss after every bossEvery normal wins · lost boss = heart lost, a boss comes back after bossEvery more wins · same seed+round same boss · random boss per match', () => {
    const S = RUN_STAGE.settings, E = S.bossEvery, on = RUN_STAGE.bosses.filter(b => b.on);
    for (let seed = 1; seed <= 30; seed++) {
      const st = { seed, bw: 0, bk: 0 };
      for (let i = 0; i < E; i++) { eq(runBossAt(st), null, 'no boss before bossEvery wins'); st.bw++; }
      const b1 = runBossAt(st); ok(b1 && b1.k === 1, 'boss 1 after bossEvery wins');
      eq(JSON.stringify(runBossAt({ ...st })), JSON.stringify(b1), 'เมล็ดเดิมได้บอสเดิม');
      st.bw = E; st.bk = 1; const b2 = runBossAt(st); eq(b2.k, 2, 'boss 2 after a boss win');
      eq(runBossAt({ seed, bw: E, bk: S.bossesPerRun }), null, 'no more than bossesPerRun bosses');
    }
    const ids = new Set(); for (let seed = 1; seed <= 60; seed++) ids.add(runBossAt({ seed, bw: E, bk: 0 }).boss.id);
    ok(ids.size >= Math.min(3, on.length), 'สุ่มบอสหลายตัว');
    // set 100 (user): each boss match draws any boss → over rounds of one run the same boss may repeat and others come too
    const per = new Set(); let rep = false;
    for (let round = 1; round <= 40; round++) { const b = runBossAt({ seed: 5, bw: E, bk: 0, round }).boss.id; if (per.has(b)) rep = true; per.add(b); }
    ok(rep && per.size === on.length, 'random per boss match: repeats possible, every boss can come');
    // whole run: boss matches come exactly after E normal wins since the last boss fight
    const chars = buildCharacterList(); let since = 0, beaten = 0, seen = 0;
    for (let seed = 11; seed < 31; seed++) {
      since = 0; beaten = 0;
      simRun(chars, RULES, seed, p => pickBotTeam(BOT_TEAMS, p.round, p.seed).team, m => {
        if (m.boss) { seen++; eq([since, m.k], [E, beaten + 1], 'boss timing'); since = 0; if (m.winner !== 1) beaten++; }
        else { ok(since < E, 'boss skipped'); if (m.winner !== 1) since++; }
      }, RUN_STAGE, { extra: 40 });
    }
    ok(seen >= 1, 'met a boss');
  }],
  ['set 86: simRun ใช้ค่าด่านที่ส่งมา (ห้องบาลานซ์ "รันจริง") · ไม่มีบอส = ไม่เจอบอส · บอสหลังชนะ 1 ครั้ง ไม่เกิน 1 ตัว', () => {
    const chars = buildCharacterList(), pick = p => pickBotTeam(BOT_TEAMS, p.round, p.seed).team;
    const st = (every, max) => ({ ...RUN_STAGE, settings: { ...RUN_STAGE.settings, bossEvery: every, bossesPerRun: max } });
    const none = []; simRun(chars, RULES, 7, pick, m => { if (m.boss) none.push(m.round); }, st(4, 0));
    eq(none.length, 0, 'bossesPerRun 0 = ไม่มีบอส');
    let wins = 0, first = 0; const at = [];
    simRun(chars, RULES, 7, pick, m => { ok(m.res && Array.isArray(m.res.units), 'ส่งผลแมตช์เต็มมาด้วย'); if (m.boss) { at.push(m.k); if (!first) first = wins; } else if (m.winner !== 1 && !at.length) wins++; }, st(1, 1));
    ok(at.length >= 1 && at.every(k => k === 1) && first === 1, 'boss after 1 win, only boss 1 (retried until beaten)');
  }],
];
