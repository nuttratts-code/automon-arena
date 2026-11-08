// ชุดทดสอบ: ร้านค้า รวมร่าง สกิลร้านค้า ค่าถาวร run (shop-merge-rules) · แยกจาก mechanics.js (ชุด D) · ตัวช่วยอยู่ helpers.js
import { simulate } from '../core/battle.js';
import { buildCharacterList } from '../core/characters.js';
import { RARITIES, RULES } from '../core/rules.js';
import { addPerm, allUnits, baseIncomeAt, buy, buyMerge, continueExtra, endMatch, lvForRound, move, newRun, oddsAt, reroll, sell, shopLvOf, startRound, teamEntries, toggleLock } from '../core/shop.js';
import { buildTeam, makeCharMap } from '../core/team.js';
import { validateConfig, validateTeam } from '../core/validate.js';
import { mk, L3, u, eq, ok } from './helpers.js';
export const TESTS_SHOP = [
  // ---------- ร้านค้าและรวมร่าง ----------
  ['ร้าน: เงินเริ่ม · รายได้รอบละ · ชนะได้โบนัส · เงินค้างข้ามรอบ', () => {
    const chars = buildCharacterList(), st = newRun(chars, 1), S = RULES.shop;
    startRound(st, chars); eq(st.gold, S.startGold, 'รอบแรก');
    st.gold = 3; endMatch(st, true, chars); startRound(st, chars); eq(st.gold, baseIncomeAt(2) + S.winBonus, 'หลังชนะ (set 107: เงินเหลือไม่ทบ)');
    st.gold = 4; endMatch(st, false, chars); startRound(st, chars); eq(st.gold, baseIncomeAt(3), 'หลังแพ้ (set 107: เงินเหลือไม่ทบ)');
  }],
  ['set 96 เงินต่อรอบเพิ่มทีละขั้น: 10,13,16,19,22,25,25… · goldStep 0 = เท่ากันทุกรอบ', () => {
    eq([1, 2, 3, 4, 5, 6, 7, 20].map(r => baseIncomeAt(r)), [10, 13, 16, 19, 22, 25, 25, 25], 'ค่าเริ่มต้น');
    const flat = { ...RULES, shop: { ...RULES.shop, goldStep: 0 } };
    eq([1, 2, 9].map(r => baseIncomeAt(r, flat)), [10, 25, 25], 'goldStep 0');
    const chars = buildCharacterList(), st = newRun(chars, 2);
    startRound(st, chars); eq(st.gold, 10, 'รอบ 1');
    st.gold = 0; endMatch(st, false, chars); startRound(st, chars); eq(st.gold, 13, 'รอบ 2 แพ้');
    st.gold = 0; endMatch(st, true, chars); startRound(st, chars); eq(st.gold, 16 + RULES.shop.winBonus, 'รอบ 3 ชนะ');
  }],
  ['set 89 ไม่มีดอกเบี้ย/ชนะติด/แพ้ติด: เงินที่เหลือไม่เพิ่ม · ชนะ = รอบละ + โบนัสชนะเสมอ · แพ้ = รอบละ', () => {
    const chars = buildCharacterList(), S = RULES.shop, st = newRun(chars, 4);
    startRound(st, chars);
    const step = (won, bonus, what) => { st.gold = 100; endMatch(st, won, chars); const base = baseIncomeAt(st.round + 1); startRound(st, chars); eq(st.gold, base + bonus, what); };
    for (let i = 1; i <= 5; i++) step(true, S.winBonus, `ชนะ ${i}`);
    for (let i = 1; i <= 5; i++) step(false, 0, `แพ้ ${i}`);
    ok(!('wStreak' in st) && !('shopLv' in st), 'สถานะไม่มีช่องชนะติด/ระดับร้าน');
  }],
  ['set 89 ระดับร้าน: ขึ้นเองตามรอบ (แพ้หรือชนะก็นับ) · รอบ n = ระดับ n · เกินตารางใช้ค่าสุดท้าย · แก้ตารางได้', () => {
    const chars = buildCharacterList(), st = newRun(chars, 5);
    for (let r = 1; r <= 19; r++) { startRound(st, chars); eq(shopLvOf(st), Math.min(r, 15), `รอบ ${r}`); endMatch(st, r % 2 === 0, chars); st.over = false; }
    const R2 = { ...RULES, shop: { ...RULES.shop, roundLevels: [1, 1, 2, 2, 3] } };
    eq([1, 2, 3, 4, 5, 6, 30].map(r => lvForRound(r, R2)), [1, 1, 2, 2, 3, 3, 3], 'ตารางแก้เอง');
    eq(RULES.shop.rerollCost, 1, 'รีโรล 1 (set 98)');
    ok(!validateConfig(chars, { ...RULES, shop: { ...RULES.shop, roundLevels: [1, 16] } }).ok, 'ระดับเกิน 15 ต้องเตือน');
    ok(!validateConfig(chars, { ...RULES, shop: { ...RULES.shop, roundLevels: [] } }).ok, 'ตารางว่างต้องเตือน');
  }],
  ['ระดับร้าน: เจอเฉพาะความหายากที่โอกาส > 0 ของระดับนั้น', () => {
    const chars = buildCharacterList(), cm = makeCharMap(chars);
    for (const lv of [1, 2, 6, 10, 15]) {
      const allowed = RARITIES.filter(r => oddsAt(lv)[r] > 0);
      const R = { ...RULES, shop: { ...RULES.shop, roundLevels: [lv] } }, st = newRun(chars, 9 + lv, R); const seen = new Set();
      for (let i = 0; i < 120; i++) { startRound(st, chars, R); st.shop.forEach(x => seen.add(cm[x.id].rarity)); }
      ok([...seen].every(r => allowed.includes(r)), `ระดับ ${lv} เจอความหายากที่ปิดอยู่`);
      eq(seen.has('ธรรมดา'), true, `ระดับ ${lv} ต้องเจอธรรมดา`);
      for (const r of allowed) if (oddsAt(lv)[r] >= 10) ok(seen.has(r), `ระดับ ${lv} ต้องเจอ${r}`); // set 133: follows the odds table (was: Lv10+ must show legend)
    }
  }],
  ['ร้าน: ความหายากที่ไม่มีตัวละคร ไม่ทำให้ร้านพัง', () => {
    const chars = buildCharacterList().filter(c => c.rarity !== 'ไม่ธรรมดา' && c.rarity !== 'ธรรมดา'), st = newRun(chars, 77);
    for (let i = 0; i < 30; i++) { ok(startRound(st, chars).ok, 'เริ่มรอบไม่ได้'); ok(st.shop.every(x => x.id), 'มีช่องร้านว่าง'); }
  }],
  ['ร้าน: ซื้อหักเงิน · ขายคืนเต็มราคา · ม้านั่งเต็มซื้อไม่ได้', () => {
    const chars = buildCharacterList(), st = newRun(chars, 2);
    startRound(st, chars); st.gold = 100;
    const id = st.shop[0].id, price = makeCharMap(chars)[id].price;
    ok(buy(st, 0, null, chars).ok, 'ซื้อไม่ได้'); eq([st.gold, st.bench[0].id], [100 - price, id], 'หลังซื้อ');
    eq(st.shop[0].id, null, 'ของที่ซื้อหายจากร้าน');
    ok(sell(st, { at: 'bench', i: 0 }, chars).ok, 'ขายไม่ได้'); eq(st.gold, 100, 'ขายคืนเต็ม');
    st.bench = st.bench.map((_, i) => ({ uid: 900 + i, id: 'PT-1', level: 1, perm: {}, paid: 3 }));
    st.shop[1].id = 'HL-1';
    ok(!buy(st, 1, null, chars).ok, 'ม้านั่งเต็มต้องซื้อไม่ได้');
    ok(buy(st, 1, { at: 'board', row: 0, lane: 0 }, chars).ok, 'ซื้อลงช่องบอร์ดว่างได้');
    st.gold = 0; st.shop[2].id = 'HL-1'; ok(!buy(st, 2, { at: 'board', row: 0, lane: 1 }, chars).ok, 'เงินไม่พอต้องซื้อไม่ได้');
  }],
  ['ร้าน: รีโรลหักเงิน · ช่องที่ล็อกไม่เปลี่ยน ทั้งรีโรลและรอบใหม่', () => {
    const chars = buildCharacterList(), st = newRun(chars, 3);
    startRound(st, chars); st.gold = 10;
    const keep = st.shop[2].id; toggleLock(st, 2);
    ok(reroll(st, chars).ok, 'รีโรลไม่ได้'); eq([st.gold, st.shop[2].id, st.shop[2].locked], [10 - RULES.shop.rerollCost, keep, true], 'หลังรีโรล');
    endMatch(st, true, chars); startRound(st, chars); eq(st.shop[2].id, keep, 'รอบใหม่');
    st.gold = RULES.shop.rerollCost - 1; ok(!reroll(st, chars).ok, 'เงินไม่พอต้องรีโรลไม่ได้');
  }],
  ['รวมร่าง: 3 ตัวเลเวลเท่ากัน → เลเวลถัดไป ข้ามบอร์ด/ม้านั่งได้ · 1+1+2 ไม่ได้', () => {
    const chars = buildCharacterList(), st = newRun(chars, 4);
    const U = (uid, level, paid, perm = {}) => ({ uid, id: 'HL-1', level, perm, paid });
    st.board[0][0] = U(1, 1, 3, { atk: 2 }); st.bench[0] = U(2, 1, 3, { atk: 1 }); st.bench[1] = U(3, 1, 3);
    const r = move(st, { at: 'bench', i: 0 }, { at: 'board', row: 0, lane: 0 }, chars);
    ok(r.ok && r.merged === 2, 'ควรรวมได้');
    const hp1 = chars.find(c => c.id === 'HL-1').price; // set 127 (R2 A): merge loses 1 copy of sell value
    eq([st.board[0][0].level, st.board[0][0].paid, st.board[0][0].perm.atk, allUnits(st).length], [2, Math.max(0, 9 - hp1), 3, 1], 'ผลรวมร่าง');
    st.bench[0] = U(4, 1, 3); st.bench[1] = U(5, 1, 3);
    const r2 = move(st, { at: 'bench', i: 0 }, { at: 'board', row: 0, lane: 0 }, chars);
    eq([r2.merged, st.board[0][0].level], [undefined, 1], '1+1+2 ไม่รวม (สลับที่แทน)');
  }],
  ['set 127 (R2 A): ขายหลังรวมร่าง เสียตัวละ 1 ต่อการรวม · ราคา 3: Lv1 3 · Lv2 6 · Lv3 15 · paid 0 ไม่ติดลบ', () => {
    const chars = buildCharacterList().map(c => c.id === 'HL-1' ? { ...c, price: 3 } : c), st = newRun(chars, 4);
    const U = (uid, level = 1, paid = 3) => ({ uid, id: 'HL-1', level, perm: {}, paid });
    const lv2 = () => { st.board[0][0] = U(1); st.bench[0] = U(2); st.bench[1] = U(3); move(st, { at: 'bench', i: 0 }, { at: 'board', row: 0, lane: 0 }, chars); return st.board[0][0]; };
    eq([lv2().level, st.board[0][0].paid], [2, 6], 'Lv2 = 9 − 3');
    st.bench[0] = U(4, 2, 6); st.bench[1] = U(5, 2, 6);
    const m = move(st, { at: 'bench', i: 0 }, { at: 'board', row: 0, lane: 0 }, chars);
    ok(m.ok && m.merged === 3, 'Lv3 merge'); eq(st.board[0][0].paid, 15, 'Lv3 = 3 × 6 − 3');
    st.gold = 0; ok(sell(st, { at: 'board', row: 0, lane: 0 }, chars).ok, 'sell'); eq(st.gold, 15, 'sell Lv3 refunds 15');
    st.board[0][0] = U(7, 1, 0); st.bench[0] = U(8, 1, 0); st.bench[1] = U(9, 1, 0);
    move(st, { at: 'bench', i: 0 }, { at: 'board', row: 0, lane: 0 }, chars); eq(st.board[0][0].paid, 0, 'paid 0 copies → floor 0');
  }],
  ['set 106: ลากการ์ดร้านไปทับตัวชนิดเดียวกัน Lv1 = ซื้อ + รวมร่างทันที · ม้านั่งเต็มก็ได้ · มีตัวเดียว/เงินไม่พอ/ต่างชนิด = ไม่ได้ ไม่เสียเงิน', () => {
    const chars = buildCharacterList(), st = newRun(chars, 4), price = chars.find(c => c.id === 'HL-1').price;
    const U = (uid, id, level = 1) => ({ uid, id, level, perm: {}, paid: 3 });
    st.bench = st.bench.map((_, i) => U(100 + i, 'WY-1')); st.board[0][0] = U(1, 'HL-1');
    st.gold = 50; st.shop[0] = { id: 'HL-1', locked: true };
    const r0 = buyMerge(st, 0, { at: 'board', row: 0, lane: 0 }, chars);
    ok(!r0.ok && st.gold === 50 && st.shop[0].id === 'HL-1', 'มีตัวเดียว = ไม่ได้ ไม่เสียเงิน');
    st.board[1][1] = U(2, 'HL-1');
    ok(!buyMerge(st, 0, { at: 'bench', i: 0 }, chars).ok, 'ต่างชนิด = ไม่ได้');
    st.gold = price - 1; ok(!buyMerge(st, 0, { at: 'board', row: 0, lane: 0 }, chars).ok, 'เงินไม่พอ'); st.gold = 50;
    const r = buyMerge(st, 0, { at: 'board', row: 0, lane: 0 }, chars);
    ok(r.ok && r.merged === 2, 'ควรรวมได้');
    eq([st.board[0][0].level, st.board[0][0].paid, st.board[1][1], st.gold, st.shop[0].id, st.bench.filter(Boolean).length], [2, 6, null, 50 - price, null, st.bench.length], 'ผล'); // set 127: 3 + 3 + price − 1 copy (price)
    st.board[0][0] = U(3, 'HL-1', 2); st.board[1][1] = U(4, 'HL-1', 2); st.shop[1] = { id: 'HL-1', locked: false };
    ok(!buyMerge(st, 1, { at: 'board', row: 0, lane: 0 }, chars).ok, 'ทับตัวเลเวล 2 ไม่ได้ (ตัวที่ซื้อเป็นเลเวล 1)');
  }],
  ['รวมร่าง: ค่าถาวรรวมกัน (ไม่เกินเพดานถ้ามี · ชุด 27 ไม่มีเพดาน) · เลเวล 3 รวมต่อไม่ได้', () => {
    const chars = buildCharacterList(), st = newRun(chars, 5);
    const U = (uid, level) => ({ uid, id: 'WY-1', level, perm: { multi: 1, armor: 60 }, paid: 3 });
    st.bench[0] = U(1, 1); st.bench[1] = U(2, 1); st.bench[2] = U(3, 1);
    move(st, { at: 'bench', i: 0 }, { at: 'bench', i: 1 }, chars);
    const capped = (k, sum) => RULES.permCaps[k] == null ? sum : Math.min(RULES.permCaps[k], sum); // ชุด 27: ไม่ผูกกับเพดานที่ตั้ง
    eq([st.bench[1].perm.multi, st.bench[1].perm.armor], [capped('multi', 3), capped('armor', 180)], 'ค่าถาวรรวมกัน');
    st.bench = [U(7, 3), U(8, 3), U(9, 3), null, null, null];
    eq(move(st, { at: 'bench', i: 0 }, { at: 'bench', i: 1 }, chars).merged, undefined, 'เลเวล 3 ไม่รวม');
  }],
  ['ชุด 27: ค่าถาวรไม่มีเพดาน · มัลติฮิต/ไฟ/เกราะเริ่มสะสมเกินเพดานเดิม · คูลดาวน์ถาวรเกิน 100% ติดขั้นต่ำระบบ', () => {
    eq(Object.keys(RULES.permCaps).length, 0, 'ไม่มีเพดานค่าถาวร');
    const chars = buildCharacterList(), map = makeCharMap(chars);
    const u = { uid: 1, id: 'WY-1', level: 1, perm: {}, paid: 3 };
    for (let k = 0; k < 5; k++) { addPerm(u, 'multi', 1, RULES); addPerm(u, 'burn', 3, RULES); addPerm(u, 'armor', 100, RULES); addPerm(u, 'cdPct', 40, RULES); }
    eq([u.perm.multi, u.perm.burn, u.perm.armor, u.perm.cdPct], [5, 15, 500, 200], 'สะสมเกินเพดานเดิม');
    const [f] = buildTeam([{ id: 'WY-1', level: 1, row: 0, lane: 0, perm: u.perm }], map, RULES);
    const c = map['WY-1'];
    eq([f.multi, f.burnHit, f.startArmor, f.cdMs], [c.multi[0] + 5, c.burn[0] + 15, 500, 0], 'ค่าในแมตช์');
    const r = simulate([f], buildTeam([{ id: 'HL-6', level: 3, row: 0, lane: 0 }], map, RULES), { rules: { ...RULES, hardStopMs: 3000 }, log: true });
    const sets = r.events.filter(e => e.k === 'set' && e.who === 0).map(e => e.t);
    ok(sets.length >= 2 && sets.slice(1).every((t, i) => t - sets[i] >= RULES.minCooldownMs), 'ชุดห่างกันไม่ต่ำกว่าคูลดาวน์ขั้นต่ำ ' + JSON.stringify(sets.slice(0, 5)));
  }],
  ['สกิลร้านค้า: ขาย (ตัวทดสอบ WN-5) → เพื่อนบนบอร์ดได้พลังโจมตี · ตัวบนม้านั่งไม่ได้', () => {
    // ชุด 19: ตรึงสกิลขายของตัวทดสอบไว้ที่ 1/2/4 ไม่ผูกกับค่าที่ผู้ใช้ปรับ (WN-5 ในเกมเปลี่ยนสกิลแล้ว)
    const base = buildCharacterList(), w5 = base.find(c => c.id === 'WN-5');
    const chars = [...base.filter(c => c.id !== 'WN-5'), { ...w5, skills: [{ when: 'sell', do: 'permAtk', to: 'allAllies', v: [1, 2, 4] }] }], st = newRun(chars, 6);
    st.board[0][0] = { uid: 1, id: 'HL-1', level: 1, perm: {}, paid: 3 };
    st.board[1][0] = { uid: 2, id: 'WN-5', level: 2, perm: {}, paid: 15 };
    st.bench[0] = { uid: 3, id: 'PT-1', level: 1, perm: {}, paid: 3 };
    sell(st, { at: 'board', row: 1, lane: 0 }, chars);
    eq([st.board[0][0].perm.atk, st.bench[0].perm.atk], [2, undefined], 'พลังโจมตีถาวร');
  }],
  ['สกิลร้านค้า: รวมร่าง (ตัวทดสอบ) → เพื่อนหน้า/หลังเลนเดียวกันได้ช็อต · จบแมตช์ HL-4 · ชนะ PL-2', () => {
    const base = buildCharacterList(), s2 = base.find(c => c.id === 'SF-2');
    const p2 = base.find(c => c.id === 'PL-2'), h4 = base.find(c => c.id === 'HL-4'); // ตัวทดสอบตรึงสกิล PL-2 ไว้ที่ 1/3/6 และ HL-4 ไว้ที่ 20/40/80 ไม่ให้ผลตรวจเปลี่ยนตามค่าที่ผู้ใช้ปรับ (23 ต.ค.)
    const chars = [...base.filter(c => !['SF-2', 'PL-2', 'HL-4'].includes(c.id)), { ...s2, skills: [{ when: 'merge', do: 'permShock', to: 'frontBackAlly', v: [1, 1, 2] }] }, { ...p2, skills: [{ when: 'matchWin', do: 'permBurn', to: 'allAllies', v: [1, 3, 6] }] }, { ...h4, skills: [{ when: 'matchEnd', do: 'permArmor', to: 'frontAlly', v: [20, 40, 80] }] }];
    const st = newRun(chars, 7);
    const U = (uid, id, level = 1) => ({ uid, id, level, perm: {}, paid: 3 });
    st.board[0][0] = U(1, 'HL-1'); st.board[1][0] = U(2, 'SF-2'); st.board[2][0] = U(3, 'PT-1'); st.board[2][1] = U(4, 'PT-1');
    st.bench[0] = U(5, 'SF-2'); st.bench[1] = U(6, 'SF-2');
    move(st, { at: 'bench', i: 0 }, { at: 'board', row: 1, lane: 0 }, chars);
    eq([st.board[0][0].perm.shock, st.board[2][0].perm.shock, st.board[2][1].perm.shock], [1, 1, undefined], 'ช็อตหลังรวมร่าง');
    st.board[2][0] = U(7, 'HL-4');
    st.board[0][1] = U(8, 'PL-2');
    endMatch(st, false, chars);
    eq([st.board[1][0].perm.armor, st.board[0][0].perm.burn], [20, undefined], 'แพ้: HL-4 ทำงาน PL-2 ไม่ทำงาน');
    endMatch(st, true, chars);
    eq([st.board[1][0].perm.armor, st.board[0][0].perm.burn, st.board[0][1].perm.burn], [40, 1, 1], 'ชนะ: ทั้งคู่ทำงาน');
  }],
  ['run: หัวใจหมดหรือชนะครบแล้วจบ', () => {
    const chars = buildCharacterList(), st = newRun(chars, 8);
    for (let i = 0; i < RULES.shop.hearts; i++) endMatch(st, false, chars);
    ok(!st.over && st.hearts === 1 && st.sc === 1, 'set 119: hearts would hit 0 → second chance (+1 heart, once)');
    endMatch(st, false, chars);
    ok(st.over && st.hearts === 0 && !startRound(st, chars).ok, 'ควรจบเมื่อหัวใจหมด (หลังโอกาสสุดท้าย)');
    const w = newRun(chars, 8); for (let i = 0; i < RULES.shop.winsToFinish; i++) endMatch(w, true, chars);
    ok(w.over, 'ควรจบเมื่อชนะครบ');
  }],
  ['set 99: cleared run → extra matches with the hearts left · never ends by wins · ends when hearts run out', () => {
    const chars = buildCharacterList(), S = RULES.shop, w = newRun(chars, 8);
    ok(!continueExtra(w).ok, 'not cleared yet → refused');
    endMatch(w, false, chars); for (let i = 0; i < S.winsToFinish; i++) endMatch(w, true, chars);
    ok(w.over && !w.extra, 'cleared'); ok(continueExtra(w).ok && w.extra && !w.over, 'continue'); ok(!continueExtra(w).ok, 'only once');
    for (let i = 0; i < 5; i++) endMatch(w, true, chars);
    ok(!w.over && w.wins === S.winsToFinish + 5, 'extra wins do not end the run');
    while (w.hearts > 0) endMatch(w, false, chars);
    ok(w.over, 'hearts gone = game over');
    const z = newRun(chars, 9); for (let i = 0; i <= S.hearts; i++) endMatch(z, false, chars);
    ok(!continueExtra(z).ok, 'lost run cannot continue');
  }],
  ['set 99: boss counter · normal win +1 · boss fight resets it (win or lose) · boss win = next boss', () => {
    const chars = buildCharacterList(), st = newRun(chars, 3);
    endMatch(st, true, chars); endMatch(st, false, chars); endMatch(st, true, chars);
    eq([st.bw, st.bk], [2, 0], 'normal wins count, losses do not');
    endMatch(st, false, chars, RULES, [], true); eq([st.bw, st.bk], [0, 0], 'lost boss: counter restarts, same boss next time');
    endMatch(st, true, chars, RULES, [], true); eq([st.bw, st.bk], [0, 1], 'boss win: next boss');
  }],
  ['คำสั่งร้านค้ากันข้อมูลแปลกปลอม', () => {
    const chars = buildCharacterList(), st = newRun(chars, 10); startRound(st, chars);
    const before = JSON.stringify(st);
    for (const bad of [null, {}, { at: 'board', row: 9, lane: 0 }, { at: 'bench', i: -1 }, { at: 'bench', i: 1.5 }, { at: '__proto__' }, 'x'])
      { ok(!sell(st, bad, chars).ok, 'ขายต้องไม่ผ่าน'); ok(!move(st, bad, { at: 'bench', i: 0 }, chars).ok, 'ย้ายต้องไม่ผ่าน'); }
    for (const bad of [-1, 99, 'a', null, 1.2]) { ok(!buy(st, bad, null, chars).ok, 'ซื้อต้องไม่ผ่าน'); ok(!toggleLock(st, bad).ok, 'ล็อกต้องไม่ผ่าน'); }
    eq(JSON.stringify(st), before, 'สถานะต้องไม่เปลี่ยน');
  }],
  ['ประจุซื้อ (SF-7): ตัวเผ่าเดียวกันตัวถัดไปที่ซื้อได้ค่าถาวรตามเลเวลเจ้าของ · เก็บได้ทีละ 1 · ขายหมด = ประจุหาย · ช็อตถาวรไม่มีเพดาน', () => {
    const base = buildCharacterList(), t0 = base.find(c => c.tribe === 'สายฟ้า');
    const Q = { ...t0, id: 'QQ-1', skills: [{ when: 'buy', do: 'permShock', to: 'nextTribeBuy', v: [1, 2, 9] }] };
    const other = base.find(c => c.tribe === 'สายฟ้า' && c.id !== t0.id), stranger = base.find(c => c.tribe === 'เหล็กกล้า' && !c.extraTribes.includes('สายฟ้า'));
    const chars = [...base, Q], st = newRun(chars, 12); startRound(st, chars); st.gold = 100;
    const buyId = id => { st.shop[0].id = id; return buy(st, 0, null, chars); };
    buyId('QQ-1'); buyId('QQ-1');
    eq(st.charges.length, 1, 'ซื้อ 2 ใบ เก็บประจุ 1 อัน');
    eq(st.bench[1].perm.shock, 1, 'set 137: ตัวชนิดเดียวกันก็ใช้ประจุได้');
    buyId(stranger.id); eq(st.charges.length, 1, 'ต่างเผ่า ไม่ใช้ประจุ');
    st.bench[0].level = 3; st.bench[1] = null; // จำลองว่าเจ้าของรวมร่างเป็น Lv3
    buyId(other.id);
    eq([allUnits(st).find(x => x.u.id === other.id).u.perm.shock, st.charges.length], [9, 0], 'ได้ช็อตถาวร 9 (เกินเพดานเดิม 3) แล้วประจุหมด');
    buyId('QQ-1'); eq(st.charges.length, 1, 'ซื้อใหม่ได้ประจุใหม่');
    for (const x of allUnits(st).filter(y => y.u.id === 'QQ-1')) sell(st, x.ref, chars);
    eq(st.charges.length, 0, 'ขายหมด ประจุหาย');
    ok(validateTeam([u('SF-1', 0, 0, 1, { shock: 12 })], makeCharMap(base)).ok, 'ทีมที่มีช็อตถาวร 12 ต้องผ่าน');
  }],
  ['สกิลถาวร: ร้านค้าเก็บค่าหลังจบแมตช์ (แพ้ก็ได้) · ตรวจช่องและชนิด · เพดานตาม RULES (ชุด 27 ไม่มี) · ตัวตรวจค่ารับเฉพาะผลฝ่ายเรา', () => {
    const chars = buildCharacterList(), st = newRun(chars, 3); startRound(st, chars);
    st.board[0][0] = { uid: 99, id: 'HL-1', level: 1, perm: {}, paid: 3 };
    const g = (key, amount, id = 'HL-1', row = 0) => ({ side: 0, row, lane: 0, id, key, amount });
    const res = endMatch(st, false, chars, RULES, [g('atk', 5), g('multi', 3), g('atk', 4, 'PL-1'), g('hp', 7, 'HL-1', 1), g('evil', 9), g('armor', 1e9), g('shareArmor', 30)]);
    const cm = RULES.permCaps.multi; // ชุด 27: ไม่ผูกกับเพดานที่ตั้ง
    eq(st.board[0][0].perm, { atk: 5, multi: cm == null ? 3 : Math.min(cm, 3), shareArmor: 30 }, 'ได้ตอนแพ้ · มัลติฮิตตามเพดาน (ถ้ามี) · ชนิด/ช่องผิดไม่รับ');
    eq(st.hearts, RULES.shop.hearts - 1, 'แพ้ยังเสียหัวใจตามปกติ');
    ok(res.msgs.some(m => m.includes('จากสกิลระหว่างสู้')), 'แจ้งผู้เล่น');
    const t = buildTeam(teamEntries(st), makeCharMap(chars))[0];
    eq([t.atk, t.multi, t.shareArmor], [chars[0].atk[0] + 5, chars[0].multi[0] + (cm == null ? 3 : Math.min(cm, 3)), 30], 'แมตช์ถัดไปใช้ค่าถาวร');
    const base = mk('ZZ-1'), chk = sk => validateConfig([...chars, { ...base, skills: [sk] }]).errors.filter(e => e.startsWith('ZZ-1'));
    eq(chk({ when: 'selfDown', do: 'armor', to: 'backAlly', v: L3(5), perm: true }), [], 'ได้เกราะถาวรใช้ได้');
    ok(chk({ when: 'hit', do: 'burn', to: 'target', v: L3(5), perm: true }).length === 1, 'ติดไฟศัตรูตั้งถาวรไม่ได้');
    ok(chk({ when: 'matchWin', do: 'permAtk', to: 'self', v: L3(5), perm: true }).length === 1, 'สกิลร้านค้าไม่ต้องติ๊กถาวร');
  }],
];
