const $ = id => document.getElementById(id);
const BASE_CHARS = buildCharacterList();
const BASE_TRIBES = JSON.parse(JSON.stringify(RULES.tribeBonus));
const BASE_FP = baseFingerprint(BASE_CHARS, BASE_TRIBES); // set 39: match code base check
const clone = x => JSON.parse(JSON.stringify(x));
// set 76: game rules (กฎเกม tab) · RULES itself is edited live so every part of the page (fights, shop prices, power budget, labels) uses the same values
const RULES_BASE = clone(RULES);
let ruleEdits = {};
function applyRulesLive() {
  for (const [path, , , , , , op] of RULE_SPEC) if (!op.lock) setRuleEdits(RULES, { [path]: op.bool ? (ruleGet(RULES_BASE, path) ? 1 : 0) : ruleGet(RULES_BASE, path) });
  setRuleEdits(RULES, ruleEdits);
  for (const c of chars) c.price = RULES.shop.prices[c.rarity];
}
let chars = clone(BASE_CHARS);
let tribes = clone(BASE_TRIBES);
let current = BASE_CHARS[0].id;
let simSpeed = 1, simView = null; // ภาพการต่อสู้ของแท็บจำลองสกิล
let comboOn = false, simTimer = 0; // โหมดทำไปลองไป
try { comboOn = localStorage.getItem('automon-balance-combo') === '1'; } catch (e) {}
let lastRun = null, baseCache = {};

// เกราะเริ่มย้ายไปเป็นสกิล "เริ่มแมตช์ → ตัวเอง: ได้เกราะ" · มัลติฮิตแยกเลเวล (19 ต.ค. combat-rules V1.8)
// [ช่อง, ชื่อ, ตัวคูณแสดงผล] · คูลดาวน์เก็บเป็นมิลลิวินาที แสดงเป็นวินาที แยกเลเวล (20 ต.ค.)
const LV_FIELDS = [['hp', 'HP'], ['atk', 'พลังโจมตี'], ['cdMs', 'คูลดาวน์ (วิ)', 1000], ['multi', 'มัลติฮิต'], ['burn', 'ไฟ/ฮิต'], ['shock', 'ช็อต/ฮิต'], ['armorHit', 'เกราะ/ฮิต'], ['healHit', 'ฟื้น/ฮิต']]; // ฟื้น/ฮิต (ชุด 18): ทุกฮิตที่ตีโดน ตัวเองฟื้น HP · ทุกเผ่า
const ONE_FIELDS = [];
const DRAFT_KEY = 'automon-balance-draft-v9'; // v3 (20 ต.ค.): นำค่าที่บันทึกเข้าเกมแล้ว ร่างเก่าไม่โหลด (กันค่าเก่าทับค่าที่ปรับบาลานซ์ใหม่)
const TRIBE_LABEL = {
  armorPct: 'เกราะเริ่ม % ของ HP', restore: 'เกราะแตกได้คืน (ครั้ง)', burn: 'ไฟ +N ที่ฮิตแรก', every: 'ทุกกี่ชุด', shock: 'ช็อต +N ที่ฮิตแรก',
  extraHit: 'ฮิตเพิ่ม', cdPct: 'คูลดาวน์ −%', instantFirst: 'ชุดแรกปล่อยทันที (1=ใช่)', blastPct: 'ระเบิดตอน down % พลังโจมตี', revives: 'ฟื้นได้กี่ตัว', revivePct: 'ฟื้นด้วย HP %',
  hpPct: 'HP สูงสุด +%', startBurn: 'เริ่มแมตช์ ศัตรูทุกตัวติดไฟ +N', burnDmgPct: 'ดาเมจไฟ +%', startShock: 'เริ่มแมตช์ ศัตรูทุกตัวติดช็อต +N', shockDmgPct: 'ดาเมจช็อต +%',
  dmgPct: 'ดาเมจตีปกติ +%', startSets: `เริ่มแมตช์ ทั้งทีมปล่อยทันที (ชุด · สูงสุด ${RULES.startSetsMax})`, // ชุด 32
};
const rulesNow = () => ({ ...RULES, tribeBonus: tribes });
const rulesBase = () => ({ ...RULES_BASE, tribeBonus: BASE_TRIBES });
// ชุด 35: เทียบโดยเรียงชื่อช่องก่อน (สกิลที่ผ่าน cleanSkill ลำดับช่องต่างจากในเกม 16 ตัว → เคยขึ้นสีเหลืองค้างแม้ค่าเท่ากัน)
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x));
const same = (a, b) => canon(a) === canon(b);
const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString();

// ชื่อไทยของสกิล (WHEN_TH, DO_TH, TO_TH, skillLine) มาจาก game/labels.js
const TB_STYLE = {
  'เหล็กกล้า': ['var(--t-steel)', 'square'], 'เพลิงเผา': ['var(--t-fire)', 'triangle'], 'สายฟ้า': ['var(--t-bolt)', 'diamond'],
  'วายุ': ['var(--t-wind)', 'circle'], 'ภูติ': ['var(--t-spirit)', 'hexagon'], 'อสูร': ['var(--t-fiend)', 'pentagon'],
};
// ป้ายสีเผ่า: รูปใหญ่ = เผ่าหลัก รูปเล็ก = เผ่าเพิ่ม
function tribeBadge(tribe, extras = []) {
  const box = document.createElement('span'); box.className = 'tb'; box.setAttribute('aria-hidden', 'true');
  [tribe, ...extras].forEach((t, i) => {
    const st = TB_STYLE[t]; if (!st) return;
    const dot = document.createElement('i'); dot.className = `s-${st[1]}${i ? ' extra' : ''}`; dot.style.setProperty('--tc', st[0]); box.append(dot);
  });
  return box;
}
const charOf = id => chars.find(x => x.id === id) || BASE_CHARS.find(x => x.id === id);
const charBadge = id => { const c = charOf(id); return c ? tribeBadge(c.tribe, c.extraTribes) : document.createElement('span'); };
