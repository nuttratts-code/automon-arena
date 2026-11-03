// ชุดทดสอบ: การต่อสู้กับบอส (แถบเลือด เฟส กฎ) + รูนที่ทำงานจริงในสนามรบ (ชุด 66 · phase 2a)
// ตัวช่วยอยู่ helpers.js · ค่าทุกตัวในเทสต์ตั้งเองในไฟล์นี้ ไม่ผูกกับค่าที่ผู้ใช้ปรับในห้องบาลานซ์
import { simulate } from '../core/battle.js';
import { bossUnit } from '../core/boss.js';
import { equipRunes } from '../core/runes.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { NEVER, mk, L3, dummy, u, NT, ev, eq, ok } from './helpers.js';
import { simLine, bossRuleText } from '../game/labels.js';

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
  ['บอส: เฟสใหม่ตั้งค่าบอสใหม่ได้ (ชุด 71) · พลังโจมตี/มัลติฮิต เปลี่ยนตอนเข้าเฟส · ค่าที่ไม่ตั้งใช้ค่าเฟสก่อน', () => {
    const tank = mk('T', { atk: L3(0), cdMs: NEVER, hp: L3(50000) });
    const b = boss({ atk: 10, cdMs: 1000, phases: [ph(0), { ...ph(1), stats: { atk: 30, multi: 2 } }, { ...ph(2), stats: { cdMs: 500 } }] });
    const slow = mk('S', { atk: L3(200), cdMs: L3(5000), hp: L3(50000) }); // แถบ 1 หมดตอนเริ่ม (เฟส 2) · ตีปกติ 5 วิ ทำแถบ 2 หมด (เฟส 3)
    const r = bossFight([hitter('H', 200), slow, tank], [u('H', 0, 0), u('S', 0, 1), u('T', 1, 0)], b);
    const bu = bossUid(r), hits = ev(r, 'dmg', e => e.from === bu && e.why === 'hit');
    const p2 = ev(r, 'phase', e => e.i === 1)[0], p3 = ev(r, 'phase', e => e.i === 2)[0];
    ok(p2 && p3, 'เข้าเฟส 2 และ 3'); eq(p2.stats, { atk: 30, multi: 2 }, 'บันทึกค่าใหม่ของเฟส');
    const after = hits.filter(e => e.t > p3.t);
    ok(after.length >= 4 && after.every(e => e.amount === 30), 'เฟส 3 ยังตี 30 (ใช้ค่าเฟส 2)');
    const times = [...new Set(after.map(e => e.t))]; ok(times.length >= 2 && times[1] - times[0] === 500, 'เฟส 3 คูลดาวน์ 0.5 วิ');
    eq(after.filter(e => e.t === times[0]).length, 2, 'มัลติฮิต 2 ยังอยู่');
    const k2 = bossUnit(b, 2).phases[1].stats; eq(k2.atk, 60, 'ด่าน 10: พลังโจมตีเฟสคูณตามด่าน (× 2)');
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
  ['บอส: กฎใหม่ชุด 71 (R31–R38) ทำงานตามที่เขียน', () => {
    const tank = (id, o = {}) => mk(id, { atk: L3(0), cdMs: NEVER, hp: L3(50000), ...o });
    // R31 ทะลุเกราะ: เป้ามีเกราะ แต่ดาเมจเข้า HP เต็ม
    const pr = bossFight([tank('T', { armor: L3(1000) })], [u('T', 0, 0)], boss({ atk: 10, phases: [ph(0, [rl('pierce')])] }));
    const ph1 = ev(pr, 'dmg', e => e.why === 'hit')[0]; ok(ph1 && ph1.absorbed === 0 && ph1.amount === 10, 'R31 ไม่โดนเกราะกัน ' + JSON.stringify(ph1));
    // R32 หนาม: ตีบอสด้วยฮิตปกติ โดนกลับ 3
    const hitMe = mk('A', { atk: L3(5), cdMs: L3(1000), hp: L3(5000) });
    const th = bossFight([hitMe], [u('A', 0, 0)], boss({ atk: 0, cdMs: NEVER, phases: [ph(0, [rl('thorns', 3)])] }));
    const aU = th.events[0].units.find(x => x.side === 0).uid;
    ok(ev(th, 'dmg', e => e.to === aU && e.why === 'reflect' && e.amount === 3).length >= 2, 'R32 หนาม 3 ต่อฮิต');
    // R33 มึนงง · R34 ตีเบาลง · R35 คูลดาวน์เพิ่ม
    const pl = bossFight([tank('T')], [u('T', 0, 0)], boss({ atk: 0, cdMs: NEVER, phases: [ph(0, [rl('stunPulse', 5, 2), rl('atkDrain', 5, 10), rl('cdPulse', 5, 1)])] }));
    eq(ev(pl, 'buff', e => e.what === 'stun' && e.t <= 10000).map(e => [e.t, e.amount]), [[5000, 2000], [10000, 2000]], 'R33 ทุก 5 วิ มึนงง 2 วิ');
    eq(ev(pl, 'buff', e => e.what === 'atkDrain' && e.t <= 10000).map(e => e.amount), [10, 10], 'R34 ตีเบาลง 10% ทุก 5 วิ');
    eq(ev(pl, 'buff', e => e.what === 'freeze' && e.t <= 10000).map(e => e.amount), [1000, 1000], 'R35 คูลดาวน์ +1 วิ ทุก 5 วิ');
    // R36 เกราะเป็นจังหวะ (% ของ 1 แถบ = 200) · R37 ล้างไฟ
    const burner = mk('B', { atk: L3(1), cdMs: L3(1000), hp: L3(5000), burn: L3(5) });
    const sh = bossFight([burner], [u('B', 0, 0)], boss({ atk: 0, cdMs: NEVER, phases: [ph(0, [rl('shieldPulse', 5, 10), rl('cleansePulse', 4)])] }));
    const bu = bossUid(sh);
    eq(ev(sh, 'armor', e => e.to === bu && e.t <= 6000).map(e => [e.t, e.amount]), [[5000, 20]], 'R36 เกราะ 10% ของแถบ (200) ที่ 5 วิ');
    ok(ev(sh, 'cleanse', e => e.to === bu && e.t === 4000).length === 1, 'R37 ล้างไฟที่ 4 วิ');
    // R38 แถบหาย = ระเบิดใส่ผู้เล่นทุกตัว
    const bl = bossFight([hitter('H', 200), tank('T')], [u('H', 0, 0), u('T', 1, 0)], boss({ atk: 0, cdMs: NEVER, phases: [ph(0, [rl('barBlast', 25)])] }));
    eq(ev(bl, 'dmg', e => e.from === bossUid(bl) && e.why === 'skill').map(e => e.amount), [25, 25], 'R38 ระเบิด 25 ใส่ทุกตัว');
  }],
  // ชุด 73: เทส 8 กฎที่เสี่ยงผิดเงียบ ๆ (R7, R9, R10, R13, R14, R16, R26, E7 สะท้อน)
  ['บอส R7: ฮิตบอสทำเลือดเหลือต่ำกว่าเกณฑ์ = down ทันที · เหลือเท่าเกณฑ์ขึ้นไป = ไม่ down', () => {
    const v = dummy('V', { hp: L3(100) });
    const ex = bossFight([v], [u('V', 0, 0)], boss({ atk: 90, phases: [ph(0, [rl('execute', 15)])] }));
    eq(ev(ex, 'down').map(e => e.t), [1000], 'เหลือ 10% (< 15%) → down ตั้งแต่ฮิตแรก');
    const safe = bossFight([v], [u('V', 0, 0)], boss({ atk: 85, phases: [ph(0, [rl('execute', 15)])] }));
    eq(ev(safe, 'down').map(e => e.t), [2000], 'เหลือ 15% พอดี → ไม่ execute (down ฮิตที่ 2 ตามปกติ)');
    const plain = bossFight([v], [u('V', 0, 0)], boss({ atk: 90 }));
    eq(ev(plain, 'down').map(e => e.t), [2000], 'ไม่มีกฎ → down ฮิตที่ 2');
  }],
  ['บอส R9: ฟื้นทุก 1 วิ (% ของ 1 แถบ) · ไม่เกินแถบที่อยู่ · แถบที่หมดแล้วไม่เต็มกลับ', () => {
    const b = boss({ atk: 0, cdMs: NEVER, phases: [ph(0, [rl('regen', 3)])] });
    const r = bossFight([hitter('H', 150)], [u('H', 0, 0)], b);
    const hs = ev(r, 'heal', e => e.to === bossUid(r));
    eq(hs.slice(0, 3).map(e => [e.t, e.amount]), [[1000, 6], [2000, 6], [3000, 6]], 'ฟื้น 6 (3% ของ 200) ทุกวิ');
    eq(hs.reduce((a, e) => a + e.amount, 0), 150, 'ฟื้นรวมแค่ที่หายไป (850 → 1000) ไม่เกิน');
    const gone = bossFight([hitter('H', 250)], [u('H', 0, 0)], b);
    eq(ev(gone, 'heal', e => e.to === bossUid(gone)).length, 0, 'แถบแรกหมด (HP 800) → ไม่ฟื้นกลับ');
    eq(gone.units.find(x => x.side === 1).hp, 800, 'HP บอสค้างที่ 800');
  }],
  ['บอส R10: ได้เกราะเพิ่มทุก 10 วิ · เกราะกันฮิตผู้เล่นจริง', () => {
    const k = mk('K', { atk: L3(5), cdMs: L3(1000), hp: L3(5000) });
    const r = bossFight([k], [u('K', 0, 0)], boss({ atk: 0, cdMs: NEVER, hp: 100000, phases: [ph(0, [rl('armorGrow', 20)])] }));
    const bu = bossUid(r);
    const ar = ev(r, 'armor', e => e.to === bu && e.why === 'boss');
    eq(ar.map(e => e.t), [10000, 20000, 30000, 40000, 50000, 60000], 'ทุก 10 วิ ใน 60 วิ = 6 ครั้ง');
    eq(ar[0].amount, 20, 'ครั้งละ 20');
    const hits = ev(r, 'dmg', e => e.to === bu && e.why === 'hit');
    ok(hits.filter(e => e.t < 10000).every(e => e.absorbed === 0), 'ก่อน 10 วิ ไม่มีเกราะกัน');
    eq(hits.find(e => e.t === 11000)?.absorbed, 5, 'หลัง 10 วิ เกราะกันฮิต 5');
  }],
  ['บอส R13 คลั่ง: บอสตีแรง ×2 · บอสโดนดาเมจเพิ่ม %', () => {
    const tank = dummy('T', { hp: L3(5000) });
    const r = bossFight([hitter('H', 100), tank], [u('H', 2, 0), u('T', 0, 0)], boss({ atk: 10, phases: [ph(0, [rl('desperate', 50)])] }));
    const bu = bossUid(r);
    eq(ev(r, 'dmg', e => e.from === bu && e.why === 'hit')[0].amount, 20, 'ตี 10 → 20');
    eq(sumDmg(r, bu), 150, 'โดน 100 → 150 (+50%)');
  }],
  ['บอส R14: ผู้เล่น down → บอสฟื้น % ของ 1 แถบ · ไม่เกินแถบที่อยู่ · แถบที่หมดแล้วไม่เต็มกลับ', () => {
    const w = dummy('W', { hp: L3(10) }), h = hitter('H', 150, 'allEnemies', { hp: L3(50000) });
    const b = boss({ atk: 100, phases: [ph(0, [rl('feedOnDown', 50)])] });
    const r = bossFight([w, h], [u('W', 0, 0), u('H', 2, 0)], b);
    const bu = bossUid(r), d1 = ev(r, 'down')[0];
    const hs = ev(r, 'heal', e => e.to === bu);
    eq(hs.map(e => [e.t, e.amount]), [[d1.t, 100]], 'ฟื้น 100 (50% ของ 200) ตอนผู้เล่น down · HP 850 → 950');
    const r2 = bossFight([w, hitter('H', 50, 'allEnemies', { hp: L3(50000) })], [u('W', 0, 0), u('H', 2, 0)], b);
    eq(ev(r2, 'heal', e => e.to === bossUid(r2)).map(e => e.amount), [50], 'HP 950 → ฟื้นแค่ 50 ถึงยอดแถบ');
    const gone = bossFight([w, hitter('H', 250, 'allEnemies', { hp: L3(50000) })], [u('W', 0, 0), u('H', 2, 0)], b);
    eq(ev(gone, 'heal', e => e.to === bossUid(gone)).length, 0, 'แถบแรกหมด (HP 800) → ไม่ฟื้นกลับ');
    eq(ev(gone, 'bar').length, 1, 'ไม่มี "ศัตรู down" ซ้ำ');
  }],
  ['บอส R16: ทุก X วิ แช่แข็งผู้เล่นทั้งแถว (คูลดาวน์ +วิ) · ตีช้าลงจริง', () => {
    const ks = ['A', 'B', 'C'].map(id => mk(id, { atk: L3(1), cdMs: L3(1000), hp: L3(5000) }));
    const r = bossFight(ks, [u('A', 0, 0), u('B', 1, 0), u('C', 2, 0)], boss({ atk: 0, cdMs: NEVER, hp: 100000, phases: [ph(0, [rl('freezeRow', 10, 2)])] }));
    const fz = ev(r, 'buff', e => e.what === 'freeze');
    eq(fz.map(e => [e.t, e.amount]), [10000, 20000, 30000, 40000, 50000, 60000].map(t => [t, 2000]), 'ทุก 10 วิ แถวละ 1 ตัว · คูลดาวน์ +2 วิ');
    const f0 = fz[0], bu = bossUid(r);
    const hitT = uid => ev(r, 'dmg', e => e.from === uid && e.to === bu && e.why === 'hit').map(e => e.t);
    const mine = hitT(f0.to);
    eq(mine.filter(t => t >= 9000 && t <= 13000), [9000, 12000, 13000], 'ตัวที่โดนแช่: ฮิตที่ถึงรอบตอน 10 วิ เลื่อนไป 12 วิ (ช้า 2 วิ)');
    const other = r.events[0].units.find(x => x.side === 0 && x.uid !== f0.to).uid;
    eq(hitT(other).filter(t => t >= 9000 && t <= 13000), [9000, 10000, 11000, 12000, 13000], 'ตัวแถวอื่นตีตามปกติ');
  }],
  ['บอส R26 (แถวหลัง): ตีบอสได้เฉพาะตัวแถวหลัง · แถวหน้า/กลางไม่เข้า', () => {
    const b = boss({ phases: [ph(0, [rl('backOnly')])] });
    for (const row of [0, 1]) {
      const r = bossFight([hitter('H', 100)], [u('H', row, 0)], b);
      eq(ev(r, 'dmg', e => e.why === 'skill').length, 0, `แถว ${row} ตีไม่เข้า`);
    }
    const back = bossFight([hitter('H', 100)], [u('H', 2, 0)], b);
    eq(sumDmg(back, bossUid(back)), 100, 'แถวหลังตีเข้าเต็ม');
  }],
  ['บอส E7 สะท้อน: ตีบอสโดนกลับ % ของดาเมจที่เข้าจริง · ของที่สะท้อนไม่สะท้อนต่อ', () => {
    const b = boss({ atk: 0, cdMs: NEVER, phases: [ph(0, [rl('reflect', 10)])] });
    const r = bossFight([hitter('H', 150)], [u('H', 0, 0)], b);
    const hu = r.events[0].units.find(x => x.side === 0).uid, bu = bossUid(r);
    eq(ev(r, 'dmg', e => e.to === hu && e.why === 'reflect').map(e => e.amount), [15], 'โดนกลับ 15 (10% ของ 150) ครั้งเดียว');
    eq(ev(r, 'dmg', e => e.to === bu && e.why === 'reflect').length, 0, 'บอสไม่โดนสะท้อนต่อ');
    const cap = bossFight([hitter('H', 900)], [u('H', 0, 0)], b);
    eq(ev(cap, 'dmg', e => e.why === 'reflect').map(e => e.amount), [20], 'ฮิต 900 เข้าจริง 200 (เพดานแถบ) → สะท้อน 20');
  }],
  // ชุด 74: เทสกฎบอสที่เหลือ 15 ข้อ (E2 E3 E4 E5 R1 R2 R3 R6 R12 R18 R19 R20 R21 R25 R29)
  ['บอส R1/R2/R3: ตีแรงขึ้น % · คูลดาวน์เร็วขึ้น % · มัลติฮิตเพิ่ม', () => {
    const tank = dummy('T', { hp: L3(50000) });
    const hits = r => ev(r, 'dmg', e => e.from === bossUid(r) && e.why === 'hit');
    const up = bossFight([tank], [u('T', 0, 0)], boss({ atk: 10, phases: [ph(0, [rl('atkUp', 30)])] }));
    eq(hits(up)[0].amount, 13, 'R1 ตี 10 → 13 (+30%)');
    const fast = bossFight([tank], [u('T', 0, 0)], boss({ atk: 10, cdMs: 2000, phases: [ph(0, [rl('fastAtk', 50)])] }));
    eq(hits(fast).slice(0, 3).map(e => e.t), [1000, 2000, 3000], 'R2 คูลดาวน์ 2 วิ −50% = ตีทุก 1 วิ (รวมรอบแรก)');
    const plain = bossFight([tank], [u('T', 0, 0)], boss({ atk: 10, cdMs: 2000 }));
    eq(hits(plain).slice(0, 2).map(e => e.t), [2000, 4000], 'ไม่มีกฎ = ทุก 2 วิ');
    const multi = bossFight([tank], [u('T', 0, 0)], boss({ atk: 10, phases: [ph(0, [rl('multiUp', 2)])] }));
    eq(hits(multi).filter(e => e.t === 1000).length, 3, 'R3 มัลติฮิต 1 + 2 = 3 ฮิตต่อชุด');
  }],
  ['บอส R6: ตีแถวหลังก่อน (แม้มีตัวแถวหน้าเลนเดียวกัน) · ไม่มีแถวหลัง = ตีตามปกติ', () => {
    const cs = [dummy('A', { hp: L3(5000) }), dummy('B', { hp: L3(5000) })];
    const r = bossFight(cs, [u('A', 0, 0), u('B', 2, 0)], boss({ atk: 10, phases: [ph(0, [rl('backStrike')])] }));
    const uid = id => r.events[0].units.find(x => x.side === 0 && x.id === id).uid;
    ok(ev(r, 'dmg', e => e.why === 'hit').every(e => e.to === uid('B')), 'ตีตัวแถวหลังเท่านั้น');
    const plain = bossFight(cs, [u('A', 0, 0), u('B', 2, 0)], boss({ atk: 10 }));
    ok(ev(plain, 'dmg', e => e.why === 'hit').every(e => e.to === uid('A')), 'ไม่มีกฎ = ตีตัวหน้า');
    const noBack = bossFight(cs, [u('A', 0, 0), u('B', 1, 0)], boss({ atk: 10, phases: [ph(0, [rl('backStrike')])] }));
    ok(ev(noBack, 'dmg', e => e.why === 'hit').length > 0, 'ไม่มีแถวหลัง = ยังตีตัวอื่นได้');
  }],
  ['บอส R12: ทุก 5 วิ สุ่มผู้เล่น 1 ตัวติดช็อต', () => {
    const r = bossFight([dummy('A', { hp: L3(5000) })], [u('A', 0, 0)], boss({ atk: 0, cdMs: NEVER, phases: [ph(0, [rl('shockAura', 3)])] }));
    const sh = ev(r, 'shock', e => e.why === 'boss');
    eq(sh.length, 12, 'ทุก 5 วิ ใน 60 วิ = 12 ครั้ง');
    eq(sh.slice(0, 2).map(e => [e.t, e.amount]), [[5000, 3], [10000, 3]], 'ช็อต 3 ที่ 5 วิ และ 10 วิ');
  }],
  ['บอส R18: แถวหน้าผู้เล่นโดนดาเมจเพิ่ม % · แถวกลางไม่โดนเพิ่ม', () => {
    const b = boss({ atk: 10, phases: [ph(0, [rl('frontBreak', 50)])] });
    const front = bossFight([dummy('A', { hp: L3(5000) })], [u('A', 0, 0)], b);
    eq(ev(front, 'dmg', e => e.why === 'hit')[0].amount, 15, 'แถวหน้า 10 → 15');
    const mid = bossFight([dummy('A', { hp: L3(5000) })], [u('A', 1, 0)], b);
    eq(ev(mid, 'dmg', e => e.why === 'hit')[0].amount, 10, 'แถวกลาง 10 เท่าเดิม');
  }],
  ['บอส R19: สลับแถวหน้ากับแถวหลังของผู้เล่นตอนเข้าเฟส · แถวกลางอยู่ที่เดิม', () => {
    const b = boss({ phases: [ph(0, [rl('rowSwap'), rl('backOnly')])] }); // ตีบอสได้เฉพาะแถวหลัง = ตรวจว่าย้ายแถวจริง
    const fr = bossFight([hitter('H', 100)], [u('H', 0, 0)], b);
    eq(sumDmg(fr, bossUid(fr)), 100, 'แถวหน้าถูกย้ายไปแถวหลัง → ตีเข้า');
    const bk = bossFight([hitter('H', 100)], [u('H', 2, 0)], b);
    eq(sumDmg(bk, bossUid(bk)), 0, 'แถวหลังถูกย้ายไปแถวหน้า → ตีไม่เข้า');
    const md = bossFight([hitter('H', 100)], [u('H', 1, 0)], b);
    eq(sumDmg(md, bossUid(md)), 0, 'แถวกลางอยู่ที่เดิม → ตีไม่เข้า');
  }],
  ['บอส R20: ชุบชีวิตไม่ได้ (รูนชุบไม่ทำงาน)', () => {
    const run = rules => bossFight([dummy('A', { hp: L3(30) })], [u('A', 0, 0)], boss({ atk: 100, phases: [ph(0, rules)] }), {
      runes: [{ r: mkRune('revive', { times: 1, hpPct: 50, scope: 'one' }), slot: [0, 0] }],
    });
    const r = run([rl('noRevive')]);
    eq(ev(r, 'revive').length, 0, 'ไม่ลุก');
    eq(ev(r, 'down').map(e => e.t), [1000], 'down ตั้งแต่ฮิตแรก');
    eq(ev(run([]), 'revive').length, 1, 'ไม่มีกฎ = รูนชุบทำงาน');
  }],
  ['บอส R21: พายุทรายเริ่มทันทีเมื่อเข้าเฟส', () => {
    const tank = dummy('T', { hp: L3(50000) });
    const b = boss({ atk: 0, cdMs: NEVER, phases: [ph(0), ph(1, [rl('earlyStorm')])] });
    const r = bossFight([hitter('H', 200), tank], [u('H', 0, 0), u('T', 1, 0)], b);
    const p1 = ev(r, 'phase', e => e.i === 1)[0];
    ok(p1, 'เข้าเฟส 2');
    const st = ev(r, 'dmg', e => e.why === 'storm');
    ok(st.length > 0, 'มีพายุ');
    eq(st[0].t, p1.t + 1000, 'พายุครั้งแรก 1 วิหลังเข้าเฟส');
    const plain = bossFight([hitter('H', 200), tank], [u('H', 0, 0), u('T', 1, 0)], boss({ atk: 0, cdMs: NEVER, phases: [ph(0), ph(1)] }));
    eq(ev(plain, 'dmg', e => e.why === 'storm').length, 0, 'ไม่มีกฎ = ไม่มีพายุ (เทสต์ปิดพายุไว้)');
  }],
  ['บอส R25 (เผ่าตีเบา): เผ่าที่เลือกตีบอสเบาลง % · เผ่าอื่นเท่าเดิม', () => {
    const b = boss({ phases: [ph(0, [rl('tribeResist', 50, null, 'เหล็กกล้า')])] });
    const st = bossFight([hitter('H', 100)], [u('H', 0, 0)], b);
    eq(sumDmg(st, bossUid(st)), 50, 'เหล็กกล้า 100 → 50');
    const wy = bossFight([hitter('H', 100, 'allEnemies', { tribe: 'วายุ' })], [u('H', 0, 0)], b);
    eq(sumDmg(wy, bossUid(wy)), 100, 'วายุ 100 เท่าเดิม');
  }],
  ['บอส R29 สาป: ทีมตีบอสไม่ถึงเป้าใน 5 วิ = ตัวที่ถูกสาป down · ถึงเป้า = รอด', () => {
    const b = boss({ atk: 0, cdMs: NEVER, hp: 100000, bars: 100, phases: [ph(0, [rl('curse', 5, 10)])] }); // แถบละ 1000 · เป้า 10% = 100
    const weak = bossFight([mk('K', { atk: L3(10), cdMs: L3(1000), hp: L3(5000) })], [u('K', 0, 0)], b);
    eq(ev(weak, 'curse', e => e.ms).map(e => e.t)[0], 5000, 'สาปที่ 5 วิ');
    eq(ev(weak, 'down').map(e => e.t), [10000], 'ตีได้ 50 < 100 → down ที่ 10 วิ');
    const strong = bossFight([mk('K', { atk: L3(30), cdMs: L3(1000), hp: L3(5000) })], [u('K', 0, 0)], b);
    ok(ev(strong, 'curse', e => e.ms).length >= 2, 'สาปซ้ำเป็นรอบ');
    eq(ev(strong, 'down').length, 0, 'ตีได้ 150 ≥ 100 → รอดทุกรอบ');
  }],
  ['บอส E2: แถวหลังผู้เล่นใช้สกิลไม่ได้ช่วงแรก · แถวอื่นใช้ได้', () => {
    const react = mk('R', { atk: L3(0), cdMs: NEVER, hp: L3(5000), skills: [{ when: 'hitTaken', do: 'atkUp', to: 'self', v: L3(1) }] });
    const b = boss({ atk: 1, phases: [ph(0, [rl('backSilence', 10)])] });
    const bk = bossFight([react], [u('R', 2, 0)], b);
    eq(ev(bk, 'proc', e => e.t <= 10000).length, 0, 'แถวหลัง: 10 วิแรกสกิลไม่ทำงาน');
    eq(ev(bk, 'proc', e => e.t === 11000).length, 1, 'หลัง 10 วิ ทำงาน');
    const fr = bossFight([react], [u('R', 0, 0)], b);
    eq(ev(fr, 'proc', e => e.t === 1000).length, 1, 'แถวหน้าทำงานตั้งแต่ฮิตแรก');
  }],
  ['บอส E3: ผู้เล่นฟื้นเลือดได้น้อยลง %', () => {
    const h = mk('M', { atk: L3(0), cdMs: NEVER, hp: L3(5000), skills: [{ when: 'hitTaken', do: 'heal', to: 'self', v: L3(20) }] });
    const heals = rules => { const r = bossFight([h], [u('M', 0, 0)], boss({ atk: 50, phases: [ph(0, rules)] })); return ev(r, 'heal', e => e.to !== bossUid(r)).map(e => e.amount); };
    eq(heals([rl('healCut', 50)])[0], 10, 'ฟื้น 20 → 10');
    eq(heals([])[0], 20, 'ไม่มีกฎ = 20');
  }],
  ['บอส E4: คูลดาวน์ผู้เล่นช้าลง %', () => {
    const k = mk('K', { atk: L3(1), cdMs: L3(1000), hp: L3(5000) });
    const times = rules => { const r = bossFight([k], [u('K', 0, 0)], boss({ atk: 0, cdMs: NEVER, hp: 100000, phases: [ph(0, rules)] })); return ev(r, 'dmg', e => e.why === 'hit').slice(0, 2).map(e => e.t); };
    eq(times([rl('cdSlow', 100)]), [2000, 4000], 'คูลดาวน์ 1 วิ +100% = ทุก 2 วิ (รวมรอบแรก)');
    eq(times([]), [1000, 2000], 'ไม่มีกฎ = ทุก 1 วิ');
  }],
  ['บอส E5: ปิดโบนัสเผ่าผู้เล่นที่ทำงานระหว่างสู้ (ติดไฟจากเผ่า) · ไม่มีกฎ = ทำงาน', () => {
    const tr = { ...BR_RULES, tribesOn: true, tribeBonus: { ...structuredClone(BR_RULES.tribeBonus), 'เพลิงเผา': { burn: [3, 3, 3], every: [1, 1, 1], startBurn: [0, 0, 0], burnDmgPct: [0, 0, 0] } } };
    const cs = ['F1', 'F2'].map(id => mk(id, { tribe: 'เพลิงเผา', atk: L3(1), cdMs: L3(1000), hp: L3(5000) }));
    const run = rules => bossFight(cs, [u('F1', 0, 0), u('F2', 0, 1)], boss({ atk: 0, cdMs: NEVER, hp: 100000, phases: [ph(0, rules)] }), { rules: tr });
    ok(ev(run([]), 'burn', e => e.why === 'tribe').length > 0, 'ไม่มีกฎ: เผ่าเพลิงเผาทำให้บอสติดไฟ');
    eq(ev(run([rl('tribeOff')]), 'burn', e => e.why === 'tribe').length, 0, 'มีกฎ: ไม่ติดไฟจากเผ่า');
  }],
  ['บันทึกการต่อสู้ (ชุด 75): กฎบอสลงบันทึก — เฟส/ค่ากฎ · ผลของกฎมีป้ายกฎ · ฮิตที่กฎกันไว้ · ปิด detail = เหตุการณ์เหมือนเดิม', () => {
    const a = mk('A', { atk: L3(5), cdMs: L3(1000), hp: L3(5000) }), b2 = mk('B', { atk: L3(5), cdMs: L3(1000), hp: L3(5000) });
    const b = boss({ atk: 5, cdMs: 2000, hp: 100000, phases: [ph(0, [rl('burnAura', 4), rl('frontOnly'), rl('atkUp', 30), rl('curse', 5, 10)])] });
    const run = detail => bossFight([a, b2], [u('A', 0, 0), u('B', 2, 0)], b, { detail });
    const r = run(true), off = run(false);
    const strip = e => { const { r: _r, rr: _rr, rd: _rd, fx: _fx, d: _d, ...x } = e; return x; };
    const noDetail = ev => ev.filter(e => e.k !== 'ruleBlock').map(strip);
    eq(JSON.stringify(noDetail(r.events).map(e => [e.t, e.k, e.to ?? e.who, e.amount ?? null])), JSON.stringify(noDetail(off.events).map(e => [e.t, e.k, e.to ?? e.who, e.amount ?? null])), 'ผลต่อสู้เหมือนกันทั้งเปิด/ปิด detail');
    ok(off.events.every(e => !('r' in e) && !('rr' in e) && e.k !== 'ruleBlock'), 'ปิด detail: ไม่มีป้ายกฎ');
    const p0 = ev(r, 'phase')[0];
    eq(p0.rd.find(x => x.id === 'burnAura').v, 4, 'เฟสจดค่าของกฎ');
    ok(simLine(p0, new Map(), new Map(), {}).some(x => x && x.t && x.t.includes('R11 ทุก 5 วิ ผู้เล่นทุกตัวติดไฟ (4 ไฟ)')), 'บรรทัดเฟสบอกกฎพร้อมค่า');
    eq(bossRuleText(rl('curse', 5, 10)), 'R29 ทุก X วิ สาปผู้เล่น 1 ตัว: down ใน 5 วิ ถ้าทีมตีบอสไม่ถึงเป้า (5 วิ · เป้า (% ของ 1 แถบ) 10%)', 'ข้อความกฎ 2 ค่า');
    ok(ev(r, 'burn', e => e.why === 'boss').every(e => e.r === 'burnAura'), 'ไฟจาก R11 มีป้าย burnAura');
    ok(ev(r, 'curse').length > 0 && ev(r, 'curse').every(e => e.r === 'curse'), 'คำสาปมีป้าย curse');
    const blk = ev(r, 'ruleBlock');
    ok(blk.length > 0 && blk.every(e => e.rule === 'frontOnly' && e.from != null), 'แถวหลังตีบอส = ไม่โดน (R26) ลงบันทึก');
    const bu = bossUid(r);
    ok(ev(r, 'dmg', e => e.from === bu && e.why === 'hit').every(e => e.rr && e.rr.includes('atkUp')), 'ฮิตของบอสบอกว่า R1 ทำงาน');
    const tag = simLine(ev(r, 'burn', e => e.why === 'boss')[0], new Map(), new Map(), {});
    ok(tag.some(x => x && x.c === 'lg-rule' && x.t.includes('R11')), 'บรรทัดไฟมีป้าย [กฎบอส R11]');
    ok(ev(r, 'proc').every(e => !e.r), 'สกิลผู้เล่นไม่ติดป้ายกฎบอส');
  }],
];
