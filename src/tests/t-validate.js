// ชุดทดสอบ: ตัวตรวจค่า (config) ตัวตรวจทีม แท็กสกิล คู่สกิลที่ห้องบาลานซ์ให้เลือก แถวแนะนำ · แยกจาก mechanics.js (ชุด D) · ตัวช่วยอยู่ helpers.js
import { simulate } from '../core/battle.js';
import { buildCharacterList } from '../core/characters.js';
import { makeRng } from '../core/rng.js';
import { CTX_WHEN, DO_INFO, RULES, SKILL_KINDS, SKILL_SPEC, WHEN_KIND, cleanTags, pickHintRow, rowsOfHint, sameTribeOk } from '../core/rules.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { validateConfig, validateTeam } from '../core/validate.js';
import { mk, L3, u, eq, ok, randomTeam } from './helpers.js';
import { parseCfgCode, preImportCheck } from '../lab/cfgcode.js';
import { STAGE_RUNES, STAGE_BOSSES, BOSS_RULES, bossPhaseWarn, stageDefaults, stageBase, cleanStage, bossAt, enemyMultAt, rarityOdds, runeSkillOk, customDefault, runeText, runeActive, RUNE_SPECIAL, runeWithEff, runeKind, RUNE_COPIES } from '../core/stage.js';
export const TESTS_VALIDATE = [
  ['โหมดด่าน: ข้อมูลรูน/บอสจากภายนอกถูกตรวจ (ค่าผิด/ไม่รู้จัก → ค่าเสนอ)', () => {
    const d = stageDefaults();
    eq(Object.keys(d.runes).length, 51, 'rune count'); eq(d.custom.map(c => c.id), ['C1', 'C3', 'C5', 'C2', 'C4', 'C6'], 'user custom runes (set 62)'); eq(stageBase().custom, [], 'code base has no custom runes'); eq(cleanStage(null), d, 'null → defaults'); eq(cleanStage(JSON.parse(JSON.stringify(d))), d, 'round trip');
    for (const s of RUNE_SPECIAL) for (const [k, , v, lo, hi, u] of s.f) ok(u === 'tribe' || (v >= lo && v <= hi), `${s.key}.${k} default out of range`);
    for (const r of STAGE_RUNES) ok(runeKind(r.eff), `${r.id} effect`);
    for (const b of STAGE_BOSSES) ok(b.phases.length === 1 && b.phases[0].rules.every(r => BOSS_RULES.some(q => q[0] === r.id)), `${b.id} rule`);
    const bad = cleanStage({ runes: { T9: { dmgPct: 9999, on: 'x' }, ZZ: { a: 1 }, T1: { gold: 5, on: false } }, settings: { dropHard: -1, dropEasy: 20 },
      bosses: [{ id: 'B1', name: '<b>x</b>', hp: 1e9, atk: 30, rule: 'nope' }, { id: 'B1' }, { id: 'evil' }, { id: 'B9', tribe: 'ไม่มี', rule: 'healCut', ruleV: 101 }] });
    eq(bad.runes.T9.dmgPct, 25, 'T9 clamp → default'); eq(bad.runes.T9.on, true, 'on must be boolean'); eq(bad.runes.T1, { on: false, del: false, name: 'ร่ำรวย', max: 3, rarity: 'common', theme: '', tribe: 'เหล็กกล้า', scope: 'team', eff: 'gold', gold: 5 }, 'T1 accepted'); ok(!bad.runes.ZZ, 'unknown rune dropped');
    eq(bad.settings.dropHard, 50, 'bad setting'); eq(bad.settings.dropEasy, 20, 'good setting');
    eq(bad.bosses.map(b => b.id), ['B1', 'B9'], 'boss ids (dup / bad id dropped)'); eq(bad.bosses[0].name, 'bx/b', 'name cleaned'); eq(bad.bosses[0].hp, 450, 'hp out of range'); eq(bad.bosses[0].atk, 30, 'atk ok'); eq(bad.bosses[0].phases[0].rules, [{ id: 'armorCut', v: 50 }], 'unknown rule kept default');
    eq(bad.bosses[1].phases[0].rules, [{ id: 'healCut', v: 50 }], 'old rule/ruleV → phase 1 (value out of range → default)');
    const s2 = cleanStage({ runes: { T5: { name: ' <i>คมกริบ</i> ', max: 4 }, T6: { name: '', max: 1.5 }, T7: { max: 99 } }, settings: { lastStage: 50, growPct: 10, growFrom: 999 },
      bosses: [{ id: 'B1', spot: 'four', bars: 7, moveSec: 3 }, { id: 'B2', spot: 'fly', bars: 2.5, moveSec: 0 }] });
    eq([s2.runes.T5.name, s2.runes.T5.max], ['iคมกริบ/i', 4], 'rune rename + stack'); eq([s2.runes.T6.name, s2.runes.T6.max, s2.runes.T7.max], ['โล่ไม้คู่', 3, 3], 'bad name/max → default (common = 3)');
    eq([s2.bosses[0].spot, s2.bosses[0].bars, s2.bosses[0].moveSec], ['four', 7, 3], 'boss spot/bars'); eq([s2.bosses[1].spot, s2.bosses[1].bars, s2.bosses[1].moveSec], ['move', 5, 8], 'bad spot/bars → default');
    eq(s2.settings.growFrom, 20, 'growFrom out of range'); eq(enemyMultAt(s2.settings, 19), 1, 'no growth before growFrom'); ok(Math.abs(enemyMultAt(s2.settings, 21) - 1.21) < 1e-9, 'compounding');
    // Set 64 boss phases: max 3 · at rising and < bars · max 2 rules, no dup · fx/spot only from phase 2 · second value / tribe cleaned
    const ph = cleanStage({ bosses: [{ id: 'B1', bars: 5, phases: [
      { at: 3, rules: [{ id: 'atkUp', v: 40 }, { id: 'atkUp', v: 10 }, { id: 'regen', v: 999 }, { id: 'aoe' }], fx: [{ id: 'cleanse' }], spot: 'one' },
      { at: 2, rules: [{ id: 'randomSilence', v: 5, v2: 99 }, { id: 'tribeWeak', v: 60, tribe: 'อสูร' }], fx: [{ id: 'armorBar', v: 80 }, { id: 'armorBar' }, { id: 'evil' }], spot: 'fly' },
      { at: 2, rules: [] }, { at: 5, rules: [] }, { at: 4, rules: [{ id: 'none' }, { id: 'curse', tribe: 'x' }] }, { at: 4.5 } ] }] }).bosses[0].phases;
    eq(ph.map(p => p.at), [0, 2, 4], 'phase at: first = 0, rising, < bars, max 3');
    eq(ph[0], { at: 0, rules: [{ id: 'atkUp', v: 40 }, { id: 'regen', v: 3 }], fx: [], spot: '' }, 'phase 1: dup dropped, max 2, bad value → default, no fx/spot');
    eq(ph[1], { at: 2, rules: [{ id: 'randomSilence', v: 5, v2: 4 }, { id: 'tribeWeak', v: 60, tribe: 'อสูร' }], fx: [{ id: 'armorBar', v: 80 }], spot: '' }, 'phase 2: v2 clamp, tribe, fx dedup, bad spot');
    eq(ph[2].rules, [{ id: 'curse', v: 15, v2: 50 }], 'phase 3: none dropped, defaults');
    for (const r of BOSS_RULES) { ok(r[2] >= r[3] && r[2] <= r[4], `${r[0]} default in range`); if (Array.isArray(r[6])) ok(r[6][1] >= r[6][2] && r[6][1] <= r[6][3], `${r[0]} v2 default`); }
    eq(new Set(BOSS_RULES.map(r => r[0])).size, BOSS_RULES.length, 'rule ids unique');
    eq(bossPhaseWarn({ spot: 'one' }, { rules: [{ id: 'execute' }, { id: 'aoe' }], spot: '' }).length, 1, 'warn R7+R4'); eq(bossPhaseWarn({ spot: 'one' }, { rules: [{ id: 'frontOnly' }], spot: 'all' }), [], 'R26 ok on all');
    eq(bossAt(STAGE_BOSSES[0], 1).barHp, Math.round(STAGE_BOSSES[0].hp / 5), 'bar size');
    const b = STAGE_BOSSES[0]; eq(bossAt(b, 1).hp, b.hp, 'first boss'); eq(bossAt(b, 2).hp, Math.round(b.hp * b.mult10), 'stage 10'); eq(bossAt(b, 3).hp, Math.round(b.hp * b.mult10 * (1 + b.endlessPct / 100)), 'endless');
  }],
  ['รูน v2 (ชุด 53): รูนค่าพลัง/รูนที่เพิ่มเอง/ความหายาก ถูกตรวจ', () => {
    const r = cleanStage({ runes: { T5: { dmgPct: 25 }, U6: { mode: 'pct', v: 2 }, S1: { eff: 'eCd', scope: 'team', v: 9e9 }, X10: { eff: 'atk', scope: 'enemy' }, D2: { rarity: 'legend', max: 2 }, F1: { rarity: 'epic', pct: 50 } } });
    eq(r.runes.T5.v, 25, 'set-52 saved value moves to v'); eq([r.runes.U6.mode, r.runes.U6.v], ['flat', 2], 'multi has no % mode');
    eq([r.runes.S1.eff, r.runes.S1.scope, r.runes.S1.v], ['eCd', 'enemy', 10], 'enemy effect → enemy scope, bad value → effect default');
    eq([r.runes.X10.eff, r.runes.X10.scope], ['atk', 'team'], 'ally effect cannot target enemy team'); eq([r.runes.D2.rarity, r.runes.D2.max], ['legend', 2], 'rarity + copies');
    eq([r.runes.F1.rarity, r.runes.F1.eff, r.runes.F1.v], ['legend', 'armorAmp', 50], 'unknown rarity → default (user default F1 = legend, set 62) · set-59 field pct → v');
    const f = cleanStage({ runes: { F1: { scope: 'tribe', tribe: 'สายฟ้า', theme: 'shock', del: true }, U2: { scope: 'zz', theme: 'zz', del: 1 } } });
    eq([f.runes.F1.scope, f.runes.F1.tribe, f.runes.F1.theme, f.runes.F1.del], ['tribe', 'สายฟ้า', 'shock', true], 'set 59: fixed rune scope/tribe/theme/delete');
    eq([f.runes.U2.scope, f.runes.U2.theme, f.runes.U2.del], ['one', '', false], 'set 59: bad scope/theme/del → default');
    eq(runeText(f.runes.F1), 'เผ่าสายฟ้า: เกราะที่ได้รับ +20%', 'field rune text follows scope'); ok(!runeActive(f.runes.F1), 'deleted rune not active');
    const c = cleanStage({ custom: [{ id: 'C1', type: 'stat', name: 'หิน', eff: 'hp', mode: 'flat', v: 40, scope: 'tribe', tribe: 'ภูติ', rarity: 'rare' }, { id: 'C1', type: 'stat' }, { id: 'C2', type: 'skill', when: 'hit', do: 'burn', to: 'target', v: 3, scope: 'enemy' },
      { id: 'C3', type: 'skill', when: 'hit', do: 'summon', to: 'self' }, { id: 'C4', type: 'skill', when: 'matchStart', do: 'lifesteal', to: 'self' }, { id: 'X1', type: 'stat' }, { id: 'C5', type: 'magic' }] }).custom;
    eq(c.map(x => x.id), ['C1', 'C2'], 'dup / bad skill / bad id / bad type dropped'); eq([c[0].eff, c[0].v, c[0].scope, c[0].tribe, c[0].rarity], ['hp', 40, 'tribe', 'ภูติ', 'rare'], 'custom stat rune');
    eq([c[1].do, c[1].to, c[1].v, c[1].scope], ['burn', 'target', 3, 'team'], 'skill rune: given to allies, never the enemy team');
    ok(runeSkillOk(customDefault('C9', 'skill')), 'default skill rune is valid'); eq(cleanStage({ custom: [customDefault('C9', 'skill')] }).custom.length, 1, 'default skill rune survives');
    // set 60: every rune can switch effect (stat ↔ special ↔ skill), old saves keep working
    const w = cleanStage({ runes: { F4: { eff: 'multi', mode: 'flat', v: 2, scope: 'tribe', tribe: 'วายุ', pct: 20 }, T1: { eff: 'revive', times: 2, gold: 9 }, S5: { eff: 'skill', when: 'hit', do: 'summon', to: 'self' }, D3: { eff: 'nope' }, T2: { eff: 'addTribe', gain: 'ภูติ' } },
      custom: [{ id: 'C1', eff: 'bossDmg', dmgPct: 60, scope: 'one' }, { id: 'C2', eff: 'skill', when: 'matchStart', do: 'multiUp', to: 'self', v: 2 }, { id: 'C3', type: 'skill', when: 'matchStart', do: 'multiUp', to: 'tribeAllies', v: 2, scope: 'tribe', tribe: 'วายุ' }] });
    eq([w.runes.F4.eff, w.runes.F4.v, w.runes.F4.scope, w.runes.F4.tribe, 'pct' in w.runes.F4], ['multi', 2, 'tribe', 'วายุ', false], 'field rune → stat effect');
    eq([w.runes.T1.eff, w.runes.T1.times, w.runes.T1.hpPct, 'gold' in w.runes.T1], ['revive', 2, 50, false], 'eco rune → special effect, old fields dropped');
    eq(w.runes.S5, stageDefaults().runes.S5, 'bad skill → rune default'); eq(w.runes.D3, stageDefaults().runes.D3, 'unknown effect ignored'); eq(w.runes.T2.gain, 'ภูติ', 'tribe field');
    eq(w.custom.map(x => [x.id, x.eff]), [['C1', 'bossDmg'], ['C2', 'skill'], ['C3', 'skill']], 'custom special / skill / old type skill');
    eq(runeText(w.custom[0]), 'ตัวเดียว: ดาเมจใส่บอส +60%', 'special text shows non-natural scope');
    const sw = runeWithEff(w.runes.X10, 'gold'); eq([sw.eff, sw.scope, sw.gold, 'v' in sw, sw.name], ['gold', 'team', 2, false, 'ถ่วงเวลา'], 'switch effect keeps basics, leaves enemy scope');
    eq(cleanStage(JSON.parse(JSON.stringify(w))), w, 'switched runes round trip');
    const st = stageDefaults().settings; eq(rarityOdds(st), { common: 60, rare: 30, legend: 10 }, 'odds'); eq(rarityOdds(st, true), { common: 0, rare: 75, legend: 25 }, 'boss skips common');
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
  ['ชุด 48: รหัสค่าที่บันทึก (AMCFG1) ตรวจก่อนใช้ + เทียบผลวัด', () => {
    const cfg = { chars: { 'PT-1': { hp: [10, 20, 40] } }, tribes: {}, savedAt: 'x' };
    const code = 'ข้อความนำ AMCFG1 ' + JSON.stringify({ v: 1, config: cfg, measured: { at: 'y', edits: { tribes: {}, chars: { 'PT-1': { hp: [10, 20, 40] } } } } });
    const r = parseCfgCode(code);
    eq(r.config.chars, cfg.chars, 'อ่าน config ได้');
    ok(preImportCheck(r).ok, 'ผลวัดตรงกับค่าที่บันทึก = ผ่าน');
    const r2 = parseCfgCode('AMCFG1 ' + JSON.stringify({ v: 1, config: cfg, measured: { edits: { chars: {}, tribes: {} } } }));
    eq(preImportCheck(r2).diff, ['chars:PT-1'], 'ผลวัดไม่ตรง = บอกตัวที่ต่าง');
    ok(!preImportCheck(parseCfgCode('AMCFG1 ' + JSON.stringify({ v: 1, config: cfg }))).ok, 'ไม่มีผลวัด = ไม่ผ่าน');
    for (const bad of ['ไม่มีรหัส', 'AMCFG1 {พัง', 'AMCFG1 ' + JSON.stringify({ v: 2, config: cfg }), 'AMCFG1 ' + JSON.stringify({ v: 1, config: { chars: { 'ZZ-9': {} } } }), 'AMCFG1 ' + JSON.stringify({ v: 1, config: { tribes: { 'ไม่มีเผ่า': {} } } }), 'AMCFG1 ' + JSON.stringify({ v: 1, config: { chars: [] } })]) {
      let threw = false; try { parseCfgCode(bad); } catch (e) { threw = true; }
      ok(threw, 'รหัสผิดต้องถูกปฏิเสธ: ' + bad.slice(0, 40));
    }
  }],
  ['ชุด 61: ไอเดียในรหัส AMCFG1 (ไม่บังคับ) ตรวจก่อนใช้', () => {
    const cfg = { chars: {}, tribes: {} };
    eq(parseCfgCode('AMCFG1 ' + JSON.stringify({ v: 1, config: cfg })).ideas, [], 'ไม่มีไอเดีย = รายการว่าง (รหัสเก่ายังใช้ได้)');
    const r = parseCfgCode('AMCFG1 ' + JSON.stringify({ v: 1, config: cfg, ideas: [{ id: 'a', char: 'รูน T5 คม', text: 'x'.repeat(2000), status: 'รอ Claude', at: '2026-10-31T10:00', reply: 'ok', evil: 1 }, { id: 'b', text: '   ' }, 5, { id: 'c', text: { a: 1 } }, { id: 'd', text: 'hi\u0007', status: 9 }] }));
    eq(r.ideas.map(x => x.id), ['a', 'd'], 'ข้อว่าง/ไม่ใช่ข้อความ ถูกตัด');
    eq([r.ideas[0].text.length, r.ideas[0].reply, 'evil' in r.ideas[0]], [1000, 'ok', false], 'จำกัดยาว 1000 · ช่องที่ไม่รู้จักถูกตัด');
    eq([r.ideas[1].text, r.ideas[1].status, r.ideas[1].char], ['hi', 'รอ Claude', ''], 'ตัวอักษรควบคุมถูกลบ · สถานะผิด → รอ Claude');
    eq(parseCfgCode('AMCFG1 ' + JSON.stringify({ v: 1, config: cfg, ideas: Array.from({ length: 80 }, (_, i) => ({ id: 'i' + i, text: 't' })) })).ideas.length, 50, 'สูงสุด 50 ข้อ');
    let threw = false; try { parseCfgCode('AMCFG1 ' + JSON.stringify({ v: 1, config: cfg, ideas: 'x' })); } catch (e) { threw = true; }
    ok(threw, 'ideas ที่ไม่ใช่รายการ ถูกปฏิเสธ');
  }],
  ['ชุด 61: จำนวนชิ้นต่อ run ตามความหายาก (ธรรมดา 3 · หายาก 2 · ตำนาน 1) · แก้เองได้', () => {
    eq(RUNE_COPIES, { common: 3, rare: 2, legend: 1 }, 'กฎของผู้ใช้');
    const d = stageDefaults();
    for (const r of STAGE_RUNES) eq(stageBase().runes[r.id].max, RUNE_COPIES[r.rarity], 'ค่าตั้งต้น ' + r.id);
    eq(customDefault('C1').max, 3, 'รูนใหม่ (ธรรมดา) = 3');
    eq(d.copiesRule, 'rarity', 'มีป้ายบอกว่าใช้กฎใหม่');
    // old save (no copiesRule): old default numbers → follow rarity · numbers the user typed stay
    const old = cleanStage({ runes: { T1: { max: 3 }, T3: { max: 2 }, T5: { max: 1 }, T6: { max: 4 }, D2: { rarity: 'legend', max: 1 }, F1: { rarity: 'common', max: 1 } }, custom: [{ id: 'C1', eff: 'atk', rarity: 'rare', max: 1 }, { id: 'C2', eff: 'atk', max: 5 }] });
    eq([old.runes.T1.max, old.runes.T5.max, old.runes.T6.max, old.runes.D2.max, old.runes.F1.max], [3, RUNE_COPIES[old.runes.T5.rarity], 4, 1, 3], 'เซฟเก่า: ค่าเดิม → ตามความหายาก · ค่าที่พิมพ์เองคงไว้');
    eq(old.runes.T3.max, RUNE_COPIES[old.runes.T3.rarity], 'T3 ค่าเดิม 2 → ตามความหายาก');
    eq([old.custom[0].max, old.custom[1].max], [2, 5], 'รูนที่สร้างเอง เซฟเก่า');
    // new save: every number is the user's
    const nw = cleanStage({ copiesRule: 'rarity', runes: { T5: { max: 1 } }, custom: [{ id: 'C1', eff: 'atk', max: 1 }] });
    eq([nw.runes.T5.max, nw.custom[0].max], [1, 1], 'เซฟใหม่: ตัวเลขที่ผู้ใช้ตั้งคงไว้');
    eq(cleanStage({ copiesRule: 'rarity', runes: { T5: { rarity: 'legend' } } }).runes.T5.max, 1, 'ไม่มีจำนวน → ตามความหายากที่เซฟ');
  }],
];
