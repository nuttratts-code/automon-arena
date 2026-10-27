// ชุดทดสอบ: สกิล: เป้า/ตำแหน่ง ผลแบบ % ของ ค่า ของ ใคร เรียกตัว ตีแบ่ง ดูดช็อต สกิลถาวรระหว่างสู้ · แยกจาก mechanics.js (ชุด D) · ตัวช่วยอยู่ helpers.js
import { buildCharacterList } from '../core/characters.js';
import { basePower } from '../core/power.js';
import { RULES, SKILL_SPEC, upgradeSkill } from '../core/rules.js';
import { endMatch, newRun, startRound } from '../core/shop.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { validateConfig } from '../core/validate.js';
import { NEVER, mk, L3, skErr, dummy, u, NT, fight, ev, uidOf, eq, ok } from './helpers.js';
export const TESTS_SKILL_TARGETS = [
  ['ชุด 33: ตีแบ่งทุกตัว 1 ฮิต = ดาเมจหลายเป้า แต่มีแค่เป้าแรกที่ไม่ติดป้าย sub (สรุปรายตัวนับ 1 ฮิต)', () => {
    const A = mk('A', { atk: L3(30), multi: 2, skills: [{ when: 'set', do: 'splitAll', to: 'allEnemies', v: L3(1) }] });
    const r = fight([A, dummy('D1'), dummy('D2'), dummy('D3')], [u('A')], [u('D1', 0, 0), u('D2', 0, 1), u('D3', 1, 0)]);
    const first = ev(r, 'dmg', e => e.why === 'hit' && e.t === 1000);
    eq(first.length, 6, 'ดาเมจฮิตชุดแรก (2 ฮิต × 3 เป้า)');
    eq(first.filter(e => !e.sub).length, 2, 'ฮิตที่ออกไปตี');
    ok(ev(fight([mk('B'), dummy('D')], [u('B')], [u('D')]), 'dmg', e => e.sub).length === 0, 'ตีปกติไม่มีป้าย sub');
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
];
