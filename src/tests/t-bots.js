// ชุดทดสอบ: ทีมบอท 90 ทีม ขั้นชนะ × ช่วงรอบ เลือกคู่แข่ง บอทซื้อของ · แยกจาก mechanics.js (ชุด D) · ตัวช่วยอยู่ helpers.js
import { simulate } from '../core/battle.js';
import { botShop } from '../core/bot.js';
import { runBossAt, RUN_STAGE } from '../core/runboss.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { BOT_PER, BOT_SPANS, BOT_TIERS, genBotTeams, teamTribe, tribeList, pickBotTeam, simRun, spanOf, spanPool, validateBotTeams } from '../core/botteams.js';
import { buildCharacterList } from '../core/characters.js';
import { RULES } from '../core/rules.js';
import { dataHash } from '../core/save.js';
import { endMatch, newRun, startRound, teamEntries } from '../core/shop.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { validateTeam } from '../core/validate.js';
import { eq, ok } from './helpers.js';
export const TESTS_BOTS = [
  ['ชุด 23: ทีมบอท 360 ทีม (ขั้น × ช่วงรอบ × 4 ทีมต่อระดับ) ผ่านตัวตรวจและตรงกับค่าเกม', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars);
    const v = validateBotTeams(BOT_TEAMS, cm, RULES, dataHash(chars));
    ok(v.ok, 'ทีมบอทใช้ไม่ได้ (ค่าตัวละคร/กฎเปลี่ยน → รัน node lab/botgen.mjs ใหม่): ' + v.errors.slice(0, 3).join(' | '));
    const tiers = BOT_TIERS.flatMap(t => Array(BOT_PER).fill(t));
    eq(BOT_TEAMS.stages.map(sp => sp.map(l => l.map(t => t.tier))), Array.from({ length: 10 }, () => BOT_SPANS.map(() => tiers)), '10 ขั้น × 3 ช่วง × ง่าย/กลาง/ยาก × 4');
  }],
  ['set 87: bot teams spread over tribes (every cell ≥ 5 main tribes · every tribe ≥ 12% of all teams)', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars), all = {};
    BOT_TEAMS.stages.forEach((sp, k) => sp.forEach((l, b) => {
      const ts = l.map(t => teamTribe(t.team, cm)); ts.forEach(t => { all[t] = (all[t] || 0) + 1; });
      ok(new Set(ts).size >= 5, `ขั้น ${k} ช่วง ${b}: เผ่าหลักแค่ ${new Set(ts).size} เผ่า`);
    }));
    for (const t of tribeList(chars)) ok((all[t] || 0) >= 0.12 * 360, `${t}: ${all[t] || 0} ทีม`);
  }],
  ['ชุด 23: ทีมบอทถูกแก้/ผิดรูปแบบ ถูกปฏิเสธ', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars), H = 'abc';
    const team = [{ id: chars[0].id, level: 1, row: 0, lane: 0 }];
    const good = { v: 4, hash: H, stages: Array.from({ length: 10 }, (_, k) => BOT_SPANS.map((__, b) => BOT_TIERS.flatMap(t => Array(BOT_PER).fill(t)).map(tier => ({ tier, span: b, from: k, round: 1, power: 50, team: structuredClone(team) })))) };
    ok(validateBotTeams(good, cm, RULES, H).ok, 'ข้อมูลปกติผ่าน');
    const bad = f => { const o = structuredClone(good); f(o); return validateBotTeams(o, cm, RULES, H).ok; };
    eq([bad(o => { o.hash = 'zzz'; }), bad(o => { o.stages.pop(); }), bad(o => { o.stages[2].pop(); }), bad(o => { o.stages[2][1].pop(); }), bad(o => { o.stages[1][0][0].team[0].id = 'ZZ-9'; }),
      bad(o => { o.stages[1][0][0].team[0].level = 4; }), bad(o => { o.stages[1][0][0].team[0].perm = { multi: 1e9 }; }), bad(o => { o.stages[1][0][0].team[0].perm = { hack: 1 }; }),
      bad(o => { o.stages[1][0][0].evil = 1; }), bad(o => { o.stages[1][0][0].team = []; }), bad(o => { o.stages[1][0][1].tier = 'ยาก'; }), bad(o => { o.stages[0][0][0].round = 1.5; }),
      bad(o => { o.stages[0][2][0].span = 1; }), bad(o => { o.stages[0][1][0].from = 1; }), bad(o => { o.stages[2][0][0].round = 4; }), bad(o => { o.stages[0][2][0].power = 'x'; }),
      bad(o => { o.stages[3][1][2].team.push({ ...team[0] }); }), bad(o => { o.v = 3; })].every(x => x === false), true, 'ทุกแบบที่ผิดถูกปฏิเสธ');
    ok(!validateBotTeams(null, cm, RULES, H).ok && !validateBotTeams('x', cm, RULES, H).ok, 'ไม่ใช่วัตถุ = ปฏิเสธ');
  }],
  ['ชุด 24: ช่วงรอบจากจำนวนแพ้ · ทีมบอทมาจากรอบไม่เกินรอบผู้เล่น', () => {
    // ไม่ผูกกับตัวเลขช่วงที่ผู้ใช้เลือก: ตรวจจาก BOT_SPANS
    BOT_SPANS.forEach(([a, b], i) => { eq([spanOf(a), spanOf(b)], [i, i], `ขอบช่วง ${i}`); });
    eq([spanOf(-3), spanOf(99)], [0, BOT_SPANS.length - 1], 'นอกช่วงหนีบเข้าขอบ');
    // ตัวอย่างสมมติ: ขั้น k แพ้ L → ทีมเก็บรอบ k + L + 1
    const pool = Array.from({ length: 3 }, (_, k) => Array.from({ length: 10 }, (_, L) => (k === 2 ? [] : [{ round: k + L + 1, team: [] }])));
    BOT_SPANS.forEach(([lo], b) => {
      const r = spanPool(pool, 1, b);
      eq([r.from, r.list.length], [1, lo + 1], `ช่วง ${b}: ใช้เฉพาะแพ้ 0–${lo}`);
      ok(r.list.every(x => x.round <= 1 + 1 + lo), 'รอบไม่เกินรอบแรกของช่วง');
      eq(spanPool(pool, 2, b).from, 1, 'ไม่มีตัวอย่าง = ใช้ขั้นก่อนหน้า');
    });
    // ข้อมูลจริง: ทุกทีมรอบไม่เกินรอบของผู้เล่นทุกคนที่อาจเจอ
    for (let w = 0; w < 10; w++) for (let loss = 0; loss < 10; loss++)
      ok(BOT_TEAMS.stages[w][spanOf(loss)].every(t => t.round <= w + loss + 1), `ขั้น ${w} แพ้ ${loss}: ทีมบอทรอบเกินผู้เล่น`);
  }],
  ['ชุด 23: เลือกคู่แข่งตามขั้นชนะและช่วงรอบ ผลเดิมทุกครั้ง · สร้างทีมซ้ำได้ผลเดิม · run จำลองจบได้', () => {
    const chars = buildCharacterList();
    for (let w = 0; w < 10; w++) for (let loss = 0; loss < 10; loss++) {
      const rnd = w + loss + 1, a = pickBotTeam(BOT_TEAMS, w, 777, rnd), b = pickBotTeam(BOT_TEAMS, w, 777, rnd);
      eq(a, b, 'เมล็ด/รอบเดิม = ทีมเดิม'); eq([a.stage, a.span], [w, spanOf(loss)], 'ขั้นตรงกับจำนวนชนะ ช่วงตรงกับจำนวนแพ้');
      ok(BOT_TEAMS.stages[w][a.span].some(t => t.tier === a.tier && JSON.stringify(t.team) === JSON.stringify(a.team)), 'ทีมมาจากขั้น+ช่วงนั้น');
      a.team.length = 0; ok(BOT_TEAMS.stages[w][a.span].every(t => t.team.length > 0), 'แก้ทีมที่ได้ไม่กระทบข้อมูลต้นฉบับ');
    }
    const seen = new Set(); for (let s = 1; s <= 40; s++) seen.add(pickBotTeam(BOT_TEAMS, 4, s, 9).tier);
    eq(seen.size, 3, 'สุ่มได้ครบ 3 ระดับ');
    const o = { runs: 3, perTribe: 2, refOpp: 3 };
    const g1 = genBotTeams(chars, RULES, o);
    eq(JSON.stringify(g1), JSON.stringify(genBotTeams(chars, RULES, o)), 'สร้างซ้ำได้ผลเดิม');
    eq(JSON.stringify(genBotTeams(chars, RULES, { ...o, stages: [0, 1] }).stages.slice(0, 2)), JSON.stringify(g1.stages.slice(0, 2)), 'แบ่งขั้นให้หลายโปรเซสได้ผลเดิม');
    let n = 0; const P = simRun(chars, RULES, 5, p => pickBotTeam(BOT_TEAMS, p.wins, p.seed, p.round).team, () => n++);
    ok(P.over && n === P.round && n >= 10 && n <= 19, `run จำลองกับทีมเตรียมจบได้ (${n} แมตช์)`);
  }],
  ['บอท: ซื้อตามกฎ ทีมถูกกฎทุกรอบ ผลเหมือนเดิมทุกครั้ง (20 run)', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars);
    const play = seed => {
      const P = newRun(chars, seed), B = newRun(chars, seed + 1);
      while (!P.over) {
        startRound(P, chars); startRound(B, chars, RULES, { unlockWins: P.wins });
        botShop(P, chars); botShop(B, chars, RULES, { unlockWins: P.wins });
        for (const s of [P, B]) { ok(s.gold >= 0, 'เงินติดลบ'); const v = validateTeam(teamEntries(s), cm); ok(v.ok, v.errors.join(' · ')); }
        const r = simulate(buildTeam(teamEntries(P), cm), buildTeam(teamEntries(B), cm), { log: false });
        endMatch(P, r.winner !== 1, chars); endMatch(B, r.winner === 1, chars); B.over = false; B.lastWon = P.lastWon;
        ok(P.round < 25, 'run ไม่จบ');
      }
      return JSON.stringify(P);
    };
    for (let i = 0; i < 20; i++) eq(play(50 + i) === play(50 + i), true, `run ${i} ผลไม่ตรงกัน`);
  }],
  ['set 85: บอสใน run ทุก bossEvery รอบ ไม่เกิน bossesPerRun ตัว · เมล็ดเดิมได้บอสเดิม · บอส 2 ตัวไม่ซ้ำกัน', () => {
    const S = RUN_STAGE.settings, on = RUN_STAGE.bosses.filter(b => b.on);
    for (let seed = 1; seed <= 30; seed++) {
      const hits = [];
      for (let r = 1; r <= 30; r++) { const x = runBossAt(r, seed); if (x) hits.push([r, x.k, x.boss.id]); }
      eq(hits.map(h => h[0]).join(','), Array.from({ length: Math.min(S.bossesPerRun, Math.floor(30 / S.bossEvery)) }, (_, i) => (i + 1) * S.bossEvery).join(','), 'รอบบอส');
      hits.forEach((h, i) => eq(h[1], i + 1, 'ครั้งที่ k'));
      if (on.length >= 2 && hits.length >= 2) ok(hits[0][2] !== hits[1][2], 'บอสซ้ำกันใน run เดียว');
      eq(JSON.stringify(runBossAt(S.bossEvery, seed)), JSON.stringify(runBossAt(S.bossEvery, seed)), 'เมล็ดเดิมได้บอสเดิม');
    }
    const ids = new Set(); for (let seed = 1; seed <= 60; seed++) ids.add(runBossAt(S.bossEvery, seed).boss.id);
    ok(ids.size >= Math.min(3, on.length), 'สุ่มบอสหลายตัว');
  }],
  ['set 86: simRun ใช้ค่าด่านที่ส่งมา (ห้องบาลานซ์ "รันจริง") · ไม่มีบอส = ไม่เจอบอส · บอสทุก 3 รอบ = เจอรอบ 3', () => {
    const chars = buildCharacterList(), pick = p => pickBotTeam(BOT_TEAMS, p.wins, p.seed, p.round).team;
    const st = (every, max) => ({ ...RUN_STAGE, settings: { ...RUN_STAGE.settings, bossEvery: every, bossesPerRun: max } });
    const none = []; simRun(chars, RULES, 7, pick, m => { if (m.boss) none.push(m.round); }, st(5, 0));
    eq(none.length, 0, 'bossesPerRun 0 = ไม่มีบอส');
    const at = []; simRun(chars, RULES, 7, pick, m => { ok(m.res && Array.isArray(m.res.units), 'ส่งผลแมตช์เต็มมาด้วย'); if (m.boss) at.push(`${m.round}:${m.k}`); }, st(3, 1));
    eq(at.join(','), '3:1', 'บอสทุก 3 รอบ ไม่เกิน 1 ตัว');
  }],
];
