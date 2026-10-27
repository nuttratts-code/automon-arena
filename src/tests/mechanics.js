import { simulate } from '../core/battle.js';
import { botShop } from '../core/bot.js';
import { BOT_TEAMS } from '../core/botdata.js';
import { BOT_SPANS, BOT_TIERS, genBotTeams, pickBotTeam, simRun, spanOf, spanPool, validateBotTeams } from '../core/botteams.js';
import { buildCharacterList } from '../core/characters.js';
import { basePower } from '../core/power.js';
import { makeRng } from '../core/rng.js';
import { CTX_WHEN, DO_INFO, RULES, SKILL_KINDS, SKILL_SPEC, WHEN_KIND, cleanTags, midStats, pickHintRow, rowsOfHint, sameTribeOk, skillTargets, upgradeSkill } from '../core/rules.js';
import { REPLAY_MAX, SAVE_MAX_CHARS, addMatchStats, checkPlayRecord, checkReplay, dataHash, historyEntry, makeReplays, makeSave, newStats, playRecord, pushHistory, readHistory, readReplays, readSave, replayEntry, validateRunState } from '../core/save.js';
import { addPerm, allUnits, buy, endMatch, move, newRun, reroll, sell, startRound, teamEntries, toggleLock } from '../core/shop.js';
import { buildTeam, countTribes, makeCharMap } from '../core/team.js';
import { validateConfig, validateTeam } from '../core/validate.js';
// ชุดทดสอบกลไก: ตรวจว่าตัวคำนวณทำตาม combat-rules ทุกข้อ · รันได้ทั้งใน node และในหน้าเว็บ


export const NEVER = 900000;
// ตัวช่วยทดสอบ: armor = เกราะเริ่ม (แปลงเป็นสกิล "เริ่มแมตช์ → ได้เกราะ" ตามกฎ V1.8) · multi ตัวเลขเดียว = ทุกเลเวล
export function mk(id, o = {}) {
  const { armor, multi = 1, cdMs = 1000, ...rest } = o;
  const c = { id, name: id, tribe: 'เหล็กกล้า', extraTribes: [], rarity: 'ธรรมดา', price: 3, rowHint: 'หน้า',
    hp: [100, 200, 400], atk: [10, 20, 40], cdMs: Array.isArray(cdMs) ? cdMs : [cdMs, cdMs, cdMs], multi: Array.isArray(multi) ? multi : [multi, multi, multi],
    burn: [0, 0, 0], shock: [0, 0, 0], skills: [], ...rest };
  if (armor && armor.some(x => x > 0)) c.skills = [{ when: 'matchStart', do: 'armor', to: 'self', v: armor }, ...c.skills];
  return c;
}
export const L3 = v => [v, v, v];
export const skErr = c => validateConfig([c]).errors.filter(e => !e.startsWith('เผ่า'));
export const dummy = (id, o = {}) => mk(id, { atk: L3(0), cdMs: NEVER, hp: L3(10000), ...o });
export const u = (id, row = 0, lane = 0, level = 1, perm) => (perm ? { id, level, row, lane, perm } : { id, level, row, lane });
// ทดสอบกลไกเดี่ยวโดยปิดโบนัสเผ่า (ตัวทดสอบเป็นเผ่าเดียวกันหมด) · ทดสอบเผ่าเปิดเอง
export const NT = { ...RULES, tribesOn: false };
export const fight = (chars, A, B, opts = {}) => { const m = makeCharMap(chars); return simulate(buildTeam(A, m), buildTeam(B, m), { rules: NT, ...opts }); };
export const fightT = (chars, A, B, opts = {}) => { const m = makeCharMap(chars); return simulate(buildTeam(A, m), buildTeam(B, m), opts); };
export const TBN = RULES.tribeBonus;
// ชุด 38: เทสต์โบนัสเผ่ารุ่นเดิมตรึงค่าเอง ไม่ผูกกับค่าที่ผู้ใช้ปรับในห้องบาลานซ์ (เสริมจาก NT: เปิดโบนัสเผ่า)
export const TBR = o => ({ ...RULES, tribeBonus: { ...structuredClone(RULES.tribeBonus), ...o } });
export const ev = (r, k, f = () => true) => r.events.filter(e => e.k === k && f(e));
export const uidOf = (r, side, id) => r.events[0].units.find(x => x.side === side && x.id === id).uid;

export function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ได้ ${JSON.stringify(a)} ควรเป็น ${JSON.stringify(b)}`); }
export function ok(c, msg) { if (!c) throw new Error(msg); }

export function randomTeam(rng, chars, size = 6, level = 1) {
  const slots = [];
  for (let r = 0; r < 3; r++) for (let l = 0; l < 2; l++) slots.push([r, l]);
  const out = [];
  for (let i = 0; i < size; i++) {
    const s = slots.splice(rng.int(slots.length), 1)[0];
    out.push(u(rng.pick(chars).id, s[0], s[1], typeof level === 'number' ? level : 1 + rng.int(3)));
  }
  return out;
}

export const TESTS = [
  ['เกราะโดนหักก่อน HP ตามสูตร', () => {
    const r = fight([mk('A'), dummy('B', { armor: L3(15) })], [u('A')], [u('B')]);
    const d = ev(r, 'dmg', e => e.why === 'hit').slice(0, 2).map(e => [e.amount, e.absorbed]);
    eq(d, [[10, 10], [10, 5]], 'ฮิต 1–2 (ดาเมจ, เกราะกัน)');
  }],
  ['ไม่มีการลดดาเมจ', () => {
    const r = fight([mk('A', { atk: L3(37) }), dummy('B')], [u('A')], [u('B')]);
    eq(ev(r, 'dmg', e => e.why === 'hit')[0].amount, 37, 'ดาเมจ');
  }],
  ['ช็อตเข้า HP ตรง ไม่โดนเกราะ', () => {
    const r = fight([mk('A', { shock: L3(5) }), dummy('B', { armor: L3(1000) })], [u('A')], [u('B')]);
    const s = ev(r, 'dmg', e => e.why === 'shock' && e.t === 2000);
    eq(s.map(e => [e.amount, e.absorbed]), [[5, 0]], 'ช็อตฮิตที่ 2');
  }],
  ['ช็อตเกิดเต็มค่าทุกฮิตของมัลติฮิต', () => {
    const r = fight([mk('A', { multi: 3, shock: L3(2) }), dummy('B')], [u('A')], [u('B')]);
    eq(ev(r, 'dmg', e => e.why === 'shock' && e.t === 2000).map(e => e.amount), [6, 6, 6], 'ชุดที่ 2');
  }],
  ['ช็อตที่เพิ่งติด ยังไม่เพิ่มดาเมจในชุดเดียวกัน', () => {
    const r = fight([mk('A', { multi: 3, shock: L3(2) }), dummy('B')], [u('A')], [u('B')]);
    eq(ev(r, 'dmg', e => e.why === 'shock' && e.t === 1000).length, 0, 'ช็อตในชุดแรก');
  }],
  ['ไฟทำดาเมจทุก 1 วิ ลดลงตามค่าที่ตั้ง และโดนเกราะกัน', () => {
    // X ติดไฟให้ศัตรูทุกตัว 5 ครั้งเดียวตอน down (K ตี X down ที่ 1 วิ) แล้วดูไฟบน B
    const X = mk('X', { hp: L3(1), cdMs: NEVER, skills: [{ when: 'selfDown', do: 'burn', to: 'allEnemies', v: L3(5) }] });
    const r = fight([mk('K', { atk: L3(1) }), dummy('B', { armor: L3(3) }), X, dummy('Y')], [u('K', 0, 0), u('B', 1, 0)], [u('X', 0, 0), u('Y', 1, 0)]);
    const b = ev(r, 'dmg', e => e.why === 'burn' && e.to === uidOf(r, 0, 'B'));
    const want = []; for (let x = 5; x > 0; x -= RULES.burnDecay) want.push(x);
    eq(b.map(e => e.amount), want, 'ไฟแต่ละวิ');
    eq(b[0].absorbed, 3, 'เกราะกันไฟ');
  }],
  ['มัลติฮิตหยุดเมื่อเป้า down', () => {
    const r = fight([mk('A', { multi: 5 }), mk('B', { hp: L3(25), cdMs: NEVER })], [u('A')], [u('B')]);
    eq(ev(r, 'dmg', e => e.why === 'hit').length, 3, 'จำนวนฮิตที่ลง');
  }],
  ['เลือกเป้า: เลนเดียวกัน หน้าสุดก่อน', () => {
    const r = fight([mk('A'), dummy('X'), dummy('Y'), dummy('Z')], [u('A', 2, 0)], [u('X', 0, 1), u('Y', 1, 0), u('Z', 2, 0)]);
    eq(ev(r, 'set')[0].target, uidOf(r, 1, 'Y'), 'เป้าแรก');
  }],
  ['เลนตรงข้ามหมด ข้ามไปตีอีกเลน', () => {
    const r = fight([mk('A'), dummy('X')], [u('A', 0, 0)], [u('X', 2, 1)]);
    eq(ev(r, 'set')[0].target, uidOf(r, 1, 'X'), 'เป้าแรก');
  }],
  ['ตีพร้อมกันใน tick เดียว down พร้อมกัน = เสมอ', () => {
    const c = mk('A', { atk: L3(100), hp: L3(50) });
    const r = fight([c], [u('A')], [u('A')]);
    eq([r.winner, r.timeMs], [null, 1000], 'ผล');
  }],
  ['down แล้วล้างสถานะ (ไฟไม่ทำดาเมจต่อ)', () => {
    const r = fight([mk('A', { atk: L3(60), burn: L3(10) }), mk('B', { hp: L3(100), cdMs: NEVER }), dummy('C')],
      [u('A')], [u('B'), u('C', 1, 0)]);
    const b = uidOf(r, 1, 'B'), downT = ev(r, 'down', e => e.who === b)[0].t;
    eq(ev(r, 'dmg', e => e.to === b && e.t > downT).length, 0, 'ดาเมจหลัง down');
  }],
  ['down ระหว่างรอคูลดาวน์ = ไม่ได้ลงมือ', () => {
    const r = fight([mk('A', { atk: L3(1000) }), mk('X', { cdMs: 1500 })], [u('A')], [u('X')]);
    eq(ev(r, 'set', e => e.who === uidOf(r, 1, 'X')).length, 0, 'ชุดของตัวที่ down');
  }],
  ['ฟื้นจาก down: HP ตาม % และเริ่มคูลดาวน์ใหม่', () => {
    const X = mk('X', { cdMs: 600, atk: L3(1), skills: [{ when: 'selfDown', do: 'revive', to: 'self', v: L3(50) }] });
    const r = fight([mk('A', { atk: L3(150) }), X], [u('A')], [u('X')]);
    const x = uidOf(r, 1, 'X');
    eq(ev(r, 'revive').map(e => [e.t, e.hp])[0], [1000, 50], 'ฟื้นครั้งแรก');
    ok(ev(r, 'revive').length > 1, 'ไม่มีเพดานครั้ง: ต้องลุกกลับมาได้มากกว่า 1 ครั้ง');
    eq(ev(r, 'set', e => e.who === x && e.t > 1000)[0].t, 1600, 'ชุดแรกหลังฟื้น (ฟื้นที่ 1 วิ + คูลดาวน์ 0.6 วิ)');
  }],
  ['ฝั่งที่ไม่มีตัวตอนเริ่ม แพ้ทันที', () => {
    const m = makeCharMap([mk('A')]);
    const r = simulate([], buildTeam([u('A')], m));
    eq([r.winner, r.timeMs], [1, 0], 'ผล');
    eq(simulate([], []).winner, null, 'ว่างทั้งคู่');
  }],
  ['เกิน 180 วิ พายุทรายทำให้แมตช์จบ', () => {
    const r = fight([dummy('A')], [u('A')], [u('A')]);
    ok(r.timeMs > RULES.stormStartMs && r.timeMs < RULES.hardStopMs, `จบที่ ${r.timeMs / 1000} วิ`);
    ok(ev(r, 'dmg', e => e.why === 'storm').length > 0, 'ไม่มีพายุทราย');
  }],
  ['ชุด 24: พายุทรายดาเมจตายตัวทวีคูณทุกครั้ง ไม่ขึ้นกับ HP สูงสุด · เกราะกันได้ตามกฎ · ตัวสะสมเกราะก็ไม่ลากถึงตัวตัด', () => {
    // ไม่ผูกกับตัวเลขที่ผู้ใช้เลือก: คิดค่าที่คาดจาก RULES
    const A = dummy('A', { hp: L3(9000) }), B = dummy('B', { hp: L3(40000), armor: L3(5) });
    const r = fight([A, B], [u('A')], [u('B')]), s = ev(r, 'dmg', e => e.why === 'storm');
    const want = k => RULES.stormDmgStart * RULES.stormDmgMult ** (k - 1);
    const ofA = s.filter(e => e.to === s[0].to && e.amount > 0), uidB = s.find(e => e.to !== s[0].to).to;
    eq(ofA.slice(0, 3).map(e => e.amount), [want(1), want(2), want(3)], 'ดาเมจครั้งที่ 1–3');
    eq(s.filter(e => e.to === uidB)[0].amount, want(1), 'HP สูงสุดต่างกันได้ดาเมจเท่ากัน');
    const first = s.find(e => e.to === uidB);
    eq(first.absorbed, RULES.stormPierce ? 0 : Math.min(5, want(1)), 'เกราะกัน/ทะลุตามกฎ');
    // ตัวที่ได้เกราะทุกฮิตแรงๆ (แบบ HL-3 Lv3) สู้กันเอง ต้องจบก่อนตัวตัดเวลา
    const T = mk('T', { atk: L3(1), cdMs: 500, hp: L3(1000), skills: [{ when: 'hit', do: 'armorHitUp', to: 'self', v: L3(80) }] });
    const r2 = fight([T], [u('T')], [u('T')]);
    ok(r2.timeMs < RULES.hardStopMs, `ทีมสะสมเกราะจบที่ ${r2.timeMs / 1000} วิ`);
  }],
  ['ผลเหมือนเดิมทุกครั้ง (ทีมเดิม → บันทึกเดิม)', () => {
    const chars = buildCharacterList(), m = makeCharMap(chars), rng = makeRng(7);
    for (let i = 0; i < 20; i++) {
      const A = randomTeam(rng, chars, 6, 'mix'), B = randomTeam(rng, chars, 6, 'mix');
      const r1 = simulate(buildTeam(A, m), buildTeam(B, m)), r2 = simulate(buildTeam(A, m), buildTeam(B, m));
      ok(JSON.stringify(r1.events) === JSON.stringify(r2.events), `แมตช์ ${i} ผลไม่ตรงกัน`);
    }
  }],
  ['ไม่มีฝั่งได้เปรียบ: สลับฝั่งแล้วผลกลับด้านตรงกัน (300 แมตช์)', () => {
    const chars = buildCharacterList(), m = makeCharMap(chars), rng = makeRng(11);
    let bad = 0;
    for (let i = 0; i < 300; i++) {
      const A = randomTeam(rng, chars, 1 + rng.int(6), 'mix'), B = randomTeam(rng, chars, 1 + rng.int(6), 'mix');
      const r1 = simulate(buildTeam(A, m), buildTeam(B, m), { log: false }), r2 = simulate(buildTeam(B, m), buildTeam(A, m), { log: false });
      const flip = r2.winner == null ? null : 1 - r2.winner;
      if (r1.winner !== flip || r1.timeMs !== r2.timeMs) bad++;
    }
    eq(bad, 0, 'แมตช์ที่ไม่ตรงกัน');
  }],
  ['ชุด 21: สลับฝั่งแล้วผลตรงกัน เมื่อมีพาเพื่อนไปตี/สะท้อนดีบัฟ/ชุบเพื่อนที่ down (600 แมตช์)', () => {
    // เลือกตัวจากชนิดผลสกิล ไม่ผูกกับ ID หรือค่าที่ผู้ใช้ปรับ · ทุกทีมมีตัวที่ใช้ผลเหล่านี้อย่างน้อย 1 ตัว
    const chars = buildCharacterList(), m = makeCharMap(chars), rng = makeRng(21);
    const special = chars.filter(c => c.skills.some(s => ['allyStrike', 'reflectDebuff', 'reviveDowned'].includes(s.do)));
    if (!special.length) return; // ยังไม่มีตัวใช้ผลเหล่านี้
    let bad = 0;
    for (let i = 0; i < 600; i++) {
      const A = randomTeam(rng, chars, 2 + rng.int(5), 'mix'), B = randomTeam(rng, chars, 2 + rng.int(5), 'mix');
      A[0].id = rng.pick(special).id; B[0].id = rng.pick(special).id;
      const r1 = simulate(buildTeam(A, m), buildTeam(B, m), { log: false }), r2 = simulate(buildTeam(B, m), buildTeam(A, m), { log: false });
      const flip = r2.winner == null ? null : 1 - r2.winner;
      if (r1.winner !== flip || r1.timeMs !== r2.timeMs) bad++;
    }
    eq(bad, 0, 'แมตช์ที่ไม่ตรงกัน');
  }],
  ['ชุด 21: ไฟที่สะท้อนทำหลังคิวสถานะ · เพื่อนที่ HP หมดใน tick เดียวกันยังถูกพาไปตีได้', () => {
    const P = dummy('P', { tribe: 'ภูติ', skills: [{ when: 'passive', do: 'reflectDebuff', to: 'allAllies', v: L3(50) }] });
    const B = mk('B', { atk: L3(1), burn: L3(10), cdMs: 1000, hp: L3(1e6) });
    const r = fight([P, B], [u('P')], [u('B')], { rules: { ...NT, hardStopMs: 1000 } });
    const b = uidOf(r, 1, 'B');
    const iBurn = r.events.findIndex(e => e.k === 'burn' && e.why !== 'reflect'), iRef = r.events.findIndex(e => e.k === 'reflectDebuff' && e.to === b);
    ok(iBurn >= 0 && iRef > iBurn, 'สะท้อนหลังไฟที่ใส่');
    eq(r.events.filter(e => e.k === 'burn' && e.to === b).map(e => e.amount), [5], 'ศัตรูโดนไฟสะท้อน 50% ของ 10');
    const S = mk('S', { tribe: 'ภูติ', atk: L3(1), cdMs: 1000, hp: L3(1e6), skills: [{ when: 'hit', do: 'allyStrike', to: 'allyRandom', sameTribe: true, v: L3(1) }] });
    const W = mk('W', { tribe: 'ภูติ', atk: L3(3), cdMs: NEVER, hp: L3(5) });
    const K = mk('K', { atk: L3(100), cdMs: 1000, hp: L3(1e6) });
    const r2 = fight([S, W, K], [u('W', 0, 0), u('S', 2, 0)], [u('K')], { rules: { ...NT, hardStopMs: 1000 } });
    const w = uidOf(r2, 0, 'W');
    ok(r2.events.some(e => e.k === 'carry' && e.who === w && e.t === 1000), 'W ถูกพาไปตีใน tick ที่ HP หมด');
  }],
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
  ['ชุด 23: ทีมบอท 90 ทีม (ขั้น × ช่วงรอบ) ผ่านตัวตรวจและตรงกับค่าเกม', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars);
    const v = validateBotTeams(BOT_TEAMS, cm, RULES, dataHash(chars));
    ok(v.ok, 'ทีมบอทใช้ไม่ได้ (ค่าตัวละคร/กฎเปลี่ยน → รัน node lab/botgen.mjs ใหม่): ' + v.errors.slice(0, 3).join(' | '));
    eq(BOT_TEAMS.stages.map(sp => sp.map(l => l.map(t => t.tier))), Array.from({ length: 10 }, () => BOT_SPANS.map(() => BOT_TIERS)), '10 ขั้น × 3 ช่วง × ง่าย/กลาง/ยาก');
  }],
  ['ชุด 23: ทีมบอทถูกแก้/ผิดรูปแบบ ถูกปฏิเสธ', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars), H = 'abc';
    const team = [{ id: chars[0].id, level: 1, row: 0, lane: 0 }];
    const good = { v: 3, hash: H, stages: Array.from({ length: 10 }, (_, k) => BOT_SPANS.map((__, b) => BOT_TIERS.map(tier => ({ tier, span: b, from: k, round: 1, power: 50, team: structuredClone(team) })))) };
    ok(validateBotTeams(good, cm, RULES, H).ok, 'ข้อมูลปกติผ่าน');
    const bad = f => { const o = structuredClone(good); f(o); return validateBotTeams(o, cm, RULES, H).ok; };
    eq([bad(o => { o.hash = 'zzz'; }), bad(o => { o.stages.pop(); }), bad(o => { o.stages[2].pop(); }), bad(o => { o.stages[2][1].pop(); }), bad(o => { o.stages[1][0][0].team[0].id = 'ZZ-9'; }),
      bad(o => { o.stages[1][0][0].team[0].level = 4; }), bad(o => { o.stages[1][0][0].team[0].perm = { multi: 1e9 }; }), bad(o => { o.stages[1][0][0].team[0].perm = { hack: 1 }; }),
      bad(o => { o.stages[1][0][0].evil = 1; }), bad(o => { o.stages[1][0][0].team = []; }), bad(o => { o.stages[1][0][1].tier = 'ยาก'; }), bad(o => { o.stages[0][0][0].round = 1.5; }),
      bad(o => { o.stages[0][2][0].span = 1; }), bad(o => { o.stages[0][1][0].from = 1; }), bad(o => { o.stages[2][0][0].round = 4; }), bad(o => { o.stages[0][2][0].power = 'x'; }),
      bad(o => { o.stages[3][1][2].team.push({ ...team[0] }); }), bad(o => { o.v = 2; })].every(x => x === false), true, 'ทุกแบบที่ผิดถูกปฏิเสธ');
    ok(!validateBotTeams(null, cm, RULES, H).ok && !validateBotTeams('x', cm, RULES, H).ok, 'ไม่ใช่วัตถุ = ปฏิเสธ');
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
    const o = { runs: 3, perStage: 6, refOpp: 3 };
    const g1 = genBotTeams(chars, RULES, o);
    eq(JSON.stringify(g1), JSON.stringify(genBotTeams(chars, RULES, o)), 'สร้างซ้ำได้ผลเดิม');
    eq(JSON.stringify(genBotTeams(chars, RULES, { ...o, stages: [0, 1] }).stages.slice(0, 2)), JSON.stringify(g1.stages.slice(0, 2)), 'แบ่งขั้นให้หลายโปรเซสได้ผลเดิม');
    let n = 0; const P = simRun(chars, RULES, 5, p => pickBotTeam(BOT_TEAMS, p.wins, p.seed, p.round).team, () => n++);
    ok(P.over && n === P.round && n >= 10 && n <= 19, `run จำลองกับทีมเตรียมจบได้ (${n} แมตช์)`);
  }],
  ['เกราะแตก (แบบ HL-6) ทำดาเมจเท่าเกราะที่เสีย', () => {
    const T = dummy('T', { armor: L3(40), skills: [{ when: 'armorBreak', do: 'armorBreakDmg', to: 'allEnemies', v: L3(100) }] });
    const r = fight([T, mk('B', { atk: L3(50), hp: L3(1000) })], [u('T')], [u('B')]);
    eq(ev(r, 'dmg', e => e.why === 'armorBreak').map(e => e.amount), [40], 'ดาเมจเกราะแตก');
  }],
  ['สะท้อนดาเมจเท่าเกราะที่เสีย (แบบ HL-6) ใส่ผู้ตี', () => {
    const T = dummy('T', { armor: L3(40), skills: [{ when: 'hitTaken', do: 'armorBreakDmg', to: 'attacker', v: L3(150) }] });
    const r = fight([T, mk('B', { atk: L3(30), hp: L3(1000) })], [u('T')], [u('B')]);
    eq(ev(r, 'dmg', e => e.why === 'armorBreak').slice(0, 2).map(e => [e.t, e.amount]), [[1000, 45], [2000, 15]], 'สะท้อน (เกราะเสีย 30 แล้ว 10)');
  }],
  ['เกราะจากการโดนตี ไม่กันฮิตที่มาใน tick เดียวกัน', () => {
    const T = dummy('T', { skills: [{ when: 'hitTaken', do: 'armor', to: 'self', v: L3(20) }] });
    const r = fight([T, mk('A')], [u('T')], [u('A', 0, 0), u('A', 1, 0)]);
    eq(ev(r, 'dmg', e => e.why === 'hit' && e.t === 1000).map(e => e.absorbed), [0, 0], 'tick แรก');
    eq(ev(r, 'dmg', e => e.why === 'hit' && e.t === 2000).map(e => e.absorbed), [10, 10], 'tick ถัดไป');
  }],
  ['ไม่มีเพดานครั้ง: สกิลทำงานทุกครั้ง และตัวตรวจค่าไม่รับช่อง cap', () => {
    const T = dummy('T', { skills: [{ when: 'hitTaken', do: 'armor', to: 'self', v: L3(1) }] });
    const r = fight([T, mk('A', { multi: 5, atk: L3(1) })], [u('T')], [u('A')]);
    eq(ev(r, 'armor', e => e.why === 'T' && e.t <= 2000).length, 10, 'จำนวนครั้งใน 2 ชุด');
    ok(validateConfig([mk('AA-1', { skills: [{ when: 'hit', do: 'burn', to: 'target', v: L3(1), cap: 2 }] })]).errors.some(e => e.includes('เพดาน')), 'ไม่เตือน cap');
  }],
  ['คูลดาวน์สกิล: รอครบตั้งแต่เริ่มแมตช์ ใช้แล้วนับใหม่ · ตัวตรวจค่าไม่รับ n', () => {
    const A = mk('A', { atk: L3(1), skills: [{ when: 'set', do: 'shock', to: 'target', v: L3(7), cd: 2000 }] });
    const r = fight([A, dummy('B')], [u('A')], [u('B')]);
    eq(ev(r, 'shock', e => e.amount === 7 && e.t <= 5000).map(e => e.t), [2000, 4000], 'เวลาที่ติดช็อต');
    eq(ev(r, 'proc', e => e.t <= 5000).map(e => [e.t, e.si]), [[2000, 0], [4000, 0]], 'บันทึกสกิลทำงาน');
    // คูลดาวน์สกิลไม่ช้าลงเพราะมึนงง: ถูกมึนงงตอนเริ่ม 1.5 วิ ชุดแรกตอน 2.5 วิ สกิลพร้อมแล้ว (เริ่มนับตั้งแต่ 0)
    const S = mk('S', { atk: L3(0), cdMs: NEVER, skills: [{ when: 'matchStart', do: 'stun', to: 'enemyFront', v: L3(1500) }] });
    const r2 = fight([A, S], [u('A')], [u('S')]);
    eq(ev(r2, 'shock', e => e.amount === 7).map(e => e.t).slice(0, 2), [2500, 4500], 'มึนงงไม่หยุดคูลดาวน์สกิล');
    ok(validateConfig([mk('AA-1', { skills: [{ when: 'set', do: 'burn', to: 'target', v: L3(1), n: 2 }] })]).errors.some(e => e.includes('N ชุด')), 'ไม่เตือน n');
    ok(validateConfig([mk('AA-1', { skills: [{ when: 'set', do: 'burn', to: 'target', v: L3(1), cd: 50 }] })]).errors.some(e => e.includes('คูลดาวน์สกิล')), 'ไม่เตือน cd ต่ำไป');
  }],
  ['คูลดาวน์ตัวละครแยกเลเวล', () => {
    const A = mk('A', { atk: L3(1), cdMs: [1000, 800, 600] });
    for (const [lv, want] of [[1, [1000, 2000]], [2, [800, 1600]], [3, [600, 1200]]]) {
      const r = fight([A, dummy('B')], [u('A', 0, 0, lv)], [u('B')]);
      eq(ev(r, 'set').slice(0, 2).map(e => e.t), want, `เลเวล ${lv}`);
    }
    ok(!validateConfig([mk('AA-1', { cdMs: [1000, 0, 500] })]).ok, 'คูลดาวน์ 0 ต้องไม่ผ่าน');
  }],
  ['สกิลตามเลเวล: ใช้เฉพาะเลเวลที่ติ๊กไว้', () => {
    const A = mk('A', { atk: L3(1), skills: [{ when: 'set', do: 'burn', to: 'target', v: L3(4), lv: [1, 2] }, { when: 'set', do: 'shock', to: 'target', v: L3(3), lv: [3] }] });
    for (const lv of [1, 2, 3]) {
      const r = fight([A, dummy('B')], [u('A', 0, 0, lv)], [u('B')]);
      const want = lv < 3 ? ['burn'] : ['shock'];
      eq([...new Set(ev(r, 'proc').map(e => e.what))], want, `เลเวล ${lv}`);
    }
  }],
  ['ชุบเพื่อน (WN-4): ได้ตามจำนวนครั้ง HP 20% · lifesteal ฟื้นตามดาเมจฮิต', () => {
    const W = dummy('W', { tribe: 'อสูร', skills: [{ when: 'allyDown', do: 'reviveAlly', to: 'self', v: [1, 2, 3] }] });
    const X = mk('X', { hp: L3(100), cdMs: NEVER, atk: L3(0) });
    const K = mk('K', { atk: L3(100), cdMs: 1000 });
    for (const lv of [1, 2, 3]) {
      const r = fight([W, X, K], [u('X', 0, 0), u('W', 1, 1, lv)], [u('K')]);
      const xu = uidOf(r, 0, 'X');
      eq(ev(r, 'revive', e => e.who === xu).map(e => [e.hp, e.why]), Array(lv).fill([20, 'ally']), `เลเวล ${lv} ชุบ`);
    }
    const V = mk('V', { tribe: 'อสูร', atk: L3(30), skills: [{ when: 'hit', do: 'lifesteal', to: 'self', v: L3(50) }] });
    const r = fight([V, mk('E', { atk: L3(40), hp: L3(10000) })], [u('V')], [u('E')]);
    const vu = uidOf(r, 0, 'V');
    eq(ev(r, 'heal', e => e.to === vu)[0].amount, 15, 'ฟื้น 50% ของ 30');
    ok(!validateConfig([mk('AA-1', { skills: [{ when: 'hit', do: 'lifesteal', to: 'self', v: L3(5) }] })]).ok, 'เผ่าเหล็กกล้าใช้ดูดเลือดไม่ได้');
  }],
  ['สกิลใหม่ 19 ต.ค.: ลด HP สูงสุด · down ทันที · ล้างสถานะ · แบ่งเกราะ · ฟื้นเป็นพลัง', () => {
    const C = mk('C', { atk: L3(0), cdMs: NEVER, skills: [{ when: 'matchStart', do: 'maxHpCut', to: 'enemyFront', v: L3(40) }] });
    let r = fight([C, dummy('B', { hp: L3(1000) })], [u('C')], [u('B')]);
    eq(ev(r, 'maxhp').map(e => [e.amount, e.maxHp, e.hp]), [[400, 600, 600]], 'ลด HP สูงสุด 40%');
    const Xc = mk('X', { atk: L3(0), cdMs: NEVER, skills: [{ when: 'matchStart', do: 'execute', to: 'enemyFront', v: L3(1) }] });
    r = fight([Xc, dummy('B', { armor: L3(500) })], [u('X')], [u('B')]);
    eq([r.winner, r.timeMs], [0, 0], 'down ทันทีแม้มีเกราะ');
    const P = dummy('P', { tribe: 'ภูติ', skills: [{ when: 'set', do: 'cleanse', to: 'frontAlly', v: L3(1) }], cdMs: 2000 });
    const Fz = mk('F', { atk: L3(0), cdMs: 1000, burn: L3(30), skills: [] });
    r = fight([P, dummy('T'), mk('F', { atk: L3(1), burn: L3(30), cdMs: 1000 })], [u('T', 0, 0), u('P', 1, 0)], [u('F')]);
    const tu = uidOf(r, 0, 'T');
    ok(ev(r, 'cleanse', e => e.to === tu && e.t === 2000).length === 1, 'ล้างที่ 2 วิ');
    ok(!ev(r, 'dmg', e => e.to === tu && e.why === 'burn' && e.t > 2000 && e.t < 3000).length, 'หลังล้างไม่มีไฟจนกว่าจะติดใหม่');
    void Fz;
    const S = dummy('S', { skills: [{ when: 'passive', do: 'shareArmor', to: 'self', v: L3(50) }, { when: 'matchStart', do: 'armor', to: 'self', v: L3(40) }] });
    r = fight([S, dummy('Y')], [u('S', 0, 0), u('Y', 0, 1)], [u('Y')]);
    const yu = uidOf(r, 0, 'Y');
    eq(ev(r, 'armor', e => e.to === yu).map(e => [e.amount, e.why]), [[20, 'share']], 'เพื่อนได้ 50%');
    const H = mk('H', { tribe: 'ภูติ', atk: L3(1), skills: [{ when: 'passive', do: 'healToAtk', to: 'self', v: L3(50) }, { when: 'set', do: 'heal', to: 'frontAlly', v: L3(20) }] });
    r = fight([H, mk('T2', { atk: L3(0), cdMs: NEVER, hp: L3(100) }), mk('E', { atk: L3(30), cdMs: 1000, hp: L3(10000) })], [u('T2', 0, 0), u('H', 1, 0)], [u('E')]);
    const hu = uidOf(r, 0, 'H');
    eq(ev(r, 'atkUp', e => e.to === hu)[0].amount, 10, 'ฟื้น 20 → พลังโจมตี +10');
  }],
  ['สกิลใหม่ 19 ต.ค.: สวนกลับเท่ามัลติฮิต · ดาเมจ/ไฟ % เกราะตัวเอง · ดาเมจ % ไฟศัตรู · ดับไฟเพื่อนเป็นพลัง', () => {
    const W = dummy('W', { multi: [3, 3, 3], atk: L3(5), skills: [{ when: 'hitTaken', do: 'counterMulti', to: 'attacker', v: L3(1) }] });
    let r = fight([W, mk('A', { atk: L3(1) })], [u('W')], [u('A')]);
    eq(ev(r, 'dmg', e => e.why === 'counter' && e.t === 1000).length, 3, 'สวนกลับ 3 ฮิต');
    const Hm = dummy('H', { armor: L3(100), skills: [{ when: 'matchStart', do: 'dmgPctArmor', to: 'enemyFront', v: L3(30) }, { when: 'matchStart', do: 'burnPctArmor', to: 'enemyFront', v: L3(20) }] });
    r = fight([Hm, dummy('B')], [u('H')], [u('B')]);
    eq(ev(r, 'dmg', e => e.why === 'skill').map(e => e.amount), [30], 'ดาเมจ 30% ของเกราะ 100');
    eq(ev(r, 'burn', e => e.t === 0).map(e => e.amount), [20], 'ไฟ 20% ของเกราะ 100');
    const Bn = dummy('Bn', { skills: [{ when: 'matchStart', do: 'burn', to: 'allEnemies', v: L3(10) }] });
    const Pq = mk('P', { atk: L3(0), skills: [{ when: 'set', do: 'dmgPctEnemyBurn', to: 'enemyFront', v: L3(50) }] });
    r = fight([Bn, Pq, dummy('E1'), dummy('E2')], [u('Bn', 0, 0), u('P', 0, 1)], [u('E1', 0, 0), u('E2', 0, 1)]);
    eq(ev(r, 'dmg', e => e.why === 'skill' && e.t === 1000).map(e => e.amount), [10 - RULES.burnDecay], 'ดาเมจ 50% ของไฟรวม (หลังไฟลดตามกฎ)');
    const Ea = mk('Ea', { atk: L3(1), cdMs: NEVER, skills: [{ when: 'matchStart', do: 'eatAllyBurn', to: 'self', v: L3(100) }] });
    const Fb = dummy('Fb', { skills: [{ when: 'passive', do: 'burn', to: 'allEnemies', v: L3(6) }] });
    r = fight([Ea, Fb, dummy('T')], [u('Ea', 0, 0), u('T', 0, 1)], [u('Fb')]);
    eq(ev(r, 'atkUp').map(e => e.amount), [12], 'ดับไฟ 6+6 → พลังโจมตี +12');
  }],
  ['คูลดาวน์ไม่ต่ำกว่าค่าต่ำสุด', () => {
    const r = fight([mk('A', { atk: L3(1), cdMs: 100 }), dummy('B')], [u('A')], [u('B')]);
    eq(ev(r, 'set').slice(0, 3).map(e => e.t), [1, 2, 3].map(k => k * RULES.minCooldownMs), 'เวลาแต่ละชุด');
  }],
  ['ฟื้น HP เกิดหลังดาเมจ และไม่เกิน HP สูงสุด', () => {
    const H = mk('H', { tribe: 'ภูติ', atk: L3(0), skills: [{ when: 'set', do: 'heal', to: 'frontAlly', v: L3(50) }] });
    const r = fight([H, dummy('F', { hp: L3(100) }), mk('E', { atk: L3(30) })], [u('F', 0, 0), u('H', 1, 0)], [u('E')]);
    eq(ev(r, 'heal').slice(0, 1).map(e => [e.t, e.amount]), [[1000, 30]], 'ฟื้นครั้งแรก');
  }],
  ['ฟื้น HP ไม่ช่วยตัวที่ HP ถึง 0 ใน tick เดียวกัน', () => {
    const H = mk('H', { tribe: 'ภูติ', atk: L3(0), skills: [{ when: 'set', do: 'heal', to: 'frontAlly', v: L3(50) }] });
    const r = fight([H, mk('F', { hp: L3(30), cdMs: NEVER }), mk('E', { atk: L3(30) })], [u('F', 0, 0), u('H', 1, 0)], [u('E')]);
    eq(ev(r, 'down', e => e.who === uidOf(r, 0, 'F')).length, 1, 'F down');
  }],
  ['ค่าถาวรรวมเข้าตัวละคร', () => {
    const r = fight([mk('A'), dummy('B')], [u('A', 0, 0, 1, { atk: 5 })], [u('B')]);
    eq(ev(r, 'dmg', e => e.why === 'hit')[0].amount, 15, 'ดาเมจ');
  }],
  ['ลดคูลดาวน์ % ตอนเริ่มแมตช์ (แบบ PT-4)', () => {
    const P = dummy('P', { tribe: 'ภูติ', skills: [{ when: 'matchStart', do: 'cdPct', to: 'frontBackAlly', v: L3(20) }] });
    const r = fight([P, mk('A', { atk: L3(1) }), dummy('B')], [u('A', 0, 0), u('P', 1, 0)], [u('B')]);
    eq(ev(r, 'set').slice(0, 2).map(e => e.t), [800, 1600], 'เวลาชุดของเพื่อนข้างหน้า');
  }],
  ['กระจายฮิต (แบบ WY-6): คนละตัว เริ่มจาก HP ต่ำสุด', () => {
    const W = mk('W', { multi: 3, atk: L3(1), skills: [{ when: 'set', do: 'spread', to: 'lowestHp', v: L3(1) }] });
    const r = fight([W, dummy('X', { hp: L3(70) }), dummy('Y', { hp: L3(50) }), dummy('Z', { hp: L3(60) })], [u('W')], [u('X', 0, 0), u('Y', 1, 0), u('Z', 0, 1)]);
    eq(ev(r, 'dmg', e => e.why === 'hit' && e.t === 1000).map(e => e.to), ['Y', 'Z', 'X'].map(id => uidOf(r, 1, id)), 'ลำดับเป้า');
  }],
  ['ผลตอน down: เกราะให้เพื่อนข้างหลัง (แบบ HL-5)', () => {
    const D = mk('D', { hp: L3(10), cdMs: NEVER, skills: [{ when: 'selfDown', do: 'armor', to: 'backAlly', v: L3(40) }] });
    const r = fight([D, dummy('K'), mk('E')], [u('D', 0, 0), u('K', 1, 0)], [u('E')]);
    eq(ev(r, 'armor', e => e.to === uidOf(r, 0, 'K')).map(e => e.amount), [40], 'เกราะของเพื่อน');
  }],
  ['ศัตรู down: ย้ายไฟ (แบบ PL-6) และช็อต (แบบ SF-5)', () => {
    const P = mk('P', { atk: L3(100), burn: L3(10), skills: [{ when: 'enemyDown', do: 'spreadBurn', to: 'allEnemies', v: L3(50) }] });
    const r = fight([P, mk('X', { hp: L3(150), cdMs: NEVER }), dummy('Y')], [u('P')], [u('X', 0, 0), u('Y', 1, 0)]);
    eq(ev(r, 'burn', e => e.to === uidOf(r, 1, 'Y') && e.t === 2000).map(e => e.amount), [9], 'ไฟที่ลามไป Y (ไฟบน X = 9 + 10 จากฮิตสุดท้าย = 19 → 50%)');
    const S = mk('S', { atk: L3(100), shock: L3(10), skills: [{ when: 'enemyDown', do: 'moveShock', to: 'enemyFront', v: L3(100) }] });
    const r2 = fight([S, mk('X', { hp: L3(150), cdMs: NEVER }), dummy('Y')], [u('S')], [u('X', 0, 0), u('Y', 1, 0)]);
    eq(ev(r2, 'shock', e => e.to === uidOf(r2, 1, 'Y') && e.t === 2000).map(e => e.amount), [20], 'ช็อตที่ส่งต่อไป Y (10 + 10 จากฮิตสุดท้าย → 100%)');
  }],
  ['เผ่า: เหล็กกล้า 2 ตัว → ทั้งทีมได้เกราะเริ่ม % ของ HP สูงสุด', () => {
    const r = fightT([mk('S1'), mk('S2'), dummy('D', { tribe: 'วายุ' })], [u('S1', 0, 0), u('S2', 0, 1), u('D', 1, 0)], [u('D')]);
    eq(ev(r, 'armor', e => e.why === 'tribe' && e.t === 0).map(e => e.amount), [8, 8, 800].map((x, i) => i < 2 ? Math.floor(100 * TBN['เหล็กกล้า'].armorPct[0] / 100) : Math.floor(10000 * TBN['เหล็กกล้า'].armorPct[0] / 100)), 'เกราะเผ่า (ทั้งทีม รวมตัวต่างเผ่า)');
  }],
  ['เผ่า: ตัวซ้ำชื่อนับครั้งเดียว · เผ่าเพิ่มนับเข้าเผ่า', () => {
    const r = fightT([mk('S1'), dummy('D', { tribe: 'วายุ' })], [u('S1', 0, 0), u('S1', 0, 1)], [u('D')]);
    eq(ev(r, 'armor', e => e.why === 'tribe').length, 0, 'ตัวซ้ำไม่ควรเปิดขั้น 2');
    const r2 = fightT([mk('S1'), mk('W', { tribe: 'วายุ', extraTribes: ['เหล็กกล้า'] }), dummy('D', { tribe: 'วายุ' })], [u('S1', 0, 0), u('W', 0, 1)], [u('D')]);
    eq(r2.events[0].tribes[0], { 'เหล็กกล้า': 2 }, 'ขั้นที่เปิด');
  }],
  ['เผ่า: เพลิงเผา 2 ตัว → ฮิตแรกติดไฟ +1 ทุก 2 ชุด', () => {
    const P = id => mk(id, { tribe: 'เพลิงเผา', atk: L3(1) });
    const r = fightT([P('P1'), P('P2'), dummy('D', { tribe: 'วายุ' })], [u('P1', 0, 0), u('P2', 1, 0)], [u('D')], { rules: TBR({ 'เพลิงเผา': { burn: [1, 1, 2], every: [2, 1, 1], startBurn: [0, 0, 0], burnDmgPct: [0, 0, 0] } }) });
    eq(ev(r, 'burn', e => e.why === 'tribe' && e.t <= 4000).map(e => e.t), [2000, 2000, 4000, 4000], 'เวลาที่ติดไฟ');
  }],
  ['เผ่า: วายุ 2 ตัว → ฮิตเพิ่มตามจำนวนชุดที่ตั้งไว้', () => {
    const W = id => mk(id, { tribe: 'วายุ', atk: L3(1) });
    const r = fightT([W('W1'), W('W2'), dummy('D', { tribe: 'ภูติ' })], [u('W1', 0, 0), u('W2', 1, 0)], [u('D')]);
    const k = TBN['วายุ'].every[0], want = Array.from({ length: k }, (_, i) => (i === k - 1 ? 1 + TBN['วายุ'].extraHit[0] : 1));
    eq(ev(r, 'set', e => e.who === 0 && e.t <= k * 1000).map(e => e.hits), want, 'ฮิตต่อชุด');
  }],
  ['เผ่า: ภูติ 6 ตัว → ชุดแรกปล่อยทันที และคูลดาวน์ลด', () => {
    const T6 = { cdPct: [8, 15, 25], instantFirst: [0, 0, 1], startSets: [0, 0, 0] };
    const ids = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
    const chars = [...ids.map(id => mk(id, { tribe: 'ภูติ', atk: L3(1) })), dummy('D', { tribe: 'วายุ' })];
    const r = fightT(chars, ids.map((id, i) => u(id, Math.floor(i / 2), i % 2)), [u('D')], { rules: TBR({ 'ภูติ': T6 }) });
    const cd = Math.round(1000 * (1 - T6.cdPct[2] / 100));
    eq(ev(r, 'set', e => e.who === 0).slice(0, 2).map(e => e.t), [100, 100 + Math.ceil(cd / 100) * 100], 'เวลาชุดแรกและชุดที่สอง');
  }],
  ['เผ่า: อสูร 4 ตัว → ตัวแรกที่ down ลุกกลับมา และ down แล้วระเบิด', () => {
    const T4 = { blastPct: [150, 150, 150], revives: [0, 1, 2], revivePct: [0, 40, 60] };
    const ids = ['F1', 'F2', 'F3', 'F4'];
    const chars = [...ids.map(id => mk(id, { tribe: 'อสูร', atk: L3(20), hp: L3(50), cdMs: NEVER })), mk('E', { tribe: 'วายุ', atk: L3(60), hp: L3(10000) })];
    const r = fightT(chars, ids.map((id, i) => u(id, Math.floor(i / 2), i % 2)), [u('E')], { rules: TBR({ 'อสูร': T4 }) });
    eq(ev(r, 'revive').map(e => [e.t, e.hp]), [[1000, Math.floor(50 * T4.revivePct[1] / 100)]], 'ฟื้นตัวแรก');
    eq(ev(r, 'dmg', e => e.why === 'downSkill')[0].amount, Math.floor(20 * T4.blastPct[1] / 100), 'ระเบิดตอน down');
  }],
  ['เผ่า: เหล็กกล้า 6 ตัว → เกราะแตกได้คืน 1 ครั้ง', () => {
    const ids = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
    const chars = [...ids.map(id => mk(id, { atk: L3(0), cdMs: NEVER })), mk('E', { tribe: 'วายุ', atk: L3(100), hp: L3(10000) })];
    const r = fightT(chars, ids.map((id, i) => u(id, Math.floor(i / 2), i % 2)), [u('E')], { rules: TBR({ 'เหล็กกล้า': { armorPct: [8, 16, 20], restore: [0, 0, 1], hpPct: [0, 0, 0] } }) });
    eq(ev(r, 'armor', e => e.why === 'tribe' && e.to === 0).length, 2, 'เกราะเผ่าของตัวหน้า (เริ่ม + ได้คืน)');
  }],
  // ---- ชุด 32: โบนัสเผ่าแบบใหม่ (ค่าเริ่ม 0 · ทดสอบด้วยค่าทดลอง) ----
  ['ชุด 32: ช่องโบนัสใหม่ค่า 0 ไม่เปลี่ยนแฮชข้อมูล · ใส่ค่าแล้วแฮชเปลี่ยน', () => {
    // ชุด 38: ตั้งช่องใหม่ทุกเผ่าเป็น 0 เองก่อนเทียบ ไม่ผูกกับค่าโบนัสเผ่าที่ผู้ใช้ปรับ
    const chars = buildCharacterList(), NEWK = ['hpPct', 'startBurn', 'burnDmgPct', 'startShock', 'shockDmgPct', 'dmgPct', 'startSets'];
    const zero = structuredClone(RULES.tribeBonus), old = structuredClone(RULES.tribeBonus);
    for (const t of Object.keys(zero)) for (const k of NEWK) { zero[t][k] = [0, 0, 0]; delete old[t][k]; }
    const base = dataHash(chars, { ...RULES, tribeBonus: zero });
    eq(dataHash(chars, { ...RULES, tribeBonus: old }), base, 'แฮชเท่าเดิม');
    const tb = structuredClone(zero); tb['วายุ'].dmgPct = [5, 0, 0];
    ok(dataHash(chars, { ...RULES, tribeBonus: tb }) !== base, 'ใส่ค่าแล้วแฮชต้องเปลี่ยน');
  }],
  ['ชุด 32: เหล็กกล้า HP สูงสุด +% ทั้งทีม (เกราะเริ่มคิดจาก HP เดิม)', () => {
    const tb = structuredClone(RULES.tribeBonus); tb['เหล็กกล้า'].hpPct = [50, 50, 50];
    const r = fightT([mk('S1', { cdMs: NEVER }), mk('S2', { cdMs: NEVER }), dummy('D', { tribe: 'วายุ' })], [u('S1', 0, 0), u('S2', 1, 0)], [u('D')], { rules: { ...RULES, tribeBonus: tb } });
    eq(r.events[0].units.filter(x => x.side === 0).map(x => [x.hp, x.maxHp]), [[150, 150], [150, 150]], 'HP เริ่ม');
    eq(ev(r, 'armor', e => e.why === 'tribe' && e.to === 0)[0].amount, Math.floor(100 * TBN['เหล็กกล้า'].armorPct[0] / 100), 'เกราะเริ่ม');
  }],
  ['ชุด 32: เพลิงเผา ติดไฟศัตรูทุกตัวตอนเริ่ม + ดาเมจไฟ +%', () => {
    const tb = structuredClone(RULES.tribeBonus); tb['เพลิงเผา'].startBurn = [5, 5, 5]; tb['เพลิงเผา'].burnDmgPct = [100, 100, 100];
    const F = id => mk(id, { tribe: 'เพลิงเผา', atk: L3(0), cdMs: NEVER });
    const r = fightT([F('F1'), F('F2'), dummy('D1', { tribe: 'วายุ' }), dummy('D2', { tribe: 'ภูติ' })], [u('F1', 0, 0), u('F2', 1, 0)], [u('D1', 0, 0), u('D2', 0, 1)], { rules: { ...RULES, tribeBonus: tb } });
    eq(ev(r, 'burn', e => e.why === 'tribe').map(e => e.amount), [5, 5], 'ติดไฟตอนเริ่ม (ศัตรู 2 ตัว · ฝั่งตัวเองไม่ติด)');
    eq(ev(r, 'dmg', e => e.why === 'burn' && e.t === 1000).map(e => e.amount), [10, 10], 'ไฟวิแรก 5 × 2');
  }],
  ['ชุด 32: สายฟ้า ติดช็อตตอนเริ่ม + ดาเมจช็อต +%', () => {
    const tb = structuredClone(RULES.tribeBonus); tb['สายฟ้า'].startShock = [3, 3, 3]; tb['สายฟ้า'].shockDmgPct = [100, 100, 100];
    const B = id => mk(id, { tribe: 'สายฟ้า', atk: L3(1) });
    const r = fightT([B('B1'), B('B2'), dummy('D', { tribe: 'วายุ' })], [u('B1', 0, 0), u('B2', 1, 0)], [u('D')], { rules: { ...RULES, tribeBonus: tb } });
    eq(ev(r, 'shock', e => e.why === 'tribe' && e.t === 0).map(e => e.amount), [3], 'ติดช็อตตอนเริ่ม');
    eq(ev(r, 'dmg', e => e.why === 'shock')[0].amount, 6, 'ช็อต 3 × 2');
  }],
  ['ชุด 32: วายุ ดาเมจตีปกติ +%', () => {
    const tb = structuredClone(RULES.tribeBonus); tb['วายุ'].dmgPct = [50, 50, 50];
    const W = id => mk(id, { tribe: 'วายุ', atk: L3(10) });
    const r = fightT([W('W1'), W('W2'), dummy('D', { tribe: 'ภูติ' })], [u('W1', 0, 0), u('W2', 1, 0)], [u('D')], { rules: { ...RULES, tribeBonus: tb } });
    eq(ev(r, 'dmg', e => e.why === 'hit')[0].amount, 15, 'ดาเมจฮิตแรก');
  }],
  ['ชุด 32: ภูติ ปล่อยทันที N ชุดติดกัน (เพดาน startSetsMax)', () => {
    const ids = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
    const chars = [...ids.map(id => mk(id, { tribe: 'ภูติ', atk: L3(1) })), dummy('D', { tribe: 'วายุ' })];
    const run = n => { const tb = structuredClone(RULES.tribeBonus); tb['ภูติ'].startSets = [n, n, n];
      return ev(fightT(chars, ids.map((id, i) => u(id, Math.floor(i / 2), i % 2)), [u('D')], { rules: { ...RULES, tribeBonus: tb } }), 'set', e => e.who === 0).slice(0, 4).map(e => e.t); };
    const cd = Math.ceil(1000 * (1 - TBN['ภูติ'].cdPct[2] / 100) / 100) * 100;
    eq(run(3), [100, 200, 300, 300 + cd], 'ชุดทันที 3 ชุด แล้วคูลดาวน์ปกติ');
    eq(run(9), run(RULES.startSetsMax), 'เกินเพดาน = เท่าเพดาน');
  }],
  ['ชุด 33: ตีแบ่งทุกตัว 1 ฮิต = ดาเมจหลายเป้า แต่มีแค่เป้าแรกที่ไม่ติดป้าย sub (สรุปรายตัวนับ 1 ฮิต)', () => {
    const A = mk('A', { atk: L3(30), multi: 2, skills: [{ when: 'set', do: 'splitAll', to: 'allEnemies', v: L3(1) }] });
    const r = fight([A, dummy('D1'), dummy('D2'), dummy('D3')], [u('A')], [u('D1', 0, 0), u('D2', 0, 1), u('D3', 1, 0)]);
    const first = ev(r, 'dmg', e => e.why === 'hit' && e.t === 1000);
    eq(first.length, 6, 'ดาเมจฮิตชุดแรก (2 ฮิต × 3 เป้า)');
    eq(first.filter(e => !e.sub).length, 2, 'ฮิตที่ออกไปตี');
    ok(ev(fight([mk('B'), dummy('D')], [u('B')], [u('D')]), 'dmg', e => e.sub).length === 0, 'ตีปกติไม่มีป้าย sub');
  }],
  ['ปิดโบนัสเผ่ารายฝั่งได้ (ใช้ทดสอบบาลานซ์)', () => {
    const r = fightT([mk('S1'), mk('S2')], [u('S1', 0, 0), u('S2', 0, 1)], [u('S1', 0, 0), u('S2', 0, 1)], { tribesOff: [false, true] });
    eq(r.events[0].tribes, [{ 'เหล็กกล้า': 2 }, {}], 'ขั้นที่เปิดแต่ละฝั่ง');
  }],
  // ---------- สกิลที่นำกลับมาจาก Lab เดิม ----------
  ['หลายสกิลต่อตัว: ทำงานครบทุกสกิล', () => {
    const A = mk('A', { atk: L3(1), skills: [{ when: 'set', do: 'burn', to: 'target', v: L3(3) }, { when: 'set', do: 'shock', to: 'target', v: L3(2) }] });
    const r = fight([A, dummy('B')], [u('A')], [u('B')]);
    eq([ev(r, 'burn', e => e.t === 1000)[0].amount, ev(r, 'shock', e => e.t === 1000)[0].amount], [3, 2], 'ไฟและช็อตชุดแรก');
  }],
  ['แช่แข็ง: เพิ่มคูลดาวน์ที่เหลือของเป้า · มึนงง: หยุดนับคูลดาวน์', () => {
    const F1 = mk('F', { atk: L3(0), skills: [{ when: 'matchStart', do: 'freeze', to: 'enemyFront', v: L3(500) }], cdMs: NEVER });
    const r = fight([F1, mk('E', { atk: L3(1) })], [u('F')], [u('E')]);
    eq(ev(r, 'set', e => e.who === uidOf(r, 1, 'E'))[0].t, 1500, 'ชุดแรกของศัตรูหลังโดนแช่แข็ง');
    const S1 = mk('S', { atk: L3(0), skills: [{ when: 'matchStart', do: 'stun', to: 'enemyFront', v: L3(700) }], cdMs: NEVER });
    const r2 = fight([S1, mk('E', { atk: L3(1) })], [u('S')], [u('E')]);
    eq(ev(r2, 'set', e => e.who === uidOf(r2, 1, 'E'))[0].t, 1700, 'ชุดแรกของศัตรูหลังมึนงง');
  }],
  ['ชุด 16: ตัวเอง down ตอนเริ่มแมตช์ (SF-5) · คูลดาวน์ช้าลง % ใส่ศัตรูหรือตัวเอง (WY-8)', () => {
    const K = mk('K', { atk: L3(0), cdMs: NEVER, skills: [{ when: 'matchStart', do: 'selfKo', to: 'self', v: L3(0) }, { when: 'matchStart', do: 'shock', to: 'allEnemies', v: L3(5) }] });
    const P = dummy('P', { skills: [{ when: 'allyDown', do: 'armor', to: 'self', v: L3(9) }] });
    const r = fight([K, P, dummy('E')], [u('K', 0, 0), u('P', 0, 1)], [u('E')]);
    eq(ev(r, 'down', e => e.who === uidOf(r, 0, 'K')).map(e => e.t), [0], 'K down ตอนเริ่ม');
    eq(ev(r, 'shock', e => e.t === 0).map(e => e.amount), [5], 'ช็อตศัตรูยังเกิด');
    eq(ev(r, 'armor', e => e.why === 'P').length, 1, 'เพื่อน down ทำงาน');
    eq(ev(r, 'proc', e => e.who === uidOf(r, 0, 'K') && e.when === 'matchStart').length, 2, 'ผลเริ่มแมตช์ทำครั้งเดียว');
    const S = mk('S', { atk: L3(0), cdMs: NEVER, skills: [{ when: 'matchStart', do: 'cdSlowPct', to: 'enemyFront', v: L3(50) }] });
    const r2 = fight([S, mk('E', { atk: L3(1) })], [u('S')], [u('E')]);
    eq(ev(r2, 'set', e => e.who === uidOf(r2, 1, 'E')).slice(0, 2).map(e => e.t), [1500, 3000], 'ศัตรูช้าลง 50% ทุกรอบ');
    const Z = mk('Z', { atk: L3(1), skills: [{ when: 'matchStart', do: 'cdSlowPct', to: 'self', v: L3(100) }] });
    const r3 = fight([Z, dummy('E')], [u('Z')], [u('E')]);
    eq(ev(r3, 'set', e => e.who === uidOf(r3, 0, 'Z'))[0].t, 2000, 'ใส่ตัวเองได้');
    eq(skillTargets('matchStart', 'cdSlowPct').includes('self') && skillTargets('matchStart', 'selfKo').join(), 'self', 'เป้าที่เลือกได้');
    eq(skillTargets('hit', 'selfKo').length, 0, 'down ตัวเองใช้ได้เฉพาะเริ่มแมตช์');
  }],
  ['HP ต่ำกว่าครึ่ง (ครั้งแรก) และ ตัวเองทำศัตรู down', () => {
    const L = dummy('L', { hp: L3(100), skills: [{ when: 'lowHp', do: 'armor', to: 'self', v: L3(30) }] });
    const r = fight([L, mk('E', { atk: L3(30) })], [u('L')], [u('E')]);
    eq(ev(r, 'armor', e => e.why === 'L').map(e => e.t), [2000], 'เกราะเมื่อ HP ต่ำกว่าครึ่งครั้งเดียว');
    const K = mk('K', { atk: L3(100), skills: [{ when: 'kill', do: 'atkUp', to: 'self', v: L3(7) }] });
    const r2 = fight([K, mk('X', { hp: L3(100), cdMs: NEVER }), dummy('Y')], [u('K')], [u('X', 0, 0), u('Y', 1, 0)]);
    eq(ev(r2, 'atkUp').map(e => [e.t, e.amount]).slice(0, 1), [[1000, 7]], 'พลังโจมตีหลังทำ X down');
    eq(ev(r2, 'atkUp').length, ev(r2, 'down', e => e.who !== uidOf(r2, 0, 'K')).length, 'ได้ครั้งละตัวที่ทำ down');
  }],
  ['เพื่อน down → เพื่อนที่เหลือได้ผล', () => {
    const W = dummy('W', { skills: [{ when: 'allyDown', do: 'armor', to: 'self', v: L3(25) }] });
    const r = fight([W, mk('V', { hp: L3(10), cdMs: NEVER }), mk('E', { atk: L3(50) })], [u('V', 0, 0), u('W', 1, 0)], [u('E')]);
    eq(ev(r, 'armor', e => e.why === 'W').map(e => e.amount), [25], 'เกราะเมื่อเพื่อน down');
  }],
  ['ค่าตาม %: เกราะ % HP · ฟื้น % HP · ดาเมจ % พลังโจมตี · พลังโจมตี %', () => {
    const A = mk('A', { tribe: 'ภูติ', hp: L3(200), atk: L3(40), skills: [
      { when: 'matchStart', do: 'armorPct', to: 'self', v: L3(10) },
      { when: 'matchStart', do: 'atkPct', to: 'self', v: L3(50) },
      { when: 'set', do: 'dmgPctAtk', to: 'target', v: L3(50) }] });
    const r = fight([A, dummy('B')], [u('A')], [u('B')]);
    eq(ev(r, 'armor', e => e.t === 0 && e.why === 'A')[0].amount, 20, 'เกราะ 10% ของ 200');
    eq(ev(r, 'atkUp')[0].amount, 20, 'พลังโจมตี +50% ของ 40');
    eq(ev(r, 'dmg', e => e.t === 1000).map(e => [e.why, e.amount]), [['hit', 60], ['skill', 30]], 'ฮิต 60 แล้วดาเมจสกิล 50% ของ 60');
  }],
  ['เพิ่มผลที่ได้รับ: เกราะ +% · ช็อต +% · มัลติฮิต · ไฟต่อฮิต · ไฟไม่ลดลง', () => {
    const A = mk('A', { atk: L3(1), skills: [
      { when: 'matchStart', do: 'multiUp', to: 'self', v: L3(1) },
      { when: 'matchStart', do: 'burnHitUp', to: 'self', v: L3(2) },
      { when: 'matchStart', do: 'burnNoDecay', to: 'self', v: L3(1) }] });
    const r = fight([A, dummy('B')], [u('A')], [u('B')]);
    eq(ev(r, 'set')[0].hits, 2, 'มัลติฮิต +1');
    eq(ev(r, 'burn', e => e.t === 1000).map(e => e.amount), [2, 2], 'ไฟต่อฮิต +2');
    eq(ev(r, 'dmg', e => e.why === 'burn' && e.t <= 5000 && e.to === uidOf(r, 1, 'B')).map(e => e.amount).slice(0, 3), [4, 8, 12], 'ไฟไม่ลดลงและสะสม');
    const G = dummy('G', { skills: [{ when: 'passive', do: 'armorAmp', to: 'self', v: L3(50) }, { when: 'matchStart', do: 'armor', to: 'self', v: L3(20) }] });
    const r2 = fight([G, mk('E', { cdMs: NEVER })], [u('G')], [u('E')]);
    eq(ev(r2, 'armor', e => e.why === 'G').map(e => e.amount), [30], 'เกราะ 20 +50%');
  }],
  ['สะท้อนดาเมจที่โดน % ใส่ผู้ตี', () => {
    const T = dummy('T', { skills: [{ when: 'hitTaken', do: 'reflect', to: 'attacker', v: L3(50) }] });
    const r = fight([T, mk('E', { atk: L3(40), hp: L3(1000) })], [u('T')], [u('E')]);
    eq(ev(r, 'dmg', e => e.why === 'reflect')[0].amount, 20, 'สะท้อน 50% ของ 40');
  }],
  ['โอกาส %: ผลเหมือนเดิมทุกครั้ง และใกล้เคียงโอกาสที่ตั้ง', () => {
    const A = mk('A', { atk: L3(1), skills: [{ when: 'hit', do: 'shock', to: 'target', v: L3(1), chance: 30 }] });
    const run = () => fight([A, dummy('B')], [u('A')], [u('B')]);
    const r1 = run(), r2 = run();
    eq(JSON.stringify(r1.events) === JSON.stringify(r2.events), true, 'ผลซ้ำได้');
    const hits = ev(r1, 'dmg', e => e.why === 'hit' && e.t < RULES.stormStartMs).length, procs = ev(r1, 'shock', e => e.t < RULES.stormStartMs).length;
    ok(procs > hits * 0.15 && procs < hits * 0.45, `ติดช็อต ${procs}/${hits} ฮิต ไม่ใกล้ 30%`);
  }],
  ['เป้าสุ่มและเป้าเผ่าเดียวกัน', () => {
    const A = mk('A', { atk: L3(0), cdMs: NEVER, skills: [{ when: 'matchStart', do: 'armor', to: 'tribeAllies', v: L3(9) }] });
    const r = fight([A, dummy('S'), dummy('W', { tribe: 'วายุ' }), dummy('E')], [u('A'), u('S', 1, 0), u('W', 1, 1)], [u('E')]);
    eq(ev(r, 'armor', e => e.why === 'A').map(e => e.to), [uidOf(r, 0, 'S')], 'เฉพาะเพื่อนเผ่าเดียวกัน');
    const R1 = mk('R', { atk: L3(0), cdMs: NEVER, skills: [{ when: 'matchStart', do: 'burn', to: 'enemyRandom', v: L3(5) }] });
    const r2 = fight([R1, dummy('X'), dummy('Y')], [u('R')], [u('X'), u('Y', 0, 1)]);
    eq(ev(r2, 'burn', e => e.t === 0).length, 1, 'สุ่ม 1 ตัว');
  }],
  ['สกิลร้านค้าเป้าใหม่: เพื่อนเผ่าเดียวกัน · แถวหลัง', () => {
    const chars = buildCharacterList();
    const Z = { ...makeCharMap(chars)['HL-1'], id: 'ZZ-9', skills: [{ when: 'sell', do: 'permHp', to: 'tribeAllies', v: [5, 5, 5] }, { when: 'sell', do: 'permAtk', to: 'backRowAllies', v: [2, 2, 2] }] };
    const all = [...chars, Z], st = newRun(all, 3);
    st.board[0][0] = { uid: 1, id: 'HL-2', level: 1, perm: {}, paid: 3 };
    st.board[2][1] = { uid: 2, id: 'PT-1', level: 1, perm: {}, paid: 3 };
    st.board[1][0] = { uid: 3, id: 'ZZ-9', level: 1, perm: {}, paid: 3 };
    sell(st, { at: 'board', row: 1, lane: 0 }, all);
    eq([st.board[0][0].perm.hp, st.board[2][1].perm.hp, st.board[2][1].perm.atk], [5, undefined, 2], 'ค่าถาวรที่ได้');
  }],
  ['ทุกคู่สกิลที่หน้าบาลานซ์ให้เลือก ใช้งานได้จริงในตัวคำนวณ', () => {
    const chars = buildCharacterList(), m0 = makeCharMap(chars), rng = makeRng(5);
    let n = 0;
    for (const [when, dos] of Object.entries(SKILL_SPEC)) for (const [d, tos] of Object.entries(dos)) for (const to of tos) {
      const skill = { when, do: d, to, v: [20, 40, 80], cd: 2000, chance: 60, ...(d === 'summon' ? { summon: 'HL-1' } : {}), ...(to === 'allyAt' ? { at: { row: ['front', 'mid', 'back', 'any'][n % 4], lane: ['same', 'other', 'both'][n % 3] } } : {}), ...(n % 2 && sameTribeOk({ do: d, to }) ? { sameTribe: true } : {}), ...(DO_INFO[d] && DO_INFO[d].of ? { of: { stat: ['atk', 'armor', 'maxHp', 'hpLost', 'burn'][n % 5], who: CTX_WHEN[when] && n % 2 ? 'ctx' : ['self', 'each', 'allEnemies', 'allAllies'][n % 4] } } : {}) };
      const c = { ...m0['PT-1'], id: 'ZZ-1', skills: [skill] };
      ok(validateConfig([...chars, c]).ok, `${when}/${d}/${to} ไม่ผ่านตัวตรวจค่า`);
      const m = makeCharMap([...chars, c]);
      for (let i = 0; i < 3; i++) {
        const A = randomTeam(rng, chars, 5, 'mix'); A.push(u('ZZ-1', ...[[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]].find(([r, l]) => !A.some(e => e.row === r && e.lane === l)), 1 + i));
        const r = simulate(buildTeam(A, m), buildTeam(randomTeam(rng, chars, 6, 'mix'), m));
        ok(r.timeMs < RULES.hardStopMs, `${when}/${d}/${to} แมตช์ไม่จบ`);
      }
      n++;
    }
    ok(n > 30, `ทดสอบได้แค่ ${n} คู่`);
  }],
  // ---------- ร้านค้าและรวมร่าง ----------
  ['ร้าน: เงินเริ่ม 10 · รอบถัดไป +10 · ชนะได้โบนัส +2 · เงินค้างข้ามรอบ', () => {
    const chars = buildCharacterList(), st = newRun(chars, 1), S = RULES.shop;
    startRound(st, chars); eq(st.gold, S.startGold, 'รอบแรก');
    st.gold = 3; endMatch(st, true, chars); startRound(st, chars); eq(st.gold, 3 + S.goldPerRound + S.winBonus, 'หลังชนะ');
    endMatch(st, false, chars); startRound(st, chars); eq(st.gold, 3 + S.goldPerRound * 2 + S.winBonus, 'หลังแพ้');
  }],
  ['ร้าน: ความหายากปลดล็อกตามจำนวนชนะ', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars);
    const U = RULES.shop.unlockWins, open = w => Object.keys(U).filter(r => w >= U[r]);
    for (const wins of [0, 1, 3, 5, 6, 9]) {
      const allowed = open(wins);
      const st = newRun(chars, 9 + wins); st.wins = wins; const seen = new Set();
      for (let i = 0; i < 80; i++) { startRound(st, chars); st.shop.forEach(x => seen.add(cm[x.id].rarity)); }
      eq([...seen].sort(), [...allowed].sort(), `ชนะ ${wins}`);
    }
  }],
  ['ร้าน: ความหายากที่ไม่มีตัวละคร ไม่ทำให้ร้านพัง', () => {
    const chars = buildCharacterList().filter(c => c.rarity !== 'ไม่ธรรมดา'), st = newRun(chars, 77); st.wins = 9;
    for (let i = 0; i < 30; i++) { ok(startRound(st, chars).ok, 'เริ่มรอบไม่ได้'); ok(st.shop.every(x => x.id), 'มีช่องร้านว่าง'); }
  }],
  ['ร้าน: ซื้อหักเงิน · ขายคืนเต็มราคา · ม้านั่งเต็มซื้อไม่ได้', () => {
    const chars = buildCharacterList(), st = newRun(chars, 2);
    startRound(st, chars); st.gold = 100;
    const id = st.shop[0].id, price = makeCharMap(chars)[id].price;
    ok(buy(st, 0, null, chars).ok, 'ซื้อไม่ได้'); eq([st.gold, st.bench[0].id], [100 - price, id], 'หลังซื้อ');
    eq(st.shop[0].id, null, 'ของที่ซื้อหายจากร้าน');
    ok(sell(st, { at: 'bench', i: 0 }, chars).ok, 'ขายไม่ได้'); eq(st.gold, 100, 'ขายคืนเต็ม');
    st.bench = st.bench.map((_, i) => ({ uid: 900 + i, id: 'PT-1', level: 1, perm: {}, paid: 3 }));
    st.shop[1].id = 'HL-1';
    ok(!buy(st, 1, null, chars).ok, 'ม้านั่งเต็มต้องซื้อไม่ได้');
    ok(buy(st, 1, { at: 'board', row: 0, lane: 0 }, chars).ok, 'ซื้อลงช่องบอร์ดว่างได้');
    st.gold = 0; st.shop[2].id = 'HL-1'; ok(!buy(st, 2, { at: 'board', row: 0, lane: 1 }, chars).ok, 'เงินไม่พอต้องซื้อไม่ได้');
  }],
  ['ร้าน: รีโรลหักเงิน · ช่องที่ล็อกไม่เปลี่ยน ทั้งรีโรลและรอบใหม่', () => {
    const chars = buildCharacterList(), st = newRun(chars, 3);
    startRound(st, chars); st.gold = 10;
    const keep = st.shop[2].id; toggleLock(st, 2);
    ok(reroll(st, chars).ok, 'รีโรลไม่ได้'); eq([st.gold, st.shop[2].id, st.shop[2].locked], [9, keep, true], 'หลังรีโรล');
    endMatch(st, true, chars); startRound(st, chars); eq(st.shop[2].id, keep, 'รอบใหม่');
    st.gold = 0; ok(!reroll(st, chars).ok, 'เงินไม่พอต้องรีโรลไม่ได้');
  }],
  ['รวมร่าง: 3 ตัวเลเวลเท่ากัน → เลเวลถัดไป ข้ามบอร์ด/ม้านั่งได้ · 1+1+2 ไม่ได้', () => {
    const chars = buildCharacterList(), st = newRun(chars, 4);
    const U = (uid, level, paid, perm = {}) => ({ uid, id: 'HL-1', level, perm, paid });
    st.board[0][0] = U(1, 1, 3, { atk: 2 }); st.bench[0] = U(2, 1, 3, { atk: 1 }); st.bench[1] = U(3, 1, 3);
    const r = move(st, { at: 'bench', i: 0 }, { at: 'board', row: 0, lane: 0 }, chars);
    ok(r.ok && r.merged === 2, 'ควรรวมได้');
    eq([st.board[0][0].level, st.board[0][0].paid, st.board[0][0].perm.atk, allUnits(st).length], [2, 9, 3, 1], 'ผลรวมร่าง');
    st.bench[0] = U(4, 1, 3); st.bench[1] = U(5, 1, 3);
    const r2 = move(st, { at: 'bench', i: 0 }, { at: 'board', row: 0, lane: 0 }, chars);
    eq([r2.merged, st.board[0][0].level], [undefined, 1], '1+1+2 ไม่รวม (สลับที่แทน)');
  }],
  ['รวมร่าง: ค่าถาวรรวมกัน (ไม่เกินเพดานถ้ามี · ชุด 27 ไม่มีเพดาน) · เลเวล 3 รวมต่อไม่ได้', () => {
    const chars = buildCharacterList(), st = newRun(chars, 5);
    const U = (uid, level) => ({ uid, id: 'WY-1', level, perm: { multi: 1, armor: 60 }, paid: 3 });
    st.bench[0] = U(1, 1); st.bench[1] = U(2, 1); st.bench[2] = U(3, 1);
    move(st, { at: 'bench', i: 0 }, { at: 'bench', i: 1 }, chars);
    const capped = (k, sum) => RULES.permCaps[k] == null ? sum : Math.min(RULES.permCaps[k], sum); // ชุด 27: ไม่ผูกกับเพดานที่ตั้ง
    eq([st.bench[1].perm.multi, st.bench[1].perm.armor], [capped('multi', 3), capped('armor', 180)], 'ค่าถาวรรวมกัน');
    st.bench = [U(7, 3), U(8, 3), U(9, 3), null, null, null];
    eq(move(st, { at: 'bench', i: 0 }, { at: 'bench', i: 1 }, chars).merged, undefined, 'เลเวล 3 ไม่รวม');
  }],
  ['ชุด 27: ค่าถาวรไม่มีเพดาน · มัลติฮิต/ไฟ/เกราะเริ่มสะสมเกินเพดานเดิม · คูลดาวน์ถาวรเกิน 100% ติดขั้นต่ำระบบ', () => {
    eq(Object.keys(RULES.permCaps).length, 0, 'ไม่มีเพดานค่าถาวร');
    const chars = buildCharacterList(), map = makeCharMap(chars);
    const u = { uid: 1, id: 'WY-1', level: 1, perm: {}, paid: 3 };
    for (let k = 0; k < 5; k++) { addPerm(u, 'multi', 1, RULES); addPerm(u, 'burn', 3, RULES); addPerm(u, 'armor', 100, RULES); addPerm(u, 'cdPct', 40, RULES); }
    eq([u.perm.multi, u.perm.burn, u.perm.armor, u.perm.cdPct], [5, 15, 500, 200], 'สะสมเกินเพดานเดิม');
    const [f] = buildTeam([{ id: 'WY-1', level: 1, row: 0, lane: 0, perm: u.perm }], map, RULES);
    const c = map['WY-1'];
    eq([f.multi, f.burnHit, f.startArmor, f.cdMs], [c.multi[0] + 5, c.burn[0] + 15, 500, 0], 'ค่าในแมตช์');
    const r = simulate([f], buildTeam([{ id: 'HL-6', level: 3, row: 0, lane: 0 }], map, RULES), { rules: { ...RULES, hardStopMs: 3000 }, log: true });
    const sets = r.events.filter(e => e.k === 'set' && e.who === 0).map(e => e.t);
    ok(sets.length >= 2 && sets.slice(1).every((t, i) => t - sets[i] >= RULES.minCooldownMs), 'ชุดห่างกันไม่ต่ำกว่าคูลดาวน์ขั้นต่ำ ' + JSON.stringify(sets.slice(0, 5)));
  }],
  ['สกิลร้านค้า: ขาย (ตัวทดสอบ WN-5) → เพื่อนบนบอร์ดได้พลังโจมตี · ตัวบนม้านั่งไม่ได้', () => {
    // ชุด 19: ตรึงสกิลขายของตัวทดสอบไว้ที่ 1/2/4 ไม่ผูกกับค่าที่ผู้ใช้ปรับ (WN-5 ในเกมเปลี่ยนสกิลแล้ว)
    const base = buildCharacterList(), w5 = base.find(c => c.id === 'WN-5');
    const chars = [...base.filter(c => c.id !== 'WN-5'), { ...w5, skills: [{ when: 'sell', do: 'permAtk', to: 'allAllies', v: [1, 2, 4] }] }], st = newRun(chars, 6);
    st.board[0][0] = { uid: 1, id: 'HL-1', level: 1, perm: {}, paid: 3 };
    st.board[1][0] = { uid: 2, id: 'WN-5', level: 2, perm: {}, paid: 15 };
    st.bench[0] = { uid: 3, id: 'PT-1', level: 1, perm: {}, paid: 3 };
    sell(st, { at: 'board', row: 1, lane: 0 }, chars);
    eq([st.board[0][0].perm.atk, st.bench[0].perm.atk], [2, undefined], 'พลังโจมตีถาวร');
  }],
  ['สกิลร้านค้า: รวมร่าง (ตัวทดสอบ) → เพื่อนหน้า/หลังเลนเดียวกันได้ช็อต · จบแมตช์ HL-4 · ชนะ PL-2', () => {
    const base = buildCharacterList(), s2 = base.find(c => c.id === 'SF-2');
    const p2 = base.find(c => c.id === 'PL-2'), h4 = base.find(c => c.id === 'HL-4'); // ตัวทดสอบตรึงสกิล PL-2 ไว้ที่ 1/3/6 และ HL-4 ไว้ที่ 20/40/80 ไม่ให้ผลตรวจเปลี่ยนตามค่าที่ผู้ใช้ปรับ (23 ต.ค.)
    const chars = [...base.filter(c => !['SF-2', 'PL-2', 'HL-4'].includes(c.id)), { ...s2, skills: [{ when: 'merge', do: 'permShock', to: 'frontBackAlly', v: [1, 1, 2] }] }, { ...p2, skills: [{ when: 'matchWin', do: 'permBurn', to: 'allAllies', v: [1, 3, 6] }] }, { ...h4, skills: [{ when: 'matchEnd', do: 'permArmor', to: 'frontAlly', v: [20, 40, 80] }] }];
    const st = newRun(chars, 7);
    const U = (uid, id, level = 1) => ({ uid, id, level, perm: {}, paid: 3 });
    st.board[0][0] = U(1, 'HL-1'); st.board[1][0] = U(2, 'SF-2'); st.board[2][0] = U(3, 'PT-1'); st.board[2][1] = U(4, 'PT-1');
    st.bench[0] = U(5, 'SF-2'); st.bench[1] = U(6, 'SF-2');
    move(st, { at: 'bench', i: 0 }, { at: 'board', row: 1, lane: 0 }, chars);
    eq([st.board[0][0].perm.shock, st.board[2][0].perm.shock, st.board[2][1].perm.shock], [1, 1, undefined], 'ช็อตหลังรวมร่าง');
    st.board[2][0] = U(7, 'HL-4');
    st.board[0][1] = U(8, 'PL-2');
    endMatch(st, false, chars);
    eq([st.board[1][0].perm.armor, st.board[0][0].perm.burn], [20, undefined], 'แพ้: HL-4 ทำงาน PL-2 ไม่ทำงาน');
    endMatch(st, true, chars);
    eq([st.board[1][0].perm.armor, st.board[0][0].perm.burn, st.board[0][1].perm.burn], [40, 1, 1], 'ชนะ: ทั้งคู่ทำงาน');
  }],
  ['run: หัวใจหมดหรือชนะครบแล้วจบ', () => {
    const chars = buildCharacterList(), st = newRun(chars, 8);
    for (let i = 0; i < RULES.shop.hearts; i++) endMatch(st, false, chars);
    ok(st.over && !startRound(st, chars).ok, 'ควรจบเมื่อหัวใจหมด');
    const w = newRun(chars, 8); for (let i = 0; i < RULES.shop.winsToFinish; i++) endMatch(w, true, chars);
    ok(w.over, 'ควรจบเมื่อชนะครบ');
  }],
  ['คำสั่งร้านค้ากันข้อมูลแปลกปลอม', () => {
    const chars = buildCharacterList(), st = newRun(chars, 10); startRound(st, chars);
    const before = JSON.stringify(st);
    for (const bad of [null, {}, { at: 'board', row: 9, lane: 0 }, { at: 'bench', i: -1 }, { at: 'bench', i: 1.5 }, { at: '__proto__' }, 'x'])
      { ok(!sell(st, bad, chars).ok, 'ขายต้องไม่ผ่าน'); ok(!move(st, bad, { at: 'bench', i: 0 }, chars).ok, 'ย้ายต้องไม่ผ่าน'); }
    for (const bad of [-1, 99, 'a', null, 1.2]) { ok(!buy(st, bad, null, chars).ok, 'ซื้อต้องไม่ผ่าน'); ok(!toggleLock(st, bad).ok, 'ล็อกต้องไม่ผ่าน'); }
    eq(JSON.stringify(st), before, 'สถานะต้องไม่เปลี่ยน');
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
  ['ตัวตรวจค่า: จับเงื่อนไขกับผลที่ใช้คู่กันไม่ได้', () => {
    const r = validateConfig([mk('AA-1', { skills: [{ when: 'hitTaken', do: 'revive', to: 'self', v: L3(1) }] })]);
    ok(r.errors.some(e => e.includes('ใช้คู่กับผล')), 'ไม่เตือน');
  }],
  ['ตัวตรวจค่า: จับ ID ซ้ำ และสกิลฟื้น HP นอกเผ่าภูติ', () => {
    const r = validateConfig([mk('AA-1'), mk('AA-1', { skills: [{ when: 'set', do: 'heal', to: 'frontAlly', v: L3(5) }] })]);
    ok(r.errors.some(e => e.includes('ID ซ้ำ')), 'ไม่เตือน ID ซ้ำ');
    ok(r.errors.some(e => e.includes('ฟื้น HP')), 'ไม่เตือนสกิลฟื้น HP');
  }],
  ['ตัวตรวจค่า: config จริงผ่าน (48 ตัว 5 ความหายาก) และทุกเผ่ามีอย่างน้อย 6 ตัว', () => {
    const r = validateConfig(buildCharacterList());
    ok(r.ok, r.errors.join(' · '));
    eq(buildCharacterList().length, 48, 'จำนวนตัวละคร');
    const bad = buildCharacterList(); bad[0] = { ...bad[0], price: 99 };
    ok(validateConfig(bad).errors.some(e => e.includes('ราคา')), 'ไม่เตือนราคาไม่ตรงความหายาก');
    ok(!validateConfig(buildCharacterList(), { ...RULES, shop: { ...RULES.shop, weights: { 'ธรรมดา': 1 } } }).ok, 'ไม่เตือนโอกาสสุ่มที่ขาด');
    for (const bad of [{ name: '' }, { name: 'ก'.repeat(31) }, { name: '<b>x</b>' }, { name: 'a\nb' }, { rowHint: 'บน' }, { extraTribes: ['วายุ', 'ภูติ'] }]) {
      const cs = buildCharacterList(); cs[0] = { ...cs[0], ...bad };
      ok(!validateConfig(cs).ok, `ไม่เตือนค่าผิด ${JSON.stringify(bad)}`);
    }
    ok(!validateConfig(buildCharacterList().slice(0, 10)).ok, 'config 10 ตัวไม่ควรผ่าน');
  }],
  ['แท็กสกิล: แท็กหลักครบทุกเงื่อนไข · แท็กเพิ่มถูกทำความสะอาด · ตัวตรวจค่าจับแท็กผิด', () => {
    for (const w of Object.keys(SKILL_SPEC)) ok(SKILL_KINDS.includes(WHEN_KIND[w]), `เงื่อนไข ${w} ไม่มีแท็กหลัก`);
    eq(WHEN_KIND.enemyDown, 'ต่อเนื่อง', 'ศัตรู down (แบบ PL-6) = ต่อเนื่อง');
    eq(cleanTags([' คอมโบไฟ ', 'คอมโบไฟ', '<b>', 'ต่อเนื่อง', 'ก'.repeat(20), 'x', 'y', 5]), ['คอมโบไฟ', 'b', 'ก'.repeat(12)], 'ทำความสะอาด');
    const good = buildCharacterList(); good[0] = { ...good[0], skills: [{ when: 'set', do: 'burn', to: 'target', v: L3(1), tags: ['คอมโบไฟ'] }] };
    ok(validateConfig(good).ok, 'แท็กถูกต้องต้องผ่าน');
    for (const tags of [['a', 'b', 'c', 'd'], ['<x>'], ['a', 'a'], 'abc', [1]]) {
      const cs = buildCharacterList(); cs[0] = { ...cs[0], skills: [{ when: 'set', do: 'burn', to: 'target', v: L3(1), tags }] };
      ok(!validateConfig(cs).ok, `ไม่เตือนแท็กผิด ${JSON.stringify(tags)}`);
    }
  }],
  ['ตัวตรวจทีม: กันข้อมูลแปลกปลอมและค่าถาวรสูงผิดปกติ (ชุด 27 ไม่มีเพดาน)', () => {
    const m = makeCharMap(buildCharacterList());
    const bad = [
      [u('HL-1', 0, 0, 1, { multi: 1e9 })],
      [u('HL-1', 0, 0, 9)],
      [{ id: 'HL-1', level: NaN, row: 0, lane: 0 }],
      [u('HL-1', 0, 0), u('PL-1', 0, 0)],
      Array.from({ length: 7 }, (_, i) => u('HL-1', i % 3, i % 2)),
      [JSON.parse('{"id":"HL-1","level":1,"row":0,"lane":0,"hack":1}')],
      [JSON.parse('{"id":"__proto__","level":1,"row":0,"lane":0}')],
      [u('HL-1', 0, 0, 1, { cdPct: 1e9 })],
      [u('HL-1', 0, 0, 1, { atk: -5 })],
      [u('HL-1', 0, 0, 1, { armor: 1e9 })],
      'ไม่ใช่ทีม',
    ];
    bad.forEach((t, i) => ok(!validateTeam(t, m).ok, `กรณีที่ ${i + 1} ผ่านทั้งที่ผิด`));
    ok(validateTeam([u('HL-1', 0, 0, 3, { multi: 1, burn: 3, atk: 50 })], m).ok, 'ทีมถูกกฎแต่ไม่ผ่าน');
    ok(validateTeam([u('HL-1', 0, 0, 3, { multi: 6, burn: 40, cdPct: 120, armor: 600 })], m).ok, 'ชุด 27: ค่าถาวรเกินเพดานเดิมผ่าน (ไม่มีเพดาน)');
  }],
  ['นับเผ่า: ตัวซ้ำนับครั้งเดียว เผ่าเพิ่มนับด้วย', () => {
    const c = countTribes([u('X'), u('X', 1, 0), u('Y', 2, 0)], makeCharMap([mk('X', { tribe: 'เหล็กกล้า', extraTribes: ['เพลิงเผา'] }), mk('Y', { tribe: 'เพลิงเผา' })])); // ชุด 16: ตัวทดสอบเอง ไม่ผูกกับค่าตัวละครจริง
    eq([c['เหล็กกล้า'], c['เพลิงเผา']], [1, 2], 'เหล็กกล้า, เพลิงเผา');
  }],
  ['บันทึกเหตุการณ์เล่นซ้ำได้ HP ตรงกับผลจริง (หน้าจอใช้ข้อนี้)', () => {
    const chars = buildCharacterList(), m = makeCharMap(chars), rng = makeRng(23);
    for (let i = 0; i < 200; i++) {
      const r = simulate(buildTeam(randomTeam(rng, chars, 6, 'mix'), m), buildTeam(randomTeam(rng, chars, 6, 'mix'), m));
      ok(r.events[0].k === 'start', 'เหตุการณ์แรกต้องเป็น start');
      const hp = {}, armor = {};
      for (const u of r.events[0].units) { hp[u.uid] = u.hp; armor[u.uid] = u.armor; }
      for (const e of r.events) {
        if (e.k === 'dmg') { hp[e.to] -= e.amount - e.absorbed; armor[e.to] -= e.absorbed; ok(armor[e.to] >= 0, `แมตช์ ${i}: เกราะติดลบ`); }
        if (e.k === 'armor') armor[e.to] += e.amount;
        if (e.k === 'heal') hp[e.to] += e.amount;
        if (e.k === 'down') { hp[e.who] = 0; armor[e.who] = 0; }
        if (e.k === 'revive') { hp[e.who] = e.hp; armor[e.who] = 0; }
        if (e.k === 'summon') { hp[e.who] = e.unit.hp; armor[e.who] = e.unit.armor; }
        if (e.k === 'maxhp') hp[e.to] = Math.min(hp[e.to], e.hp);
        if (e.k === 'buff' && e.what === 'hpUp') hp[e.to] += e.amount;
      }
      for (const u of r.units) ok(Math.max(0, hp[u.uid]) === u.hp, `แมตช์ ${i}: HP ของ ${u.id} ไม่ตรง`);
    }
  }],
  ['ตัวละครจริงทุกคู่สู้กันจบได้ไม่ error (ทุกคู่ × 3 เลเวล)', () => {
    const chars = buildCharacterList(), m = makeCharMap(chars);
    for (const lv of [1, 2, 3]) for (const a of chars) for (const b of chars) {
      const r = simulate(buildTeam([u(a.id, 0, 0, lv)], m), buildTeam([u(b.id, 0, 0, lv)], m), { log: false });
      ok(r.timeMs < RULES.hardStopMs, `${a.id} vs ${b.id} ไม่จบ`);
    }
  }],
  ['เกราะ/ฮิต: ได้เกราะทุกฮิตที่ตีโดน หลังดาเมจ (ไม่กันฮิตใน tick เดียวกัน) · ตัวตรวจค่าจับค่าผิด', () => {
    const A = mk('A', { atk: L3(1), multi: 3, armorHit: [5, 5, 5] });
    const r = fight([A, mk('B', { atk: L3(7), hp: L3(1000) })], [u('A')], [u('B')]);
    eq(ev(r, 'armor', e => e.why === 'armorHit' && e.t === 1000).map(e => e.amount), [5, 5, 5], 'tick แรก 3 ฮิต');
    eq(ev(r, 'dmg', e => e.why === 'hit' && e.t === 1000 && e.to === uidOf(r, 0, 'A')).map(e => e.absorbed), [0], 'ฮิตของ B ใน tick เดียวกัน');
    eq(ev(r, 'dmg', e => e.why === 'hit' && e.t === 2000 && e.to === uidOf(r, 0, 'A')).map(e => e.absorbed), [7], 'tick ถัดไปเกราะกัน');
    ok(validateConfig([mk('AA-1', { armorHit: [1, -1, 2] })]).errors.some(e => e.includes('เกราะ/ฮิต')), 'ไม่จับค่าติดลบ');
  }],
  ['ผลตอน down ทำงานทุกครั้งที่ HP ถึง 0 แม้ถูกชุบ (V1.14): ตัวเอง down · เพื่อน down · ศัตรู down', () => {
    const W = dummy('W', { tribe: 'อสูร', skills: [{ when: 'allyDown', do: 'reviveAlly', to: 'self', v: [2, 2, 2] }] });
    const X = mk('X', { hp: L3(100), cdMs: NEVER, atk: L3(0), skills: [{ when: 'selfDown', do: 'armor', to: 'backAlly', v: L3(40) }] });
    const B = dummy('B', { skills: [{ when: 'allyDown', do: 'atkUp', to: 'self', v: L3(1) }] });
    const K = mk('K', { atk: L3(100), cdMs: 1000, skills: [{ when: 'enemyDown', do: 'atkUp', to: 'self', v: L3(1) }] });
    const r = fight([W, X, B, K], [u('X', 0, 0), u('B', 1, 0), u('W', 1, 1)], [u('K')]);
    const xu = uidOf(r, 0, 'X'), bu = uidOf(r, 0, 'B'), ku = uidOf(r, 1, 'K');
    eq(ev(r, 'revive', e => e.who === xu).length, 2, 'ถูกชุบ 2 ครั้ง');
    eq(ev(r, 'armor', e => e.to === bu && e.amount === 40).length, 3, 'X แจกเกราะทุกครั้งที่ HP ถึง 0 (2 ชุบ + down จริง)');
    eq(ev(r, 'atkUp', e => e.to === bu).length, 3, 'เพื่อน down ทำงาน 3 ครั้ง');
    ok(ev(r, 'atkUp', e => e.to === ku).length >= 3, 'ศัตรู down ทำงานทุกครั้ง');
  }],
  ['ดาเมจ % เกราะตัวเอง (HL-7) ใช้เกราะก่อนโดนฮิตใน tick เดียวกัน', () => {
    const H = mk('H', { armor: L3(50), atk: L3(0), hp: L3(1000), skills: [{ when: 'set', do: 'dmgPctArmor', to: 'enemyFront', v: L3(40) }] });
    const r = fight([H, mk('B', { atk: L3(100), hp: L3(1000) })], [u('H')], [u('B')]);
    eq(ev(r, 'dmg', e => e.why === 'skill' && e.t === 1000).map(e => e.amount), [20], 'เกราะ 50 × 40% แม้โดนฮิต 100 ใน tick เดียวกัน');
  }],
  ['ศัตรูแถวหลัง: เฉพาะแถวหลังจริง ไม่มีตัวแถวหลัง = ไม่มีเป้า (V1.19)', () => {
    const A = mk('A', { atk: L3(1), skills: [{ when: 'set', do: 'burn', to: 'enemyBackRow', v: L3(5) }] });
    let r = fight([A, dummy('F'), dummy('M')], [u('A')], [u('F', 0, 0), u('M', 1, 0)]);
    eq(ev(r, 'burn').length, 0, 'มีแค่แถวหน้า+กลาง ไม่ติดไฟ');
    r = fight([A, dummy('F'), dummy('K')], [u('A')], [u('F', 0, 0), u('K', 2, 1)]);
    eq(ev(r, 'burn').length, 0, 'ชุด 10: แถวหลังอยู่อีกเลน = ไม่มีผล (ไม่ย้ายเลน)');
    r = fight([A, dummy('F'), dummy('K')], [u('A')], [u('F', 0, 0), u('K', 2, 0)]);
    eq([...new Set(ev(r, 'burn').map(e => e.to))], [uidOf(r, 1, 'K')], 'แถวหลังเลนเดียวกันโดน');
  }],
  ['ศัตรูแถวหน้าทั้ง 2 เลน: ติดทั้งสองเลน ไม่มีตัวแถวหน้า = ไม่มีเป้า (V1.22)', () => {
    const A = mk('A', { atk: L3(1), skills: [{ when: 'set', do: 'burn', to: 'enemyFrontRow', v: L3(5) }] });
    let r = fight([A, dummy('F'), dummy('G'), dummy('M')], [u('A')], [u('F', 0, 0), u('G', 0, 1), u('M', 1, 0)]);
    eq([...new Set(ev(r, 'burn').map(e => e.to))].sort(), [uidOf(r, 1, 'F'), uidOf(r, 1, 'G')].sort(), 'ติดไฟแถวหน้าทั้ง 2 เลน ไม่โดนแถวกลาง');
  }],
  // ---------- กลไกใหม่ 21 ต.ค. (ตัวทดสอบตรึงค่าเอง ไม่ผูกกับค่าที่ผู้ใช้ปรับ) ----------
  ['เรียกตัวมาสู้แทน: down จริงแล้วตัวที่ระบุลงช่องเดิม เลเวลเดียวกัน · ถูกชุบ = ไม่เรียก · ตัวตรวจค่าจับ ID ผิด', () => {
    const S = mk('S', { hp: L3(10), cdMs: NEVER, atk: L3(0), skills: [{ when: 'selfDown', do: 'summon', to: 'self', v: L3(1), summon: 'M' }] });
    const M = mk('M', { hp: [50, 100, 200], atk: L3(3), cdMs: 1000 });
    const r = fight([S, M, mk('E', { atk: L3(20), hp: L3(10000) })], [u('S', 1, 0, 2)], [u('E')]);
    const sm = ev(r, 'summon');
    eq(sm.map(e => [e.t, e.unit.id, e.unit.level, e.unit.row, e.unit.lane, e.unit.hp]), [[1000, 'M', 2, 1, 0, 100]], 'เรียก M เลเวล 2 ช่องเดิม');
    ok(ev(r, 'set', e => e.who === sm[0].who).length > 0, 'ตัวที่ถูกเรียกได้ลงมือ');
    eq(r.units.length, 3, 'ผลจบแมตช์มีตัวที่ถูกเรียกด้วย');
    const W = dummy('W', { tribe: 'อสูร', skills: [{ when: 'allyDown', do: 'reviveAlly', to: 'self', v: L3(1) }] });
    const r2 = fight([S, M, W, mk('E', { atk: L3(20), hp: L3(10000) })], [u('S', 0, 0), u('W', 1, 1)], [u('E')]);
    eq(ev(r2, 'summon').length, 1, 'ถูกชุบครั้งแรกไม่เรียก · down จริงครั้งถัดไปเรียก 1 ครั้ง');
    ok(ev(r2, 'revive').length === 1 && ev(r2, 'summon')[0].t > ev(r2, 'revive')[0].t, 'เรียกหลังถูกชุบแล้ว down จริง');
    for (const bad of ['', 'ZZ-0', 'S']) ok(!validateConfig([{ ...S, id: 'AA-1', skills: [{ ...S.skills[0], summon: bad || undefined }] }, { ...M, id: 'S' }]).ok, `ไม่จับตัวที่เรียกผิด "${bad}"`);
    ok(!validateConfig([{ ...S, id: 'AA-1', skills: [{ ...S.skills[0], summon: 'AA-2' }] }, { ...S, id: 'AA-2', skills: [{ ...S.skills[0], summon: 'AA-1' }] }]).ok, 'ไม่จับเรียกต่อกัน');
    ok(!validateConfig([mk('AA-1', { skills: [{ when: 'set', do: 'burn', to: 'target', v: L3(1), summon: 'AA-1' }] })]).ok, 'ไม่จับช่องเรียกตัวในสกิลอื่น');
  }],
  ['ศัตรูทั้งเลนเดียวกัน: ติดทุกตัวในเลน ไม่โดนอีกเลน · เลนหมด = ไม่มีผล (ชุด 10)', () => {
    const A = mk('A', { atk: L3(1), skills: [{ when: 'set', do: 'burn', to: 'enemyLane', v: L3(5) }] });
    const r = fight([A, dummy('F'), dummy('M'), dummy('K')], [u('A', 0, 1)], [u('F', 0, 1), u('M', 2, 1), u('K', 0, 0)]);
    eq([...new Set(ev(r, 'burn', e => e.t <= 5000).map(e => e.to))].sort(), [uidOf(r, 1, 'F'), uidOf(r, 1, 'M')].sort(), 'เลน 2 ทั้งเลน');
    const r2 = fight([A, dummy('K')], [u('A', 0, 1)], [u('K', 1, 0)]);
    eq(ev(r2, 'burn').length, 0, 'เลนตัวเองว่าง → ไม่มีผล');
    const W = mk('W', { atk: L3(3), skills: [{ when: 'set', do: 'retarget', to: 'enemyMidRow', v: L3(1) }, { when: 'set', do: 'burn', to: 'enemyMidRow', v: L3(5) }] });
    const r3 = fight([W, dummy('K')], [u('W', 0, 1)], [u('K', 1, 0)]);
    ok(ev(r3, 'burn').length === 0 && ev(r3, 'dmg', e => e.to === uidOf(r3, 1, 'K')).length > 0, 'แถวกลางเลนเราว่าง: ติดไฟไม่มีผล · เปลี่ยนเป้าแล้วยังตีเป้าปกติ');
  }],
  // ---------- ชุด 12 (23 ต.ค.): ตัวทดสอบตรึงค่าเอง ไม่ผูกกับค่าที่ผู้ใช้ปรับ · skErr = ข้อผิดของสกิล (ไม่นับเรื่องจำนวนตัวต่อเผ่า) ----------
  ['เพื่อนข้างหลังเลนเดียวกัน: ตัวใกล้สุด ข้ามช่องว่าง · ไม่โดนอีกเลน · ไม่มี = ไม่มีผล (ชุด 12)', () => {
    const X = mk('X', { hp: L3(10), cdMs: NEVER, atk: L3(0), skills: [{ when: 'selfDown', do: 'armor', to: 'backLaneAlly', v: L3(40) }] });
    const E = mk('E', { atk: L3(50), hp: L3(10000) });
    const r = fight([X, dummy('B'), dummy('M'), dummy('O'), E], [u('X', 0, 0), u('M', 1, 0), u('B', 2, 0), u('O', 2, 1)], [u('E')]);
    eq(ev(r, 'armor', e => e.amount === 40).map(e => e.to), [uidOf(r, 0, 'M')], 'แถวกลางติดกัน = ได้ตัวเดียว');
    const r2 = fight([X, dummy('B'), dummy('O'), E], [u('X', 0, 0), u('B', 2, 0), u('O', 1, 1)], [u('E')]);
    eq(ev(r2, 'armor', e => e.amount === 40).map(e => e.to), [uidOf(r2, 0, 'B')], 'แถวกลางว่าง → ข้ามไปแถวหลังเลนเดียวกัน');
    const r3 = fight([X, dummy('O'), E], [u('X', 0, 0), u('O', 1, 1)], [u('E')]);
    eq(ev(r3, 'armor', e => e.amount === 40).length, 0, 'ข้างหลังเลนเดียวกันว่าง → ไม่มีผล');
    eq(skErr(mk('AA-1', { skills: [{ when: 'matchEnd', do: 'permArmor', to: 'backLaneAlly', v: L3(1) }] })), [], 'ใช้กับสกิลร้านค้าได้');
  }],
  ['สะท้อนดาเมจ % ของ: เกราะของตัวนี้ (ก่อนโดนฮิตใน tick นั้น) · ตัวตรวจค่าต้องมีช่อง "ของ" (ชุด 12)', () => {
    const T = mk('T', { armor: L3(50), atk: L3(0), cdMs: NEVER, hp: L3(10000), skills: [{ when: 'hitTaken', do: 'reflectOf', of: { stat: 'armor', who: 'self' }, to: 'attacker', v: L3(40) }] });
    const r = fight([T, mk('B', { atk: L3(100), hp: L3(10000) })], [u('T')], [u('B')]);
    eq(ev(r, 'dmg', e => e.why === 'reflect').map(e => e.amount), [20], 'ฮิตแรก เกราะ 50 × 40% = 20 · ฮิตต่อมาเกราะหมด = ไม่สะท้อน');
    ok(skErr(mk('AA-1', { skills: [{ when: 'hitTaken', do: 'reflectOf', to: 'attacker', v: L3(40) }] })).length > 0, 'ไม่มีช่องของ = ผิด');
    ok(skErr(mk('AA-1', { skills: [{ when: 'set', do: 'reflectOf', of: { stat: 'armor', who: 'self' }, to: 'target', v: L3(40) }] })).length > 0, 'ใช้ได้เฉพาะตอนโดนตี');
  }],
  ['ของใคร: ศัตรู/เพื่อน เลนเดียวกัน และแถวเดียวกัน รวมกัน (ชุด 12)', () => {
    const sk = who => [{ when: 'set', do: 'dmgOf', of: { stat: 'maxHp', who }, to: 'enemyFront', v: L3(100) }];
    const A = who => mk('A', { atk: L3(0), hp: L3(1000), skills: sk(who) });
    const foes = [mk('F', { hp: L3(100) }), mk('G', { hp: L3(400) }), mk('M', { hp: L3(200) })].map(c => ({ ...c, atk: L3(0), cdMs: L3(NEVER) }));
    const amt = who => { const r = fight([A(who), dummy('P', { hp: L3(30) }), dummy('Q', { hp: L3(70) }), ...foes], [u('A', 0, 0), u('P', 1, 0), u('Q', 0, 1)], [u('F', 0, 0), u('G', 0, 1), u('M', 1, 0)]); return ev(r, 'dmg', e => e.why === 'skill')[0].amount; };
    eq([amt('laneEnemies'), amt('rowEnemies'), amt('laneAllies'), amt('rowAllies')], [300, 500, 1030, 1070], 'เลนศัตรู F+M · แถวศัตรู F+G · เลนเพื่อน A+P · แถวเพื่อน A+Q');
    ok(skErr(mk('AA-1', { skills: sk('rowEnemies') })).length === 0 && skErr(mk('AA-1', { skills: sk('laneFoo') })).length > 0, 'ตัวตรวจค่ารู้จักตัวเลือกใหม่ · จับค่าแปลก');
  }],
  ['เพื่อนตามตำแหน่ง (แถว × เลน) และเฉพาะเผ่าเดียวกัน: ระหว่างสู้และร้านค้า (ชุด 14)', () => {
    const X = mk('X', { hp: L3(10), cdMs: NEVER, atk: L3(0), skills: [{ when: 'selfDown', do: 'armor', to: 'allyAt', at: { row: 'back', lane: 'other' }, v: L3(40) }] });
    const E = mk('E', { atk: L3(50), hp: L3(10000) });
    const r = fight([X, dummy('A'), dummy('B'), dummy('C'), E], [u('X', 0, 0), u('A', 2, 0), u('B', 2, 1), u('C', 1, 1)], [u('E')]);
    eq(ev(r, 'armor', e => e.amount === 40).map(e => e.to), [uidOf(r, 0, 'B')], 'แถวหลัง อีกเลน = B ตัวเดียว');
    const Y = { ...X, id: 'Y', skills: [{ ...X.skills[0], to: 'allyAt', at: { row: 'any', lane: 'both' }, sameTribe: true }] };
    const F = dummy('F', { tribe: 'เพลิงเผา' }), G = dummy('G', { tribe: 'วายุ', extraTribes: ['เหล็กกล้า'] });
    const r2 = fight([Y, dummy('A'), F, G, E], [u('Y', 0, 0), u('A', 1, 0), u('F', 2, 0), u('G', 1, 1)], [u('E')]);
    eq(ev(r2, 'armor', e => e.amount === 40).map(e => e.to).sort(), [uidOf(r2, 0, 'A'), uidOf(r2, 0, 'G')].sort(), 'เผ่าเดียวกัน (รวมเผ่าเพิ่ม) · F อีกเผ่าไม่ได้');
    const Z = { ...X, id: 'AA-1', skills: [{ when: 'selfDown', do: 'armor', to: 'allyLowest', v: L3(40), sameTribe: true }] };
    ok(skErr(Z).length === 0, 'กรองเผ่าใช้กับเพื่อน HP ต่ำสุดได้');
    ok(skErr({ ...X, id: 'AA-1', skills: [{ ...X.skills[0], at: undefined }] }).length > 0, 'ไม่เลือกตำแหน่ง = ผิด');
    ok(skErr({ ...X, id: 'AA-1', skills: [{ ...X.skills[0], at: { row: 'back', lane: 'x' } }] }).length > 0, 'เลนแปลก = ผิด');
    ok(skErr({ ...X, id: 'AA-1', skills: [{ when: 'selfDown', do: 'armor', to: 'self', v: L3(1), sameTribe: true }] }).length > 0, 'ตัวเอง + เผ่าเดียวกัน = ผิด');
    ok(skErr({ ...X, id: 'AA-1', skills: [{ when: 'selfDown', do: 'armor', to: 'frontAlly', v: L3(1), at: { row: 'back', lane: 'same' } }] }).length > 0, 'ช่องตำแหน่งกับผู้รับอื่น = ผิด');
    // ร้านค้า: จบแมตช์ → เกราะสะสมให้แถวกลางทั้ง 2 เลน เฉพาะเผ่าเดียวกัน
    const base = buildCharacterList(), h4 = base.find(c => c.id === 'HL-4');
    const chars = [...base.filter(c => c.id !== 'HL-4'), { ...h4, skills: [{ when: 'matchEnd', do: 'permArmor', to: 'allyAt', at: { row: 'mid', lane: 'both' }, sameTribe: true, v: [5, 10, 20] }] }];
    const st = newRun(chars, 3), U = (uid, id) => ({ uid, id, level: 1, perm: {}, paid: 3 });
    st.board[0][0] = U(1, 'HL-4'); st.board[1][0] = U(2, 'HL-1'); st.board[1][1] = U(3, 'PL-1'); st.board[2][0] = U(4, 'HL-2');
    endMatch(st, false, chars);
    eq([st.board[1][0].perm.armor, st.board[1][1].perm.armor, st.board[2][0].perm.armor], [5, undefined, undefined], 'ร้านค้า: แถวกลาง เผ่าเหล็กกล้าเท่านั้น');
  }],
  ['ตีแบ่งทุกตัว: ทุกตัวโดนพร้อมกัน ค่าของผู้ตีหารเท่ากันปัดลง · ชุด 34 ช็อตบนเป้าแตกเต็มค่า', () => {
    const A = mk('A', { atk: L3(31), burn: L3(7), skills: [{ when: 'set', do: 'splitAll', to: 'allEnemies', v: L3(1) }] });
    const r = fight([A, dummy('X'), dummy('Y'), dummy('Z')], [u('A')], [u('X'), u('Y', 0, 1), u('Z', 1, 0)]);
    eq(ev(r, 'dmg', e => e.why === 'hit' && e.t === 1000).map(e => e.amount), [10, 10, 10], 'ดาเมจ 31 ÷ 3');
    eq(ev(r, 'burn', e => e.t === 1000).map(e => e.amount), [2, 2, 2], 'ไฟ 7 ÷ 3');
    const B = mk('B', { atk: L3(4), skills: [{ when: 'set', do: 'splitAll', to: 'allEnemies', v: L3(1) }, { when: 'matchStart', do: 'shock', to: 'allEnemies', v: L3(9) }] });
    const r2 = fight([B, dummy('X'), dummy('Y')], [u('B')], [u('X'), u('Y', 0, 1)]);
    eq(ev(r2, 'dmg', e => e.why === 'shock' && e.t === 1000).map(e => e.amount), [9, 9], 'ช็อต 9 บนเป้า แตกเต็มค่า (ชุด 34)');
  }],
  ['ดูดช็อต: ช็อตบนเป้าลด % ที่ดูด ตัวเองได้ช็อตต่อฮิตเท่านั้น', () => {
    const A = mk('A', { atk: L3(1), skills: [{ when: 'matchStart', do: 'shock', to: 'enemyFront', v: L3(20) }, { when: 'set', do: 'stealShock', to: 'target', v: L3(25) }] });
    const r = fight([A, dummy('B')], [u('A')], [u('B')]);
    eq(ev(r, 'steal').slice(0, 1).map(e => [e.t, e.amount, e.total]), [[1000, 5, 15]], 'ดูด 25% ของ 20');
    eq(ev(r, 'shock', e => e.t === 2000).map(e => e.amount), [5], 'ชุดถัดไปติดช็อต +5 จากที่ดูดมา');
  }],
  ['ประจุซื้อ (SF-7): ตัวเผ่าเดียวกันตัวถัดไปที่ซื้อได้ค่าถาวรตามเลเวลเจ้าของ · เก็บได้ทีละ 1 · ขายหมด = ประจุหาย · ช็อตถาวรไม่มีเพดาน', () => {
    const base = buildCharacterList(), t0 = base.find(c => c.tribe === 'สายฟ้า');
    const Q = { ...t0, id: 'QQ-1', skills: [{ when: 'buy', do: 'permShock', to: 'nextTribeBuy', v: [1, 2, 9] }] };
    const other = base.find(c => c.tribe === 'สายฟ้า' && c.id !== t0.id), stranger = base.find(c => c.tribe === 'เหล็กกล้า' && !c.extraTribes.includes('สายฟ้า'));
    const chars = [...base, Q], st = newRun(chars, 12); startRound(st, chars); st.gold = 100;
    const buyId = id => { st.shop[0].id = id; return buy(st, 0, null, chars); };
    buyId('QQ-1'); buyId('QQ-1');
    eq(st.charges.length, 1, 'ซื้อ 2 ใบ เก็บประจุ 1 อัน');
    buyId(stranger.id); eq(st.charges.length, 1, 'ต่างเผ่า ไม่ใช้ประจุ');
    st.bench[0].level = 3; st.bench[1] = null; // จำลองว่าเจ้าของรวมร่างเป็น Lv3
    buyId(other.id);
    eq([allUnits(st).find(x => x.u.id === other.id).u.perm.shock, st.charges.length], [9, 0], 'ได้ช็อตถาวร 9 (เกินเพดานเดิม 3) แล้วประจุหมด');
    buyId('QQ-1'); eq(st.charges.length, 1, 'ซื้อใหม่ได้ประจุใหม่');
    for (const x of allUnits(st).filter(y => y.u.id === 'QQ-1')) sell(st, x.ref, chars);
    eq(st.charges.length, 0, 'ขายหมด ประจุหาย');
    ok(validateTeam([u('SF-1', 0, 0, 1, { shock: 12 })], makeCharMap(base)).ok, 'ทีมที่มีช็อตถาวร 12 ต้องผ่าน');
  }],
  ['สกิลถาวร (ระหว่างสู้ · 22 ต.ค.): ผลเกิดทันที + จดค่าถาวรทุกครั้งที่ทำงาน · ค่า % คิดเป็นตัวเลข · ความสามารถถาวร', () => {
    const A = mk('A', { skills: [{ when: 'set', do: 'atkUp', to: 'self', v: L3(2), perm: true }, { when: 'passive', do: 'shareArmor', to: 'self', v: L3(30), perm: true },
      { when: 'matchStart', do: 'armorPct', to: 'self', v: L3(10), perm: true }, { when: 'set', do: 'atkUp', to: 'self', v: L3(1) }] });
    const r = fight([A, dummy('B', { hp: L3(39) })], [u('A')], [u('B')]);
    eq(ev(r, 'dmg', e => e.why === 'hit').map(e => e.amount), [10, 13, 16], 'พลังโจมตีเพิ่มทันทีในแมตช์ (ถาวร +2 และระหว่างสู้ +1)');
    eq(r.perm.map(g => [g.side, g.row, g.lane, g.id, g.key, g.amount]), [[0, 0, 0, 'A', 'shareArmor', 30], [0, 0, 0, 'A', 'armor', 10], [0, 0, 0, 'A', 'atk', 6]], 'จดถาวรทุกครั้ง (3 ชุด × 2) · เกราะ 10% ของ HP 100 = 10');
    const r2 = fight([mk('C', { skills: [{ when: 'set', do: 'atkUp', to: 'self', v: L3(2) }] }), dummy('B', { hp: L3(30) })], [u('C')], [u('B')]);
    eq(r2.perm, [], 'ไม่ติ๊กถาวร = ไม่มีค่าถาวร');
    const D = mk('D', { cdMs: 2000 }), r3 = fight([D, dummy('B', { hp: L3(10) })], [u('D', 0, 0, 1, { cdStart: 500, armorAmp: 50 })], [u('B')]);
    eq(ev(r3, 'set')[0].t, 1500, 'ความสามารถถาวร: เริ่มแมตช์ลดคูลดาวน์ 0.5 วิ');
  }],
  ['สกิลถาวร: ร้านค้าเก็บค่าหลังจบแมตช์ (แพ้ก็ได้) · ตรวจช่องและชนิด · เพดานตาม RULES (ชุด 27 ไม่มี) · ตัวตรวจค่ารับเฉพาะผลฝ่ายเรา', () => {
    const chars = buildCharacterList(), st = newRun(chars, 3); startRound(st, chars);
    st.board[0][0] = { uid: 99, id: 'HL-1', level: 1, perm: {}, paid: 3 };
    const g = (key, amount, id = 'HL-1', row = 0) => ({ side: 0, row, lane: 0, id, key, amount });
    const res = endMatch(st, false, chars, RULES, [g('atk', 5), g('multi', 3), g('atk', 4, 'PL-1'), g('hp', 7, 'HL-1', 1), g('evil', 9), g('armor', 1e9), g('shareArmor', 30)]);
    const cm = RULES.permCaps.multi; // ชุด 27: ไม่ผูกกับเพดานที่ตั้ง
    eq(st.board[0][0].perm, { atk: 5, multi: cm == null ? 3 : Math.min(cm, 3), shareArmor: 30 }, 'ได้ตอนแพ้ · มัลติฮิตตามเพดาน (ถ้ามี) · ชนิด/ช่องผิดไม่รับ');
    eq(st.hearts, RULES.shop.hearts - 1, 'แพ้ยังเสียหัวใจตามปกติ');
    ok(res.msgs.some(m => m.includes('จากสกิลระหว่างสู้')), 'แจ้งผู้เล่น');
    const t = buildTeam(teamEntries(st), makeCharMap(chars))[0];
    eq([t.atk, t.multi, t.shareArmor], [chars[0].atk[0] + 5, chars[0].multi[0] + (cm == null ? 3 : Math.min(cm, 3)), 30], 'แมตช์ถัดไปใช้ค่าถาวร');
    const base = mk('ZZ-1'), chk = sk => validateConfig([...chars, { ...base, skills: [sk] }]).errors.filter(e => e.startsWith('ZZ-1'));
    eq(chk({ when: 'selfDown', do: 'armor', to: 'backAlly', v: L3(5), perm: true }), [], 'ได้เกราะถาวรใช้ได้');
    ok(chk({ when: 'hit', do: 'burn', to: 'target', v: L3(5), perm: true }).length === 1, 'ติดไฟศัตรูตั้งถาวรไม่ได้');
    ok(chk({ when: 'matchWin', do: 'permAtk', to: 'self', v: L3(5), perm: true }).length === 1, 'สกิลร้านค้าไม่ต้องติ๊กถาวร');
  }],
  ['ชุด 6: ดาเมจตี +% · ดาเมจตีที่โดน +% · ไฟที่โดน +% · ฟื้น/เกราะที่ได้รับ − (ใส่ศัตรู)', () => {
    const A = mk('A', { skills: [{ when: 'passive', do: 'hitAmp', to: 'self', v: L3(50) }] });
    eq(ev(fight([A, dummy('B')], [u('A')], [u('B')]), 'dmg', e => e.why === 'hit')[0].amount, 15, 'ตี 10 +50%');
    const C = mk('C', { skills: [{ when: 'matchStart', do: 'dmgTakenUp', to: 'enemyFront', v: L3(100) }, { when: 'matchStart', do: 'burn', to: 'enemyFront', v: L3(10) }, { when: 'matchStart', do: 'burnTakenUp', to: 'enemyFront', v: L3(50) }] });
    const r = fight([C, dummy('B')], [u('C')], [u('B')]);
    eq(ev(r, 'dmg', e => e.why === 'hit')[0].amount, 20, 'ศัตรูโดนตีแรงขึ้น 100%');
    eq(ev(r, 'dmg', e => e.why === 'burn')[0].amount, 15, 'ไฟ 10 โดนแรงขึ้น 50%');
    const D = mk('D', { tribe: 'ภูติ', skills: [{ when: 'matchStart', do: 'healCut', to: 'enemyFront', v: L3(100) }, { when: 'matchStart', do: 'armorGainCut', to: 'enemyFront', v: L3(100) }] });
    const E2 = mk('E', { tribe: 'ภูติ', atk: L3(0), cdMs: 1000, skills: [{ when: 'set', do: 'heal', to: 'self', v: L3(5) }, { when: 'set', do: 'armor', to: 'self', v: L3(5) }] });
    const r2 = fight([D, E2], [u('D')], [u('E')]);
    eq([ev(r2, 'heal', e => e.to === uidOf(r2, 1, 'E')).length, ev(r2, 'armor', e => e.to === uidOf(r2, 1, 'E')).length], [0, 0], 'ฟื้นและเกราะของศัตรูเหลือ 0');
  }],
  ['ชุด 6: ค่าพลัง + % ระหว่างสู้ และค่าถาวรแบบ % ติดตัว · สกิลหลังสู้ครบทุกค่าถาวร', () => {
    const A = mk('A', { burn: L3(4), skills: [{ when: 'matchStart', do: 'hpPct', to: 'self', v: L3(50) }, { when: 'matchStart', do: 'armorHitUp', to: 'self', v: L3(3) }, { when: 'matchStart', do: 'burnHitPct', to: 'self', v: L3(50) }] });
    const r = fight([A, dummy('B')], [u('A')], [u('B')]);
    eq(ev(r, 'armor', e => e.why === 'armorHit')[0].amount, 3, 'เกราะ/ฮิต +3');
    eq(ev(r, 'burn')[0].amount, 6, 'ไฟต่อฮิต 4 +50%');
    eq(ev(r, 'buff', e => e.what === 'hpUp')[0].amount, 50, 'HP สูงสุด +50%');
    const base = buildCharacterList(), m = makeCharMap(base), c = base[0];
    const t = buildTeam([u(c.id, 0, 0, 1, { atk: 10, atkPct: 50, hpPct: 100, armorHit: 2, cdMs: 500 })], m)[0];
    eq([t.atk, t.maxHp, t.armorHit, t.cdMs], [Math.floor((c.atk[0] + 10) * 1.5), c.hp[0] * 2, c.armorHit[0] + 2, c.cdMs[0] - 500], 'ค่าถาวร % คิดจากค่าเลเวลปัจจุบัน');
    const Q = { ...c, id: 'QQ-2', skills: [{ when: 'matchWin', do: 'perm_atkPct', to: 'self', v: L3(10) }] };
    const chars = [...base, Q], st = newRun(chars, 4); startRound(st, chars); st.board[0][0] = { uid: 5, id: 'QQ-2', level: 1, perm: {}, paid: 3 };
    endMatch(st, true, chars); eq(st.board[0][0].perm, { atkPct: 10 }, 'ชนะแมตช์ → พลังโจมตี +10% ถาวร');
    ok(validateConfig(chars).errors.filter(e => e.startsWith('QQ-2')).length === 0, 'สกิลหลังสู้แบบใหม่ผ่านตัวตรวจค่า');
    for (const d of ['burnTakenUp', 'dmgTakenUp', 'healCut']) ok(!SKILL_SPEC.matchEnd['perm_' + d], `${d} ไม่มีแบบถาวร`);
  }],
  ['ชุด 11: แถวแนะนำหลายแถว · ตัวตรวจค่ารับ · ตัววัดและบอทสุ่มวางในแถวที่เลือก', () => {
    const base = buildCharacterList(), c = { ...base[0], id: 'RR-1', rowHint: 'กลาง+หลัง' };
    ok(validateConfig([...base, c]).errors.filter(e => e.startsWith('RR-1')).length === 0, 'กลาง+หลัง ผ่านตัวตรวจค่า');
    ok(validateConfig([...base, { ...c, rowHint: 'หลัง+หน้า' }]).errors.some(e => e.startsWith('RR-1')), 'ลำดับผิด/ค่าแปลก ไม่ผ่าน');
    eq([rowsOfHint('กลาง+หลัง'), rowsOfHint('ที่ไหนก็ได้'), rowsOfHint('หน้า'), rowsOfHint('x')], [[1, 2], [0, 1, 2], [0], []], 'แปลงเป็นเลขแถว');
    const seen = new Set();
    for (let i = 0; i < 40; i++) { const r = pickHintRow('กลาง+หลัง', i / 40); seen.add(r); }
    eq([...seen].sort(), [1, 2], 'สุ่มได้ทั้ง 2 แถวที่เลือก ไม่ออกแถวอื่น');
    eq([pickHintRow('หน้า', 0.9), pickHintRow('ที่ไหนก็ได้', 0.9)], [null, null], 'แถวเดียว/ที่ไหนก็ได้ ใช้ลำดับเดิม (ผลวัดเดิมไม่เปลี่ยน)');
  }],
  ['ชุด 9: ค่าพลัง + % ของ ค่า ของ ใคร · คิดตอนทำงานแล้วบวกค้าง · ถาวรเก็บตัวเลข', () => {
    const A = mk('A', { hp: L3(40), atk: L3(10), burn: L3(0), skills: [{ when: 'matchStart', do: 'atkOf', of: { stat: 'maxHp', who: 'self' }, to: 'self', v: L3(50) },
      { when: 'matchStart', do: 'hpOf', of: { stat: 'atk', who: 'self' }, to: 'self', v: L3(100) }, { when: 'matchStart', do: 'burnHitOf', of: { stat: 'atk', who: 'self' }, to: 'self', v: L3(10) },
      { when: 'matchStart', do: 'shockHitOf', of: { stat: 'maxHp', who: 'allEnemies' }, to: 'self', v: L3(10) }, { when: 'matchStart', do: 'armorHitOf', of: { stat: 'maxHp', who: 'self' }, to: 'self', v: L3(5) }] });
    const r = fight([A, dummy('B', { hp: L3(90) })], [u('A')], [u('B')]);
    eq(ev(r, 'atkUp')[0].amount, 20, 'พลังโจมตี + 50% ของ HP สูงสุด 40');
    const bf = w => ev(r, 'buff', e => e.what === w).map(e => e.amount);
    eq([bf('hpUp')[0], bf('burnHitUp')[0], bf('shockHitUp')[0], bf('armorHitUp')[0]], [30, 3, 9, 3], 'HP+ (atk 30) · ไฟ/ฮิต 10% ของ 30 · ช็อต/ฮิต 10% ของ HP ศัตรู 90 · เกราะ/ฮิต 5% ของ 70 ปัดลง');
    const P = mk('P', { hp: L3(40), skills: [{ when: 'matchStart', do: 'atkOf', of: { stat: 'maxHp', who: 'self' }, to: 'self', v: L3(25), perm: true }] });
    const r2 = fight([P, dummy('E', { hp: L3(5) })], [u('P')], [u('E')]);
    eq(r2.perm.map(g => [g.key, g.amount]), [['atk', 10]], 'ถาวร: เก็บพลังโจมตี +10 เป็นตัวเลข');
    for (const d of ['atkOf', 'hpOf', 'burnHitOf', 'shockHitOf', 'armorHitOf']) ok(!SKILL_SPEC.matchEnd['perm_' + d], `${d} ไม่สร้างแบบร้านค้าซ้ำ`);
  }],
  ['ชุด 7: ผลแบบ % ของ ค่า ของ ใคร · แบ่งเกราะเลือกผู้รับ · ร่างเก่าแปลงเป็นแบบใหม่', () => {
    const A = mk('A', { atk: L3(0), skills: [{ when: 'matchStart', do: 'dmgOf', of: { stat: 'maxHp', who: 'each' }, to: 'allEnemies', v: L3(10) }] });
    const r = fight([A, dummy('B', { hp: L3(500) }), dummy('C', { hp: L3(300) })], [u('A')], [u('B'), u('C', 0, 1)]);
    eq(ev(r, 'dmg', e => e.t === 0).map(e => e.amount).sort((x, y) => x - y), [30, 50], 'คิดแยกทีละตัว 10% ของ HP สูงสุดตัวนั้น');
    const P = mk('P', { atk: L3(0), skills: [{ when: 'hitTaken', do: 'dmgOf', of: { stat: 'atk', who: 'ctx' }, to: 'attacker', v: L3(200) }] });
    const r2 = fight([P, mk('Q', { atk: L3(7) })], [u('P')], [u('Q')]);
    eq(ev(r2, 'dmg', e => e.why === 'skill')[0].amount, 14, 'ผู้ตี: 200% ของพลังโจมตีผู้ตี');
    const S = dummy('S', { skills: [{ when: 'passive', do: 'shareArmor', to: 'backAlly', v: L3(50) }, { when: 'matchStart', do: 'armor', to: 'self', v: L3(40) }] });
    const r3 = fight([S, dummy('X'), dummy('Y'), dummy('E')], [u('S'), u('X', 1, 0), u('Y', 0, 1)], [u('E')]);
    eq(ev(r3, 'armor', e => e.why === 'share').map(e => [e.to === uidOf(r3, 0, 'X'), e.amount]), [[true, 20]], 'แบ่งให้เพื่อนข้างหลังเท่านั้น');
    const r4 = fight([mk('T', { skills: [{ when: 'passive', do: 'shareArmor', to: 'backAlly', v: L3(25), perm: true }] }), dummy('E', { hp: L3(5) })], [u('T')], [u('E')]);
    eq(r4.perm.map(g => [g.key, g.amount]), [['share_backAlly', 25]], 'แบ่งเกราะถาวรจำผู้รับ');
    eq(upgradeSkill({ when: 'hit', do: 'dmgPctArmor', to: 'enemyFront', v: L3(1) }), { when: 'hit', do: 'dmgOf', to: 'enemyFront', v: L3(1), of: { stat: 'armor', who: 'self' } }, 'แปลงร่างเก่า');
    const base = buildCharacterList(), bad = { ...base[0], id: 'ZZ-3', skills: [{ when: 'matchStart', do: 'dmgOf', of: { stat: 'atk', who: 'ctx' }, to: 'enemyFront', v: L3(1) }] };
    ok(validateConfig([...base, bad]).errors.some(e => e.startsWith('ZZ-3')), 'เงื่อนไขที่ไม่มีเป้าหมาย/ผู้ตี ใช้ ctx ไม่ได้');
  }],
  ['ตัวเลือกสกิล "ไม่ให้ผลกับตัวอื่นที่ ID เดียวกัน" (ชุด 17)', () => {
    const sk = o => ({ when: 'hit', do: 'multiUp', to: 'frontBackAlly', v: L3(1), ...o });
    const W = mk('W', { atk: L3(1), cdMs: 2000, hp: L3(500), skills: [sk({ skipSameId: true })] });
    const V = mk('V', { atk: L3(1), cdMs: 2000, hp: L3(500) });
    const E = dummy('E', { hp: L3(1000) });
    const r = fight([W, E], [u('W', 0, 0), u('W', 1, 0)], [u('E')]);
    eq(ev(r, 'set').slice(0, 6).map(e => e.hits), [1, 1, 1, 1, 1, 1], 'W สองตัว ID เดียวกัน ไม่เพิ่มฮิตให้กัน');
    const r2 = fight([W, V, E], [u('W', 0, 0), u('V', 1, 0)], [u('E')]);
    ok(ev(r2, 'set', e => e.who === uidOf(r2, 0, 'V')).some(e => e.hits > 1), 'ตัว ID อื่นยังได้รับ');
    ok(skErr(mk('AA-1', { skills: [sk({ skipSameId: true })] })).length === 0, 'ตัวตรวจค่ารับ');
    ok(skErr(mk('AA-1', { skills: [sk({ to: 'self', skipSameId: true })] })).length > 0, 'ตัวเอง + ไม่ให้ ID เดียวกัน = ผิด');
    ok(skErr(mk('AA-1', { skills: [{ when: 'hit', do: 'dmg', to: 'target', v: L3(1), skipSameId: true }] })).length > 0, 'ใช้กับศัตรู = ผิด');
    ok(skErr(mk('AA-1', { skills: [sk({ skipSameId: 1 })] })).length > 0, 'ค่าต้องเป็น true');
  }],
  ['ตัวเลือกสกิล "คูลดาวน์สกิลเพิ่ม % ทุกครั้งที่ใช้" (ชุด 17)', () => {
    const A = mk('A', { atk: L3(0), cdMs: 500, hp: L3(500), skills: [{ when: 'set', do: 'armor', to: 'self', v: L3(1), cd: 1000, cdGrow: 50 }] });
    const r = fight([A, dummy('E')], [u('A')], [u('E')]);
    eq(ev(r, 'proc').slice(0, 3).map(e => e.t), [1000, 2500, 5000], 'คูลดาวน์สกิล 1 → 1.5 → 2.25 วิ (ใช้ได้ที่ชุดแรกหลังครบ)');
    const B = mk('AA-1', { skills: [{ when: 'set', do: 'armor', to: 'self', v: L3(1), cd: 1000, cdGrow: 20 }] });
    ok(skErr(B).length === 0, 'ตัวตรวจค่ารับ');
    for (const bad of [{ cd: undefined }, { cdGrow: 0 }, { cdGrow: 2.5 }, { cdGrow: 501 }, { cdGrow: '20' }])
      ok(skErr({ ...B, skills: [{ ...B.skills[0], ...bad }] }).length > 0, 'ค่าผิด ' + JSON.stringify(bad));
  }],
  ['ตัวตัดนิรภัย: ฮิตรวมเกินเพดาน → จบเสมอ + บอกว่าผิดปกติ (ชุด 17)', () => {
    const sk = { when: 'hit', do: 'multiUp', to: 'self', v: L3(1) };
    const A = mk('A', { atk: L3(1), cdMs: 2000, hp: L3(500), skills: [sk] });
    const t0 = Date.now();
    const r = fight([A, dummy('E', { hp: L3(1e9) })], [u('A')], [u('E')], { log: false });
    ok(Date.now() - t0 < 5000, 'จบเร็ว ไม่ค้าง');
    eq([r.winner, r.aborted], [null, 'hits'], 'เสมอ + ป้ายผิดปกติ');
    const n = fight([mk('B'), mk('C')], [u('B')], [u('C')]);
    ok(!n.aborted, 'แมตช์ปกติไม่มีป้าย');
  }],
  ['ผลสกิลเกิน 2,000 ผลใน tick เดียว ทำครบใน tick นั้น (ชุด 17)', () => {
    const A = mk('A', { atk: L3(1), cdMs: 1000, hp: L3(500), multi: 3000, armorHit: L3(1) });
    const r = fight([A, dummy('E', { hp: L3(1e7) })], [u('A')], [u('E')]);
    eq(ev(r, 'armor', e => e.t === 1000).length, 3000, 'เกราะ/ฮิต ครบ 3,000 ครั้งที่ 1 วิ');
  }],
  ['ค่าพลังฟื้น/ฮิต: ทุกฮิตที่ตีโดน ตัวเองฟื้น HP ได้ทุกเผ่า (ชุด 18)', () => {
    const A = mk('A', { atk: L3(10), cdMs: 1000, multi: 3, hp: L3(100), healHit: L3(5) });
    const E = mk('E', { atk: L3(50), cdMs: 700, hp: L3(10000) });
    const r = fight([A, E], [u('A')], [u('E')]);
    const a = uidOf(r, 0, 'A');
    eq(ev(r, 'heal', e => e.to === a && e.t === 1000).map(e => e.amount), [5, 5, 5], 'ฮิตละ 5 ครบ 3 ฮิตที่ 1 วิ');
    const B = mk('AA-1', { tribe: 'เพลิงเผา', healHit: L3(5) });
    ok(skErr(B).length === 0, 'เผ่าไหนก็ใส่ได้');
    for (const bad of [[1, 2], [-1, 0, 0], ['1', 2, 3]]) ok(skErr({ ...B, healHit: bad }).length > 0, 'ค่าผิด ' + JSON.stringify(bad));
    const c = { ...B, cdMs: L3(2000), multi: L3(2) }, p0 = basePower({ ...c, healHit: L3(0) }), p1 = basePower(c);
    eq(p1.ehp - p0.ehp, 5 * 1 * RULES.power.armorLifeSec, 'งบค่าพลัง: นับเป็นเลือดรวม (ฟื้น × ฮิตต่อวิ × เวลายืน)');
  }],
  ['พาเพื่อนไปตี: สุ่มเพื่อนเผ่าเดียวกันตีเป้าเดียวกันทันที นับเป็นฮิตปกติ ไม่พาต่อ (ชุด 20)', () => {
    const strike = { when: 'hit', do: 'allyStrike', to: 'allyRandom', sameTribe: true, v: L3(1) };
    const P = mk('P', { tribe: 'ภูติ', atk: L3(1), cdMs: 1000, hp: L3(10000), skills: [strike] });
    const Q = dummy('Q', { tribe: 'ภูติ', atk: L3(7), burn: L3(2), skills: [strike] });
    const R = dummy('R', { tribe: 'อสูร', atk: L3(50) });
    const E = dummy('E', { hp: L3(1e6) });
    const r = fight([P, Q, R, E], [u('P', 0, 0), u('Q', 1, 0), u('R', 1, 1)], [u('E', 0, 0)], { rules: { ...NT, hardStopMs: 5000 } });
    const p = uidOf(r, 0, 'P'), q = uidOf(r, 0, 'Q'), e = uidOf(r, 1, 'E');
    const car = ev(r, 'carry');
    eq(car.length, 5, 'P ตีโดน 5 ครั้งใน 5 วิ → พา 5 ครั้ง (กรองเผ่าก่อนสุ่ม จึงมีผู้รับทุกครั้ง)');
    ok(car.every(c => c.who === q && c.by === p && c.target === e), 'พาเฉพาะเพื่อนเผ่าเดียวกัน (Q) ไปตีเป้าของ P');
    eq(ev(r, 'dmg', x => x.from === q && x.why === 'hit' && x.t === 1000).map(x => x.amount), [7], 'Q ตี 7 ที่ 1 วิ');
    ok(ev(r, 'burn', x => x.to === e && x.from === q && x.t === 1000).length === 1, 'ไฟต่อฮิตของ Q ทำงาน (ฮิตปกติ)');
    eq(ev(r, 'proc', x => x.who === q).length, 0, 'ฮิตที่ถูกพาไปไม่พาต่อ (สกิลของ Q ไม่ทำงาน)');
    const P2 = { ...P, id: 'P2', skills: [{ ...strike, cd: 3000 }] };
    const r2 = fight([P2, Q, E], [u('P2', 0, 0), u('Q', 1, 0)], [u('E', 0, 0)], { rules: { ...NT, hardStopMs: 7000 } });
    eq(ev(r2, 'carry').map(x => x.t), [3000, 6000], 'คูลดาวน์สกิล 3 วิ');
    ok(skErr({ ...P, id: 'AA-1', skills: [strike] }).length === 0, 'สกิลถูกต้อง');
    ok(skErr({ ...P, id: 'AA-1', skills: [{ ...strike, to: 'self' }] }).length > 0, 'พาตัวเองไม่ได้');
    ok(skErr({ ...P, id: 'AA-1', skills: [{ ...strike, when: 'set' }] }).length > 0, 'ใช้ได้เฉพาะ ทุกฮิตที่ตีโดน');
  }],
  ['ล้างไฟ/ช็อต % ของที่มี ปัดลง (ชุด 20)', () => {
    const P = mk('P', { tribe: 'ภูติ', atk: L3(0), cdMs: 1000, skills: [{ when: 'set', do: 'cleansePct', to: 'frontAlly', v: [50, 75, 100] }] });
    const X = dummy('X');
    const E = dummy('E', { skills: [{ when: 'matchStart', do: 'burn', to: 'enemyFront', v: L3(10) }, { when: 'matchStart', do: 'shock', to: 'enemyFront', v: L3(7) }] });
    const r = fight([P, X, E], [u('X', 0, 0), u('P', 1, 0)], [u('E', 0, 0)], { rules: { ...NT, hardStopMs: 1000 } });
    const c = ev(r, 'cleanse', x => x.to === uidOf(r, 0, 'X'))[0];
    ok(c && c.what === 'pct', 'มีการล้างแบบ %');
    eq([c.burn, c.shock, c.cut], [4, 4, [4, 3]], 'ไฟ 8 → 4 · ช็อต 7 → 4 (ล้าง 3 ปัดลง)');
    const r3 = fight([P, X, E], [u('X', 0, 0, 3), u('P', 1, 0, 3)], [u('E', 0, 0)], { rules: { ...NT, hardStopMs: 1000 } });
    const c3 = ev(r3, 'cleanse')[0]; eq([c3.burn, c3.shock], [0, 0], 'Lv3 100% = ล้างหมด');
  }],
  ['สะท้อนดีบัฟ: เพื่อนยังโดนเต็ม ศัตรูที่ใส่โดนกลับ % ไม่สะท้อนวน เพดาน 100% (ชุด 20)', () => {
    const refl = v => ({ when: 'passive', do: 'reflectDebuff', to: 'allAllies', v: L3(v) });
    const P = dummy('P', { tribe: 'ภูติ', skills: [refl(50)] });
    const X = dummy('X');
    const E = mk('E', { atk: L3(1), cdMs: 1000, hp: L3(1e6), burn: L3(10), shock: L3(6), skills: [{ when: 'set', do: 'cdSlowPct', to: 'target', v: L3(20) }] });
    const G = dummy('G', { tribe: 'ภูติ', skills: [refl(100)] }); // ฝั่งศัตรูมีผู้ปกป้องด้วย: ของที่สะท้อนต้องไม่เด้งกลับ
    const r = fight([P, X, E, G], [u('X', 0, 0), u('P', 1, 0)], [u('E', 0, 0), u('G', 1, 0)], { rules: { ...NT, hardStopMs: 1000 } });
    const x = uidOf(r, 0, 'X'), e = uidOf(r, 1, 'E');
    eq(ev(r, 'burn', z => z.to === x).map(z => z.amount), [10], 'X โดนไฟเต็ม 10 ไม่มีไฟเด้งกลับ');
    eq(ev(r, 'burn', z => z.to === e).map(z => [z.amount, z.why]), [[5, 'reflect']], 'E โดนไฟกลับ 50%');
    eq(ev(r, 'shock', z => z.to === e).map(z => z.amount), [3], 'E โดนช็อตกลับ 50%');
    eq(ev(r, 'buff', z => z.to === e && z.what === 'cdSlowPct').map(z => z.amount), [10], 'E คูลดาวน์ช้าลงกลับ 10%');
    eq(ev(r, 'buff', z => z.to === x && z.what === 'cdSlowPct').map(z => z.amount), [20], 'X ยังโดนเต็ม 20%');
    const P3 = { ...P, id: 'P3', skills: [refl(75)] };
    const r2 = fight([P3, X, E], [u('X', 0, 0), u('P3', 1, 0), u('P3', 1, 1)], [u('E', 0, 0)], { rules: { ...NT, hardStopMs: 1000 } });
    eq(ev(r2, 'burn', z => z.to === uidOf(r2, 1, 'E')).map(z => z.amount), [10], 'สองตัว 75+75 → เพดาน 100%');
    ok(skErr({ ...P, id: 'AA-1', skills: [refl(50)] }).length === 0, 'สกิลถูกต้อง');
    ok(skErr({ ...P, id: 'AA-1', skills: [{ ...refl(50), when: 'hit' }] }).length > 0, 'ตั้งได้เฉพาะ ติดตัว');
  }],
  ['ค่ากลางตามเผ่า × ความหายาก ตรง tribe-rules V1.15 (ชุด 20)', () => {
    eq(midStats('เหล็กกล้า', 'ไม่ธรรมดา'), { hp: [250, 500, 1000], atk: [5, 10, 20] }, 'เหล็กกล้า ไม่ธรรมดา');
    eq(midStats('อสูร', 'ตำนาน').atk[0], 31, 'อสูร ตำนาน พลังโจมตี');
    eq(midStats('วายุ', 'หายากมาก').hp[0], 255, 'วายุ หายากมาก HP');
    eq(midStats('ภูติ', 'xx'), null, 'ความหายากผิด');
  }],
  ['ชุบเพื่อนที่ down อยู่: สุ่ม ไม่จำกัดครั้ง ตามคูลดาวน์สกิล ไม่ชุบช่องที่ถูกแทน (ชุด 20)', () => {
    const rev = { when: 'hit', do: 'reviveDowned', to: 'self', v: L3(1), cd: 3000 };
    const W = mk('W', { tribe: 'อสูร', atk: L3(1), cdMs: 1000, hp: L3(1e6), skills: [rev] });
    const D = dummy('D', { hp: L3(10) });
    const E = mk('E', { atk: L3(100), cdMs: 1000, hp: L3(1e6) });
    const r = fight([W, D, E], [u('D', 0, 0), u('W', 2, 0)], [u('E', 0, 0)], { rules: { ...NT, hardStopMs: 9000 } });
    const d = uidOf(r, 0, 'D');
    eq(ev(r, 'revive', x => x.who === d).map(x => [x.t, x.hp, x.why]), [[3000, 2, 'ally'], [6000, 2, 'ally'], [9000, 2, 'ally']], 'ชุบทุก 3 วิ HP 20% ไม่จำกัดครั้ง');
    const T = dummy('T');
    const S = dummy('S', { tribe: 'อสูร', hp: L3(10), skills: [{ when: 'selfDown', do: 'summon', to: 'self', summon: 'T', v: L3(1) }] });
    const r2 = fight([W, S, T, E], [u('S', 0, 0), u('W', 2, 0)], [u('E', 0, 0)], { rules: { ...NT, hardStopMs: 4000 } });
    ok(ev(r2, 'summon').length === 1, 'เรียกตัวมาแทนแล้ว');
    eq(ev(r2, 'revive').length, 0, 'ไม่ชุบตัวที่ช่องถูกแทน และไม่ชุบตัวที่ถูกเรียก');
    ok(skErr({ ...W, id: 'AA-1', skills: [rev] }).length === 0, 'อสูรใช้ได้');
    ok(skErr({ ...W, id: 'AA-1', tribe: 'วายุ', skills: [rev] }).length > 0, 'เผ่าที่ไม่ใช่ภูติ/อสูรใช้ไม่ได้');
    ok(skErr({ ...W, id: 'AA-1', skills: [{ ...rev, when: 'allyDown' }] }).length > 0, 'ตอนเพื่อน down ใช้ชุบเพื่อนแบบเดิม');
  }],
  ['จดส่วนประกอบดาเมจ (detail) ไม่เปลี่ยนผล · ดาเมจทุกครั้งมีที่มา (ชุด 36)', () => {
    const chars = buildCharacterList(), m = makeCharMap(chars), rng = makeRng(3636);
    for (let i = 0; i < 40; i++) {
      const A = randomTeam(rng, chars, 6, 'mix'), B = randomTeam(rng, chars, 6, 'mix');
      const r0 = simulate(buildTeam(A, m), buildTeam(B, m), { seed: i + 1 }), r1 = simulate(buildTeam(A, m), buildTeam(B, m), { seed: i + 1, detail: true });
      // ชุด 37: เหตุการณ์ผลอื่นๆ ที่มี d จะมี from เพิ่มด้วย (เฉพาะเมื่อเดิมไม่มี from) → ตัด d และ from ที่เพิ่ม แล้วต้องเหมือนเดิมทุกตัวอักษร
      // ชุด 37: เหตุการณ์ dx (จดเพิ่มเพื่อแสดงสเตตัส) และ ini/fin ของตัวละครมีเฉพาะตอนเปิด detail → ตัดออกก่อนเทียบ
      eq(JSON.stringify({ ...r1, events: r1.events.filter(e => !e.dx).map((e, k) => { const { d, ...x } = e; if (d && !('from' in r0.events[k])) delete x.from; return x; }), units: r1.units.map(({ ini, fin, ...x }) => x) }), JSON.stringify(r0), `แมตช์ ${i} ผลต้องเหมือนเดิม`);
      for (const e of ev(r1, 'dmg')) {
        ok(e.d && typeof e.d === 'object', `แมตช์ ${i} ดาเมจไม่มีรายละเอียด`);
        if (e.why === 'hit') ok(Number.isFinite(e.d.atk) && e.d.n >= 1, 'ฮิตต้องมีพลังโจมตีและจำนวนเป้า');
        if (e.why === 'burn') ok(e.d.burn > 0, 'ไฟต้องมีค่าไฟ');
        if (e.why === 'skill' || e.why === 'reflect') ok('what' in e.d, 'ดาเมจสกิลต้องบอกชนิดผล');
      }
    }
  }],
  ['จดที่มาของผลอื่นๆ (เกราะ/ฟื้น/บัฟ/ถาวร/ล้างผล/ขโมยช็อต) เมื่อเปิด detail · ปิด = ไม่มี d และเหตุการณ์เหมือนเดิม (ชุด 37)', () => {
    const chars = buildCharacterList(), m = makeCharMap(chars), rng = makeRng(3737);
    const KINDS = ['armor', 'heal', 'buff', 'atkUp', 'perm', 'maxhp', 'cleanse', 'steal', 'cdCut', 'cdPct', 'reflectDebuff', 'revive'];
    let withD = 0;
    for (let i = 0; i < 60; i++) {
      const A = randomTeam(rng, chars, 6, 'mix'), B = randomTeam(rng, chars, 6, 'mix');
      const r0 = simulate(buildTeam(A, m), buildTeam(B, m), { seed: i + 1 }), r1 = simulate(buildTeam(A, m), buildTeam(B, m), { seed: i + 1, detail: true });
      eq(r0.events.filter(e => 'd' in e && e.k !== 'dmg').length, 0, 'ปิด detail ห้ามมี d ในเหตุการณ์ผลอื่นๆ');
      const ev1 = r1.events.filter(e => !e.dx);
      eq(ev1.length, r0.events.length, `แมตช์ ${i} จำนวนเหตุการณ์ (ไม่นับ dx) ต้องเท่ากัน`);
      eq(r0.events.filter(e => e.dx).length + r0.units.filter(u => u.ini || u.fin).length, 0, 'ปิด detail ห้ามมี dx / ini / fin');
      ok(r1.units.every(u => u.ini && u.fin && Number.isFinite(u.fin.atk) && u.fin.maxHp > 0), `แมตช์ ${i} เปิด detail ทุกตัวต้องมีสเตตัสก่อน/หลัง`);
      eq(r1.winner, r0.winner, `แมตช์ ${i} ผู้ชนะต้องเท่ากัน`); eq(r1.timeMs, r0.timeMs, `แมตช์ ${i} เวลาต้องเท่ากัน`);
      ev1.forEach((e, k) => {
        if (!KINDS.includes(e.k) || !e.d) return;
        withD++;
        ok(Number.isInteger(e.from) && e.d.what && 'si' in e.d, `แมตช์ ${i} เหตุการณ์ ${e.k} ต้องมี from และ d.what/si`);
        ok(e.k === r0.events[k].k && e.to === r0.events[k].to && e.amount === r0.events[k].amount, 'ค่าเหตุการณ์ต้องเหมือนตอนปิด detail');
      });
    }
    ok(withD > 0, 'ต้องเจอเหตุการณ์ผลอื่นๆ ที่มีที่มาอย่างน้อย 1 ครั้งใน 60 แมตช์');
  }],
];

export function runTests() {
  return TESTS.map(([name, fn]) => {
    try { fn(); return { name, ok: true }; }
    catch (e) { return { name, ok: false, msg: e.message }; }
  });
}

// สถิติแมตช์สุ่ม: ใช้เทียบเป้าหมายใน combat-rules (ความยาวแมตช์, แมตช์ที่ถึง 180 วิ)
export function matchStats(n = 1000, seed = 1, level = 1) {
  const chars = buildCharacterList(), m = makeCharMap(chars), rng = makeRng(seed);
  const times = []; let storm = 0, draws = 0;
  for (let i = 0; i < n; i++) {
    const r = simulate(buildTeam(randomTeam(rng, chars, 6, level), m), buildTeam(randomTeam(rng, chars, 6, level), m), { log: false });
    times.push(r.timeMs / 1000);
    if (r.timeMs > RULES.stormStartMs) storm++;
    if (r.winner == null) draws++;
  }
  times.sort((a, b) => a - b);
  return { n, level, median: times[Math.floor(n / 2)], p10: times[Math.floor(n * 0.1)], p90: times[Math.floor(n * 0.9)], stormPct: storm / n * 100, drawPct: draws / n * 100 };
}


