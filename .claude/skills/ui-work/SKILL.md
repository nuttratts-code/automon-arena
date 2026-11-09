---
name: ui-work
description: Automon Arena UI work (หน้า / แท็บ / ปุ่ม / ตาราง / จัดหน้า / หน้าตา / เมนู / popup / Balance Room / หน้าเกม / check / runlog viewer / mockup) — any task that adds or changes something the user SEES on a page, even when it feels like data work (a new stats tab, a sortable table, a new button, new text layout). Ask button/scope questions up front → design skill → build → screenshots desktop + phone → critique → gate. Rules live in claude/workflow/ui.md and win if anything differs.
---
# UI work (set 158 — skill from claude/workflow/ui.md; sets 138/138b/144/146 skipped the rule)

Counts as UI: any change to src/game/** markup/CSS/view code, src/lab/balance/** (css, js that builds DOM, body.html), *.template.html, runlog viewer, or a new artifact page. A new tab/table/column/button of numbers IS UI.

1. **Ask up front (rule A1), in the set's first question round:** where it goes (page · tab), what it shows, phone layout. Reset / delete / overwrite button → what it returns to (game values · last saved · defaults) and what it covers (one tab · whole page); it must open a confirm dialog naming what will be lost (ui.md W4).
2. **Design skill:** invoke `frontend-design:frontend-design` with the Skill tool before writing UI code (also `artifact-design` before a new artifact page). Keep the page's existing palette/fonts unless the user asks for a new look. Placeholder art = coloured shapes + names, never like the original game (claude/art-style.md).
3. **Build:** textContent for external text (no innerHTML), no eval, no outside scripts (HARD RULE 7).
4. **Screenshots + critique:** `cd src && node build.mjs`, then Playwright (chromium preinstalled) at desktop 1100 px and phone 390 px — the changed screen, light + dark if the page has both. deviceScaleFactor 1 (for Claude only). Look at them: cut text, overflow, horizontal scroll, tap targets, contrast. Fix, re-shoot. (ui_smoke also leaves shots in `$TMPDIR/automon-shots` after a gate.)
4b. **Phone audit (game page; set 159, rules ui.md "Phone audit"):** Python Playwright (`pip install playwright` if missing; `chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--no-sandbox'])`), open `file://…/src/game.html`, fill `#nameIn` + click `#nameGo`, close the rune offer (`#offer button`, then `#flagPick [data-tribe]` if shown, `closePop()` if `#dlg` open). Sizes 1366×768 · 844×390 · 740×330 · 667×375 · 390×844 (click `#rotateSkip`). Late-game state: set `P.round`, `P.gold`, `P.board` (= `[lane][row]`, 3×2) and `P.bench` with `{uid:P.uid++, id, level, perm:{}, paid}` units, `P.shop=[{id,locked:false}]`, then `render()`. Screens: `#menuBtn`, `#runeBtn`, `#tribeBtn`, `#diffInfo`, `#shopLv`, shop/board tap (floating card), `#fight` (press twice if it asks to confirm), `$('skip').click()` via evaluate → result, `#toMx`, `openPop('runcode')`, `P.over=true;renderRunEnd();showScreen('runEnd')`, reload → resume. Per screen run this in the page and fix every hit:
```js
(()=>{const o={small:[],tiny:[],clip:[],off:[]},vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>=1&&r.height>=1&&s.visibility!=='hidden'&&s.display!=='none'};const top=document.querySelector('dialog[open]')||document;
for(const e of top.querySelectorAll('button,[role=button],select,input,summary,a')){if(!vis(e))continue;const r=e.getBoundingClientRect();if(r.height<24||r.width<24)o.small.push((e.id||e.className)+':'+Math.round(r.width)+'x'+Math.round(r.height))}
for(const e of top.querySelectorAll('*')){if(!vis(e)||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;const s=getComputedStyle(e),t=e.textContent.trim().slice(0,12);if(parseFloat(s.fontSize)<10)o.tiny.push(t+':'+s.fontSize);
 if(['hidden','clip'].includes(s.overflowY)&&e.scrollHeight>e.clientHeight+1)o.clip.push(t);const r=e.getBoundingClientRect();if(r.right>innerWidth+1||r.bottom>innerHeight+1)o.off.push(t)}
o.scroll=[document.documentElement.scrollWidth,document.documentElement.scrollHeight,innerWidth,innerHeight];return o})()
```
   `off` inside a scrolling popup/screen is fine; `tiny` on the Lv star badge is exempt. Look at the screenshots too — overlaps (floating numbers, tags) do not show in the numbers.
5. **Test:** add/extend a ui_smoke check for the new element when it can break silently. Then `merge-code` (setup → gate).
6. **Record (so the weekly review can check it):** the set's Relay line says `UI: design skill ✓ · shots 1100+390 ✓` (or why not).
