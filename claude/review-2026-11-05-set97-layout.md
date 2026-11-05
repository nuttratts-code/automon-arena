# Set 97 — game page redesign spec (V1.0, 5 Nov 2026)
User-approved. Mockup (fake numbers, NOT the game): https://claude.ai/artifact/CW7rSU3623sF8YhXk9S66W · source copy: claude/mockups/game-layout-v3.html (use it as the visual/CSS reference).

## User decisions (final)
1. Landscape-first, full width (no max-width column), everything on ONE screen, no page scroll. Phone portrait → "rotate your phone" screen with "ใช้แนวตั้งต่อ" (continue) button.
2. HUD (top bar): round · hearts · wins · gold · **tribe button** (mini tribe shapes + "active/total" badge) · **rune button** (bag icon + count) · difficulty ง่าย/กลาง/ยาก + "?" popup.
3. Field: while shopping only MY team (3×2, cols หลัง กลาง หน้า→) at full width — enemy side NOT shown. While fighting: my 3×2 | enemy 3×2 on the same field (dashed divider).
4. Bench row under the field — **5 slots** (rule change 6 → 5, see below).
5. Bottom dock (bigger, ~20vh): reroll button (+ shop Lv) · shop cards (big icon, name, id·rarity, tribe, price) · big "เริ่มสู้ (n/6)" button. During battle the dock shows clock · speed 1/2/4/8/16 · skip · ticker line.
6. **Tap = show details only** (popup). **Move = drag only**: shop→board/bench = buy · board/bench ↔ board/bench = move/swap/merge · own unit → dock = sell. No more select-then-tap-to-place and no tap-tap swap.
7. All detail views are popups (`<dialog>`): unit details (current renderInfo content: Lv1/2/3 tabs, stats2, perm "now" row, skills, buy/lock/sell buttons) · tribe list → tribe detail (← กลับ) · rune bag list → rune detail (← กลับ) incl. slot picker + heart trade · difficulty info (+ scout box text) · live unit info in battle (renderBInfo) · match details (mxFold content + battle log logBox) · replay list.
8. Result overlay: "▶ ดูรีเพลย์" (replays THIS match right away) · "รายละเอียดแมตช์" (popup) · "ไปรอบถัดไป".
9. Messages (msgs list) → toast. Win rune offer → blocking popup (can't fight until picked/skipped, same rule as now). resume / runEnd / notice stay full screens/overlays.

## Bench 6 → 5 (user decision 5 Nov) — knock-on work
- core/rules.js `shop.bench: 6 → 5` (+ lock note text "หน้าจอจัดไว้ 5 ช่อง"). S doc shop-merge-rules: table row "ม้านั่ง 6 ช่อง → 5" + bump +0.1 (V5.2).
- dataHash includes rules.shop → bot teams void → regenerate (`lab/botgen.mjs`, 2,400 runs as set 96) and re-tune bosses (`lab/runerun.mjs 600 กลาง 75 62 50 --write`), report before/after win %. Old saves auto-cleared as "game updated" (data hash change) — mention to user.
- bot.js uses st.bench.length (cap) → no code change expected; check tests (t-shop, t-save, t-bots) for hard-coded 6.

## Code map (where things live)
- Page: src/game/run.template.html (CSS ~240 lines + markup + script ~630 lines). Battle view: src/game/view.js `BattleView(root, …)` — SHARED with Balance Room (balance.template.html uses game/view.js and css fragments 55-match.css / 60-units.css, js 50/51) → don't break their API; Balance Room must still pass ui_smoke.
- Interaction today: script `tap(ref)`, `act(from,to)`, `drag` pointer handlers, `sel`, `renderInfo()` (#info panel), `doBuy`. Replace tap-to-place with: pointerup without move → open unit popup.
- Keep core logic untouched (core/shop.js buy/sell/move/merge already used by act()).

## ui_smoke (src/tests/ui_smoke.py, game section lines ~21–135) must be rewritten
- Viewports: game checks at (1366,768) and (844,390) landscape; balance/check pages keep current sizes.
- Selectors that move: #info (→ dialog), #msgs (→ toast), #shopOdds/#shopLv (→ dock), #diffHint/#scoutBox (→ difficulty popup), #offerPanel/#offer (→ popup), #rBag (→ rune popup), #replayPanel/#replayList (→ replay popup), #mxFold/#toMx/#logBox (→ match popup), #board .cell / .filled / parseRef (keep data-ref on cells), buy via popup "ซื้อ" button.
- New checks: no vertical/horizontal page scroll in prep AND battle at both sizes · tap on board unit opens popup and does NOT move it · drag bench→board moves (use pg.mouse down/move/up) · drag unit → dock sells · bench has 5 cells · enemy side hidden in prep, shown in battle · result "ดูรีเพลย์" replays the same match · tribe/rune HUD popups list items · portrait 390×844 shows rotate screen, button dismisses.

## Suggested order (commit + push after each)
1. Bench 5 rule + docs + tests → botgen + boss retune (long runs in background).
2. Markup/CSS layout (HUD, field, bench, dock, rotate screen) — still old interactions.
3. Popups (dialog helper) + move panels into them; toast.
4. Interaction: tap=popup, drag-only move, drag-to-dock sell.
5. Battle on same field + result buttons + replay-this-match.
6. ui_smoke rewrite → setup until pass → gate once → merge → publish game (Links URL) + balance room/check if their build changed.
