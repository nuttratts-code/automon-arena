import { pause } from '../lab/analyze.js';
// หน้าจอสู้: เล่นบันทึกเหตุการณ์จากตัวคำนวณเป็นภาพ ไม่คำนวณกฎเอง
// ใช้ textContent เท่านั้น (ไม่ใช้ innerHTML กับข้อมูล) กันโค้ดแปลกปลอมจากชื่อ/ไฟล์เซฟ
export const TRIBE_STYLE = {
  'เหล็กกล้า': { color: 'var(--t-steel)', shape: 'square' },
  'เพลิงเผา': { color: 'var(--t-fire)', shape: 'triangle' },
  'สายฟ้า': { color: 'var(--t-bolt)', shape: 'diamond' },
  'วายุ': { color: 'var(--t-wind)', shape: 'circle' },
  'ภูติ': { color: 'var(--t-spirit)', shape: 'hexagon' },
  'อสูร': { color: 'var(--t-fiend)', shape: 'pentagon' },
};
export const WHY_CLASS = { reflect: 'n-hit', hit: 'n-hit', counter: 'n-hit', shock: 'n-shock', burn: 'n-burn', storm: 'n-storm', armorBreak: 'n-hit', downSkill: 'n-hit' };
export const WHY_TEXT = { execute: 'ล้มทันที', share: 'แบ่งเกราะ', reflect: 'สะท้อน', hit: 'ฮิต', counter: 'สวนกลับ', shock: 'ช็อต', burn: 'ไฟ', storm: 'พายุทราย', armorBreak: 'เกราะแตก', downSkill: 'สกิลตอนล้ม' };

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// ---- หน้าตาตัวละครรายตัว (ชุด 25 · ผู้ใช้เลือก 6A) ----
// รูปทรง + สีตามเผ่า (เดิม) · ลวดลายเรขาคณิตด้านในตามเลขท้าย ID (ไม่ซ้ำกันภายในเผ่า) · ขอบตามความหายาก
// ภาพชั่วคราว รอผู้ใช้ทำอาร์ตจริง · สร้างด้วย createElementNS เท่านั้น (ไม่ใช้ innerHTML)
export const RARITY_RING = { 'ธรรมดา': 0, 'ไม่ธรรมดา': 1, 'หายาก': 2, 'หายากมาก': 3, 'ตำนาน': 4 };
// ชุด 69: สีหลอดเลือดบอสแต่ละแถบ (แถบ 1 = แถบสุดท้าย สีแดงเหมือนหลอดปกติ) · หมุนสีทีละ ~137° ให้แถบติดกันต่างกันชัด รองรับถึง 20 แถบ
export const barColor = k => k === 1 ? 'var(--hp)' : `hsl(${Math.round(((k - 1) * 137.5) % 360)} ${k % 2 ? 70 : 60}% ${k % 3 ? 52 : 42}%)`;
export const SVGNS = 'http://www.w3.org/2000/svg';
export const star = (cx, cy, R, r) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r : R; return `${(cx + d * Math.cos(a)).toFixed(1)},${(cy + d * Math.sin(a)).toFixed(1)}`; }).join(' ');
// ลวดลายในกรอบ 100×100 · จุดกลาง (50,58) ให้อยู่ในรูปสามเหลี่ยม/ห้าเหลี่ยมได้ · [ชนิดแท็ก, คุณสมบัติ, เส้นขอบ?]
export const PATTERNS = [
  [['circle', { cx: 50, cy: 58, r: 11 }]],                                                                     // 0 จุดเดียว
  [['circle', { cx: 37, cy: 58, r: 7 }], ['circle', { cx: 63, cy: 58, r: 7 }]],                              // 1 สองจุด
  [['circle', { cx: 50, cy: 46, r: 6 }], ['circle', { cx: 38, cy: 66, r: 6 }], ['circle', { cx: 62, cy: 66, r: 6 }]], // 2 สามจุด
  [['rect', { x: 18, y: 48, width: 64, height: 7 }], ['rect', { x: 18, y: 62, width: 64, height: 7 }]],      // 3 แถบนอนคู่
  [['rect', { x: 34, y: 30, width: 6, height: 52 }], ['rect', { x: 47, y: 30, width: 6, height: 52 }], ['rect', { x: 60, y: 30, width: 6, height: 52 }]], // 4 แถบตั้งสามเส้น
  [['path', { d: 'M20 76 L56 40 M38 84 L76 46', 'stroke-width': 7 }, 1]],                                    // 5 แถบเฉียง
  [['circle', { cx: 50, cy: 58, r: 13, 'stroke-width': 5 }, 1]],                                             // 6 วงแหวน
  [['circle', { cx: 50, cy: 58, r: 16, 'stroke-width': 4 }, 1], ['circle', { cx: 50, cy: 58, r: 5 }]],      // 7 วงซ้อน + จุด
  [['polygon', { points: star(50, 58, 17, 7) }]],                                                            // 8 ดาว
  [['rect', { x: 45, y: 40, width: 10, height: 36 }], ['rect', { x: 32, y: 53, width: 36, height: 10 }]],    // 9 บวก
  [['path', { d: 'M32 52 L50 66 L68 52', 'stroke-width': 7, 'stroke-linejoin': 'round' }, 1]],              // 10 บั้ง
  [['rect', { x: 37, y: 45, width: 11, height: 11 }], ['rect', { x: 52, y: 45, width: 11, height: 11 }], ['rect', { x: 37, y: 60, width: 11, height: 11 }], ['rect', { x: 52, y: 60, width: 11, height: 11 }]], // 11 ตาราง 4 ช่อง
  [['polygon', { points: '50,42 64,58 50,74 36,58', 'stroke-width': 5 }, 1]],                               // 12 ข้าวหลามตัดกลวง
];
export const SHAPE_DY = { triangle: 12, pentagon: 5 }; // จุดกลางของรูปทรงที่ไม่สมมาตรบน-ล่าง
// เลขลวดลาย: เลขท้าย ID − 1 เลื่อนตามลำดับเผ่า (เผ่าละ 2) · ตัวเลขต่างกันในเผ่าเดียวกัน → ลวดลายต่างกัน (ถึง 13 ตัวต่อเผ่า)
export function patternOf(id, tribe) {
  const m = /-(\d+)$/.exec(String(id)), n = m ? +m[1] : 1, t = Math.max(0, Object.keys(TRIBE_STYLE).indexOf(tribe));
  return ((n - 1) + t * 2) % PATTERNS.length;
}
// คืนกล่องรูปตัวละคร (ใช้ทุกหน้า: ร้าน บอร์ด ม้านั่ง แผงข้อมูล หน้าจอสู้ ห้องบาลานซ์) · cls = คลาสขนาดของแต่ละหน้า
export function unitShape(c, level, cls = 'shape') {
  const st = TRIBE_STYLE[c.tribe] || { color: 'var(--mute)', shape: 'square' };
  const wrap = el('div', `mon rr${RARITY_RING[c.rarity] || 0}`);
  const s = el('div', `${cls} s-${st.shape}`); s.style.setProperty('--tc', st.color);
  const svg = document.createElementNS(SVGNS, 'svg'), g = document.createElementNS(SVGNS, 'g');
  svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('class', 'pat'); svg.setAttribute('aria-hidden', 'true');
  g.setAttribute('transform', `translate(50 ${50 + (SHAPE_DY[st.shape] || 0)}) scale(1.25) translate(-50 -58)`); // ขยายลวดลาย + เลื่อนเข้ากลางรูปทรง
  for (const [tag, attrs, line] of PATTERNS[patternOf(c.id, c.tribe)]) {
    const n = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    if (line) { n.setAttribute('fill', 'none'); n.setAttribute('stroke', 'currentColor'); } else n.setAttribute('fill', 'currentColor');
    g.append(n);
  }
  svg.append(g); s.append(svg); wrap.append(s);
  // ดาวเลเวลเป็นป้ายใต้รูป (ไม่ทับลวดลาย)
  if (level) { wrap.append(el('span', 'lv', '★'.repeat(level))); wrap.classList.add('has-lv'); }
  return wrap;
}

export class BattleView {
  constructor(root, charMap, opts = {}) {
    this.root = root; this.charMap = charMap;
    this.onTime = opts.onTime || (() => {}); this.onEnd = opts.onEnd || (() => {}); this.onLog = opts.onLog || (() => {});
    this.speed = 1; this.playing = false; this.raf = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // ชุด 30.4 (แก้กระตุก): ไม่สร้างข้อความบันทึกถ้าไม่มีหน้าไหนรับ · จำตำแหน่งช่องไว้ (ไม่ถามเบราว์เซอร์ทุกฮิต) · วาดครั้งเดียวต่อเฟรม
    this.wantLog = !!opts.onLog;
    this.pos = null; this.dirty = new Set(); this.pend = new Map();
    addEventListener('resize', () => { this.pos = null; });
  }

  load(result) {
    cancelAnimationFrame(this.raf);
    this.result = result; this.events = result.events; this.i = 0; this.clock = 0; this.ended = false;
    this.root.replaceChildren();
    this.pos = null; this.dirty.clear(); this.pend.clear();
    const start = this.events.find(e => e.k === 'start');
    this.units = new Map();
    const sides = [el('div', 'side side-a'), el('div', 'side side-b')];
    // ซ้าย: หลัง กลาง หน้า (หน้าติดกลางจอ) · ขวา: หน้า กลาง หลัง
    for (const [s, box] of sides.entries()) {
      for (let lane = 0; lane < 2; lane++) for (let c = 0; c < 3; c++) {
        const row = s === 0 ? 2 - c : c;
        const cell = el('div', 'cell');
        cell.dataset.key = `${s}:${row}:${lane}`;
        box.append(cell);
      }
    }
    const mid = el('div', 'mid');
    this.root.append(sides[0], mid, sides[1]);
    for (const u of start.units) this.addUnit(u);
    this.onTime(0);
  }

  // การ์ดตัวละคร 1 ตัวในช่องของมัน (ใช้ตอนเริ่ม และตอนถูกเรียกมาสู้แทน)
  addUnit(u) {
    {
      const c = this.charMap[u.id];
      const card = el('div', 'unit');
      const shape = unitShape(c, u.level);
      const name = el('div', 'uname', u.name);
      const hpBar = el('div', 'hp'), hpFill = el('div', 'hp-fill'), armorFill = el('div', 'armor-fill');
      hpBar.append(hpFill, armorFill);
      const nums = el('div', 'nums');
      const hpText = el('span', 'hp-text'), armorText = el('span', 'armor-text');
      const barText = el('span', 'bar-text');
      nums.append(hpText, armorText);
      if (u.bars > 1) nums.append(barText);
      const chips = el('div', 'chips');
      const multi = el('span', 'chip c-multi'), burn = el('span', 'chip c-burn'), shock = el('span', 'chip c-shock');
      multi.title = 'มัลติฮิต (ตีกี่ทีต่อชุด)';
      chips.append(multi, burn, shock);
      card.append(shape, name, hpBar, nums, chips);
      const cell = this.root.querySelector(`[data-key="${u.side}:${u.row}:${u.lane}"]`);
      cell.append(card);
      const m0 = c && Array.isArray(c.multi) ? c.multi[(u.level || 1) - 1] : 1;
      const v = { ...u, hp: u.hp, armor: u.armor, burn: 0, shock: 0, stat: null, procs: new Map(), multi: Number.isInteger(m0) ? m0 : 1, down: false, card, cell, hpBar, barText, hpFill, armorFill, hpText, armorText, burnEl: burn, shockEl: shock, multiEl: multi };
      this.units.set(u.uid, v);
      if (u.cells) this.placeCells(v, u.cells);
      this.paint(v);
      return v;
    }
  }

  // ชุด 67: บอสยืนหลายช่อง → การ์ดอยู่ช่องแรก ช่องที่เหลือมีป้ายชื่อบอส (ย้ายที่/เปลี่ยนจุดยืน = วางใหม่)
  placeCells(v, cells) {
    for (const t of v.tags || []) t.remove();
    v.tags = []; v.cells = cells.slice();
    const at = i => this.root.querySelector(`[data-key="${v.side}:${i >> 1}:${i & 1}"]`);
    const first = at(cells[0]);
    if (first && first !== v.cell) { first.append(v.card); v.cell = first; v.row = cells[0] >> 1; v.lane = cells[0] & 1; this.pos = null; }
    for (const i of cells.slice(1)) {
      const c = at(i); if (!c) continue;
      const tag = el('div', 'boss-tag'); tag.append(el('div', 'uname', v.name));
      c.append(tag); v.tags.push(tag);
    }
  }

  paint(v) {
    const hp = Math.max(0, v.hp);
    if (v.bars > 1 && v.barHp > 0) { // ชุด 69: บอสหลายแถบ → หลอดแสดงแถบที่อยู่ตอนนี้ สีต่างกันทุกแถบ (ใต้หลอด = สีแถบถัดไป)
      const k = Math.max(1, Math.min(v.bars, Math.ceil(hp / v.barHp)));
      v.hpFill.style.width = `${hp > 0 ? Math.min(100, ((hp - (k - 1) * v.barHp) / v.barHp) * 100) : 0}%`;
      v.hpFill.style.background = barColor(k);
      v.hpBar.style.background = k > 1 ? barColor(k - 1) : '';
      v.barText.textContent = `แถบ ${hp > 0 ? k : 0}/${v.bars}`;
    } else v.hpFill.style.width = `${(hp / v.maxHp) * 100}%`;
    v.armorFill.style.width = `${Math.min(100, (v.armor / v.maxHp) * 100)}%`;
    v.hpText.textContent = `${hp}/${v.maxHp}`;
    // set 159: the word hides on short phone screens (.wd) → "+6" in the armor colour, same as the armor bar
    if (v.armor > 0) { const w = document.createElement('span'); w.className = 'wd'; w.textContent = 'เกราะ '; v.armorText.replaceChildren(w, `${v.armor}`); } else v.armorText.textContent = '';
    v.burnEl.textContent = v.burn > 0 ? `ไฟ ${v.burn}` : '';
    v.shockEl.textContent = v.shock > 0 ? `ช็อต ${v.shock}` : '';
    v.burnEl.hidden = !(v.burn > 0); v.shockEl.hidden = !(v.shock > 0);
    v.multiEl.textContent = v.multi > 1 ? `×${v.multi}` : ''; v.multiEl.hidden = !(v.multi > 1); // ×1 ไม่แสดง
    v.card.classList.toggle('down', v.down);
    for (const t of v.tags || []) t.classList.toggle('down', v.down);
  }

  // ชุด 30.4: มัลติฮิตแสดงเป็นการพุ่ง 1 ครั้ง + ตัวเลขดาเมจรวม 1 อัน (เลข HP ยังตรงตามจริงทุกฮิต)
  lungeMs() { return 260 / Math.max(this.speed, 0.5); }
  later(ms, fn) { if (ms <= 0 || this.fast) fn(); else setTimeout(() => { if (!this.fast) fn(); }, ms); }
  // ตำแหน่งกลางช่อง: วัดครั้งเดียวต่อสนาม (ช่องไม่ขยับระหว่างสู้) · เลื่อนหน้าจอไม่กระทบเพราะใช้ระยะห่างระหว่างช่อง
  center(cell) {
    if (!this.pos) { this.pos = new Map(); for (const c of this.root.querySelectorAll('.cell')) { const r = c.getBoundingClientRect(); this.pos.set(c, [r.left + r.width / 2, r.top + r.height / 2]); } }
    return this.pos.get(cell) || [0, 0];
  }
  // ทิศจากผู้ตีไปเป้า (หน่วย px) สำหรับพุ่งเข้าหา
  towards(a, t, dist) {
    if (!t) return [a.side === 0 ? dist : -dist, 0];
    const [x1, y1] = this.center(a.cell), [x2, y2] = this.center(t.cell);
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    return [dx / L * dist, dy / L * dist];
  }
  // วาดทุกอย่างที่เปลี่ยนในเฟรมนี้ครั้งเดียว: หลอดเลือด/ป้าย แล้วตัวเลขลอย (รวมดาเมจต่อผู้ตี→เป้า)
  flush() {
    for (const v of this.dirty) this.paint(v);
    this.dirty.clear();
    if (!this.pend.size) return;
    const list = [...this.pend.values()]; this.pend.clear();
    if (this.fast) return;
    for (const p of list) {
      const show = () => {
        this.float(p.v, `-${p.amount}`, p.cls);
        if (!this.reduced && p.flash) {
          const f = p.from != null ? this.units.get(p.from) : null, [x, y] = f ? this.towards(f, p.v, -4) : [0, 0];
          p.v.card.animate([{ filter: 'brightness(1.9)', transform: `translate(${x}px,${y}px)` }, { filter: 'none', transform: 'translate(0,0)' }], { duration: 180 / Math.min(this.speed, 2) });
        }
      };
      if (p.flash && p.from != null) this.later(this.lungeMs() * 0.4, show); else show(); // ตัวเลขขึ้นตอนพุ่งถึงเป้า
    }
  }

  float(v, text, cls) {
    if (this.fast) return;
    // ชุด 24: ความเร็วสูง (8× 16×) ตัวเลขลอยถี่มาก → ค้างได้ไม่เกิน 3 อันต่อช่อง และหายเร็วขึ้น กันซ้อนจนอ่านไม่ออก
    const old = v.cell.querySelectorAll('.float');
    if (old.length >= 3) old[0].remove();
    const f = el('span', `float ${cls}`, text);
    v.cell.append(f);
    const dur = 900 / Math.min(this.speed, this.speed >= 8 ? 4 : 2);
    const a = f.animate(this.reduced
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [{ transform: 'translate(-50%, 0)', opacity: 1 }, { transform: 'translate(-50%, -26px)', opacity: 0 }], { duration: dur, easing: 'ease-out' });
    a.onfinish = () => f.remove();
  }

  name(uid) { const u = this.units.get(uid); return `${u.side === 0 ? 'ซ้าย' : 'ขวา'} ${u.id}`; }

  apply(e) {
    const s = sec(e.t);
    this.ver = (this.ver || 0) + 1; // set 84: anything changed → live info panel repaints
    switch (e.k) {
      case 'stat': { const v = this.units.get(e.to); if (v) v.stat = { ...(v.stat || {}), ...e.s }; break; } // set 84: live stats (simulate opts.live)
      case 'set': {
        const a = this.units.get(e.who);
        if (!this.reduced && !this.fast) {
          // พุ่งเข้าหาเป้า 1 ครั้งต่อชุด (มัลติฮิตก็พุ่งครั้งเดียว · ชุด 30.4) · ไม่มีเป้า = ขยับเบาๆ
          const [x, y] = this.towards(a, e.target != null ? this.units.get(e.target) : null, e.target != null ? 16 : 6);
          a.card.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${x}px,${y}px) scale(1.06)`, offset: 0.4 }, { transform: 'translate(0,0)' }],
            { duration: this.lungeMs(), easing: 'ease-out' });
        }
        if (Number.isInteger(e.hits) && e.hits >= 1 && e.hits !== a.multi) { a.multi = e.hits; this.dirty.add(a); } // มัลติฮิตปัจจุบัน (สกิลเพิ่มได้กลางแมตช์)
        if (e.target != null && this.wantLog) this.onLog(`${s} ${this.name(e.who)} → ${this.name(e.target)} ชุดที่ ${e.n} (${e.hits} ฮิต)`);
        break;
      }
      case 'dmg': {
        const v = this.units.get(e.to);
        v.armor -= e.absorbed; v.hp -= e.amount - e.absorbed;
        // ชุด 30.4: รวมดาเมจที่เกิดในเฟรมเดียวกันต่อ (เป้า, ผู้ตี, ชนิด) เป็นตัวเลขเดียว แล้วแสดงตอน flush
        if (!this.fast) {
          const cls = WHY_CLASS[e.why] || 'n-hit', key = `${e.to}|${e.from ?? ''}|${cls}`, p = this.pend.get(key);
          if (p) p.amount += e.amount;
          else this.pend.set(key, { v, amount: e.amount, cls, from: e.from, flash: e.why !== 'burn' && e.why !== 'storm' });
        }
        if (this.wantLog) this.onLog(`${s} ${this.name(e.to)} โดน${WHY_TEXT[e.why] || ''} ${e.amount}${e.absorbed ? ` (เกราะกัน ${e.absorbed})` : ''}`);
        this.dirty.add(v); break;
      }
      case 'chainAbsorb': { const v = this.units.get(e.to); v.armor = Math.max(0, v.armor - e.amount); this.dirty.add(v); break; } // set 168 S4: armor took the chain shock
      case 'armor': { const v = this.units.get(e.to); v.armor += e.amount; this.float(v, `+${e.amount} เกราะ`, 'n-armor'); this.dirty.add(v); this.wantLog && this.onLog(`${s} ${this.name(e.to)} ได้เกราะ ${e.amount}`); break; }
      case 'burnLeft': { const v = this.units.get(e.to); v.burn = e.total; this.dirty.add(v); break; } // ไฟลดลงหลังทำดาเมจ
      case 'burn': case 'shock': { const v = this.units.get(e.to); v[e.k] = e.total; this.dirty.add(v); this.wantLog && this.onLog(`${s} ${this.name(e.to)} ติด${e.k === 'burn' ? 'ไฟ' : 'ช็อต'} +${e.amount} (รวม ${e.total})`); break; }
      case 'heal': { const v = this.units.get(e.to); v.hp += e.amount; this.float(v, `+${e.amount}`, 'n-heal'); this.dirty.add(v); this.wantLog && this.onLog(`${s} ${this.name(e.to)} ฟื้น HP ${e.amount}`); break; }
      case 'atkUp': this.wantLog && this.onLog(`${s} ${this.name(e.to)} พลังโจมตี +${e.amount}`); break;
      case 'cdCut': this.wantLog && this.onLog(`${s} ${this.name(e.to)} คูลดาวน์ลด ${e.ms / 1000} วิ`); break;
      case 'cdPct': this.wantLog && this.onLog(`${s} ${this.name(e.to)} คูลดาวน์ −${e.pct}% ทั้งแมตช์`); break;
      case 'bossMove': { const v = this.units.get(e.who); if (v) this.placeCells(v, [e.slot]); break; }
      case 'phase': { const v = this.units.get(e.who); if (v && e.cells) this.placeCells(v, e.cells); break; }
      case 'proc': { const v = this.units.get(e.who); if (v && e.si != null) v.procs.set(e.si, (v.procs.get(e.si) || 0) + 1); } if (this.onProc) this.onProc(e, s, this.name(e.who)); break; // หน้าที่รู้จักสกิลเขียนข้อความเอง
      case 'maxhp': { const v = this.units.get(e.to); v.maxHp = e.maxHp; v.hp = Math.min(v.hp, e.hp); this.float(v, e.amount < 0 ? `HP สูงสุด +${-e.amount}` : `HP สูงสุด −${e.amount}`, e.amount < 0 ? 'n-heal' : 'n-hit'); this.dirty.add(v); this.wantLog && this.onLog(`${s} ${this.name(e.to)} HP สูงสุด ${e.amount < 0 ? `+${-e.amount} (คืนเป็น ${e.maxHp})` : `−${e.amount} (เหลือ ${e.maxHp})`}`); break; }
      case 'carry': this.wantLog && this.onLog(`${s} ${this.name(e.by)} พา ${this.name(e.who)} ไปตี ${this.name(e.target)}`); break; // ชุด 20
      case 'reflectDebuff': this.wantLog && this.onLog(`${s} ${this.name(e.from)} สะท้อน${e.kind === 'burn' ? 'ไฟ' : e.kind === 'shock' ? 'ช็อต' : 'คูลดาวน์ช้าลง'} กลับไปหา ${this.name(e.to)}`); break;
      case 'cleanse': if (e.what === 'pct') { const v = this.units.get(e.to); v.burn = e.burn; v.shock = e.shock; this.dirty.add(v); this.wantLog && this.onLog(`${s} ${this.name(e.to)} ล้างไฟ −${e.cut[0]} ช็อต −${e.cut[1]}`); break; } if (e.what === 'bar') { const v = this.units.get(e.to); v.burn = v.shock = 0; this.float(v, 'ขึ้นแถบใหม่ ล้างดีบัฟ', 'n-heal'); this.dirty.add(v); this.wantLog && this.onLog(`${s} ${this.name(e.to)} ขึ้นแถบเลือดใหม่ ล้างดีบัฟทั้งหมด`); break; } { const v = this.units.get(e.to); v.burn = 0; if (e.what !== 'burn') v.shock = 0; this.dirty.add(v); this.wantLog && this.onLog(`${s} ${this.name(e.to)} ${e.what === 'burn' ? 'ไฟดับ' : 'ล้างสถานะ'}`); break; }
      case 'buff': if (e.what === 'hpUp') { const v = this.units.get(e.to); v.maxHp += e.amount; v.hp += e.amount; this.dirty.add(v); this.wantLog && this.onLog(`${s} ${this.name(e.to)} HP สูงสุด +${e.amount}`); } break;
      case 'down': { const v = this.units.get(e.who); v.down = true; v.hp = 0; v.armor = v.burn = v.shock = 0; this.dirty.add(v); this.wantLog && this.onLog(`${s} ${this.name(e.who)} ล้ม`); break; }
      case 'revive': { const v = this.units.get(e.who); v.hp = e.hp; v.armor = v.burn = v.shock = 0; v.down = false; this.float(v, 'ลุกกลับมา', 'n-heal'); this.dirty.add(v); this.wantLog && this.onLog(`${s} ${this.name(e.who)} ลุกกลับมา HP ${e.hp}`); break; }
      case 'summon': { const o = this.units.get(e.from); if (o) o.card.remove(); const v = this.addUnit(e.unit); this.float(v, 'ถูกเรียกมา', 'n-heal'); this.wantLog && this.onLog(`${s} ${this.name(e.from)} เรียก ${this.name(e.who)} มาสู้แทน`); break; }
      case 'steal': { const v = this.units.get(e.to); v.shock = e.total; this.dirty.add(v); this.wantLog && this.onLog(`${s} ${this.name(e.from)} ดูดช็อต ${e.amount} จาก ${this.name(e.to)}`); break; }
      case 'end': this.ended = true; this.playing = false; this.onEnd(e.winner, this.result.timeMs); break;
    }
  }

  play() {
    if (this.ended) return;
    this.playing = true;
    let last = performance.now();
    const step = now => {
      if (!this.playing) return;
      this.clock += (now - last) * this.speed; last = now;
      while (this.i < this.events.length && this.events[this.i].t <= this.clock) this.apply(this.events[this.i++]);
      this.flush();
      this.onTime(Math.min(this.clock, this.result.timeMs));
      if (!this.ended) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
  pause() { this.playing = false; cancelAnimationFrame(this.raf); }
  skip() { this.pause(); this.fast = true; while (this.i < this.events.length) this.apply(this.events[this.i++]); this.flush(); this.fast = false; this.onTime(this.result.timeMs); }
}

export const sec = t => `${(t / 1000).toFixed(1)} วิ`;

