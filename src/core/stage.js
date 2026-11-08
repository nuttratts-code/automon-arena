// Stage mode (demo) data — phase 1 (29 Oct 2026; set 52 added rune name/max, boss spot/bars/moveSec, endless settings; set 53 runes v2): runes, bosses, stage settings that the Balance Room edits.
// The battle engine does NOT use these yet (phase 2). Every number = proposal (ค่าเสนอ) until the user confirms.
// Design notes: claude/backlog.md "Stage mode" · claude/review-2026-10-28-runes.md · claude/review-2026-10-29-stage-baseline.md
import { TRIBES, DO_INFO, BATTLE_WHEN, skillTargets, RULES } from './rules.js';
const BT = k => +(RULES.bossTimers[k] / 1000).toFixed(1); // set 76: boss rule timers live in RULES.bossTimers (กฎเกม tab)
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
  spec('gold', 'gold', 'team', 'ได้เงินทุกด่าน', 'หลังแต่ละแมตช์ → ได้เงิน +{gold}', [['gold', 'เงิน/ด่าน', 2, 0, 20, '']]),
  spec('interest', 'gold', 'team', 'ดอกเบี้ย', 'หลังแต่ละแมตช์ → เงินที่เหลือทุก {per} ได้ +{gold} (สูงสุด {cap})', [['per', 'ทุกๆ เงิน', 5, 1, 50, ''], ['gold', 'ได้เพิ่ม', 1, 0, 10, ''], ['cap', 'สูงสุด', 3, 0, 20, '']]),
  spec('shopSlots', 'gold', 'team', 'ร้านเพิ่มช่อง', 'ร้านเพิ่ม {slots} ช่อง', [['slots', 'ช่องเพิ่ม', 1, 0, 3, '']]),
  spec('freeRoll', 'gold', 'team', 'สุ่มร้านฟรี', 'สุ่มร้านฟรี {free} ครั้ง/แมตช์', [['free', 'ครั้งฟรี/รอบ', 1, 0, 5, '']]),
  spec('heartTrade', 'gold', 'team', 'แลกหัวใจเป็นเงิน', 'แลกหัวใจ 1 ดวง → เงิน +{gold} (รูนละครั้ง · แมตช์ละครั้ง · หัวใจต้องมี ≥{minHearts})', [['gold', 'เงินที่ได้', 25, 1, 100, ''], ['minHearts', 'หัวใจขั้นต่ำ', 2, 2, 10, 'ดวง']]),
  spec('lure', 'gold', 'one', 'ตัวนี้ออกในร้านบ่อยขึ้น', 'ตัวที่ใส่ออกในร้านบ่อยขึ้น ×{mult}', [['mult', 'โอกาส ×', 3, 1, 10, '']]),
  spec('fastMerge', 'gold', 'one', 'รวมร่างเร็ว', 'ตัวที่ใส่ใช้ {need} ตัวรวมร่าง', [['need', 'ใช้กี่ตัว', 2, 2, 3, 'ตัว']]),
  spec('shadow', 'gold', 'one', 'ขายแล้วได้คืน', 'เมื่อขายตัวที่ใส่ → ได้ตัวเดิม Lv1 คืนที่ม้านั่ง ({times} ครั้ง/เกม)', [['times', 'ครั้ง/run', 1, 0, 3, '']]),
  // เผ่า (Q4 B: นับเป็นเผ่าจริง ทั้งโบนัสเผ่าและสกิลที่เล็งเผ่า · ไม่ติดกฎเผ่าเพิ่มได้ 1)
  spec('addTribe', 'tribe', 'one', 'ได้เผ่าเพิ่ม', '{who}: ได้เผ่า{gain}เพิ่ม', [['gain', 'เผ่าที่ได้', '', 0, 0, 'tribe']]),
  spec('flag', 'tribe', 'team', 'ธงเผ่า (นับเผ่าเพิ่ม)', 'เผ่าที่เลือกนับเพิ่ม +{count} ตัว{tierCap}', [['count', 'นับเพิ่ม', 1, 0, 4, 'ตัว'], ['maxTier', 'ขั้นสูงสุด', 4, 2, 6, '']]),
  // ดาเมจ
  spec('allyDownDmg', 'dmg', 'team', 'ดาเมจ + หลังเพื่อนล้ม', 'เมื่อเพื่อนล้ม → {who} ดาเมจตีที่ทำ +{pct}%', [['pct', 'เพิ่ม', 20, 0, 300, '%']]),
  spec('bossDmg', 'dmg', 'team', 'ดาเมจใส่บอส +', '{who}: ดาเมจใส่บอส +{dmgPct}%', [['dmgPct', 'ดาเมจใส่บอส', 40, 0, 300, '%']]),
  spec('lastStand', 'dmg', 'team', 'เหลือตัวเดียวแรงขึ้น', 'เมื่อเหลือรอดตัวเดียว → {who} ดาเมจตีที่ทำ +{dmgPct}% คูลดาวน์ −{cdPct}%', [['dmgPct', 'ดาเมจ', 50, 0, 300, '%'], ['cdPct', 'คูลดาวน์ลด', 30, 0, 80, '%']]),
  spec('growth', 'dmg', 'team', 'ชนะติดกันแรงขึ้น', 'ชนะติดกัน → {who} ดาเมจตีที่ทำ +{stepPct}% ต่อแมตช์ (สูงสุด {maxPct}%)', [['stepPct', 'ต่อด่าน', 3, 0, 50, '%'], ['maxPct', 'สูงสุด', 30, 0, 300, '%']]),
  spec('glass', 'dmg', 'team', 'ดาเมจ + แลก HP −', '{who}: ดาเมจตีที่ทำ +{dmgPct}% · HP สูงสุด −{hpPct}%', [['dmgPct', 'ดาเมจ', 35, 0, 300, '%'], ['hpPct', 'HP ลด', 20, 0, 90, '%']]),
  spec('buddy', 'dmg', 'one', 'คู่หูตีตาม', 'เมื่อตีโดน → คู่ที่เลือกตีเป้าเดียวกันอีก 1 ฮิต แรง {pct}%', [['pct', 'แรงตีตาม', 100, 1, 300, '%']]),
  // ป้องกัน/รอด
  spec('fortress', 'heal', 'team', 'HP + แลกพลังโจมตี −', '{who}: HP สูงสุด +{hpPct}% · พลังโจมตี −{atkPct}%', [['hpPct', 'HP เพิ่ม', 30, 0, 300, '%'], ['atkPct', 'พลังโจมตีลด', 20, 0, 90, '%']]),
  spec('taunt', 'armor', 'one', 'โล่ + ล่อเป้า', 'ได้เกราะ {armorPct}% ของ HP สูงสุด · ศัตรูต้องตีตัวนี้ก่อน', [['armorPct', 'เกราะ', 30, 0, 300, '%']]),
  spec('revive', 'survive', 'one', 'ฟื้นหลังล้ม', 'เมื่อล้ม → ลุกกลับมา HP {hpPct}% ({times} ครั้ง/แมตช์)', [['times', 'ครั้ง/แมตช์', 1, 0, 3, ''], ['hpPct', 'HP ตอนฟื้น', 50, 1, 100, '%']]),
  spec('avoidDeath', 'survive', 'one', 'เลี่ยงจุดตาย', 'ฮิตที่จะทำให้ล้ม → ยกเลิกทั้งฮิต ({times} ครั้ง/แมตช์)', [['times', 'ครั้ง/แมตช์', 1, 1, 3, '']]),
  // User rune ideas 31 Oct (claude/review-2026-10-31-rune-ideas.md) · numbers = ค่าเสนอ, user tunes
  spec('freeze', 'debuff', 'enemy', 'ศัตรูหยุดตอนเริ่มสู้', 'เมื่อเริ่มแมตช์ → ศัตรูทุกตัว มึนงง {sec} วิ (บอส {bossPct}%)', [['sec', 'หยุดกี่วินาที', 3, 0, 10, 'วิ'], ['bossPct', 'บอสหยุด', 50, 0, 100, '%']]),
  spec('regenLow', 'heal', 'team', 'ฮีลเพื่อนเลือดน้อยสุด ทุก x วิ', 'ทุก {sec} วิ → เพื่อน HP น้อยสุด ฟื้น HP {pct}% ของ HP สูงสุด', [['sec', 'ทุกกี่วินาที', 5, 1, 60, 'วิ'], ['pct', 'ฟื้น', 10, 0, 100, '%']]),
  spec('regen', 'heal', 'team', 'ฮีลตัวในขอบเขต ทุก x วิ', 'ทุก {sec} วิ → {who} ฟื้น HP {pct}% ของ HP สูงสุด', [['sec', 'ทุกกี่วินาที', 5, 1, 60, 'วิ'], ['pct', 'ฟื้น', 5, 0, 100, '%']]),
  spec('armorShare', 'armor', 'one', 'ได้เกราะ → แบ่งให้เพื่อนเผ่า', 'เมื่อได้เกราะ → เพื่อนเผ่าเดียวกันสุ่ม {count} ตัว ได้เกราะ {pct}% ของที่ได้', [['pct', 'แบ่งให้', 50, 0, 300, '%'], ['count', 'กี่ตัว', 1, 1, 5, 'ตัว']]),
  spec('hpToArmorHit', 'armor', 'one', 'แลก HP เป็นเกราะ/ฮิต', 'HP สูงสุด −{hpPct}% → เกราะ/ฮิต +{rate}% ของ HP ที่ลด', [['hpPct', 'HP ลด', 50, 0, 90, '%'], ['rate', 'ได้เกราะ/ฮิต', 2, 0, 100, '% ของ HP ที่ลด']]),
  spec('link', 'survive', 'one', 'คู่รับดาเมจแทน', 'เมื่อโดนดาเมจ → คู่ที่เลือกรับแทน {pct}%', [['pct', 'รับแทน', 50, 1, 100, '%']]),
  // อื่นๆ
  spec('permUp', 'other', 'one', 'ค่าถาวร +', 'ค่าถาวรที่ตัวที่ใส่ได้ +{permPct}%', [['permPct', 'ค่าถาวร', 50, 0, 300, '%']]),
  spec('scout', 'other', 'team', 'ส่องทีมศัตรู', 'ก่อนสู้ แตะรูนนี้ → ดูทีมศัตรู (ตำแหน่ง เลเวล รูน)'),
];
// Set 143 (user 8 Nov): extra explanation shown only in the Balance Room (RUNE_TEXT.full), like skill text notes
const RUNE_NOTE = { interest: 'นับเงินที่เหลือก่อนรับรายได้ · ได้ตอนร้านเปิด', shopSlots: 'รวมทุกรูนไม่เกิน 3', heartTrade: 'รูนยังอยู่หลังใช้', lure: 'เทียบกับตัวระดับเดียวกัน · ใส่บนม้านั่งก็ได้', fastMerge: 'ปกติ 3 · ใส่บนม้านั่งก็ได้', shadow: 'ม้านั่งเต็ม = ไม่ได้', addTribe: 'นับเป็นเผ่าจริง ทั้งโบนัสเผ่าและสกิลที่เล็งเผ่า', flag: 'เลือกเผ่าจากตัวบนบอร์ดตอนได้รูน แต่ละอันเลือกเอง', allyDownDmg: 'ตั้งแต่เพื่อนตัวแรกล้มจนจบแมตช์ · ไม่ซ้อนตามจำนวนที่ล้ม', bossDmg: 'รวมช็อต ไม่นับไฟ', growth: 'แพ้แล้วนับใหม่ · หลายอัน = คูณทั้งค่าต่อแมตช์และเพดาน', buddy: 'ทุกฮิต · % ของพลังโจมตีคู่ · ฮิตที่พาไปไม่พาต่อ', taunt: 'บอสก็ถูกดึง · หลายตัวมีรูนนี้ = ตัวหน้าสุดก่อน', avoidDeath: 'ยกเลิกดาเมจ ไฟ ช็อตของฮิตนั้น · ไม่กันไฟที่ติดอยู่แล้ว', freeze: 'มึนงง = หยุดนับคูลดาวน์', regenLow: 'ทั้งทีมใช้ร่วมกัน 1 อัน', armorShare: 'เกราะที่แบ่งไปไม่ทำให้รูนทำงานซ้ำ', hpToArmorHit: 'ปัดลง', link: 'รวมไฟ/ช็อต · รับแทนต่อไม่ได้', scout: 'ไม่มีรูนนี้ = ไม่เห็นทีมศัตรู' };
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
// Set 143 (user 8 Nov): same method as skill text — `<who>: <effect>` or `<when> → <who> <effect>`, the words skillLine uses,
// game short · Balance Room sets RUNE_TEXT.full = true → explanation in (...). Text must match the engine (runes.js / battle.js / shop.js).
export const RUNE_TEXT = { full: false };
const RUNE_WHO = { one: 'ตัวที่ใส่', team: 'ทั้งทีม', enemy: 'ศัตรูทุกตัว' };
export const runeWho = x => RUNE_WHO[x.scope] || runeScopeLabel(x);
const RUNE_STAT_TH = { atk: 'พลังโจมตี +', hp: 'HP สูงสุด +', armor: 'ได้เกราะ', armorHit: 'เกราะ/ฮิต +', cd: 'คูลดาวน์ −', burn: 'ไฟต่อฮิต +', shock: 'ช็อตต่อฮิต +',
  multi: 'มัลติฮิต +', healHit: 'ฟื้น/ฮิต +', hitDmg: 'ดาเมจตีที่ทำ +', burnAmp: 'ไฟที่ทำให้ติด +', shockAmp: 'ดาเมจช็อตที่ทำ +', armorAmp: 'เกราะที่ได้รับ +',
  healAmp: 'ฟื้น HP ที่ได้รับ +', eCd: 'คูลดาวน์ช้าลง +', eMaxHp: 'HP สูงสุด −', eBurn: 'ติดไฟ', eShock: 'ติดช็อต', eDmgTaken: 'ดาเมจตีที่โดน +',
  eHealCut: 'ฟื้น HP ที่ได้รับ −', eArmorCut: 'เกราะที่ได้รับ −' };
export function runeText(x, full = RUNE_TEXT.full) {
  const k = runeKind(x.eff), who = runeWho(x), note = n => (full && n ? ` (${n})` : '');
  if (k === 'special') {
    const s = RUNE_SPEC[x.eff];
    const tierCap = x.eff === 'flag' && x.maxTier < RULES.tribeSteps.length ? ` (ไม่เกินขั้น ${x.maxTier})` : ''; // tribes have tribeSteps.length tiers → a higher cap does nothing
    const t = s.text.replace(/\{(\w+)\}/g, (_, q) => q === 'who' ? who : q === 'tierCap' ? tierCap : String(x[q]));
    return (x.scope !== s.scope && !s.text.includes('{who}') ? `${who}: ${t}` : t) + note(RUNE_NOTE[x.eff]);
  }
  if (k !== 'stat') return '';
  const nm = RUNE_STAT_TH[x.eff] || RUNE_EFF[x.eff][1];
  let v = x.mode === 'flat' && x.eff === 'cd' ? `${x.v / 1000} วิ` : `${x.v}${x.mode === 'pct' ? '%' : ''}`;
  if (x.eff === 'armor' && x.mode === 'pct') v += ' ของ HP สูงสุด';
  if (x.eff === 'lifesteal') return `เมื่อตีโดน → ${who} ดูดเลือด ${v} ของดาเมจฮิตนั้น (รวมช็อตที่แตก)${note('ไม่นับไฟ')}`; // dealt = hit + popped shock (battle.js strike)
  return `${who}: ${nm}${/[+−]$/.test(nm) ? '' : ' '}${v}`;
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

// Boss special rules: [id, label, default value, min, max, unit, extra] (max 0 = no value) · extra = second value [label, default, min, max, unit] or 'tribe' (rule needs a tribe)
// Set 64 (user 31 Oct, claude/review-2026-10-31-boss-phases.md): pool grown from 8 to 38 (R1–R30) · all numbers ค่าเสนอ · battle effect waits for the boss battle engine (phase 2a).
// Heal rules (lifesteal/regen/feedOnDown/dpsCheck) never refill an emptied bar and never re-trigger "enemy down" (loophole guard).
export const BOSS_RULES = [
  ['none', 'ไม่มีกฎพิเศษ', 0, 0, 0, ''],
  ['backSilence', 'แถวหลังของผู้เล่นใช้สกิลไม่ได้ ช่วงแรก (วิ)', 10, 1, 180, 'วิ'],
  ['healCut', 'ผู้เล่นฟื้นเลือดได้น้อยลง', 50, 1, 100, '%'],
  ['armorCut', 'เกราะผู้เล่นลดลง', 50, 1, 100, '%'],
  ['tribeOff', 'ปิดโบนัสเผ่าของผู้เล่น', 0, 0, 0, ''],
  ['enrage', `บอสตีแรงขึ้นทุก ${BT('enrageMs')} วิ`, 20, 1, 200, '%'],
  ['reflect', 'สะท้อนดาเมจกลับ', 10, 1, 100, '%'],
  ['cdSlow', 'คูลดาวน์ผู้เล่นช้าลง', 20, 1, 200, '%'],
  // บอสแรงขึ้น
  ['atkUp', 'R1 บอสตีแรงขึ้น', 30, 1, 500, '%'],
  ['fastAtk', 'R2 คูลดาวน์บอสเร็วขึ้น', 20, 1, 90, '%'],
  ['multiUp', 'R3 บอสมัลติฮิตเพิ่ม', 1, 1, 5, 'ครั้ง'],
  ['aoe', 'R4 บอสตีโดนทุกตัว (ดาเมจต่อตัว)', 40, 1, 100, '%'],
  ['hunter', 'R5 บอสตีตัวที่เลือดน้อยสุดก่อน', 0, 0, 0, ''],
  ['backStrike', 'R6 บอสตีแถวหลังก่อน', 0, 0, 0, ''],
  ['execute', 'R7 ตีจนเลือดเหลือต่ำกว่านี้ = ล้มทันที', 15, 1, 50, '%'],
  ['lifesteal', 'R8 บอสดูดเลือดจากดาเมจที่ทำ (ไม่เกินแถบปัจจุบัน)', 30, 1, 200, '%'],
  ['regen', 'R9 บอสฟื้นเลือดทุกวิ (% ของ 1 แถบ · ไม่เกินแถบปัจจุบัน)', 3, 1, 50, '%'],
  ['armorGrow', `R10 บอสได้เกราะเพิ่มทุก ${BT('armorGrowMs')} วิ`, 20, 1, 10000, 'เกราะ'],
  ['burnAura', `R11 ทุก ${BT('burnAuraMs')} วิ ผู้เล่นทุกตัวติดไฟ`, 4, 1, 100, 'ไฟ'],
  ['shockAura', `R12 ทุก ${BT('shockAuraMs')} วิ สุ่มผู้เล่น 1 ตัวติดช็อต`, 2, 1, 100, 'ช็อต'],
  ['desperate', 'R13 คลั่ง: บอสตีแรง ×2 แต่โดนดาเมจเพิ่ม', 50, 0, 300, '%'],
  ['feedOnDown', 'R14 ผู้เล่นเลือดหมด 1 ครั้ง บอสฟื้นเลือด (% ของ 1 แถบ · ไม่เกินแถบปัจจุบัน · นับแม้ถูกชุบทันที)', 50, 1, 100, '%'],
  // ผู้เล่นอ่อนลง
  ['randomSilence', 'R15 ทุก X วิ สุ่มผู้เล่น 1 ตัวใช้สกิลไม่ได้', 8, 1, 60, 'วิ', ['ใช้ไม่ได้นาน', 4, 1, 60, 'วิ']],
  ['freezeRow', 'R16 ทุก X วิ แช่แข็งผู้เล่น 1 แถว', 10, 1, 60, 'วิ', ['คูลดาวน์เพิ่ม', 2, 1, 20, 'วิ']],
  ['noArmor', 'R17 ผู้เล่นได้เกราะเพิ่มไม่ได้', 0, 0, 0, ''],
  ['frontBreak', 'R18 แถวหน้าผู้เล่นโดนดาเมจเพิ่ม', 30, 1, 300, '%'],
  ['rowSwap', 'R19 สลับแถวหน้ากับแถวหลังของผู้เล่น (ตอนเริ่มเฟส)', 0, 0, 0, ''],
  ['noRevive', 'R20 ชุบชีวิตไม่ได้ (รูน/สกิล)', 0, 0, 0, ''],
  ['earlyStorm', 'R21 ช่วงต่อเวลาเริ่มทันทีเมื่อเข้าเฟสนี้', 0, 0, 0, ''],
  // บอสป้องกัน
  ['hitCap', 'R22 ตี 1 ครั้งเข้าได้ไม่เกิน (% ของ 1 แถบ)', 25, 1, 100, '%'],
  ['minHit', 'R23 ฮิตที่ดาเมจต่ำกว่านี้ไม่เข้า', 3, 1, 1000, 'ดาเมจ'],
  ['burnImmune', 'R24 บอสไม่ติดไฟ (% ที่กันได้ · 100 = ไม่ติดเลย)', 100, 1, 100, '%'],
  ['shockImmune', 'R24 บอสไม่ติดช็อต (% ที่กันได้ · 100 = ไม่ติดเลย)', 100, 1, 100, '%'],
  ['tribeWeak', 'R25 บอสโดนเผ่าที่เลือกตีแรงขึ้น', 50, 1, 300, '%', 'tribe'],
  ['tribeResist', 'R25 บอสโดนเผ่าที่เลือกตีเบาลง', 50, 1, 100, '%', 'tribe'],
  ['frontOnly', 'R26 ตีบอสได้เฉพาะแถวหน้าของผู้เล่น', 0, 0, 0, ''],
  ['backOnly', 'R26 ตีบอสได้เฉพาะแถวหลังของผู้เล่น', 0, 0, 0, ''],
  ['vanish', 'R27 ทุก X วิ บอสหายตัว (ตีไม่โดน)', 12, 2, 60, 'วิ', ['หายนาน', 2, 1, 10, 'วิ']],
  // ไขปริศนา
  ['dpsCheck', 'R28 ตีแถบไม่หมดในเวลานี้ แถบนั้นเต็มกลับ', 20, 3, 120, 'วิ'],
  ['curse', `R29 ทุก X วิ สาปผู้เล่น 1 ตัว: ล้มใน ${BT('curseWindowMs')} วิ ถ้าทีมตีบอสไม่ถึงเป้า`, 15, 3, 60, 'วิ', ['เป้า (% ของ 1 แถบ)', 50, 1, 100, '%']],
  ['weakSpot', `R30 หลังย้ายที่ บอสโดนดาเมจเพิ่ม ${BT('weakSpotMs')} วิ (ใช้กับแบบย้ายที่)`, 50, 1, 300, '%'],
  // Set 71 (user 1 Nov "เพิ่มสิ่งที่บอสควรทำได้"): R31–R38 · all numbers ค่าเสนอ
  ['pierce', 'R31 บอสตีทะลุเกราะ (ฮิตปกติไม่โดนเกราะกัน)', 0, 0, 0, ''],
  ['thorns', 'R32 หนาม: ผู้เล่นตีบอส (ฮิตปกติ) โดนดาเมจกลับทุกฮิต', 3, 1, 1000, 'ดาเมจ'],
  ['stunPulse', 'R33 ทุก X วิ สุ่มผู้เล่น 1 ตัวมึนงง', 10, 2, 60, 'วิ', ['มึนงงนาน', 2, 1, 10, 'วิ']],
  ['atkDrain', 'R34 ทุก X วิ ผู้เล่นทุกตัวตีเบาลง (สะสม)', 10, 2, 60, 'วิ', ['เบาลงครั้งละ', 10, 1, 50, '%']],
  ['cdPulse', 'R35 ทุก X วิ คูลดาวน์ผู้เล่นทุกตัวเพิ่ม', 12, 2, 60, 'วิ', ['เพิ่ม', 1, 1, 20, 'วิ']],
  ['shieldPulse', 'R36 ทุก X วิ บอสได้เกราะ (% ของ 1 แถบ)', 15, 2, 60, 'วิ', ['เกราะ', 10, 1, 300, '%']],
  ['cleansePulse', 'R37 ทุก X วิ บอสล้างไฟ/ช็อตที่ติดตัว', 8, 2, 60, 'วิ'],
  ['barBlast', 'R38 แถบหาย 1 แถบ บอสระเบิดใส่ผู้เล่นทุกตัว', 20, 1, 10000, 'ดาเมจ'],
  // Set 77 (user 4 Nov): number ค่าเสนอ
  ['downAtk', 'R39 ผู้เล่นเลือดหมด 1 ครั้ง บอสตีแรงขึ้นจนจบแมตช์ (% ของพลังโจมตีบอส · นับแม้ถูกชุบทันที)', 10, 1, 500, '%'],
  // Set 142 (user Q1 A1 B1 C1 D1): counterplay so the tribe a boss resists keeps a way to win · main value ค่าเสนอ (bossrun searches it per boss)
  ['burnOverload', 'R40 โอเวอร์โหลดไฟ: ไฟที่บอสกันได้ (R24) สะสมครบเท่านี้ → ติดบอสทั้งหมดทะลุการกัน แล้วเริ่มนับใหม่', 30, 1, 100000, 'ไฟ'],
  ['shockOverload', 'R40 โอเวอร์โหลดช็อต: ช็อตที่บอสกันได้ (R24) สะสมครบเท่านี้ → ติดบอสทั้งหมดทะลุการกัน แล้วเริ่มนับใหม่', 30, 1, 100000, 'ช็อต'],
  ['resistWear', 'R41 ต้านเผ่าค่อยๆ หมด: ฮิตปกติของเผ่าที่บอสต้าน (R25) ลดค่าต้านลงฮิตละ (ไม่ต่ำกว่า 0 · ไม่ฟื้นข้ามเฟส)', 1, 0.01, 100, '%'],
  ['shellBreak', 'R42 เปลือกแตก: ผู้เล่นตีปกติโดนบอสครบ X ฮิต → ปิดลดเกราะ / ห้ามได้เกราะ / สะท้อน ชั่วคราว', 10, 1, 1000, 'ฮิต', ['แตกนาน', 3, 1, 60, 'วิ']],
];
// Phase-change effects (set 64, Q5): [id, label, default, min, max, unit] · a phase may also switch the boss spot (X5 = phase.spot)
export const BOSS_PHASE_FX = [
  ['armorBar', 'X1 บอสได้เกราะ (% ของ 1 แถบ)', 50, 1, 300, '%'],
  ['cleanse', 'X2 บอสล้างไฟ/ช็อตที่ติดตัว', 0, 0, 0, ''],
  ['untargetable', 'X3 บอสตีไม่โดนชั่วคราว', 2, 1, 10, 'วิ'],
  ['stunAll', 'X4 ผู้เล่นทุกตัวมึนงง', 2, 1, 10, 'วิ'],
];
// Phases (set 64, user 31 Oct: Q1 A by bars lost · Q2 A max 3 · Q3 A new rules replace old · Q4 B max 2 rules per phase)
// phase = { at: bars lost when it starts (phase 1 = 0), rules: [{ id, v, v2?, tribe? }] (each id once), fx: [{ id, v }], spot: '' (keep) or a spot (see spotInfo) }
// Set 71 (user 1 Nov): rules per phase no longer limited (each rule at most once per phase) · phases up to the bar count (≤ 20)
export const BOSS_MAX_PHASES = 20, BOSS_MAX_RULES = 99;
// Rule groups for the "+ เพิ่มกฎ" picker (same order as BOSS_RULES)
// Picker categories (set 71: by what the rule does · every rule except 'none' sits in exactly one group — test checks)
export const BOSS_RULE_GROUPS = [
  ['⚔️ บอสตีแรงขึ้น', ['atkUp', 'fastAtk', 'multiUp', 'enrage', 'desperate', 'pierce', 'downAtk']],
  ['🎯 เลือกเป้า / ตีหลายตัว', ['aoe', 'hunter', 'backStrike', 'execute']],
  ['⏱️ ทำเป็นจังหวะ ทุก X วิ', ['burnAura', 'shockAura', 'randomSilence', 'freezeRow', 'stunPulse', 'atkDrain', 'cdPulse']],
  ['⬇️ ผู้เล่นอ่อนลงตลอดเฟส', ['backSilence', 'healCut', 'armorCut', 'cdSlow', 'tribeOff', 'noArmor', 'frontBreak', 'noRevive']],
  ['🛡️ บอสป้องกันตัว', ['hitCap', 'minHit', 'burnImmune', 'shockImmune', 'tribeWeak', 'tribeResist', 'frontOnly', 'backOnly', 'vanish', 'armorGrow', 'shieldPulse', 'cleansePulse', 'burnOverload', 'shockOverload', 'resistWear', 'shellBreak']],
  ['❤️ บอสฟื้นเลือด', ['lifesteal', 'regen', 'feedOnDown']],
  ['↩️ ตอบโต้', ['reflect', 'thorns', 'barBlast']],
  ['🌀 เปลี่ยนสนาม', ['rowSwap', 'earlyStorm']],
  ['🧩 ไขปริศนา', ['dpsCheck', 'curse', 'weakSpot']],
];
export const bossRuleGroup = id => (BOSS_RULE_GROUPS.find(g => g[1].includes(id)) || [''])[0];
// Phase-stat picker groups
export const BOSS_STAT_GROUPS = [['⚔️ การโจมตี', ['atk', 'cdMs', 'multi']], ['🔥 ติดสถานะต่อฮิต', ['burn', 'shock']], ['🛡️ เกราะ / ฟื้นต่อฮิต', ['armorHit', 'healHit']]];
export const bossRule = (id, v) => { const r = BOSS_RULES.find(q => q[0] === id); const o = { id, v: r && r[4] ? (v ?? r[2]) : 0 }; if (r && Array.isArray(r[6])) o.v2 = r[6][1]; if (r && r[6] === 'tribe') o.tribe = TRIBES[0]; return o; };
export const bossPhase = (at, rules = []) => ({ at, rules, fx: [], spot: '', stats: {} });
// Set 71 (user 1 Nov): from phase 2 a phase may set new boss stats · [key in the boss record, label, min, max, whole number?]
// value = at the boss's first appearance (atk grows with the stage like the base atk) · a stat a phase does not set = keeps the previous phase's value
export const BOSS_PHASE_STATS = [['atk', 'พลังโจมตี', 0, 1e5, false], ['cdMs', 'คูลดาวน์ (มิลลิวินาที)', 300, 60000, true], ['multi', 'มัลติฮิต', 1, 10, true], ['burn', 'ไฟ/ฮิต', 0, 1e4, false], ['shock', 'ช็อต/ฮิต', 0, 1e4, false], ['armorHit', 'เกราะ/ฮิต', 0, 1e4, false], ['healHit', 'ฟื้น/ฮิต', 0, 1e4, false]];
// Boss stats live in phase i (phase stats carried over from earlier phases)
export function phaseStatsAt(b, i) { const o = {}; for (const [k] of BOSS_PHASE_STATS) o[k] = b[k] || 0; for (let j = 1; j <= i && j < b.phases.length; j++) Object.assign(o, b.phases[j].stats || {}); return o; }
// Warnings for risky combos (review Q-warnings): returns Thai strings, empty = fine
export function bossPhaseWarn(b, p) {
  const has = id => p.rules.some(r => r.id === id), w = [];
  if (has('execute') && has('aoe')) w.push('R7 + R4 เฟสเดียวกัน อาจล้างทีมผู้เล่นในทีเดียว');
  if (has('hitCap') && has('minHit')) w.push('R22 + R23 พร้อมกัน แทบทุกทีมเสียเปรียบ');
  const spot = p.spot || b.spot;
  const si = spotInfo(spot) || { bits: '', move: false };
  if ((has('frontOnly') || has('backOnly')) && (si.bits !== '111111' || si.move)) w.push('R26 ใช้กับบอสที่ยืนทุกช่องเท่านั้น ไม่งั้นบางทีมตีไม่โดนเลย');
  if (has('weakSpot') && !si.move) w.push('R30 ได้ผลเฉพาะบอสแบบย้ายที่');
  return w;
}
// Where the boss stands (user 29 Oct, set 52: per boss · set 65, user 31 Oct: any slots) · board side = 3 rows × 2 lanes.
// Slot index = row × 2 + lane (row 0 front · 1 mid · 2 back; lane 0 top · 1 bottom).
// spot = a preset id below, or a custom code: 'c' + 6 bits (stands on every slot marked 1) or 'm' + 6 bits (1 slot, jumps among the marked slots every moveSec; ≥ 2 slots).
export const BOSS_SPOT_PRESETS = [
  ['all', 'ทุกช่อง', '111111'], ['front', 'แถวหน้า', '110000'], ['mid', 'แถวกลาง', '001100'], ['back', 'แถวหลัง', '000011'],
  ['four', 'หน้า + กลาง', '111100'], ['midBack', 'กลาง + หลัง', '001111'], ['frontBack', 'หน้า + หลัง', '110011'],
  ['laneTop', 'เลนบน', '101010'], ['laneBottom', 'เลนล่าง', '010101'], ['one', 'หน้า เลนบน', '100000'],
];
const SPOT_ROW = ['หน้า', 'กลาง', 'หลัง'], SPOT_LANE = ['บน', 'ล่าง'];
// → { bits: '101010', move: bool } or null if not a valid spot
export function spotInfo(spot) {
  if (spot === 'move') return { bits: '111111', move: true };
  const p = BOSS_SPOT_PRESETS.find(q => q[0] === spot); if (p) return { bits: p[2], move: false };
  if (typeof spot !== 'string' || !/^[cm][01]{6}$/.test(spot)) return null;
  const n = spot.slice(1).split('1').length - 1, move = spot[0] === 'm';
  return n >= (move ? 2 : 1) ? { bits: spot.slice(1), move } : null;
}
export const validSpot = spot => !!spotInfo(spot);
// bits + move → the shortest id (preset id when it matches)
export function spotCode(bits, move) {
  if (move) return bits === '111111' ? 'move' : 'm' + bits;
  const p = BOSS_SPOT_PRESETS.find(q => q[2] === bits); return p ? p[0] : 'c' + bits;
}
export function spotLabel(spot) {
  const s = spotInfo(spot); if (!s) return String(spot);
  const idx = [...s.bits].flatMap((b, i) => (b === '1' ? [i] : [])), p = BOSS_SPOT_PRESETS.find(q => q[2] === s.bits);
  const where = p ? p[1] : idx.map(i => `${SPOT_ROW[i >> 1]}${SPOT_LANE[i & 1]}`).join(' ');
  return s.move ? `ย้ายที่ใน ${where} (ทีละ 1 ช่อง)` : `${where} (${idx.length} ช่อง)`;
}
// short form for the boss header line
export function spotShort(spot) {
  const s = spotInfo(spot); if (!s) return String(spot);
  const p = BOSS_SPOT_PRESETS.find(q => q[2] === s.bits), n = s.bits.split('1').length - 1;
  return (s.move ? 'ย้ายที่ · ' : 'ยืน ') + (p ? p[1] : `เลือกเอง ${n} ช่อง`);
}
// kept for old callers: [id, label] of the presets + 'move'
export const BOSS_SPOTS = [...BOSS_SPOT_PRESETS.map(p => [p[0], spotLabel(p[0])]), ['move', spotLabel('move')]];
// Boss stats = at its first appearance (stage 5) · stage 10 = × mult10 · after stage 10 each boss + endlessPct%
// bars = HP colour bars (user 29 Oct): each emptied bar counts as "enemy down" for skills · bar size = HP ÷ bars (keeps the count when the boss scales).
// Set 71: armorHit / healHit = เกราะ/ฮิต · ฟื้น/ฮิต of the boss's normal hit (same as a unit's; heal never refills past the bar it is in)
export const BOSS_STATS = [['bars', 'จำนวนแถบสีเลือด', 1, 20], ['moveSec', 'ย้ายที่ทุก (วิ) (เฉพาะแบบย้ายที่)', 1, 60], ['hp', 'HP', 1, 1e6], ['atk', 'พลังโจมตี', 0, 1e5], ['cdMs', 'คูลดาวน์ (มิลลิวินาที)', 300, 60000], ['multi', 'มัลติฮิต', 1, 10], ['armor', 'เกราะเริ่ม', 0, 1e6], ['burn', 'ไฟ/ฮิต', 0, 1e4], ['shock', 'ช็อต/ฮิต', 0, 1e4], ['armorHit', 'เกราะ/ฮิต', 0, 1e4], ['healHit', 'ฟื้น/ฮิต', 0, 1e4]];
const stageBoss = (id, name, tribe, hp, atk, cdMs, rule, ruleV, spot = 'all') => ({ id, name, tribe, hp, atk, cdMs, multi: 1, bars: 5, spot, moveSec: 8, armor: 0, burn: 0, shock: 0, armorHit: 0, healHit: 0, phases: [bossPhase(0, rule === 'none' ? [] : [bossRule(rule, ruleV)])], mult10: 2, endlessPct: 15, on: true });
// Sized from the stage baseline (median player at stage 5: ~7 dmg/s, team HP ~756) → boss lasts ~60 s, kills the team in ~60 s.
export const STAGE_BOSSES = [
  stageBoss('B1', 'ผู้เฝ้าประตู', 'เหล็กกล้า', 450, 25, 2000, 'armorCut', 50, 'all'),
  stageBoss('B2', 'เงาหลังม่าน', 'ภูติ', 400, 22, 1800, 'backSilence', 10, 'move'),
  stageBoss('B3', 'อสุรกายคลั่ง', 'อสูร', 420, 20, 2000, 'enrage', 20, 'four'),
  stageBoss('B4', 'กระจกสะท้อน', 'สายฟ้า', 380, 22, 2000, 'reflect', 10, 'front'),
];
export const STAGE_SETTINGS = [
  // set 108 (user 6 Nov): bosses on fixed ROUNDS (win or lose): every bossEvery rounds up to bossLateFrom (5 10 15 20), then every bossEveryLate (30 40 …)
  // · the last round (lastStage) is the training-dummy boss (endless HP, no attack/skills, fight lasts dummySec → damage score)
  ['bossEvery', 'บอสทุกกี่รอบ (ช่วงแรก)', 5, 1, 50, 'รอบ'], ['bossLateFrom', 'ช่วงแรกถึงรอบ', 20, 1, 200, 'รอบ'], ['bossEveryLate', 'หลังจากนั้น บอสทุกกี่รอบ', 10, 1, 50, 'รอบ'],
  ['dummySec', 'บอสรอบสุดท้าย (หุ่นเป้า เลือดไม่หมด): สู้ได้นาน', 60, 10, 170, 'วิ'],
  // Set 107 (user 6 Nov): modes removed · every normal-round WIN offers offCards runes, each card rolls its rarity by rarC/rarR/rarL %
  // (rarity with nothing left → other rarities) · boss win = fixed counts offBoss* (pick 1 of 2 legend, user set 95)
  ['offCards', 'ชนะรอบปกติ: จำนวนการ์ดรูนให้เลือก', 3, 1, 5, 'ใบ'],
  ['rarC', 'ชนะรอบปกติ: โอกาสการ์ดธรรมดา', 60, 0, 100, '%'], ['rarR', 'ชนะรอบปกติ: โอกาสการ์ดหายาก', 30, 0, 100, '%'], ['rarL', 'ชนะรอบปกติ: โอกาสการ์ดตำนาน', 10, 0, 100, '%'],
  ['offBossC', 'ชนะบอส: ให้เลือกรูนธรรมดา', 0, 0, 5, 'อัน'], ['offBossR', 'ชนะบอส: ให้เลือกรูนหายาก', 0, 0, 5, 'อัน'], ['offBossL', 'ชนะบอส: ให้เลือกรูนตำนาน', 2, 0, 5, 'อัน'],
  // rune card reroll (set 100, user): rrFree free per match, then rrCost, +rrStep each time · resets every match · boss reward too
  ['rrFree', 'สุ่มการ์ดรูนใหม่ฟรีต่อรอบ', 1, 0, 9, 'ครั้ง'], ['rrCost', 'สุ่มการ์ดรูนใหม่ (เสียเงิน) ครั้งแรก', 3, 0, 50, 'เงิน'], ['rrStep', 'สุ่มการ์ดรูนใหม่: แพงขึ้นครั้งละ', 3, 0, 50, 'เงิน'],
  // set 119 (user 7 Nov): enemy = a REAL bot team (pre-generated pool), never scaled in the normal run · picked as the team whose power is
  // closest to player board power × foeBase % (nearby rounds) · no win-streak bonus (set 107 power-follow scaling + streak removed)
  ['foeBase', 'ศัตรู: เลือกทีมบอทจริงที่พลังใกล้ทีมคุณ ×', 100, 10, 400, '%'],
  // set 141 (user E2): extra matches pick with foeBaseExtra % instead of foeBase · ค่าเสนอ
  ['foeBaseExtra', 'แมตช์พิเศษ: เลือกทีมบอทจริงที่พลังใกล้ทีมคุณ ×', 120, 10, 400, '%'],
  // set 141 (user G1 H2 I3 J1 K2 M1 — replaces set 119 "no win streak"): from foeWsFrom wins in a row (boss wins count, any loss resets)
  // the wanted power grows foeWsStep % per win (2 wins +10, 3 +20 …) · no cap · real teams only (tops out at the strongest team in reach) · bosses not scaled
  ['foeWsFrom', 'ศัตรู: ชนะติดกันกี่ครั้งจึงเริ่มเลือกทีมที่แรงขึ้น', 2, 1, 20, 'ครั้ง'],
  ['foeWsStep', 'ศัตรู: ชนะติดกันแต่ละครั้ง เลือกทีมแรงขึ้นอีก (0 = ปิด)', 10, 0, 100, '%'],
  // set 127 (user R1 = C, review-2026-11-07-system-compare): floor on the wanted power = median power of the round's bot teams × foeFloor % (0 = off) · ค่าเสนอ
  ['foeFloor', 'ศัตรู: พลังขั้นต่ำ = ค่ากลางทีมบอทรอบนั้น × (0 = ปิด)', 100, 0, 200, '%'],
  // set 129 → set 132 (user 7 Nov): from foeFloorLs losses in a row (normal or boss) the floor drops foeFloorStep % per loss
  // (2 losses −20, 3 −40 …) down to foeFloorMin % · any win → back to foeFloor · ค่าเสนอ
  ['foeFloorLs', 'ศัตรู: แพ้ติดกันกี่ครั้งจึงเริ่มลดพลังขั้นต่ำ', 2, 1, 20, 'ครั้ง'],
  ['foeFloorStep', 'ศัตรู: แพ้ติดกันแต่ละครั้ง ลดพลังขั้นต่ำลงอีก', 20, 0, 200, '%'],
  ['foeFloorMin', 'ศัตรู: พลังขั้นต่ำต่ำสุดตอนแพ้ติดกัน', 40, 0, 200, '%'],
  // set 119: extra matches (after winsToFinish wins → เล่นต่อ) = the same real team + foeExtraPct % hp/atk (flat)
  ['foeExtraPct', 'แมตช์พิเศษ (หลังชนะครบ): ทีมศัตรูแรงขึ้น', 20, 0, 300, '%'],
  // boss (set 107, user D3 · set 119: extra matches only): a boss met in extra matches (3rd+) is bossExtraPct % stronger per boss, on top of its own growth (endlessPct)
  ['bossExtraPct', 'บอสในแมตช์พิเศษ (ตัวที่ 3 ขึ้นไป) แรงขึ้นอีกครั้งละ', 20, 0, 300, '%'],
  // set 119 (user): second chance — when hearts would hit 0 (once per run): +1 heart and pick 1 of offScL legend runes (no reroll)
  ['offScL', 'โอกาสสุดท้าย (หัวใจหมดครั้งแรก): ให้เลือกรูนตำนาน', 3, 1, 5, 'อัน'],
  // Endless (user 29 Oct, set 52): play up to lastStage · past the measured baseline (stage 19) normal enemies grow growPct% per stage, compounding (ทวี)
  // set 119: lastStage 20 → growth from round 20 is not reached now (kept for later)
  ['lastStage', 'รอบสูงสุดต่อ run (รอบสุดท้าย = หุ่นเป้า · ถึงได้ในแมตช์พิเศษ)', 20, 10, 200, 'รอบ'], ['growFrom', 'ศัตรูเริ่มแรงขึ้นตั้งแต่ด่าน', 20, 2, 200, 'ด่าน'], ['growPct', 'ศัตรูแรงขึ้นต่อด่าน (ทบต้น)', 8, 0, 100, '%'],
];
// set 108: boss rounds → k (1 = first boss) · 0 = no boss · the last round = 'dummy'
export function bossRoundK(round, S) {
  const r = round | 0, e = Math.max(1, S.bossEvery | 0), late = Math.max(0, S.bossLateFrom | 0), el = Math.max(1, S.bossEveryLate | 0);
  if (r < 1 || r > (S.lastStage | 0)) return 0;
  let k = 0;
  for (let i = 1; i <= r; i++) if (i <= late ? i % e === 0 : (i - late) % el === 0) k++;
  return (r <= late ? r % e === 0 : (r - late) % el === 0) ? k : 0;
}
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
      const base = out.bosses.find(b => b.id === x.id) || STAGE_BOSSES.find(b => b.id === x.id) || stageBoss(x.id, 'บอสใหม่', TRIBES[0], 400, 20, 2000, 'none', 0, 'all');
      const b = { ...base };
      const nm = typeof x.name === 'string' ? x.name.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 24) : ''; if (nm) b.name = nm;
      if (TRIBES.includes(x.tribe)) b.tribe = x.tribe;
      if (validSpot(x.spot)) b.spot = x.spot;
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
  // set 77: old R24 statusImmune (burn + shock together) → burnImmune 100% + shockImmune 100%
  const split = list => Array.isArray(list) ? list.flatMap(r => isObj(r) && r.id === 'statusImmune' ? [{ id: 'burnImmune', v: 100 }, { id: 'shockImmune', v: 100 }] : [r]) : list;
  const rules = (list, defs = []) => { const out = []; list = split(list); if (Array.isArray(list)) for (const r of list) { if (!isObj(r) || out.length >= BOSS_MAX_RULES || out.some(o => o.id === r.id)) continue; const o = rule1(r, defs.find(d => d.id === r.id)); if (o) out.push(o); } return out; };
  if (!Array.isArray(x.phases)) {
    if (!BOSS_RULES.some(q => q[0] === x.rule) && x.rule !== 'statusImmune') return b.phases.map(p => ({ ...p, rules: p.rules.map(r => ({ ...r })), fx: p.fx.map(f => ({ ...f })) }));
    return [bossPhase(0, rules([{ id: x.rule, v: x.ruleV }], b.phases[0].rules))];
  }
  const out = [];
  for (const p of x.phases.slice(0, BOSS_MAX_PHASES)) {
    if (!isObj(p) || out.length >= BOSS_MAX_PHASES) continue;
    const at = out.length ? p.at : 0;
    if (out.length && !(Number.isInteger(at) && at > out[out.length - 1].at && at < b.bars)) continue;
    const ph = bossPhase(at, rules(p.rules, (b.phases[out.length] || b.phases[0]).rules));
    if (out.length) {
      if (Array.isArray(p.fx)) for (const f of p.fx) { const q = isObj(f) && BOSS_PHASE_FX.find(z => z[0] === f.id); if (q && !ph.fx.some(o => o.id === q[0])) ph.fx.push({ id: q[0], v: q[4] ? (num(f.v, q[3], q[4]) ? f.v : q[2]) : 0 }); }
      if (validSpot(p.spot)) ph.spot = p.spot;
      if (isObj(p.stats)) for (const [k, , lo, hi, int] of BOSS_PHASE_STATS) if (num(p.stats[k], lo, hi) && (!int || Number.isInteger(p.stats[k]))) ph.stats[k] = p.stats[k];
    }
    out.push(ph);
  }
  return out.length ? out : [bossPhase(0)];
}

// Boss stats at a stage (k = 1 first boss, 2 second, 3+ endless) — for display now, battle later.
export const bossMult = (b, k, extraPct = 0) => (k <= 1 ? 1 : b.mult10 * (1 + b.endlessPct / 100) ** Math.max(0, k - 2) * (1 + extraPct / 100) ** Math.max(0, k - 2)); // set 107: extraPct = stage bossExtraPct (3rd+ boss = extra matches)
export function bossAt(b, k, extraPct = 0) {
  const m = bossMult(b, k, extraPct);
  return { hp: Math.round(b.hp * m), barHp: Math.round(b.hp * m / b.bars), atk: Math.round(b.atk * m), armor: Math.round(b.armor * m), dps: b.atk * m * b.multi / (b.cdMs / 1000) };
}
