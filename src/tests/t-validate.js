// ชุดทดสอบ: ตัวตรวจค่า (config) ตัวตรวจทีม แท็กสกิล คู่สกิลที่ห้องบาลานซ์ให้เลือก แถวแนะนำ · แยกจาก mechanics.js (ชุด D) · ตัวช่วยอยู่ helpers.js
import { simulate } from '../core/battle.js';
import { buildCharacterList } from '../core/characters.js';
import { makeRng } from '../core/rng.js';
import { CTX_WHEN, DO_INFO, RULES, SKILL_KINDS, SKILL_SPEC, WHEN_KIND, cleanTags, pickHintRow, rowsOfHint, sameTribeOk } from '../core/rules.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { validateConfig, validateTeam } from '../core/validate.js';
import { mk, L3, u, eq, ok, randomTeam } from './helpers.js';
import { parseCfgCode, preImportCheck } from '../lab/cfgcode.js';
export const TESTS_VALIDATE = [
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
];
