const { chromium, devices } = require('playwright');
const OUT = process.argv[2], PAGE = process.argv[3], SEED = +(process.argv[4]||1);
const issues = []; const note = (k, m) => { issues.push(`[${k}] ${m}`); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage();
  pg.on('console', m => { if (m.type() === 'error' || m.type()==='warning') note('console', m.text().slice(0, 200)); });
  pg.on('pageerror', e => note('pageerror', e.message.slice(0, 300)));
  await pg.goto('file://' + PAGE);
  await pg.fill('#nameIn', 'sim'); await pg.click('#nameGo');
  let shot = 0;
  const snap = async t => { await pg.screenshot({ path: `${OUT}/${String(++shot).padStart(3,'0')}-${t}.png` }); };
  // layout audit: visible interactive/text elements cut off by viewport or overlapping siblings
  const audit = async tag => {
    const r = await pg.evaluate(() => {
      const W = innerWidth, H = innerHeight, out = [];
      const de = document.documentElement; if (de.scrollWidth > W + 1 || de.scrollHeight > H + 1) out.push(`page scroll ${de.scrollWidth}x${de.scrollHeight}`);
      const vis = e => { const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.checkVisibility?.() !== false; };
      const els = [...document.querySelectorAll('button, [role=button], input, select, a, .cell, .slot')].filter(vis);
      for (const e of els) { const r = e.getBoundingClientRect(); const id = e.id || e.dataset.ref || (e.textContent||'').trim().slice(0,20) || e.className;
        if (r.right > W + 1 || r.bottom > H + 1 || r.left < -1 || r.top < -1) {
          // ignore if inside a scrollable container that clips
          let p = e.parentElement, clipped = false; while (p) { const s = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(s.overflow + s.overflowY + s.overflowX) && p !== document.body && p !== de) { const pr = p.getBoundingClientRect(); if (pr.bottom <= H + 1 && pr.right <= W + 1) clipped = true; break; } p = p.parentElement; }
          if (!clipped) out.push(`off-screen ${e.tagName} "${id}" ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`); }
        if ((e.tagName === 'BUTTON') && (r.height < 24 || r.width < 24)) out.push(`tiny button "${id}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      // text overflow in buttons / labels
      for (const e of document.querySelectorAll('button, .pill, h2, h3, .slot, .chip')) if (vis(e) && (e.scrollWidth > e.clientWidth + 2) && getComputedStyle(e).overflow !== 'visible') out.push(`text clipped "${(e.id||e.textContent||'').trim().slice(0,30)}" ${e.scrollWidth}>${e.clientWidth}`);
      // overlap between visible buttons (topmost check: element at centre is not itself or child)
      for (const e of els.filter(e => e.tagName === 'BUTTON')) { const r = e.getBoundingClientRect(); const cx = r.left + r.width/2, cy = r.top + r.height/2; if (cx < 0 || cy < 0 || cx > W || cy > H) continue; const t = document.elementFromPoint(cx, cy); if (t && t !== e && !e.contains(t) && !t.contains(e) && !t.closest('dialog,#result')) out.push(`covered button "${(e.id||e.textContent||'').trim().slice(0,20)}" by ${t.tagName}#${t.id}.${String(t.className).slice(0,30)}`); }
      return out;
    });
    for (const x of r) note('layout:' + tag, x);
  };
  const fighting = () => pg.evaluate("document.getElementById('app').classList.contains('fighting')");
  const drag = async (a, bsel) => { const ba = await pg.locator(a).boundingBox(), bb = await pg.locator(bsel).boundingBox(); if (!ba || !bb) return false;
    const x = ba.x + ba.width/2, y = ba.y + ba.height/2; await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.move(x+15, y+5, { steps: 3 }); await pg.mouse.move(bb.x+bb.width/2, bb.y+bb.height/2, { steps: 8 }); await pg.mouse.up(); return true; };
  for (let round = 1; round <= 40; round++) {
    if (!(await pg.isVisible('#app'))) break;
    // offer
    if (await pg.isVisible('#offerDlg')) { await snap(`r${round}-offer`); await audit(`r${round}-offer`); await pg.click('#offer button'); if (await pg.$('#flagPick')) await pg.click('#flagPick [data-tribe]'); }
    if (await pg.evaluate("document.getElementById('dlg').open")) { await snap(`r${round}-dlg`); await audit(`r${round}-dlg`); await pg.evaluate('closePop()'); }
    await snap(`r${round}-prep`); await audit(`r${round}-prep`);
    // buy: drag affordable shop cards onto empty bench cells
    for (let k = 0; k < 6; k++) {
      const plan = await pg.evaluate(() => { const i = P.shop.findIndex(s => s && s.id && CM[s.id].price <= P.gold); const n = P.bench.findIndex(x => !x); return i >= 0 && n >= 0 ? [i, n] : null; });
      if (!plan) break; const g0 = await pg.evaluate('P.gold');
      await drag(`#shop [data-ref="s:${plan[0]}"]`, `#bench [data-ref="n:${plan[1]}"]`);
      if (await pg.evaluate('P.gold') === g0) { note('play', `r${round} buy drag did nothing (shop ${plan[0]} → bench ${plan[1]})`); break; }
      if (await pg.isVisible('#offerDlg')) break;
    }
    if (await pg.evaluate("document.getElementById('dlg').open")) { await snap(`r${round}-dlg2`); await pg.evaluate('closePop()'); }
    // place: bench → empty board cells
    for (let k = 0; k < 6; k++) {
      const plan = await pg.evaluate(() => { const n = P.bench.findIndex(x => x); if (n < 0) return null; for (let r = 0; r < P.board.length; r++) for (let l = 0; l < P.board[r].length; l++) if (!P.board[r][l]) return [n, r, l]; return null; });
      if (!plan) break; const before = await pg.evaluate('JSON.stringify(P.board)');
      await drag(`#bench [data-ref="n:${plan[0]}"]`, `#board [data-ref="b:${plan[1]}:${plan[2]}"]`);
      if (await pg.evaluate('JSON.stringify(P.board)') === before) { const m = await pg.evaluate('JSON.stringify(msgs)'); note('play', `r${round} place drag blocked ${plan} msgs=${m.slice(0,150)}`); break; }
    }
    if (process.argv[5]==='bot') { await pg.evaluate(() => { botShop(P, chars, RULES); botPlaceRunes(P, CM, RULES); render(); }); }
    await snap(`r${round}-placed`); await audit(`r${round}-placed`);
    if (await pg.isVisible('#offerDlg')) { await pg.click('#offer button'); if (await pg.$('#flagPick')) await pg.click('#flagPick [data-tribe]'); if (await pg.evaluate("document.getElementById('dlg').open")) await pg.evaluate('closePop()'); }
    await pg.click('#fight');
    if (!(await fighting())) { await snap(`r${round}-fightwarn`); await pg.click('#fight'); }
    if (!(await fighting())) { note('play', `r${round} fight did not start: ${(await pg.evaluate('JSON.stringify(msgs)')).slice(0,200)}`); await snap(`r${round}-nofight`); break; }
    await pg.waitForTimeout(1500); await snap(`r${round}-battle`); await audit(`r${round}-battle`);
    if (await pg.isVisible('#skip')) await pg.click('#skip');
    try { await pg.waitForSelector('#result:not([hidden])', { timeout: 60000 }); } catch { note('play', `r${round} result never shown`); await snap(`r${round}-stuck`); break; }
    await pg.waitForTimeout(300); await snap(`r${round}-result`); await audit(`r${round}-result`);
    await pg.click('#next'); await pg.waitForTimeout(300);
    if (await pg.isVisible('#runEnd')) { await snap('runend'); await audit('runend'); break; }
  }
  const st = await pg.evaluate('({round:P.round,wins:P.wins,hearts:P.hearts,over:P.over})');
  console.log(JSON.stringify(st));
  // dedupe
  const cnt = {}; for (const i of issues) cnt[i.replace(/r\d+-/,'rN-')] = (cnt[i.replace(/r\d+-/,'rN-')]||0)+1;
  for (const [k, v] of Object.entries(cnt)) console.log(v + 'x ' + k);
  await b.close();
})();
