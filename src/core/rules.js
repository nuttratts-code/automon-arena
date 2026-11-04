import { RULES_USER } from './rules-user.js';
// ค่ากฎทั้งหมดอยู่ที่นี่ที่เดียว (อ้างอิง combat-rules V1.1 / tribe-rules / shop-merge-rules)
// ค่าที่เอกสารยังไม่กำหนด ติดป้าย "เสนอ" ปรับได้ตอนบาลานซ์
export const TRIBES = ['เหล็กกล้า', 'เพลิงเผา', 'สายฟ้า', 'วายุ', 'ภูติ', 'อสูร'];
export const RARITIES = ['ธรรมดา', 'ไม่ธรรมดา', 'หายาก', 'หายากมาก', 'ตำนาน']; // 5 ระดับ (ตัดสิน 19 ต.ค.)
export const ROW_HINTS = ['หน้า', 'กลาง', 'หลัง', 'หน้า+กลาง', 'หน้า+หลัง', 'กลาง+หลัง', 'ที่ไหนก็ได้']; // แถวแนะนำ (บอทและห้องบาลานซ์ใช้วางตัว) · ชุด 11: เลือกได้หลายแถว
export const ROW_IDX = { 'หน้า': 0, 'กลาง': 1, 'หลัง': 2 };
// แถวที่แนะนำเป็นเลขแถว (0 หน้า 1 กลาง 2 หลัง) · ที่ไหนก็ได้ = ทุกแถว · ค่าผิด = []
export const rowsOfHint = h => (h === 'ที่ไหนก็ได้' ? [0, 1, 2] : ROW_HINTS.includes(h) ? h.split('+').map(x => ROW_IDX[x]) : []);
// แถวแนะนำหลายแถว (ผู้ใช้เลือก A): สุ่มวางในแถวที่เลือกทุกแมตช์ · r = เลขสุ่ม 0–1 · แถวเดียว/ที่ไหนก็ได้ คืน null (ใช้ลำดับเดิม)
export const pickHintRow = (h, r) => { const rs = rowsOfHint(h); return rs.length === 2 ? rs[Math.min(1, Math.floor(r * 2))] : null; };
export const NAME_MAX = 30; // ความยาวชื่อตัวละครสูงสุด

// แท็กสกิล (19 ต.ค.) · ใช้แสดงผลเท่านั้น ไม่มีผลกับกฎ
// แท็กหลักออกอัตโนมัติจาก "เมื่อ" · แท็กเพิ่มผู้ใช้ตั้งเองได้ สกิลละไม่เกิน TAG_MAX แท็ก แท็กละไม่เกิน TAG_LEN ตัวอักษร
export const WHEN_KIND = {
  passive: 'เริ่มแมตช์', matchStart: 'เริ่มแมตช์',
  set: 'ต่อเนื่อง', hit: 'ต่อเนื่อง', hits3: 'ต่อเนื่อง', hitTaken: 'ต่อเนื่อง', armorBreak: 'ต่อเนื่อง',
  allyDown: 'ต่อเนื่อง', enemyDown: 'ต่อเนื่อง', kill: 'ต่อเนื่อง',
  lowHp: 'ครั้งเดียว', selfDown: 'ตอน down',
  buy: 'หลังสู้/ร้านค้า', sell: 'หลังสู้/ร้านค้า', merge: 'หลังสู้/ร้านค้า', matchEnd: 'หลังสู้/ร้านค้า', matchWin: 'หลังสู้/ร้านค้า', shopStart: 'หลังสู้/ร้านค้า', // 22 ต.ค.: เดิมชื่อ "ร้านค้า" (ทำงานนอกการต่อสู้ ให้ค่าถาวรเท่านั้น)
};
export const SKILL_KINDS = ['เริ่มแมตช์', 'ต่อเนื่อง', 'ครั้งเดียว', 'ตอน down', 'หลังสู้/ร้านค้า', 'ร้านค้า'];
export const TAG_MAX = 3, TAG_LEN = 12;
// ทำความสะอาดแท็กจากผู้ใช้/ที่เก็บ: ตัดอักขระควบคุม < > , ออก · ตัดซ้ำและซ้ำกับแท็กหลัก · คืนรายการที่ใช้ได้
export function cleanTags(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const t of list) {
    if (typeof t !== 'string') continue;
    const x = t.replace(/[\u0000-\u001f\u007f<>,]/g, '').trim().slice(0, TAG_LEN);
    if (x && !out.includes(x) && !SKILL_KINDS.includes(x)) out.push(x);
    if (out.length >= TAG_MAX) break;
  }
  return out;
}

export const RULES = {
  tickMs: 100,                 // เอกสาร: 1 tick = 0.1 วิ
  rows: 3, lanes: 2, maxBoard: 6, maxLevel: 3,
  minCooldownMs: 500,          // เสนอ (ค่าชั่วคราวตามเอกสาร)
  burnIntervalMs: 1000,        // เสนอ: ไฟทำดาเมจทุก 1 วิ เท่าจำนวนไฟที่ติด
  burnDecay: 2,                // เสนอ: แล้วลดลง 2 ทุกครั้ง (บาลานซ์รอบเบา 18 ต.ค.: เดิม 1)
  stormStartMs: 180000,        // เอกสาร: เกิน 180 วิ
  stormIntervalMs: 1000,       // เสนอ
  stormDmgStart: 10,           // ชุด 24 (ผู้ใช้เลือก · ค่าเสนอ): ดาเมจตายตัวครั้งแรก
  stormDmgMult: 2,             // ชุด 24 (ผู้ใช้เลือก C · ค่าเสนอ): แรงขึ้น 2 เท่าทุกครั้ง (10, 20, 40, 80…) ชนะเกราะที่สะสมได้แน่นอน
  stormPierce: false,          // ชุด 24 (ผู้ใช้เลือก 4B): เกราะกันพายุทรายได้ (เดิมทะลุเกราะ)
  hitCapPerMatch: 100000,      // ตัวตัดนิรภัย (ชุด 17 · ค่าเสนอ): ฮิตรวมทั้งแมตช์เกินนี้ = แมตช์ผิดปกติ จบเสมอ
  effectCapPerMatch: 1000000,  // ตัวตัดนิรภัย (ชุด 17 · ค่าเสนอ): ผลสกิลรวมทั้งแมตช์เกินนี้ = จบเสมอ
  cdGrowMax: 500,              // คูลดาวน์สกิลเพิ่มได้สูงสุด % ต่อครั้ง (ชุด 17 · ค่าเสนอ)
  reflectDebuffMaxPct: 100,    // ชุด 20 (PT-8): สะท้อนดีบัฟรวมทุกตัวที่ปกป้อง สูงสุด % (ค่าเสนอ)
  hardStopMs: 300000,          // กันวนไม่จบ (ไม่ควรถึงเพราะพายุทราย)
  tribeSteps: [2, 4, 6],       // เอกสาร
  tribesOn: true,
  // โบนัสเผ่าทั้งทีม: ค่าเสนอจาก tribe-rules (ยังไม่ยืนยัน) · แต่ละช่อง = [ขั้น 2, ขั้น 4, ขั้น 6]
  tribeBonus: {
    'เหล็กกล้า': { armorPct: [10, 20, 30], restore: [0, 0, 0], hpPct: [5, 10, 20] },        // เกราะเริ่ม % ของ HP สูงสุด · ขั้น 6 เกราะแตกได้คืน 1 ครั้ง
    'เพลิงเผา': { burn: [0, 0, 0], every: [1, 1, 1], startBurn: [0, 0, 10], burnDmgPct: [4, 8, 16] },                 // ฮิตแรกของชุด ติดไฟ +N ทุก K ชุด
    'สายฟ้า':   { shock: [0, 0, 0], every: [1, 1, 1], startShock: [0, 0, 15], shockDmgPct: [3, 6, 12] },                // ฮิตแรกของชุด ติดช็อต +N ทุก K ชุด
    'วายุ':     { extraHit: [0, 0, 1], every: [1, 1, 1], dmgPct: [10, 20, 30] },             // ฮิตเพิ่ม N ทุก K ชุด
    'ภูติ':     { cdPct: [5, 10, 20], instantFirst: [0, 0, 0], startSets: [0, 1, 2] },       // คูลดาวน์ −% · ขั้น 6 ชุดแรกปล่อยทันที
    'อสูร':     { blastPct: [0, 0, 0], revives: [1, 2, 3], revivePct: [10, 10, 10] }, // down แล้วระเบิด % พลังโจมตีใส่ศัตรูตรงหน้า · ฟื้นกี่ตัว HP กี่ %
  },
  // ชุด 32 (ผู้ใช้เลือก 25 ต.ค. · ค่าเริ่ม 0 = ไม่มีผล ผู้ใช้กรอกเองในห้องบาลานซ์): hpPct HP สูงสุด +% ทั้งทีม · startBurn/startShock ติดไฟ/ช็อตศัตรูทุกตัวตอนเริ่มแมตช์
  // burnDmgPct ดาเมจไฟบนศัตรู +% · shockDmgPct ดาเมจช็อตที่ทีมตี +% · dmgPct ดาเมจตีปกติ +% · startSets เพื่อนทุกตัวปล่อยชุดทันทีตอนเริ่ม N ชุด (รวมชุดแรกปล่อยทันที ใช้ค่าที่มากกว่า)
  startSetsMax: 3,             // ชุด 32 (ค่าเสนอ): เพดานชุดที่ปล่อยทันทีตอนเริ่มแมตช์
  minPerTribe: 6,              // เอกสาร: เผ่าละอย่างน้อย 6 ตัวที่ต่างกัน
  permCaps: {},                // ชุด 27 (ผู้ใช้ตัดสิน 24 ต.ค.): ค่าถาวรต่อตัวไม่มีเพดาน (เดิม มัลติฮิต 1 · ไฟ 3 · คูลดาวน์ 25% · เกราะเริ่ม 100) · ใส่ค่าที่นี่ = กลับมามีเพดานเฉพาะค่านั้น · คูลดาวน์ยังติดขั้นต่ำ minCooldownMs · ค่าเกิน permSanityMax = ข้อมูลผิดปกติ
  permSanityMax: 100000,       // กันค่าผิดปกติ (HP/พลังโจมตี/เกราะถาวร)
  healTribes: ['ภูติ', 'อสูร'], // เอกสาร: สกิลฟื้น HP ใช้ได้เฉพาะเผ่าภูติและอสูร (ตัดสิน 19 ต.ค. เพิ่มอสูร)
  // งบค่าพลัง (combat-rules V1.20 · ค่าเสนอ): แต้มพลังพื้นฐาน = √(เลือดรวม × ดาเมจต่อวินาที) ไม่นับสกิล
  power: { burnStack: 1.5, shockStack: 3, armorLifeSec: 15, // ไฟ 1 หน่วย ≈ ดาเมจ 1.5 · ช็อต 1 หน่วย ≈ 3 · เกราะ/ฮิต นับช่วงยืนได้ ~15 วิ
    // งบแต้มรวม (พื้นฐาน + สกิล) ที่ Lv1 ตามความหายาก · วัดด้วย lab/power.mjs 21 ต.ค. จากกฎ 5% ต่อราคา (1 แต้ม ≈ อัตราชนะ 0.43%)
    budget: { 'ธรรมดา': 16, 'ไม่ธรรมดา': 28, 'หายาก': 36, 'หายากมาก': 51, 'ตำนาน': 74 } },
  lowHpPct: 50,                // set 76 (was fixed 50 in battle.js): "HP ต่ำกว่า" trigger fires once when HP drops below this % of max HP
  // set 76: boss rule timers that were fixed in battle.js (E6 enrage, R10 armorGrow, R11 burnAura, R12 shockAura, R30 weakSpot, R29 curse window)
  bossTimers: { enrageMs: 10000, armorGrowMs: 10000, burnAuraMs: 5000, shockAuraMs: 5000, weakSpotMs: 3000, curseWindowMs: 5000 },
  reviveAllyHpPct: 20,         // ตัดสิน 19 ต.ค.: ชุบเพื่อนฟื้นด้วย HP 20% ของ HP สูงสุด
  skillCdMaxMs: 120000,        // คูลดาวน์สกิลสูงสุดที่ตั้งได้ (กันค่าผิดปกติ)
  // ร้านค้า (shop-merge-rules) · ราคาตัวละครอยู่ที่ตัวละครแต่ละตัว
  shop: {
    startGold: 25, goldPerRound: 25, winBonus: 2,   // เอกสาร (ชุด 83: ผู้ใช้เลือก 25/25)
    slots: 5, rerollCost: 1, bench: 6,              // เอกสาร
    hearts: 10, winsToFinish: 10,                   // เอกสาร
    // 5 ระดับ แบบ A (ตัดสิน 19 ต.ค.) · ราคาอยู่ที่ตัวละคร: 3 / 4 / 5 / 6 / 8
    unlockWins: { 'ธรรมดา': 0, 'ไม่ธรรมดา': 1, 'หายาก': 3, 'หายากมาก': 5, 'ตำนาน': 6 }, // ปลดล็อกตามจำนวนชนะ
    weights: { 'ธรรมดา': 45, 'ไม่ธรรมดา': 30, 'หายาก': 15, 'หายากมาก': 7, 'ตำนาน': 3 },  // เสนอ: โอกาสสุ่ม (คิดเฉพาะระดับที่ปลดล็อกแล้ว)
    prices: { 'ธรรมดา': 3, 'ไม่ธรรมดา': 4, 'หายาก': 5, 'หายากมาก': 6, 'ตำนาน': 8 },   // ราคาตามความหายาก (ตัวตรวจค่าเช็กให้ตรงกัน)
    mergeCount: 3,                                  // เอกสาร
  },
};

// ---------- set 76: "กฎเกม" tab in the Balance Room ----------
// Every rule value: [path in RULES, Thai label, lo, hi, unit, group, opts]
// opts.scale = stored ÷ scale is shown (ms → วิ) · opts.step = input step (shown units) · opts.int = whole numbers only
// opts.bool = 0/1 switch · opts.lock = reason (shown, not editable: structure of the game or a safety stop)
// The user's confirmed edits live in core/rules-user.js (RULES_USER) and are merged into RULES right below.
export const RULE_GROUPS = [
  ['storm', 'พายุทราย'], ['burn', 'ไฟ'], ['fight', 'การสู้ทั่วไป'], ['boss', 'จังหวะกฎบอส'],
  ['shop', 'ร้านค้าและ run'], ['power', 'งบค่าพลัง (ใช้แสดงผลและเช็กงบเท่านั้น)'], ['lock', 'ล็อกไว้ (ไม่ควรปรับ)'],
];
const SEC = { scale: 1000, step: 0.1 };
const RAR_RULES = (key, label, lo, hi, unit, group, opts = {}) => RARITIES.map(r => [`${key}.${r}`, `${label} ${r}`, lo, hi, unit, group, opts]);
export const RULE_SPEC = [
  ['stormStartMs', 'พายุทรายเริ่มที่', 10, 280, 'วิ', 'storm', SEC],
  ['stormIntervalMs', 'พายุทรายตีทุก', 0.1, 30, 'วิ', 'storm', SEC],
  ['stormDmgStart', 'ดาเมจพายุครั้งแรก', 0, 100000, 'ดาเมจ', 'storm', { int: true }],
  ['stormDmgMult', 'ดาเมจพายุคูณเพิ่มทุกครั้ง', 1, 10, 'เท่า', 'storm', { step: 0.05 }],
  ['stormPierce', 'พายุทะลุเกราะ (1 = ทะลุ · 0 = เกราะกันได้)', 0, 1, '', 'storm', { bool: true }],
  ['burnIntervalMs', 'ไฟทำดาเมจทุก', 0.1, 10, 'วิ', 'burn', SEC],
  ['burnDecay', 'ไฟลดลงทุกครั้งที่ทำดาเมจ', 0, 1000, 'หน่วย', 'burn', { int: true }],
  ['minCooldownMs', 'คูลดาวน์ต่ำสุด', 0.1, 10, 'วิ', 'fight', SEC],
  ['lowHpPct', 'สกิล "HP ต่ำกว่า" ทำงานเมื่อ HP ต่ำกว่า', 1, 99, '% ของ HP สูงสุด', 'fight', { int: true }],
  ['reviveAllyHpPct', 'ชุบเพื่อนฟื้นด้วย HP', 1, 100, '% ของ HP สูงสุด', 'fight', { int: true }],
  ['startSetsMax', 'เพดาน "เริ่มแมตช์ ปล่อยทันที" (โบนัสภูติ)', 0, 10, 'ชุด', 'fight', { int: true }],
  ['bossTimers.enrageMs', 'E6 บอสตีแรงขึ้นทุก', 1, 120, 'วิ', 'boss', SEC],
  ['bossTimers.armorGrowMs', 'R10 บอสได้เกราะเพิ่มทุก', 1, 120, 'วิ', 'boss', SEC],
  ['bossTimers.burnAuraMs', 'R11 ผู้เล่นทุกตัวติดไฟทุก', 1, 120, 'วิ', 'boss', SEC],
  ['bossTimers.shockAuraMs', 'R12 สุ่มผู้เล่นติดช็อตทุก', 1, 120, 'วิ', 'boss', SEC],
  ['bossTimers.weakSpotMs', 'R30 หลังบอสย้ายที่ โดนดาเมจเพิ่มนาน', 0.1, 60, 'วิ', 'boss', SEC],
  ['bossTimers.curseWindowMs', 'R29 สาป: เวลาให้ทีมตีบอสให้ถึงเป้า', 1, 60, 'วิ', 'boss', SEC],
  ['shop.startGold', 'เงินตอนเริ่ม run', 0, 100, 'เงิน', 'shop', { int: true }],
  ['shop.goldPerRound', 'เงินต่อรอบ', 0, 100, 'เงิน', 'shop', { int: true }],
  ['shop.winBonus', 'โบนัสเงินเมื่อชนะ', 0, 50, 'เงิน', 'shop', { int: true }],
  ['shop.rerollCost', 'ค่าสุ่มร้านใหม่', 0, 20, 'เงิน', 'shop', { int: true }],
  ['shop.hearts', 'หัวใจตอนเริ่ม', 1, 50, 'ดวง', 'shop', { int: true }],
  ['shop.winsToFinish', 'ชนะกี่ครั้งถึงจบ run', 1, 50, 'ครั้ง', 'shop', { int: true }],
  ...RAR_RULES('shop.prices', 'ราคา', 1, 30, 'เงิน', 'shop', { int: true }),
  ...RAR_RULES('shop.weights', 'โอกาสสุ่มเจอ', 0, 100, 'น้ำหนัก', 'shop', { int: true }),
  ...RAR_RULES('shop.unlockWins', 'ชนะกี่ครั้งถึงเริ่มเจอ', 0, 50, 'ครั้ง', 'shop', { int: true }),
  ...RAR_RULES('power.budget', 'งบแต้ม', 1, 1000, 'แต้ม', 'power'),
  ['power.burnStack', 'ไฟ 1 หน่วย นับเป็นดาเมจ', 0, 100, 'ดาเมจ', 'power', { step: 0.1 }],
  ['power.shockStack', 'ช็อต 1 หน่วย นับเป็นดาเมจ', 0, 100, 'ดาเมจ', 'power', { step: 0.1 }],
  ['power.armorLifeSec', 'เกราะ/ฮิต อยู่ได้นาน (ใช้คิดแต้ม)', 0, 300, 'วิ', 'power', { step: 1 }],
  // locked: shown so the user sees every number, not editable
  ['tickMs', 'ความละเอียดเวลา (1 tick)', 0, 0, 'มิลลิวิ', 'lock', { lock: 'ทุกตัวจับเวลาในเกมนับเป็นช่วงละ 0.1 วิ เปลี่ยนแล้วกฎหลายข้อคิดผิด' }],
  ['rows', 'จำนวนแถว', 0, 0, 'แถว', 'lock', { lock: 'โครงกระดาน (หน้า/กลาง/หลัง) เป้าโจมตีและสกิลผูกกับแถว' }],
  ['lanes', 'จำนวนช่องต่อแถว', 0, 0, 'ช่อง', 'lock', { lock: 'โครงกระดาน 3×2' }],
  ['maxBoard', 'ตัวในสนามสูงสุด', 0, 0, 'ตัว', 'lock', { lock: 'โครงกระดาน 3×2' }],
  ['maxLevel', 'เลเวลสูงสุด', 0, 0, '', 'lock', { lock: 'ค่าพลังและสกิลทุกตัวมี 3 เลเวล' }],
  ['shop.mergeCount', 'รวมร่างใช้กี่ตัว', 0, 0, 'ตัว', 'lock', { lock: 'กติการวมร่างหลักของเกม' }],
  ['shop.slots', 'ช่องในร้าน', 0, 0, 'ช่อง', 'lock', { lock: 'เปลี่ยนแล้วเซฟเกมที่เล่นค้างโหลดไม่ได้ + หน้าจอร้านจัดไว้สำหรับจำนวนนี้' }],
  ['shop.bench', 'ช่องม้านั่ง', 0, 0, 'ช่อง', 'lock', { lock: 'เปลี่ยนแล้วเซฟเกมที่เล่นค้างโหลดไม่ได้ + หน้าจอจัดไว้ 6 ช่อง' }],
  ['tribeSteps', 'ขั้นเผ่า', 0, 0, 'ตัว', 'lock', { lock: 'โบนัสเผ่าทั้งหมดตั้งไว้เป็น 3 ขั้น' }],
  ['minPerTribe', 'ตัวละครต่อเผ่าอย่างน้อย', 0, 0, 'ตัว', 'lock', { lock: 'ตัวเช็กข้อมูลตัวละคร' }],
  ['hardStopMs', 'ตัดจบแมตช์ที่', 0, 0, 'มิลลิวิ', 'lock', { lock: 'ตัวกันแมตช์วนไม่จบ (พายุทรายต้องเริ่มก่อนค่านี้)' }],
  ['hitCapPerMatch', 'เพดานฮิตต่อแมตช์', 0, 0, 'ฮิต', 'lock', { lock: 'ตัวกันวนไม่จบ' }],
  ['effectCapPerMatch', 'เพดานผลสกิลต่อแมตช์', 0, 0, 'ครั้ง', 'lock', { lock: 'ตัวกันวนไม่จบ' }],
  ['skillCdMaxMs', 'คูลดาวน์สกิลสูงสุดที่ตั้งได้', 0, 0, 'มิลลิวิ', 'lock', { lock: 'ตัวกันค่าผิดในฟอร์มสกิล' }],
  ['cdGrowMax', 'คูลดาวน์สกิลเพิ่มได้สูงสุดต่อครั้ง', 0, 0, '%', 'lock', { lock: 'ตัวกันค่าผิดในฟอร์มสกิล' }],
  ['reflectDebuffMaxPct', 'สะท้อนดีบัฟรวมสูงสุด', 0, 0, '%', 'lock', { lock: 'ตัวกันสะท้อนเกิน 100%' }],
  ['permSanityMax', 'ค่าถาวรสูงสุดต่อตัว', 0, 0, '', 'lock', { lock: 'ตัวกันค่าผิดปกติในเซฟ' }],
];
const ruleSpecOf = path => RULE_SPEC.find(x => x[0] === path);
export const ruleGet = (R, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), R);
function ruleSet(R, path, v) { const ks = path.split('.'), last = ks.pop(); let o = R; for (const k of ks) o = o[k]; o[last] = v; }
const ruleOwn = (o, k) => o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
// External data (database / pasted code / rules-user.js) → only editable paths, numbers in range (stored units). Unknown or bad = dropped.
export function cleanRuleEdits(o) {
  const out = {};
  if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
  for (const [path, , lo, hi, , , op] of RULE_SPEC) {
    if (op.lock || !ruleOwn(o, path)) continue;
    let v = o[path];
    if (op.bool) { if (v === true || v === false) v = v ? 1 : 0; if (v !== 0 && v !== 1) continue; out[path] = v; continue; }
    const sc = op.scale || 1;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < lo * sc - 1e-9 || v > hi * sc + 1e-9) continue;
    if (op.int && !Number.isInteger(v)) continue;
    out[path] = sc > 1 ? Math.round(v) : v;
  }
  return out;
}
// Put edits onto a rules object (in place). bool paths are stored as true/false like the code values.
export function setRuleEdits(R, edits) {
  for (const [path, v] of Object.entries(cleanRuleEdits(edits))) ruleSet(R, path, ruleSpecOf(path)[6].bool ? v === 1 : v);
  return R;
}
// Edits = paths whose value differs from base (both rules objects).
export function ruleEditsOf(R, base) {
  const out = {};
  for (const [path, , , , , , op] of RULE_SPEC) {
    if (op.lock) continue;
    const a = ruleGet(R, path), b = ruleGet(base, path);
    if (a !== b) out[path] = op.bool ? (a ? 1 : 0) : a;
  }
  return out;
}
setRuleEdits(RULES, RULES_USER); // user's confirmed values (Balance Room import) win over the code values above

// ---------- คำศัพท์สกิล (ครบตาม Automon Lab เดิม ยกเว้น "ทริกเกอร์" ที่กฎพักไว้) ----------
// ตัวละคร 1 ตัวมีได้หลายสกิล · สกิล = { when, do, to, v:[Lv1,Lv2,Lv3], cd?, lv?, chance?, tags? } · ไม่มีเพดานครั้ง
// cd = คูลดาวน์สกิล (มิลลิวินาที) นับจากเริ่มแมตช์: สกิลทำงานได้เมื่อเงื่อนไขครบและคูลดาวน์สกิลพร้อม แล้วเริ่มนับใหม่ (แทน "ทุก N ชุด" ตัดสิน 19 ต.ค.)
// lv = เลเวลที่สกิลนี้ใช้ได้ เช่น [3] = เฉพาะเลเวล 3 · ไม่ระบุ = ทุกเลเวล
export const BATTLE_WHEN = ['passive', 'matchStart', 'set', 'hit', 'hits3', 'hitTaken', 'lowHp', 'armorBreak', 'selfDown', 'allyDown', 'enemyDown', 'kill'];
// ค่าถาวรแบบความสามารถ (จากสกิลระหว่างสู้ที่ตั้งถาวร · ซ้อนกันได้ทุกแมตช์ ไม่มีเพดาน · ผู้ใช้เลือก 22 ต.ค.)
export const PERM_ABIL = ['cdStart', 'shareArmor', 'healToAtk', 'armorAmp', 'cdAmp', 'shockAmp', 'burnNoDecay', 'healAmp', 'hitAmp', 'burnAmp'];
// แบ่งเกราะถาวรแยกตามผู้รับ (ชุด 7): shareArmor = ทั้งทีม · share_<เป้า> = เป้าอื่น
export const SHARE_TO = ['frontAlly', 'backAlly', 'frontBackAlly', 'frontLaneAlly', 'backLaneAlly', 'frontRowAllies', 'backRowAllies', 'allyLowest', 'allyRandom', 'allyRandom2', 'tribeAllies'];
for (const t of SHARE_TO) PERM_ABIL.push('share_' + t);
// ค่าถาวรแบบค่าพลังเพิ่ม (22 ต.ค. ชุด 6): เกราะ/ฮิต · ลดคูลดาวน์เป็นวินาที · ค่าแบบ % เก็บเป็น % ติดตัว (ผู้ใช้เลือก · รวมร่างแล้วคิดจากค่าเลเวลใหม่)
export const PERM_STAT2 = ['healHit', 'armorHit', 'cdMs', 'hpPct', 'atkPct', 'burnPct', 'shockPct', 'armorHitPct'];
export const SHOP_WHEN = ['buy', 'sell', 'merge', 'matchEnd', 'matchWin', 'shopStart'];
// phase: ลำดับใน tick 0 เกราะ → 1 ดาเมจ → 2 สถานะ → 3 ฟื้น HP · side: เป้าต้องเป็นศัตรู (foe) หรือฝ่ายเรา (ally)
// perm (22 ต.ค. combat-rules V1.24): สกิลระหว่างสู้ที่ติ๊ก "ถาวร" (s.perm = true) ให้ผลทันที + เก็บเป็นค่าถาวรชนิดนี้กับตัวฝ่ายเราที่ได้รับ
//   ทำงานทุกครั้งที่สกิลทำงาน · ได้ทั้งแพ้และชนะ · ผลที่ใส่ศัตรูไม่มี perm (ตั้งถาวรไม่ได้) · ค่า % คิดเป็นตัวเลขตอนสกิลทำงาน (ค่าเสนอ)
export const DO_INFO = {
  // ฝั่งศัตรู
  dmg: { phase: 1, side: 'foe' }, dmgPctAtk: { phase: 1, side: 'foe' },
  armorBreakDmg: { phase: 1, side: 'foe', need: ['hitTaken', 'armorBreak'] },   // ดาเมจ % ของเกราะที่เสีย
  reflect: { phase: 1, side: 'foe', need: ['hitTaken'] },                      // สะท้อน % ของดาเมจที่โดน
  reflectOf: { phase: 1, side: 'foe', need: ['hitTaken'], of: true },          // ชุด 12: สะท้อนดาเมจ % ของ ค่า ของใคร (เช่น เกราะของตัวนี้)
  counter: { phase: 1, side: 'foe', need: ['hitTaken'] },                      // สวนกลับ N ฮิต
  counterMulti: { phase: 1, side: 'foe', need: ['hitTaken'] },                 // สวนกลับเท่ามัลติฮิตของตัวเอง (WY-4)
  dmgPctArmor: { phase: 1, side: 'foe' },                                      // ดาเมจ % ของเกราะที่ตัวเองมี (HL-7)
  dmgPctEnemyBurn: { phase: 1, side: 'foe' },                                  // ดาเมจ % ของไฟรวมบนศัตรูทุกตัว (PL-4)
  execute: { phase: 1, side: 'foe' },                                          // ทำให้ down ทันที (WN-8 เลเวล 3)
  burnPctArmor: { phase: 2, side: 'foe' },                                     // ติดไฟ = % ของเกราะที่ตัวเองมี (HL-1)
  maxHpCut: { phase: 2, side: 'foe' },                                         // ลด HP สูงสุด % ระหว่างสู้ (WN-8)
  burn: { phase: 2, side: 'foe' }, shock: { phase: 2, side: 'foe' },
  freeze: { phase: 2, side: 'foe' },                                           // เพิ่มคูลดาวน์ที่เหลือ (มิลลิวินาที)
  stun: { phase: 2, side: 'foe' },                                             // มึนงง หยุดนับคูลดาวน์ (มิลลิวินาที)
  cdSlowPct: { phase: 2, side: 'foeSelf' },                                   // ชุด 16: คูลดาวน์ช้าลง % ถึงจบแมตช์ (ซ้อนแบบคูณ) · ใส่ศัตรูหรือตัวเอง · ตั้งถาวรไม่ได้ · ล้างไม่ได้ (WY-8)
  noDecay: { phase: 2, side: 'foe' },
  spreadBurn: { phase: 2, side: 'foe', need: ['selfDown', 'allyDown', 'enemyDown', 'kill'] }, // % ไฟของตัวที่ down
  moveShock: { phase: 2, side: 'foe', need: ['selfDown', 'allyDown', 'enemyDown', 'kill'] },  // % ช็อตของตัวที่ down
  // ฝั่งเรา
  armor: { phase: 0, side: 'ally', perm: 'armor' }, armorPct: { phase: 0, side: 'ally', perm: 'armor' },     // เกราะ / เกราะ % HP สูงสุด
  heal: { phase: 3, side: 'ally', heal: true, perm: 'hp' }, healPct: { phase: 3, side: 'ally', heal: true, perm: 'hp' },
  selfKo: { phase: 1, side: 'self', need: ['matchStart'] },                  // ชุด 16: ตัวเอง down ทันทีตอนเริ่มแมตช์ (SF-5) · ผลตอน down/เพื่อน down ทำงานตามปกติ · ลุก/ชุบได้ แต่ผลเริ่มแมตช์ไม่ทำซ้ำ
  revive: { phase: 3, side: 'self', need: ['selfDown'] },                      // ลุกกลับมา % HP
  reviveAlly: { phase: 3, side: 'self', need: ['allyDown'], heal: true },
  reviveDowned: { phase: 3, side: 'self', need: ['set', 'hit', 'hits3', 'hitTaken', 'lowHp', 'armorBreak', 'enemyDown', 'kill'], heal: true }, // ชุด 20 (WN-4 ผู้ใช้เลือก): ชุบเพื่อนที่ down อยู่ สุ่ม v ตัว HP reviveAllyHpPct · ไม่จำกัดครั้ง (ใช้คูลดาวน์สกิลกัน)     // ชุบเพื่อนที่ down ได้ N ครั้ง/แมตช์ ด้วย HP reviveAllyHpPct (WN-4)
  lifesteal: { phase: 3, side: 'self', need: ['hit'], heal: true, perm: 'hp' },           // ฟื้น HP ตัวเอง % ของดาเมจฮิตนั้น (WN-4)
  cleanse: { phase: 2, side: 'ally' },                                         // ล้าง ไฟ ช็อต แช่แข็ง มึนงง (PT-4)
  // ชุด 20 (24 ต.ค. ผู้ใช้เลือก): ล้างไฟ/ช็อต % ของที่มี (ปัดลง · PT-4 4A) · พาเพื่อนไปตี (PT-5 3A) · สะท้อนดีบัฟ (PT-8 6A)
  cleansePct: { phase: 2, side: 'ally' },
  allyStrike: { phase: -2, side: 'ally', need: ['hit'] },                      // ตีโดน → เพื่อน (ผู้รับ) ตีเป้าเดียวกันทันที v ฮิต · นับเป็นฮิตปกติของเพื่อน · ฮิตที่ถูกพาไปไม่พาต่อ
  reflectDebuff: { phase: 2, side: 'ally', need: ['passive'] },                // ผู้รับโดนศัตรูใส่ ไฟ/ช็อต/คูลดาวน์ช้าลง → ศัตรูที่ใส่โดนกลับ v% (ผู้รับยังโดนเต็ม · ระหว่างผู้ใช้สกิลยังยืนอยู่)
  eatAllyBurn: { phase: 2, side: 'self', perm: 'atk' },                                     // ดับไฟบนเพื่อนทั้งทีม ได้พลังโจมตี % ของไฟที่ดับ (PL-5)
  stealShock: { phase: 2, side: 'foe', perm: 'shock' },                                       // ดูดช็อต % จากเป้า มาเป็นช็อตต่อฮิตตัวเอง ระหว่างสู้ (SF-6 · 21 ต.ค.)
  summon: { phase: 3, side: 'self', need: ['selfDown'] },                     // down จริงแล้วเรียกตัวที่ระบุ (s.summon) มาสู้แทน เลเวลเดียวกัน ช่องเดิม (PL-5 · 21 ต.ค.)
  shareArmor: { phase: 2, side: 'ally', need: ['passive'], perm: 'shareArmor' },     // 22 ต.ค. ชุด 7: เลือกได้ว่าแบ่งให้ใคร (ช่อง to = ผู้รับ · เดิมทั้งทีม)                  // ได้เกราะเมื่อไหร่ เพื่อนทั้งทีมได้ % ของจำนวนนั้น (HL-8)
  healToAtk: { phase: 2, side: 'self', need: ['passive'], perm: 'healToAtk' },                   // ฟื้น HP ให้ใคร ได้พลังโจมตี % ของที่ฟื้น (PT-4)
  cdCut: { phase: 2, side: 'ally', perm: 'cdStart' }, cdPct: { phase: 2, side: 'ally', perm: 'cdPct' },        // ลดคูลดาวน์ที่เหลือ (ms) / ลดคูลดาวน์ %
  atkUp: { phase: 2, side: 'ally', perm: 'atk' }, atkPct: { phase: 2, side: 'ally', perm: 'atkPct' }, hpUp: { phase: 2, side: 'ally', perm: 'hp' },
  multiUp: { phase: 2, side: 'ally', perm: 'multi' }, burnHitUp: { phase: 2, side: 'ally', perm: 'burn' }, shockHitUp: { phase: 2, side: 'ally', perm: 'shock' },
  // ชุด 6 (22 ต.ค. ผู้ใช้ขอให้ครบทุกค่าพลัง ทั้ง + ค่า และ + %)
  hpPct: { phase: 2, side: 'ally', perm: 'hpPct' }, armorHitUp: { phase: 2, side: 'ally', perm: 'armorHit' }, armorHitPct: { phase: 2, side: 'ally', perm: 'armorHitPct' },
  healHitUp: { phase: 2, side: 'ally', perm: 'healHit' }, // 28 ต.ค.: ฟื้น/ฮิต + (ผู้ใช้ขอ · ยังไม่ใส่ให้ตัวละครไหน)
  burnHitPct: { phase: 2, side: 'ally', perm: 'burnPct' }, shockHitPct: { phase: 2, side: 'ally', perm: 'shockPct' }, cdMsDown: { phase: 2, side: 'ally', perm: 'cdMs' },
  healAmp: { phase: 2, side: 'ally', perm: 'healAmp' }, hitAmp: { phase: 2, side: 'ally', perm: 'hitAmp' }, burnAmp: { phase: 2, side: 'ally', perm: 'burnAmp' },
  // ชุด 7 (22 ต.ค.): ผลแบบ "% ของ ค่า ของ ใคร" เลือกเองในช่อง of = { stat, who } (แทนผลที่ฝังค่าไว้ในชื่อ)
  dmgOf: { phase: 1, side: 'foe', of: true }, burnOf: { phase: 2, side: 'foe', of: true }, shockOf: { phase: 2, side: 'foe', of: true },
  armorOf: { phase: 0, side: 'ally', of: true, perm: 'armor' },
  // ชุด 9 (22 ต.ค.): ค่าพลัง + % ของ ค่า ของ ใคร · คิดตอนสกิลทำงานแล้วบวกค้าง (ผู้ใช้เลือก) · ถาวรเก็บเป็นตัวเลขที่ได้
  atkOf: { phase: 2, side: 'ally', of: true, perm: 'atk' }, hpOf: { phase: 2, side: 'ally', of: true, perm: 'hp' }, burnHitOf: { phase: 2, side: 'ally', of: true, perm: 'burn' },
  shockHitOf: { phase: 2, side: 'ally', of: true, perm: 'shock' }, armorHitOf: { phase: 2, side: 'ally', of: true, perm: 'armorHit' }, healOf: { phase: 3, side: 'ally', of: true, heal: true, perm: 'hp' },
  // ใส่ศัตรู (ระหว่างสู้เท่านั้น · ตั้งถาวรไม่ได้)
  burnTakenUp: { phase: 2, side: 'foe' }, shockTakenUp: { phase: 2, side: 'foe' }, dmgTakenUp: { phase: 2, side: 'foe' }, armorGainCut: { phase: 2, side: 'foe' }, healCut: { phase: 2, side: 'foe' },
  burnNoDecay: { phase: 2, side: 'ally', perm: 'burnNoDecay' },                                     // ไฟที่ตัวนั้นติดให้ไม่ลดลง
  armorAmp: { phase: 2, side: 'ally', perm: 'armorAmp' }, cdAmp: { phase: 2, side: 'ally', perm: 'cdAmp' }, shockAmp: { phase: 2, side: 'ally', perm: 'shockAmp' }, // เพิ่มผลที่ได้รับ %
  // ปรับการโจมตีครั้งที่กำลังปล่อย (ใช้กับ ทุกครั้งที่โจมตี)
  extraHit: { phase: -1, side: 'self', need: ['set'] },
  spread: { phase: -1, side: 'pick', need: ['set'] },
  retarget: { phase: -1, side: 'pick', need: ['set'] },
  splitAll: { phase: -1, side: 'pick', need: ['set'] },                        // ตีศัตรูทุกตัว แบ่งค่าเท่ากัน (SF-8 · 21 ต.ค.)
  // สกิลร้านค้า: ค่าถาวรตลอด run
  permHp: { shop: 'hp' }, permAtk: { shop: 'atk' }, permArmor: { shop: 'armor' }, permBurn: { shop: 'burn' },
  permShock: { shop: 'shock' }, permMulti: { shop: 'multi' }, permCdPct: { shop: 'cdPct' },
};
// สกิลหลังสู้/ร้านค้าครบทุกค่าถาวร (ชุด 6): สร้างจากผลระหว่างสู้ที่ตั้งถาวรได้ · ชื่อ perm_<ชนิด> · SHOP_OF = ผลระหว่างสู้ที่คู่กัน (ห้องบาลานซ์รวมเป็นตัวเลือกเดียว)
export const SHOP_PAIR = { permHp: 'hpUp', permAtk: 'atkUp', permArmor: 'armor', permBurn: 'burnHitUp', permShock: 'shockHitUp', permMulti: 'multiUp', permCdPct: 'cdPct' };
for (const [d, x] of Object.entries(DO_INFO)) {
  if (!x.perm || x.shop || ['armorPct', 'heal', 'healPct', 'lifesteal', 'eatAllyBurn', 'stealShock', 'armorOf', 'healOf', 'atkOf', 'hpOf', 'burnHitOf', 'shockHitOf', 'armorHitOf'].includes(d)) continue;
  if (Object.values(SHOP_PAIR).includes(d)) continue;
  const name = 'perm_' + x.perm; DO_INFO[name] = { shop: x.perm }; SHOP_PAIR[name] = d;
}
// ผลแบบ % ของ: ค่าที่ใช้คิด และเป็นค่าของใคร (each = ตัวที่โดนผล คิดแยกทีละตัว · ctx = เป้าหมาย/ผู้ตีตามเงื่อนไข · all* = รวมทุกตัวที่ยืนอยู่)
export const OF_STATS = ['atk', 'armor', 'maxHp', 'hp', 'hpLost', 'burn', 'shock', 'healHit']; // healHit (28 ต.ค. ผู้ใช้ขอ): ฟื้น/ฮิต ปัจจุบันของตัวนั้น
export const OF_WHO = ['self', 'each', 'ctx', 'allEnemies', 'allAllies', 'laneEnemies', 'rowEnemies', 'laneAllies', 'rowAllies']; // ชุด 12: รวมของศัตรู/เพื่อน เลนเดียวกัน หรือแถวเดียวกับตัวนี้ (ทั้ง 2 เลน)
export const CTX_WHEN = { set: 'target', hit: 'target', hits3: 'target', hitTaken: 'attacker', armorBreak: 'attacker', lowHp: 'attacker' };
// ผลเดิมที่ฝังค่าไว้ในชื่อ → แบบใหม่ (ห้องบาลานซ์แปลงร่างเก่าให้ · ตัวคำนวณยังรองรับแบบเดิม)
export const LEGACY_OF = { dmgPctAtk: ['dmgOf', 'atk', 'self'], dmgPctArmor: ['dmgOf', 'armor', 'self'], dmgPctEnemyBurn: ['dmgOf', 'burn', 'allEnemies'],
  armorPct: ['armorOf', 'maxHp', 'each'], healPct: ['healOf', 'maxHp', 'each'], burnPctArmor: ['burnOf', 'armor', 'self'] };
export function upgradeSkill(s) {
  if (s && Object.prototype.hasOwnProperty.call(LEGACY_OF, s.do)) { const [d, stat, who] = LEGACY_OF[s.do]; s = { ...s, do: d, of: { stat, who } }; }
  if (s && s.do === 'shareArmor' && s.to === 'self') s = { ...s, to: 'allAllies' };
  return s;
}
export const FOE_T = ['enemyFront', 'enemyMidRow', 'enemyBackRow', 'enemyFrontRow', 'enemyLane', 'lowestHp', 'enemyRandom', 'allEnemies'];
export const ALLY_T = ['self', 'frontAlly', 'backAlly', 'frontBackAlly', 'allyAt', 'frontLaneAlly', 'backLaneAlly', 'frontRowAllies', 'backRowAllies', 'allyLowest', 'allyRandom', 'allyRandom2', 'tribeAllies', 'allAllies'];
export const SHOP_T = ['self', 'frontAlly', 'backAlly', 'backLaneAlly', 'frontBackAlly', 'allyAt', 'frontRowAllies', 'backRowAllies', 'allyRandom', 'allyRandom2', 'tribeAllies', 'nextTribeBuy', 'allAllies']; // nextTribeBuy = เพื่อนเผ่าเดียวกันตัวถัดไปที่ซื้อ (SF-7 · 21 ต.ค.)
// ชุด 14 (ผู้ใช้เลือก): เพื่อนตามตำแหน่ง = เลือกแถว (หน้า/กลาง/หลัง/ทุกแถว) × เลน (เดียวกัน/อีกเลน/ทั้ง 2) · ไม่รวมตัวเอง · ไม่มี = ไม่มีผล
export const AT_ROWS = ['front', 'mid', 'back', 'any'], AT_LANES = ['same', 'other', 'both'];
export const atMatch = (at, myRow, myLane, row, lane) => (at.row === 'any' || ['front', 'mid', 'back'].indexOf(at.row) === row)
  && (at.lane === 'both' || (at.lane === 'same') === (lane === myLane));
// ติ๊ก "เฉพาะเผ่าเดียวกัน" ได้กับผู้รับฝ่ายเราทุกแบบ ยกเว้นตัวเอง เผ่าเดียวกัน (ซ้ำ) ตัวถัดไปที่ซื้อ และแบ่งเกราะ
export const sameTribeOk = s => ['self', 'tribeAllies', 'nextTribeBuy'].indexOf(s.to) < 0 && s.do !== 'shareArmor' && (ALLY_T.includes(s.to) || SHOP_T.includes(s.to));
// ชุด 17: ติ๊ก "ไม่ให้ผลกับตัวอื่นที่ ID เดียวกัน" ได้กับผู้รับฝ่ายเรา ยกเว้นตัวเอง ตัวถัดไปที่ซื้อ แบ่งเกราะ และผลของตัวเองล้วน
export const skipSameIdOk = s => ['self', 'nextTribeBuy'].indexOf(s.to) < 0 && s.do !== 'shareArmor' && !!DO_INFO[s.do] && DO_INFO[s.do].side !== 'self' && (ALLY_T.includes(s.to) || SHOP_T.includes(s.to));
export const SKILL_TARGETS = [...new Set([...FOE_T, 'target', 'attacker', ...ALLY_T])];

// เป้าที่ใช้ได้กับคู่ เงื่อนไข + ผล (ว่าง = ใช้คู่กันไม่ได้)
export function skillTargets(when, d) {
  const info = DO_INFO[d];
  if (!info) return [];
  const shopWhen = SHOP_WHEN.includes(when);
  if (!!info.shop !== shopWhen) return [];
  if (shopWhen) return SHOP_T;
  if (!BATTLE_WHEN.includes(when) || (info.need && !info.need.includes(when))) return [];
  if (info.side === 'self') return ['self'];
  if (d === 'spread') return ['lowestHp'];
  if (d === 'splitAll') return ['allEnemies'];
  if (d === 'retarget') return ['enemyMidRow', 'enemyBackRow', 'lowestHp', 'enemyRandom'];
  if (d === 'allyStrike') return ALLY_T.filter(t => t !== 'self'); // ชุด 20: พาเพื่อน (ไม่รวมตัวเอง)
  if (d === 'shareArmor') return ALLY_T.filter(t => t !== 'self' && t !== 'allyAt'); // ผู้รับเกราะที่แบ่ง (ชุด 14: ไม่รองรับเพื่อนตามตำแหน่ง)
  if (info.side === 'ally') return ALLY_T;
  const extra = [];
  if (['set', 'hit', 'hits3'].includes(when)) extra.push('target');
  if (['hitTaken', 'armorBreak', 'lowHp'].includes(when)) extra.push('attacker');
  return [...extra, ...FOE_T, ...(info.side === 'foeSelf' ? ['self'] : [])]; // ชุด 16: ผลที่ใส่ศัตรูหรือตัวเองได้
}
// ตาราง เงื่อนไข → ผล → [เป้า] สำหรับหน้าแก้สกิลและตัวตรวจค่า
export const SKILL_SPEC = Object.fromEntries([...BATTLE_WHEN, ...SHOP_WHEN].map(w => [w,
  Object.fromEntries(Object.keys(DO_INFO).map(d => [d, skillTargets(w, d)]).filter(([, t]) => t.length))]));

// ชุด 20 (tribe-rules V1.15 ตารางค่ากลาง · ค่าเสนอ): ค่ากลาง Lv1 ตามความหายาก × ตัวคูณเผ่า · HP ปัดทีละ 5 · พลังโจมตีปัดเป็นจำนวนเต็ม ต่ำสุด 1 · Lv2/Lv3 = ×2/×4
// ใช้แสดงในห้องบาลานซ์เท่านั้น ไม่มีผลกับการต่อสู้
export const MID_BASE = { hp: [150, 180, 250, 320, 450], atk: [6, 8, 12, 16, 22] };
export const MID_MUL = { 'เหล็กกล้า': [1.4, 0.6], 'เพลิงเผา': [0.9, 0.8], 'สายฟ้า': [0.9, 0.8], 'วายุ': [0.8, 0.5], 'ภูติ': [0.9, 0.7], 'อสูร': [1.0, 1.4] };
// ชุด 21 (tribe-rules V1.17 · ผู้ใช้เลือก A · ค่าเสนอ): ช่วงคูลดาวน์ (วิ) ตามเผ่า · แสดงเป็นตัวจางใต้ช่องคูลดาวน์ในห้องบาลานซ์ ไม่เตือน ไม่มีผลกับการต่อสู้
export const TRIBE_CD_SEC = { 'เหล็กกล้า': [6, 7], 'เพลิงเผา': [6, 7], 'สายฟ้า': [6, 7], 'วายุ': [5, 6], 'ภูติ': [5, 6], 'อสูร': [5, 6] };
export function midStats(tribe, rarity) {
  const r = RARITIES.indexOf(rarity), m = MID_MUL[tribe];
  if (r < 0 || !m) return null;
  const hp = Math.round(MID_BASE.hp[r] * m[0] / 5) * 5, atk = Math.max(1, Math.round(MID_BASE.atk[r] * m[1]));
  return { hp: [hp, hp * 2, hp * 4], atk: [atk, atk * 2, atk * 4] };
}
