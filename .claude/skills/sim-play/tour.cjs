const { chromium } = require('playwright');
const [,, PAGE, OUT, SCHEME] = process.argv;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport:{width:844,height:390}, isMobile:true, hasTouch:true, colorScheme: SCHEME });
  const pg = await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await pg.goto('file://'+PAGE); await pg.fill('#nameIn','tour'); await pg.click('#nameGo');
  let n=0; const snap = async t => pg.screenshot({path:`${OUT}/${SCHEME}-${String(++n).padStart(2,'0')}-${t}.png`});
  const step = async (t, fn) => { try { await fn(); } catch (e) { errs.push(`STEP ${t}: ${e.message.split('\n')[0]}`); await snap('FAIL-'+t); try { await pg.evaluate('closePop()'); } catch {} } };
  const takeOffer = async () => { if (await pg.isVisible('#offerDlg')) { await pg.click('#offer button'); if (await pg.$('#flagPick')) await pg.click('#flagPick [data-tribe]'); } if (await pg.evaluate("document.getElementById('dlg').open")) await pg.evaluate('closePop()'); };
  for (let r=0;r<5;r++) { await takeOffer(); await pg.evaluate(()=>{botShop(P,chars,RULES);botPlaceRunes(P,CM,RULES);render();}); await pg.click('#fight'); if (!(await pg.evaluate("document.getElementById('app').classList.contains('fighting')"))) await pg.click('#fight');
    await pg.click('#skip'); await pg.waitForSelector('#result:not([hidden])'); if (r===4) break; await pg.click('#next'); await pg.waitForTimeout(200); }
  await snap('result');
  await step('mx', async () => { await pg.click('#toMx'); await pg.waitForTimeout(400); await snap('mx');
    const tabs = await pg.$$('#mxTabs button'); for (let i=1;i<tabs.length;i++){ await tabs[i].click(); await pg.waitForTimeout(200); await snap('mxtab'+i); }
    await pg.click('#mxClose'); });
  await pg.click('#next'); await pg.waitForTimeout(200); await takeOffer();
  await pg.evaluate(()=>{botShop(P,chars,RULES);botPlaceRunes(P,CM,RULES);render();});
  await snap('prep');
  for (const id of ['tribeBtn','runeBtn','replayBtn','diffInfo','legendBtn','shopLv']) await step(id, async () => { if (!(await pg.isVisible('#'+id))) { console.log('hidden',id); return; } await pg.click('#'+id); await pg.waitForTimeout(200); await snap(id);
    const sc = await pg.evaluate("(()=>{const d=document.querySelector('dialog[open]'); if(!d) return 0; const els=[d,...d.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+4 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)); els.forEach(e=>e.scrollTop=1e5); return els.length})()");
    if (sc) await snap(id+'-bottom'); await pg.evaluate('closePop()'); });
  await step('menu', async () => { await pg.click('#menuBtn'); await snap('menu'); await pg.click('#menuBtn'); });
  await step('pane', async () => { const ref = await pg.evaluate("(()=>{for(let r=0;r<3;r++)for(let l=0;l<2;l++)if(P.board[r][l])return `b:${r}:${l}`})()"); await pg.click(`#board [data-ref="${ref}"]`); await snap('pane');
    const i = await pg.evaluate("P.shop.findIndex(s=>s&&s.id)"); if (i>=0) { await pg.evaluate("document.getElementById('sidePane').hidden=true"); await pg.click(`#shop [data-ref="s:${i}"]`); await snap('pane-shop'); } });
  await step('replay', async () => { if (await pg.isVisible('#replayBtn')) { await pg.click('#replayBtn'); await snap('replays'); const btn = await pg.$('#pop .acts button, #pop li button'); if (btn) { await btn.click(); await pg.waitForTimeout(1500); await snap('replay'); } await pg.evaluate('closePop()'); } });
  await pg.setViewportSize({width:390,height:844}); await pg.waitForTimeout(300); await snap('portrait');
  console.log(SCHEME, 'errs', JSON.stringify(errs)); await b.close();
})();
