// ชุดทดสอบ: สกิล: เงื่อนไข ผล คูลดาวน์ ชุบเพื่อน ฟื้น HP โอกาส % ผลตอน down ตัวเลือกสกิล · แยกจาก mechanics.js (ชุด D) · ตัวช่วยอยู่ helpers.js
import { buildCharacterList } from '../core/characters.js';
import { RULES, skillTargets } from '../core/rules.js';
import { newRun, sell } from '../core/shop.js';
import { makeCharMap } from '../core/team.js';
import { validateConfig } from '../core/validate.js';
import { NEVER, mk, L3, skErr, dummy, u, fight, ev, uidOf, eq, ok } from './helpers.js';
export const TESTS_SKILLS = [
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
  ['ชุบเพื่อนที่ down อยู่ (WN-4): ติ๊ก sameTribe = ชุบเฉพาะเผ่าเดียวกับผู้ใช้ · ไม่ติ๊ก = ทุกเผ่า', () => {
    const glass = (id, tribe) => mk(id, { tribe, hp: L3(50), cdMs: NEVER, atk: L3(0) });
    const K = mk('K', { atk: L3(100), cdMs: L3(1000), hp: L3(100000) });
    for (const same of [true, false]) {
      const R = mk('R', { tribe: 'วายุ', atk: L3(1), cdMs: L3(3000), hp: L3(100000), skills: [{ when: 'hit', do: 'reviveDowned', to: 'self', v: L3(2), ...(same ? { sameTribe: true } : {}) }] });
      const r = fight([R, glass('G1', 'วายุ'), glass('G2', 'ภูติ'), K], [u('G1', 0, 0), u('G2', 0, 1), u('R', 1, 0)], [u('K', 0, 0), u('K', 0, 1)]);
      const ids = ev(r, 'revive', e => e.why === 'ally').map(e => e.who);
      ok(ids.includes(uidOf(r, 0, 'G1')), 'วายุถูกชุบ');
      eq(ids.includes(uidOf(r, 0, 'G2')), !same, same ? 'ภูติไม่ถูกชุบ' : 'ภูติถูกชุบ');
    }
    ok(!validateConfig([mk('AA-1', { tribe: 'ภูติ', skills: [{ when: 'hit', do: 'reviveDowned', to: 'self', v: L3(1), sameTribe: true }] })]).errors.some(e => e.includes('AA-1')), 'validate ยอมรับ sameTribe');
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
];
