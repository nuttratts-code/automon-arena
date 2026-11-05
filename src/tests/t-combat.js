// ชุดทดสอบ: กฎการต่อสู้พื้นฐาน: เกราะ ดาเมจ ไฟ ช็อต เลือกเป้า down พายุทราย ผลเหมือนเดิม/ไม่มีฝั่งได้เปรียบ ตัวตัดนิรภัย บันทึกเหตุการณ์ · แยกจาก mechanics.js (ชุด D) · ตัวช่วยอยู่ helpers.js
import { simulate } from '../core/battle.js';
import { buildCharacterList } from '../core/characters.js';
import { makeRng } from '../core/rng.js';
import { RULES } from '../core/rules.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { NEVER, mk, L3, dummy, u, NT, fight, ev, uidOf, eq, ok, randomTeam } from './helpers.js';
export const TESTS_COMBAT = [
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
  ['set 98: ช่วงต่อเวลา (แทนพายุทราย) · สแตกทุกช่วง · ดาเมจ + · ตีเร็วขึ้น · ฟื้น/เกราะใหม่ − · เพดาน · ไม่มีดาเมจพายุ', () => {
    const R = { ...NT, stormStartMs: 20000, stormIntervalMs: 1000, stormDmgPct: 10, stormSpeedPct: 10, stormHealCutPct: 10, stormArmorCutPct: 10, stormMaxPct: 100 };
    const A = mk('A', { atk: L3(10), cdMs: 1000, hp: L3(100000), skills: [{ when: 'hit', do: 'armorHitUp', to: 'self', v: L3(0) }, { when: 'hit', do: 'heal', to: 'self', v: L3(5) }] });
    const r = fight([A], [u('A')], [u('A')], { rules: R });
    eq(ev(r, 'dmg', e => e.why === 'storm').length, 0, 'ไม่มีดาเมจพายุแล้ว');
    const ot = ev(r, 'overtime');
    eq(ot.slice(0, 2).map(e => [e.t, e.n, e.dmg, e.speed, e.heal, e.armor]), [[21000, 1, 10, 10, 10, 10], [22000, 2, 20, 20, 20, 20]], 'สแตก 1–2');
    eq([ot.length, ot[ot.length - 1].n, ot[ot.length - 1].dmg], [10, 10, 100], 'หยุดเพิ่มที่เพดาน 100%');
    const hits = ev(r, 'dmg', e => e.why === 'hit');
    eq(hits.find(e => e.t < 20000).amount, 10, 'ก่อนต่อเวลา ดาเมจปกติ');
    eq(hits.find(e => e.t > 31000).amount, 20, 'หลังเพดาน ดาเมจ +100%');
    const a0 = hits[0].from, at = hits.filter(e => e.from === a0 && e.t > 31000).slice(0, 2).map(e => e.t);
    eq(at[1] - at[0], 500, 'หลังเพดาน ตีเร็วขึ้น 100% (1 วิ → 0.5 วิ)');
    eq(ev(r, 'heal', e => e.t > 30000).length, 0, 'หลังเพดาน ฟื้น HP = 0');
    // เกราะใหม่ลด · เกราะเดิมไม่ลด
    const T = mk('T', { atk: L3(1), cdMs: 1000, hp: L3(1000), armor: L3(50), skills: [{ when: 'hit', do: 'armorHitUp', to: 'self', v: L3(80) }] });
    const r3 = fight([T], [u('T')], [u('T')], { rules: R });
    eq(ev(r3, 'armor', e => e.t > 30000).length, 0, 'หลังเพดาน ไม่ได้เกราะใหม่');
    // ตัวที่ได้เกราะทุกฮิตแรงๆ (แบบ HL-3 Lv3) สู้กันเอง ต้องจบก่อนตัวตัดเวลา (ค่าเกม)
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
  // set 84: live stats for the game's tap-to-inspect panel
  ['live stats (opts.live): same result + same other events · last stat values = end-of-match stats', () => {
    const chars = buildCharacterList(), m = makeCharMap(chars), rng = makeRng(84);
    for (let i = 0; i < 40; i++) {
      const A = randomTeam(rng, chars, 6, 'mix'), B = randomTeam(rng, chars, 6, 'mix');
      const d = simulate(buildTeam(A, m), buildTeam(B, m), { detail: true }), l = simulate(buildTeam(A, m), buildTeam(B, m), { detail: true, live: true });
      eq([l.winner, l.timeMs], [d.winner, d.timeMs], `match ${i}: result`);
      ok(JSON.stringify(l.events.filter(e => e.k !== 'stat')) === JSON.stringify(d.events), `match ${i}: other events unchanged`);
      const now = new Map();
      for (const e of l.events) if (e.k === 'stat') now.set(e.to, { ...(now.get(e.to) || {}), ...e.s });
      for (const x of l.units) {
        const s = now.get(x.uid); ok(!!s, `match ${i}: uid ${x.uid} has live stats`);
        for (const k of Object.keys(x.fin)) eq(s[k], x.fin[k], `match ${i} uid ${x.uid} ${k}`);
      }
    }
    const plain = simulate(buildTeam(randomTeam(makeRng(1), chars, 6, 'mix'), m), buildTeam(randomTeam(makeRng(2), chars, 6, 'mix'), m));
    ok(!plain.events.some(e => e.k === 'stat'), 'no stat events without opts.live');
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
  ['จดส่วนประกอบดาเมจ (detail) ไม่เปลี่ยนผล · ดาเมจทุกครั้งมีที่มา (ชุด 36)', () => {
    const chars = buildCharacterList(), m = makeCharMap(chars), rng = makeRng(3636);
    for (let i = 0; i < 40; i++) {
      const A = randomTeam(rng, chars, 6, 'mix'), B = randomTeam(rng, chars, 6, 'mix');
      const r0 = simulate(buildTeam(A, m), buildTeam(B, m), { seed: i + 1 }), r1 = simulate(buildTeam(A, m), buildTeam(B, m), { seed: i + 1, detail: true });
      // ชุด 37: เหตุการณ์ผลอื่นๆ ที่มี d จะมี from เพิ่มด้วย (เฉพาะเมื่อเดิมไม่มี from) → ตัด d และ from ที่เพิ่ม แล้วต้องเหมือนเดิมทุกตัวอักษร
      // F1 (28 ต.ค.): เหตุการณ์ reflectDebuff มีช่อง by (PT-8 ที่สะท้อน) เฉพาะตอนเปิด detail → ตัดก่อนเทียบ
      // ชุด 37: เหตุการณ์ dx (จดเพิ่มเพื่อแสดงสเตตัส) และ ini/fin ของตัวละครมีเฉพาะตอนเปิด detail → ตัดออกก่อนเทียบ
      eq(JSON.stringify({ ...r1, events: r1.events.filter(e => !e.dx).map((e, k) => { const { d, ...x } = e; if (d && !('from' in r0.events[k])) delete x.from; if (x.k === 'heal' && !('why' in r0.events[k])) delete x.why; if (x.k === 'reflectDebuff') { delete x.ally; delete x.si; } return x; }), units: r1.units.map(({ ini, fin, ...x }) => x) }), JSON.stringify(r0), `แมตช์ ${i} ผลต้องเหมือนเดิม`);
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
