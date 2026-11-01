// ชุดทดสอบ: การต่อสู้กับบอส (แถบเลือด เฟส กฎ) + รูนที่ทำงานจริงในสนามรบ (ชุด 66 · phase 2a)
// ตัวช่วยอยู่ helpers.js · ค่าทุกตัวในเทสต์ตั้งเองในไฟล์นี้ ไม่ผูกกับค่าที่ผู้ใช้ปรับในห้องบาลานซ์
import { simulate } from '../core/battle.js';
import { bossUnit } from '../core/boss.js';
import { equipRunes } from '../core/runes.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { NEVER, mk, L3, dummy, u, NT, ev, eq, ok } from './helpers.js';

// กติกาสำหรับเทสต์บอส: ปิดพายุทราย (ไม่งั้นดาเมจพายุไปโดนบอสด้วย ทำให้นับแถบ/ดาเมจไม่ตรง) · จบแมตช์ที่ 60 วิ
const BR_RULES = { ...NT, stormStartMs: 10000000, hardStopMs: 60000 };

// บอสสำหรับเทสต์: HP 1000 แถบ 5 (แถบละ 200) ยืนทุกช่อง ไม่มีกฎ
const boss = (o = {}) => ({
  id: 'B1', name: 'บอสทดสอบ', tribe: 'เหล็กกล้า', hp: 1000, atk: 10, cdMs: 1000, multi: 1,
  bars: 5, spot: 'all', moveSec: 8, armor: 0, burn: 0, shock: 0, mult10: 2, endlessPct: 15, on: true,
  phases: [{ at: 0, rules: [], fx: [], spot: '' }], ...o,
});
const ph = (at, rules = [], fx = [], spot = '') => ({ at, rules, fx, spot });
const rl = (id, v, v2, tribe) => ({ id, v: v ?? 0, ...(v2 != null ? { v2 } : {}), ...(tribe ? { tribe } : {}) });
// สู้กับบอส: A = ทีมผู้เล่น (ฝั่ง 0) · b = ข้อมูลบอส · runes = [{ r, n, slot, partner }]
function bossFight(chars, A, b, { runes, tribes, ...opts } = {}) {
  const m = makeCharMap(chars);
  let team = buildTeam(A, m), tribeExtra = [];
  if (runes) { const out = equipRunes(team, runes); team = out.units; tribeExtra = out.tribeExtra; }
  return simulate(team, [bossUnit(b, 1)], { rules: tribes ? undefined : BR_RULES, tribeExtra, ...opts });
}
const bossUid = r => r.events[0].units.find(x => x.side === 1).uid;
const sumDmg = (r, uid) => ev(r, 'dmg', e => e.to === uid && e.why === 'skill').reduce((a, e) => a + e.amount, 0);
// รูนสำหรับเทสต์ (รูปร่างเดียวกับที่ cleanStage คืนมา)
const rune = (eff, o = {}) => ({ id: 'T0', on: true, del: false, name: 'รูนทดสอบ', max: 1, rarity: 'common', theme: '', scope: 'team', tribe: 'เหล็กกล้า', eff, ...o });
// ตัวตีที่ปล่อยดาเมจครั้งเดียวตอนเริ่มแมตช์ (ควบคุมดาเมจได้แน่นอน)
const hitter = (id, v, to = 'allEnemies', o = {}) => mk(id, { atk: L3(0), cdMs: NEVER, hp: L3(5000), skills: [{ when: 'matchStart', do: 'dmg', to, v: L3(v) }], ...o });

export const TESTS_BOSS = [
  ['บอส: ยืนทุกช่อง → สกิลเล็งแถวหลังเจอบอส · ยืนแถวหน้าอย่างเดียว = ไม่เจอ', () => {
    const cs = [hitter('H', 100, 'enemyBackRow')];
    const all = bossFight(cs, [u('H', 2, 0)], boss());
    eq(sumDmg(all, bossUid(all)), 100, 'ยืนทุกช่อง: แถวหลังเจอบอส');
    const front = bossFight(cs, [u('H', 2, 0)], boss({ spot: 'front' }));
    eq(sumDmg(front, bossUid(front)), 0, 'ยืนแถวหน้า: สกิลแถวหลังไม่มีเป้า');
  }],
  ['บอส: สกิลเล็งทั้งแถว โดนบอสครั้งเดียวต่อการใช้สกิล (ไม่โดนซ้ำตามจำนวนช่อง)', () => {
    const r = bossFight([hitter('H', 60, 'enemyFrontRow')], [u('H', 0, 0)], boss());
    eq(ev(r, 'dmg', e => e.why === 'skill').length, 1, 'ดาเมจเข้าครั้งเดียว');
  }],
  ['บอส: แถบเลือดหมด 1 แถบ = "ศัตรู down" ของสกิลผู้เล่น (แถบละ HP รวม ÷ จำนวนแถบ)', () => {
    const h = mk('H', { atk: L3(0), cdMs: NEVER, hp: L3(5000), skills: [
      { when: 'matchStart', do: 'dmg', to: 'allEnemies', v: L3(250) },
      { when: 'enemyDown', do: 'atkUp', to: 'self', v: L3(7) },
    ] });
    const r = bossFight([h], [u('H', 0, 0)], boss());
    eq(ev(r, 'bar').length, 1, 'แถบหมด 1 แถบพอดี');
    eq(ev(r, 'proc', e => e.when === 'enemyDown').length, 1, 'สกิล "ศัตรู down" ทำงาน 1 ครั้ง (แถบละครั้ง ไม่ซ้ำ)');
  }],
  ['บอส: เปลี่ยนเฟสเมื่อแถบหมดตามที่ตั้ง · กฎเฟสใหม่แทนที่กฎเก่า', () => {
    const b = boss({ phases: [ph(0, [rl('armorCut', 50)]), ph(1, [rl('noArmor')])] });
    const r = bossFight([hitter('H', 250)], [u('H', 0, 0)], b);
    const p = ev(r, 'phase');
    eq(p.length >= 2, true, 'มีเหตุการณ์เปลี่ยนเฟส');
    eq(p[p.length - 1].rules, ['noArmor'], 'กฎของเฟสล่าสุด');
  }],
  ['บอส R22: ตี 1 ครั้งเข้าได้ไม่เกิน % ของ 1 แถบ · R23: ฮิตต่ำกว่าเกณฑ์ไม่เข้า', () => {
    const cap = bossFight([hitter('H', 250)], [u('H', 0, 0)], boss({ phases: [ph(0, [rl('hitCap', 10)])] }));
    eq(ev(cap, 'dmg', e => e.why === 'skill')[0].amount, 20, 'เพดาน 10% ของแถบ 200');
    const small = bossFight([hitter('H', 10)], [u('H', 0, 0)], boss({ phases: [ph(0, [rl('minHit', 50)])] }));
    eq(ev(small, 'dmg', e => e.why === 'skill').length, 0, 'ฮิตเล็กไม่เข้า');
  }],
  ['บอส R24/R25/R26: ไม่ติดไฟ · โดนเผ่าที่เลือกแรงขึ้น · ตีได้เฉพาะแถวหน้า', () => {
    const burner = mk('B', { atk: L3(0), cdMs: NEVER, hp: L3(5000), skills: [{ when: 'matchStart', do: 'burn', to: 'allEnemies', v: L3(10) }] });
    const imm = bossFight([burner], [u('B', 0, 0)], boss({ phases: [ph(0, [rl('statusImmune')])] }));
    eq(ev(imm, 'burn').length, 0, 'บอสไม่ติดไฟ');
    const weak = bossFight([hitter('H', 100, 'allEnemies', { tribe: 'วายุ' })], [u('H', 0, 0)], boss({ phases: [ph(0, [rl('tribeWeak', 100, null, 'วายุ')])] }));
    eq(ev(weak, 'dmg', e => e.why === 'skill')[0].amount, 200, 'เผ่าที่บอสกลัว ดาเมจ ×2');
    const back = bossFight([hitter('H', 100)], [u('H', 2, 0)], boss({ phases: [ph(0, [rl('frontOnly')])] }));
    eq(ev(back, 'dmg', e => e.why === 'skill').length, 0, 'ตัวแถวหลังตีบอสไม่เข้า');
  }],
  ['บอส R8: ดูดเลือดฟื้นได้ไม่เกินยอดของแถบปัจจุบัน (กันแถบที่หมดแล้วเต็มกลับ)', () => {
    const h = mk('H', { atk: L3(0), cdMs: NEVER, hp: L3(60), skills: [{ when: 'matchStart', do: 'dmg', to: 'allEnemies', v: L3(250) }] });
    const r = bossFight([h], [u('H', 0, 0)], boss({ atk: 20, phases: [ph(0, [rl('lifesteal', 1000)])] }));
    const b = r.units.find(x => x.side === 1);
    ok(b.hp <= 800, `บอสฟื้นเกินแถบ: ${b.hp}`);
  }],
  ['รูน: ค่าพลังทั้งทีม/ตัวเดียว · รูนเผ่า (DNA) นับเป็นเผ่าจริง', () => {
    const cs = [dummy('A'), dummy('B')];
    const m = makeCharMap(cs), team = buildTeam([u('A', 0, 0), u('B', 1, 0)], m);
    const one = equipRunes(team, [{ r: rune('atk', { mode: 'flat', v: 3, scope: 'one' }), slot: [0, 0] }]).units;
    eq(one.map(x => x.skills.filter(s => s.src === 'rune').length), [1, 0], 'รูนตัวเดียวเข้าเฉพาะช่องที่เลือก');
    const all = equipRunes(team, [{ r: rune('atk', { mode: 'flat', v: 3, scope: 'team' }), n: 2 }]).units;
    eq(all[0].skills.find(s => s.src === 'rune').value, 6, 'รูนซ้อน 2 ชิ้น = ค่า ×2');
    const dna = equipRunes(team, [{ r: rune('addTribe', { gain: 'วายุ', scope: 'one' }), slot: [1, 0] }]).units;
    eq(dna.map(x => x.extraTribes), [[], ['วายุ']], 'รูนเผ่าเข้าเฉพาะตัวที่เลือก');
  }],
  ['รูนโล่ (U4): ศัตรูต้องตีตัวนี้ก่อน · บอสก็ถูกดึงเหมือนกัน', () => {
    const cs = [dummy('A'), dummy('B')];
    const r = bossFight(cs, [u('A', 0, 0), u('B', 2, 1)], boss({ atk: 10, cdMs: 1000 }), {
      runes: [{ r: rune('taunt', { armorPct: 0, scope: 'one' }), slot: [2, 1] }],
    });
    const tgt = r.events[0].units.find(x => x.side === 0 && x.id === 'B').uid;
    const hits = ev(r, 'dmg', e => e.why === 'hit');
    ok(hits.length > 0 && hits.every(e => e.to === tgt), 'บอสตีตัวที่ใส่รูนโล่เท่านั้น');
  }],
  ['รูนเลี่ยงจุดตาย (X4): ฮิตที่จะทำให้ down ถูกยกเลิกทั้งฮิต · ครบจำนวนครั้งแล้วตายตามปกติ', () => {
    const cs = [dummy('A', { hp: L3(15) })];
    const r = bossFight(cs, [u('A', 0, 0)], boss({ atk: 100, cdMs: 1000 }), {
      runes: [{ r: rune('avoidDeath', { times: 1, scope: 'one' }), slot: [0, 0] }],
    });
    eq(ev(r, 'avoid').length, 1, 'ยกเลิกฮิตมรณะ 1 ครั้ง');
    eq(ev(r, 'down').length, 1, 'ครั้งต่อไป down ตามปกติ');
  }],
  ['รูนชุบ (U2): ลุกกลับมาได้ตามจำนวนครั้งที่ตั้งเท่านั้น', () => {
    const cs = [dummy('A', { hp: L3(30) })];
    const r = bossFight(cs, [u('A', 0, 0)], boss({ atk: 100, cdMs: 1000 }), {
      runes: [{ r: rune('revive', { times: 1, hpPct: 50, scope: 'one' }), slot: [0, 0] }],
    });
    eq(ev(r, 'revive').length, 1, 'ลุกได้ครั้งเดียว');
    eq(ev(r, 'down').length, 1, 'หลังจากนั้น down จริง');
  }],
  ['รูนหยุดศัตรู: บอสหยุดสั้นกว่าตามที่ตั้ง (% ของเวลาปกติ)', () => {
    const cs = [dummy('A')];
    const r = bossFight(cs, [u('A', 0, 0)], boss(), {
      runes: [{ r: rune('freeze', { sec: 4, bossPct: 50, scope: 'enemy' }) }],
    });
    const st = ev(r, 'buff', e => e.what === 'stun');
    eq(st.length, 1, 'มีผลหยุด 1 ครั้ง');
    eq(st[0].amount, 2000, 'บอสหยุดครึ่งเดียวของ 4 วินาที');
  }],
  ['รูนที่เป็นเรื่องของ run (เงิน/ร้าน/ส่องทีม) ไม่มีผลในสนามรบ และถูกรายงานกลับ', () => {
    const cs = [dummy('A')];
    const m = makeCharMap(cs), team = buildTeam([u('A', 0, 0)], m);
    const out = equipRunes(team, [{ r: rune('gold', { id: 'T1', gold: 2 }) }, { r: rune('scout', { id: 'X9' }) }]);
    eq(out.skipped.length, 2, 'รูน run-flow ถูกข้าม');
    eq(out.units[0].skills.filter(s => s.src === 'rune').length, 0, 'ไม่มีสกิลรูนติดตัว');
  }],
];
