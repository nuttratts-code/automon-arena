// ---------- คำศัพท์ ----------
$('gloss').replaceChildren(...GLOSSARY.flatMap(([k, v]) => [el('dt', '', k), el('dd', '', v)]));

// ---------- จำลองสกิล: สู้ 1 แมตช์ด้วยค่าที่แก้อยู่ แล้วดูว่าสกิลไหนทำงานกี่ครั้ง ----------
// ทีมเก็บเป็น [ฝั่ง][แถว][เลน] = { id, level } | null · ข้อมูลจาก localStorage ตรวจก่อนใช้ทุกช่อง
const SIM_KEY = 'automon-balance-sim';
const emptySim = () => [0, 1].map(() => [0, 1, 2].map(() => [null, null]));
const cleanUnit = x => (x && typeof x.id === 'string' && BASE_CHARS.some(c => c.id === x.id) && [1, 2, 3].includes(x.level) ? { id: x.id, level: x.level } : null);
const cleanSimTeam = raw => (Array.isArray(raw) && raw.length === 2 ? raw.map(side => [0, 1, 2].map(r => [0, 1].map(l => cleanUnit(Array.isArray(side) && Array.isArray(side[r]) ? side[r][l] : null)))) : null);
let simTeam = emptySim(), simSaved = false; // simSaved = เคยจัดทีมไว้แล้ว (มีค่าในเครื่อง) → ไม่เติมทีมตัวอย่างอีก
try { const t = cleanSimTeam(JSON.parse(localStorage.getItem(SIM_KEY) || 'null')); if (t) { simTeam = t; simSaved = true; } } catch (e) {}
let simFoeBoss = false; // ฝั่งขวาเป็นบอส (ชุด 66 · ย้ายมาไว้ตรงนี้ให้หน้าจัดทีมรู้ตั้งแต่แรก)
const simBossSide = k => simFoeBoss && !!k && k.side === 1; // โหมดบอส: ช่องฝั่งขวาเป็นของบอส ใส่/ย้ายตัวไม่ได้
// ม้านั่งสำรอง 5 ช่อง (พักตัวไว้ ไม่ลงสู้) · คีย์ช่อง = "2:0:ลำดับ"
const BENCH_KEY = 'automon-balance-bench', BENCH_N = 5;
let simBench = Array(BENCH_N).fill(null);
const cleanBench = raw => (Array.isArray(raw) ? Array.from({ length: BENCH_N }, (_, i) => cleanUnit(raw[i])) : null);
try {
  simBench = cleanBench(JSON.parse(localStorage.getItem(BENCH_KEY) || 'null')) || simBench;
} catch (e) {}
const saveSim = () => { simSaved = true; try { localStorage.setItem(SIM_KEY, JSON.stringify(simTeam)); localStorage.setItem(BENCH_KEY, JSON.stringify(simBench)); } catch (e) {} };
const isBench = k => k.side === 2;
const validKey = k => k && [k.side, k.row, k.lane].every(Number.isInteger) && (isBench(k) ? k.row === 0 && k.lane >= 0 && k.lane < BENCH_N : k.side >= 0 && k.side <= 1 && k.row >= 0 && k.row <= 2 && k.lane >= 0 && k.lane <= 1);
const slotGet = k => (isBench(k) ? simBench[k.lane] : simTeam[k.side][k.row][k.lane]);
const slotSet = (k, v) => { if (isBench(k)) simBench[k.lane] = v; else simTeam[k.side][k.row][k.lane] = v; };
const slotName = k => (isBench(k) ? `ม้านั่ง · ช่อง ${k.lane + 1}` : `${k.side ? 'ขวา' : 'ซ้าย'} · ${ROW_TH[k.row]} · เลน ${k.lane + 1}`);
// แก้ช่องแล้ว: ถ้าเกี่ยวกับสนามค่อยนับว่าทีมเปลี่ยน (ม้านั่งไม่ลงสู้)
const slotEdited = (...ks) => { saveSim(); renderSimTeams(); if (ks.some(k => !isBench(k))) simChanged(); };
function simDefault() { // ทีมตัวอย่างครั้งแรกครั้งเดียว (ยังไม่เคยจัดทีม): ตัวที่เลือกอยู่ฝั่งซ้ายแถวที่แนะนำ + ตัวทั่วไป
  // set 68 fix: เดิมเติมทุกครั้งที่ทั้ง 2 ฝั่งว่าง → ทีมตัวอย่างโผล่กลับมาเรื่อยๆ (เช่น โหมดบอสที่ฝั่งขวาว่าง แล้วล้าง/เปลี่ยนทีมซ้าย)
  if (simSaved || simTeam.some(side => side.some(r => r.some(Boolean)))) return;
  const row = rowsOfHint(charOf(current).rowHint).length < 3 ? rowsOfHint(charOf(current).rowHint)[0] ?? 0 : 0;
  simTeam[0][row][0] = { id: current, level: 1 };
  simTeam[1][0][0] = { id: 'HL-1', level: 1 }; simTeam[1][1][0] = { id: 'PL-1', level: 1 };
}
