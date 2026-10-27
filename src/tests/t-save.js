// ชุดทดสอบ: เซฟกลางทาง สถิติ/ประวัติ run รีเพลย์ บันทึกข้อมูลการเล่น · แยกจาก mechanics.js (ชุด D) · ตัวช่วยอยู่ helpers.js
import { simulate } from '../core/battle.js';
import { botShop } from '../core/bot.js';
import { buildCharacterList } from '../core/characters.js';
import { makeRng } from '../core/rng.js';
import { RULES } from '../core/rules.js';
import { REPLAY_MAX, SAVE_MAX_CHARS, addMatchStats, checkPlayRecord, checkReplay, dataHash, historyEntry, makeReplays, makeSave, newStats, playRecord, pushHistory, readHistory, readReplays, readSave, replayEntry, validateRunState } from '../core/save.js';
import { buy, endMatch, newRun, startRound, teamEntries } from '../core/shop.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { eq, ok, randomTeam } from './helpers.js';
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
      startRound(P, chars); startRound(B, chars, RULES, { unlockWins: P.wins });
      botShop(P, chars); botShop(B, chars, RULES, { unlockWins: P.wins });
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
    eq(Object.keys(JSON.parse(JSON.stringify(rec))).length, 16, 'ช่องครบ (ไม่มีข้อมูลระบุตัวผู้เล่น)');
    const bads = [x => { x.res = 'x'; }, x => { x.round = 0; }, x => { x.team[0].id = 'ZZ-1'; }, x => { x.timeMs = 1.5; }, x => { x.data = '<b>'; },
      x => { x.foeSrc = 'live'; }, x => { x.storm = 'yes'; }, x => { x.extra = 1; }, x => { x.winsBefore = 99; }, x => { x.team = Array(7).fill(x.team[0]); }];
    bads.forEach((f, i) => { const y = JSON.parse(JSON.stringify(rec)); f(y); ok(!checkPlayRecord(y, m), `บันทึกผิดแบบที่ ${i + 1} ต้องถูกปฏิเสธ`); });
  }],
];
