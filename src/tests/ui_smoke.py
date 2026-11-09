# ทดสอบหน้าเว็บจริงด้วย Chromium (Playwright): python3 -I tests/ui_smoke.py <โฟลเดอร์ที่มีไฟล์ .html> <โฟลเดอร์รูป>
import sys, json, os
from playwright.sync_api import sync_playwright
D=sys.argv[1]; O=sys.argv[2]; errs=[]; fails=[]
KEEPNAME="""(()=>{const n=localStorage.getItem('automon-player-name-v1');localStorage.clear();if(n)localStorage.setItem('automon-player-name-v1',n);})()"""  # set 110: wipe game storage but keep the player name (else every reload stops at the name screen)
def chk(c,msg):
    if not c: fails.append(msg)
with sync_playwright() as p:
    _x=os.environ.get('CHROMIUM_PATH') or ('/opt/pw-browsers/chromium' if os.path.exists('/opt/pw-browsers/chromium') else None)  # cloud container: pre-installed browser
    b=p.chromium.launch(executable_path=_x, args=['--no-sandbox']) if _x else p.chromium.launch()
    for w,h in [(1100,900),(390,844)]:
        ctx=b.new_context(viewport={'width':w,'height':h})
        pg=ctx.new_page()
        pg.route('**/*', lambda r: r.abort() if not r.request.url.startswith('file:') else r.continue_())
        pg.on('pageerror', lambda e: errs.append((w,'pageerror',str(e))))
        pg.on('console', lambda m: errs.append((w,'console',m.text)) if m.type=='error' and 'net::' not in m.text else None)
        # 1 system check (ทุกข้อต้องผ่าน: ตัวเลขหน้า / หลังต้องเท่ากัน)
        pg.goto(f'file://{D}/system-check.html'); pg.wait_for_function("document.querySelector('#summary .big').textContent.includes('/')", timeout=240000)
        t=pg.inner_text('#summary'); print(w,'check',t.split('\n')[0])
        import re
        mm=re.search(r'(\d+)\s*/\s*(\d+)', t); chk(mm and mm.group(1)==mm.group(2), 'check page')
        # 2 game (set 97: landscape one-screen page · game checks at 1366×768 and 844×390 · portrait = rotate screen)
        gw,gh=(1366,768) if w>700 else (844,390)
        pg.set_viewport_size({'width':gw,'height':gh})
        pg.goto(f'file://{D}/game.html')
        # set 110: a fresh device asks the player name first (fuller name tests further down)
        chk(pg.is_visible('#nameScr') and pg.evaluate('P') is None,'first open: name screen before the run')
        pg.fill('#nameIn','ทดสอบ'); pg.click('#nameGo')
        def noscroll(tag):
            r=pg.evaluate('[document.documentElement.scrollWidth,document.documentElement.scrollHeight,innerWidth,innerHeight]')
            chk(r[0]<=r[2]+1 and r[1]<=r[3]+1,'no page scroll %s %s' % (tag,r))
        fighting=lambda: pg.evaluate("document.getElementById('app').classList.contains('fighting')")
        in_prep=lambda: pg.is_visible('#app') and not fighting()
        def esc(): pg.evaluate("closePop()")
        def pick_offer():  # set 124: picking a rune that must be worn auto-opens its #dlg popup (run.template renderRunes) → close it, else the next click is blocked (flaky gate fail, run 611)
            if not pg.is_visible('#offerDlg'): return False
            pg.click('#offer button')
            if pg.query_selector('#flagPick'): pg.click('#flagPick [data-tribe]')  # set 142: ธงเผ่า asks the tribe first
            if pg.evaluate("document.getElementById('dlg').open"): esc()
            return True
        def drag(a,b):
            ba=pg.locator(a).bounding_box(); bb=pg.locator(b).bounding_box()
            x,y=ba['x']+ba['width']/2, ba['y']+ba['height']/2
            pg.mouse.move(x,y); pg.mouse.down(); pg.mouse.move(x+15,y+5,steps=3)
            pg.mouse.move(bb['x']+bb['width']/2, bb['y']+bb['height']/2, steps=8); pg.mouse.up()
        noscroll('prep')
        # set 159: portrait (after "ใช้แนวตั้งต่อ") must not run off-screen (HUD was 886 px wide on a 390 px phone)
        pg.set_viewport_size({'width':390,'height':844})
        if pg.is_visible('#rotateSkip'): pg.click('#rotateSkip')
        noscroll('portrait prep'); pg.set_viewport_size({'width':gw,'height':gh})
        chk(len(pg.query_selector_all('#bench .cell'))==5 and pg.evaluate('P.bench.length')==5,'bench has 5 cells')
        chk(len(pg.query_selector_all('#board .cell'))==6 and pg.is_hidden('#arena'),'prep shows only my 3x2 (enemy hidden)')
        # set 89/96: shop level follows the round · next-round income on the dock · odds in the shop popup · reroll costs 1 (set 98)
        chk(pg.query_selector('#upShop') is None and 'Lv 1' in pg.inner_text('#shopLv') and '→ 2' in pg.inner_text('#shopLv') and ('+%d' % pg.evaluate('baseIncomeAt(2)')) in pg.inner_text('#shopLv'),'shop level + next-round income on dock')
        chk(pg.query_selector('#shop .slot .rar') is None,'set 159: shop cards show rarity by ring colour only (no text)')
        pg.click('#shopLv'); chk(pg.is_visible('#dlg') and 'ธรรมดา' in pg.inner_text('#shopOdds') and 'รอบหน้า Lv 2' in pg.inner_text('#pop'),'shop popup: odds + next level')
        pg.keyboard.press('Escape'); chk(pg.is_hidden('#dlg'),'Esc closes popup')
        chk('· 1' in pg.inner_text('#reroll'),'reroll cost 1 (set 98)')
        # set 94/95: runes (HUD bag popup → detail) · difficulty in HUD + "?" popup · win offer = blocking popup
        chk(pg.query_selector('#rShop') is None and pg.query_selector('#rReroll') is None,'no rune shop')
        g0=pg.evaluate('P.gold'); pg.evaluate("P.rn.bag={T4:1};render()")
        chk(pg.inner_text('#runeCnt')=='1','rune count on HUD')
        pg.click('#runeBtn'); chk(len(pg.query_selector_all('#rBag .pitem'))==1,'rune popup lists held rune')
        pg.click('#rBag .pitem'); chk('← กลับ' in pg.inner_text('#pop') and pg.query_selector('#pop .rcard') is not None,'rune detail popup')
        pg.click('#pop button:has-text("← กลับ")'); chk(pg.query_selector('#rBag') is not None,'rune detail back to list'); esc()
        # set 109: a "one" rune is worn by a unit (not a slot) · unworn = red HUD badge + list warning · worn → no warning, follows the unit
        pg.evaluate("P.board[0][0]={uid:P.uid++,id:chars[0].id,level:1,perm:{},paid:1};P.rn.bag={C3:1};P.rn.at={};render()")
        chk('ยังไม่สวม 1' in pg.inner_text('#runeWarn') and pg.is_visible('#runeWarn') and 'warn' in pg.get_attribute('#runeBtn','class'),'unworn rune → warning on HUD')
        pg.click('#runeBtn'); chk('ยังไม่ได้สวม' in pg.inner_text('#rBag'),'rune list says not worn')
        pg.click('#rBag .pitem'); pg.select_option('#pop select','0,0')
        chk(pg.evaluate('P.rn.at.C3===P.board[0][0].uid') and pg.inner_text('#runeCnt')=='1' and pg.is_hidden('#runeWarn') and 'warn' not in pg.get_attribute('#runeBtn','class'),'wear on a unit → stored as uid, warning gone')
        chk('พุ่งชน' in pg.inner_text('#board'),'rune name shown on the wearer')
        pg.evaluate("P.bench[0]=P.board[0][0];P.board[0][0]=null;render()"); chk(pg.is_visible('#runeWarn'),'wearer on the bench → warning')
        esc(); pg.evaluate("P.rn.bag={T4:1};P.rn.at={};P.bench[0]=null;render()")
        # set 128: T4 free reroll usable with 0 gold · T3 8 shop slots in one row · X3 merge hints at 2 · T8 pick tribe · X9 mini board + locked enemy
        gS=pg.evaluate('P.gold'); shop0=pg.evaluate('JSON.stringify(P.shop)')
        pg.evaluate("P.rn.free=1;P.gold=0;render()"); chk('ฟรี 1' in pg.inner_text('#reroll') and not pg.is_disabled('#reroll'),'T4: free reroll shows ฟรี + enabled with 0 gold')
        pg.click('#reroll'); chk(pg.evaluate('P.rn.free')==0 and pg.evaluate('P.gold')==0 and pg.is_disabled('#reroll'),'T4: free reroll used, then disabled (no gold)')
        pg.evaluate("P.gold=99;while(P.shop.length<8)P.shop.push({id:chars[P.shop.length].id,locked:false});render()")
        tops=pg.evaluate("[...document.querySelectorAll('#shop .slot')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.top),Math.round(r.right),Math.round(r.width)]})")
        chk(len(tops)==8 and len(set(t[0] for t in tops))==1 and max(t[1] for t in tops)<=pg.evaluate('innerWidth') and min(t[2] for t in tops)>=40,'T3: 8 shop slots in one row %s' % tops)
        noscroll('8 shop slots')
        pg.evaluate("(()=>{const id=chars[0].id;P.board[0][0]={uid:P.uid++,id,level:1,perm:{},paid:1};P.bench[0]={uid:P.uid++,id,level:1,perm:{},paid:1};P.shop[0]={id,locked:false};P.rn.bag={X3:1};P.rn.at={X3:P.board[0][0].uid};render()})()")
        chk(pg.evaluate("mergeTargets(P.bench[0]).length")==2 and 'ready' in pg.get_attribute('#shop [data-ref=\"s:0\"]','class'),'X3: 2 copies = merge target + shop ready glow')
        pg.evaluate("P.rn.bag={};P.rn.at={};render()"); chk(pg.evaluate("mergeTargets(P.bench[0]).length")==0 and 'ready' in pg.get_attribute('#shop [data-ref=\"s:0\"]','class'),'no X3: 2 copies not a merge target (shop: buy 3rd = ready)')
        pg.evaluate("P.rn.offer={kind:'win',ids:['T8']};render()"); pg.click('#offer button')
        chk(pg.is_visible('#flagPick') and len(pg.query_selector_all('#flagPick [data-tribe]'))>=1 and pg.evaluate("Object.keys(P.rn.bag).length")==0,'T8: taking the flag asks the tribe first')
        tr=pg.get_attribute('#flagPick [data-tribe]','data-tribe'); pg.click('#flagPick [data-tribe]')
        chk(pg.is_hidden('#offerDlg') and pg.evaluate("P.rn.bag.T8")==1 and pg.evaluate("P.rn.ft.T8[0]")==tr and pg.evaluate("rnCompact(P).find(x=>x.id==='T8').t[0]")==tr,'T8: picked tribe stored + used in the fight list')
        esc(); pg.evaluate("P.rn.bag={X9:1};P.rn.ft={};render()")
        f1=pg.evaluate("JSON.stringify(nextFoe().team)"); pg.evaluate("P.board[2][1]={uid:P.uid++,id:chars[5].id,level:2,perm:{},paid:3};render()")
        chk(pg.evaluate("JSON.stringify(nextFoe().team)")==f1,'X9: enemy locked (board change does not re-pick)')
        pg.click('#runeBtn'); pg.click('#rBag .pitem'); chk(len(pg.query_selector_all('#foeMini .fmcell'))==6 and len(pg.query_selector_all('#foeMini .fmcell:not(.empty)'))==len(pg.evaluate("nextFoe().team")),'X9: rune popup shows the enemy mini board')
        esc(); pg.click('#diffInfo'); chk(pg.query_selector('#pop #foeMini') is not None,'X9: enemy popup shows the mini board'); esc()
        pg.evaluate("P.gold=%d;P.shop=JSON.parse(%r);P.board=[[null,null],[null,null],[null,null]];P.bench=P.bench.map(()=>null);P.rn.bag={T4:1};P.rn.at={};P.rn.ft={};P.rn.offer=null;render()" % (gS, shop0))
        # set 119: no modes · HUD shows enemy strength % (100 normal run, no streak · 120 in extra matches) · "?" popup = enemy % + card %
        chk(pg.query_selector('[data-diff]') is None and pg.inner_text('#foePct')=='100%','no mode buttons, enemy 100%')
        pg.click('#diffInfo'); chk('ตำนาน 10%' in pg.inner_text('#diffHint') and '100%' in pg.inner_text('#diffHint'),'enemy % + card %'); esc()
        pg.evaluate("P.ws=3;render()"); chk(pg.inner_text('#foePct')=='100%','set 119: win streak no longer raises the enemy')
        pg.evaluate("P.extra=true;render()"); chk(pg.inner_text('#foePct')=='120%','extra matches → 120%'); pg.evaluate("P.ws=0;P.extra=false;render()")
        pg.click('#diffInfo'); chk('ไม่เห็นทีมศัตรู' in pg.inner_text('#scoutBox'),'enemy hidden without scout rune'); esc()
        pg.evaluate("rnMakeOffer(P,'win');render()"); chk(pg.is_visible('#offerDlg') and len(pg.query_selector_all('#offer .rcard'))==3,'offer popup 3 cards')
        # set 100: reroll the cards — 1 free, then 3 gold
        ids0=pg.evaluate('P.rn.offer.ids.join()'); gR=pg.evaluate('P.gold')
        chk('ฟรี' in pg.inner_text('#offerReroll'),'reroll free first'); pg.click('#offerReroll')
        chk(pg.evaluate('P.rn.offer.ids.join()')!=ids0 and pg.evaluate('P.gold')==gR and '3 เงิน' in pg.inner_text('#offerReroll'),'free reroll → new cards, next costs 3')
        pg.evaluate("P.gold=2;render()"); chk(pg.is_disabled('#offerReroll'),'not enough gold → reroll disabled'); pg.evaluate("P.gold=%d;render()" % gR)
        pg.keyboard.press('Escape'); chk(pg.is_visible('#offerDlg'),'offer popup ignores Esc')
        pg.evaluate("document.getElementById('fight').click()"); chk(not fighting() and 'เลือกรูน' in pg.evaluate('JSON.stringify(msgs)'),'fight blocked until offer picked')
        pg.click('#offer button')
        if pg.query_selector('#flagPick'): pg.click('#flagPick [data-tribe]')  # set 142: the random first card can be ธงเผ่า (T8) → it asks the tribe first; was the flaky "offerDlg intercepts" gate fail
        chk(pg.is_hidden('#offerDlg') and pg.evaluate('Object.values(P.rn.bag).reduce((a,b)=>a+b,0)')==2,'offer taken')
        esc()  # set 109: a picked rune that must be worn opens its popup
        pg.evaluate("P.gold=%d;P.rn.bag={};P.rn.at={};P.rn.pt={};render()" % g0)
        # set 97: tap = details popup only (never moves) · drag = buy / move / sell
        pg.evaluate("P.gold=60;render()")
        i=pg.evaluate("P.shop.findIndex(s=>s.id)")
        # set 121 (user picked design 1): details = floating card beside the tapped unit (no popup, never scrolls)
        pg.click('#shop [data-ref="s:%d"]' % i); chk(pg.is_hidden('#dlg') and pg.query_selector('#sidePane #info') is not None and pg.is_visible('#sidePane'),'tap shop card shows the floating card (no popup)')
        pg.click('#sidePane button.primary'); chk(pg.is_hidden('#dlg') and pg.evaluate('P.bench[0]!==null') and pg.evaluate("document.querySelector('#sidePane #info h2').textContent.startsWith(P.bench[0].id)"),'buy from pane goes to bench, pane follows the bought unit')
        pg.click('#bench [data-ref="n:0"]'); chk(pg.is_hidden('#dlg') and pg.query_selector('#sidePane #info') is not None and pg.evaluate('P.bench[0]!==null && P.board.flat().every(x=>!x)'),'tap own unit shows pane, does not move')
        drag('#bench [data-ref="n:0"]','#board [data-ref="b:0:0"]')
        chk(pg.evaluate('P.bench[0]===null && P.board[0][0]!==null') and pg.is_hidden('#dlg'),'drag bench to board moves')
        j=pg.evaluate("P.shop.findIndex(s=>s.id&&CM[s.id].price<=P.gold)")
        if j>=0: drag('#shop [data-ref="s:%d"]' % j,'#bench [data-ref="n:2"]'); chk(pg.evaluate('P.bench[2]!==null'),'drag shop card to bench buys')
        g1=pg.evaluate('P.gold'); paid=pg.evaluate('P.board[0][0].paid')
        drag('#board [data-ref="b:0:0"]','#reroll')
        chk(pg.evaluate('P.board[0][0]===null') and pg.evaluate('P.gold')==g1+paid,'drag unit to dock sells')
        pg.evaluate("(()=>{const i=P.bench.findIndex(Boolean); if(i>=0) act({at:'bench',i},{at:'board',row:1,lane:0});})()")
        # set 116 (mockup): bench row + inline tribe cards (desktop) · ⋯ menu holds new run · fight button shows units on the field
        chk(pg.inner_text('#benchCnt')==('%d/5' % pg.evaluate('P.bench.filter(Boolean).length')) and 'ลงสนาม' in pg.inner_text('#fight'),'bench count + fight button count')
        chk(pg.query_selector('#tribeRow') is None and pg.is_visible('#tribeBtn'),'tribes via HUD button')
        # set 169 (UI ease set 1): legend popup (6 tribes + 5 rarities) · fight button says what to do next and looks secondary until a unit is on the board
        pg.click('#legendBtn'); chk(pg.is_visible('#dlg') and pg.evaluate("document.querySelectorAll('#pop .lgi').length")==11,'legend button opens shapes/rarity/stars legend')
        pg.keyboard.press('Escape'); chk(pg.is_hidden('#dlg'),'legend closes with Esc')
        cue=pg.evaluate("(()=>{const B=[P.board,P.bench];P.board=P.board.map(r=>r.map(()=>null));P.bench=P.bench.map(()=>null);render();const a=[$('fightN').textContent,$('fight').classList.contains('wait'),$('fight').classList.contains('ready')];P.bench[0]={uid:P.uid++,id:chars[0].id,level:1,perm:{},paid:0};render();a.push($('fightN').textContent);P.board=B[0];P.bench=B[1];render();a.push($('fight').classList.contains('ready'));return a})()")
        chk('ซื้อตัว' in cue[0] and cue[1] and not cue[2] and 'ลากตัว' in cue[3] and cue[4],'fight button cue: empty = buy first + secondary · bench only = drag · units = ready: '+str(cue))
        # set 121: card beside the unit, inside the screen, no content cut off for ANY character (shop + own unit with perm), closes on outside tap / Esc
        ov=pg.evaluate("(()=>{const out=[],e=$('sidePane'),keep=JSON.stringify([P.board,P.shop,P.gold]);const B=P.board.map(r=>r.slice());for(const c of chars){P.board=B.map(r=>r.map(()=>null));P.board[1][1]={uid:P.uid++,id:c.id,level:2,perm:{atk:3,hp:5},paid:1};render();sel={uid:P.board[1][1].uid};renderSide();const r=e.getBoundingClientRect();if(cardOver(e)>1||r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1)out.push(c.id+':'+cardOver(e));P.shop[0]={id:c.id};render();sel={at:'shop',i:0,id:c.id};renderSide();if(cardOver(e)>1)out.push('shop '+c.id+':'+cardOver(e))}const k=JSON.parse(keep);P.board=k[0];P.shop=k[1];P.gold=k[2];sel=null;render();return out})()")
        chk(ov==[] and pg.is_hidden('#sidePane'),'card fits every character, no scrolling: '+str(ov))
        u=pg.evaluate("(()=>{for(const [r,row] of P.board.entries())for(const [l,x] of row.entries())if(x)return 'b:'+r+':'+l;return null})()")
        if u:
            pg.click('#board [data-ref="%s"]' % u); chk(pg.is_visible('#sidePane') and 'picked' in pg.get_attribute('#board [data-ref="%s"]' % u,'class'),'tap unit opens card')
            pg.mouse.click(5, 3); chk(pg.is_hidden('#sidePane') and pg.evaluate('sel')==None,'tap outside closes card')
            pg.click('#board [data-ref="%s"]' % u); pg.keyboard.press('Escape'); chk(pg.is_hidden('#sidePane'),'Esc closes card')
        pg.click('#menuBtn'); chk(pg.is_visible('#newRun'),'menu shows new run'); pg.keyboard.press('Escape'); chk(pg.is_hidden('#menu'),'Esc closes menu')
        pg.click('#tribeBtn'); chk(len(pg.query_selector_all('#tribeList .pitem'))>=1,'tribe popup lists tribes')
        pg.click('#tribeList .pitem'); chk(pg.query_selector('#pop .btbl') is not None and '← กลับ' in pg.inner_text('#pop'),'tribe detail popup'); esc()
        pg.evaluate("P.gold=%d;render()" % g0)
        res=[]; maxBoard=0; titles=[]; offers=0; first=True  # set 87: every round's title (the last match can be a boss round)
        BUY="""(()=>{for(let k=0;k<5;k++){const i=P.shop.findIndex(s=>s.id&&RULES.shop.prices[CM[s.id].rarity]<=P.gold); if(i<0)break; tap({at:'shop',i}); const btn=document.querySelector('#sidePane button.primary'); if(!btn||btn.disabled)break; btn.click();}})()"""
        PLACE="""(()=>{for(let i=0;i<P.bench.length;i++){if(!P.bench[i])continue;const cells=[...document.querySelectorAll('#board .cell')];const free=cells.find(c=>!c.classList.contains('filled'));if(!free)break;act({at:'bench',i},parseRef(free.dataset.ref));}})()"""
        for rnd in range(14):
            if pg.evaluate('P.over'): break
            if pick_offer(): offers+=1  # set 94: win → pick a free rune first (set 109: worn-rune popup closed inside)
            pg.evaluate(BUY)
            # move from the bench to free board cells through act() (the same path a drag ends in)
            pg.evaluate(PLACE)
            maxBoard=max(maxBoard,pg.evaluate('teamEntries(P).length'))
            pg.click('#fight')
            if not fighting() and 'ยืนยัน' in pg.inner_text('#fight'): pg.click('#fight')
            if first:
                chk(fighting() and pg.is_visible('#arena') and len(pg.query_selector_all('#arena .side'))==2 and pg.is_hidden('.prepdock'),'battle on the same field: both teams shown, dock = battle controls')
                noscroll('battle')
                chk(pg.is_hidden('#benchbar') and pg.is_hidden('#runeBtn') and pg.is_visible('#battleTitle'),'battle: no bench row, HUD shows match title')
                rk=pg.evaluate("(()=>{const u=[...view.units.values()].filter(v=>v.cell); const a=u.find(v=>v.side===0), b=u.find(v=>v.side===1); if(!a||!b) return 'none'; const L=[{id:'C3',n:1,s:[a.row,a.lane]},{id:'C7',n:1}], R=[{id:'C4',n:1,s:[b.row,b.lane]}]; placeRunes(L,R); const r=[a.cell.querySelector('.rune-dot')?.textContent||'', b.cell.querySelector('.rune-dot')?.textContent||'', $('rnL').textContent, $('rnR').textContent]; a.cell.querySelectorAll('.rune-dot').forEach(x=>x.remove()); b.cell.querySelectorAll('.rune-dot').forEach(x=>x.remove()); placeRunes([],[]); return r;})()")
                chk(rk=='none' or (rk[0].startswith('◆') and rk[1].startswith('◆') and 'รูนทีม' in rk[2] and rk[3]==''),'set 120: runes shown on the battle field, both sides: '+str(rk))
                cell=pg.query_selector('#arena .side-a .cell .unit')
                if cell:
                    cell.click(); chk(pg.is_hidden('#dlg') and pg.is_visible('#bPane #bInfo') and pg.is_visible('#btext') and pg.evaluate("cardOver($('bPane'))")<=1,'tap unit in battle shows floating live card (ticker stays)')
                    st=pg.evaluate("(()=>{if(view.ended) return 'ended'; $('stop').click(); return [view.playing, view.clock];})()"); pg.wait_for_timeout(300)  # JS click: the match may end any moment (result card covers the dock)
                    chk(st=='ended' or (st[0]==False and pg.evaluate('view.clock')==st[1] and 'เล่นต่อ' in pg.inner_text('#stop')),'stop pauses the match')
                    pg.evaluate("document.querySelector('#bPane .bx').click()"); chk(pg.is_hidden('#bPane') and pg.is_visible('#btext'),'✕ closes the battle card')
                    pg.evaluate("$('stop').click()"); chk(pg.evaluate('view.playing || view.ended'),'stop again resumes')
            pg.click('#skip'); pg.wait_for_selector('#next', state='visible', timeout=60000)  # ชุด 19: รอหน้าผลก่อน
            if not res: chk(pg.is_visible('#rChips') and pg.inner_text('#resultTitle') in ('ชนะ!','แพ้','เสมอ') and pg.inner_text('#resultNext').startswith('ต่อไป'),'result card: big word + chips + next step')
            res.append(pg.inner_text('#resultTitle').split('\n')[0]); titles.append(pg.text_content('#battleTitle'))
            if first:
                rnd0=pg.evaluate('P.round'); t0=pg.inner_text('#resultTitle'); c0=pg.inner_text('#clock')
                pg.click('#replayThis'); chk(pg.is_hidden('#result') and pg.is_visible('#replayTag'),'result: replay this match starts')
                pg.click('#skip'); pg.wait_for_selector('#next', state='visible', timeout=60000)
                chk(pg.inner_text('#resultTitle')==t0 and pg.inner_text('#clock')==c0 and pg.evaluate('P.round')==rnd0,'replay this match = same result, run unchanged')
                pg.click('#toMx'); chk(pg.is_visible('#mxDlg') and pg.is_visible('#mxBody'),'match details popup'); pg.click('#mxClose')
                first=False
            rnd1=pg.evaluate('P.round'); over1=pg.evaluate('P.over')
            pg.click('#next')
            if not over1:  # set 98: result card closes, a second press cannot start another round
                chk(pg.is_hidden('#result'),'next round: result card closes')
                pg.evaluate("document.getElementById('next').click()")
                chk(pg.evaluate('P.round')==rnd1+1,'next round: pressing again does not skip a round')
        print(w,'game rounds',len(res),res[-3:], 'over',pg.evaluate('P.over'), 'max board',maxBoard)
        chk(len(res)>=3,'game rounds')
        chk(offers>0 or not any(x.startswith('ชนะ') or x.startswith('เสมอ') for x in res[:-1]),'win offers a rune (%d)' % offers)
        if not pg.evaluate('P.over'): chk(('Lv %d/' % min(pg.evaluate('P.round'),15)) in pg.inner_text('#shopLv'),'shop level rose with rounds')
        # ชุด 23: ทีมบอทเตรียมไว้ผ่านตัวตรวจ และหัวแมตช์บอกขั้น/ระดับคู่แข่ง
        chk(pg.evaluate('BOT_OK') and any('คู่แข่ง: ทีมบอทรอบ' in t for t in titles),'preset bot teams active')
        chk(maxBoard>=3,'units moved from bench to board')
        # ชุด 24: ปุ่มความเร็ว 8× 16× · ร้านไฮไลต์ตัวที่มีแล้ว · คำอธิบายสกิลครบ 3 เลเวล
        chk(pg.eval_on_selector_all('[data-speed]','e=>e.map(b=>b.dataset.speed)')==['1','2','4','8','16'],'speed buttons 1-16')
        # set 106: auto-skip toggle · buy + merge by dropping a shop card on an owned Lv1 copy (works with a full bench) · no English "down" in game texts
        chk(pg.is_visible('#autoSkip') or pg.query_selector('#autoSkip') is not None,'auto-skip button')
        bm=pg.evaluate("""(()=>{const keep=JSON.stringify(P); const id=chars[0].id;
          P.over=false; P.gold=99; P.shop[0]={id,locked:false};
          P.board=[[null,null],[null,null],[null,null]]; P.bench=P.bench.map((_,i)=>({uid:900+i,id:chars[1].id,level:1,perm:{},paid:1}));
          P.board[0][0]={uid:990,id,level:1,perm:{},paid:1}; P.board[1][0]={uid:991,id,level:1,perm:{},paid:1};
          act({at:'shop',i:0},{at:'board',row:0,lane:0}); const u=P.board[0][0], out=[u&&u.level, P.board[1][0], P.shop[0].id, P.bench.every(Boolean)];
          P=JSON.parse(keep); render(); return out;})()""")
        chk(bm==[2,None,None,True],'shop card dropped on own copy = buy + merge, full bench ok '+str(bm))
        chk('down' not in pg.evaluate("GLOSSARY.map(x=>x.join(' ')).join(' ')"),'glossary has no English down')
        if not pg.evaluate('P.over'):
            pick_offer()
            own=pg.evaluate("""(()=>{const ids=new Set(allUnits(P).map(x=>x.u.id)); const want=P.shop.filter(s=>s.id&&ids.has(s.id)).length; return [want, document.querySelectorAll('#shop .slot.owned').length];})()""")
            chk(own[0]==own[1],'shop owned highlight '+str(own))
            lv=pg.evaluate("""(()=>{const x=allUnits(P).find(x=>CM[x.u.id].skills.some(s=>!s.lv&&new Set(s.v).size>1)); if(!x) return 'none'; tap(x.ref); const b=document.querySelector('#info .lv-now'); closePop(); return b?b.textContent:'missing';})()""")
            chk(lv!='missing','skill current level highlighted '+str(lv))
            # ชุด 26: ปุ่มสลับ Lv1/2/3 ในป๊อปอัปรายละเอียด · ค่าพลังเปลี่ยนตามเลเวลที่เลือก · แสดงทุกค่า
            tg=pg.evaluate("""(()=>{const x=allUnits(P)[0]; if(!x) return 'none'; tap(x.ref); const c=CM[x.u.id];
              const bs=[...document.querySelectorAll('#info .lvtabs button')]; if(bs.length!==3) return 'buttons '+bs.length;
              bs[2].click(); const t=document.querySelector('#info .stats2').textContent;
              const r=[t.includes('HP '+c.hp[2]), t.includes('เกราะ/ฮิต'), t.includes('ฟื้น/ฮิต'), document.querySelector('#info .lvtabs [aria-pressed="true"]').dataset.lv]; closePop(); return r;})()""")
            chk(tg!='none' and tg[:3]==[True,True,True] and tg[3]=='3','level toggle in info popup '+str(tg))
        # ชุด 25: รูปตัวละครรายตัว (ลวดลาย + ขอบความหายาก) · รีเพลย์ทุกแมตช์ · บันทึกการต่อสู้ละเอียด
        mon=pg.evaluate("[document.querySelectorAll('.mon').length, document.querySelectorAll('.mon svg.pat g > *').length>0, [...document.querySelectorAll('.mon')].every(m=>m.querySelector('svg.pat'))]")
        chk(mon[0]>0 and mon[1] and mon[2],'unit shapes have patterns '+str(mon))
        chk(pg.evaluate('replays.length')==len(res) and pg.evaluate("readReplays(localStorage.getItem('automon-run-replays-v1'),CM,RULES,DATA_HASH,P.seed).status")=='ok','replays stored per match '+str(pg.evaluate('replays.length')))
        chk(pg.evaluate('parseRunCode(runCode(),CM,RULES).runs[0].list.length')==len(res),'run code carries this run (set 105)')
        pg.evaluate("openPop('runcode')"); chk(pg.input_value('#runCodeText').startswith('ARUN1 '),'run code box (clipboard fallback)'); pg.evaluate('closePop()')
        over_now=pg.evaluate('P.over')
        rnd0=pg.evaluate('P.round')
        if over_now: pg.click('#endReplays li button >> nth=0')
        else:
            pg.click('#replayBtn'); chk(len(pg.query_selector_all('#replayList li button'))==len(res),'replay list popup')
            pg.click('#replayList li button >> nth=0')
        chk(fighting() and 'รีเพลย์' in pg.text_content('#battleTitle'),'replay opens battle on the field')
        pg.click('#skip'); pg.wait_for_selector('#next', state='visible', timeout=60000)
        chk(pg.inner_text('#next')=='กลับ' and 'รีเพลย์' in pg.inner_text('#resultTitle'),'replay result screen')
        pg.click('#toMx'); pg.evaluate("document.getElementById('logBox').open=true"); pg.wait_for_timeout(100)
        nlog=pg.eval_on_selector_all('#logList li','e=>e.length'); chk(nlog>3 and 'เริ่มแมตช์' in pg.text_content('#logList'),'battle log lines '+str(nlog))
        pg.check('#logProc'); chk(pg.eval_on_selector_all('#logList li','e=>e.length')<=nlog,'log filter')
        pg.click('#mxClose'); pg.click('#next')
        chk((pg.is_visible('#runEnd') if over_now else in_prep()) and pg.evaluate('P.round')==rnd0,'replay returns without changing run')
        pg.screenshot(path=f'{O}/full-game-{gw}.png')
        # ชุด 22: run จบจริงในลูป → หน้าจบ run + ประวัติจริง → เริ่ม run ใหม่จากหน้านั้น
        if pg.evaluate('P.over'):
            chk(pg.is_visible('#runEnd') and pg.evaluate("JSON.parse(localStorage.getItem('automon-run-history-v1')||'[]').length")>=1 and pg.evaluate("localStorage.getItem('automon-run-save-v1')") is None,'real run end: end screen + history + save removed')
            pg.click('#endNew')
            pg.evaluate(BUY); pg.evaluate(PLACE)  # ซื้อและวางตัวลงบอร์ดอีกครั้ง ให้ทดสอบสกิลถาวรต่อได้
        # 2b สกิลถาวรระหว่างสู้ (22 ต.ค.): ใส่สกิลถาวรให้ตัวบนบอร์ด สู้ 1 แมตช์ แล้วค่าถาวรต้องติดตัว · 31 Oct: when matchStart (not 'set': a unit killed before its first attack never fires 'set' → ~1.3% random fails)
        pick_offer()
        esc()
        got=pg.evaluate("""(()=>{const x=teamEntries(P)[0]; if(!x) return 'no unit'; const c=CM[x.id]; c.skills=[...c.skills,{when:'matchStart',do:'atkUp',to:'self',v:[1,1,1],perm:true}];
          const before=(P.board[x.row][x.lane].perm.atk||0); document.getElementById('fight').click(); if(!document.getElementById('app').classList.contains('fighting')&&confirmRunes) document.getElementById('fight').click(); return before;})()""")  # set 109: unworn-rune warning = press again
        # ชุด 19: ถ้าแมตช์ไม่เริ่ม (ทีมไม่ถูกกฎ ฯลฯ) ให้รายงานข้อความแทนการรอจนหมดเวลา
        if not fighting():
            fails.append('perm test: battle did not start · '+pg.evaluate('JSON.stringify(msgs)')+' · '+pg.evaluate('JSON.stringify(teamEntries(P).map(e=>[e.id,e.level,e.perm]))'))
        else:
            pg.click('#skip')
        after=pg.evaluate("(()=>{const x=teamEntries(P)[0]; return x && x.perm ? (x.perm.atk||0) : 0;})()")
        print(w,'perm atk before/after',got,after); chk(isinstance(got,int) and after>got,'battle perm skill applied after match')
        chk('จากสกิลระหว่างสู้' in pg.inner_text('#endMsgs'),'battle perm message')
        pg.click('#next') if pg.is_visible('#next') else None
        nowrow=pg.evaluate("(()=>{if(P.over) return 'over'; const x=allUnits(P).find(x=>Object.values(x.u.perm).some(v=>v)); if(!x) return 'noperm'; tap(x.ref); const r=!!document.querySelector('#info .stats2.now'); closePop(); return r;})()")
        chk(nowrow in (True,'over'),'perm now row in info popup '+str(nowrow))
        # 2c ชุด 22: เซฟกลางทาง · เล่นต่อ · เซฟเสียหาย · หน้าจบ run + ประวัติ
        over=pg.evaluate('P.over'); saved=pg.evaluate("localStorage.getItem('automon-run-save-v1')")
        chk(over or saved is not None,'save written after fight')
        if not over:
            rnd=pg.evaluate('JSON.parse(localStorage.getItem("automon-run-save-v1")).P.round')
            pg.reload(); chk(pg.is_visible('#resume') and pg.is_hidden('#app'),'resume prompt shown')
            pg.click('#resumeGo'); chk(in_prep() and pg.evaluate('P.round')==rnd+1,'resume continues same run')
            chk(pg.evaluate('replays.length')>=1,'replays kept after resume')
            pg.evaluate("localStorage.setItem('automon-run-replays-v1','{bad')"); pg.reload(); pg.click('#resumeGo')
            chk('รีเพลย์' in pg.inner_text('#notice') and pg.evaluate('replays.length')==0 and pg.is_hidden('#replayBtn'),'bad replay data cleared + notice')
        pg.evaluate("localStorage.setItem('automon-run-save-v1','{bad')"); pg.reload()
        chk(in_prep() and 'เสียหาย' in pg.inner_text('#notice') and pg.evaluate("localStorage.getItem('automon-run-save-v1')") is not None,'bad save cleared + notice + new save')
        pg.evaluate("(()=>{const H=JSON.parse(localStorage.getItem('automon-run-save-v1'));H.data='00000000';localStorage.setItem('automon-run-save-v1',JSON.stringify(H));})()"); pg.reload()
        chk('อัปเดต' in pg.inner_text('#notice'),'data change clears save')
        pg.evaluate("localStorage.setItem('automon-run-history-v1',JSON.stringify([{at:1,won:false,wins:2,hearts:0,rounds:12,matches:12,team:[{id:'HL-1',level:2}],top:'HL-1',topDmg:50},{at:2,won:true,wins:99}]))")
        pg.evaluate("P.wins=3;P.hearts=0;P.over=true;renderRunEnd();showScreen('runEnd')")
        hist=pg.eval_on_selector_all('#endHistory li','e=>e.map(x=>x.textContent)')
        chk(pg.is_visible('#runEnd') and 'หัวใจหมด' in pg.inner_text('#endTitle') and len(hist)==1 and 'HL-1' in hist[0],'run end screen + filtered history '+str(hist))
        chk(pg.is_hidden('#endExtra'),'lost run: no extra matches button')
        pg.click('#endNew'); chk(in_prep() and pg.evaluate('P.round')==1 and not pg.evaluate('P.over'),'new run from end screen')
        # set 99: cleared run → "เล่นต่อ (แมตช์พิเศษ)" → back to prep with the hearts left, wins chip shows extra
        pg.evaluate("P.wins=10;P.bw=Math.min(P.bw,10);P.hearts=4;P.over=true;renderRunEnd();showScreen('runEnd')")
        chk(pg.is_visible('#endExtra') and 'ชนะครบ' in pg.inner_text('#endTitle'),'cleared run offers extra matches')
        chk('20%' in pg.inner_text('#endExtraHint') and 'หุ่นเป้า' in pg.inner_text('#endExtraHint'),'set 119: warning on the extra-matches button')
        pg.click('#endExtra'); chk(in_prep() and pg.evaluate('P.extra') and not pg.evaluate('P.over') and 'พิเศษ' in pg.inner_text('#sWins'),'extra matches continue the run')
        # set 119: second chance → legend pick popup, no reroll
        pg.evaluate("rnMakeOffer(P,'sc');render()"); chk(pg.is_visible('#offerDlg') and 'โอกาสสุดท้าย' in pg.inner_text('#offerTitle') and pg.is_hidden('#offerReroll'),'second chance popup (no reroll)')
        pg.click('#offerSkip'); chk(pg.is_hidden('#offerDlg'),'second chance popup closes')
        pg.evaluate('startNewRun()')
        print(w,'save/resume/end ok')
        pg.evaluate(KEEPNAME)
        # set 110: player name screen (fresh device, no name) · name goes into the run journal + run code
        print(w,'set 110 name/runlog start',flush=True)
        if w>700:
            c2=b.new_context(viewport={'width':gw,'height':gh}); p2=c2.new_page()
            p2.route('**/*', lambda r: r.abort() if not r.request.url.startswith('file:') else r.continue_())
            p2.on('pageerror', lambda e: errs.append((w,'pageerror name',str(e))))
            p2.goto(f'file://{D}/game.html')
            chk(p2.is_visible('#nameScr') and p2.evaluate('P')is None,'no name: name screen first, run not started')
            p2.fill('#nameIn','   '); p2.click('#nameGo'); chk(p2.is_visible('#nameErr') and p2.is_visible('#nameScr'),'empty name refused')
            p2.fill('#nameIn','  เพื่อน\u200b ทดสอบ  '); p2.click('#nameGo')
            chk(p2.is_hidden('#nameScr') and p2.evaluate('P')is not None and p2.evaluate('RL.nm')=='เพื่อน ทดสอบ' and p2.evaluate("localStorage.getItem('automon-player-name-v1')")=='เพื่อน ทดสอบ','name saved, run starts, journal has it')
            p2.reload(); chk(p2.is_visible('#resume') and p2.is_hidden('#nameScr') and 'เพื่อน ทดสอบ' in p2.inner_text('#resume'),'name remembered, shown on resume')
            p2.click('#resume .nameEdit'); p2.fill('#nameIn','คนใหม่'); p2.click('#nameGo')
            chk(p2.is_visible('#resume') and 'คนใหม่' in p2.inner_text('#resume'),'rename from resume screen')
            p2.click('#resumeGo'); chk(p2.evaluate('RL && RL.nm')=='คนใหม่','renamed player goes on the resumed run journal')
            c2.close()
            # set 117: app killed = localStorage wiped → name comes back from the viewer's private db doc (fake window.claude)
            FAKE="""(()=>{const S=window.__nmSaved=%s;window.__nmSets=[];const q={add:()=>Promise.resolve(),set:()=>Promise.resolve(),get:()=>Promise.resolve({exists:false,docs:[]}),onSnapshot:()=>()=>{}};
q.doc=()=>q;q.collection=()=>q;q.orderBy=()=>q;q.limit=()=>q;q.where=()=>q;
const db={collection:()=>q,doc:p=>p==='data/users/u1/profile'?{get:()=>Promise.resolve(S?{exists:true,data:()=>({nm:S})}:{exists:false,data:()=>undefined}),set:d=>{window.__nmSets.push([p,d.nm]);return Promise.resolve();}}:q};
const u={id:()=>Promise.resolve('u1'),isOwner:()=>Promise.resolve(false),canEdit:()=>Promise.resolve(false)};
window.claude={use:n=>new Promise(r=>setTimeout(()=>r(n==='db'?db:n==='user'?u:null),300))};})()"""
            for saved in ('"จากฐาน"','null'):
                c3=b.new_context(viewport={'width':gw,'height':gh}); c3.add_init_script(FAKE%saved); p3=c3.new_page()
                p3.route('**/*', lambda r: r.abort() if not r.request.url.startswith('file:') else r.continue_())
                p3.on('pageerror', lambda e: errs.append((w,'pageerror dbname',str(e))))
                p3.goto(f'file://{D}/game.html')
                if saved!='null':
                    p3.wait_for_function("document.getElementById('nameScr').hidden && P", timeout=5000)
                    chk(p3.evaluate('playerName')=='จากฐาน' and p3.evaluate('RL.nm')=='จากฐาน' and p3.evaluate("localStorage.getItem('automon-player-name-v1')")=='จากฐาน','db name restored after app kill, run starts without asking')
                else:
                    chk(p3.is_visible('#nameScr'),'no db name: name screen stays')
                    p3.wait_for_timeout(700); p3.fill('#nameIn','ใหม่ในฐาน'); p3.click('#nameGo')
                    p3.wait_for_function('window.__nmSets.length>0', timeout=3000)
                    chk(p3.evaluate('window.__nmSets')==[['data/users/u1/profile','ใหม่ในฐาน']],'typed name written to own db doc')
                c3.close()
            # set 136: run journal → db one write at a time per doc (overlap = rejected), first write fails → retried, all entries land
            FK="""(()=>{const st=window.__st={docs:{},overlap:0,n:0,busy:{}};
const ref=p=>({set(d){st.n++; if(st.busy[p]){st.overlap++;return Promise.reject({code:'resource_exhausted'});} if(st.n===1) return Promise.reject({code:'unavailable'});
 st.busy[p]=1; return new Promise(r=>setTimeout(()=>{st.busy[p]=0; st.docs[p]=JSON.parse(JSON.stringify(d)); r();},60));}, collection(c){return {doc:id=>ref(p+'/'+c+'/'+id)};}});
const db={doc:ref,collection:c=>({add:()=>Promise.resolve(),doc:id=>ref(c+'/'+id),orderBy(){return this},limit(){return this},onSnapshot(){return()=>{}},get:()=>Promise.resolve({docs:[]})})};
window.claude={use:n=>Promise.resolve(n==='db'?db:null)};})()"""
            c4=b.new_context(viewport={'width':gw,'height':gh}); c4.add_init_script(FK); p4=c4.new_page()
            p4.route('**/*', lambda r: r.abort() if not r.request.url.startswith('file:') else r.continue_())
            p4.on('pageerror', lambda e: errs.append((w,'pageerror rlsend',str(e))))
            p4.goto(f'file://{D}/game.html'); p4.fill('#nameIn','ส่ง'); p4.click('#nameGo')
            for k in range(2):
                p4.evaluate("(()=>{if(!document.getElementById('offerDlg').hidden){const b=document.querySelector('#offerDlg button:not(#offerReroll):not(#offerSkip)'); if(b) b.click(); try{closePop()}catch(e){}}})()")
                p4.evaluate(BUY); p4.evaluate(PLACE)
                p4.evaluate("document.getElementById('fight').click()")
                if not p4.evaluate("document.getElementById('app').classList.contains('fighting')"): p4.evaluate("document.getElementById('fight').click()")
                p4.click('#skip'); p4.wait_for_selector('#next', state='visible', timeout=60000); p4.click('#next')
            p4.evaluate("window.dispatchEvent(new Event('pagehide'))")  # shop steps after the last match go on page hide (or the next match end)
            p4.wait_for_function("(()=>{const id=`${RL.seed.toString(16)}-${RL.at}`,h=__st.docs['runlogs/'+id];return h&&h.n===RL.ev.length&&!rlPend.size;})()", timeout=20000)
            r4=p4.evaluate("(()=>{const id=`${RL.seed.toString(16)}-${RL.at}`;return [__st.overlap, __st.docs['runlogs/'+id+'/parts/p0'].ev.length===RL.ev.length, __st.n];})()")
            chk(r4[0]==0 and r4[1],'set 136: journal reaches the db after a failed write, no overlapping writes '+str(r4))
            c4.close()
        # set 110: run-log viewer (runlog.html) · clean run (reload = no test hacks in CM/P) → code → no alert · edited code → red
        pg.reload()
        chk(in_prep() and pg.is_hidden('#nameScr'),'name set → game opens on prep')
        for k in range(3):
            if pg.evaluate('P.over'): break
            pick_offer()
            pg.evaluate(BUY); pg.evaluate(PLACE); pg.click('#fight')
            if not fighting() and 'ยืนยัน' in pg.inner_text('#fight'): pg.click('#fight')
            pg.click('#skip'); pg.wait_for_selector('#next', state='visible', timeout=60000); pg.click('#next')
        print(w,'set 110 clean run done',flush=True)
        code=pg.evaluate('runCode()')
        chk(code and pg.evaluate('parseRunCode(runCode(),CM,RULES).nm')=='ทดสอบ','run code carries the player name')
        # set 114: owner-only Log screen in the game · no Claude viewer (file page) = button hidden · fake db → live list + detail · paste box
        chk(pg.is_hidden('#logBtn'),'log button hidden when the viewer is not the owner/editor')
        pick_offer() # a win's rune offer is a modal dialog: it would block the Log button
        pg.evaluate('''(()=>{ const head={...RL, ev:undefined, n:RL.ev.length, parts:1, upd:Date.now(), round:P.round, wins:P.wins, hearts:P.hearts, gold:P.gold, over:0};
          delete head.ev; window.__lgFire=null;
          playDb={ collection(p){ if(p==='runlogs') return { orderBy(){return this;}, limit(){return this;}, onSnapshot(fn){ window.__lgFire=fn; fn({docs:[{id:'t1',exists:true,data:()=>head}]}); return ()=>{}; } };
            return { get: async()=>({docs:[{id:'p0',exists:true,data:()=>({k:0,ev:RL.ev.slice()})}]}) }; }, doc(){ return { set:async()=>{}, collection(){ return { doc(){ return { set:async()=>{} }; } }; } }; } };
          document.getElementById('logBtn').hidden=false; })()''')
        pg.click('#logBtn'); chk(pg.is_visible('#logScr') and len(pg.query_selector_all('#logList tr'))==1 and 'ทดสอบ' in pg.inner_text('#logList'),'log screen: live run list from the db')
        pg.click('#logList button'); pg.wait_for_selector('#logScr #lvStatus', timeout=20000)
        chk('ไม่พบความผิดปกติ' in pg.inner_text('#lvStatus') and len(pg.query_selector_all('#logOut details.round'))>=2,'log screen: db run detail rebuilt, no alert')
        pg.fill('#logCode',code); pg.click('#logRead')
        chk('ไม่พบความผิดปกติ' in pg.inner_text('#lvStatus') and 'ผู้เล่น: ทดสอบ' in pg.inner_text('#logOut'),'log screen: pasted run code read')
        pg.fill('#logCode','ARUN1 {bad'); pg.click('#logRead'); chk(pg.is_visible('#logErr'),'log screen: broken code = error')
        chk(pg.evaluate('document.getElementById("logScr").scrollWidth<=innerWidth+1'),'log screen: no sideways scroll')
        pg.screenshot(path=f'{O}/logscr-{gw}.png')
        pg.click('#logClose'); chk(pg.is_hidden('#logScr'),'log screen closes')
        pg.goto(f'file://{D}/runlog.html')
        pg.fill('#code',code); pg.click('#read')
        chk(pg.is_visible('#lvStatus') and 'ไม่พบความผิดปกติ' in pg.inner_text('#lvStatus') and 'ทดสอบ' in pg.inner_text('#out'),'viewer: fair run = no alert, name shown')
        chk(len(pg.query_selector_all('#out details.round'))>=2 and pg.query_selector('#out .bad') is None,'viewer: rounds listed, nothing red')
        pg.evaluate("document.querySelector('#out details.round').open=true")
        chk('ซื้อ' in pg.inner_text('#out details.round') or 'เริ่มรอบ' in pg.inner_text('#out details.round'),'viewer: round steps')
        bad=pg.evaluate("(()=>{const o=JSON.parse(document.getElementById('code').value.slice(6)); const e=o.logs[0].ev.find(e=>e[0]==='st'); e[3]+=50; return 'ARUN1 '+JSON.stringify(o);})()")
        pg.fill('#code',bad); pg.click('#read')
        chk('ผิดปกติ' in pg.inner_text('#lvStatus') and pg.evaluate("getComputedStyle(document.getElementById('lvStatus')).color")==pg.evaluate("getComputedStyle(document.querySelector('#out .bad')).color"),'viewer: edited gold = red alert')
        pg.fill('#code','ARUN1 {bad'); pg.click('#read'); chk(pg.is_visible('#err') and pg.is_hidden('#out'),'viewer: broken code = error')
        chk(pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'viewer: no sideways scroll')
        pg.screenshot(path=f'{O}/runlog-{gw}.png')
        pg.goto(f'file://{D}/game.html'); pg.evaluate(KEEPNAME)
        print(w,'set 110 runlog viewer ok',flush=True)
        # set 97: phone held upright → "rotate your phone" screen · button continues in portrait
        if w<700:
            pg.set_viewport_size({'width':390,'height':844}); pg.reload()
            chk(pg.is_visible('#rotate') and pg.is_visible('#rotateSkip'),'portrait shows rotate screen')
            pg.click('#rotateSkip'); chk(pg.is_hidden('#rotate') and in_prep(),'rotate screen button continues')
            pg.evaluate("localStorage.clear()")
        pg.set_viewport_size({'width':w,'height':h})
        # 3 balance
        pg.goto(f'file://{D}/balance.html')
        chk(pg.is_hidden('#errs'),'balance errs shown')
        # ชุด 29/30: 3 ขั้น เลือกตัว → แก้ (บันทึกท้ายหน้า) → ดูผล · หน้าแรก = ตารางเผ่า 6 × ความหายาก 5 · มือถือใช้แถบล่าง
        chk(pg.is_visible('#tgrid') and pg.get_attribute('#step-pick','aria-current')=='step','grid is first page')
        g=pg.evaluate("[document.querySelectorAll('#tgrid .tg-row').length, document.querySelectorAll('#tgrid .tg-cell').length, document.querySelectorAll('#tgrid .tg-chip').length, chars.length]")
        chk(g[0]==6 and g[1]==30 and g[2]==g[3],'grid 6x5 holds every char '+str(g))
        chk(not pg.evaluate('document.documentElement.scrollWidth > innerWidth + 1'),'grid no horizontal scroll')
        if w<700: chk(pg.evaluate("getComputedStyle(document.getElementById('steps')).position")=='fixed','mobile bottom step bar')
        pg.click('#tab-list'); chk(pg.is_visible('#pane-list') and pg.is_hidden('#tgrid'),'grid/list toggle'); pg.click('#tab-grid')
        pg.click('#tgrid .tg-tribe >> nth=1')
        chk(pg.is_visible('#pane-tribes') and pg.eval_on_selector_all('#tform .grid3:not([hidden])','e=>e.map(x=>x.dataset.tribe)')==[pg.evaluate('TRIBES[1]')],'tribe header opens that tribe bonus')
        # ชุด 32: ช่องโบนัสเผ่าใหม่ (ค่าเริ่ม 0)
        tf=pg.text_content('#tform'); chk(all(x in tf for x in ['HP สูงสุด +%','ศัตรูทุกตัวติดไฟ','ดาเมจไฟ +%','ศัตรูทุกตัวติดช็อต','ดาเมจช็อต +%','ดาเมจตีปกติ +%','ทั้งทีมปล่อยทันที']),'new tribe bonus fields')
        pg.click('#step-pick'); pg.click('#tgrid .tg-chip[data-id="PL-4"]')
        chk(pg.is_visible('#pane-chars') and pg.evaluate('current')=='PL-4' and pg.inner_text('#sbEdit')=='PL-4','chip opens editor')
        pg.click('#tab-sim'); pg.click('#step-result'); chk(pg.is_visible('#pane-analysis') and pg.is_hidden('#pane-sim'),'result step')
        # set 160: รันจริง combat table renders from fake data · filters hide rows · per-second toggle · source columns
        cb=pg.evaluate("""(()=>{const mk=(id,n)=>({id,name:'',tribe:'',rarity:'',n,ms:n*30000,out:300*n,src:{hit:200*n,burn:100*n},taken:150*n,abs:20*n,loss:120*n,heal:10*n,armor:5*n,kills:0.5*n,alive:n/2});
          anaPlayRun={...(anaPlayRun||{}),combat:[mk(chars[0].id,40),mk(chars[1].id,10)]}; renderRunCombat();
          const a=$('runCombat').rows.length, h=$('cbHead').rows[0].cells.length; $('cbFind').value=chars[0].id; cbFilter();
          const vis=[...$('runCombat').rows].filter(r=>!r.hidden).length; $('cbFind').value=''; cbFilter();
          $('cbSrc').querySelector('[data-s="1"]').click(); const h2=$('cbHead').rows[0].cells.length;
          $('cbUnit').querySelector('[data-u="s"]').click(); const ps=$('runCombat').querySelector(`tr[data-id="${chars[0].id}"]`).cells[3].firstChild.textContent;
          $('cbUnit').querySelector('[data-u="m"]').click(); $('cbSrc').querySelector('[data-s=""]').click(); return [a,h,vis,h2,ps];})()""")
        chk(cb[0]==2 and cb[1]==11 and cb[2]==1 and cb[3]==13 and cb[4]=='10','combat table rows/filter/source cols/per-sec '+str(cb))
        # set 165: combat table level picker reads combatLv · "สรุปแรง/อ่อน" verdict list from fake run data (badges, level filter, low data)
        vf=pg.evaluate("""(()=>{const mk=(id,n)=>({id,name:'',tribe:'',rarity:'',n,ms:n*30000,out:300*n,src:{hit:300*n},taken:150*n,abs:20*n,loss:120*n,heal:10*n,armor:5*n,kills:0.5*n,alive:n/2});
          anaPlayRun.combatLv={1:[],2:[mk(chars[2].id,7)],3:[]}; $('cbLv').querySelector('[data-lv="2"]').click(); const c2=$('runCombat').rows.length+':'+$('runCombat').rows[0].dataset.id;
          $('cbLv').querySelector('[data-lv="0"]').click();
          const R=chars[0].rarity, same=chars.filter(c=>c.rarity===R).slice(0,5), wr=[50,52,54,56,80];
          anaPlayRun.chars=chars.map(c=>{const i=same.indexOf(c), g=i>=0?200:10, w=i>=0?wr[i]*2:5; return {id:c.id,mGames:g,mWin:w/g*100,lvG:[0,i>=0?200:0,0],lvW:[0,i>=0?w:0,0]};});
          renderVerdict(); const strong=[...$('vfList').querySelectorAll('.vf-row.f-strong')].map(x=>x.dataset.id), all=$('vfList').children.length, low=$('vfList').querySelectorAll('.f-low').length;
          $('vfLv').querySelector('[data-lv="2"]').click(); const l2=$('vfList').children.length; $('vfLv').querySelector('[data-lv="0"]').click();
          return [c2, strong.join(), same[4].id, all, low, l2, chars.length];})()""")
        chk(vf[0]=='1:'+pg.evaluate('chars[2].id') and vf[1]==vf[2] and vf[3]==vf[6] and vf[4]==vf[6]-5 and vf[5]==5,'verdict list + level pickers '+str(vf))
        # ชุด 30: 3 ขั้น · ส่วนบันทึก + ไอเดีย + คลังสกิล (พับไว้) อยู่ท้ายขั้นแก้ (ใต้แก้ตัวละคร/โบนัสเผ่า ไม่อยู่ในลองสู้) · ไอเดียตามตัวที่แก้
        chk(pg.locator('#step-save').count()==0 and pg.eval_on_selector_all('#steps button[id^=step-]','e=>e.length')==3 and pg.is_visible('#steps #save'),'3 steps + save button on top bar')
        pg.click('#step-edit'); pg.click('#tab-chars')
        chk(pg.is_visible('#saveBox') and pg.is_visible('#ideaBox') and pg.is_visible('#save') and not pg.evaluate("document.getElementById('catalog').open") and pg.locator('#ideaChar').count()==0,'save + ideas under char editor, catalog folded, no duplicate picker')
        pg.click('#tab-sim'); chk(pg.is_hidden('#saveBox'),'save box hidden in sim tab'); pg.click('#tab-chars')
        pg.evaluate("setCurrent('PL-4')"); chk('PL-4' in pg.inner_text('#ideaFor'),'idea follows current')
        pg.check('#ideaGeneral'); chk(pg.evaluate('ideaPick.value()')=='' and 'ทั่วไป' in pg.inner_text('#ideaFor'),'idea general option'); pg.uncheck('#ideaGeneral')
        # ชุด 30.1: ปุ่มบันทึกกดได้ทุกหน้า · ไม่มีฐานข้อมูล (ไฟล์ในเครื่อง) = แจ้ง ไม่พัง
        pg.click('#step-result'); pg.click('#save'); chk(pg.is_visible('#saveMsg') and 'บันทึก' in pg.inner_text('#saveMsg'),'save from result step shows message')
        # ชุด 30.1: แป้นตัวเลขมือถือ
        pg.click('#step-edit'); pg.click('#tab-chars')
        chk(pg.get_attribute('#f-hp-0','inputmode')=='numeric' and pg.get_attribute('#f-cdMs-0','inputmode')=='decimal' and pg.get_attribute('#simSeed','inputmode')=='numeric','numeric keypad modes')
        # ชุด 30.1: หน้าลองสู้ แตะตัวก่อนสู้ = แผงรายละเอียดแบบหน้าเกม (Lv1/2/3) + ตัวที่แก้เปลี่ยนตาม
        pg.click('#tab-sim'); pg.evaluate("simTeam=emptySim(); simTeam[0][0][0]={id:'PL-3',level:2}; simTeam[1][0][0]={id:'WY-3',level:1}; simLast=null; renderSimTeams()")
        pg.click('#simArena [data-key="0:0:0"]')
        info=pg.inner_text('#simInfo')
        chk(pg.evaluate('current')=='PL-3' and 'PL-3' in info and pg.eval_on_selector_all('#simInfo .lvtabs button','e=>e.length')==3 and pg.get_attribute('#simInfo .lvtabs [aria-pressed="true"]','data-lv')=='2','sim tap before battle shows info + sets current')
        # ชุด 30.2: ม้านั่งอยู่เหนือสนาม · ปิดโบนัสเผ่าเป็นค่าเริ่ม · ทีมที่เซฟเลือกฝั่งตามตัวที่แตะ · ค่าที่แก้อยู่ล่างสุด (หลังไอเดีย/คลังสกิล)
        chk(pg.evaluate("!!(document.getElementById('simBench').compareDocumentPosition(document.querySelector('#simStageBox .stage')) & Node.DOCUMENT_POSITION_FOLLOWING)"),'bench above arena')
        chk(pg.is_checked('#simOffL') and pg.is_checked('#simOffR'),'tribe bonus off by default')
        chk(pg.evaluate("document.getElementById('simRun').nextElementSibling.id")=='simPlay','sim run button before play')
        chk(pg.evaluate("[...document.querySelectorAll('#saveBox > .subsec, #saveBox > details')].map(x=>x.id).join(',')")=='ideaBox,catalog,editedBox','edited values last')
        chk(pg.input_value('#presetSide')=='0','preset side follows left tap')
        # set 161: search list right above the board (drag), play controls right under it · phone board fits (no sideways scroll) · glossary/ideas only where skills are edited
        chk(pg.evaluate("!!(document.querySelector('#simStageBox .stage').compareDocumentPosition(document.getElementById('simRun')) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(document.getElementById('simDock').compareDocumentPosition(document.querySelector('#simStageBox .stage')) & Node.DOCUMENT_POSITION_FOLLOWING)"),'sim: search → board → play controls')
        chk(pg.evaluate("(()=>{const s=document.querySelector('#simStageBox .stage');return s.scrollWidth<=s.clientWidth+1})()"),'sim board fits width '+str(w))
        pg.click('#tab-rules'); chk(pg.is_hidden('#editor > details.gloss') and pg.is_hidden('#ideaBox') and pg.is_hidden('#catalog') and pg.is_visible('#editedBox'),'rules tab: no skill glossary/ideas/library')
        pg.click('#tab-match'); chk(pg.is_hidden('#editor > details.gloss'),'match tab: no skill glossary')
        pg.click('#tab-sim')
        pg.click('#simArena [data-key="1:0:0"]'); chk(pg.input_value('#presetSide')=='1' and pg.evaluate('current')=='WY-3','preset side follows right tap')
        pg.click('#simArena [data-key="0:0:0"]')
        pg.click('#simInfo .lvtabs [data-lv="3"]'); hp3=pg.evaluate("String(chars.find(c=>c.id==='PL-3').hp[2])")
        chk(('HP '+hp3) in pg.inner_text('#simInfo .stats2'),'sim info level toggle')
        # set 79: stage tab reset button (two taps) · set 146: only the open tab · r2: back to the last saved values (stageSaved), page defaults when nothing saved / no db
        chk(pg.evaluate("""(async()=>{const wait=()=>new Promise(r=>setTimeout(r,50)); const b=document.getElementById('stgReset'); const nm=STAGE_RUNES[0].id;
          stagePart='bosses'; renderStage(); stageCfg.runes[nm].name='ชื่อทดสอบ'; stageCfg.bosses[0].hp=999; stageChanged(); const e1=stageEdited(); b.click(); const mid=stageEdited(); b.click(); await wait();
          let ok=e1 && mid && b.disabled && stageCfg.runes[nm].name==='ชื่อทดสอบ' && JSON.parse(localStorage.getItem(STAGE_DRAFT_KEY)).bosses[0].hp===STAGE_BASE.bosses[0].hp;
          const keepDb=db, snap=JSON.parse(JSON.stringify(stageCfg)); db={doc:()=>({get:async()=>({exists:true,data:()=>({rev:7,stage:snap})})})};
          stagePart='runes'; renderStage(); stageCfg.runes[nm].name='อีกชื่อ'; stageChanged(); b.click(); b.click(); await wait();
          ok=ok && stageCfg.runes[nm].name==='ชื่อทดสอบ';
          db=null; b.click(); b.click(); await wait(); ok=ok && !stageEdited() && b.disabled; db=keepDb; renderStage(); return ok})()"""),'stage reset button')
        # set 68: boss mode preview draws the boss (not the hidden right team) · empty teams are never refilled with the sample team
        pg.evaluate("simFoeBoss=true; renderSimBoss(); simLast=null; renderSimTeams()")
        chk('(บอส)' in pg.evaluate("[...document.querySelectorAll('#simArena [data-key^=\"1:\"]')].map(u=>u.innerText).join()") and 'WY-3' not in pg.evaluate("[...document.querySelectorAll('#simArena .unit')].map(u=>u.textContent).join()"),'boss mode preview shows boss')
        pg.evaluate("simTeam=emptySim(); saveSim(); renderSimTeams()")
        chk(pg.evaluate("simTeam.flat(2).every(x=>!x)"),'empty team not refilled with sample team')
        pg.evaluate("simFoeBoss=false; renderSimBoss(); simTeam=emptySim(); simTeam[0][0][0]={id:'PL-3',level:2}; simTeam[1][0][0]={id:'WY-3',level:1}; saveSim(); renderSimTeams()")
        # ชุด 30.1: ทีมที่เซฟ (ไม่มีฐานข้อมูล = เก็บในเครื่อง) · ใส่ฝั่งอื่นได้ · สูงสุด 10
        pg.evaluate("document.getElementById('presetBox').open=true; localStorage.removeItem('automon-balance-teams'); presets=[]; renderPresets()")
        pg.select_option('#presetSide','0'); pg.fill('#presetName','<b>ทีมลอง</b>'); pg.click('#presetSave')
        chk(pg.eval_on_selector_all('#presetList li','e=>e.length')==1 and '<' not in pg.inner_text('#presetList'),'preset saved + name sanitized')
        pg.click('#presetList li >> nth=0 >> [data-load="1"]')
        chk(pg.evaluate("JSON.stringify(simTeam[1])==JSON.stringify(simTeam[0])"),'preset loads into right side')
        for i in range(9): pg.click('#presetSave')
        chk(pg.eval_on_selector_all('#presetList li','e=>e.length')==10 and pg.is_disabled('#presetSave'),'preset max 10')
        pg.evaluate("localStorage.setItem('automon-balance-teams','[{\"id\":\"x\",\"units\":[{\"row\":9,\"lane\":0,\"id\":\"PL-3\",\"level\":1}]},{\"id\":\"y\",\"name\":\"ok\",\"units\":[{\"row\":0,\"lane\":1,\"id\":\"PL-3\",\"level\":3}]}]'); presets=presetLocal(); renderPresets()")
        chk(pg.eval_on_selector_all('#presetList li','e=>e.length')==1,'bad preset data dropped')
        pg.click('#presetList li >> nth=0 >> button.danger'); pg.click('#presetList li >> nth=0 >> button.danger')
        chk('ยังไม่มีทีม' in pg.inner_text('#presetList'),'preset delete with confirm')
        pg.click('#tab-chars')
        # ชุด 30: โหมดแก้ค่าในหน้ารายการ (ยกเว้นสกิล) · แก้แล้วค่าเปลี่ยนจริง ป้ายจำนวนจุดขึ้น ตารางไม่วาดใหม่
        pg.click('#step-pick'); pg.click('#tab-list'); pg.click('#listEditBtn')
        chk(pg.is_visible('#l-HL-1-hp-0') and pg.is_visible('#l-HL-1-healHit-2'),'list edit mode shows inputs')
        hp0=pg.evaluate("chars.find(c=>c.id==='HL-1').hp[0]")
        pg.fill('#l-HL-1-hp-0',str(hp0+7)); pg.press('#l-HL-1-hp-0','Tab')
        chk(pg.evaluate("chars.find(c=>c.id==='HL-1').hp[0]")==hp0+7 and pg.inner_text('#sbSave')!='' and pg.evaluate("document.activeElement && document.activeElement.id")=='l-HL-1-hp-1','list edit changes value, keeps focus')
        pg.fill('#l-HL-1-cdMs-0','-3'); pg.press('#l-HL-1-cdMs-0','Tab')
        chk(pg.evaluate("chars.find(c=>c.id==='HL-1').cdMs[0]")==pg.evaluate("BASE_CHARS.find(c=>c.id==='HL-1').cdMs[0]"),'list edit rejects negative')
        nm=pg.locator('#listBody input[type=text] >> nth=0'); nm.fill('<b>x</b>ab'); nm.press('Tab')
        chk('<' not in nm.input_value(),'list name sanitize')
        rr=pg.evaluate("RARITIES[RARITIES.length-1]"); pg.select_option('#l-HL-1-rarity',rr)
        chk(pg.evaluate("chars.find(c=>c.id==='HL-1').rarity")==rr,'list edit rarity')
        chk(pg.evaluate("document.querySelector('table.list').offsetWidth <= document.getElementById('pane-list').clientWidth + 1 || innerWidth < 700"),'list edit table hugs content')
        pg.click('#listBody .lskbtn >> nth=0'); chk(pg.is_visible('#pane-chars'),'list skill button opens editor')
        pg.evaluate("chars=clone(BASE_CHARS); renderCharForm(); refreshDirty(); listEdit=false")
        pg.click('#step-pick'); pg.click('#tab-grid')
        chk(pg.eval_on_selector_all('#mN option','e=>e.map(o=>o.value)')==['12000','24000'],'analysis match count options')
        pg.click('#step-edit'); pg.click('#tab-chars')
        # edit flow: HL-2 add skill lv3 only, change values, check sentence
        pg.evaluate("current='HL-2'; renderCharForm()")
        # ชุด 11: แถวแนะนำติ๊กได้หลายแถว · ครบ 3 = ที่ไหนก็ได้ · เหลือ 1 แถวเอาออกไม่ได้
        rh0=pg.evaluate("chars.find(c=>c.id===current).rowHint")
        for i in range(3):
            if pg.is_checked(f'#f-row-{i}'): pg.click(f'#f-row-{i}')
        chk(sum(pg.is_checked(f'#f-row-{i}') for i in range(3))==1,'row hint keeps at least one')
        for i in range(3):
            if not pg.is_checked(f'#f-row-{i}'): pg.check(f'#f-row-{i}')
        chk(pg.evaluate("chars.find(c=>c.id===current).rowHint")=='ที่ไหนก็ได้','all rows = anywhere')
        pg.uncheck('#f-row-0'); chk(pg.evaluate("chars.find(c=>c.id===current).rowHint")=='กลาง+หลัง','mid+back hint')
        # ชุด 13: ปุ่มตั้ง Lv2/3 จาก Lv1 · ค่าพลัง ×2/×4 · คูลดาวน์/มัลติฮิต = Lv1
        pg.click('#x24'); v=pg.evaluate("(()=>{const c=chars.find(x=>x.id===current);return [c.hp,c.atk,c.burn,c.shock,c.armorHit,c.cdMs,c.multi].map(a=>[a[1]/Math.max(1,a[0]),a[2]/Math.max(1,a[0]),a[0]===a[1]&&a[1]===a[2]])})()")
        chk(all(x[0]==2 and x[1]==4 for x in v[:2]) and v[5][2] and v[6][2],'x24 scales stats, keeps cooldown/multi')
        print(w,'rowhint ok', rh0)
        # ชุด 18: ค่าพลังฟื้น/ฮิต แก้ได้ทุกเผ่า (HL-2 เผ่าเหล็กกล้า)
        pg.fill('#f-healHit-0','3'); pg.press('#f-healHit-0','Tab')
        chk(pg.evaluate("chars.find(c=>c.id==='HL-2').healHit[0]")==3 and pg.is_hidden('#errs'),'healHit field editable, no error')
        # ชุด 20: แถวค่ากลางใต้ HP/พลังโจมตี (เหล็กกล้า ธรรมดา = HP 210 · พลังโจมตี 4) · ต่ำกว่า 50% ขึ้นเตือน
        mids=pg.eval_on_selector_all('.grid3 .mid:not(.cdrange)','e=>e.map(x=>x.textContent)')
        # ชุด 21: แถวช่วงคูลดาวน์ของเผ่า (ตัวจาง ไม่เตือน) ใต้ช่องคูลดาวน์
        cdr=pg.eval_on_selector_all('.grid3 .mid.cdrange','e=>e.map(x=>x.textContent)')
        chk(len(cdr)==1 and 'เหล็กกล้า' in cdr[0] and 'วิ' in cdr[0],'tribe cooldown range row '+str(cdr))
        chk(len(mids)==6 and mids[0].startswith('210') and mids[3].startswith('4'),'mid-value rows '+str(mids))
        pg.fill('#f-hp-0','50'); pg.press('#f-hp-0','Tab')
        chk(pg.evaluate("document.querySelector('.grid3 .mid').classList.contains('low')"),'mid warns under 50%')
        pg.click('#x24')
        n0=pg.eval_on_selector_all('#skillList .skcard','e=>e.length')
        pg.click('#addBattle'); n1=pg.eval_on_selector_all('#skillList .skcard','e=>e.length'); chk(n1==n0+1,'add skill')
        k=n1-1
        pg.select_option(f'#s{k}-when','hitTaken'); pg.select_option(f'#s{k}-do','reflect');
        chk(not pg.evaluate(f"document.getElementById('s{k}-more').open"),'extra settings collapsed by default')
        pg.click(f'#s{k}-more summary')
        pg.uncheck(f'#s{k}-lv1'); pg.uncheck(f'#s{k}-lv2')
        pg.fill(f'#s{k}-cd','2.5'); pg.press(f'#s{k}-cd','Tab')
        txt=pg.inner_text(f'#skillList .skcard >> nth={k}'); print(w,'new skill:',txt.split('\n')[:4])
        chk('เฉพาะ Lv3' in txt and 'คูลดาวน์สกิล 2.5' in txt, 'skill lv/cd sentence')
        # ชุด 17: คูลดาวน์สกิลยาวขึ้น % ทุกครั้งที่ใช้ (ช่องโผล่เมื่อมีคูลดาวน์สกิล)
        pg.fill(f'#s{k}-cdgrow','20'); pg.press(f'#s{k}-cdgrow','Tab')
        chk(pg.evaluate(f"chars.find(c=>c.id==='HL-2').skills[{k}].cdGrow")==20 and 'ยาวขึ้น 20%' in pg.inner_text(f'#skillList .skcard >> nth={k}'),'cdGrow editor + sentence')
        # last checkbox can't be removed
        pg.click(f'#s{k}-lv3'); chk(pg.is_checked(f'#s{k}-lv3'),'cannot uncheck last level')
        # ตัวแก้สกิลแบบรวม (ชุด 6): เมื่อ รวมทุกเงื่อนไข · ทำ รวมผลร้านค้า/ระหว่างสู้ · ระยะเวลาเป็นปุ่ม
        whens=pg.eval_on_selector_all(f'#s{k}-when option','e=>e.map(o=>o.value)')
        chk('matchWin' in whens and 'selfDown' in whens and 'hitTaken' in whens,'when list has all triggers')
        pg.select_option(f'#s{k}-when','selfDown'); pg.select_option(f'#s{k}-do','armor')
        chk(not pg.is_disabled(f'#s{k}-dur-perm') and pg.is_disabled(f'#s{k}-dur-match'),'armor: now+perm enabled, match disabled')
        # ชุด 12: ผู้รับใหม่ เพื่อนข้างหลังเลนเดียวกัน
        tos=pg.eval_on_selector_all(f'#s{k}-to option','e=>e.map(o=>o.value)'); chk('backLaneAlly' in tos,'new target backLaneAlly listed')
        pg.click(f'#s{k}-dur-perm')
        txt=pg.inner_text(f'#skillList .skcard >> nth={k}'); print(w,'perm skill:',txt.split('\n')[0])
        chk(pg.evaluate(f"chars.find(c=>c.id==='HL-2').skills[{k}].perm===true") and 'เกราะสะสม' in txt,'perm flag + sentence')
        pg.click(f'#s{k}-dur-now')
        chk(pg.evaluate(f"chars.find(c=>c.id==='HL-2').skills[{k}].perm===undefined"),'perm cleared when now')
        # ชุด 14: เพื่อนตามตำแหน่ง + เฉพาะเผ่าเดียวกัน
        pg.select_option(f'#s{k}-to','allyAt'); pg.select_option(f'#s{k}-atrow','mid'); pg.select_option(f'#s{k}-atlane','other'); pg.check(f'#s{k}-same')
        sk=pg.evaluate(f"JSON.stringify(chars.find(c=>c.id==='HL-2').skills[{k}])"); txt=pg.inner_text(f'#skillList .skcard >> nth={k}')
        chk('"at":{"row":"mid","lane":"other"}' in sk and '"sameTribe":true' in sk and 'แถวกลาง อีกเลน' in txt and 'เฉพาะเผ่าเดียวกัน' in txt,'allyAt + sameTribe editor')
        # ชุด 17: ไม่ให้ผลกับตัวอื่นที่ ID เดียวกัน
        pg.check(f'#s{k}-skipid')
        chk(pg.evaluate(f"chars.find(c=>c.id==='HL-2').skills[{k}].skipSameId")==True and 'ชนิดเดียวกับตัวนี้' in pg.inner_text(f'#skillList .skcard >> nth={k}'),'skipSameId editor + sentence')
        pg.select_option(f'#s{k}-to','self'); sk=pg.evaluate(f"JSON.stringify(chars.find(c=>c.id==='HL-2').skills[{k}])")
        chk('"at"' not in sk and 'sameTribe' not in sk and 'skipSameId' not in sk and pg.locator(f'#s{k}-same').count()==0 and pg.locator(f'#s{k}-skipid').count()==0,'self clears at/sameTribe/skipSameId')
        pg.select_option(f'#s{k}-do','atkUp'); pg.click(f'#s{k}-dur-perm'); pg.select_option(f'#s{k}-when','matchEnd')
        sk=pg.evaluate(f"JSON.stringify(chars.find(c=>c.id==='HL-2').skills[{k}])"); print(w,'shop skill:',sk)
        chk('"permAtk"' in sk and pg.is_disabled(f'#s{k}-dur-now') and pg.get_attribute(f'#s{k}-dur-perm','aria-pressed')=='true','shop when keeps family + locked perm')
        chk('cdGrow' not in sk,'shop when clears cdGrow')
        pg.select_option(f'#s{k}-when','set')
        sk=pg.evaluate(f"JSON.stringify(chars.find(c=>c.id==='HL-2').skills[{k}])")
        chk('"atkUp"' in sk and '"perm":true' in sk,'back to battle keeps perm')
        dos=pg.eval_on_selector_all(f'#s{k}-do option','e=>e.map(o=>o.value)')
        chk('burnTakenUp' in dos and 'hitAmp' in dos and 'armorHitUp' in dos and not any(d.startswith('perm') for d in dos),'new effects listed, no raw shop effects')
        # ชุด 16: คูลดาวน์ช้าลง % (ใส่ศัตรูหรือตัวเอง) · ตัวเอง down ทันที (เฉพาะเริ่มแมตช์)
        chk('cdSlowPct' in dos and 'selfKo' not in dos,'cdSlowPct listed, selfKo only on match start')
        pg.click(f'#s{k}-dur-match')
        # ชุด 7: ผลแบบ % ของ มีช่องคิดจากค่า/ของใคร · ไม่มีผลแบบเดิมที่ฝังค่าในชื่อ
        chk('dmgPctArmor' not in dos and 'dmgOf' in dos,'percent-of family replaces legacy')
        pg.select_option(f'#s{k}-do','dmgOf'); pg.select_option(f'#s{k}-ofstat','maxHp'); pg.select_option(f'#s{k}-ofwho','ctx')
        sk=pg.evaluate(f"JSON.stringify(chars.find(c=>c.id==='HL-2').skills[{k}].of)"); chk(sk=='{"stat":"maxHp","who":"ctx"}','of selectors work')
        # ชุด 12: ของใคร เลน/แถวเดียวกัน
        pg.select_option(f'#s{k}-ofwho','rowEnemies')
        chk(pg.evaluate(f"chars.find(c=>c.id==='HL-2').skills[{k}].of.who")=='rowEnemies','of who row enemies')
        # ชุด 16: เริ่มแมตช์ → ตัวเอง down ทันที · ใส่ใครล็อกเป็นตัวเอง
        pg.select_option(f'#s{k}-when','matchStart'); pg.select_option(f'#s{k}-do','selfKo')
        chk(pg.is_disabled(f'#s{k}-to') and 'ตัวเองล้มทันที' in pg.inner_text(f'#skillList .skcard >> nth={k}'),'selfKo editor')
        pg.select_option(f'#s{k}-when','hitTaken'); pg.select_option(f'#s{k}-do','reflect')
        # ชุด 12: สะท้อนแบบ % ของ อยู่ในรายการเมื่อโดนตี
        dos2=pg.eval_on_selector_all(f'#s{k}-do option','e=>e.map(o=>o.value)'); chk('reflectOf' in dos2,'reflectOf listed on hitTaken')
        # ชุด 20: ผลใหม่ พาเพื่อนไปตี / ล้าง % (ตีโดน) · สะท้อนดีบัฟ (ติดตัว)
        pg.select_option(f'#s{k}-when','hit'); dos3=pg.eval_on_selector_all(f'#s{k}-do option','e=>e.map(o=>o.value)')
        chk('allyStrike' in dos3 and 'cleansePct' in dos3 and 'reviveDowned' in dos3,'allyStrike + cleansePct + reviveDowned listed on hit')
        pg.select_option(f'#s{k}-when','passive'); dos4=pg.eval_on_selector_all(f'#s{k}-do option','e=>e.map(o=>o.value)')
        chk('reflectDebuff' in dos4,'reflectDebuff listed on passive')
        # ชุด 8: ช่องเสริมอยู่ใน "ตั้งค่าเพิ่มเติม" (ปิดไว้ถ้าเป็นค่าตั้งต้น) · ประโยคภาษาพูด + ตัวอย่าง + คำอธิบายผล
        pg.select_option(f'#s{k}-when','passive'); pg.select_option(f'#s{k}-do','shareArmor')
        hd=pg.inner_text(f'#skillList .skcard:nth-child({k+1}) .skillnow'); chk('ทุกครั้งที่ตัวนี้ได้เกราะ' in hd and 'ตัวอย่าง' in hd,'plain sentence + example')
        chk(pg.is_visible(f'#skillList .skcard:nth-child({k+1}) .dohelp'),'effect help shown')
        pg.select_option(f'#s{k}-when','hitTaken'); pg.select_option(f'#s{k}-do','reflect')
        pg.uncheck(f'#s{k}-lv1') if pg.is_checked(f'#s{k}-lv1') else None
        pg.uncheck(f'#s{k}-lv2') if pg.is_checked(f'#s{k}-lv2') else None
        print(w,'dirty:',pg.inner_text('#dirty'))
        # sim with edited HL-2 lv3
        pg.click('#tab-sim'); pg.evaluate("simTeam=emptySim(); simTeam[0][0][0]={id:'HL-2',level:3}; simTeam[1][0][0]={id:'WY-3',level:3}; renderSimTeams()")
        # ชุด 13: ปุ่มเลเวลทุกตัว (ใต้สนาม)
        pg.click('#simLvAll [data-lvall="1"]'); chk(pg.evaluate("simTeam.flat(2).filter(Boolean).every(u=>u.level===1)"),'all level 1')
        pg.click('#simLvAll [data-lvall="up"]'); chk(pg.evaluate("simTeam.flat(2).filter(Boolean).every(u=>u.level===2)"),'all level +1')
        pg.select_option('#simLvSide','1'); pg.click('#simLvAll [data-lvall="3"]')
        chk(pg.evaluate("simTeam[1].flat().filter(Boolean).every(u=>u.level===3) && simTeam[0].flat().filter(Boolean).every(u=>u.level===2)"),'right team only lv3')
        pg.select_option('#simLvSide','both'); pg.evaluate("simTeam[0][0][0].level=3; saveSim(); renderSimTeams()")
        pg.click('#simRun'); sk=pg.text_content('#simSkills'); print(w,'sim:',pg.inner_text('#simCards').replace('\n',' '))
        chk('สะท้อน' in sk,'sim shows new skill')
        # ชุด 30.4: ส่วนสกิลทำงานกี่ครั้งย่อไว้ (เปิดได้) · สรุปรายตัวใช้ติดช็อต/ติดไฟให้ศัตรู · ป้ายมัลติฮิต ×N (×1 ซ่อน)
        chk(pg.evaluate("!document.getElementById('simSkillsFold').open") and 'ติดช็อตให้ศัตรู' in pg.text_content('#pane-match .sumtbl thead') and 'ติดไฟให้ศัตรู' in pg.text_content('#pane-match .sumtbl thead') and 'ดาเมจช็อต' not in pg.text_content('#pane-match .sumtbl thead'),'skill count folded + given columns')
        # ชุด 36: ส่วนสกิลทำงานกี่ครั้ง/สรุปรายตัว/บันทึก ย้ายไปแท็บวิเคราะห์แมตช์ · หน้าแรกตัวละ 1 แถว (ย่อ) กางได้ 2 ชั้น · ตารางใครตีใคร · กราฟ
        chk(pg.locator('#simRes #simSkillsFold').count()==0 and pg.is_visible('#toMatch'),'sections moved out of sim tab')
        pg.click('#toMatch'); chk(pg.is_visible('#pane-match') and pg.is_hidden('#pane-sim') and pg.get_attribute('#tab-match','aria-selected')=='true','match tab opens')
        mu=pg.evaluate("[document.querySelectorAll('#mxUnits details.mxu').length, unitsOf(simLast.r).length, [...document.querySelectorAll('#mxUnits details.mxu')].every(d=>!d.open), !document.getElementById('mxMatFold').open && !document.getElementById('mxChartFold').open]")
        chk(mu[0]==mu[1] and mu[2] and mu[3],'one collapsed row per unit '+str(mu))
        pg.click('#mxUnits details.mxu >> nth=0 >> summary')
        head=pg.inner_text('#mxUnits details.mxu >> nth=0 >> .mx-row.h')
        chk(all(x in head for x in ['ที่มา','ครั้ง','รวม','เกราะกัน','HP หายจริง']),'unit pane table header '+head[:60])
        chk(pg.locator('#mxUnits details.mxu >> nth=0 >> .mx-lk').count()>0,'unit pane has log link')
        # ดาเมจที่ทำรวมทุกตัว = ดาเมจรวมในสรุปรายตัว (วิธีนับเดียวกัน)
        cmp=pg.evaluate("""(()=>{const a=[...document.querySelectorAll('#mxUnits details.mxu')].map(d=>+d.querySelector('.mx-num .mx-val').textContent.replace(/,/g,'')); const b=[...document.querySelectorAll('#simUnits tr')].map(tr=>+tr.children[7].textContent); return [a,b];})()""")
        chk(len(cmp[0])==len(cmp[1]) and all(abs(x-y)<=1 for x,y in zip(*cmp)),'match totals equal summary '+str(cmp))
        # ชุด 37 + UX: 4 แท็บรายตัวอยู่ข้างหัวข้อ "รายตัว" (นอกแถว) · แผนภูมิในแถวเปลี่ยนตามแท็บ · ลิงก์ไปบันทึก
        u0='#mxUnits details.mxu >> nth=0'
        tabs=pg.eval_on_selector_all('#mxTabs button','e=>e.map(b=>b.textContent)')
        chk(tabs==['ทำดาเมจ','โดนทำดาเมจ','อื่นๆ','สเตตัส'],'4 unit tabs next to heading '+str(tabs))
        chk(pg.evaluate("!!document.querySelector('.mx-sechead #mxTabs') && !document.querySelector('#mxUnits .mx-tabs')"),'tabs moved out of unit rows')
        sub=pg.inner_text(u0+' >> .mx-sub'); chk(re.fullmatch(r'\d+ ฮิต',sub) is not None,'collapsed sub line '+sub)
        chk('ฮิต' in pg.inner_text(u0+' >> .mx-pane:not([hidden]) .mx-tot >> nth=0') and 'ดาเมจรวม' in pg.inner_text(u0+' >> .mx-pane:not([hidden]) .mx-tot >> nth=0'),'tab1 description line')
        for i,nm in enumerate(tabs):
            pg.click(f'#mxTabs button >> nth={i}')
            chk(pg.eval_on_selector_all(u0+' >> .mx-pane:not([hidden])','e=>e.length')==1 and pg.get_attribute(f'#mxTabs button >> nth={i}','aria-selected')=='true','tab '+nm+' shows one pane')
        # แผนภูมิในแถวเปลี่ยนตามแท็บ: แท็บ 1 = "ทำ" · แท็บ 2 = "รับ" · แถวละ 1 แท่ง
        pg.click('#mxTabs button >> nth=0'); lab0=pg.inner_text(u0+' >> .mx-num small'); bars0=pg.eval_on_selector(u0,'e=>e.querySelectorAll(":scope > summary > .mx-bar").length')
        pg.click('#mxTabs button >> nth=1'); lab1=pg.inner_text(u0+' >> .mx-num small'); bars1=pg.eval_on_selector(u0,'e=>e.querySelectorAll(":scope > summary > .mx-bar").length')
        chk(lab0=='ทำ' and lab1=='รับ' and bars0==1 and bars1==1,'row chart follows selected tab '+lab0+'/'+lab1)
        # tab 2: 1 แถวต่อ 1 ศัตรู · ลิงก์เดียวต่อแถว
        pg.click('#mxTabs button >> nth=1')
        rows=pg.eval_on_selector_all(u0+' >> .mx-pane:not([hidden]) .mx-rw','e=>e.map(r=>[r.querySelectorAll(".mx-lk").length, r.textContent])')
        chk(len(rows)>=1 and all(x[0]>=1 for x in rows),'tab2 every enemy row has log link '+str([x[0] for x in rows]))
        pairrow=pg.locator(u0+' >> .mx-pane:not([hidden]) .mx-rw:has(.mx-lk:text("เฉพาะคู่")) .mx-lk >> nth=0')
        if pairrow.count()>0:
            pairrow.click()
            chk(pg.evaluate("document.getElementById('simLogFold').open") and pg.is_visible('#simPairBar') and pg.input_value('#simWho')=='' and not pg.is_checked('#simOnlyProc') and not pg.is_checked('#simNoSet'),'pair link opens log, clears filters')
            chk(pg.eval_on_selector_all('#simLog li[data-ev]','e=>e.length')>=1,'pair view has lines')
            pg.click('#simPairBar button'); chk(pg.is_hidden('#simPairBar'),'pair filter removable')
        # tab 4: สเตตัส · กางแล้วมีลิงก์ → ไปบรรทัดเดียว ไฮไลต์ ล้างตัวกรอง
        pg.evaluate("document.getElementById('simOnlyProc').checked=true")
        pg.click('#mxTabs button >> nth=3')
        fin=pg.eval_on_selector(u0,'e=>[...e.querySelectorAll(":scope > summary > .mx-fin .mx-fc")].map(c=>c.firstChild.textContent)')
        chk(fin==['พลังโจมตี','คูลดาวน์','มัลติฮิต','ไฟ/ฮิต','ช็อต/ฮิต','เกราะ/ฮิต','ฟื้น/ฮิต'],'stat tab: final stats incl. cooldown visible in row without opening '+str(fin))
        chk(pg.eval_on_selector(u0,'e=>[...e.querySelectorAll(":scope > summary > .mx-fin .mx-fc")].every(c=>c.style.getPropertyValue("--c").startsWith("var(--n-"))'),'stat chips each have own colour var')
        stx=pg.eval_on_selector_all(u0+' >> .mx-pane:not([hidden]) details.mxs','e=>e.length')
        if stx>0:
            pg.click(u0+' >> .mx-pane:not([hidden]) details.mxs >> nth=0 >> summary')
            if pg.locator(u0+' >> .mx-pane:not([hidden]) details.mxs >> nth=0 >> .mx-lk').count()>0:
                pg.click(u0+' >> .mx-pane:not([hidden]) details.mxs >> nth=0 >> .mx-lk >> nth=0')
                chk(pg.evaluate("document.getElementById('simLogFold').open") and pg.eval_on_selector_all('#simLog li.lg-hi','e=>e.length')==1 and not pg.is_checked('#simOnlyProc') and pg.is_hidden('#simPairBar'),'stat link highlights one line, filters cleared')
        # tab 3: ทุกแถวมีลิงก์
        pg.click('#mxTabs button >> nth=2')
        fx=pg.eval_on_selector_all(u0+' >> .mx-pane:not([hidden]) .mx-rw','e=>e.map(r=>r.querySelectorAll(".mx-lk").length)')
        chk(all(n>=1 for n in fx),'tab3 every row has log link '+str(fx))
        chk(pg.evaluate("(()=>{const r=simLast.r, idx=r.events.findIndex((e,i)=>i>10&&e.k==='dmg'); const ls=battleLogLines(r, simLast.m, {limit:3, keep:new Set([idx])}); return ls.some(li=>li.dataset&&li.dataset.ev===String(idx));})()"),'log keeps target line beyond limit')
        pg.click('#mxTabs button >> nth=0')
        pg.click('#mxMatFold summary'); pg.click('#mxMat td button:not([disabled]) >> nth=0'); chk(pg.eval_on_selector_all('#mxMat .mx-cell li','e=>e.length')>=1,'matrix cell breakdown')
        pg.click('#mxChartFold summary'); ch=pg.evaluate("[document.querySelectorAll('#mxChart polyline').length, document.querySelectorAll('#mxChart .mx-chips button').length]")
        chk(ch[0]>=2 and ch[0]==ch[1],'chart lines + chips '+str(ch))
        pg.click('#mxChart .mx-chips button >> nth=0'); chk(pg.evaluate("document.getElementById('mxChart').classList.contains('hi') && document.querySelectorAll('#mxChart polyline.on').length===1"),'chart highlight')
        chk(not pg.evaluate('document.documentElement.scrollWidth > innerWidth + 1'),'match tab no horizontal scroll')
        pg.click('#simSkillsFold summary'); chk(pg.evaluate("document.getElementById('simSkillsFold').open"),'skill count unfolds')
        pg.click('#tab-sim')
        # ชุด 33: ฮิต = ครั้งที่ออกไปตี (ตีแบ่งนับ 1) · ดาเมจรวม = ดาเมจฮิต + ดาเมจอื่นๆ
        pg.evaluate("simTeam=emptySim(); simTeam[0][0][0]={id:'SF-8',level:1}; simTeam[1][0][0]={id:'HL-6',level:1}; simTeam[1][0][1]={id:'HL-1',level:1}; simTeam[1][1][0]={id:'PT-1',level:1}; renderSimTeams()"); pg.click('#simRun')
        sm=pg.evaluate("""(()=>{const r=simLast.r, me=r.events[0].units.find(x=>x.side===0).uid; const want=r.events.filter(e=>e.k==='dmg'&&e.why==='hit'&&e.from===me&&!e.sub).length;
          const row=[...document.querySelectorAll('#simUnits tr')][0].children; const n=i=>+row[i].textContent; return [n(2), want, n(7), n(3)+n(6)];})()""")
        chk(sm[0]==sm[1] and abs(sm[2]-sm[3])<=1,'summary swings + total '+str(sm))
        pg.evaluate("simTeam=emptySim(); simTeam[0][0][0]={id:'WY-5',level:3}; simTeam[1][0][0]={id:'HL-6',level:1}; renderSimTeams()"); pg.click('#simRun')
        mc=pg.evaluate("(()=>{const m=simLast.m; return [...simView.units.values()].map(v=>[m[v.id].multi[v.level-1], v.multiEl.hidden, v.multiEl.textContent]);})()")
        chk(all((x[0]>1 and not x[1] and x[2]=='×'+str(x[0])) or (x[0]==1 and x[1]) for x in mc) and any(x[0]>1 for x in mc),'multihit chip '+str(mc))
        # เรียกตัวมาแทน (PL-5): จำลองแล้วมีตัวใหม่โผล่ในสนาม
        pg.evaluate("simTeam=emptySim(); simTeam[0][0][0]={id:'PL-5',level:1}; simTeam[1][0][0]={id:'HL-6',level:3}; renderSimTeams()")
        pg.click('#simRun'); pg.click('#simSkip')
        chk('เรียก' in pg.text_content('#simLog'),'summon shown in log')
        # ชุด 67: บอสยืนหลายช่อง = ชื่อบอสขึ้นทุกช่องที่ยืน (การ์ด 1 ช่อง + ป้ายชื่อช่องที่เหลือ) · แตะป้าย = เลือกบอส
        pg.evaluate("simTeam=emptySim(); simTeam[0][0][0]={id:'PL-3',level:1}; renderSimTeams(); document.getElementById('simFoeBoss').click(); document.getElementById('simRun').click()")
        bc=pg.evaluate("(()=>{const v=[...simView.units.values()].find(x=>x.cells); return v ? [v.cells.length, document.querySelectorAll('#simArena .boss-tag').length, [...document.querySelectorAll('#simArena .boss-tag .uname')].every(t=>t.textContent===v.name)] : null;})()")
        chk(bc is not None and bc[0]>1 and bc[1]==bc[0]-1 and bc[2],'boss name on every cell '+str(bc))
        # ชุด 69: หลอดเลือดบอสหลายแถบ = สีต่างกันต่อแถบ + ข้อความ "แถบ k/n"
        hb=pg.evaluate("(()=>{const v=[...simView.units.values()].find(x=>x.cells); return v && v.bars>1 ? [v.barText.textContent.startsWith('แถบ '), !!v.hpFill.style.background, v.hpFill.style.background!==v.hpBar.style.background] : null;})()")
        chk(hb is None or all(hb),'boss bar colour per bar '+str(hb))
        pg.evaluate("document.getElementById('simFoeTeam').click()")
        # ชุด 71: ห้องบอส = กฎไม่จำกัดต่อเฟส (กล่องละกฎ + ✕) · เฟส 2+ เปลี่ยนค่าบอสได้ (เช่น พลังโจมตี)
        bk=pg.evaluate("JSON.stringify(stageCfg.bosses)")
        pg.evaluate("document.getElementById('tab-stage').click(); document.getElementById('stg-bosses').click(); stageCfg.bosses[0].phases=[bossPhase(0),bossPhase(1)]; bossOpen=stageCfg.bosses[0].id; renderStage()")
        bid=pg.evaluate("stageCfg.bosses[0].id")
        for r in ['atkUp','regen','aoe']: pg.select_option('#stg-%s-p1-add'%bid, r)
        pg.select_option('#stg-%s-p1-st-add'%bid, 'atk'); pg.fill('#stg-%s-p1-st-atk'%bid, '77'); pg.press('#stg-%s-p1-st-atk'%bid, 'Tab')
        bf=pg.evaluate("(()=>{const p=stageCfg.bosses[0].phases[1]; return [p.rules.length, document.querySelectorAll('.phase-card .rule-box:not(.stat-box)').length, p.stats.atk, bossUnit(stageCfg.bosses[0],1).phases[1].stats.atk];})()")
        chk(bf==[3,3,77,77],'boss phase: 3 rules + phase atk '+str(bf))
        pg.click('#stg-%s-p1-r0-del'%bid); chk(pg.evaluate("stageCfg.bosses[0].phases[1].rules.map(r=>r.id).join()")=='regen,aoe','boss rule delete')
        # set 168 step 8: boss v2 globals (g edit -> growth table) · Heat ladder move + reset via confirm dialog
        b2k=pg.evaluate("JSON.stringify(stageCfg.boss2)")
        pg.evaluate("stageCfg.bosses[0].v2=true; renderStage()")
        pg.fill('#stg-b2-g','3'); pg.press('#stg-b2-g','Tab')
        h0=pg.evaluate("stageCfg.boss2.heat.map(r=>r.id)"); pg.click('#stg-heat-0-down')
        hv=pg.evaluate("(()=>{const t=document.querySelector('.b2-grow'); return [stageCfg.boss2.g, t?t.rows.length:0, t?t.rows[3].cells[1].textContent.startsWith(String(Math.round(stageCfg.bosses[0].hp*9))):false, stageCfg.boss2.heat[1].id];})()")
        chk(hv[0]==3 and hv[1]==6 and hv[2] and hv[3]==h0[0],'boss v2 g + growth table + heat move '+str(hv))
        pg.click('#stg-heat-reset'); pg.click('#stgConfirmYes')
        chk(pg.evaluate("stageCfg.boss2.heat.map(r=>r.id)")==h0,'heat reset via dialog')
        pg.evaluate("stageCfg.boss2=JSON.parse(%s)" % json.dumps(b2k))
        pg.evaluate("stageCfg.bosses=JSON.parse(%s); bossOpen=null; stageChanged(); renderStage(); document.getElementById('tab-sim').click()" % json.dumps(bk))
        # set 90: กฎเกม tab = group chips + search + odds table (edit -> badge + "เดิม" hint, group reset)
        pg.evaluate("document.getElementById('tab-rules').click()"); pg.click('#rchip-shopOdds')
        chk(pg.evaluate("[...document.querySelectorAll('#rform .rsec')].filter(s=>!s.hidden).map(s=>s.dataset.g).join()")=='shopOdds','rules chip shows one group')
        pg.fill('#rule-shop-levelOdds-0-ธรรมดา','80'); pg.press('#rule-shop-levelOdds-0-ธรรมดา','Tab')
        rb=pg.evaluate("[RULES.shop.levelOdds[0]['ธรรมดา'], document.querySelector('#rchip-shopOdds .sb').textContent, !document.querySelector('#rule-shop-levelOdds-0-ธรรมดา').nextElementSibling.hidden, document.querySelector('#rform .rsum').textContent]")
        chk(rb[0]==80 and rb[1]=='1' and rb[2] and rb[3].startswith(str(80+pg.evaluate("RARITIES.slice(1).reduce((s,r)=>s+(RULES.shop.levelOdds[0][r]||0),0)"))),'rules odds edit: value + badge + was + total '+str(rb))
        pg.click('#rsec-shopOdds .rreset'); chk(pg.evaluate("Object.keys(ruleEdits).length===0 && RULES.shop.levelOdds[0]['ธรรมดา']===RULES_BASE.shop.levelOdds[0]['ธรรมดา']"),'rules group reset')
        pg.fill('#ruleFind','ราคา'); chk(pg.evaluate("[...document.querySelectorAll('#rform .rsec')].filter(s=>!s.hidden).map(s=>s.dataset.g).join()")=='shop','rules search')
        pg.fill('#ruleFind',''); pg.click('#rchip-all'); pg.evaluate("document.getElementById('tab-sim').click()")
        # ชุด 35: แผงค้นหาลงสนาม (แตะ = ช่องว่างแรกของฝั่งที่เลือก · ลากได้ · ค้างหน้าค้นหา) · 💾 เก็บสถานะหน้า · ค่าเท่าเดิมไม่ขึ้นสีเหลือง
        pg.evaluate("simTeam=emptySim(); simTeam[1][0][0]={id:'HL-1',level:1}; saveSim(); renderSimTeams(); dock.side=0; renderDock()")
        pg.fill('#dockQ','PL-3'); chk(pg.eval_on_selector_all('#dockList .dk-item','e=>e.length')==1,'dock search filters')
        pg.click('#dockList .dk-item'); chk(pg.evaluate("simTeam[0].flat().some(u=>u&&u.id==='PL-3')") and pg.is_visible('#dockList .dk-item'),'dock tap adds + stays open')
        pg.fill('#dockQ','')
        it=pg.locator('#dockList .dk-item >> nth=4'); it.evaluate("e=>{e.scrollIntoView({block:'start'}); scrollBy(0,-170)}"); bb=it.bounding_box(); cid=it.get_attribute('data-cid')  # ช่องเป้าต้องอยู่ในจอ (ลากจริงใกล้ขอบจอ = เลื่อนหน้าให้เอง)
        tb=pg.locator('#simArena [data-key="1:0:1"]').bounding_box()
        pg.mouse.move(bb['x']+15,bb['y']+10); pg.mouse.down(); pg.mouse.move(bb['x']+35,bb['y']+30,steps=3); pg.mouse.move(tb['x']+tb['width']/2,tb['y']+tb['height']/2,steps=8); pg.mouse.up()
        chk(pg.evaluate("JSON.stringify(simTeam[1][0][1])")=='{"id":"%s","level":1}'%cid and pg.evaluate("simTeam.flat(2).filter(Boolean).length")==3,'dock drag to slot (no extra tap add)')
        pg.click('#simDock > summary'); pg.wait_for_timeout(100); chk(not pg.evaluate("$('simDock').open") and pg.is_hidden('#dockList') and pg.evaluate("dock.open")==False,'dock hides (ชุด 35.1)')
        pg.click('#simDock > summary'); chk(pg.is_visible('#dockList'),'dock shows again')
        st=pg.evaluate("JSON.stringify(uiState('t'))"); pg.evaluate("simTeam=emptySim(); simSpeed=1")
        pg.evaluate("applyUi(Object.assign(JSON.parse(%r),{ctrls:{simLvSide:'evil',simSeed:'5'}}))"%st)
        chk(pg.evaluate("simTeam[1][0][1]!==null && $('simLvSide').value==='both' && $('simSeed').value==='5'"),'ui state round trip + bad value rejected')
        chk(pg.evaluate("(()=>{const d={chars:Object.fromEntries(BASE_CHARS.map(c=>[c.id,{skills:c.skills,hp:c.hp}])),tribes:{}}; const keep=[chars,tribes]; applyDiffs(JSON.parse(JSON.stringify(d))); const n=countEdits(diffs()); [chars,tribes]=keep; return n;})()")==0,'same values after round trip are not marked edited')
        # reload: draft persists
        pg.reload(); pg.evaluate("current='HL-2'; showTab('chars'); renderCharForm()")
        n2=pg.eval_on_selector_all('#skillList .skcard','e=>e.length'); chk(n2==n1,'draft persisted after reload')
        # validation error path: break multi
        pg.fill('#f-multi-0','0'); pg.press('#f-multi-0','Tab'); chk(not pg.is_hidden('#errs'),'error shown for multi 0'); chk(pg.inner_text('#sbSave')=='!','edit step badge flags error'); print(w,'err:',pg.inner_text('#errs')[:80])
        chk(pg.is_disabled('#analyze'),'analyze disabled on error')
        # reset
        pg.click('#cundo'); chk(pg.is_hidden('#errs'),'undo clears')
        pg.on('dialog', lambda d: d.accept())
        # malicious name
        pg.fill('#f-name','<img src=x onerror=alert(1)>ab'); pg.press('#f-name','Tab'); print(w,'name sanitized:',pg.input_value('#f-name'))
        chk('<' not in pg.input_value('#f-name'),'name sanitize')
        # ปุ่มวิเคราะห์: ตรวจแค่ว่ากดได้ (การวัดจริงทดสอบด้วย node lab/measure.mjs แล้ว · ตัดสิน 22 ต.ค. เพื่อลดเวลา)
        chk(not pg.is_disabled('#analyze'),'analyze enabled')
        # cleanup draft
        pg.evaluate("localStorage.clear()")
        hs=pg.evaluate('document.documentElement.scrollWidth > innerWidth + 1'); print(w,'balance hscroll',hs)
        ctx.close()
    b.close()
print('FAILS',fails); print('ERRORS',errs)
