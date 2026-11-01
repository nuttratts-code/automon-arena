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
const mkRune = (eff, o = {}) => ({ id: 'T0', on: true, del: false, name: 'รูนทดสอบ', max: 1, rarity: 'common', theme: '', scope: 'team', tribe: 'เหล็กกล้า', eff, ...o });
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
    const one = equipRunes(team, [{ r: mkRune('atk', { mode: 'flat', v: 3, scope: 'one' }), slot: [0, 0] }]).units;
    eq(one.map(x => x.skills.filter(s => s.src === 'rune').length), [1, 0], 'รูนตัวเดียวเข้าเฉพาะช่องที่เลือก');
    const all = equipRunes(team, [{ r: mkRune('atk', { mode: 'flat', v: 3, scope: 'team' }), n: 2 }]).units;
    eq(all[0].skills.find(s => s.src === 'rune').value, 6, 'รูนซ้อน 2 ชิ้น = ค่า ×2');
    const dna = equipRunes(team, [{ r: mkRune('addTribe', { gain: 'วายุ', scope: 'one' }), slot: [1, 0] }]).units;
    eq(dna.map(x => x.extraTribes), [[], ['วายุ']], 'รูนเผ่าเข้าเฉพาะตัวที่เลือก');
  }],
  ['รูนโล่ (U4): ศัตรูต้องตีตัวนี้ก่อน · บอสก็ถูกดึงเหมือนกัน', () => {
    const cs = [dummy('A'), dummy('B')];
    const r = bossFight(cs, [u('A', 0, 0), u('B', 2, 1)], boss({ atk: 10, cdMs: 1000 }), {
      runes: [{ r: mkRune('taunt', { armorPct: 0, scope: 'one' }), slot: [2, 1] }],
    });
    const tgt = r.events[0].units.find(x => x.side === 0 && x.id === 'B').uid;
    const hits = ev(r, 'dmg', e => e.why === 'hit');
    ok(hits.length > 0 && hits.every(e => e.to === tgt), 'บอสตีตัวที่ใส่รูนโล่เท่านั้น');
  }],
  ['รูนเลี่ยงจุดตาย (X4): ฮิตที่จะทำให้ down ถูกยกเลิกทั้งฮิต · ครบจำนวนครั้งแล้วตายตามปกติ', () => {
    const cs = [dummy('A', { hp: L3(15) })];
    const r = bossFight(cs, [u('A', 0, 0)], boss({ atk: 100, cdMs: 1000 }), {
      runes: [{ r: mkRune('avoidDeath', { times: 1, scope: 'one' }), slot: [0, 0] }],
    });
    eq(ev(r, 'avoid').length, 1, 'ยกเลิกฮิตมรณะ 1 ครั้ง');
    eq(ev(r, 'down').length, 1, 'ครั้งต่อไป down ตามปกติ');
  }],
  ['รูนชุบ (U2): ลุกกลับมาได้ตามจำนวนครั้งที่ตั้งเท่านั้น', () => {
    const cs = [dummy('A', { hp: L3(30) })];
    const r = bossFight(cs, [u('A', 0, 0)], boss({ atk: 100, cdMs: 1000 }), {
      runes: [{ r: mkRune('revive', { times: 1, hpPct: 50, scope: 'one' }), slot: [0, 0] }],
    });
    eq(ev(r, 'revive').length, 1, 'ลุกได้ครั้งเดียว');
    eq(ev(r, 'down').length, 1, 'หลังจากนั้น down จริง');
  }],
  ['รูนหยุดศัตรู: บอสหยุดสั้นกว่าตามที่ตั้ง (% ของเวลาปกติ)', () => {
    const cs = [dummy('A')];
    const r = bossFight(cs, [u('A', 0, 0)], boss(), {
      runes: [{ r: mkRune('freeze', { sec: 4, bossPct: 50, scope: 'enemy' }) }],
    });
    const st = ev(r, 'buff', e => e.what === 'stun');
    eq(st.length, 1, 'มีผลหยุด 1 ครั้ง');
    eq(st[0].amount, 2000, 'บอสหยุดครึ่งเดียวของ 4 วินาที');
  }],
  ['บอส R4/R5: ตีโดนทุกตัวตาม % ที่ตั้ง · ตีตัวเลือดน้อยสุดก่อน', () => {
    const cs = [dummy('A', { hp: L3(1000) }), dummy('B', { hp: L3(100) })];
    const aoe = bossFight(cs, [u('A', 0, 0), u('B', 1, 0)], boss({ atk: 100, phases: [ph(0, [rl('aoe', 50)])] }));
    const first = ev(aoe, 'dmg', e => e.why === 'hit' && e.t === 1000);
    eq(first.length, 2, 'ฮิตเดียวโดนทั้ง 2 ตัว');
    eq(first.map(e => e.amount), [50, 50], 'ตัวละ 50% ของพลังโจมตี');
    const hunt = bossFight(cs, [u('A', 0, 0), u('B', 2, 1)], boss({ atk: 10, phases: [ph(0, [rl('hunter')])] }));
    const low = hunt.events[0].units.find(x => x.side === 0 && x.id === 'B').uid;
    eq(ev(hunt, 'dmg', e => e.why === 'hit' && e.t === 1000)[0].to, low, 'ตีตัวเลือดน้อยสุด ไม่ใช่ตัวหน้าเลนเดียวกัน');
  }],
  ['บอส E6/R11: คลั่งตีแรงขึ้นทุก 10 วิ · ออร่าไฟทุก 5 วิ', () => {
    const cs = [dummy('A', { hp: L3(5000) })];
    const rage = bossFight(cs, [u('A', 0, 0)], boss({ atk: 10, phases: [ph(0, [rl('enrage', 100)])] }));
    const bu = bossUid(rage);
    const ups = ev(rage, 'atkUp', e => e.to === bu);
    eq(ups.length, 6, 'ทุก 10 วิ ใน 60 วิ = 6 ครั้ง');
    eq(ups[0].amount, 10, 'ครั้งละ 100% ของพลังโจมตีตั้งต้น');
    const aura = bossFight(cs, [u('A', 0, 0)], boss({ atk: 0, cdMs: NEVER, phases: [ph(0, [rl('burnAura', 4)])] }));
    const burns = ev(aura, 'burn', e => e.why === 'boss');
    eq(burns.length, 12, 'ทุก 5 วิ ใน 60 วิ = 12 ครั้ง');
    eq(burns[0].amount, 4, 'ไฟตามค่าที่ตั้ง');
  }],
  ['บอส R15/R27: ปิดสกิลผู้เล่นเป็นช่วง · หายตัวแล้วตีไม่โดน (ไม่มีเป้า)', () => {
    const react = mk('R', { atk: L3(0), cdMs: NEVER, hp: L3(5000), skills: [{ when: 'hitTaken', do: 'atkUp', to: 'self', v: L3(1) }] });
    const sil = bossFight([react], [u('R', 0, 0)], boss({ atk: 10, phases: [ph(0, [rl('randomSilence', 5, 5)])] }));
    ok(ev(sil, 'buff', e => e.what === 'silence').length > 0, 'มีการปิดสกิล');
    const hitAt = t => ev(sil, 'dmg', e => e.why === 'hit' && e.t === t).length > 0;
    ok(hitAt(6000) && ev(sil, 'proc', e => e.t === 6000).length === 0, 'ช่วงถูกปิดสกิล โดนตีแต่สกิลไม่ทำงาน');
    const atk = mk('K', { atk: L3(50), cdMs: 1000, hp: L3(5000) });
    const van = bossFight([atk], [u('K', 0, 0)], boss({ atk: 0, cdMs: NEVER, hp: 100000, phases: [ph(0, [rl('vanish', 10, 3)])] }));
    ok(ev(van, 'set', e => e.target === null).length > 0, 'ช่วงหายตัว ผู้เล่นไม่มีเป้า');
  }],
  ['บอส R28: ตีแถบไม่หมดในเวลา แถบเต็มกลับ (ไม่กระตุ้น "ศัตรู down" ซ้ำ)', () => {
    const h = mk('H', { atk: L3(10), cdMs: L3(3000), hp: L3(5000), skills: [ // ชุด 70: ส่วนเกินไม่ทะลุแถบ → ฮิตปกติทีหลังทำให้แถบ 2 ลดจริง
      { when: 'matchStart', do: 'dmg', to: 'allEnemies', v: L3(250) },
      { when: 'enemyDown', do: 'atkUp', to: 'self', v: L3(1) },
    ] });
    const r = bossFight([h], [u('H', 0, 0)], boss({ atk: 0, cdMs: NEVER, phases: [ph(0, [rl('dpsCheck', 5)])] }));
    const fill = ev(r, 'barRefill');
    ok(fill.length > 0, 'มีแถบเต็มกลับ');
    eq(fill[0].hp, 800, 'เต็มกลับถึงยอดของแถบปัจจุบัน');
    eq(ev(r, 'proc', e => e.when === 'enemyDown').length, 1, '"ศัตรู down" ยังทำงานครั้งเดียว');
  }],
  ['บอส: ผลตอนเปลี่ยนเฟส (เกราะ/ล้างสถานะ/ตีไม่โดน/ผู้เล่นมึนงง) ทำงานครบ', () => {
    const h = mk('H', { atk: L3(0), cdMs: NEVER, hp: L3(5000), skills: [{ when: 'matchStart', do: 'dmg', to: 'allEnemies', v: L3(250) }] });
    const b = boss({ atk: 0, cdMs: NEVER, phases: [ph(0), ph(1, [], [{ id: 'armorBar', v: 50 }, { id: 'cleanse', v: 0 }, { id: 'untargetable', v: 2 }, { id: 'stunAll', v: 2 }])] });
    const r = bossFight([h], [u('H', 0, 0)], b);
    const bu = bossUid(r);
    eq(ev(r, 'armor', e => e.to === bu && e.why === 'boss').map(e => e.amount), [100], 'X1 เกราะ 50% ของ 1 แถบ');
    eq(ev(r, 'buff', e => e.what === 'stun').map(e => e.amount), [2000], 'X4 ผู้เล่นมึนงง 2 วิ');
  }],
  ['บอสแบบย้ายที่: ย้ายตามเวลา · R30 หลังย้ายที่โดนดาเมจเพิ่มชั่วคราว', () => {
    const atk = mk('K', { atk: L3(50), cdMs: 1000, hp: L3(5000) });
    const r = bossFight([atk], [u('K', 0, 0)], boss({ atk: 0, cdMs: NEVER, hp: 100000, spot: 'move', moveSec: 10, phases: [ph(0, [rl('weakSpot', 100)])] }));
    ok(ev(r, 'bossMove').length >= 5, 'ย้ายที่ทุก 10 วิ');
    const amts = new Set(ev(r, 'dmg', e => e.why === 'hit').map(e => e.amount));
    ok(amts.has(50) && amts.has(100), 'มีทั้งฮิตปกติและฮิตช่วงที่โดนเพิ่ม');
  }],
  ['รูน: คู่รับดาเมจแทน · ฮีลเป็นช่วง · เหลือตัวเดียวแรงขึ้น', () => {
    const cs = [dummy('A', { hp: L3(1000) }), dummy('B', { hp: L3(1000) })];
    const link = bossFight(cs, [u('A', 0, 0), u('B', 1, 0)], boss({ atk: 100 }), {
      runes: [{ r: mkRune('link', { pct: 50, scope: 'one' }), slot: [0, 0], partner: [1, 0] }],
    });
    const share = ev(link, 'dmg', e => e.why === 'link');
    ok(share.length > 0 && share[0].amount === 50, 'คู่รับแทนครึ่งหนึ่ง');
    const regen = bossFight([dummy('A', { hp: L3(1000) })], [u('A', 0, 0)], boss({ atk: 200 }), { // ดาเมจมากกว่าที่ฮีล ไม่งั้นฮีลถูกตัดเพราะ HP ไม่ได้หาย
      runes: [{ r: mkRune('regen', { sec: 1, pct: 10, scope: 'team' }) }],
    });
    eq(ev(regen, 'heal')[0].amount, 100, 'ฮีล 10% ของ HP สูงสุด ทุก 1 วิ');
    const solo = [mk('K', { atk: L3(50), cdMs: 1000, hp: L3(5000) })];
    const plain = bossFight(solo, [u('K', 0, 0)], boss({ atk: 0, cdMs: NEVER, hp: 100000 }));
    const last = bossFight(solo, [u('K', 0, 0)], boss({ atk: 0, cdMs: NEVER, hp: 100000 }), {
      runes: [{ r: mkRune('lastStand', { dmgPct: 100, cdPct: 0, scope: 'team' }) }],
    });
    eq([ev(plain, 'dmg', e => e.why === 'hit')[0].amount, ev(last, 'dmg', e => e.why === 'hit')[0].amount], [50, 100], 'เหลือตัวเดียว ดาเมจ +100%');
  }],
  ['รูน: ล่าบอส (+% ใส่บอส) · ป้อมปราการ/แก้วบาง (แลกค่าพลัง) · แลก HP เป็นเกราะ/ฮิต', () => {
    const cs = [mk('K', { atk: L3(50), cdMs: 1000, hp: L3(1000) })];
    const bd = bossFight(cs, [u('K', 0, 0)], boss({ atk: 0, cdMs: NEVER, hp: 100000 }), {
      runes: [{ r: mkRune('bossDmg', { dmgPct: 100, scope: 'team' }) }],
    });
    eq(ev(bd, 'dmg', e => e.why === 'hit')[0].amount, 100, 'ดาเมจใส่บอส ×2');
    const m = makeCharMap(cs), team = buildTeam([u('K', 0, 0)], m);
    const fort = equipRunes(team, [{ r: mkRune('fortress', { hpPct: 30, atkPct: 20, scope: 'team' }) }]).units[0];
    eq([fort.maxHp, fort.atk], [1300, 40], 'ป้อมปราการ: HP +30% พลังโจมตี −20%');
    const hta = equipRunes(team, [{ r: mkRune('hpToArmorHit', { hpPct: 50, rate: 2, scope: 'one' }), slot: [0, 0] }]).units[0];
    eq([hta.maxHp, hta.armorHit], [500, 10], 'แลก HP 50% เป็นเกราะ/ฮิต 2% ของที่ลด');
  }],
  ['ชุด 67: ช่องที่บอสยืนอยู่ในเหตุการณ์เริ่ม (หน้าภาพใส่ชื่อทุกช่อง) · ตัวปกติไม่มี', () => {
    const r = bossFight([dummy('A')], [u('A', 0, 0)], boss());
    const st = r.events[0].units;
    eq(st.find(x => x.side === 1).cells, [0, 1, 2, 3, 4, 5], 'บอส spot all = 6 ช่อง');
    eq(st.find(x => x.side === 0).cells, undefined, 'ตัวปกติไม่มี cells');
  }],
  ['รูนที่เป็นเรื่องของ run (เงิน/ร้าน/ส่องทีม) ไม่มีผลในสนามรบ และถูกรายงานกลับ', () => {
    const cs = [dummy('A')];
    const m = makeCharMap(cs), team = buildTeam([u('A', 0, 0)], m);
    const out = equipRunes(team, [{ r: mkRune('gold', { id: 'T1', gold: 2 }) }, { r: mkRune('scout', { id: 'X9' }) }]);
    eq(out.skipped.length, 2, 'รูน run-flow ถูกข้าม');
    eq(out.units[0].skills.filter(s => s.src === 'rune').length, 0, 'ไม่มีสกิลรูนติดตัว');
  }],
  ['บอส ชุด 69: ขึ้นแถบใหม่ → ล้างดีบัฟทุกอย่าง (ไฟ ช็อต โดนดาเมจเพิ่ม HP สูงสุดที่ถูกตัด) · แถบยังไม่หมด = ยังติดอยู่', () => {
    const d = mk('D', { atk: L3(0), cdMs: NEVER, hp: L3(5000), skills: [
      { when: 'matchStart', do: 'burn', to: 'allEnemies', v: L3(10) },
      { when: 'matchStart', do: 'shock', to: 'allEnemies', v: L3(5) },
      { when: 'matchStart', do: 'dmgTakenUp', to: 'allEnemies', v: L3(50) },
      { when: 'matchStart', do: 'maxHpCut', to: 'allEnemies', v: L3(10) },
    ] });
    const h = mk('H', { atk: L3(250), cdMs: 40000, hp: L3(5000) }); // ชุด 70: ตีปกติครั้งแรก (หลังดีบัฟเริ่มแมตช์) · ดีบัฟที่มาใน tick เดียวกับที่แถบแตกจะหายไปเหมือนม่อน down
    const r = bossFight([d, h], [u('D', 0, 0), u('H', 0, 1)], boss({ hp: 1000 }));
    const b = bossUid(r), bar1 = ev(r, 'bar', e => e.who === b)[0];
    ok(bar1, 'แถบแรกหมด');
    const cl = ev(r, 'cleanse', e => e.to === b && e.what === 'bar');
    eq(cl.length, 1, 'ล้างดีบัฟ 1 ครั้งต่อแถบ');
    eq(cl[0].t, bar1.t, 'ล้างตอนแถบหมด');
    const back = ev(r, 'maxhp', e => e.to === b && e.amount < 0);
    eq(back.length, 1, 'คืน HP สูงสุดที่ถูกตัด'); eq(back[0].maxHp, 1000, 'HP สูงสุดกลับเป็น 1000');
    const r2 = bossFight([d], [u('D', 0, 0)], boss({ hp: 1000 }));
    eq(ev(r2, 'cleanse', e => e.what === 'bar').length, 0, 'แถบไม่หมด = ไม่ล้าง');
  }],
  ['บอส: ตี 1 ครั้งเข้า HP ได้ไม่เกินที่เหลือในแถบปัจจุบัน (ส่วนเกินหาย ไม่ทะลุแถบถัดไป · ชุด 70)', () => {
    const r = bossFight([hitter('H', 900)], [u('H', 0, 0)], boss());
    const d = ev(r, 'dmg', e => e.to === bossUid(r) && e.why === 'skill');
    eq(d[0].amount, 200, 'ฮิต 900 เข้าแค่ 200 (เต็มแถบแรก)');
    eq(ev(r, 'bar').length, 1, 'หมดแค่ 1 แถบ');
    const one = bossFight([hitter('H', 900)], [u('H', 0, 0)], boss({ bars: 1 }));
    eq(ev(one, 'dmg', e => e.why === 'skill')[0].amount, 900, 'บอสแถบเดียว = ไม่จำกัด');
  }],
  ['บอส: แถบแตก = เหมือนม่อน down ใน tick นั้น · ฮิตที่เหลือของมัลติฮิต/สกิลอื่นใน tick เดียวกันหายไป (ชุด 70)', () => {
    const mh = mk('M', { atk: L3(150), cdMs: L3(1000), multi: 3, hp: L3(5000) });
    const r = bossFight([mh], [u('M', 0, 0)], boss({ atk: 0, cdMs: NEVER }));
    const b = bossUid(r);
    const first = ev(r, 'dmg', e => e.to === b && e.why === 'hit');
    const t0 = first[0].t;
    eq(first.filter(e => e.t === t0).map(e => e.amount), [150, 50], 'ชุดแรก: 150 + 50 (เต็มแถบ) แล้วฮิตที่ 3 หาย');
    const two = bossFight([hitter('H', 300), hitter('K', 300)], [u('H', 0, 0), u('K', 0, 1)], boss());
    eq(ev(two, 'dmg', e => e.to === bossUid(two) && e.why === 'skill').length, 1, 'สกิลตัวที่ 2 ใน tick เดียวกันไม่เข้า');
    eq(ev(two, 'bar').length, 1, 'หมดแค่ 1 แถบ');
  }],
  ['บอส: แถบยาวไม่เท่ากัน (ชุด 71) · ฮิตเข้าไม่เกินแถบที่อยู่ · เฟสเปลี่ยนตามแถบ · กฎ "% ของ 1 แถบ" ใช้แถบปัจจุบัน', () => {
    const b = boss({ bars: 3, barPct: [50, 30, 20], phases: [ph(0), ph(1, [rl('noArmor')])] });
    eq(bossUnit(b, 1).barCuts, [1000, 500, 200, 0], 'ขอบแถบ 50/30/20%');
    const r = bossFight([hitter('H', 900)], [u('H', 0, 0)], b);
    eq(ev(r, 'dmg', e => e.to === bossUid(r) && e.why === 'skill')[0].amount, 500, 'ฮิต 900 เข้าแค่ 500 (แถบแรก 50%)');
    eq(ev(r, 'bar').length, 1, 'หมด 1 แถบ'); eq(ev(r, 'phase').pop().rules, ['noArmor'], 'เข้าเฟส 2');
    const cap = bossFight([hitter('H', 900)], [u('H', 0, 0)], boss({ bars: 2, barPct: [80, 20], phases: [ph(0, [rl('hitCap', 10)])] }));
    eq(ev(cap, 'dmg', e => e.why === 'skill')[0].amount, 80, 'R22 10% ของแถบแรก (800) = 80');
  }],
  ['บอส: เกราะ/ฮิต + ฟื้น/ฮิต ของบอส (ชุด 71) · ฟื้นไม่เกินแถบที่อยู่', () => {
    const tank = mk('T', { atk: L3(0), cdMs: NEVER, hp: L3(5000) });
    const r = bossFight([tank], [u('T', 0, 0)], boss({ atk: 10, cdMs: 1000, armorHit: 7 }), { hardStopMs: 3500 });
    const b = bossUid(r);
    eq(ev(r, 'armor', e => e.to === b).map(e => e.amount).slice(0, 3), [7, 7, 7], 'บอสได้เกราะ 7 ทุกฮิต');
    const hr = bossFight([hitter('H', 150), tank], [u('H', 0, 0), u('T', 1, 0)], boss({ atk: 10, cdMs: 1000, healHit: 500 }));
    const healed = ev(hr, 'heal', e => e.to === bossUid(hr));
    ok(healed.length > 0, 'บอสฟื้นตอนตี');
    eq(healed[0].amount, 150, 'ฟื้นเต็มแถบที่อยู่ ไม่เกิน (HP 850 → 1000)');
    const hb = bossFight([hitter('H', 250), tank], [u('H', 0, 0), u('T', 1, 0)], boss({ atk: 10, cdMs: 1000, healHit: 500 }));
    eq(ev(hb, 'heal', e => e.to === bossUid(hb)).length, 0, 'แถบแรกหมดแล้ว (HP 800) ฟื้นกลับไม่ได้');
  }],
];
