import { CTX_WHEN, DO_INFO, LEGACY_OF, RULES, SHARE_TO, SHOP_PAIR, WHEN_KIND, cleanTags } from '../core/rules.js';
import { BOSS_RULES, BOSS_PHASE_FX } from '../core/stage.js';
// คำอธิบายภาษาไทยของสกิล (ใช้แสดงผลเท่านั้น) · ใช้ร่วมกันทุกหน้า

export const WHEN_TH = {
  passive: 'ติดตัว', matchStart: 'เริ่มแมตช์', set: 'ทุกครั้งที่โจมตี (ชุด)', hit: 'ทุกฮิตที่ตีโดน', hits3: 'ชุดที่ตีโดนครบ 3 ฮิต',
  hitTaken: 'เมื่อโดนตี (จากศัตรูตัวไหนก็ได้)', get lowHp() { return RULES.lowHpPct === 50 ? 'HP ต่ำกว่าครึ่ง (ครั้งแรก)' : `HP ต่ำกว่า ${RULES.lowHpPct}% (ครั้งแรก)`; }, armorBreak: 'เกราะตัวเองแตก', selfDown: 'ตัวเองล้ม', allyDown: 'เพื่อนล้ม',
  enemyDown: 'ศัตรูล้ม', kill: 'ตัวเองทำศัตรูล้ม',
  buy: 'ร้านค้า: เมื่อซื้อตัวนี้', sell: 'ร้านค้า: เมื่อขายตัวนี้', merge: 'ร้านค้า: เมื่อรวมร่าง', matchEnd: 'หลังสู้: จบแมตช์ (แพ้หรือชนะ)',
  matchWin: 'หลังสู้: ชนะแมตช์', shopStart: 'ร้านค้า: อยู่บนบอร์ดตอนเริ่มรอบร้าน',
};
// [ชื่อ, หน่วยของค่า, ระยะเวลา] · หน่วย ms แสดงเป็นวินาที · หน่วย '-' = ไม่ใช้ค่า
// ระยะเวลา: '' = เกิดทันทีครั้งเดียว · 'match' = อยู่ถึงจบแมตช์นั้น (ระหว่างสู้) · 'perm' = ถาวรตลอด run (ติดตัวข้ามแมตช์)
export const DO_TH = {
  dmg: ['ดาเมจ', ''], dmgPctAtk: ['ดาเมจ % ของพลังโจมตีตัวเอง', '%'], armorBreakDmg: ['ดาเมจ % ของเกราะที่เสีย', '%'], reflect: ['สะท้อนดาเมจ % ของที่โดน', '%'], reflectOf: ['สะท้อนดาเมจ', '%'],
  counter: ['สวนกลับ', 'ฮิต'], counterMulti: ['สวนกลับเท่ามัลติฮิตตัวเอง', '-'],
  dmgPctArmor: ['ดาเมจ % ของเกราะตัวเอง', '%'], dmgPctEnemyBurn: ['ดาเมจ % ของไฟรวมบนศัตรูทุกตัว', '%'], execute: ['ทำให้ล้มทันที (ไม่สนเกราะ)', '-'],
  burn: ['ติดไฟ', ''], shock: ['ติดช็อต', ''], burnPctArmor: ['ติดไฟ % ของเกราะตัวเอง', '%'],
  freeze: ['แช่แข็ง: คูลดาวน์ที่เหลือ +', 'ms'], cdSlowPct: ['คูลดาวน์ช้าลง +', '%', 'match'], selfKo: ['ตัวเองล้มทันที', '-'], stun: ['มึนงง: หยุดนับคูลดาวน์', 'ms'],
  noDecay: ['ไฟบนเป้าไม่ลดลง', 'รอบ'], stealShock: ['ดูดช็อตจากเป้า มาเป็นช็อตต่อฮิตตัวเอง', '%', 'match'], spreadBurn: ['ไฟของตัวที่ล้มลามไป', '%'], moveShock: ['ช็อตของตัวที่ล้มส่งต่อ', '%'],
  maxHpCut: ['HP สูงสุด −', '%', 'match'],
  armor: ['ได้เกราะ', ''], armorPct: ['ได้เกราะ % ของ HP สูงสุด', '%'], heal: ['ฟื้น HP', ''], healPct: ['ฟื้น HP % ของ HP สูงสุด', '%'], revive: ['ลุกกลับมา HP', '%'],
  reviveAlly: ['ชุบเพื่อนที่ล้ม (HP 20%)', 'ครั้ง/แมตช์'], summon: ['เรียกตัวละครมาสู้แทน (เลเวลเดียวกัน ช่องเดิม)', '-'], lifesteal: ['ดูดเลือด: ฟื้น HP % ของดาเมจที่ฮิตนั้นทำ (รวมช็อตที่แตก)', '%'],
  cleanse: ['ล้าง ไฟ ช็อต แช่แข็ง มึนงง', '-'],
  cleansePct: ['ล้างไฟ/ช็อต', '%'], reviveDowned: ['ชุบเพื่อนที่ล้มอยู่ (สุ่ม · HP 20%)', 'ตัว'], allyStrike: ['พาเพื่อนไปตีเป้าเดียวกัน', 'ฮิต'], reflectDebuff: ['สะท้อน ไฟ/ช็อต/คูลดาวน์ช้าลง กลับไปหาศัตรูที่ใส่', '%', 'match'], // ชุด 20
  eatAllyBurn: ['ดับไฟบนเพื่อนทั้งทีม ได้พลังโจมตี % ของไฟที่ดับ', '%', 'match'],
  shareArmor: ['แบ่งเกราะที่ตัวเองได้', '%', 'match'],
  healToAtk: ['ฟื้น HP ให้ใคร ตัวเองได้พลังโจมตี % ของที่ฟื้น', '%', 'match'],
  cdCut: ['ลดคูลดาวน์ที่เหลือ', 'ms'], cdPct: ['คูลดาวน์ −', '%', 'match'], atkUp: ['พลังโจมตี +', '', 'match'], atkPct: ['พลังโจมตี +', '%', 'match'], hpUp: ['HP สูงสุด +', '', 'match'],
  multiUp: ['มัลติฮิต +', '', 'match'], burnHitUp: ['ไฟต่อฮิต +', '', 'match'], shockHitUp: ['ช็อตต่อฮิต +', '', 'match'], burnNoDecay: ['ไฟที่ตัวนี้ติดให้ไม่ลดลง', '-', 'match'],
  armorAmp: ['เกราะที่ได้รับ +', '%', 'match'], cdAmp: ['ผลลดคูลดาวน์ที่ได้รับ +', '%', 'match'], shockAmp: ['ดาเมจช็อตที่ตัวนี้ทำ +', '%', 'match'],
  extraHit: ['ฮิตเพิ่ม (เฉพาะชุดนั้น)', 'ฮิต'], spread: ['ฮิตกระจายคนละตัว (เฉพาะชุดนั้น)', '-'], retarget: ['เปลี่ยนไปตีตัวนี้แทน (เฉพาะชุดนั้น)', '-'], splitAll: ['ตีศัตรูทุกตัวพร้อมกัน แบ่งค่าเท่ากัน (เฉพาะชุดนั้น)', '-'],
  permHp: ['HP +', '', 'perm'], permAtk: ['พลังโจมตี +', '', 'perm'], permArmor: ['เกราะสะสม +', '', 'perm'], permBurn: ['ไฟต่อฮิต +', '', 'perm'],
  permShock: ['ช็อตต่อฮิต +', '', 'perm'], permMulti: ['มัลติฮิต +', '', 'perm'], permCdPct: ['คูลดาวน์ −', '%', 'perm'],
  // ชุด 6 (22 ต.ค.)
  hpPct: ['HP สูงสุด +', '%', 'match'], armorHitUp: ['เกราะ/ฮิต +', '', 'match'], healHitUp: ['ฟื้น/ฮิต +', '', 'match'], armorHitPct: ['เกราะ/ฮิต +', '%', 'match'],
  burnHitPct: ['ไฟต่อฮิต +', '%', 'match'], shockHitPct: ['ช็อตต่อฮิต +', '%', 'match'], cdMsDown: ['คูลดาวน์ −', 'ms', 'match'],
  healAmp: ['ฟื้น HP ที่ได้รับ +', '%', 'match'], hitAmp: ['ดาเมจตีที่ทำ +', '%', 'match'], burnAmp: ['ไฟที่ทำให้ติด +', '%', 'match'],
  dmgOf: ['ดาเมจ', '%'], burnOf: ['ติดไฟ', '%'], shockOf: ['ติดช็อต', '%'], armorOf: ['ได้เกราะ', '%'], healOf: ['ฟื้น HP', '%'],
  atkOf: ['พลังโจมตี +', '%', 'match'], hpOf: ['HP สูงสุด +', '%', 'match'], burnHitOf: ['ไฟต่อฮิต +', '%', 'match'], shockHitOf: ['ช็อตต่อฮิต +', '%', 'match'], armorHitOf: ['เกราะ/ฮิต +', '%', 'match'], // ชุด 9 // ชุด 7: % ของ ค่า ของ ใคร
  burnTakenUp: ['ดาเมจไฟที่โดน +', '%', 'match'], shockTakenUp: ['ดาเมจช็อตที่โดน +', '%', 'match'], dmgTakenUp: ['ดาเมจตีที่โดน +', '%', 'match'],
  armorGainCut: ['เกราะที่ได้รับ −', '%', 'match'], healCut: ['ฟื้น HP ที่ได้รับ −', '%', 'match'],
};
// สกิลหลังสู้/ร้านค้าที่สร้างอัตโนมัติ (perm_*) ใช้ชื่อเดียวกับผลระหว่างสู้ที่คู่กัน
for (const [d, b] of Object.entries(SHOP_PAIR)) if (!DO_TH[d] && DO_TH[b]) DO_TH[d] = [DO_TH[b][0], DO_TH[b][1], 'perm'];
// ตัวเลือก "ทำ" แบบรวม (ชุด 6): ผลระหว่างสู้กับผลหลังสู้/ร้านค้าที่ให้ค่าเดียวกันเป็นตัวเลือกเดียว ระยะเวลาเลือกแยก
export const BATTLE_OF = Object.fromEntries(Object.entries(SHOP_PAIR).map(([s, b]) => [s, b])); // ผลร้านค้า → ผลระหว่างสู้
export const SHOP_OF = Object.fromEntries(Object.entries(SHOP_PAIR).map(([s, b]) => [b, s]));   // ผลระหว่างสู้ → ผลร้านค้า
export const DUR_TH = { match: 'ระหว่างสู้', perm: 'ถาวร ตลอด run' };
// ป้ายระยะเวลา (สั้น ใช้บนแท็ก): ทันที / ระหว่างสู้ / ถาวร
export const DUR_TAG = { now: 'ทันที', match: 'ระหว่างสู้', perm: 'ถาวร' };
export const durOf = d => (DO_TH[d] || [])[2] || 'now';
// ระยะเวลาของสกิลทั้งอัน: ร้านค้า หรือสกิลระหว่างสู้ที่ติ๊กถาวร (s.perm · 22 ต.ค.) = ถาวร
export const skillDur = s => (s && (s.perm || isShopWhen(s.when)) ? 'perm' : durOf(s && s.do));
// หมวดของผล (ใช้จัดกลุ่มในตัวเลือก "ทำ" ของห้องบาลานซ์) · ลำดับตามที่แสดง
// ชุด 8 (22 ต.ค.): จัดตามเป้าหมายของผล (ผู้ใช้เลือก) แทนการจัดตามค่าพลัง
export const DO_GROUPS = [
  ['โจมตี (ดาเมจ ไฟ ช็อต ใส่ศัตรู)', ['dmg', 'dmgOf', 'armorBreakDmg', 'reflect', 'reflectOf', 'counter', 'counterMulti', 'execute', 'selfKo', 'burn', 'burnOf', 'shock', 'shockOf', 'noDecay', 'spreadBurn', 'moveShock']],
  ['ป้องกัน (เกราะ)', ['armor', 'armorOf', 'shareArmor', 'armorHitUp', 'armorHitPct', 'armorHitOf', 'armorAmp']],
  ['ฟื้น · ลุก · ชุบ', ['heal', 'healOf', 'healHitUp', 'lifesteal', 'healAmp', 'revive', 'reviveAlly', 'reviveDowned', 'cleanse', 'cleansePct', 'reflectDebuff']],
  ['เสริมพลัง (ตัวเอง / เพื่อน)', ['hpUp', 'hpPct', 'hpOf', 'atkUp', 'atkPct', 'atkOf', 'hitAmp', 'multiUp', 'cdPct', 'cdMsDown', 'cdCut', 'cdAmp', 'burnHitUp', 'burnHitPct', 'burnHitOf', 'burnAmp', 'burnNoDecay', 'shockHitUp', 'shockHitPct', 'shockHitOf', 'shockAmp', 'eatAllyBurn', 'healToAtk']],
  ['ลดพลังศัตรู', ['freeze', 'cdSlowPct', 'stun', 'stealShock', 'maxHpCut', 'burnTakenUp', 'shockTakenUp', 'dmgTakenUp', 'armorGainCut', 'healCut']],
  ['พิเศษ (เรียกตัว · ปรับการโจมตีชุดนั้น)', ['summon', 'allyStrike', 'extraHit', 'spread', 'retarget', 'splitAll']],
];
// คำอธิบาย 1 บรรทัดใต้ช่อง "ทำ" (ชุด 8)
export const DO_HELP = {
  dmg: 'ทำดาเมจเป็นตัวเลขตายตัว (โดนเกราะกัน)', dmgOf: 'ทำดาเมจเท่ากับ % ของค่าที่เลือกด้านล่าง (โดนเกราะกัน)',
  armorBreakDmg: 'เกราะแตกแล้ว ทำดาเมจ % ของเกราะที่เสียไป', reflect: 'โดนตีแล้ว สะท้อนดาเมจกลับ % ของดาเมจที่โดน', reflectOf: 'โดนตีแล้ว สะท้อนดาเมจกลับ % ของค่าที่เลือก เช่น เกราะของตัวนี้ (ไม่ขึ้นกับดาเมจที่โดน)', counter: 'ตีสวนกลับทันทีตามจำนวนฮิต',
  counterMulti: 'ตีสวนกลับเท่ามัลติฮิตของตัวเอง', execute: 'ทำให้ล้มทันที ไม่สนเกราะและ HP',
  burn: 'ติดไฟเป็นตัวเลข · ไฟทำดาเมจทุก 1 วิแล้วลดลง', burnOf: 'ติดไฟเท่ากับ % ของค่าที่เลือกด้านล่าง', shock: 'ติดช็อต · ทุกฮิตที่โดนได้ดาเมจเพิ่มเข้า HP ตรง',
  shockOf: 'ติดช็อตเท่ากับ % ของค่าที่เลือกด้านล่าง', noDecay: 'ไฟบนเป้าหมายไม่ลดลงชั่วคราว (นับเป็นรอบ)', spreadBurn: 'ตัวที่ล้มแล้ว ไฟของมันลามไปตัวอื่น %',
  moveShock: 'ตัวที่ล้มแล้ว ช็อตของมันส่งต่อไปตัวอื่น %',
  armor: 'ได้เกราะเป็นตัวเลข · อยู่จนโดนตีหมด', armorOf: 'ได้เกราะเท่ากับ % ของค่าที่เลือกด้านล่าง',
  shareArmor: 'ทุกครั้งที่ตัวนี้ได้เกราะ ผู้รับได้เกราะเพิ่ม % ของจำนวนที่ตัวนี้ได้ (เกราะที่ได้จากการแบ่งไม่แบ่งต่อ)',
  armorHitUp: 'เพิ่มเกราะ/ฮิต (ทุกฮิตที่ตีโดนได้เกราะ) เป็นตัวเลข', healHitUp: 'เพิ่มฟื้น/ฮิต (ทุกฮิตที่ตีโดนฟื้น HP ตัวเอง) เป็นตัวเลข', armorHitPct: 'เพิ่มเกราะ/ฮิต เป็น %', armorAmp: 'เกราะที่ได้รับทุกทางมากขึ้น %',
  heal: 'ฟื้น HP เป็นตัวเลข (ไม่เกิน HP สูงสุด)', healOf: 'ฟื้น HP เท่ากับ % ของค่าที่เลือกด้านล่าง', lifesteal: 'ฟื้น HP ตัวเอง % ของดาเมจที่ฮิตนั้นทำ (รวมช็อตที่แตกบนเป้า)',
  healAmp: 'การฟื้น HP ที่ได้รับมากขึ้น %', revive: 'ล้มแล้วลุกกลับมาด้วย HP % ของ HP สูงสุด', reviveAlly: 'ชุบเพื่อนที่ล้มกลับมา (HP 20%) ได้กี่ครั้งต่อแมตช์',
  cleanse: 'ล้างไฟ ช็อต แช่แข็ง มึนงง ออกหมด',
  reviveDowned: 'ชุบเพื่อนที่ล้มไปแล้ว สุ่มกี่ตัว ฟื้นด้วย HP 20% · ไม่จำกัดครั้ง ควรใส่คูลดาวน์สกิล · ไม่ชุบตัวที่ถูกเรียกมาสู้แทน',
  cleansePct: 'ล้างไฟและช็อต % ของที่มี (ปัดลง) · ไม่แตะแช่แข็ง/มึนงง',
  allyStrike: 'ตีโดนแล้ว ผู้รับตีเป้าเดียวกันทันทีกี่ฮิต · นับเป็นฮิตปกติของเพื่อน (ไฟ/ช็อต/เกราะ/ฟื้นต่อฮิต สกิลตีโดน) · ไม่นับโบนัสเผ่าฮิตแรก · ฮิตที่ถูกพาไปไม่พาต่อ',
  reflectDebuff: 'ผู้รับโดนศัตรูใส่ไฟ/ช็อต/คูลดาวน์ช้าลง → ศัตรูที่ใส่โดนกลับ % (ผู้รับยังโดนเต็ม · ระหว่างตัวนี้ยังยืนอยู่ · รวมทุกตัวไม่เกิน 100%)',
  atkOf: 'เพิ่มพลังโจมตี = % ของค่าที่เลือกด้านล่าง (คิดตอนสกิลทำงานแล้วบวกค้างไว้)', hpOf: 'เพิ่ม HP สูงสุด = % ของค่าที่เลือกด้านล่าง (คิดตอนสกิลทำงาน)',
  burnHitOf: 'เพิ่มไฟต่อฮิต = % ของค่าที่เลือกด้านล่าง (คิดตอนสกิลทำงาน)', shockHitOf: 'เพิ่มช็อตต่อฮิต = % ของค่าที่เลือกด้านล่าง (คิดตอนสกิลทำงาน)',
  armorHitOf: 'เพิ่มเกราะ/ฮิต = % ของค่าที่เลือกด้านล่าง (คิดตอนสกิลทำงาน)',
  hpUp: 'เพิ่ม HP สูงสุดเป็นตัวเลข', hpPct: 'เพิ่ม HP สูงสุดเป็น %', atkUp: 'เพิ่มพลังโจมตีเป็นตัวเลข', atkPct: 'เพิ่มพลังโจมตีเป็น %', hitAmp: 'ดาเมจตีที่ทำมากขึ้น %',
  multiUp: 'เพิ่มจำนวนฮิตต่อชุด', cdPct: 'คูลดาวน์สั้นลง % (ตีถี่ขึ้น)', cdMsDown: 'คูลดาวน์สั้นลงเป็นวินาที', cdCut: 'ลดคูลดาวน์ที่เหลือตอนนั้น (ตีชุดถัดไปเร็วขึ้นครั้งเดียว)',
  cdAmp: 'ผลลดคูลดาวน์ที่ได้รับแรงขึ้น %', burnHitUp: 'เพิ่มไฟต่อฮิตเป็นตัวเลข', burnHitPct: 'เพิ่มไฟต่อฮิตเป็น %', burnAmp: 'ไฟที่ทำให้ศัตรูติดมากขึ้น %',
  burnNoDecay: 'ไฟที่ตัวนี้ทำให้ติดไม่ลดลง', shockHitUp: 'เพิ่มช็อตต่อฮิตเป็นตัวเลข', shockHitPct: 'เพิ่มช็อตต่อฮิตเป็น %', shockAmp: 'ดาเมจช็อตที่ตัวนี้ทำแรงขึ้น %',
  eatAllyBurn: 'ดับไฟบนเพื่อนทั้งทีม แล้วตัวนี้ได้พลังโจมตี % ของไฟที่ดับ', healToAtk: 'ทุกครั้งที่ตัวนี้ฟื้น HP ให้ใคร ตัวนี้ได้พลังโจมตี % ของที่ฟื้น',
  cdSlowPct: 'คูลดาวน์ช้าลง % ถึงจบแมตช์ (ซ้อนกันได้ · ใส่ศัตรูหรือตัวเองก็ได้ · ล้างไม่ได้)', selfKo: 'ตัวเองล้มทันทีตอนเริ่มแมตช์ · ผลตอนล้มและเพื่อนล้มทำงาน · ถูกชุบ/ลุกได้ แต่ผลเริ่มแมตช์ไม่ทำซ้ำ',
  freeze: 'แช่แข็ง: คูลดาวน์ที่เหลือของเป้าหมายนานขึ้น', stun: 'มึนงง: เป้าหมายหยุดนับคูลดาวน์ชั่วคราว', stealShock: 'ดูดช็อตจากเป้าหมาย มาเป็นช็อตต่อฮิตของตัวนี้',
  maxHpCut: 'ลด HP สูงสุดของศัตรู %', burnTakenUp: 'ศัตรูโดนดาเมจไฟแรงขึ้น %', shockTakenUp: 'ศัตรูโดนดาเมจช็อตแรงขึ้น %', dmgTakenUp: 'ศัตรูโดนดาเมจตีแรงขึ้น %',
  armorGainCut: 'ศัตรูได้เกราะน้อยลง %', healCut: 'ศัตรูฟื้น HP ได้น้อยลง %',
  summon: 'ล้มจริงแล้ว เรียกตัวที่เลือกมาสู้แทนในช่องเดิม', extraHit: 'ชุดนี้ตีเพิ่มกี่ฮิต', spread: 'ฮิตในชุดนี้กระจายตีคนละตัว',
  retarget: 'ชุดนี้เปลี่ยนไปตีตัวที่เลือกแทน', splitAll: 'ชุดนี้ตีศัตรูทุกตัวพร้อมกัน แบ่งดาเมจเท่ากัน',
};
export const DUR_HELP = {
  now: 'ทันที: ได้ผลเป็นก้อนทุกครั้งที่สกิลทำงาน ไม่เปลี่ยนค่าพลัง (เกราะอยู่จนโดนตีหมด ไฟลดลงเอง)',
  match: 'ระหว่างสู้: อยู่ถึงจบแมตช์นี้ แมตช์ถัดไปหายไป',
  perm: 'ถาวร: ติดตัวข้ามแมตช์จนจบ run · มาจากสกิลร้านค้า หรือสกิลระหว่างสู้ที่ตั้งเป็นถาวร (ผลเกิดทันทีในแมตช์นั้นด้วย · ได้ทั้งแพ้และชนะ) · ไม่มีเพดาน (คูลดาวน์ไม่ต่ำกว่าขั้นต่ำของระบบ)',
};
// ชุด 14: ชื่อผู้รับ รวมตำแหน่ง (allyAt) และ "เผ่าเดียวกัน"
export const AT_ROW_TH = { front: 'แถวหน้า', mid: 'แถวกลาง', back: 'แถวหลัง', any: 'ทุกแถว' };
export const AT_LANE_TH = { same: 'เลนเดียวกัน', other: 'อีกเลน', both: 'ทั้ง 2 เลน' };
export function toTh(s) {
  let t = s.to === 'allyAt' && s.at ? (s.at.row === 'any' && s.at.lane === 'both' ? 'เพื่อนทุกตัว (ไม่รวมตัวเอง)' : `เพื่อน${AT_ROW_TH[s.at.row] || ''} ${AT_LANE_TH[s.at.lane] || ''}`) : (TO_TH[s.to] || s.to);
  if (s.sameTribe) t += ' (เฉพาะเผ่าเดียวกัน)';
  if (s.skipSameId) t += ' (ไม่รวมตัวอื่นที่ชนิดเดียวกับตัวนี้)';
  return t;
}
export const TO_TH = {
  self: 'ตัวเอง', target: 'เป้าหมาย', attacker: 'ผู้ตี (ตัวที่เพิ่งตีเรา)', enemyFront: 'ศัตรูตรงหน้า (ตัวหน้าสุดในเลนเดียวกัน)', enemyMidRow: 'ศัตรูแถวกลาง (เลนเดียวกัน · ไม่มี = ไม่มีผล)', enemyBackRow: 'ศัตรูแถวหลัง (เลนเดียวกัน · ไม่มี = ไม่มีผล)', enemyLane: 'ศัตรูทั้งเลนเดียวกับตัวเอง (เลนว่าง = ไม่มีผล)', enemyFrontRow: 'ศัตรูแถวหน้า (ทั้ง 2 เลน)', lowestHp: 'ศัตรู HP ต่ำสุด',
  enemyRandom: 'ศัตรูสุ่ม 1 ตัว', allEnemies: 'ศัตรูทุกตัว', frontAlly: 'เพื่อนข้างหน้า', backAlly: 'เพื่อนข้างหลัง (ช่องติดกัน)', frontBackAlly: 'เพื่อนหน้าและหลัง',
  allyAt: 'เพื่อนตามตำแหน่ง (เลือกแถว × เลน)', frontLaneAlly: 'เพื่อนแถวหน้าเลนเดียวกัน', backLaneAlly: 'เพื่อนข้างหลังเลนเดียวกัน (ตัวใกล้สุด ข้ามช่องว่าง · ไม่มี = ไม่มีผล)', frontRowAllies: 'เพื่อนแถวหน้า', backRowAllies: 'เพื่อนแถวหลัง', allyLowest: 'เพื่อน HP ต่ำสุด',
  allyRandom: 'เพื่อนสุ่ม 1 ตัว', allyRandom2: 'เพื่อนสุ่ม 2 ตัว', tribeAllies: 'เพื่อนเผ่าเดียวกัน', nextTribeBuy: 'ตัวเผ่าเดียวกันตัวถัดไปที่ซื้อ (รวมตัวเดียวกัน)', allAllies: 'ทั้งทีม',
};
export const GIVE_TH = { hp: 'HP', atk: 'พลังโจมตี', armor: 'เกราะสะสม', burn: 'ไฟ/ฮิต', shock: 'ช็อต/ฮิต', multi: 'มัลติฮิต', cdPct: 'คูลดาวน์ −%',
  healHit: 'ฟื้น/ฮิต', armorHit: 'เกราะ/ฮิต', cdMs: 'คูลดาวน์ −', hpPct: 'HP +%', atkPct: 'พลังโจมตี +%', burnPct: 'ไฟ/ฮิต +%', shockPct: 'ช็อต/ฮิต +%', armorHitPct: 'เกราะ/ฮิต +%',
  healAmp: 'ฟื้น HP ที่ได้รับ +%', hitAmp: 'ดาเมจตี +%', burnAmp: 'ไฟที่ทำให้ติด +%',
  cdStart: 'เริ่มแมตช์ลดคูลดาวน์', shareArmor: 'แบ่งเกราะให้ทั้งทีม %', healToAtk: 'ฟื้นเป็นพลัง %', armorAmp: 'เกราะที่ได้รับ +%', cdAmp: 'ผลลดคูลดาวน์ที่ได้รับ +%', shockAmp: 'ดาเมจช็อต +%', burnNoDecay: 'ไฟที่ติดไม่ลด' };
// ข้อความค่าถาวร 1 ชนิด เช่น "พลังโจมตี +4" · "เริ่มแมตช์ลดคูลดาวน์ 1.5 วิ" · "ไฟที่ติดไม่ลด"
export const permText = (k, v) => (k === 'burnNoDecay' ? GIVE_TH[k] : k === 'cdStart' || k === 'cdMs' ? `${GIVE_TH[k]} ${v / 1000} วิ` : `${GIVE_TH[k] || k} +${v}`);
for (const t of SHARE_TO) GIVE_TH['share_' + t] = `แบ่งเกราะให้${TO_TH[t]} %`; // ชุด 7
export const permKeyOf = s => (s.do === 'shareArmor' && s.to !== 'allAllies' && s.to !== 'self' ? 'share_' + s.to : DO_INFO[s.do] && DO_INFO[s.do].perm);
export const PERM_TH = GIVE_TH;
export const rowHintTh = h => String(h || '').replace(/\+/g, ' + '); // "กลาง+หลัง" → "กลาง + หลัง"
export const isShopWhen = w => ['buy', 'sell', 'merge', 'matchEnd', 'matchWin', 'shopStart'].includes(w);

// คำศัพท์ (ห้องบาลานซ์แสดงเป็นอภิธานศัพท์)
export const GLOSSARY = [
  ['ชุด', 'การโจมตี 1 ครั้งเมื่อคูลดาวน์ครบ · 1 ชุดมีหลายฮิตได้ (มัลติฮิต)'],
  ['ฮิต', 'การตี 1 ทีในชุด · มัลติฮิต 3 = ชุดละ 3 ฮิต'],
  ['คูลดาวน์', 'เวลารอระหว่างชุด (วินาที) ของตัวละคร'],
  ['คูลดาวน์สกิล', 'สกิลนั้นใช้ได้อีกครั้งหลังผ่านไปกี่วินาที · เริ่มนับตั้งแต่เริ่มแมตช์ จึงใช้ครั้งแรกได้เมื่อครบเวลานั้น · นับตามเวลาจริง ไม่ช้าลงเพราะมึนงง/แช่แข็ง และไม่เร็วขึ้นเพราะลดคูลดาวน์'],
  ['เฉพาะ Lv', 'สกิลที่ทำงานเฉพาะเลเวลที่ระบุ · ตัวเดียวมีสกิลต่างกันตามเลเวลได้'],
  ['ระหว่างสู้', 'ผลอยู่ถึงจบแมตช์นั้นแล้วหายไป · แมตช์ถัดไปเริ่มใหม่'],
  ['ถาวร ตลอด run', 'ค่าติดตัวข้ามแมตช์จนจบ run · มาจากสกิลร้านค้า หรือสกิลระหว่างสู้ที่ตั้งเป็นถาวร (ผลเกิดทันทีในแมตช์นั้น แล้วเก็บไว้ทุกครั้งที่ทำงาน ได้ทั้งแพ้และชนะ) · ผลที่ใส่ศัตรูตั้งถาวรไม่ได้ · ทุกค่าไม่มีเพดาน (คูลดาวน์ไม่ต่ำกว่าขั้นต่ำของระบบ)'],
  ['ทันที', 'ทุกครั้งที่สกิลทำงาน ได้ผลเป็นก้อน (ดาเมจ ฟื้น HP ได้เกราะ ติดไฟ ฯลฯ) · ความถี่ขึ้นกับช่อง "เมื่อ" · ต่างจาก "ระหว่างสู้" ที่เพิ่มค่าพลังค้างไว้จนจบแมตช์'],
  ['ไฟ', 'ทำดาเมจทุก 1 วิ เท่าจำนวนไฟ แล้วไฟลดลง · โดนเกราะกัน'],
  ['ช็อต', 'ทุกฮิตที่โดน ได้ดาเมจเพิ่มเท่าจำนวนช็อต เข้า HP ตรง ไม่โดนเกราะ'],
  ['เกราะ', 'กันดาเมจก่อน HP · อยู่จนกว่าจะโดนตีหมด (ภายในแมตช์นั้น)'],
  ['เกราะ/ฮิต', 'ค่าติดตัวของตัวละคร · ทุกฮิตที่ตีโดน ตัวเองได้เกราะเท่านี้ · ได้หลังดาเมจ จึงไม่กันฮิตที่มาใน tick เดียวกัน · เริ่มแมตช์ด้วยเกราะ 0'],
  ['เกราะสะสม', 'ค่าถาวรจากสกิลร้านค้า (เช่น HL-4 HL-5) · ได้เกราะเท่านี้ทุกครั้งที่เริ่มแมตช์ · สะสมได้ไม่เกิน +100 ต่อตัว · คนละอย่างกับช่องเกราะเริ่มบนตัวละครที่เอาออกแล้ว'],
  ['แช่แข็ง', 'เพิ่มคูลดาวน์ที่เหลือของเป้า · หมดผลเมื่อเป้าโจมตีชุดถัดไป'],
  ['มึนงง', 'หยุดนับคูลดาวน์ชั่วคราว'],
  ['ติดตัว', 'ทำงานครั้งเดียวก่อนเริ่มแมตช์ ใช้ตั้งค่าที่อยู่ทั้งแมตช์'],
  ['ล้ม', 'HP ถึง 0 ออกจากการต่อสู้ (อาจลุกกลับมาหรือถูกชุบได้)'],
  ['ศัตรูแถวหลัง', 'ศัตรูที่ยืนแถวหลังสุด (แถวที่ 3) ในเลนเดียวกับตัวเองเท่านั้น · ไม่มี = สกิลไม่มีผล (ไม่ย้ายเลน ไม่ใช่ "แถวถัดไป")'],
  ['ศัตรูแถวกลาง', 'ศัตรูแถวกลาง (แถวที่ 2) ในเลนเดียวกันเท่านั้น · ไม่มี = สกิลไม่มีผล · สกิลเปลี่ยนเป้า (WY-2) ไม่มีเป้า = ตีเป้าปกติ'],
  ['ศัตรูทั้งเลน', 'ศัตรูทุกตัวในเลนเดียวกับตัวเอง (หน้า กลาง หลัง) · เลนนั้นหมดแล้ว = สกิลไม่มีผล (ไม่ย้ายเลน)'],
  ['เรียกตัวมาสู้แทน', 'ล้มจริงแล้ว ตัวที่ระบุลงช่องเดิม เลเวลเดียวกัน · ไม่นับเผ่า ไม่ได้โบนัสเผ่า ไม่มีค่าถาวร · ถูกชุบ/ลุกกลับมา = ไม่เรียก'],
  ['ประจุ (ตัวถัดไปที่ซื้อ)', 'ซื้อตัวนี้แล้วเก็บประจุไว้ · ตัวเผ่าเดียวกันตัวถัดไปที่ซื้อ (นับตัวชนิดเดียวกันด้วย) ได้ค่าถาวรตามเลเวลของตัวนี้ตอนนั้น · เก็บได้ทีละ 1 · ขายหมดแล้วประจุหาย'],
];

export const fmtVal = (unit, x) => (unit === 'ms' ? `${x / 1000} วิ` : unit === '%' ? `${x}%` : unit === 'ฮิต' || unit === 'รอบ' || unit === 'ตัว' || unit === 'ครั้ง/แมตช์' ? `${x} ${unit}` : `${x}`);
export const lvText = lv => (lv.length === 1 ? `Lv${lv[0]}` : `Lv${[...lv].sort().join('/')}`);
// แท็กของสกิล: แท็กหลัก (อัตโนมัติจาก "เมื่อ") ตามด้วยแท็กเพิ่มที่ผู้ใช้ตั้ง · สร้างด้วย textContent เท่านั้น
export const KIND_CLASS = { 'เริ่มแมตช์': 'k-start', 'ต่อเนื่อง': 'k-ongoing', 'ครั้งเดียว': 'k-once', 'ตอนล้ม': 'k-down', 'หลังสู้/ร้านค้า': 'k-shop', 'ร้านค้า': 'k-shop' };
export function skillTags(s) {
  const box = document.createElement('span'); box.className = 'tags';
  const kind = WHEN_KIND[s.when];
  if (kind) { const t = document.createElement('span'); t.className = 'tag ' + (KIND_CLASS[kind] || ''); t.textContent = kind; box.append(t); }
  { const d = skillDur(s), t = document.createElement('span'); t.className = 'tag d-' + d; t.textContent = DUR_TAG[d]; t.title = DUR_HELP[d]; box.append(t); }
  for (const x of cleanTags(s.tags)) { const t = document.createElement('span'); t.className = 'tag t-own'; t.textContent = x; box.append(t); }
  return box;
}
// ประโยคเดียวอ่านจบ เช่น "ทุกครั้งที่โจมตี (ชุด) → ตัวเอง: พลังโจมตี +5/10/20 [ระหว่างสู้] (คูลดาวน์สกิล 9 วิ)"
// withDur = ต่อ [ระหว่างสู้]/[ถาวร] ท้ายประโยค (ใช้กับข้อความล้วน เช่น CSV บันทึก) · หน้าที่มีแท็กใช้แท็กแทน
export const EXTRA_DMG = new Set(['dmg', 'dmgPctAtk', 'dmgPctArmor', 'dmgPctEnemyBurn', 'dmgOf']);
// ผลแบบ % ของ (ชุด 7): ชื่อค่าและเจ้าของค่า · ctx = เป้าหมาย/ผู้ตี ตามเงื่อนไข
export const STAT_TH = { atk: 'พลังโจมตี', armor: 'เกราะ', maxHp: 'HP สูงสุด', hp: 'HP ที่เหลือ', hpLost: 'HP ที่เสียไป', burn: 'ไฟที่ติด', shock: 'ช็อตที่ติด', healHit: 'ฟื้น/ฮิต' };
export const WHO_TH = { self: 'ตัวนี้ (ผู้ถือสกิล)', each: 'ตัวที่ได้รับผลเอง (คิดแยกทีละตัว)', ctx: 'เป้าหมาย / ผู้ตี', allEnemies: 'ศัตรูทุกตัวรวมกัน', allAllies: 'เพื่อนทุกตัวรวมกัน (รวมตัวเอง)', laneEnemies: 'ศัตรูเลนเดียวกันรวมกัน', rowEnemies: 'ศัตรูแถวเดียวกับตัวนี้รวมกัน (ทั้ง 2 เลน)', laneAllies: 'เพื่อนเลนเดียวกันรวมกัน (รวมตัวเอง)', rowAllies: 'เพื่อนแถวเดียวกันรวมกัน (รวมตัวเอง · ทั้ง 2 เลน)' };
export const whoTh = (who, when) => (who === 'ctx' ? (CTX_WHEN[when] === 'attacker' ? 'ผู้ตี' : 'เป้าหมาย') : who === 'each' ? 'ตัวที่ได้รับผลเอง' : who === 'self' ? 'ตัวนี้' : WHO_TH[who] || who);
export const isLegacyDo = d => Object.prototype.hasOwnProperty.call(LEGACY_OF, d);
export function skillLine(s, level, withDur = false) {
  if (!s) return '';
  const [name, unit, dur0] = DO_TH[s.do] || [s.do, ''];
  const dur = s.perm ? 'perm' : dur0;
  // ค่าแต่ละเลเวลเขียนครั้งเดียวแล้วต่อหน่วยท้าย เช่น "20 / 30 / 40%" · สกิลเฉพาะเลเวลแสดงเฉพาะค่าของเลเวลนั้น
  const vals = valsText(s, unit, level);
  // คำว่า "ร้านค้า:" ไม่ซ้ำในประโยค เพราะแท็กหลักบอกแล้ว
  const when = (WHEN_TH[s.when] || s.when).replace(/^(ร้านค้า|หลังสู้): /, '');
  const extra = extraText(s);
  const sep = name.endsWith('+') || name.endsWith('−') ? '' : ' ';
  // ดาเมจจากสกิลที่ทำงานตอนตี: บอกชัดว่าเป็นดาเมจเพิ่ม บวกจากดาเมจตีปกติ
  const onAttack = ['hit', 'set', 'hits3'].includes(s.when) && EXTRA_DMG.has(s.do);
  const nm = onAttack ? name.replace(/^ดาเมจ/, '+ ดาเมจเพิ่ม') : name;
  const nm2 = s.do === 'summon' && s.summon ? `${nm.replace(/ \(.*$/, '')} ${s.summon} (เลเวลเดียวกัน ช่องเดิม)` : nm;
  // 22 ต.ค.: เขียน "เมื่อ → ทำอะไร · ใส่/ให้ ใคร" แยกกันชัด กันอ่านเป็น "โดนตีโดยศัตรูตรงหน้า"
  const info = DO_INFO[s.do] || {}, foe = info.side === 'foe' || info.side === 'pick' || (info.side === 'foeSelf' && s.to !== 'self');
  const ofTxt = info.of && s.of ? ` ของ${STAT_TH[s.of.stat] || s.of.stat} ของ${whoTh(s.of.who, s.when)}` : '';
  const toTxt = info.side === 'self' ? '' : ` · ${foe ? 'ใส่' : 'ให้'} ${toTh(s)}`; // ผลของตัวเอง (ดูดเลือด ลุก ชุบ ฯลฯ) ไม่ต้องบอกผู้รับ
  return `${when} → ${nm2}${unit === '-' ? '' : sep + vals}${ofTxt}${onAttack ? ' (บวกจากดาเมจตีปกติ)' : ''}${toTxt}${dur && withDur ? ` [${DUR_TH[dur]}]` : ''}${extra ? ` (${extra})` : ''}`;
}
// ชุด 24: ประโยคสกิลแสดงค่าครบทุกเลเวล (เช่น 5 / 10 / 20) และทำตัวหนาเฉพาะค่าของเลเวลปัจจุบัน · สร้าง DOM ด้วย textContent เท่านั้น
export function skillLineEl(s, level, withDur = false) {
  const span = document.createElement('span');
  const line = skillLine(s, 0, withDur);
  const unit = (DO_TH[s.do] || [s.do, ''])[1];
  const lvs = Array.isArray(s.lv) && s.lv.length ? [...s.lv].sort() : [1, 2, 3];
  const raw = lvs.map(l => s.v[l - 1]), all = valsText(s, unit, 0), i = all ? line.indexOf(all) : -1;
  const parts = raw.map(x => String(unit === 'ms' ? x / 1000 : x)), joined = parts.join(' / ');
  if (!level || i < 0 || new Set(raw).size === 1 || !lvs.includes(level) || !all.startsWith(joined)) { span.textContent = line; return span; }
  span.append(line.slice(0, i));
  parts.forEach((p, j) => {
    if (j) span.append(' / ');
    if (lvs[j] === level) { const b = document.createElement('b'); b.className = 'lv-now'; b.title = `ค่าของเลเวล ${level}`; b.textContent = p; span.append(b); } else span.append(p);
  });
  span.append(all.slice(joined.length) + line.slice(i + all.length));
  return span;
}
export const valsText = (s, unit, level) => {
  const lvs = Array.isArray(s.lv) && s.lv.length ? [...s.lv].sort() : [1, 2, 3];
  const raw = lvs.map(l => s.v[l - 1]);
  return level ? fmtVal(unit, s.v[level - 1]) : unit === '-' ? ''
    : new Set(raw).size === 1 ? fmtVal(unit, raw[0])
    : unit === 'ms' ? `${raw.map(x => x / 1000).join(' / ')} วิ` : `${raw.join(' / ')}${unit === '%' ? '%' : unit ? ' ' + unit : ''}`;
};
export const extraText = s => [
    s.cd ? `คูลดาวน์สกิล ${s.cd / 1000} วิ${s.cdGrow ? ` (ยาวขึ้น ${s.cdGrow}% ทุกครั้งที่ใช้)` : ''}` : '',
    s.chance != null && s.chance < 100 ? `โอกาส ${s.chance}%` : '',
    Array.isArray(s.lv) && s.lv.length < 3 ? `เฉพาะ ${lvText(s.lv)}` : '',
    s.perm && DO_INFO[s.do] && DO_INFO[s.do].perm ? `ถาวร: ได้${GIVE_TH[permKeyOf(s)]} ทุกครั้งที่ทำงาน` : '',
  ].filter(Boolean).join(' · ');

// ชุด 8 (22 ต.ค.): ประโยคภาษาพูดสำหรับตัวแก้สกิล "เมื่อ → ผู้รับ: ผล ค่า ของค่า ของใคร" + ตัวอย่างตัวเลข
export const SINGLE_TO = new Set(['self', 'target', 'attacker', 'enemyFront', 'enemyMidRow', 'enemyBackRow', 'lowestHp', 'enemyRandom', 'frontAlly', 'backAlly', 'frontLaneAlly', 'backLaneAlly', 'allyLowest', 'allyRandom', 'nextTribeBuy']);
export const recvTh = s => ((DO_INFO[s.do] || {}).side === 'self' || s.to === 'self' ? 'ตัวนี้' : toTh(s));
export const ofWho = s => (s.of.who === 'each' ? (((DO_INFO[s.do] || {}).side === 'foe') ? 'ตัวที่โดนเอง' : 'ตัวที่ได้รับเอง') : whoTh(s.of.who, s.when).replace(/ \(.*$/, ''));
export const ofStat = st => { const t = STAT_TH[st] || st; return /^[A-Z]/.test(t) ? `ของ ${t}` : `ของ${t}`; };
export function skillSay(s) {
  if (!s) return '';
  const [name, unit] = DO_TH[s.do] || [s.do, ''];
  const info = DO_INFO[s.do] || {};
  const when = (WHEN_TH[s.when] || s.when).replace(/^(ร้านค้า|หลังสู้): /, '');
  const vals = valsText(s, unit), extra = extraText(s);
  const recv = recvTh(s) + (!SINGLE_TO.has(s.to) && info.side !== 'self' ? ' (แต่ละตัว)' : '');
  if (s.do === 'shareArmor') return `${when} → ทุกครั้งที่ตัวนี้ได้เกราะ ${recv} ได้เกราะเพิ่ม ${vals} ของจำนวนที่ได้${extra ? ` (${extra})` : ''}`;
  const onAttack = ['hit', 'set', 'hits3'].includes(s.when) && EXTRA_DMG.has(s.do);
  let nm = onAttack ? name.replace(/^ดาเมจ/, 'ดาเมจเพิ่ม') : name;
  if (s.do === 'summon' && s.summon) nm = `เรียก ${s.summon} มาสู้แทน (เลเวลเดียวกัน ช่องเดิม)`;
  const sep = nm.endsWith('+') || nm.endsWith('−') ? '' : ' ';
  const ofTxt = info.of && s.of ? ` ${ofStat(s.of.stat)}ของ${ofWho(s)}` : '';
  return `${when} → ${recv}: ${nm}${unit === '-' ? '' : sep + vals}${ofTxt}${onAttack ? ' (บวกจากดาเมจตีปกติ)' : ''}${extra ? ` (${extra})` : ''}`;
}
export const OF_RESULT = { dmgOf: 'โดนดาเมจ', burnOf: 'ติดไฟ', shockOf: 'ติดช็อต', armorOf: 'ได้เกราะ', healOf: 'ฟื้น HP',
  atkOf: 'ได้พลังโจมตี +', hpOf: 'ได้ HP สูงสุด +', burnHitOf: 'ได้ไฟต่อฮิต +', shockHitOf: 'ได้ช็อตต่อฮิต +', armorHitOf: 'ได้เกราะ/ฮิต +' };
// ตัวอย่างตัวเลขที่เลเวลแรกที่สกิลใช้ได้ · ค่าของตัวนี้เองใช้ค่าจริงของตัวละคร ค่าอื่นใช้ค่าสมมติ · ปัดลงเหมือนในการต่อสู้
export function skillExample(s, c) {
  if (!s || !Array.isArray(s.v)) return '';
  const L = (Array.isArray(s.lv) && s.lv.length ? [...s.lv].sort()[0] : 1), v = s.v[L - 1];
  const each = !SINGLE_TO.has(s.to) ? ' ต่อตัว' : '';
  if (s.do === 'shareArmor') return `ตัวอย่าง Lv${L}: ตัวนี้ได้เกราะ 10 → ${recvTh(s)}ได้เกราะ +${Math.floor(10 * v / 100)}${each}`;
  if (!OF_RESULT[s.do] || !s.of) return '';
  const st = s.of.stat, real = s.of.who === 'self' && c && (st === 'atk' || st === 'maxHp' || st === 'hp');
  const x = real ? (st === 'atk' ? c.atk[L - 1] : c.hp[L - 1]) : (st === 'maxHp' || st === 'hp' || st === 'hpLost' ? 100 : 10);
  return `ตัวอย่าง Lv${L}: ${STAT_TH[st]}ของ${ofWho(s)} = ${x}${real ? '' : ' (สมมติ)'} → ${recvTh(s)}${OF_RESULT[s.do]}${OF_RESULT[s.do].endsWith('+') ? '' : ' '}${Math.floor(x * v / 100)}${each}`;
}

// สีความแรร์: ธรรมดา = เทา · ไม่ธรรมดา = เขียว · หายาก = ฟ้า · หายากมาก = ม่วง · ตำนาน = ทอง (สีจริงอยู่ใน CSS ของแต่ละหน้า: .rar.r0–.r4)
export const RARITY_CLASS = { 'ธรรมดา': 'r0', 'ไม่ธรรมดา': 'r1', 'หายาก': 'r2', 'หายากมาก': 'r3', 'ตำนาน': 'r4' };
export function rarityTag(r) {
  const s = document.createElement('span');
  s.className = 'rar ' + (RARITY_CLASS[r] || 'r0'); s.textContent = r;
  return s;
}



// ---- บันทึกการต่อสู้ละเอียด (ชุด 25 · ย้ายจากแท็บจำลองสกิลของห้องบาลานซ์มาใช้ร่วมกับหน้าเกม) ----
// ทุกข้อความสร้างด้วย DOM + textContent เท่านั้น
export const ROW_TH = ['หน้า', 'กลาง', 'หลัง'];
export const secT = t => `${(t / 1000).toFixed(2)}s`;
// ตัวละครทั้งหมดในแมตช์: ตัวตอนเริ่ม + ตัวที่ถูกเรียกมาสู้แทน (21 ต.ค.)
export const unitsOf = r => [...r.events[0].units, ...r.events.filter(e => e.k === 'summon').map(e => e.unit)];
export const WHY_SIM = { hit: 'ฮิต', shock: 'ช็อต', burn: 'ไฟ', storm: 'พายุทราย', counter: 'สวนกลับ', reflect: 'สะท้อน', armorBreak: 'เกราะแตก', downSkill: 'สกิลตอนล้ม', skill: 'ดาเมจเพิ่มจากสกิล', execute: 'ล้มทันที', tribe: 'โบนัสเผ่า', share: 'แบ่งเกราะ' };
export const logEl = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
// ชิ้นส่วนบรรทัด: string = ข้อความ · { u } = ชื่อตัวละคร · { t, c } = ข้อความมีสี · cm = ตารางตัวละครของแมตช์นั้น
// ---- set 75: boss rules in the battle log ----
// bossRuleName('burnAura') → 'R11 ทุก 5 วิ ผู้เล่นทุกตัวติดไฟ' · short = code only when the label has one (R11 / X1), else the full label
const bossRuleRow = id => BOSS_RULES.find(q => q[0] === id) || BOSS_PHASE_FX.find(q => q[0] === id);
export function bossRuleName(id, short = false) {
  if (id === 'untargetable') return 'X3 บอสตีไม่โดนชั่วคราว';
  const q = bossRuleRow(id); if (!q) return String(id);
  const m = /^([RX]\d+) /.exec(q[1]);
  return short && m ? m[1] : q[1];
}
// one rule with its numbers, e.g. 'R15 ทุก X วิ สุ่มผู้เล่น 1 ตัวใช้สกิลไม่ได้ (8 วิ · ใช้ไม่ได้นาน 4 วิ)'
export function bossRuleText(r) {
  const q = bossRuleRow(r.id); if (!q) return String(r.id);
  const vals = [];
  if (q[4] && r.v != null) vals.push(`${r.v}${q[5] === '%' ? '%' : ' ' + q[5]}`);
  if (Array.isArray(q[6]) && r.v2 != null) vals.push(`${q[6][0]} ${r.v2}${q[6][4] === '%' ? '%' : ' ' + q[6][4]}`);
  if (q[6] === 'tribe' && r.tribe) vals.push(`เผ่า${r.tribe}`);
  return vals.length ? `${q[1]} (${vals.join(' · ')})` : q[1];
}
const BOSS_STAT_TH = { atk: 'พลังโจมตี', cdMs: 'คูลดาวน์ (มิลลิวิ)', multi: 'มัลติฮิต', burn: 'ไฟ/ฮิต', shock: 'ช็อต/ฮิต', armorHit: 'เกราะ/ฮิต', healHit: 'ฟื้น/ฮิต' };
const ruleTagPart = e => { const ids = [...(e.r ? [e.r] : []), ...(e.rr || [])]; return ids.length ? [{ t: `  [กฎบอส ${ids.map(id => bossRuleName(id, true)).join(', ')}]`, c: 'lg-rule' }] : []; };
export function simLine(e, S, U, cm) {
  const P0 = simLine0(e, S, U, cm);
  return P0 && (e.r || e.rr) ? [...P0, ...ruleTagPart(e)] : P0;
}
function simLine0(e, S, U, cm) {
  const P = [], who = uid => ({ u: uid }), st = uid => { const x = S.get(uid); return x ? `HP ${Math.max(0, x.hp)}/${x.maxHp}${x.armor > 0 ? ` · เกราะ ${x.armor}` : ''}` : ''; };
  switch (e.k) {
    case 'start': return ['เริ่มแมตช์'];
    case 'burnLeft': return [who(e.to), ` ไฟลดลง ${RULES.burnDecay} เหลือ `, { t: String(e.total), c: 'lg-burn' }];
    case 'proc': { const u = U.get(e.who), c = u && cm[u.id], s = c && c.skills[e.si]; return s ? ['★ ', who(e.who), ` ใช้สกิล ${e.si + 1}: `, { t: skillLine(s, u.level, true), c: 'lg-skill' }] : null; }
    case 'set': return e.target != null ? [who(e.who), ` โจมตีชุดที่ ${e.n} → `, who(e.target), ` · ${e.hits} ฮิต × พลังโจมตี ${e.atk ?? '?'}`] : [who(e.who), ` โจมตีชุดที่ ${e.n} (ไม่มีเป้า)`];
    case 'dmg': {
      P.push(who(e.to), ` โดน${WHY_SIM[e.why] || ''} `, { t: String(e.amount), c: 'lg-dmg' });
      if (e.from != null) P.push(' จาก ', who(e.from));
      P.push(' → ');
      if (e.absorbed) P.push({ t: `เกราะกัน ${e.absorbed}`, c: 'lg-arm' }, ' · ');
      P.push({ t: `HP −${e.amount - e.absorbed}`, c: 'lg-hp' }, { t: `  (เหลือ ${st(e.to)})`, c: 'lg-st' });
      return P;
    }
    case 'armor': return [who(e.to), ' ได้เกราะ ', { t: `+${e.amount}`, c: 'lg-arm' }, e.why === 'share' ? ' (แบ่งเกราะ)' : e.why === 'tribe' ? ' (โบนัสเผ่า)' : e.why === 'armorHit' ? ' (เกราะ/ฮิต)' : e.why === 'boss' ? ' (กฎบอส)' : '', { t: `  (${st(e.to)})`, c: 'lg-st' }];
    case 'burn': return [who(e.to), ' ติดไฟ ', { t: `+${e.amount}`, c: 'lg-burn' }, ` (รวม ${e.total})${e.why === 'tribe' ? ' (โบนัสเผ่า)' : ''}`];
    case 'shock': return [who(e.to), ' ติดช็อต ', { t: `+${e.amount}`, c: 'lg-shock' }, ` (รวม ${e.total})${e.why === 'tribe' ? ' (โบนัสเผ่า)' : ''}`];
    case 'heal': return [who(e.to), ' ฟื้น HP ', { t: `+${e.amount}`, c: 'lg-heal' }, { t: `  (${st(e.to)})`, c: 'lg-st' }];
    case 'atkUp': return [who(e.to), ` พลังโจมตี +${e.amount} (ระหว่างสู้)`];
    case 'cdCut': return [who(e.to), ` คูลดาวน์ที่เหลือ −${e.ms / 1000} วิ`];
    case 'cdPct': return [who(e.to), ` คูลดาวน์ −${e.pct}% (ระหว่างสู้)`];
    case 'maxhp': return [who(e.to), ` HP สูงสุด −${e.amount} (ระหว่างสู้)`, { t: `  (${st(e.to)})`, c: 'lg-st' }];
    case 'cleanse': return e.what === 'pct' ? [who(e.to), ` ล้างไฟ −${e.cut[0]} ช็อต −${e.cut[1]} (เหลือไฟ ${e.burn} ช็อต ${e.shock})`] : [who(e.to), e.what === 'burn' ? ' ไฟถูกดับ' : e.what === 'bar' ? ' ขึ้นแถบเลือดใหม่ ล้างดีบัฟทั้งหมด' : ' ถูกล้างสถานะ'];
    case 'carry': return ['➜ ', who(e.by), ' พา ', who(e.who), ' ไปตี ', who(e.target)]; // ชุด 20
    case 'reflectDebuff': return ['↩ ', who(e.from), ` สะท้อน${e.kind === 'burn' ? 'ไฟ' : e.kind === 'shock' ? 'ช็อต' : 'คูลดาวน์ช้าลง'} `, { t: e.kind === 'cdSlowPct' ? `+${Math.round(e.amount * 10) / 10}%` : `+${e.amount}`, c: e.kind === 'burn' ? 'lg-burn' : e.kind === 'shock' ? 'lg-shock' : 'lg-skill' }, ' กลับไปหา ', who(e.to), ...(e.ally != null ? [' (สะท้อนให้ ', who(e.ally), ')'] : [])];
    case 'buff': return [who(e.to), ` ${{ freeze: 'แช่แข็ง +', cdSlowPct: 'คูลดาวน์ช้าลง +', stun: 'มึนงง ', hpUp: 'HP สูงสุด +', multiUp: 'มัลติฮิต +', burnHitUp: 'ไฟต่อฮิต +', shockHitUp: 'ช็อตต่อฮิต +', armorHitUp: 'เกราะ/ฮิต +', healHitUp: 'ฟื้น/ฮิต +', cdMsDown: 'คูลดาวน์ −', silence: 'ใช้สกิลไม่ได้ ', burnTakenUp: 'ดาเมจไฟที่โดน +', shockTakenUp: 'ดาเมจช็อตที่โดน +', dmgTakenUp: 'ดาเมจตีที่โดน +', armorGainCut: 'เกราะที่ได้รับ −', healCut: 'ฟื้น HP ที่ได้รับ −', reflectDebuff: 'สะท้อนดีบัฟ ', hitAmp: 'ดาเมจตี +', burnAmp: 'ดาเมจไฟ +', shockAmp: 'ดาเมจช็อต +', healAmp: 'ฟื้น HP ที่ได้รับ +', armorAmp: 'เกราะที่ได้รับ +', cdAmp: 'ผลลดคูลดาวน์ที่ได้รับ +', healToAtk: 'ฟื้นเป็นพลัง +', atkDrain: 'ตีเบาลง −' }[e.what] || e.what + ' '}${['freeze', 'stun', 'cdMsDown', 'silence'].includes(e.what) ? `${e.amount / 1000} วิ` : Math.round(e.amount * 10) / 10}${/Taken|Cut|Pct|Amp|healToAtk|reflectDebuff|atkDrain/.test(e.what) ? '%' : ''}`];
    case 'down': return ['✖ ', who(e.who), ' ล้ม'];
    case 'summon': return ['✚ ', who(e.from), ' เรียก ', who(e.who), ` มาสู้แทน `, { t: `HP ${e.unit.hp}`, c: 'lg-heal' }];
    case 'perm': return ['◆ ', who(e.to), ' ได้ ', { t: permText(e.key, e.amount), c: 'lg-skill' }, ' ถาวร (ติดไปแมตช์ถัดไป)'];
    case 'steal': return [who(e.from), ' ดูดช็อต ', { t: String(e.amount), c: 'lg-shock' }, ' จาก ', who(e.to), ` (เหลือ ${e.total})`];
    case 'revive': return e.why === 'ally' && e.from != null ? ['✚ ', who(e.who), ' ถูก ', who(e.from), ' ชุบ ', { t: `HP ${e.hp}`, c: 'lg-heal' }] // G2: shows who revived (detail on)
      : ['✚ ', who(e.who), ` ${e.why === 'ally' ? 'ถูกเพื่อนชุบ' : e.why === 'tribe' ? 'ลุกกลับมา (โบนัสเผ่า)' : 'ลุกกลับมา'} `, { t: `HP ${e.hp}`, c: 'lg-heal' }];
    case 'overtime': return ['⏱ ', { t: `ช่วงต่อเวลา สแตก ${e.n}`, c: 'lg-rule' }, ` · ดาเมจ +${e.dmg}% · ตีเร็วขึ้น ${e.speed}% · ฟื้น −${e.heal}% · เกราะใหม่ −${e.armor}%`]; // set 98
    case 'phase': {
      const P2 = ['◆◆ ', who(e.who), ` เข้าเฟส ${e.i + 1}`];
      const rules = e.rd ? e.rd.map(bossRuleText) : (e.rules || []).map(id => bossRuleName(id));
      const fx = (e.fx || []).map(bossRuleText);
      if (fx.length) P2.push(' · ผลตอนเข้าเฟส: ', { t: fx.join(' · '), c: 'lg-rule' });
      P2.push(' · กฎเฟสนี้: ', { t: rules.length ? rules.join(' · ') : 'ไม่มี', c: 'lg-rule' });
      if (e.stats) P2.push(' · ค่าบอสใหม่: ', { t: Object.entries(e.stats).map(([k, v]) => `${BOSS_STAT_TH[k] || k} ${v}`).join(' · '), c: 'lg-skill' });
      if (e.cells) P2.push(` · ย้ายไปช่อง ${e.cells.map(c => `${ROW_TH[c >> 1]}${(c & 1) + 1}`).join(', ')}`);
      return P2;
    }
    case 'bar': return ['▮ ', who(e.who), ` เสียแถบเลือด 1 แถบ (หมดไป ${e.gone} · เหลือ ${e.left})`, ...(e.left > 0 ? [' → ล้างดีบัฟทั้งหมด'] : [])];
    case 'barRefill': return ['↺ ', who(e.who), ' ตีแถบไม่หมดในเวลา แถบเต็มกลับ ', { t: `HP ${e.hp}`, c: 'lg-heal' }];
    case 'bossMove': return ['⇄ ', who(e.who), ` ย้ายไปช่อง ${ROW_TH[e.slot >> 1]}${(e.slot & 1) + 1}`];
    case 'vanish': return ['◌ ', who(e.who), ` หายตัว ${e.ms / 1000} วิ (ตีไม่โดน ไฟ/พายุยังเข้า)`];
    case 'curse': return e.done === 0 ? ['☠ ', who(e.to), ' โดนคำสาป: ทีมตีบอสไม่ถึงเป้า → down'] : ['☠ ', who(e.to), ` ถูกสาป: ทีมต้องตีบอสให้ถึงเป้าใน ${e.ms / 1000} วิ ไม่งั้นล้ม`];
    case 'ruleBlock': return [who(e.to), ` ไม่โดน${WHY_SIM[e.why] || ''}`, ...(e.from != null ? [' จาก ', who(e.from)] : []), { t: `  (${bossRuleName(e.rule)})`, c: 'lg-rule' }];
    case 'avoid': return ['🛡 ', who(e.to), ' เลี่ยงจุดตาย (ฮิตนี้ไม่เข้า)', ...(e.from != null ? [' จาก ', who(e.from)] : [])];
    case 'end': return [`จบแมตช์: ${e.winner === 0 ? 'ทีมซ้ายชนะ' : e.winner === 1 ? 'ทีมขวาชนะ' : 'เสมอ'}`];
    default: return null;
  }
}
// สร้างบรรทัดบันทึก (li) ทั้งแมตช์ · opts: who (uid หรือ null) · pair ([uid, uid] กรองเฉพาะเหตุการณ์ที่เกี่ยวกับทั้งคู่ · ชุด 37) · keep (Set เลขเหตุการณ์ที่ต้องแสดงแม้เกินลิมิต · ชุด 37) · onlyProc · hideSet · nameEl(u) · limit
// ชุด 37: li แต่ละบรรทัดมี data-ev = เลขเหตุการณ์ใน r.events (ให้ลิงก์จากแท็บรายตัวเลื่อนไปที่บรรทัดนั้น)
export function battleLogLines(r, cm, opts = {}) {
  const { who = null, pair = null, pairInclude = null, keep = null, hi = null, onlyProc = false, hideSet = false, nameEl, limit = 2000 } = opts; // pairInclude = เลขเหตุการณ์ที่ผ่านตัวกรองคู่เสมอ (เช่น ดาเมจไฟที่ไม่มีเจ้าของแต่แบ่งให้ผู้ติดไฟ) · hi = เลขเหตุการณ์ที่ไฮไลต์
  const all = unitsOf(r), U = new Map(all.map(u => [u.uid, u]));
  // สถานะ HP/เกราะ ไล่ตามเหตุการณ์ (ใช้แสดง "เหลือเท่าไร")
  const S = new Map(all.map(u => [u.uid, { hp: u.hp, maxHp: u.maxHp, armor: u.armor || 0 }]));
  const out = [];
  let total = 0;
  for (let ei = 0; ei < r.events.length; ei++) {
    const e = r.events[ei];
    const x = S.get(e.to ?? e.who);
    if (x) switch (e.k) {
      case 'dmg': x.hp -= e.amount - e.absorbed; x.armor -= e.absorbed; break;
      case 'armor': x.armor += e.amount; break;
      case 'heal': x.hp += e.amount; break;
      case 'maxhp': x.maxHp = e.maxHp; x.hp = Math.min(x.hp, e.hp); break;
      case 'buff': if (e.what === 'hpUp') { x.maxHp += e.amount; x.hp += e.amount; } break;
      case 'down': x.hp = 0; x.armor = 0; break;
      case 'revive': x.hp = e.hp; x.armor = 0; break;
      case 'barRefill': x.hp = e.hp; break;
    }
    if (onlyProc && e.k !== 'proc') continue;
    if (hideSet && e.k === 'set') continue;
    if (who != null && ![e.who, e.to, e.from, e.target].includes(who)) continue;
    if (pair && !(pair.every(p => [e.who, e.to, e.from, e.target].includes(p))) && !(pairInclude && pairInclude.has(ei))) continue;
    const parts = simLine(e, S, U, cm);
    if (!parts) continue;
    total++;
    if (out.length >= limit && !(keep && keep.has(ei))) continue; // ชุด 37: บรรทัดเป้าหมายของลิงก์ต้องแสดงแม้เกินลิมิต
    const li = logEl('li', e.k === 'proc' ? 'proc' : ['down', 'revive', 'end', 'start', 'phase', 'bar'].includes(e.k) ? 'big' : e.k === 'set' ? 'set' : '');
    li.dataset.ev = String(ei);
    if (hi === ei) li.classList.add('lg-hi');
    li.append(logEl('span', 'lg-t', secT(e.t)));
    for (const p of parts) {
      if (typeof p === 'string') li.append(p);
      else if (p.u != null) { const u = U.get(p.u); li.append(u ? (nameEl ? nameEl(u) : logEl('span', u.side === 0 ? 'lg-L' : 'lg-R', `${u.id}`)) : '?'); }
      else li.append(logEl('span', p.c, p.t));
    }
    out.push(li);
  }
  if (total > limit) out.push(logEl('li', 'big', `… แสดง ${limit} จาก ${total} บรรทัด · เลือก "ดูเฉพาะ" เพื่อกรอง`));
  if (!out.length) out.push(logEl('li', '', 'ไม่มีเหตุการณ์'));
  return out;
}
