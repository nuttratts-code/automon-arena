// ชุดทดสอบ: โบนัสเผ่า (tribe-rules) นับเผ่า ค่ากลางตามเผ่า × ความหายาก · แยกจาก mechanics.js (ชุด D) · ตัวช่วยอยู่ helpers.js
import { buildCharacterList } from '../core/characters.js';
import { RULES, midStats } from '../core/rules.js';
import { dataHash } from '../core/save.js';
import { countTribes, makeCharMap } from '../core/team.js';
import { NEVER, mk, L3, dummy, u, fightT, TBN, TBR, ev, eq, ok } from './helpers.js';
export const TESTS_TRIBE = [
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
  ['ปิดโบนัสเผ่ารายฝั่งได้ (ใช้ทดสอบบาลานซ์)', () => {
    const r = fightT([mk('S1'), mk('S2')], [u('S1', 0, 0), u('S2', 0, 1)], [u('S1', 0, 0), u('S2', 0, 1)], { tribesOff: [false, true] });
    eq(r.events[0].tribes, [{ 'เหล็กกล้า': 2 }, {}], 'ขั้นที่เปิดแต่ละฝั่ง');
  }],
  ['นับเผ่า: ตัวซ้ำนับครั้งเดียว เผ่าเพิ่มนับด้วย', () => {
    const c = countTribes([u('X'), u('X', 1, 0), u('Y', 2, 0)], makeCharMap([mk('X', { tribe: 'เหล็กกล้า', extraTribes: ['เพลิงเผา'] }), mk('Y', { tribe: 'เพลิงเผา' })])); // ชุด 16: ตัวทดสอบเอง ไม่ผูกกับค่าตัวละครจริง
    eq([c['เหล็กกล้า'], c['เพลิงเผา']], [1, 2], 'เหล็กกล้า, เพลิงเผา');
  }],
  ['ค่ากลางตามเผ่า × ความหายาก ตรง tribe-rules V1.15 (ชุด 20)', () => {
    eq(midStats('เหล็กกล้า', 'ไม่ธรรมดา'), { hp: [250, 500, 1000], atk: [5, 10, 20] }, 'เหล็กกล้า ไม่ธรรมดา');
    eq(midStats('อสูร', 'ตำนาน').atk[0], 31, 'อสูร ตำนาน พลังโจมตี');
    eq(midStats('วายุ', 'หายากมาก').hp[0], 255, 'วายุ หายากมาก HP');
    eq(midStats('ภูติ', 'xx'), null, 'ความหายากผิด');
  }],
];
