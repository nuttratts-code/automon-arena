'use strict';
// set 296 (owner A1+A3, B1 C1 D1 E1): pixel-art checker for the hub — pure functions, no DOM writes.
// Input = RGBA pixels at native pixel size. Output = issues {lvl ok|warn|bad, key, text, pts [[x,y]...], frames?}.
// Thresholds are first guesses (ค่าเสนอ) tuned on the 48×48 PixelLab stills of set 258–283.
const PXC = (() => {
  const MAX = 256; // bigger pictures are not pixel sprites (painted / video stills) unless they are a clean ×N blow-up
  const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  function hsv(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let hh = 0;
    if (d) hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(hh * 60 + 360) % 360, mx ? d / mx : 0, mx / 255];
  }
  // CIE Lab distance (ΔE76) — "two colours look the same"
  function lab(r, g, b) {
    const f = (c) => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; };
    const R = f(r), G = f(g), B = f(b);
    const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
    return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))];
  }
  const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const hex = (c) => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');

  // a big picture made of N×N blocks → shrink to native pixels; null = not a pixel sprite
  function blockSize(d, W, H) {
    const same = (i, j) => d[i] === d[j] && d[i + 1] === d[j + 1] && d[i + 2] === d[j + 2] && d[i + 3] === d[j + 3];
    let g = 0;
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    for (let y = 0; y < H; y += Math.max(1, H >> 5)) { let run = 1; for (let x = 1; x <= W; x++) { if (x < W && same((y * W + x) * 4, (y * W + x - 1) * 4)) run++; else { g = gcd(g, run); run = 1; } } }
    return g;
  }
  function shrink(d, W, H, k) {
    const w = W / k, hgt = H / k, o = new Uint8ClampedArray(w * hgt * 4);
    for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) { const s = ((y * k) * W + x * k) * 4, t = (y * w + x) * 4; for (let c = 0; c < 4; c++) o[t + c] = d[s + c]; }
    return o;
  }
  function prepare(d, W, H) {
    if (W <= MAX && H <= MAX) return { d, W, H, k: 1 };
    const k = blockSize(d, W, H);
    if (k > 1 && W % k === 0 && H % k === 0 && W / k <= MAX && H / k <= MAX) return { d: shrink(d, W, H, k), W: W / k, H: H / k, k };
    return null;
  }

  // one picture (still or one frame)
  function analyse(d0, W0, H0) {
    const P = prepare(d0, W0, H0);
    if (!P) return { pixel: false, issues: [['warn', 'big', `ภาพ ${W0}×${H0} ไม่ใช่ภาพพิกเซล (ใหญ่เกิน ${MAX} px และไม่ใช่ภาพขยายเท่าตัว) ตรวจข้อพิกเซลไม่ได้`, []]].map(mk) };
    const { d, W, H, k } = P;
    const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[(y * W + x) * 4 + 3]);
    const key = (x, y) => { const i = (y * W + x) * 4; return (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; };
    const solid = (x, y) => A(x, y) === 255;
    const issues = [];
    // colours
    const cnt = new Map(), semi = [];
    let body = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = A(x, y);
      if (!a) continue;
      if (a < 255) { semi.push([x, y]); continue; }
      body++; const kk = key(x, y); cnt.set(kk, (cnt.get(kk) || 0) + 1);
    }
    if (!body) return { pixel: true, W, H, k, palette: [], issues: [mk(['bad', 'empty', 'ภาพว่าง ไม่มีเม็ดทึบเลย', []])] };
    const pal = [...cnt].map(([kk, n]) => { const c = [kk >> 16, (kk >> 8) & 255, kk & 255]; return { k: kk, c, n, hex: hex(c), L: lum(...c), lab: lab(...c), hsv: hsv(...c) }; }).sort((a, b) => b.n - a.n);
    const byKey = new Map(pal.map((p) => [p.k, p]));
    const ptsOf = (pred) => { const o = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid(x, y) && pred(key(x, y), x, y)) o.push([x, y]); return o; };

    issues.push(semi.length ? ['bad', 'semi', `จุดโปร่งครึ่งๆ ${semi.length} เม็ด (ขอบฟุ้ง) ในเกมจะเห็นเป็นขอบจางหรือขอบสีแปลก`, semi] : ['ok', 'semi', 'ไม่มีจุดโปร่งครึ่งๆ', []]);
    issues.push(pal.length > 32 ? ['bad', 'count', `ใช้ ${pal.length} สี เยอะเกินภาพพิกเซล (ปกติ 8–24) ภาพจะดูเลอะ`, []]
      : pal.length > 24 ? ['warn', 'count', `ใช้ ${pal.length} สี ค่อนข้างเยอะ ลองรวมสีที่ใกล้กัน`, []] : ['ok', 'count', `ใช้ ${pal.length} สี`, []]);

    // near-duplicate colours: the smaller one of each pair is marked
    const near = [];
    for (let i = 0; i < pal.length; i++) for (let j = i + 1; j < pal.length; j++) if (dE(pal[i].lab, pal[j].lab) < 7) near.push([pal[i], pal[j]]);
    if (near.length) {
      const minor = new Set(near.map(([a, b]) => (a.n >= b.n ? b.k : a.k)));
      issues.push(['warn', 'near', `สีเกือบซ้ำ ${near.length} คู่ (${near.slice(0, 4).map(([a, b]) => a.hex + '≈' + b.hex).join(', ')}${near.length > 4 ? ' …' : ''}) ตาแยกไม่ออก ทำให้ภาพเลอะ รวมเป็นสีเดียวได้`, ptsOf((kk) => minor.has(kk))]);
    } else issues.push(['ok', 'near', 'ไม่มีสีเกือบซ้ำ', []]);

    // edge pixels = solid pixels touching see-through (4 sides). Outline colour = the most common edge colour.
    const isEdge = (x, y) => solid(x, y) && (!A(x - 1, y) || !A(x + 1, y) || !A(x, y - 1) || !A(x, y + 1));
    const edgeCnt = new Map(); let edgeN = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isEdge(x, y)) { edgeN++; const kk = key(x, y); edgeCnt.set(kk, (edgeCnt.get(kk) || 0) + 1); }
    const olK = [...edgeCnt].sort((a, b) => b[1] - a[1])[0][0], ol = byKey.get(olK);
    const inner = (x, y) => { // mean lightness of the solid pixels one step inside
      let s = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (solid(x + dx, y + dy) && !isEdge(x + dx, y + dy)) { s += byKey.get(key(x + dx, y + dy)).L; n++; }
      return n ? s / n : null;
    };
    const light = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!isEdge(x, y)) continue;
      const L = byKey.get(key(x, y)).L, inL = inner(x, y);
      // sel-out is fine (edge darker than inside); flagged = edge clearly lighter than the outline AND not darker than the inside
      if (L > ol.L + 0.25 && (inL === null || L >= inL - 0.02)) light.push([x, y]);
    }
    const olDark = ol.L < 0.3;
    issues.push(!olDark ? ['warn', 'edge', `เส้นขอบหลักเป็นสี ${ol.hex} ไม่ใช่สีเข้ม ตัวอาจกลืนกับฉาก`, []]
      : light.length > Math.max(3, edgeN * 0.06) ? ['bad', 'edge', `ขอบขาด / ขอบสว่าง ${light.length} เม็ด (จาก ${edgeN}) เส้นขอบเข้มไม่ต่อกัน`, light]
        : light.length ? ['warn', 'edge', `ขอบสว่างบางจุด ${light.length} เม็ด ดูว่าตั้งใจไหม`, light] : ['ok', 'edge', `เส้นขอบเข้ม ${ol.hex} ต่อกันดี`, []]);

    // L-corners: an outline pixel with two perpendicular outline neighbours whose diagonal is open → extra corner pixel (not pixel-perfect)
    const isOl = (x, y) => solid(x, y) && key(x, y) === olK;
    const lc = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!isOl(x, y) || !isEdge(x, y)) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => isOl(x + dx, y + dy));
      if (nb.length !== 2 || nb[0][0] === -nb[1][0] && nb[0][1] === -nb[1][1]) continue;
      const [ax, ay] = nb[0], [bx, by] = nb[1];
      // outer corner (both other sides open) with the inside diagonal filled = the corner pixel can go, the line stays joined
      if (!A(x - ax, y - ay) && !A(x - bx, y - by) && solid(x + ax + bx, y + ay + by)) lc.push([x, y]);
    }
    issues.push(lc.length > 10 ? ['warn', 'corner', `มุมขอบเป็นตัว L ${lc.length} จุด เส้นดูหนาเป็นหยัก ลบเม็ดมุมได้`, lc] : ['ok', 'corner', lc.length ? `มุมตัว L ${lc.length} จุด (น้อย รับได้)` : 'ไม่มีมุมขอบตัว L', lc]);

    // orphans: a solid pixel unlike all 8 neighbours. Floating specks (no solid neighbour) are bad.
    const orph = [], speck = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!solid(x, y)) continue;
      const me = key(x, y), p = byKey.get(me);
      let same = 0, sol = 0, sL = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (A(x + dx, y + dy)) { sol++; if (solid(x + dx, y + dy)) { const kk = key(x + dx, y + dy); if (dE(byKey.get(kk).lab, p.lab) < 7) same++; sL += byKey.get(kk).L; } }
      }
      if (!sol) speck.push([x, y]);
      else if (!same && sol >= 6 && me !== olK && Math.abs(p.L - sL / sol) > 0.2) orph.push([x, y]);
    }
    if (speck.length) issues.push(['bad', 'speck', `เม็ดลอยหลุดจากตัว ${speck.length} เม็ด (ไม่ติดกับอะไรเลย)`, speck]);
    issues.push(orph.length > Math.max(14, body * 0.025) ? ['warn', 'orphan', `เม็ดเดี่ยวแปลกปลอม ${orph.length} เม็ด ภาพดูเป็นจุดๆ (ตา/ประกายตั้งใจได้)`, orph]
      : ['ok', 'orphan', orph.length ? `เม็ดเดี่ยว ${orph.length} เม็ด (น้อย ปกติเป็นตา/ประกาย)` : 'ไม่มีเม็ดเดี่ยวแปลกปลอม', orph]);

    // readability: lightness spread of the body (outline excluded) — a flat grey view = hard to read
    const Ls = []; for (const p of pal) if (p.k !== olK) for (let i = 0; i < Math.min(p.n, 400); i++) Ls.push(p.L);
    Ls.sort((a, b) => a - b);
    const q = (f) => Ls[Math.min(Ls.length - 1, Math.floor(Ls.length * f))] ?? 0;
    const spread = q(0.9) - q(0.1);
    issues.push(spread < 0.18 ? ['warn', 'value', `ความสว่างของตัวใกล้กันมาก (ช่วง ${Math.round(spread * 100)}%) ภาพขาวดำจะแบน มองไม่ออกว่าส่วนไหนเป็นอะไร`, []]
      : ['ok', 'value', `ความสว่างต่างกันพอ (ช่วง ${Math.round(spread * 100)}%)`, []]);

    // grey shading: a dull, darker colour that mostly sits next to one saturated lighter colour = shadow done by adding grey/black
    const grey = [];
    for (const p of pal) {
      if (p.k === olK || p.hsv[1] > 0.14 || p.L < 0.08) continue;
      const near2 = new Map(); let tot = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!solid(x, y) || key(x, y) !== p.k) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (solid(x + dx, y + dy)) { const kk = key(x + dx, y + dy); if (kk !== p.k && kk !== olK) { near2.set(kk, (near2.get(kk) || 0) + 1); tot++; } }
      }
      const top = [...near2].sort((a, b) => b[1] - a[1])[0];
      if (!top || top[1] < tot * 0.5) continue;
      const nb = byKey.get(top[0]);
      if (nb.hsv[1] > 0.35 && nb.L > p.L + 0.05 && p.n >= 3) grey.push(p);
    }
    if (grey.length) { const gs = new Set(grey.map((p) => p.k)); issues.push(['warn', 'grey', `เงาเป็นสีเทาเฉยๆ ${grey.map((p) => p.hex).join(', ')} บนส่วนที่มีสี เงาควรเข้มขึ้นและเหลือบสี (เช่น ส้ม→แดงเข้ม) ไม่ใช่เทา`, ptsOf((kk) => gs.has(kk))]); }
    else issues.push(['ok', 'grey', 'เงาไม่เป็นสีเทาตุ่น', []]);

    // light direction: where the bright side of the body is (centroid-weighted lightness)
    let cx = 0, cy = 0, n = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid(x, y) && !isEdge(x, y)) { cx += x; cy += y; n++; }
    let lx = 0, ly = 0, mL = 0;
    if (n) {
      cx /= n; cy /= n;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid(x, y) && !isEdge(x, y)) mL += byKey.get(key(x, y)).L;
      mL /= n;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid(x, y) && !isEdge(x, y)) { const v = byKey.get(key(x, y)).L - mL; lx += v * (x - cx); ly += v * (y - cy); }
      const m = Math.hypot(lx, ly) / n;
      const dir = (ly < -Math.abs(lx) * 0.4 ? 'บน' : ly > Math.abs(lx) * 0.4 ? 'ล่าง' : '') + (lx < -Math.abs(ly) * 0.4 ? 'ซ้าย' : lx > Math.abs(ly) * 0.4 ? 'ขวา' : '');
      if (m < 0.02) issues.push(['ok', 'light', 'แสงเงาบนตัวกระจายเท่าๆ กัน (ไม่เห็นทิศแสงชัด)', []]);
      else { const below = ly > Math.abs(lx) * 2 && m > 0.04; // only a clear light-from-below is flagged; body shape skews the rest
        issues.push([below ? 'warn' : 'ok', 'light', `ด้านสว่างอยู่ทาง${dir || 'กลาง'}${below ? ' แสงมาจากด้านล่าง ดูแปลกในฉากที่แดดมาจากบน' : ''}`, []]); }
    }
    return { pixel: true, W, H, k, palette: pal.map(({ c, n, hex: hx }) => ({ c, n, hex: hx })), outline: ol.hex, issues: issues.map(mk) };
  }
  function mk([lvl, key, text, pts]) { return { lvl, key, text, pts }; }

  // a frame sheet: every frame checked + frame-to-frame problems. frames = [{d, W, H}]; still = palette hexes of the ★ still (optional)
  function analyseFrames(frames, stillHex) {
    const per = frames.map((f) => analyse(f.d, f.W, f.H));
    const out = [];
    const W = frames[0].W, H = frames[0].H;
    if (!per[0].pixel) return { per, issues: per[0].issues };
    // merge per-frame issues by key: worst level, total marks, list of frames
    const rank = { ok: 0, warn: 1, bad: 2 };
    const keys = [...new Set(per.flatMap((p) => p.issues.map((i) => i.key)))];
    for (const k of keys) {
      const hits = per.map((p, fi) => [fi, p.issues.find((i) => i.key === k)]).filter(([, i]) => i);
      const worst = hits.reduce((a, [, i]) => (rank[i.lvl] > rank[a.lvl] ? i : a), hits[0][1]);
      const bad = hits.filter(([, i]) => i.lvl !== 'ok').map(([fi]) => fi);
      out.push({ lvl: worst.lvl, key: k, text: worst.text + (bad.length && worst.lvl !== 'ok' ? ` · เฟรม ${bad.map((f) => f + 1).join(', ')}` : ''), pts: worst.pts, frames: Object.fromEntries(hits.filter(([, i]) => i.pts.length).map(([fi, i]) => [fi, i.pts])) });
    }
    // flicker: a pixel that goes A → B → A over 3 frames while its neighbours stay put
    const px = (f, x, y) => { const i = (y * W + x) * 4, d = frames[f].d; return d[i + 3] < 128 ? -1 : (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; };
    const n = frames.length, fl = {};
    let flN = 0;
    const raw = per[0].k === 1; // a ×N blow-up sheet: per-frame checks ran on shrunk pixels, frame-to-frame marks would not line up → skipped
    if (n >= 3 && raw) for (let f = 0; f < n; f++) {
      const a = (f - 1 + n) % n, b = (f + 1) % n, pts = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const v = px(f, x, y), pa = px(a, x, y);
        if (v === pa || pa !== px(b, x, y)) continue;
        let still = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (px(a, x + dx, y + dy) === px(f, x + dx, y + dy)) still++;
        if (still === 4) pts.push([x, y]);
      }
      if (pts.length) { fl[f] = pts; flN += pts.length; }
    }
    const flF = Object.keys(fl).map(Number);
    out.push(flN > 2 * n ? { lvl: 'warn', key: 'flicker', text: `เม็ดกระพริบ ${flN} จุด (เม็ดเปลี่ยนสีแวบเดียวแล้วกลับ) ตอนเล่นจะเห็นเป็นจุดสั่น · เฟรม ${flF.map((f) => f + 1).join(', ')}`, pts: fl[flF[0]] || [], frames: fl }
      : { lvl: 'ok', key: 'flicker', text: flN ? `เม็ดกระพริบ ${flN} จุด (น้อย รับได้)` : 'ไม่มีเม็ดกระพริบ', pts: [], frames: fl });
    // feet row: the lowest solid row must stay the same in every frame
    const feet = frames.map((fr) => { for (let y = H - 1; y >= 0; y--) for (let x = 0; x < W; x++) if (fr.d[(y * W + x) * 4 + 3] >= 128) return y; return -1; });
    const fmin = Math.min(...feet), fmax = Math.max(...feet);
    out.push(fmax - fmin > 0 ? { lvl: 'warn', key: 'feet', text: `เท้าขยับขึ้นลง ${fmax - fmin} px ระหว่างเฟรม (แถวล่างสุด ${feet.map((v) => v + 1).join(' ')}) ในเกมตัวจะลอย/จม`, pts: [], frames: {} }
      : { lvl: 'ok', key: 'feet', text: 'เท้าอยู่แถวเดียวกันทุกเฟรม', pts: [], frames: {} });
    // colours the ★ still does not have (art-style V2.7: idle palette comes from the still)
    if (raw && stillHex && stillHex.length) {
      const allow = stillHex.map((x) => lab(parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)));
      const newCol = new Map(), marks = {};
      per.forEach((p, fi) => p.palette && p.palette.forEach((c) => { if (!allow.some((a) => dE(a, lab(...c.c)) < 4)) newCol.set(c.hex, (newCol.get(c.hex) || 0) + c.n); }));
      if (newCol.size) {
        frames.forEach((fr, fi) => { const pts = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (fr.d[i + 3] === 255 && newCol.has(hex([fr.d[i], fr.d[i + 1], fr.d[i + 2]]))) pts.push([x, y]); } if (pts.length) marks[fi] = pts; });
        const mf = Object.keys(marks).map(Number);
        out.push({ lvl: 'warn', key: 'newcol', text: `มี ${newCol.size} สีที่ภาพนิ่ง ★ ไม่มี (${[...newCol.keys()].slice(0, 5).join(', ')}${newCol.size > 5 ? ' …' : ''}) ชุดสีท่ายืนควรมาจากภาพนิ่ง · เฟรม ${mf.map((f) => f + 1).join(', ')}`, pts: marks[mf[0]] || [], frames: marks });
      } else out.push({ lvl: 'ok', key: 'newcol', text: 'ทุกสีมาจากภาพนิ่ง ★', pts: [], frames: {} });
    }
    return { per, issues: out, palette: per[0].palette, outline: per[0].outline, W, H, k: per[0].k };
  }
  return { analyse, analyseFrames, lum, hex };
})();
if (typeof module !== 'undefined') module.exports = PXC;
