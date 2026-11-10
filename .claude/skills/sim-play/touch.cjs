const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport:{width:844,height:390}, isMobile:true, hasTouch:true });
  const pg = await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+process.argv[2]); await pg.fill('#nameIn','t'); await pg.tap('#nameGo');
  const cdp = await ctx.newCDPSession(pg);
  const tdrag = async (a, z) => { const A = await pg.locator(a).boundingBox(), Z = await pg.locator(z).boundingBox();
    const p = (x,y)=>[{x,y}]; let x=A.x+A.width/2, y=A.y+A.height/2, X=Z.x+Z.width/2, Y=Z.y+Z.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:p(x,y)});
    for (let i=1;i<=12;i++) { await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:p(x+(X-x)*i/12,y+(Y-y)*i/12)}); await pg.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await pg.waitForTimeout(200); };
  await tdrag('#shop [data-ref="s:0"]','#bench [data-ref="n:0"]');
  console.log('shop→bench', await pg.evaluate('!!P.bench[0]'));
  await tdrag('#bench [data-ref="n:0"]','#board [data-ref="b:0:0"]');
  console.log('bench→board', await pg.evaluate('!!P.board[0][0]'));
  await tdrag('#board [data-ref="b:0:0"]','#board [data-ref="b:2:1"]');
  console.log('board→board', await pg.evaluate('!!P.board[2][1]'));
  await pg.tap('#board [data-ref="b:2:1"]'); await pg.waitForTimeout(200);
  console.log('tap pane', await pg.isVisible('#sidePane'));
  await tdrag('#board [data-ref="b:2:1"]','#reroll'); console.log('sell', await pg.evaluate('P.board.flat().every(x=>!x)'));
  await pg.tap('#shopLv'); console.log('popup', await pg.evaluate("document.getElementById('dlg').open"));
  await pg.screenshot({path:process.argv[3]});
  console.log('errs', errs); await b.close();
})();
