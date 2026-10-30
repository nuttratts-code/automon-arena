// Stage mode (demo) data — phase 1 (29 Oct 2026; set 52 added rune name/max, boss spot/bars/moveSec, endless settings; set 53 runes v2): runes, bosses, stage settings that the Balance Room edits.
// The battle engine does NOT use these yet (phase 2). Every number = proposal (ค่าเสนอ) until the user confirms.
// Design notes: claude/backlog.md "Stage mode" · claude/review-2026-10-28-runes.md · claude/review-2026-10-29-stage-baseline.md
import { TRIBES, DO_INFO, BATTLE_WHEN, skillTargets } from './rules.js';

// ---------- Runes v2 (user 29 Oct, set 53 · claude/review-2026-10-29-runes-v2.md) ----------
// Every rune: rarity (3 tiers, user Q12) · category · scope ('one' = เฉพาะตัว, others = ส่วนรวม, user Q2 A).
// Two shapes: fixed runes (own fields f = [key, label, default, min, max, unit], text uses {key}) and builder runes (b = stat effect + scope + flat/%, user Q1 A + Q3).
export const RUNE_RARITY = [['common', 'ธรรมดา'], ['rare', 'หายาก'], ['legend', 'ตำนาน']];
export const RUNE_CATS = [['stat', 'ค่าพลัง'], ['skill', 'สกิล'], ['tribe', 'เพิ่มเผ่า'], ['field', 'เวทสนาม'], ['special', 'พิเศษ'], ['eco', 'เงิน/ร้าน']];
export const RUNE_SCOPES = [['one', 'ตัวเดียว'], ['front', 'แถวหน้า'], ['mid', 'แถวกลาง'], ['back', 'แถวหลัง'], ['laneTop', 'เลนบน'], ['laneBottom', 'เลนล่าง'], ['tribe', 'เผ่าที่เลือก'], ['team', 'ทั้งทีม'], ['enemy', 'ทีมศัตรู']];
export const runeSolo = scope => scope === 'one';
// Stat effects for builder runes, each = an existing skill effect (DO_INFO) · [key, label, flat do, % do, side, flat unit]
export const RUNE_EFFECTS = [
  ['atk', 'พลังโจมตี +', 'atkUp', 'atkPct', 'ally'], ['hp', 'HP สูงสุด +', 'hpUp', 'hpPct', 'ally'],
  ['armor', 'เกราะตอนเริ่ม +', 'armor', 'armorPct', 'ally'], ['armorHit', 'เกราะ/ฮิต +', 'armorHitUp', 'armorHitPct', 'ally'],
  ['cd', 'คูลดาวน์ −', 'cdMsDown', 'cdPct', 'ally', 'ms'], ['burn', 'ไฟ/ฮิต +', 'burnHitUp', 'burnHitPct', 'ally'], ['shock', 'ช็อต/ฮิต +', 'shockHitUp', 'shockHitPct', 'ally'],
  ['multi', 'มัลติฮิต +', 'multiUp', null, 'ally'], ['healHit', 'ฟื้น/ฮิต +', 'healHitUp', null, 'ally'],
  ['hitDmg', 'ดาเมจตี +', null, 'hitAmp', 'ally'], ['burnAmp', 'ไฟที่ทำให้ติด +', null, 'burnAmp', 'ally'], ['shockAmp', 'ดาเมจช็อต +', null, 'shockAmp', 'ally'],
  ['armorAmp', 'เกราะที่ได้รับ +', null, 'armorAmp', 'ally'], ['healAmp', 'ฟื้น HP ที่ได้รับ +', null, 'healAmp', 'ally'],
  ['lifesteal', 'ดูดเลือด (% ของดาเมจตีตรง ไม่นับไฟ/ช็อต)', null, 'lifesteal', 'ally'],
  ['eCd', 'คูลดาวน์ช้าลง +', null, 'cdSlowPct', 'foe'], ['eMaxHp', 'HP สูงสุด −', null, 'maxHpCut', 'foe'],
  ['eBurn', 'ติดไฟตอนเริ่ม +', 'burn', null, 'foe'], ['eShock', 'ติดช็อตตอนเริ่ม +', 'shock', null, 'foe'],
  ['eDmgTaken', 'โดนดาเมจตีเพิ่ม +', null, 'dmgTakenUp', 'foe'], ['eHealCut', 'ฟื้น HP ได้ −', null, 'healCut', 'foe'], ['eArmorCut', 'เกราะที่ได้ −', null, 'armorGainCut', 'foe'],
];
export const RUNE_EFF = Object.fromEntries(RUNE_EFFECTS.map(e => [e[0], e]));
const RUNE_V_MAX = 1e5;
const runeFx = (id, cat, rarity, scope, name, text, f = []) => ({ id, cat, rarity, scope, name, text, f });
const runeBx = (id, rarity, name, eff, mode, v, scope, cat = 'stat') => ({ id, cat, rarity, name, b: { eff, mode, v, scope } });
const RUNE_FIELD_TEXT = { 'เหล็กกล้า': 'ทั้งทีม เกราะที่ได้รับ +{pct}%', 'เพลิงเผา': 'ทั้งทีม ไฟที่ทำให้ติด +{pct}%', 'สายฟ้า': 'ทั้งทีม ช็อตที่ทำให้ติด +{pct}%', 'วายุ': 'ทั้งทีม ดาเมจต่อฮิต +{pct}%', 'ภูติ': 'ทั้งทีม ฟื้น HP ที่ได้รับ +{pct}%', 'อสูร': 'ทั้งทีม ดาเมจ +{pct}% หลังเพื่อนตัวไหนก็ได้ down' };
export const STAGE_RUNES = [
  // เงิน/ร้าน
  runeFx('T1', 'eco', 'common', 'team', 'ทอง', 'ได้เงินเพิ่ม {gold} ทุกด่าน', [['gold', 'เงิน/ด่าน', 2, 0, 20, '']]),
  runeFx('T2', 'eco', 'common', 'team', 'ดอกเบี้ย', 'มีเงินเก็บทุก {per} ได้เพิ่ม {gold} (สูงสุด {max})', [['per', 'ทุกๆ เงิน', 5, 1, 50, ''], ['gold', 'ได้เพิ่ม', 1, 0, 10, ''], ['max', 'สูงสุด', 3, 0, 20, '']]),
  runeFx('T3', 'eco', 'rare', 'team', 'แผงใหญ่', 'ร้านเพิ่ม {slots} ช่อง', [['slots', 'ช่องเพิ่ม', 1, 0, 3, '']]),
  runeFx('T4', 'eco', 'common', 'team', 'สุ่มฟรี', 'สุ่มร้านฟรี {free} ครั้งต่อรอบ', [['free', 'ครั้งฟรี/รอบ', 1, 0, 5, '']]),
  runeFx('X8', 'eco', 'common', 'team', 'แลกหัวใจ', 'ลดหัวใจ 1 ดวง ได้เงิน {gold} (รอบละครั้ง · ใช้ไม่ได้ถ้าหัวใจเหลือน้อยกว่า {minHearts})', [['gold', 'เงินที่ได้', 10, 1, 100, ''], ['minHearts', 'หัวใจขั้นต่ำ', 2, 2, 10, 'ดวง']]),
  runeFx('X2', 'eco', 'legend', 'one', 'ดึงดูดตัว', 'ตัวที่เลือก (ที่มีอยู่แล้ว) ออกในร้านบ่อยขึ้น ×{mult}', [['mult', 'โอกาส ×', 3, 1, 10, '']]),
  runeFx('X3', 'eco', 'legend', 'one', 'รวมร่างเร็ว', 'ตัวที่เลือก (ที่มีอยู่แล้ว) ใช้ {need} ตัวรวมร่าง (ปกติ 3)', [['need', 'ใช้กี่ตัว', 2, 2, 3, 'ตัว']]),
  // ค่าพลัง (builder: แก้ผล / ตำแหน่ง / ค่าหรือ % ได้)
  runeBx('T5', 'rare', 'คม', 'hitDmg', 'pct', 15, 'team'),
  runeBx('T6', 'common', 'แนวหน้า', 'armor', 'pct', 20, 'front'),
  runeBx('T7', 'common', 'แนวหลัง', 'cd', 'pct', 15, 'back'),
  runeBx('U3', 'common', 'เร่ง', 'cd', 'pct', 20, 'one'),
  runeBx('U5', 'common', 'เพลิงติด', 'burn', 'flat', 2, 'one'),
  runeBx('U6', 'rare', 'ลูกโซ่', 'multi', 'flat', 1, 'one'),
  runeBx('S1', 'common', 'ใจสู้', 'hp', 'pct', 15, 'team'),
  runeBx('S2', 'common', 'หนังหนา', 'armorHit', 'flat', 1, 'team'),
  runeBx('S3', 'common', 'ประกายไฟ', 'burn', 'flat', 1, 'team'),
  runeBx('S4', 'common', 'ประจุ', 'shock', 'flat', 1, 'team'),
  runeBx('S5', 'legend', 'พายุหมุน', 'multi', 'flat', 1, 'team'),
  runeBx('S6', 'common', 'ใบไม้ผลิ', 'healHit', 'flat', 2, 'team'),
  runeBx('S7', 'common', 'พลังกล้า', 'atk', 'pct', 10, 'team'),
  runeBx('S8', 'common', 'พลังดิบ', 'atk', 'flat', 3, 'one'),
  runeBx('S9', 'rare', 'ลมส่ง', 'cd', 'pct', 10, 'team'),
  runeBx('X1', 'rare', 'ดูดเลือด', 'lifesteal', 'pct', 15, 'one'),
  runeBx('X10', 'common', 'ถ่วงเวลา', 'eCd', 'pct', 15, 'enemy'),
  runeBx('X11', 'rare', 'กัดกร่อน', 'eMaxHp', 'pct', 10, 'enemy'),
  // เพิ่มเผ่า (Q4 B: นับเป็นเผ่าจริง ทั้งโบนัสเผ่าและสกิลที่เล็งเผ่า · ไม่ติดกฎเผ่าเพิ่มได้ 1)
  ...TRIBES.map((t, i) => runeFx('D' + (i + 1), 'tribe', 'common', 'one', 'รูน' + t, `ตัวที่เลือกได้เผ่า${t}เพิ่ม (นับเป็นเผ่าจริง)`)),
  // เวทสนาม (Q5 A: ทั้งทีมได้ผล)
  ...TRIBES.map((t, i) => runeFx('F' + (i + 1), 'field', 'rare', 'team', 'สนาม' + t, RUNE_FIELD_TEXT[t], [['pct', 'เพิ่ม', 20, 0, 300, '%']])),
  // พิเศษ
  runeFx('T8', 'special', 'legend', 'team', 'ธงเผ่า', 'เผ่าที่เลือกนับเพิ่ม {count} ตัว (รูนนี้พาไปได้ไม่เกินขั้น {maxTier})', [['count', 'นับเพิ่ม', 1, 0, 4, 'ตัว'], ['maxTier', 'ขั้นสูงสุด', 4, 2, 6, '']]),
  runeFx('T9', 'special', 'rare', 'team', 'ล่าบอส', 'ดาเมจใส่บอส +{dmgPct}%', [['dmgPct', 'ดาเมจใส่บอส', 40, 0, 300, '%']]),
  runeFx('T10', 'special', 'legend', 'team', 'คนสุดท้าย', 'เหลือตัวเดียว: ดาเมจ +{dmgPct}% คูลดาวน์ −{cdPct}%', [['dmgPct', 'ดาเมจ', 50, 0, 300, '%'], ['cdPct', 'คูลดาวน์ลด', 30, 0, 80, '%']]),
  runeFx('T11', 'special', 'rare', 'team', 'เติบโต', 'ชนะติดกัน ดาเมจ +{stepPct}% ต่อด่าน (สูงสุด {maxPct}%) แพ้แล้วรีเซ็ต', [['stepPct', 'ต่อด่าน', 3, 0, 50, '%'], ['maxPct', 'สูงสุด', 30, 0, 300, '%']]),
  runeFx('T12', 'special', 'legend', 'team', 'แก้วบาง', 'ดาเมจ +{dmgPct}% แต่ HP สูงสุดทั้งทีม −{hpPct}%', [['dmgPct', 'ดาเมจ', 35, 0, 300, '%'], ['hpPct', 'HP ลด', 20, 0, 90, '%']]),
  runeFx('X5', 'special', 'rare', 'team', 'ป้อมปราการ', 'HP สูงสุดทั้งทีม +{hpPct}% แต่พลังโจมตี −{atkPct}%', [['hpPct', 'HP เพิ่ม', 30, 0, 300, '%'], ['atkPct', 'พลังโจมตีลด', 20, 0, 90, '%']]),
  runeFx('U2', 'special', 'legend', 'one', 'ชุบ', 'ฟื้น {times} ครั้ง/แมตช์ ด้วย HP {hpPct}%', [['times', 'ครั้ง/แมตช์', 1, 0, 3, ''], ['hpPct', 'HP ตอนฟื้น', 50, 1, 100, '%']]),
  runeFx('X4', 'special', 'legend', 'one', 'เลี่ยงจุดตาย', 'ฮิตที่จะทำให้ down ถูกยกเลิกทั้งหมด (ดาเมจ ไฟ ช็อตของฮิตนั้น) {times} ครั้ง/แมตช์', [['times', 'ครั้ง/แมตช์', 1, 1, 3, '']]),
  runeFx('U4', 'special', 'rare', 'one', 'โล่', 'เกราะ {armorPct}% ของ HP สูงสุด และศัตรูต้องตีตัวนี้ก่อน', [['armorPct', 'เกราะ', 30, 0, 300, '%']]),
  runeFx('X6', 'special', 'rare', 'one', 'สายสัมพันธ์', 'ตัวนี้โดนตี → คู่ที่ผู้เล่นเลือกรับดาเมจแทน {pct}% (รับแทนต่อไม่ได้)', [['pct', 'รับแทน', 50, 1, 100, '%']]),
  runeFx('X7', 'special', 'legend', 'one', 'คู่หู', 'ตัวนี้โจมตี → คู่ที่ผู้เล่นเลือกตีเป้าเดียวกันตาม {pct}% ของการโจมตีปกติ (ครั้งละชุด · ตีตามต่อไม่ได้)', [['pct', 'แรงตีตาม', 100, 1, 300, '%']]),
  runeFx('U7', 'special', 'legend', 'one', 'คงทน', 'ค่าถาวรที่ได้ +{permPct}%', [['permPct', 'ค่าถาวร', 50, 0, 300, '%']]),
  runeFx('U8', 'special', 'legend', 'one', 'เงา', 'ขายแล้วได้ตัว Lv1 คืนที่ม้านั่ง ({times} ครั้ง/run)', [['times', 'ครั้ง/run', 1, 0, 3, '']]),
  runeFx('X9', 'special', 'common', 'team', 'ส่องทีม', 'ก่อนสู้เห็นตำแหน่งวางตัวและรายละเอียดทีมศัตรู (ไม่มีรูนนี้ = ไม่เห็นอะไรเลย)'),
];
export const RUNE_BY_ID = Object.fromEntries(STAGE_RUNES.map(r => [r.id, r]));
// Copies of one rune a player may hold in a run (user 29 Oct, set 52): 1 = unique rune · 2+ = stacks like levels. Shop/economy runes 3, others 1 (ค่าเสนอ).
export const RUNE_MAX_DEFAULT = { T1: 3, T2: 3, T3: 2, T4: 3 };
export const RUNE_MAX_HI = 9;
export const RUNE_CUSTOM_MAX = 40;
const RUNE_NAME_MAX = 16;
// Saved data from set 52 (old field name → builder value v)
const RUNE_OLD_V = { T5: 'dmgPct', T6: 'armorPct', T7: 'cdPct', U3: 'cdPct', U5: 'burn', U6: 'multi' };
// Skill runes (Q1 A): the unit(s) in scope get one battle skill · same checks as the skill editor (no "% ของ…", no summon, no position target)
export const runeSkillOk = s => !!s && BATTLE_WHEN.includes(s.when) && !!DO_INFO[s.do] && !DO_INFO[s.do].shop && !DO_INFO[s.do].of && s.do !== 'summon' && s.to !== 'allyAt' && skillTargets(s.when, s.do).includes(s.to);
const runeScopeLabel = x => x.scope === 'tribe' ? `เผ่า${x.tribe}` : (RUNE_SCOPES.find(s => s[0] === x.scope) || [, x.scope])[1];
// Effect text of a fixed or builder rune (skill runes: the page writes the skill line)
export function runeText(r, x) {
  if (r && r.f) return r.text.replace(/\{(\w+)\}/g, (_, k) => String(x[k]));
  const e = RUNE_EFF[x.eff];
  if (!e) return '';
  const unit = x.mode === 'pct' ? (e[0] === 'armor' ? '% ของ HP สูงสุด' : '%') : e[5] === 'ms' ? ' มิลลิวินาที' : '';
  return `${runeScopeLabel(x)}: ${e[1]}${e[0] === 'lifesteal' ? ' ' : ''}${x.v}${unit}`;
}
function runeDefault(r) {
  const base = { on: true, name: r.name, max: RUNE_MAX_DEFAULT[r.id] || 1, rarity: r.rarity };
  return r.f ? { ...base, ...Object.fromEntries(r.f.map(([k, , v]) => [k, v])) } : { ...base, ...r.b, tribe: TRIBES[0] };
}
export function customDefault(id, type = 'stat') {
  const base = { id, type, on: true, name: 'รูนใหม่', max: 1, rarity: 'common', scope: 'team', tribe: TRIBES[0] };
  return type === 'skill' ? { ...base, when: 'matchStart', do: 'atkUp', to: 'self', v: 5 } : { ...base, eff: 'atk', mode: 'flat', v: 5 };
}
const runeNum = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const runeIsObj = x => x && typeof x === 'object' && !Array.isArray(x);
const runeName = s => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, RUNE_NAME_MAX) : '';
function cleanRuneCommon(x, d) {
  if (typeof x.on === 'boolean') d.on = x.on;
  const nm = runeName(x.name); if (nm) d.name = nm;
  if (Number.isInteger(x.max) && x.max >= 1 && x.max <= RUNE_MAX_HI) d.max = x.max;
  if (RUNE_RARITY.some(q => q[0] === x.rarity)) d.rarity = x.rarity;
  if (TRIBES.includes(x.tribe)) d.tribe = x.tribe;
}
// Builder fields: effect, flat/% (only modes the effect has), scope (enemy effects ↔ enemy scope), value
function cleanRuneStat(x, d) {
  if (RUNE_EFF[x.eff]) d.eff = x.eff;
  const e = RUNE_EFF[d.eff];
  if (x.mode === 'flat' || x.mode === 'pct') d.mode = x.mode;
  if (!e[d.mode === 'flat' ? 2 : 3]) d.mode = e[2] ? 'flat' : 'pct';
  if (RUNE_SCOPES.some(s => s[0] === x.scope)) d.scope = x.scope;
  if (e[4] === 'foe') d.scope = 'enemy'; else if (d.scope === 'enemy') d.scope = 'team';
  if (runeNum(x.v, 0, RUNE_V_MAX)) d.v = x.v;
}
function cleanRunes(o, out) {
  if (runeIsObj(o.runes)) for (const r of STAGE_RUNES) {
    const x = o.runes[r.id]; if (!runeIsObj(x)) continue;
    const d = out.runes[r.id]; cleanRuneCommon(x, d);
    if (r.f) { for (const [k, , , lo, hi] of r.f) if (runeNum(x[k], lo, hi)) d[k] = x[k]; continue; }
    const y = x.v === undefined && RUNE_OLD_V[r.id] ? { ...x, v: x[RUNE_OLD_V[r.id]] } : x;
    cleanRuneStat(y, d);
  }
  if (Array.isArray(o.custom)) {
    const ids = new Set();
    for (const x of o.custom.slice(0, RUNE_CUSTOM_MAX)) {
      if (!runeIsObj(x) || typeof x.id !== 'string' || !/^C\d{1,3}$/.test(x.id) || ids.has(x.id) || (x.type !== 'stat' && x.type !== 'skill')) continue;
      const d = customDefault(x.id, x.type); cleanRuneCommon(x, d);
      if (x.type === 'stat') cleanRuneStat(x, d);
      else {
        const s = { when: x.when, do: x.do, to: x.to }; if (!runeSkillOk(s)) continue;
        Object.assign(d, s);
        if (RUNE_SCOPES.some(q => q[0] === x.scope && q[0] !== 'enemy')) d.scope = x.scope;
        if (runeNum(x.v, 0, RUNE_V_MAX)) d.v = x.v;
      }
      ids.add(x.id); out.custom.push(d);
    }
  }
}
// Drop: rarity by weight (boss may skip ธรรมดา), then a rune of that rarity · chance in % for the page
export function rarityOdds(st, boss = false) {
  const w = { common: boss && st.bossNoCommon ? 0 : st.wCommon, rare: st.wRare, legend: st.wLegend };
  const sum = w.common + w.rare + w.legend;
  return Object.fromEntries(RUNE_RARITY.map(([k]) => [k, sum ? (w[k] / sum) * 100 : 0]));
}

// Boss special rules: [id, label, default value, min, max, unit] (unit '' with max 0 = no value)
export const BOSS_RULES = [
  ['none', 'ไม่มีกฎพิเศษ', 0, 0, 0, ''],
  ['backSilence', 'แถวหลังของผู้เล่นใช้สกิลไม่ได้ ช่วงแรก (วิ)', 10, 1, 180, 'วิ'],
  ['healCut', 'ผู้เล่นฟื้นเลือดได้น้อยลง', 50, 1, 100, '%'],
  ['armorCut', 'เกราะผู้เล่นลดลง', 50, 1, 100, '%'],
  ['tribeOff', 'ปิดโบนัสเผ่าของผู้เล่น', 0, 0, 0, ''],
  ['enrage', 'บอสตีแรงขึ้นทุก 10 วิ', 20, 1, 200, '%'],
  ['reflect', 'สะท้อนดาเมจกลับ', 10, 1, 100, '%'],
  ['cdSlow', 'คูลดาวน์ผู้เล่นช้าลง', 20, 1, 200, '%'],
];
// Where the boss stands (user 29 Oct, set 52: per boss) · board side = 3 rows × 2 lanes. 'move' = 1 slot, jumps to a random slot every moveSec.
export const BOSS_SPOTS = [
  ['all', 'ทุกช่อง (6 ช่อง)'], ['four', 'แถวหน้า + แถวกลาง (4 ช่อง)'], ['front', 'แถวหน้า (2 ช่อง)'], ['one', '1 ช่อง (แถวหน้า เลนบน)'], ['move', '1 ช่อง ย้ายที่เรื่อยๆ'],
];
// Boss stats = at its first appearance (stage 5) · stage 10 = × mult10 · after stage 10 each boss + endlessPct%
// bars = HP colour bars (user 29 Oct): each emptied bar counts as "enemy down" for skills · bar size = HP ÷ bars (keeps the count when the boss scales).
export const BOSS_STATS = [['bars', 'จำนวนแถบสีเลือด', 1, 20], ['moveSec', 'ย้ายที่ทุก (วิ) (เฉพาะแบบย้ายที่)', 1, 60], ['hp', 'HP', 1, 1e6], ['atk', 'พลังโจมตี', 0, 1e5], ['cdMs', 'คูลดาวน์ (มิลลิวินาที)', 300, 60000], ['multi', 'มัลติฮิต', 1, 10], ['armor', 'เกราะเริ่ม', 0, 1e6], ['burn', 'ไฟ/ฮิต', 0, 1e4], ['shock', 'ช็อต/ฮิต', 0, 1e4]];
const stageBoss = (id, name, tribe, hp, atk, cdMs, rule, ruleV, spot = 'all') => ({ id, name, tribe, hp, atk, cdMs, multi: 1, bars: 5, spot, moveSec: 8, armor: 0, burn: 0, shock: 0, rule, ruleV, mult10: 2, endlessPct: 15, on: true });
// Sized from the stage baseline (median player at stage 5: ~7 dmg/s, team HP ~756) → boss lasts ~60 s, kills the team in ~60 s.
export const STAGE_BOSSES = [
  stageBoss('B1', 'ผู้เฝ้าประตู', 'เหล็กกล้า', 450, 25, 2000, 'armorCut', 50, 'all'),
  stageBoss('B2', 'เงาหลังม่าน', 'ภูติ', 400, 22, 1800, 'backSilence', 10, 'move'),
  stageBoss('B3', 'อสุรกายคลั่ง', 'อสูร', 420, 20, 2000, 'enrage', 20, 'four'),
  stageBoss('B4', 'กระจกสะท้อน', 'สายฟ้า', 380, 22, 2000, 'reflect', 10, 'front'),
];
export const STAGE_SETTINGS = [
  ['bossEvery', 'บอสทุกกี่ด่าน', 5, 1, 20, 'ด่าน'], ['bossesPerRun', 'บอสใน run หลัก', 2, 1, 10, 'ตัว'],
  ['dropHard', 'โอกาสได้รูน ด่านยาก', 50, 0, 100, '%'], ['dropNormal', 'โอกาสได้รูน ด่านกลาง', 30, 0, 100, '%'], ['dropEasy', 'โอกาสได้รูน ด่านง่าย', 10, 0, 100, '%'], ['dropBoss', 'โอกาสได้รูน บอส', 100, 0, 100, '%'],
  // Rune rarity weights (user 29 Oct set 53: 3 tiers · ค่าเสนอ) · boss drop skips ธรรมดา when bossNoCommon = 1
  ['wCommon', 'น้ำหนักสุ่ม รูนธรรมดา', 60, 0, 100, ''], ['wRare', 'น้ำหนักสุ่ม รูนหายาก', 30, 0, 100, ''], ['wLegend', 'น้ำหนักสุ่ม รูนตำนาน', 10, 0, 100, ''], ['bossNoCommon', 'บอสไม่ดรอปรูนธรรมดา (1 = ใช่)', 1, 0, 1, ''],
  // Endless (user 29 Oct, set 52): play up to lastStage · past the measured baseline (stage 19) normal enemies grow growPct% per stage, compounding (ทวี)
  ['lastStage', 'ด่านสุดท้าย (เล่นต่อได้ถึง)', 50, 10, 200, 'ด่าน'], ['growFrom', 'ศัตรูเริ่มแรงขึ้นตั้งแต่ด่าน', 20, 2, 200, 'ด่าน'], ['growPct', 'ศัตรูแรงขึ้นต่อด่าน (ทบต้น)', 8, 0, 100, '%'],
];
// Normal-enemy HP/attack multiplier at a stage (1 before growFrom).
export const enemyMultAt = (st, stage) => (1 + st.growPct / 100) ** Math.max(0, stage - st.growFrom + 1);

export function stageDefaults() {
  return {
    runes: Object.fromEntries(STAGE_RUNES.map(r => [r.id, runeDefault(r)])),
    custom: [],
    bosses: STAGE_BOSSES.map(b => ({ ...b })),
    settings: Object.fromEntries(STAGE_SETTINGS.map(([k, , v]) => [k, v])),
  };
}

// External data (database / pasted code) → only known keys, numbers in range, names cleaned. Unknown/bad parts fall back to defaults.
export function cleanStage(o) {
  const out = stageDefaults();
  if (!o || typeof o !== 'object') return out;
  const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  cleanRunes(o, out);
  if (isObj(o.settings)) for (const [k, , , lo, hi] of STAGE_SETTINGS) if (num(o.settings[k], lo, hi)) out.settings[k] = o.settings[k];
  if (Array.isArray(o.bosses) && o.bosses.length >= 1 && o.bosses.length <= 12) {
    const ids = new Set(), list = [];
    for (const x of o.bosses) {
      if (!isObj(x) || typeof x.id !== 'string' || !/^B\d{1,2}$/.test(x.id) || ids.has(x.id)) continue;
      ids.add(x.id);
      const base = STAGE_BOSSES.find(b => b.id === x.id) || stageBoss(x.id, 'บอสใหม่', TRIBES[0], 400, 20, 2000, 'none', 0, 'all');
      const b = { ...base };
      const nm = typeof x.name === 'string' ? x.name.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 24) : ''; if (nm) b.name = nm;
      if (TRIBES.includes(x.tribe)) b.tribe = x.tribe;
      if (BOSS_SPOTS.some(q => q[0] === x.spot)) b.spot = x.spot;
      for (const [k, , lo, hi] of BOSS_STATS) if (num(x[k], lo, hi) && (!['bars', 'moveSec', 'multi'].includes(k) || Number.isInteger(x[k]))) b[k] = x[k];
      const rule = BOSS_RULES.find(r => r[0] === x.rule); if (rule) { b.rule = rule[0]; b.ruleV = rule[4] ? (num(x.ruleV, rule[3], rule[4]) ? x.ruleV : rule[2]) : 0; }
      if (num(x.mult10, 0.1, 20)) b.mult10 = x.mult10;
      if (num(x.endlessPct, 0, 500)) b.endlessPct = x.endlessPct;
      if (typeof x.on === 'boolean') b.on = x.on;
      list.push(b);
    }
    if (list.length) out.bosses = list;
  }
  return out;
}

// Boss stats at a stage (k = 1 first boss, 2 second, 3+ endless) — for display now, battle later.
export function bossAt(b, k) {
  const m = k <= 1 ? 1 : b.mult10 * (1 + b.endlessPct / 100) ** Math.max(0, k - 2);
  return { hp: Math.round(b.hp * m), barHp: Math.round(b.hp * m / b.bars), atk: Math.round(b.atk * m), armor: Math.round(b.armor * m), dps: b.atk * m * b.multi / (b.cdMs / 1000) };
}
