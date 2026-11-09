// Tests: boss system v2 (set 168, C-17.6) — shared curve, phase-add, weak/resist defaults, Heat ladder, signature rules S1–S6.
// Every value here is set in this file (not tied to the user's values).
import { simulate } from '../core/battle.js';
import { bossUnit, bossV2Phases, heatRules } from '../core/boss.js';
import { bossAt, bossMults, boss2Base, cleanStage, stageBase, stageDefaults, BOSS_RULES, BOSS_RULE_GROUPS, bossRule } from '../core/stage.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { NEVER, mk, L3, u, NT, ev, eq, ok } from './helpers.js';
import { bossRuleText, bossRuleName } from '../game/labels.js';

const R = { ...NT, stormStartMs: 10000000, hardStopMs: 30000 };
const G2 = { ...boss2Base(), g: 2, a: 1, weakPct: 50, weakCap: 80, resistPct: 40, heatRepeatPct: 50 };
const boss = (o = {}) => ({
  id: 'B1', name: 'บอสทดสอบ', tribe: 'เหล็กกล้า', hp: 10000, atk: 0, cdMs: NEVER, multi: 1,
  bars: 5, spot: 'all', moveSec: 8, armor: 0, burn: 0, shock: 0, armorHit: 0, healHit: 0, mult10: 3, endlessPct: 10, on: true,
  phases: [{ at: 0, rules: [], fx: [], spot: '', stats: {} }], ...o,
});
const ph = (at, rules = []) => ({ at, rules, fx: [], spot: '', stats: {} });
const rl = (id, v, v2, v3) => ({ id, v, ...(v2 != null ? { v2 } : {}), ...(v3 != null ? { v3 } : {}) });
function fight(chars, A, b, opts = {}) {
  const team = buildTeam(A, makeCharMap(chars));
  return simulate(team, [bossUnit(b, opts.k || 1, 0, G2)], { rules: R, ...opts });
}
const bossUid = r => r.events[0].units.find(x => x.side === 1).uid;
const hits = (r, f = () => true) => ev(r, 'dmg', e => e.to === bossUid(r) && e.why === 'hit' && f(e));
// normal hitter: atk per hit, one set per second
const hitter = (id, atk, o = {}) => mk(id, { atk: L3(atk), cdMs: 1000, hp: L3(100000), ...o });

export const TESTS_BOSS_V2 = [
  ['บอส v2: สูตรกลาง C2 (HP × g^(k−1) · ตี × (1 + a(k−1))) · บอสเก่ายังใช้ mult10/endlessPct', () => {
    const b2 = boss({ v2: true, atk: 10 }), old = boss({ atk: 10 });
    eq(bossMults(b2, 1, 0, G2), { hp: 1, atk: 1 }, 'k1');
    eq(bossMults(b2, 3, 0, G2), { hp: 4, atk: 3 }, 'k3: 2² · 1+2');
    eq(bossAt(b2, 3, 0, G2).hp, 40000, 'HP k3');
    eq(bossAt(b2, 3, 0, G2).atk, 30, 'atk k3');
    eq(+bossMults(b2, 3, 10, G2).hp.toFixed(4), 4.4, 'bossExtraPct ยังซ้อน');
    eq(bossAt(old, 2, 0, G2).hp, 30000, 'บอสเก่า k2 = mult10');
    eq(bossAt(old, 3).hp, 33000, 'บอสเก่า k3 = mult10 × (1+endless)');
    eq(bossUnit(b2, 2, 0, G2).maxHp, 20000, 'bossUnit ใช้สูตรใหม่');
  }],
  ['บอส v2: เฟสเพิ่มสกิล (สกิลเฟสก่อนยังอยู่) · บอสเก่า = เฟสใหม่แทนเฟสเก่า', () => {
    const phases = [ph(0, [rl('plating', 5, 10, 4)]), ph(1, [rl('reflect', 10)]), ph(2, [rl('aoe', 30)])];
    const p = bossV2Phases(boss({ v2: true, phases, resistPct: 0 }), 1, G2).map(x => x.rules.map(r => r.id));
    eq(p, [['plating'], ['plating', 'reflect'], ['plating', 'reflect', 'aoe']], 'กฎสะสม');
    eq(bossUnit(boss({ phases }), 1, 0, G2).phases.map(x => x.rules.map(r => r.id)), [['plating'], ['reflect'], ['aoe']], 'บอสเก่าไม่สะสม');
  }],
  ['บอส v2: แพ้เผ่า = ค่ากลาง (ไม่เกินเพดาน) · ต้านเผ่าตัวเอง = ค่ากลาง · ตั้งรายบอสได้', () => {
    const rs = b => bossV2Phases(b, 1, G2)[0].rules;
    eq(rs(boss({ v2: true, weak: 'สายฟ้า' })), [{ id: 'tribeWeak', v: 50, tribe: 'สายฟ้า' }, { id: 'tribeResist', v: 40, tribe: 'เหล็กกล้า' }], 'ค่ากลาง');
    eq(rs(boss({ v2: true, weak: 'สายฟ้า', weakPct: 200, resistPct: 10 }))[0].v, 80, 'แพ้เผ่าติดเพดาน');
    eq(rs(boss({ v2: true, weak: 'สายฟ้า', weakPct: 200, resistPct: 10 }))[1].v, 10, 'ต้านเผ่ารายบอส');
    eq(rs(boss({ v2: true, resistPct: 0 })), [], 'ไม่มีเผ่าแพ้ + ต้าน 0 = ไม่มีกฎ');
  }],
  ['บอส v2: Heat — k3 +1 · k4 +2 · ข้ามกฎที่บอสมีแล้ว · เกินรายการ วนข้อ 1–2 แรงขึ้น', () => {
    const b = boss({ v2: true, phases: [ph(0, [rl('fastAtk', 10)])] });
    eq(heatRules(b, 1, G2), [], 'k1 ไม่มี');
    eq(heatRules(b, 2, G2), [], 'k2 ไม่มี');
    eq(heatRules(b, 3, G2).map(r => r.id), ['atkUp'], 'k3 +1');
    eq(heatRules(b, 4, G2).map(r => r.id), ['atkUp', 'healCut'], 'k4 ข้าม fastAtk ที่มีอยู่แล้ว');
    const g = { ...G2, heat: [bossRule('atkUp', 20), bossRule('regen', 2)] };
    const h = heatRules(boss({ v2: true }), 5, g); // 3 steps, 2 in list → atkUp again × 1.5
    eq(h.map(r => [r.id, r.v]), [['atkUp', 30], ['regen', 2]], 'วนข้อ 1 แรงขึ้น 50%');
    ok(bossV2Phases(b, 4, G2).every(p => p.rules.some(r => r.id === 'healCut')), 'Heat อยู่ทุกเฟส');
  }],
  ['บอส v2: cleanStage — boss2 + v2/weak/weakPct/resistPct/v3 ผ่านตัวกรอง · ค่าผิด = ค่าเดิม', () => {
    const base = stageBase();
    const st = cleanStage({ boss2: { g: 3, a: 99, heat: [{ id: 'aoe', v: 20 }, { id: 'nope' }, { id: 'tribeWeak', v: 5 }, { id: 'aoe', v: 9 }] },
      bosses: [{ id: 'B1', v2: true, weak: 'สายฟ้า', weakPct: 70, resistPct: 500, phases: [{ at: 0, rules: [{ id: 'plating', v: 3, v2: 15, v3: 999 }] }] }] });
    eq(st.boss2.g, 3, 'g ผ่าน'); eq(st.boss2.a, base.boss2.a, 'a เกินช่วง = ค่าเดิม');
    eq(st.boss2.heat, [{ id: 'aoe', v: 20 }], 'Heat กรองกฎที่ไม่มี/ต้องเลือกเผ่า/ซ้ำ');
    const b = st.bosses.find(x => x.id === 'B1');
    eq([b.v2, b.weak, b.weakPct, b.resistPct], [true, 'สายฟ้า', 70, stageDefaults().bosses.find(x => x.id === 'B1').resistPct], 'ค่ารายบอส (ต้านเกินช่วง = ค่าเดิม)');
    eq(b.phases[0].rules[0], { id: 'plating', v: 3, v2: 15, v3: 4 }, 'v3 เกินช่วง = ค่าเริ่ม');
    eq(cleanStage({ bosses: [{ id: 'B9', tribe: 'เหล็กกล้า', weak: 'เหล็กกล้า' }] }).bosses[0].weak, undefined, 'แพ้เผ่าตัวเองไม่ได้');
  }],
  ['บอส v2: กฎ S1–S6 อยู่ในกลุ่มตัวเลือก + ข้อความมีค่าที่ 3', () => {
    for (const id of ['plating', 'mendPulse', 'rage', 'staticChain', 'galeGuard', 'flameShell']) {
      ok(BOSS_RULES.some(q => q[0] === id), `${id} ใน BOSS_RULES`);
      eq(BOSS_RULE_GROUPS.filter(g => g[1].includes(id)).length, 1, `${id} อยู่ 1 กลุ่ม`);
    }
    eq(bossRuleName('plating', true), 'S1', 'ชื่อย่อ');
    ok(bossRuleText(bossRule('plating')).includes('งอกใหม่ 1 แผ่นทุก 4 วิ'), 'ข้อความค่าที่ 3');
  }],
  ['S1 เกราะแผ่น: แต่ละแผ่นลดดาเมจตีปกติ · ช็อตที่ติดบอส = แผ่นหลุด · งอกใหม่ตามเวลา', () => {
    const on = fight([hitter('H', 100)], [u('H', 0, 0)], boss({ phases: [ph(0, [rl('plating', 5, 10, 4)])] }));
    eq(hits(on)[0].amount, 50, 'เปิด: 5 แผ่น × 10% = −50%');
    const off = fight([hitter('H', 100)], [u('H', 0, 0)], boss());
    eq(hits(off)[0].amount, 100, 'ปิด: เต็ม');
    const sh = fight([hitter('H', 100, { shock: L3(1) })], [u('H', 0, 0)], boss({ phases: [ph(0, [rl('plating', 5, 10, 60)])] }), { detail: true });
    eq(hits(sh).slice(0, 3).map(e => e.amount), [50, 60, 70], 'ช็อตแต่ละครั้งลอกแผ่น (ฮิตถัดไปแรงขึ้น)');
    const rg = fight([hitter('H', 100, { shock: L3(1) })], [u('H', 0, 0)], boss({ phases: [ph(0, [rl('plating', 2, 10, 1)])] }), { detail: true });
    ok(ev(rg, 'plating').some((e, i, a) => i > 0 && e.left > a[i - 1].left), 'แผ่นงอกใหม่');
  }],
  ['S2 ฟื้นเป็นจังหวะ: ฟื้น % ของ 1 แถบทุก X วิ · ไม่ฟื้นขณะบอสติดไฟ', () => {
    const b = r => r.events[0].units.find(x => x.side === 1).uid;
    const on = fight([hitter('H', 300)], [u('H', 0, 0)], boss({ phases: [ph(0, [rl('mendPulse', 2, 25)])] }));
    ok(ev(on, 'heal', e => e.to === b(on)).length > 0, 'เปิด: บอสฟื้น');
    const off = fight([hitter('H', 300)], [u('H', 0, 0)], boss());
    eq(ev(off, 'heal', e => e.to === b(off)).length, 0, 'ปิด: ไม่ฟื้น');
    const burn = fight([hitter('H', 300, { burn: L3(50) })], [u('H', 0, 0)], boss({ phases: [ph(0, [rl('mendPulse', 2, 25)])] }), { detail: true });
    eq(ev(burn, 'heal', e => e.to === b(burn)).length, 0, 'ติดไฟ: ไม่ฟื้น');
    ok(ev(burn, 'ruleBlock', e => e.rule === 'mendPulse').length > 0, 'บันทึกว่าไฟหยุดการฟื้น');
  }],
  ['S3 โทสะ: ฮิตแรงถึงเกณฑ์ = บอสตีแรงขึ้นสแตกละ % (มีเพดาน) · ผู้เล่นฟื้น = สแตกหาย', () => {
    const tank = mk('T', { atk: L3(0), cdMs: NEVER, hp: L3(100000) });
    const bb = o => boss({ atk: 100, cdMs: 1000, phases: [ph(0, [rl('rage', 8, 10, 3)])], ...o });
    const bossHits = r => ev(r, 'dmg', e => e.from === bossUid(r) && e.why === 'hit').map(e => e.amount);
    const on = fight([hitter('H', 500), tank], [u('H', 1, 0), u('T', 0, 0)], bb());
    ok(Math.max(...bossHits(on)) === 130, 'เปิด: แรงขึ้นสูงสุด 3 สแตก × 10%');
    const small = fight([hitter('H', 50), tank], [u('H', 1, 0), u('T', 0, 0)], bb());
    ok(bossHits(small).every(v => v === 100), 'ฮิตเล็กกว่าเกณฑ์ (8% ของแถบ 2000 = 160) ไม่เพิ่มสแตก');
    const healer = hitter('H', 500, { healHit: L3(1) });
    const calm = fight([healer], [u('H', 0, 0)], bb()); // healer stands in front: boss hits it, it heals every hit
    ok(Math.max(...bossHits(calm)) < 130, 'ผู้เล่นฟื้นทุกฮิต = สแตกหายตาม');
    const off = fight([hitter('H', 500), tank], [u('H', 1, 0), u('T', 0, 0)], boss({ atk: 100, cdMs: 1000 }));
    ok(bossHits(off).every(v => v === 100), 'ปิด: ไม่แรงขึ้น');
  }],
  ['S4 สายฟ้าสะท้อน: ทุกฮิตที่ N ผู้ตีติดช็อต · เกราะผู้ตีรับก่อน', () => {
    const hid = r => r.events[0].units.find(x => x.side === 0).uid;
    const on = fight([hitter('H', 10)], [u('H', 0, 0)], boss({ phases: [ph(0, [rl('staticChain', 3, 4)])] }));
    const sh = ev(on, 'shock', e => e.to === hid(on));
    ok(sh.length > 0 && sh.every(e => e.amount === 4 && e.why === 'chain'), 'เปิด: ช็อต 4');
    eq(sh.length, Math.floor(hits(on).length / 3), 'ทุกฮิตที่ 3');
    const arm = fight([hitter('H', 10, { armor: L3(3) })], [u('H', 0, 0)], boss({ phases: [ph(0, [rl('staticChain', 3, 4)])] }));
    eq(ev(arm, 'chainAbsorb')[0].amount, 3, 'เกราะ 3 รับไป 3');
    eq(ev(arm, 'shock', e => e.to === hid(arm))[0].amount, 1, 'เหลือช็อต 1');
    const off = fight([hitter('H', 10)], [u('H', 0, 0)], boss());
    eq(ev(off, 'shock').length, 0, 'ปิด: ไม่มีช็อต');
  }],
  ['S5 ม่านลม: ฮิตเล็กกว่า X% ของแถบเข้าน้อยลง · ฮิตใหญ่เข้าเต็ม', () => {
    const b = boss({ phases: [ph(0, [rl('galeGuard', 4, 60)])] }); // bar 2000 → threshold 80
    eq(hits(fight([hitter('H', 50)], [u('H', 0, 0)], b))[0].amount, 20, 'ฮิต 50 → 20');
    eq(hits(fight([hitter('H', 100)], [u('H', 0, 0)], b))[0].amount, 100, 'ฮิต 100 เต็ม');
    eq(hits(fight([hitter('H', 50)], [u('H', 0, 0)], boss()))[0].amount, 50, 'ปิด: เต็ม');
  }],
  ['S6 เปลือกเพลิง: ชั้นละ −% ทุกดาเมจ · ฮิตปกติลอก 1 ชั้น (ไฟไม่ลอก) · เต็มใหม่ตามเวลา', () => {
    const b = boss({ phases: [ph(0, [rl('flameShell', 6, 8, 60)])] });
    const on = fight([hitter('H', 100, { multi: 3 })], [u('H', 0, 0)], b);
    eq(hits(on).slice(0, 4).map(e => e.amount), [52, 60, 68, 76], 'แต่ละฮิตลอก 1 ชั้น');
    const burn = fight([mk('F', { atk: L3(0), cdMs: NEVER, hp: L3(100000), skills: [{ when: 'matchStart', do: 'burn', to: 'allEnemies', v: L3(100) }] })], [u('F', 0, 0)], b);
    const bt = ev(burn, 'dmg', e => e.to === bossUid(burn) && e.why === 'burn').map(e => e.amount);
    ok(bt.length > 1 && bt[0] < 100 && bt.every(v => v <= Math.floor(bt[0] * 1.0001) || v < 100), 'ไฟโดนลด และไม่ลอกชั้น');
    const rf = fight([hitter('H', 100, { multi: 6 })], [u('H', 0, 0)], boss({ phases: [ph(0, [rl('flameShell', 6, 8, 2)])] }));
    ok(hits(rf).some((e, i, a) => i > 0 && e.amount < a[i - 1].amount), 'เต็มใหม่ = ดาเมจกลับลดลง');
    eq(hits(fight([hitter('H', 100)], [u('H', 0, 0)], boss()))[0].amount, 100, 'ปิด: เต็ม');
  }],
];
