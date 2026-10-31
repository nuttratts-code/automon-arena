// Stage mode (demo) data — phase 1 (29 Oct 2026; set 52 added rune name/max, boss spot/bars/moveSec, endless settings; set 53 runes v2): runes, bosses, stage settings that the Balance Room edits.
// The battle engine does NOT use these yet (phase 2). Every number = proposal (ค่าเสนอ) until the user confirms.
// Design notes: claude/backlog.md "Stage mode" · claude/review-2026-10-28-runes.md · claude/review-2026-10-29-stage-baseline.md
import { TRIBES, DO_INFO, BATTLE_WHEN, skillTargets } from './rules.js';
import { STAGE_USER } from './stage-user.js';

// ---------- Runes v2 (user 29 Oct, set 53 · claude/review-2026-10-29-runes-v2.md) ----------
// Every rune: rarity (3 tiers, user Q12) · category · scope ('one' = เฉพาะตัว, others = ส่วนรวม, user Q2 A).
// Set 60 (user 30 Oct): every rune = common basics + one effect `eff` the user can switch: stat (flat/% + value), special (own fields) or skill.
export const RUNE_RARITY = [['common', 'ธรรมดา'], ['rare', 'หายาก'], ['legend', 'ตำนาน']];
export const RUNE_CATS = [['stat', 'ค่าพลัง'], ['skill', 'สกิล'], ['tribe', 'เพิ่มเผ่า'], ['field', 'เวทสนาม'], ['special', 'พิเศษ'], ['eco', 'เงิน/ร้าน']];
export const RUNE_SCOPES = [['one', 'ตัวเดียว'], ['front', 'แถวหน้า'], ['mid', 'แถวกลาง'], ['back', 'แถวหลัง'], ['laneTop', 'เลนบน'], ['laneBottom', 'เลนล่าง'], ['tribe', 'เผ่าที่เลือก'], ['team', 'ทั้งทีม'], ['enemy', 'ทีมศัตรู']];
export const runeSolo = scope => scope === 'one';
// Rune themes (user 30 Oct): finer grouping than RUNE_CATS · a rune's `theme` '' = automatic (page picks from its effect) (set 59: user may pick any)
export const RUNE_THEMES = [['dmg', 'โจมตี/ดาเมจ'], ['armor', 'เกราะ/ป้องกัน'], ['heal', 'HP/ฟื้นฟู'], ['speed', 'ความเร็ว'], ['burn', 'ไฟ'], ['shock', 'ช็อต'], ['debuff', 'กดศัตรู'], ['survive', 'รอดตาย'], ['gold', 'เงิน/ร้าน'], ['tribe', 'เผ่า'], ['other', 'อื่นๆ']];
// In play = switched on and not deleted (set 59: built-in runes can be deleted and restored)
export const runeActive = x => !!x && x.on && !x.del;
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
// Special effects (set 60, user 30 Oct: every rune can take any effect — no rune is tied to its own code any more).
// [key, theme, natural scope, label, text, fields f = [key, label, default, min, max, unit]] · unit 'tribe' = pick a tribe (default '' = first tribe)
// Text gets the scope label in front when the rune is used on another scope than the natural one.
const spec = (key, theme, scope, label, text, f = []) => ({ key, theme, scope, label, text, f });
export const RUNE_SPECIAL = [
  // เงิน/ร้าน
  spec('gold', 'gold', 'team', 'ได้เงินทุกด่าน', 'ได้เงินเพิ่ม {gold} ทุกด่าน', [['gold', 'เงิน/ด่าน', 2, 0, 20, '']]),
  spec('interest', 'gold', 'team', 'ดอกเบี้ย', 'มีเงินเก็บทุก {per} ได้เพิ่ม {gold} (สูงสุด {cap})', [['per', 'ทุกๆ เงิน', 5, 1, 50, ''], ['gold', 'ได้เพิ่ม', 1, 0, 10, ''], ['cap', 'สูงสุด', 3, 0, 20, '']]),
  spec('shopSlots', 'gold', 'team', 'ร้านเพิ่มช่อง', 'ร้านเพิ่ม {slots} ช่อง', [['slots', 'ช่องเพิ่ม', 1, 0, 3, '']]),
  spec('freeRoll', 'gold', 'team', 'สุ่มร้านฟรี', 'สุ่มร้านฟรี {free} ครั้งต่อรอบ', [['free', 'ครั้งฟรี/รอบ', 1, 0, 5, '']]),
  spec('heartTrade', 'gold', 'team', 'แลกหัวใจเป็นเงิน', 'ลดหัวใจ 1 ดวง ได้เงิน {gold} (รอบละครั้ง · ใช้ไม่ได้ถ้าหัวใจเหลือน้อยกว่า {minHearts})', [['gold', 'เงินที่ได้', 10, 1, 100, ''], ['minHearts', 'หัวใจขั้นต่ำ', 2, 2, 10, 'ดวง']]),
  spec('lure', 'gold', 'one', 'ตัวนี้ออกในร้านบ่อยขึ้น', 'ตัวที่เลือก (ที่มีอยู่แล้ว) ออกในร้านบ่อยขึ้น ×{mult}', [['mult', 'โอกาส ×', 3, 1, 10, '']]),
  spec('fastMerge', 'gold', 'one', 'รวมร่างเร็ว', 'ตัวที่เลือก (ที่มีอยู่แล้ว) ใช้ {need} ตัวรวมร่าง (ปกติ 3)', [['need', 'ใช้กี่ตัว', 2, 2, 3, 'ตัว']]),
  spec('shadow', 'gold', 'one', 'ขายแล้วได้คืน', 'ขายแล้วได้ตัว Lv1 คืนที่ม้านั่ง ({times} ครั้ง/run)', [['times', 'ครั้ง/run', 1, 0, 3, '']]),
  // เผ่า (Q4 B: นับเป็นเผ่าจริง ทั้งโบนัสเผ่าและสกิลที่เล็งเผ่า · ไม่ติดกฎเผ่าเพิ่มได้ 1)
  spec('addTribe', 'tribe', 'one', 'ได้เผ่าเพิ่ม', 'ได้เผ่า{gain}เพิ่ม (นับเป็นเผ่าจริง)', [['gain', 'เผ่าที่ได้', '', 0, 0, 'tribe']]),
  spec('flag', 'tribe', 'team', 'ธงเผ่า (นับเผ่าเพิ่ม)', 'เผ่าที่เลือกนับเพิ่ม {count} ตัว (รูนนี้พาไปได้ไม่เกินขั้น {maxTier} · เผ่าเลือกตอนได้รูน)', [['count', 'นับเพิ่ม', 1, 0, 4, 'ตัว'], ['maxTier', 'ขั้นสูงสุด', 4, 2, 6, '']]),
  // ดาเมจ
  spec('allyDownDmg', 'dmg', 'team', 'ดาเมจ + หลังเพื่อน down', 'ดาเมจ +{pct}% หลังเพื่อนตัวไหนก็ได้ down', [['pct', 'เพิ่ม', 20, 0, 300, '%']]),
  spec('bossDmg', 'dmg', 'team', 'ดาเมจใส่บอส +', 'ดาเมจใส่บอส +{dmgPct}%', [['dmgPct', 'ดาเมจใส่บอส', 40, 0, 300, '%']]),
  spec('lastStand', 'dmg', 'team', 'เหลือตัวเดียวแรงขึ้น', 'เหลือตัวเดียว: ดาเมจ +{dmgPct}% คูลดาวน์ −{cdPct}%', [['dmgPct', 'ดาเมจ', 50, 0, 300, '%'], ['cdPct', 'คูลดาวน์ลด', 30, 0, 80, '%']]),
  spec('growth', 'dmg', 'team', 'ชนะติดกันแรงขึ้น', 'ชนะติดกัน ดาเมจ +{stepPct}% ต่อด่าน (สูงสุด {maxPct}%) แพ้แล้วรีเซ็ต', [['stepPct', 'ต่อด่าน', 3, 0, 50, '%'], ['maxPct', 'สูงสุด', 30, 0, 300, '%']]),
  spec('glass', 'dmg', 'team', 'ดาเมจ + แลก HP −', 'ดาเมจ +{dmgPct}% แต่ HP สูงสุด −{hpPct}%', [['dmgPct', 'ดาเมจ', 35, 0, 300, '%'], ['hpPct', 'HP ลด', 20, 0, 90, '%']]),
  spec('buddy', 'dmg', 'one', 'คู่หูตีตาม', 'ตัวนี้โจมตี → คู่ที่ผู้เล่นเลือกตีเป้าเดียวกันตาม {pct}% ของการโจมตีปกติ (ครั้งละชุด · ตีตามต่อไม่ได้)', [['pct', 'แรงตีตาม', 100, 1, 300, '%']]),
  // ป้องกัน/รอด
  spec('fortress', 'heal', 'team', 'HP + แลกพลังโจมตี −', 'HP สูงสุด +{hpPct}% แต่พลังโจมตี −{atkPct}%', [['hpPct', 'HP เพิ่ม', 30, 0, 300, '%'], ['atkPct', 'พลังโจมตีลด', 20, 0, 90, '%']]),
  spec('taunt', 'armor', 'one', 'โล่ + ล่อเป้า', 'เกราะ {armorPct}% ของ HP สูงสุด และศัตรูต้องตีตัวนี้ก่อน', [['armorPct', 'เกราะ', 30, 0, 300, '%']]),
  spec('revive', 'survive', 'one', 'ฟื้นหลัง down', 'ฟื้น {times} ครั้ง/แมตช์ ด้วย HP {hpPct}%', [['times', 'ครั้ง/แมตช์', 1, 0, 3, ''], ['hpPct', 'HP ตอนฟื้น', 50, 1, 100, '%']]),
  spec('avoidDeath', 'survive', 'one', 'เลี่ยงจุดตาย', 'ฮิตที่จะทำให้ down ถูกยกเลิกทั้งหมด (ดาเมจ ไฟ ช็อตของฮิตนั้น) {times} ครั้ง/แมตช์', [['times', 'ครั้ง/แมตช์', 1, 1, 3, '']]),
  // User rune ideas 31 Oct (claude/review-2026-10-31-rune-ideas.md) · numbers = ค่าเสนอ, user tunes
  spec('freeze', 'debuff', 'enemy', 'ศัตรูหยุดตอนเริ่มสู้', 'ตอนเริ่มสู้ ศัตรูหยุดทำทุกอย่าง {sec} วินาที (บอสหยุด {bossPct}% ของเวลานั้น)', [['sec', 'หยุดกี่วินาที', 3, 0, 10, 'วิ'], ['bossPct', 'บอสหยุด', 50, 0, 100, '%']]),
  spec('regenLow', 'heal', 'team', 'ฮีลเพื่อนเลือดน้อยสุด ทุก x วิ', 'ทุก {sec} วินาที เพื่อนที่ HP เหลือน้อยที่สุดฟื้น {pct}% ของ HP สูงสุด', [['sec', 'ทุกกี่วินาที', 5, 1, 60, 'วิ'], ['pct', 'ฟื้น', 10, 0, 100, '%']]),
  spec('regen', 'heal', 'team', 'ฮีลตัวในขอบเขต ทุก x วิ', 'ทุก {sec} วินาที ฟื้น {pct}% ของ HP สูงสุด (ทุกตัวในขอบเขต · ตัวเดียว = ตัวที่ใส่รูน)', [['sec', 'ทุกกี่วินาที', 5, 1, 60, 'วิ'], ['pct', 'ฟื้น', 5, 0, 100, '%']]),
  spec('armorShare', 'armor', 'one', 'ได้เกราะ → แบ่งให้เพื่อนเผ่า', 'ตัวนี้ได้เกราะ → เพื่อนเผ่าเดียวกันสุ่ม {count} ตัวได้เกราะ {pct}% ของที่ได้ (เกราะที่แบ่งไปไม่ทำให้รูนทำงานซ้ำ)', [['pct', 'แบ่งให้', 50, 0, 300, '%'], ['count', 'กี่ตัว', 1, 1, 5, 'ตัว']]),
  spec('hpToArmorHit', 'armor', 'one', 'แลก HP เป็นเกราะ/ฮิต', 'HP สูงสุด −{hpPct}% แล้วได้เกราะ/ฮิต +{rate}% ของ HP ที่ลดไป (ปัดลง)', [['hpPct', 'HP ลด', 50, 0, 90, '%'], ['rate', 'ได้เกราะ/ฮิต', 2, 0, 100, '% ของ HP ที่ลด']]),
  spec('link', 'survive', 'one', 'คู่รับดาเมจแทน', 'ตัวนี้โดนตี → คู่ที่ผู้เล่นเลือกรับดาเมจแทน {pct}% (รับแทนต่อไม่ได้)', [['pct', 'รับแทน', 50, 1, 100, '%']]),
  // อื่นๆ
  spec('permUp', 'other', 'one', 'ค่าถาวร +', 'ค่าถาวรที่ได้ +{permPct}%', [['permPct', 'ค่าถาวร', 50, 0, 300, '%']]),
  spec('scout', 'other', 'team', 'ส่องทีมศัตรู', 'ก่อนสู้เห็นตำแหน่งวางตัวและรายละเอียดทีมศัตรู (ไม่มีรูนนี้ = ไม่เห็นอะไรเลย)'),
];
export const RUNE_SPEC = Object.fromEntries(RUNE_SPECIAL.map(s => [s.key, s]));
// Effect kinds: stat (RUNE_EFFECTS, flat/% + value) · special (RUNE_SPECIAL, own fields) · 'skill' (one battle skill, Q1 A)
export const runeKind = eff => eff === 'skill' ? 'skill' : RUNE_EFF[eff] ? 'stat' : RUNE_SPEC[eff] ? 'special' : '';
// Built-in runes = name + rarity + starting effect (p = values that differ from the effect's defaults)
const rune = (id, rarity, name, eff, scope, p = {}) => ({ id, rarity, name, eff, scope, p });
const runeSt = (id, rarity, name, eff, mode, v, scope) => rune(id, rarity, name, eff, scope, { mode, v });
// Field runes: one effect per tribe (F6 อสูร = special allyDownDmg)
const RUNE_FIELD_EFF = { 'เหล็กกล้า': 'armorAmp', 'เพลิงเผา': 'burnAmp', 'สายฟ้า': 'shockAmp', 'วายุ': 'hitDmg', 'ภูติ': 'healAmp', 'อสูร': 'allyDownDmg' };
export const STAGE_RUNES = [
  // เงิน/ร้าน
  rune('T1', 'common', 'ทอง', 'gold', 'team'), rune('T2', 'common', 'ดอกเบี้ย', 'interest', 'team'),
  rune('T3', 'rare', 'แผงใหญ่', 'shopSlots', 'team'), rune('T4', 'common', 'สุ่มฟรี', 'freeRoll', 'team'),
  rune('X8', 'common', 'แลกหัวใจ', 'heartTrade', 'team'), rune('X2', 'legend', 'ดึงดูดตัว', 'lure', 'one'), rune('X3', 'legend', 'รวมร่างเร็ว', 'fastMerge', 'one'),
  // ค่าพลัง
  runeSt('T5', 'rare', 'คม', 'hitDmg', 'pct', 15, 'team'),
  runeSt('T6', 'common', 'แนวหน้า', 'armor', 'pct', 20, 'front'),
  runeSt('T7', 'common', 'แนวหลัง', 'cd', 'pct', 15, 'back'),
  runeSt('U3', 'common', 'เร่ง', 'cd', 'pct', 20, 'one'),
  runeSt('U5', 'common', 'เพลิงติด', 'burn', 'flat', 2, 'one'),
  runeSt('U6', 'rare', 'ลูกโซ่', 'multi', 'flat', 1, 'one'),
  runeSt('S1', 'common', 'ใจสู้', 'hp', 'pct', 15, 'team'),
  runeSt('S2', 'common', 'หนังหนา', 'armorHit', 'flat', 1, 'team'),
  runeSt('S3', 'common', 'ประกายไฟ', 'burn', 'flat', 1, 'team'),
  runeSt('S4', 'common', 'ประจุ', 'shock', 'flat', 1, 'team'),
  runeSt('S5', 'legend', 'พายุหมุน', 'multi', 'flat', 1, 'team'),
  runeSt('S6', 'common', 'ใบไม้ผลิ', 'healHit', 'flat', 2, 'team'),
  runeSt('S7', 'common', 'พลังกล้า', 'atk', 'pct', 10, 'team'),
  runeSt('S8', 'common', 'พลังดิบ', 'atk', 'flat', 3, 'one'),
  runeSt('S9', 'rare', 'ลมส่ง', 'cd', 'pct', 10, 'team'),
  runeSt('X1', 'rare', 'ดูดเลือด', 'lifesteal', 'pct', 15, 'one'),
  runeSt('X10', 'common', 'ถ่วงเวลา', 'eCd', 'pct', 15, 'enemy'),
  runeSt('X11', 'rare', 'กัดกร่อน', 'eMaxHp', 'pct', 10, 'enemy'),
  // เพิ่มเผ่า
  ...TRIBES.map((t, i) => rune('D' + (i + 1), 'common', 'รูน' + t, 'addTribe', 'one', { gain: t })),
  // เวทสนาม (Q5 A: ทั้งทีมได้ผล)
  ...TRIBES.map((t, i) => rune('F' + (i + 1), 'rare', 'สนาม' + t, RUNE_FIELD_EFF[t], 'team', RUNE_SPEC[RUNE_FIELD_EFF[t]] ? {} : { mode: 'pct', v: 20 })),
  // พิเศษ
  rune('T8', 'legend', 'ธงเผ่า', 'flag', 'team'), rune('T9', 'rare', 'ล่าบอส', 'bossDmg', 'team'), rune('T10', 'legend', 'คนสุดท้าย', 'lastStand', 'team'),
  rune('T11', 'rare', 'เติบโต', 'growth', 'team'), rune('T12', 'legend', 'แก้วบาง', 'glass', 'team'), rune('X5', 'rare', 'ป้อมปราการ', 'fortress', 'team'),
  rune('U2', 'legend', 'ชุบ', 'revive', 'one'), rune('X4', 'legend', 'เลี่ยงจุดตาย', 'avoidDeath', 'one'), rune('U4', 'rare', 'โล่', 'taunt', 'one'),
  rune('X6', 'rare', 'สายสัมพันธ์', 'link', 'one'), rune('X7', 'legend', 'คู่หู', 'buddy', 'one'), rune('U7', 'legend', 'คงทน', 'permUp', 'one'),
  rune('U8', 'legend', 'เงา', 'shadow', 'one'), rune('X9', 'common', 'ส่องทีม', 'scout', 'team'),
];
export const RUNE_BY_ID = Object.fromEntries(STAGE_RUNES.map(r => [r.id, r]));
// Copies of one rune a player may hold in a run: 1 = unique rune · 2+ = stacks like levels.
// Set 61 (user rule 31 Oct): copies follow rarity for every rune — ธรรมดา 3 · หายาก 2 · ตำนาน 1 · still editable per rune.
export const RUNE_COPIES = { common: 3, rare: 2, legend: 1 };
// Defaults before set 61: an old save holding exactly these is treated as "not set" → copies follow rarity
const RUNE_MAX_OLD = { T1: 3, T2: 3, T3: 2, T4: 3 };
export const RUNE_MAX_HI = 9;
export const RUNE_CUSTOM_MAX = 40;
const RUNE_NAME_MAX = 16;
// Saved data from older sets (old field name → stat value v): set 52 builder runes, set 59 field runes (pct)
const RUNE_OLD_V = { T5: 'dmgPct', T6: 'armorPct', T7: 'cdPct', U3: 'cdPct', U5: 'burn', U6: 'multi', F1: 'pct', F2: 'pct', F3: 'pct', F4: 'pct', F5: 'pct' };
// Skill runes (Q1 A): the unit(s) in scope get one battle skill · same checks as the skill editor (no "% ของ…", no summon, no position target)
export const runeSkillOk = s => !!s && BATTLE_WHEN.includes(s.when) && !!DO_INFO[s.do] && !DO_INFO[s.do].shop && !DO_INFO[s.do].of && s.do !== 'summon' && s.to !== 'allyAt' && skillTargets(s.when, s.do).includes(s.to);
export const runeScopeLabel = x => x.scope === 'tribe' ? `เผ่า${x.tribe}` : (RUNE_SCOPES.find(s => s[0] === x.scope) || [, x.scope])[1];
// Effect text of a rune record (skill runes: the page writes the skill line)
export function runeText(x) {
  const k = runeKind(x.eff);
  if (k === 'special') {
    const s = RUNE_SPEC[x.eff], t = s.text.replace(/\{(\w+)\}/g, (_, q) => String(x[q]));
    return x.scope !== s.scope ? `${runeScopeLabel(x)}: ${t}` : t;
  }
  if (k !== 'stat') return '';
  const e = RUNE_EFF[x.eff];
  const unit = x.mode === 'pct' ? (e[0] === 'armor' ? '% ของ HP สูงสุด' : '%') : e[5] === 'ms' ? ' มิลลิวินาที' : '';
  return `${runeScopeLabel(x)}: ${e[1]}${e[0] === 'lifesteal' ? ' ' : ''}${x.v}${unit}`;
}
// Values an effect starts with when picked (ค่าเสนอ)
function runeEffDefaults(eff) {
  const k = runeKind(eff);
  if (k === 'skill') return { when: 'matchStart', do: 'atkUp', to: 'self', v: 5 };
  if (k === 'special') return Object.fromEntries(RUNE_SPEC[eff].f.map(([q, , v, , , u]) => [q, u === 'tribe' ? v || TRIBES[0] : v]));
  const e = RUNE_EFF[eff];
  return e[2] ? { mode: 'flat', v: 5 } : { mode: 'pct', v: 10 };
}
const RUNE_COMMON = ['id', 'on', 'del', 'name', 'max', 'rarity', 'theme', 'scope', 'tribe'];
// Same rune with another effect: keeps name/rarity/copies/theme/scope, drops the old effect's values (page "ผล" dropdown)
export function runeWithEff(x, eff) {
  if (!runeKind(eff)) return x;
  const y = Object.fromEntries(RUNE_COMMON.filter(k => k in x).map(k => [k, x[k]]));
  Object.assign(y, { eff }, runeEffDefaults(eff));
  const e = RUNE_EFF[eff];
  if (e && e[4] === 'foe') y.scope = 'enemy';
  else if (y.scope === 'enemy') y.scope = RUNE_SPEC[eff] ? RUNE_SPEC[eff].scope : 'team';
  return y;
}
function runeDefault(r) {
  const base = { on: true, del: false, name: r.name, max: RUNE_COPIES[r.rarity], rarity: r.rarity, theme: '', tribe: TRIBES[0], scope: r.scope, eff: r.eff };
  return { ...base, ...runeEffDefaults(r.eff), ...r.p };
}
export function customDefault(id, eff = 'atk') {
  if (eff === 'stat') eff = 'atk';
  return runeWithEff({ id, on: true, del: false, name: 'รูนใหม่', max: RUNE_COPIES.common, rarity: 'common', theme: '', scope: 'team', tribe: TRIBES[0] }, eff);
}
const runeNum = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const runeIsObj = x => x && typeof x === 'object' && !Array.isArray(x);
const runeName = s => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, RUNE_NAME_MAX) : '';
function cleanRuneCommon(x, d) {
  if (typeof x.on === 'boolean') d.on = x.on;
  if (typeof x.del === 'boolean') d.del = x.del;
  if (x.theme === '' || RUNE_THEMES.some(t => t[0] === x.theme)) d.theme = x.theme;
  const nm = runeName(x.name); if (nm) d.name = nm;
  if (RUNE_RARITY.some(q => q[0] === x.rarity)) d.rarity = x.rarity;
  d.max = Number.isInteger(x.max) && x.max >= 1 && x.max <= RUNE_MAX_HI ? x.max : RUNE_COPIES[d.rarity];
  if (TRIBES.includes(x.tribe)) d.tribe = x.tribe;
  if (RUNE_SCOPES.some(s => s[0] === x.scope)) d.scope = x.scope;
}
// Effect values by kind · stat: flat/% only where the effect has it, enemy effects ↔ enemy scope · skill: never on the enemy team
// Returns false when a skill rune's skill is not allowed.
function cleanRuneEff(x, d) {
  const k = runeKind(d.eff);
  if (k === 'stat') {
    const e = RUNE_EFF[d.eff];
    if (x.mode === 'flat' || x.mode === 'pct') d.mode = x.mode;
    if (!e[d.mode === 'flat' ? 2 : 3]) d.mode = e[2] ? 'flat' : 'pct';
    if (e[4] === 'foe') d.scope = 'enemy'; else if (d.scope === 'enemy') d.scope = 'team';
    if (runeNum(x.v, 0, RUNE_V_MAX)) d.v = x.v;
  } else if (k === 'special') {
    for (const [q, , , lo, hi, u] of RUNE_SPEC[d.eff].f) if (u === 'tribe' ? TRIBES.includes(x[q]) : runeNum(x[q], lo, hi)) d[q] = x[q];
  } else {
    const s = { when: x.when, do: x.do, to: x.to };
    if (runeSkillOk(s)) Object.assign(d, s); else if (x.when !== undefined || x.do !== undefined) return false;
    if (d.scope === 'enemy') d.scope = 'team';
    if (runeNum(x.v, 0, RUNE_V_MAX)) d.v = x.v;
  }
  return true;
}
// Saved rune → clean record on top of default d · old saves: no eff = the rune's starting effect, custom type 'skill' = skill rune
function cleanRune(x, d) {
  let eff = x.eff;
  if (eff === undefined && x.type === 'skill') eff = 'skill';
  if (runeKind(eff) && eff !== d.eff) d = runeWithEff(d, eff);
  cleanRuneCommon(x, d);
  return cleanRuneEff(x, d) ? d : null;
}
function cleanRunes(o, out) {
  const oldSave = o.copiesRule !== 'rarity', noOldMax = (x, m) => (oldSave && x.max === m ? { ...x, max: undefined } : x);
  if (runeIsObj(o.runes)) for (const r of STAGE_RUNES) {
    const x = runeIsObj(o.runes[r.id]) ? noOldMax(o.runes[r.id], RUNE_MAX_OLD[r.id] || 1) : null; if (!x) continue;
    const y = x.v === undefined && RUNE_OLD_V[r.id] && x[RUNE_OLD_V[r.id]] !== undefined && (x.eff === undefined || x.eff === r.eff) ? { ...x, v: x[RUNE_OLD_V[r.id]] } : x;
    out.runes[r.id] = cleanRune(y, out.runes[r.id]) || out.runes[r.id];
  }
  if (Array.isArray(o.custom)) {
    out.custom = [];
    const ids = new Set();
    for (const x of o.custom.slice(0, RUNE_CUSTOM_MAX)) {
      if (!runeIsObj(x) || typeof x.id !== 'string' || !/^C\d{1,3}$/.test(x.id) || ids.has(x.id)) continue;
      const eff = x.type === 'skill' ? 'skill' : x.eff !== undefined ? x.eff : x.type === 'stat' ? 'atk' : null;
      if (!runeKind(eff)) continue;
      const d = cleanRune({ ...noOldMax(x, 1), eff }, customDefault(x.id, eff)); if (!d) continue;
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

// Boss special rules: [id, label, default value, min, max, unit, extra] (max 0 = no value) · extra = second value [label, default, min, max, unit] or 'tribe' (rule needs a tribe)
// Set 64 (user 31 Oct, claude/review-2026-10-31-boss-phases.md): pool grown from 8 to 38 (R1–R30) · all numbers ค่าเสนอ · battle effect waits for the boss battle engine (phase 2a).
// Heal rules (lifesteal/regen/feedOnDown/dpsCheck) never refill an emptied bar and never re-trigger "enemy down" (loophole guard).
export const BOSS_RULES = [
  ['none', 'ไม่มีกฎพิเศษ', 0, 0, 0, ''],
  ['backSilence', 'แถวหลังของผู้เล่นใช้สกิลไม่ได้ ช่วงแรก (วิ)', 10, 1, 180, 'วิ'],
  ['healCut', 'ผู้เล่นฟื้นเลือดได้น้อยลง', 50, 1, 100, '%'],
  ['armorCut', 'เกราะผู้เล่นลดลง', 50, 1, 100, '%'],
  ['tribeOff', 'ปิดโบนัสเผ่าของผู้เล่น', 0, 0, 0, ''],
  ['enrage', 'บอสตีแรงขึ้นทุก 10 วิ', 20, 1, 200, '%'],
  ['reflect', 'สะท้อนดาเมจกลับ', 10, 1, 100, '%'],
  ['cdSlow', 'คูลดาวน์ผู้เล่นช้าลง', 20, 1, 200, '%'],
  // บอสแรงขึ้น
  ['atkUp', 'R1 บอสตีแรงขึ้น', 30, 1, 500, '%'],
  ['fastAtk', 'R2 คูลดาวน์บอสเร็วขึ้น', 20, 1, 90, '%'],
  ['multiUp', 'R3 บอสมัลติฮิตเพิ่ม', 1, 1, 5, 'ครั้ง'],
  ['aoe', 'R4 บอสตีโดนทุกตัว (ดาเมจต่อตัว)', 40, 1, 100, '%'],
  ['hunter', 'R5 บอสตีตัวที่เลือดน้อยสุดก่อน', 0, 0, 0, ''],
  ['backStrike', 'R6 บอสตีแถวหลังก่อน', 0, 0, 0, ''],
  ['execute', 'R7 ตีจนเลือดเหลือต่ำกว่านี้ = down ทันที', 15, 1, 50, '%'],
  ['lifesteal', 'R8 บอสดูดเลือดจากดาเมจที่ทำ (ไม่เกินแถบปัจจุบัน)', 30, 1, 200, '%'],
  ['regen', 'R9 บอสฟื้นเลือดทุกวิ (% ของ 1 แถบ · ไม่เกินแถบปัจจุบัน)', 3, 1, 50, '%'],
  ['armorGrow', 'R10 บอสได้เกราะเพิ่มทุก 10 วิ', 20, 1, 10000, 'เกราะ'],
  ['burnAura', 'R11 ทุก 5 วิ ผู้เล่นทุกตัวติดไฟ', 4, 1, 100, 'ไฟ'],
  ['shockAura', 'R12 ทุก 5 วิ สุ่มผู้เล่น 1 ตัวติดช็อต', 2, 1, 100, 'ช็อต'],
  ['desperate', 'R13 คลั่ง: บอสตีแรง ×2 แต่โดนดาเมจเพิ่ม', 50, 0, 300, '%'],
  ['feedOnDown', 'R14 ผู้เล่น down 1 ตัว บอสฟื้นเลือด (% ของ 1 แถบ · ไม่เกินแถบปัจจุบัน)', 50, 1, 100, '%'],
  // ผู้เล่นอ่อนลง
  ['randomSilence', 'R15 ทุก X วิ สุ่มผู้เล่น 1 ตัวใช้สกิลไม่ได้', 8, 1, 60, 'วิ', ['ใช้ไม่ได้นาน', 4, 1, 60, 'วิ']],
  ['freezeRow', 'R16 ทุก X วิ แช่แข็งผู้เล่น 1 แถว', 10, 1, 60, 'วิ', ['คูลดาวน์เพิ่ม', 2, 1, 20, 'วิ']],
  ['noArmor', 'R17 ผู้เล่นได้เกราะเพิ่มไม่ได้', 0, 0, 0, ''],
  ['frontBreak', 'R18 แถวหน้าผู้เล่นโดนดาเมจเพิ่ม', 30, 1, 300, '%'],
  ['rowSwap', 'R19 สลับแถวหน้ากับแถวหลังของผู้เล่น (ตอนเริ่มเฟส)', 0, 0, 0, ''],
  ['noRevive', 'R20 ชุบชีวิตไม่ได้ (รูน/สกิล)', 0, 0, 0, ''],
  ['earlyStorm', 'R21 พายุทรายเริ่มทันทีเมื่อเข้าเฟสนี้', 0, 0, 0, ''],
  // บอสป้องกัน
  ['hitCap', 'R22 ตี 1 ครั้งเข้าได้ไม่เกิน (% ของ 1 แถบ)', 25, 1, 100, '%'],
  ['minHit', 'R23 ฮิตที่ดาเมจต่ำกว่านี้ไม่เข้า', 3, 1, 1000, 'ดาเมจ'],
  ['statusImmune', 'R24 บอสไม่ติดไฟ/ช็อต', 0, 0, 0, ''],
  ['tribeWeak', 'R25 บอสโดนเผ่าที่เลือกตีแรงขึ้น', 50, 1, 300, '%', 'tribe'],
  ['tribeResist', 'R25 บอสโดนเผ่าที่เลือกตีเบาลง', 50, 1, 100, '%', 'tribe'],
  ['frontOnly', 'R26 ตีบอสได้เฉพาะแถวหน้าของผู้เล่น', 0, 0, 0, ''],
  ['backOnly', 'R26 ตีบอสได้เฉพาะแถวหลังของผู้เล่น', 0, 0, 0, ''],
  ['vanish', 'R27 ทุก X วิ บอสหายตัว (ตีไม่โดน)', 12, 2, 60, 'วิ', ['หายนาน', 2, 1, 10, 'วิ']],
  // ไขปริศนา
  ['dpsCheck', 'R28 ตีแถบไม่หมดในเวลานี้ แถบนั้นเต็มกลับ', 20, 3, 120, 'วิ'],
  ['curse', 'R29 ทุก X วิ สาปผู้เล่น 1 ตัว: down ใน 5 วิ ถ้าทีมตีบอสไม่ถึงเป้า', 15, 3, 60, 'วิ', ['เป้า (% ของ 1 แถบ)', 50, 1, 100, '%']],
  ['weakSpot', 'R30 หลังย้ายที่ บอสโดนดาเมจเพิ่ม 3 วิ (ใช้กับแบบย้ายที่)', 50, 1, 300, '%'],
];
// Phase-change effects (set 64, Q5): [id, label, default, min, max, unit] · a phase may also switch the boss spot (X5 = phase.spot)
export const BOSS_PHASE_FX = [
  ['armorBar', 'X1 บอสได้เกราะ (% ของ 1 แถบ)', 50, 1, 300, '%'],
  ['cleanse', 'X2 บอสล้างไฟ/ช็อตที่ติดตัว', 0, 0, 0, ''],
  ['untargetable', 'X3 บอสตีไม่โดนชั่วคราว', 2, 1, 10, 'วิ'],
  ['stunAll', 'X4 ผู้เล่นทุกตัวมึนงง', 2, 1, 10, 'วิ'],
];
// Phases (set 64, user 31 Oct: Q1 A by bars lost · Q2 A max 3 · Q3 A new rules replace old · Q4 B max 2 rules per phase)
// phase = { at: bars lost when it starts (phase 1 = 0), rules: [{ id, v, v2?, tribe? }] ≤ 2, fx: [{ id, v }], spot: '' (keep) or a BOSS_SPOTS id }
export const BOSS_MAX_PHASES = 3, BOSS_MAX_RULES = 2;
export const bossRule = (id, v) => { const r = BOSS_RULES.find(q => q[0] === id); const o = { id, v: r && r[4] ? (v ?? r[2]) : 0 }; if (r && Array.isArray(r[6])) o.v2 = r[6][1]; if (r && r[6] === 'tribe') o.tribe = TRIBES[0]; return o; };
export const bossPhase = (at, rules = []) => ({ at, rules, fx: [], spot: '' });
// Warnings for risky combos (review Q-warnings): returns Thai strings, empty = fine
export function bossPhaseWarn(b, p) {
  const has = id => p.rules.some(r => r.id === id), w = [];
  if (has('execute') && has('aoe')) w.push('R7 + R4 เฟสเดียวกัน อาจล้างทีมผู้เล่นในทีเดียว');
  if (has('hitCap') && has('minHit')) w.push('R22 + R23 พร้อมกัน แทบทุกทีมเสียเปรียบ');
  const spot = p.spot || b.spot;
  if ((has('frontOnly') || has('backOnly')) && spot !== 'all') w.push('R26 ใช้กับบอสที่ยืนทุกช่องเท่านั้น ไม่งั้นบางทีมตีไม่โดนเลย');
  if (has('weakSpot') && spot !== 'move') w.push('R30 ได้ผลเฉพาะบอสแบบย้ายที่');
  return w;
}
// Where the boss stands (user 29 Oct, set 52: per boss) · board side = 3 rows × 2 lanes. 'move' = 1 slot, jumps to a random slot every moveSec.
export const BOSS_SPOTS = [
  ['all', 'ทุกช่อง (6 ช่อง)'], ['four', 'แถวหน้า + แถวกลาง (4 ช่อง)'], ['front', 'แถวหน้า (2 ช่อง)'], ['one', '1 ช่อง (แถวหน้า เลนบน)'], ['move', '1 ช่อง ย้ายที่เรื่อยๆ'],
];
// Boss stats = at its first appearance (stage 5) · stage 10 = × mult10 · after stage 10 each boss + endlessPct%
// bars = HP colour bars (user 29 Oct): each emptied bar counts as "enemy down" for skills · bar size = HP ÷ bars (keeps the count when the boss scales).
export const BOSS_STATS = [['bars', 'จำนวนแถบสีเลือด', 1, 20], ['moveSec', 'ย้ายที่ทุก (วิ) (เฉพาะแบบย้ายที่)', 1, 60], ['hp', 'HP', 1, 1e6], ['atk', 'พลังโจมตี', 0, 1e5], ['cdMs', 'คูลดาวน์ (มิลลิวินาที)', 300, 60000], ['multi', 'มัลติฮิต', 1, 10], ['armor', 'เกราะเริ่ม', 0, 1e6], ['burn', 'ไฟ/ฮิต', 0, 1e4], ['shock', 'ช็อต/ฮิต', 0, 1e4]];
const stageBoss = (id, name, tribe, hp, atk, cdMs, rule, ruleV, spot = 'all') => ({ id, name, tribe, hp, atk, cdMs, multi: 1, bars: 5, spot, moveSec: 8, armor: 0, burn: 0, shock: 0, phases: [bossPhase(0, rule === 'none' ? [] : [bossRule(rule, ruleV)])], mult10: 2, endlessPct: 15, on: true });
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

// Code-built starting point (before the user's saved values) — tests/tools only.
export function stageBase() {
  return {
    copiesRule: 'rarity', // set 61 marker: saves without it predate "copies follow rarity" (see cleanRunes)
    runes: Object.fromEntries(STAGE_RUNES.map(r => [r.id, runeDefault(r)])),
    custom: [],
    bosses: STAGE_BOSSES.map(b => JSON.parse(JSON.stringify(b))),
    settings: Object.fromEntries(STAGE_SETTINGS.map(([k, , v]) => [k, v])),
  };
}

// External data (database / pasted code) → only known keys, numbers in range, names cleaned. Unknown/bad parts fall back to defaults.
// Defaults = code base + the user's confirmed config (stage-user.js, set 62 · 31 Oct 2026).
export function stageDefaults() { return cleanStageOn(STAGE_USER, stageBase()); }
export function cleanStage(o) { return cleanStageOn(o, stageDefaults()); }
function cleanStageOn(o, out) {
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
      b.phases = cleanPhases(x, b, num, isObj);
      if (num(x.mult10, 0.1, 20)) b.mult10 = x.mult10;
      if (num(x.endlessPct, 0, 500)) b.endlessPct = x.endlessPct;
      if (typeof x.on === 'boolean') b.on = x.on;
      list.push(b);
    }
    if (list.length) out.bosses = list;
  }
  return out;
}

// Phases from external data · old saves (rule/ruleV, before set 64) become phase 1 · bad rules/phases dropped, phase 1 always kept
function cleanPhases(x, b, num, isObj) {
  const rule1 = (r, def) => {
    const q = BOSS_RULES.find(z => z[0] === r.id); if (!q || q[0] === 'none') return null;
    const o = bossRule(q[0]); if (q[4]) o.v = num(r.v, q[3], q[4]) ? r.v : (def && def.id === q[0] ? def.v : q[2]);
    if (Array.isArray(q[6])) o.v2 = num(r.v2, q[6][2], q[6][3]) ? r.v2 : q[6][1];
    if (q[6] === 'tribe') o.tribe = TRIBES.includes(r.tribe) ? r.tribe : TRIBES[0];
    return o;
  };
  const rules = (list, defs = []) => { const out = []; if (Array.isArray(list)) for (const r of list) { if (!isObj(r) || out.length >= BOSS_MAX_RULES || out.some(o => o.id === r.id)) continue; const o = rule1(r, defs.find(d => d.id === r.id)); if (o) out.push(o); } return out; };
  if (!Array.isArray(x.phases)) {
    if (!BOSS_RULES.some(q => q[0] === x.rule)) return b.phases.map(p => ({ ...p, rules: p.rules.map(r => ({ ...r })), fx: p.fx.map(f => ({ ...f })) }));
    return [bossPhase(0, rules([{ id: x.rule, v: x.ruleV }], b.phases[0].rules))];
  }
  const out = [];
  for (const p of x.phases.slice(0, 12)) {
    if (!isObj(p) || out.length >= BOSS_MAX_PHASES) continue;
    const at = out.length ? p.at : 0;
    if (out.length && !(Number.isInteger(at) && at > out[out.length - 1].at && at < b.bars)) continue;
    const ph = bossPhase(at, rules(p.rules, (b.phases[out.length] || b.phases[0]).rules));
    if (out.length) {
      if (Array.isArray(p.fx)) for (const f of p.fx) { const q = isObj(f) && BOSS_PHASE_FX.find(z => z[0] === f.id); if (q && !ph.fx.some(o => o.id === q[0])) ph.fx.push({ id: q[0], v: q[4] ? (num(f.v, q[3], q[4]) ? f.v : q[2]) : 0 }); }
      if (BOSS_SPOTS.some(q => q[0] === p.spot)) ph.spot = p.spot;
    }
    out.push(ph);
  }
  return out.length ? out : [bossPhase(0)];
}

// Boss stats at a stage (k = 1 first boss, 2 second, 3+ endless) — for display now, battle later.
export function bossAt(b, k) {
  const m = k <= 1 ? 1 : b.mult10 * (1 + b.endlessPct / 100) ** Math.max(0, k - 2);
  return { hp: Math.round(b.hp * m), barHp: Math.round(b.hp * m / b.bars), atk: Math.round(b.atk * m), armor: Math.round(b.armor * m), dps: b.atk * m * b.multi / (b.cdMs / 1000) };
}
