// ชุดทดสอบ: เซฟกลางทาง สถิติ/ประวัติ run รีเพลย์ บันทึกข้อมูลการเล่น · แยกจาก mechanics.js (ชุด D) · ตัวช่วยอยู่ helpers.js
import { burnShares, simulate } from '../core/battle.js';
import { botShop } from '../core/bot.js';
import { buildCharacterList } from '../core/characters.js';
import { makeRng } from '../core/rng.js';
import { RULES } from '../core/rules.js';
import { REPLAY_MAX, SAVE_MAX_CHARS, addMatchStats, checkPlayRecord, checkReplay, dataHash, historyEntry, makeReplays, makeRunCode, makeSave, newStats, parseRunCode, playRecord, pushHistory, readHistory, readReplays, readSave, replayEntry, validateRunState } from '../core/save.js';
import { buy, endMatch, move, newRun, reroll, sell, startRound, teamEntries, toggleLock } from '../core/shop.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { applyMatchDiff, baseFingerprint, makeMatchCode, matchFightParts, parseMatchCode } from '../lab/matchcode.js';
import { cleanStage, stageDefaults } from '../core/stage.js';
import { equipRunes } from '../core/runes.js';
import { bossUnit } from '../core/boss.js';
import { eq, ok, randomTeam } from './helpers.js';
import { newRunLog, rlApply, rlCheck, rlPush, rlRef, rlReplay } from '../core/runlog.js';
export const TESTS_SAVE = [
  ['ชุด 22: เซฟ run ผ่านตัวตรวจทุกรอบ · เล่นต่อแล้วได้ร้านเดิม', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars), H = dataHash(chars);
    const P = newRun(chars, 123), B = newRun(chars, 456), st = newStats();
    for (let rnd = 0; rnd < 12 && !P.over; rnd++) {
      const raw = makeSave(P, B, st, 1000, H), r = readSave(raw, cm, RULES, H);
      eq(r.status, 'ok', `รอบ ${rnd} โหลดเซฟได้ ${(r.errors || []).join(',')}`);
      const a = structuredClone(P), b = r.save.P;
      startRound(a, chars); startRound(b, chars);
      eq(JSON.stringify(b.shop), JSON.stringify(a.shop), 'ร้านเดิมหลังโหลด');
      startRound(P, chars); startRound(B, chars, RULES);
      botShop(P, chars); botShop(B, chars, RULES);
      const res = simulate(buildTeam(teamEntries(P), cm), buildTeam(teamEntries(B), cm));
      endMatch(P, res.winner !== 1, chars, RULES, (res.perm || []).filter(g => g.side === 0));
      endMatch(B, res.winner === 1, chars, RULES, (res.perm || []).filter(g => g.side === 1)); B.over = false; B.hearts = RULES.shop.hearts;
      addMatchStats(st, res);
      eq(st.matches, rnd + 1, 'นับแมตช์');
    }
    ok(validateRunState(P, cm).ok, 'สถานะสุดท้ายผ่านตัวตรวจ');
  }],
  ['ชุด 22: เซฟผิด/ถูกแก้ ถูกปฏิเสธ · ค่าเกมเปลี่ยน = ล้าง', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars), H = dataHash(chars);
    const P = newRun(chars, 7), B = newRun(chars, 8); startRound(P, chars); buy(P, 0, null, chars);
    const good = JSON.parse(makeSave(P, B, newStats(), 1, H));
    eq(readSave(JSON.stringify(good), cm, RULES, H).status, 'ok', 'เซฟปกติ');
    const bad = f => { const o = structuredClone(good); f(o); return readSave(JSON.stringify(o), cm, RULES, H).status; };
    eq(bad(o => { o.P.gold = -1; }), 'bad', 'เงินติดลบ');
    eq(bad(o => { o.P.gold = 1.5; }), 'bad', 'เงินไม่เป็นจำนวนเต็ม');
    eq(bad(o => { o.P.hearts = 99; }), 'bad', 'หัวใจเกิน');
    eq(bad(o => { o.P.bench[0].id = 'ZZ-9'; }), 'bad', 'ตัวละครไม่มีจริง');
    eq(bad(o => { o.P.bench[0].level = 4; }), 'bad', 'เลเวลเกิน');
    eq(bad(o => { o.P.bench[0].perm = { multi: 1e9 }; }), 'bad', 'ค่าถาวรสูงผิดปกติ (ชุด 27 ไม่มีเพดาน แต่ยังมีค่าสูงสุดกันข้อมูลผิด)');
    eq(bad(o => { o.P.bench[0].perm = { hack: 1 }; }), 'bad', 'ค่าถาวรไม่รู้จัก');
    eq(bad(o => { o.P.bench[0].hp = 9999; }), 'bad', 'ช่องแปลกปลอมในตัวละคร');
    eq(bad(o => { o.P.extra = 1; }), 'bad', 'ช่องแปลกปลอมในสถานะ');
    eq(bad(o => { o.P.charges = [{ id: 'SF-7', uid: 999, si: 0 }, { id: 'SF-7', uid: 998, si: 0 }]; }), 'bad', 'ประจุเกิน 1');
    eq(bad(o => { o.P.charges = [{ id: 'SF-7', uid: 999, si: 0 }]; }), 'bad', 'ประจุที่เจ้าของไม่อยู่');
    eq(bad(o => { o.P.wins = 10; o.P.over = true; }), 'bad', 'run จบแล้วไม่โหลด');
    eq(bad(o => { o.stats.w = 5; }), 'bad', 'สถิติไม่ตรงกัน');
    eq(bad(o => { o.data = '00000000'; }), 'data', 'ค่าเกมเปลี่ยน');
    eq(bad(o => { o.sv = 99; }), 'data', 'เวอร์ชันเซฟเปลี่ยน');
    eq(readSave('{"sv":1,"__proto__":{"x":1}}', cm, RULES, H).status, 'bad', '__proto__');
    eq(readSave('{oops', cm, RULES, H).status, 'bad', 'อ่านไม่ได้');
    eq(readSave('x'.repeat(300000), cm, RULES, H).status, 'bad', 'ยาวเกิน');
    eq(readSave(null, cm, RULES, H).status, 'none', 'ไม่มีเซฟ');
    const c2 = structuredClone(chars); c2[0].hp = [1, 2, 3];
    ok(dataHash(c2) !== H, 'แก้ค่าตัวละครแล้วแฮชเปลี่ยน');
  }],
  ['A7: ดาเมจไฟนับให้ผู้ทำให้ติดตามสัดส่วน (u.dealt = แยกจากเหตุการณ์ · สถิติ run ด้วย)', () => {
    const bs = burnShares();
    bs.see('burn', { to: 5, amount: 30, total: 30, from: 0 }); bs.see('burn', { to: 5, amount: 10, total: 30, from: 1 }); // ไฟเหลือ 20 ก่อน 1 ใส่ 10
    eq(bs.split(5), [[0, 2 / 3], [1, 1 / 3]], 'แบ่งตามไฟที่เหลือ');
    bs.see('cleanse', { to: 5, what: 'pct' }); eq(bs.split(5).length, 2, 'ล้างบางส่วน = สัดส่วนเดิม');
    bs.see('down', { who: 5 }); eq(bs.split(5), [[-1, 1]], 'down = ไม่มีเจ้าของ');
    const chars = buildCharacterList(), cm = makeCharMap(chars), rng = makeRng(31);
    let burns = 0;
    for (let i = 0; i < 60; i++) {
      const res = simulate(buildTeam(randomTeam(rng, chars, 6, 2), cm), buildTeam(randomTeam(rng, chars, 6, 2), cm));
      const b = burnShares(), d = new Map(), st = newStats(), want = {};
      for (const e of res.events) {
        if (e.k === 'burn' || e.k === 'cleanse' || e.k === 'down') b.see(e.k, e);
        else if (e.k === 'dmg') for (const [s, f] of e.why === 'burn' ? (burns++, b.split(e.to)) : [[e.from ?? -1, 1]]) if (s >= 0) d.set(s, (d.get(s) || 0) + e.amount * f);
      }
      for (const x of res.units) ok(Math.abs((d.get(x.uid) || 0) - x.dealt) < 1e-6, `แมตช์ ${i} uid ${x.uid}: dealt ${x.dealt} ≠ ${d.get(x.uid) || 0}`);
      for (const x of res.units) if (x.side === 0 && x.dealt > 0) want[x.id] = (want[x.id] || 0) + x.dealt;
      addMatchStats(st, res);
      for (const [id, v] of Object.entries(want)) ok(Math.abs((st.dmg[id] || 0) - v) <= 1 + 1e-9 * v, `แมตช์ ${i} สถิติ run ${id}: ${st.dmg[id]} vs ${v}`);
    }
    ok(burns > 0, 'มีไฟในชุดทดสอบ');
  }],
  ['ชุด 22: สถิติ run และประวัติ run กรองข้อมูลผิด', () => {
    const st = newStats();
    addMatchStats(st, { winner: 0, timeMs: 5000, events: [{ k: 'start', units: [{ uid: 0, side: 0, id: 'HL-1' }, { uid: 1, side: 1, id: 'PL-1' }] },
      { k: 'dmg', from: 0, to: 1, amount: 30 }, { k: 'dmg', from: 1, to: 0, amount: 99 }, { k: 'summon', unit: { uid: 2, side: 0, id: 'PL-7' } }, { k: 'dmg', from: 2, to: 1, amount: 7.6 }] });
    addMatchStats(st, { winner: 1, timeMs: 3000, events: [] });
    addMatchStats(st, { winner: null, timeMs: 1000, events: [] });
    eq([st.matches, st.w, st.l, st.d, st.best, st.timeMs], [3, 1, 1, 1, 1, 9000], 'นับผล');
    eq(st.dmg, { 'HL-1': 30, 'PL-7': 7 }, 'ดาเมจฝั่งผู้เล่นเท่านั้น (รวมตัวที่ถูกเรียก)');
    const P = newRun(buildCharacterList(), 1); P.wins = 3; P.hearts = 0; P.round = 13; P.over = true;
    const e = historyEntry(P, st, 5);
    eq([e.won, e.top, e.topDmg], [false, 'HL-1', 30], 'บันทึกประวัติ');
    const list = readHistory(JSON.stringify([e, { ...e, wins: 99 }, { ...e, team: [{ id: '<img>', level: 1 }] }, 'x', { ...e, evil: 1 }]));
    eq(list.length, 1, 'เก็บเฉพาะรายการที่ถูก');
    let h = []; for (let i = 0; i < 25; i++) h = pushHistory(h, { ...e, at: i });
    eq([h.length, h[0].at], [20, 24], 'เก็บล่าสุด 20 รายการ');
    eq(readHistory('{bad'), [], 'อ่านไม่ได้ = ว่าง');
  }],
  ['set 105: run code carries current + previous run replays + history · round trip · bad codes rejected', () => {
    const chars = buildCharacterList(), m = makeCharMap(chars), H = dataHash(chars), rng = makeRng(105), list = [];
    for (let i = 0; i < 5; i++) {
      const A = randomTeam(rng, chars, 6, 'mix'), B = randomTeam(rng, chars, 6, 'mix');
      list.push(replayEntry(i + 1, A, B, simulate(buildTeam(A, m), buildTeam(B, m))));
    }
    const cur = makeReplays(11, H, list), prev = makeReplays(22, H, list.slice(0, 2));
    const hist = JSON.stringify([{ at: 5, won: true, wins: 10, hearts: 3, rounds: 17, team: [{ id: 'HL-1', level: 2 }], top: 'HL-1', topDmg: 900, matches: 17 }]);
    const code = makeRunCode([cur, prev], hist, H, 1000);
    const rc = parseRunCode(code, m, RULES);
    eq([rc.runs.length, rc.runs[0].run, rc.runs[0].list.length, rc.runs[1].run, rc.runs[1].list.length, rc.hist.length, rc.page], [2, 11, 5, 22, 2, 1, H], 'round trip');
    eq(rc.runs[0].list, list, 'matches kept as stored');
    eq(makeRunCode([null, makeReplays(1, H, [])], null, H, 1), null, 'nothing to copy = null');
    eq(parseRunCode(makeRunCode(['{bad', cur], '', H, 1), m, RULES).runs.length, 1, 'unreadable stored text skipped');
    const body = JSON.parse(code.slice(6)), bad = f => { const y = JSON.parse(JSON.stringify(body)); f(y); return 'ARUN1 ' + JSON.stringify(y); };
    const bads = ['', 'AMATCH1 {}', 'ARUN1 {bad', bad(y => { y.v = 3; }), bad(y => { y.logs = [{ v: 1 }]; }), bad(y => { y.evil = 1; }), bad(y => { y.runs[0].list[0].a[0].id = 'ZZ-9'; }),
      bad(y => { y.runs.push(y.runs[0], y.runs[0]); }), bad(y => { y.h[0].wins = -1; }), bad(y => { y.runs[0].list[0].a[0].perm = { hp: '<img src=x>' }; }), 'ARUN1 ' + 'x'.repeat(900001)];
    bads.forEach((t, i) => { let threw = false; try { parseRunCode(t, m, RULES); } catch (e) { threw = true; } ok(threw, `bad run code ${i + 1}`); });
  }],
  ['ชุด 25: รีเพลย์ เก็บทีม 2 ฝั่ง จำลองซ้ำได้ผลเดิม · ผูกกับ run + ค่าเกม · ข้อมูลผิดถูกปฏิเสธ', () => {
    const chars = buildCharacterList(), m = makeCharMap(chars), H = dataHash(chars), rng = makeRng(2525), list = [];
    for (let i = 0; i < 12; i++) {
      const A = randomTeam(rng, chars, 6, 'mix'), B = randomTeam(rng, chars, 6, 'mix');
      if (i === 0) A[0].perm = { hp: 7, atk: 2 }; // ค่าถาวรต้องติดไปด้วย
      const r = simulate(buildTeam(A, m), buildTeam(B, m));
      list.push(replayEntry(i + 1, A, B, r));
      A[0].level = 1; // แก้ทีมหลังเก็บ ต้องไม่กระทบรีเพลย์ (เก็บสำเนา)
    }
    const text = makeReplays(77, H, list), rd = readReplays(text, m, RULES, H, 77);
    eq(rd.status, 'ok', 'อ่านรีเพลย์');
    ok(text.length < SAVE_MAX_CHARS / 10, `ขนาดรีเพลย์ 12 แมตช์ ${text.length} ตัวอักษร`);
    for (const x of rd.list) { const r = simulate(buildTeam(x.a, m), buildTeam(x.b, m)); eq([r.winner, Math.floor(r.timeMs)], [x.w, x.t], `จำลองซ้ำรอบ ${x.r}`); }
    eq(rd.list[0].a[0].perm, { hp: 7, atk: 2 }, 'ค่าถาวรในรีเพลย์');
    eq(readReplays(text, m, RULES, H, 78).status, 'other', 'run อื่น');
    eq(readReplays(text, m, RULES, 'deadbeef', 77).status, 'data', 'ค่าเกมเปลี่ยน');
    eq(readReplays('', m, RULES, H, 77).status, 'none', 'ไม่มีรีเพลย์');
    eq(readReplays('{bad', m, RULES, H, 77).status, 'bad', 'อ่านไม่ได้');
    eq(readReplays('x'.repeat(SAVE_MAX_CHARS + 1), m, RULES, H, 77).status, 'bad', 'ยาวเกิน');
    const o = JSON.parse(text);
    const bads = [
      x => { x.list[0].a[0].id = 'ZZ-9'; }, x => { x.list[0].a[0].level = 4; }, x => { x.list[0].w = 2; }, x => { x.list[0].t = -1; },
      x => { x.list[0].b.push({ id: 'HL-1', level: 1, row: 0, lane: 0 }); }, x => { x.list[0].a[0].perm = { atk: -5 }; }, x => { x.list[0].evil = 1; },
      x => { x.list[0].r = 1.5; }, x => { x.extra = 1; }, x => { x.list = Array(REPLAY_MAX + 1).fill(x.list[0]); },
      x => { x.list[0].a[0].perm = { hp: '<img src=x>' }; },
    ];
    bads.forEach((f, i) => { const y = JSON.parse(JSON.stringify(o)); f(y); eq(readReplays(JSON.stringify(y), m, RULES, H, 77).status, 'bad', `รีเพลย์ผิดแบบที่ ${i + 1}`); });
    ok(!checkReplay(null, m) && !checkReplay([], m), 'รีเพลย์ไม่ใช่วัตถุ');
    { const x = JSON.parse(JSON.stringify(o.list[0])); x.b = { boss: 'B2', k: 1 }; ok(checkReplay(x, m), 'รีเพลย์รอบบอส (set 85)');
      for (const b of [{ boss: 'B2' }, { boss: 'B2', k: 0 }, { boss: '<x>', k: 1 }, { boss: 'B2', k: 1, z: 1 }]) { x.b = b; ok(!checkReplay(x, m), 'รีเพลย์บอสผิดรูปแบบ'); } }
  }],
  ['ชุด 25: บันทึกข้อมูลการเล่น สรุปรายแมตช์ ผ่านตัวตรวจ · ข้อมูลผิดถูกปฏิเสธ', () => {
    const chars = buildCharacterList(), m = makeCharMap(chars), H = dataHash(chars), rng = makeRng(2526);
    const A = randomTeam(rng, chars, 6, 'mix'), B = randomTeam(rng, chars, 5, 'mix');
    A[1].perm = { hp: 3, burn: 1 };
    const r = simulate(buildTeam(A, m), buildTeam(B, m));
    const base = { at: 1790000000000, hash: H, runSeed: 123456, round: 4, winsBefore: 2, heartsBefore: 9, result: r, teamA: A, teamB: B };
    const rec = playRecord({ ...base, foe: { stage: 2, span: 1 } }), live = playRecord({ ...base, foe: null });
    ok(checkPlayRecord(rec, m) && checkPlayRecord(live, m), 'บันทึกที่สร้างจากเกมต้องผ่านตัวตรวจ');
    eq(rec.team[1].perm, 2, 'นับชนิดค่าถาวร'); eq(rec.storm, r.timeMs > RULES.stormStartMs, 'ถึงพายุทราย');
    eq(rec.res, r.winner === 0 ? 'w' : r.winner === 1 ? 'l' : 'd', 'ผล');
    eq(Object.keys(JSON.parse(JSON.stringify(rec))).length, 19, 'ช่องครบ (ไม่มีข้อมูลระบุตัวผู้เล่น)');
    // set 85: boss round record = foeSrc 'boss', no foe team, boss { boss, k }
    const br = playRecord({ ...base, teamB: [], foe: null, boss: { boss: 'B1', k: 2 } });
    ok(checkPlayRecord(br, m) && br.foeSrc === 'boss' && br.foe.length === 0 && br.boss.k === 2, 'บันทึกรอบบอสผ่านตัวตรวจ');
    for (const f of [x => { x.boss = null; }, x => { x.boss.k = 0; }, x => { x.boss.boss = '<b>'; }, x => { x.foeStage = 1; }, x => { x.boss.evil = 1; }]) { const y = JSON.parse(JSON.stringify(br)); f(y); ok(!checkPlayRecord(y, m), 'บันทึกรอบบอสผิดต้องถูกปฏิเสธ'); }
    { const y = JSON.parse(JSON.stringify(rec)); y.boss = { boss: 'B1', k: 1 }; ok(!checkPlayRecord(y, m), 'แมตช์ปกติห้ามมีบอส'); }
    const bads = [x => { x.res = 'x'; }, x => { x.round = 0; }, x => { x.team[0].id = 'ZZ-1'; }, x => { x.timeMs = 1.5; }, x => { x.data = '<b>'; },
      x => { x.foeSrc = 'live'; }, x => { x.storm = 'yes'; }, x => { x.extra = 1; }, x => { x.winsBefore = 99; }, x => { x.team = Array(7).fill(x.team[0]); }];
    bads.forEach((f, i) => { const y = JSON.parse(JSON.stringify(rec)); f(y); ok(!checkPlayRecord(y, m), `บันทึกผิดแบบที่ ${i + 1} ต้องถูกปฏิเสธ`); });
  }],
  ['ชุด 39: รหัสแมตช์ (ห้องบาลานซ์) เล่นซ้ำได้ผลเดิม · ค่าที่แก้ติดไปด้วย · รหัสเสีย/ช่องแปลกถูกปฏิเสธ', () => {
    const base = buildCharacterList(), bt = JSON.parse(JSON.stringify(RULES.tribeBonus)), fp = baseFingerprint(base, bt);
    const edited = JSON.parse(JSON.stringify(base)), c0 = edited.find(c => c.id === 'WY-4'); c0.atk = c0.atk.map(x => x * 3);
    const diff = { chars: { 'WY-4': { atk: c0.atk } }, tribes: {} };
    const A = [{ id: 'WY-4', level: 2, row: 2, lane: 0 }, { id: 'HL-1', level: 1, row: 0, lane: 1 }], B = [{ id: 'PL-1', level: 2, row: 1, lane: 1 }, { id: 'SF-6', level: 1, row: 0, lane: 0 }];
    for (const seed of [0, 77]) {
      const m = makeCharMap(edited), run = () => simulate(buildTeam(A, m), buildTeam(B, m), { rules: RULES, ...(seed ? { seed } : {}), tribesOff: [false, true] });
      const r = run(), code = makeMatchCode({ base: fp, seed, A, B, tribesOff: [false, true], diff, result: r });
      const mc = parseMatchCode(code); eq(mc.base, fp, 'ฐานเดิม'); eq([mc.seed, mc.A, mc.B, mc.tribesOff], [seed, A, B, [false, true]], 'อ่านรหัสกลับได้ครบ');
      const { chars } = applyMatchDiff(base, bt, mc.diff), m2 = makeCharMap(chars);
      const r2 = simulate(buildTeam(mc.A, m2), buildTeam(mc.B, m2), { rules: RULES, ...(mc.seed ? { seed: mc.seed } : {}), tribesOff: mc.tribesOff });
      eq([r2.winner, r2.timeMs, r2.events.length], [r.winner, r.timeMs, r.events.length], 'เล่นซ้ำได้ผลเดิม seed ' + seed);
    }
    const good = makeMatchCode({ base: fp, seed: 1, A, B, tribesOff: [true, true], diff, result: { winner: 0, timeMs: 1000 } });
    for (const bad of ['', 'hello', good.slice(0, -5), good.replace('"WY-4",2', '"WY-4",9'), good.replace('AMATCH1', 'AMATCH2')]) {
      let threw = false; try { parseMatchCode(bad); } catch (e) { threw = true; } ok(threw, 'รหัสเสียต้องถูกปฏิเสธ: ' + bad.slice(0, 30));
    }
    for (const d of [{ chars: { 'XX-1': { atk: [1, 1, 1] } }, tribes: {} }, { chars: { 'WY-4': { atk: 5 } }, tribes: {} }, { chars: { 'WY-4': { evil: 1 } }, tribes: {} }, { chars: { 'WY-4': JSON.parse('{"__proto__":{"x":1}}') }, tribes: {} }, { chars: {}, tribes: { nope: {} } }]) {
      let threw = false; try { applyMatchDiff(base, bt, d); } catch (e) { threw = true; } ok(threw, 'ค่าที่แก้แปลกต้องถูกปฏิเสธ ' + JSON.stringify(d).slice(0, 40));
    }
  }],
  ['set 72: match code covers boss fights + runes · replay gives the same hits · bad boss/rune parts rejected', () => {
    const base = buildCharacterList(), bt = JSON.parse(JSON.stringify(RULES.tribeBonus)), fp = baseFingerprint(base, bt), m = makeCharMap(base);
    const st = stageDefaults(), rec = JSON.parse(JSON.stringify(st.bosses[0]));
    rec.bars = 6; rec.healHit = 50; rec.phases = [{ at: 0, fx: [], rules: [{ id: 'backStrike', v: 0 }], spot: '', stats: {} }, { at: 3, fx: [{ id: 'stunAll', v: 2 }], rules: [{ id: 'cdSlow', v: 40 }], spot: '', stats: { cdMs: 1500 } }];
    const recClean = cleanStage({ bosses: [rec] }).bosses[0]; // the page holds cleaned records (stageCfg)
    const all = [...Object.entries(st.runes).map(([id, r]) => ({ ...r, id })), ...st.custom.map(r => ({ ...r }))].filter(r => r.on && !r.del);
    const one = all.find(r => r.scope === 'one' && r.eff !== 'link' && r.eff !== 'buddy'), wide = all.find(r => r.scope !== 'one' && r.id !== (one && one.id));
    ok(one && wide, 'default stage has runes to equip');
    const A = [{ id: 'WY-6', level: 3, row: 2, lane: 1 }, { id: 'WY-4', level: 3, row: 2, lane: 0 }, { id: 'PT-7', level: 2, row: 1, lane: 0 }];
    const runes = [{ r: one, n: 1, slot: [2, 1], partner: null }, { r: wide, n: 1, slot: null, partner: null }];
    for (const k of [1, 2]) {
      const b = JSON.parse(JSON.stringify(recClean)), eqA = equipRunes(buildTeam(A, m), runes);
      const r = simulate(eqA.units, [bossUnit(b, k)], { rules: RULES, seed: 9, tribesOff: [false, false], tribeExtra: eqA.tribeExtra });
      const code = makeMatchCode({ base: fp, seed: 9, A, B: [], tribesOff: [false, false], diff: { chars: {}, tribes: {} }, result: r, boss: { rec: b, k }, runes });
      const mc = parseMatchCode(code); eq([mc.bossK, mc.B, mc.runes.length], [k, [], 2], 'boss + runes read back');
      const parts = matchFightParts(mc); eq(parts.boss, b, 'boss record survives the round trip');
      eq(parts.equips.map(e => e.r), runes.map(e => e.r), 'rune records survive the round trip');
      const eq2 = equipRunes(buildTeam(mc.A, m), parts.equips);
      const r2 = simulate(eq2.units, [bossUnit(parts.boss, parts.k)], { rules: RULES, seed: mc.seed, tribesOff: mc.tribesOff, tribeExtra: eq2.tribeExtra });
      eq([r2.winner, r2.timeMs, r2.events.length], [r.winner, r.timeMs, r.events.length], 'boss replay same result k ' + k);
    }
    // team vs team with runes only (no boss)
    const B = [{ id: 'PL-1', level: 2, row: 1, lane: 1 }], eqT = equipRunes(buildTeam(A, m), runes);
    const rt = simulate(eqT.units, buildTeam(B, m), { rules: RULES, seed: 4, tribeExtra: eqT.tribeExtra, tribesOff: [false, false] });
    const mt = parseMatchCode(makeMatchCode({ base: fp, seed: 4, A, B, tribesOff: [false, false], diff: { chars: {}, tribes: {} }, result: rt, runes }));
    const pt = matchFightParts(mt); eq([mt.bossK, pt.boss, mt.B], [0, null, B], 'runes-only code keeps the right team');
    const good = makeMatchCode({ base: fp, seed: 1, A, B: [], tribesOff: [true, true], diff: { chars: {}, tribes: {} }, result: { winner: 0, timeMs: 1000 }, boss: { rec, k: 2 }, runes });
    const o = JSON.parse(good.slice(8));
    const bads = [x => { x.k = -1; }, x => { x.k = 1.5; }, x => { x.B = [['PL-1', 1, 0, 0]]; }, x => { delete x.st; }, x => { x.st.bosses = []; }, x => { x.ru = [['S1', 0, null, null]]; }, x => { x.ru = [['S1', 1, [5, 0], null]]; }, x => { x.ru = [['<x>', 1, null, null]]; }, x => { x.ru = 'S1'; }];
    bads.forEach((f, i) => { const y = JSON.parse(JSON.stringify(o)); f(y); let threw = false; try { parseMatchCode('AMATCH1 ' + JSON.stringify(y)); } catch (e) { threw = true; } ok(threw, 'bad boss/rune code ' + (i + 1) + ' rejected'); });
    const y = JSON.parse(JSON.stringify(o)); y.ru = [['C99', 1, null, null]];
    let threw = false; try { matchFightParts(parseMatchCode('AMATCH1 ' + JSON.stringify(y))); } catch (e) { threw = true; } ok(threw, 'unknown rune rejected');
    const z = JSON.parse(JSON.stringify(o)); z.st.bosses = [{ id: 'evil' }];
    threw = false; try { matchFightParts(parseMatchCode('AMATCH1 ' + JSON.stringify(z))); } catch (e) { threw = true; } ok(threw, 'bad boss id rejected');
  }],
  ['31 Oct fuzz: random shop actions + fights · failed action never changes state · gold ≥ 0 · state/save valid every step', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars), H = dataHash(chars), R = makeRng(31102026), ri = n => R.int(n);
    const ref = st => [{ at: 'bench', i: ri(st.bench.length) }, { at: 'board', row: ri(3), lane: ri(2) }, { at: 'shop', i: ri(st.shop.length) }][ri(3)];
    for (let run = 0; run < 60; run++) {
      const P = newRun(chars, ri(2 ** 32)), B = newRun(chars, ri(2 ** 32)), stats = newStats();
      for (let g = 0; g < 40 && !P.over; g++) {
        startRound(P, chars); startRound(B, chars, RULES);
        for (let a = 0; a < 25; a++) {
          const before = JSON.stringify(P), op = ri(5);
          const r = op === 0 ? buy(P, ri(P.shop.length + 1), ri(2) ? ref(P) : null, chars) : op === 1 ? sell(P, ref(P), chars)
            : op === 2 ? move(P, ref(P), ref(P), chars) : op === 3 ? (ri(4) ? { ok: true } : reroll(P, chars)) : toggleLock(P, ri(P.shop.length + 1));
          if (!r.ok) eq(JSON.stringify(P), before, `run ${run} op ${op}: failed action changed state (${r.msg})`);
          ok(Number.isInteger(P.gold) && P.gold >= 0, `run ${run}: gold ${P.gold}`);
          const v = validateRunState(P, cm); ok(v.ok, `run ${run} op ${op}: ${v.errors.join(' · ')}`);
        }
        eq(readSave(makeSave(P, B, stats, 1, H), cm, RULES, H).status, 'ok', `run ${run}: save round-trip`);
        botShop(B, chars, RULES);
        const res = simulate(buildTeam(teamEntries(P), cm), buildTeam(teamEntries(B), cm), { log: !(run % 6) });
        if (!(run % 6)) addMatchStats(stats, res);
        const gain = s => (res.perm || []).filter(x => x.side === s);
        endMatch(P, res.winner !== 1, chars, RULES, gain(0));
        endMatch(B, res.winner === 1, chars, RULES, gain(1)); B.over = false; B.hearts = RULES.shop.hearts; B.lastWon = P.lastWon;
      }
      ok(P.over, `run ${run}: run should end`);
      const g0 = P.gold; eq([buy(P, 0, null, chars).ok, reroll(P, chars).ok, P.gold], [false, false, g0], 'ended run: buy/reroll refused');
    }
  }],
  ['set 109: run journal rebuilds the whole run from its seed (gold every step + final state) · run code v2 carries it · bad journals refused', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars), H = dataHash(chars), rng = makeRng(77);
    for (const seed of [11, 2024, 909090]) {
      const P = newRun(chars, seed), L = newRunLog(seed, H, 1000);
      const J = e => { const g0 = P.gold, snap = JSON.stringify(P), r = rlApply(P, e, chars); if (e[0] === 'of' || (r && r.ok) || JSON.stringify(P) !== snap) rlPush(L, e[0], e.slice(4), g0, P.gold, 2000); return r; };
      const pick = n => Math.floor(rng.next() * n), refs = () => [...P.bench.map((u, i) => (u ? { at: 'bench', i } : null)), ...P.board.flatMap((r, row) => r.map((u, lane) => (u ? { at: 'board', row, lane } : null)))].filter(Boolean);
      for (let n = 0; n < 40 && !P.over; n++) {
        J(['st', 0, 0, 0]);
        for (let k = 0; k < 14; k++) {
          const x = pick(10), own = refs();
          if (x < 4) J(['by', 0, 0, 0, pick(P.shop.length), pick(2) ? rlRef({ at: 'board', row: pick(3), lane: pick(2) }) : '-']);
          else if (x < 5) J(['rr', 0, 0, 0]);
          else if (x < 6 && own.length) J(['sl', 0, 0, 0, rlRef(own[pick(own.length)])]);
          else if (x < 8 && own.length) J(['mv', 0, 0, 0, rlRef(own[pick(own.length)]), rlRef({ at: 'board', row: pick(3), lane: pick(2) })]);
          else if (x < 9) J(['lk', 0, 0, 0, pick(P.shop.length)]);
          else J(['bm', 0, 0, 0, pick(P.shop.length), own.length ? rlRef(own[pick(own.length)]) : 'B0']);
        }
        const won = pick(2), team = teamEntries(P), gains = team.length && won ? [[team[0].id, 'hp', team[0].row, team[0].lane, 3]] : [];
        J(['en', 0, 0, 0, won, 0, gains]);
        if (won && !P.over) { J(['of', 0, 0, 0, 'win']); J(pick(3) ? ['tk', 0, 0, 0, 0] : ['or', 0, 0, 0]); if (P.rn.offer) J(['sk', 0, 0, 0]); }
      }
      ok(L.ev.length > 100, `seed ${seed}: journal has entries (${L.ev.length})`);
      eq(rlCheck(L), true, `seed ${seed}: journal passes the checker`);
      const back = JSON.parse(JSON.stringify(L)), R = rlReplay(back, chars, RULES);
      eq(R.firstBad, -1, `seed ${seed}: every step's gold rebuilt`);
      eq(JSON.stringify(R.st), JSON.stringify(P), `seed ${seed}: rebuilt state = played state`);
      const code = makeRunCode([], null, H, 5000, RULES, [JSON.stringify(L)]), rc = parseRunCode(code, cm, RULES);
      eq(rc.logs.length, 1, 'run code carries the journal'); eq(rc.logs[0].ev.length, L.ev.length, 'whole journal in the code');
    }
    const L = newRunLog(5, H, 0); rlPush(L, 'by', [0, 'B0'], 3, 0, 0);
    for (const bad of [['by', 0, 3, 0, 0, 'X9'], ['zz', 0, 0, 0], ['sl', 0, 0, 0, '-'], ['en', 0, 0, 0, 1, 0, [['A', 'nope', 0, 0, 1]]], ['by', -1, 0, 0, 0, 'B0']]) {
      const x = structuredClone(L); x.ev.push(bad); ok(rlCheck(x) !== true, 'refused: ' + JSON.stringify(bad));
    }
    ok(rlCheck({ ...L, extra: 1 }) !== true, 'unknown header key refused');
    let thrown = ''; try { parseRunCode('ARUN1 ' + JSON.stringify({ v: 2, at: 1, page: H, runs: [], h: [], logs: [{ v: 1 }] }), cm, RULES); } catch (e) { thrown = e.message; }
    ok(thrown.includes('journal'), 'bad journal in a run code refused: ' + thrown);
  }],
];
