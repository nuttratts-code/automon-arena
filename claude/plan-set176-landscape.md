# Plan set 176 — landscape-only game page + landscape fixes (from set 175 mobile check)
Source: claude/review-2026-11-10-mobile.md · user 10 Nov: portrait work parked, focus on landscape only; K = "lock it for now: portrait not allowed".
Confirm first (1 line in Thai): K means remove the "ใช้แนวตั้งต่อ" button (#rotateSkip) so portrait phones only see "หมุนมือถือเป็นแนวนอน"? (desktop/landscape unchanged)
Branch from latest main. UI work → skill ui-work (design skill first).

1. [x] src/game/run.template.html ~909/1751: remove #rotateSkip button + its listener (rotate screen stays, cannot be dismissed) · check: portrait 390×844 shows only the rotate screen.
2. [x] src/tests/ui_smoke.py:49, :410-411: drop the rotateSkip click; portrait test = rotate screen visible, no skip button; any test that ran in portrait → use landscape.
3. [x] claude/workflow/ui.md "Phone audit" + skill ui-work 4b: drop 390×844 portrait from the pass sizes (portrait parked, set 175 K); 4b notes: close any open dialog before renderRunEnd; rune offer does not show at round 1.
4. [x] B small tap targets (landscape): #autoSkip checkbox (16–20 px) · #shopLv (76×22) · unit card .term rows (19–22 px) · match-details filter rows (22 px) + #logProc #logNoSet (13 px) → ≥ 24 px hit area.
5. [x] C small/cut text (landscape): battle enemy-rune line 9.6 px · burn/shock chips 9.6 px → ≥ 10 px · battle log line clipped ("7.0 วิ ทีมคุ…") · late-game bench/shop names cut at 1366 (นักจุด… มังกรวายุคลั…).
6. [x] Tribe popup at 740×330 / 667×375: close button reachable without scrolling (sticky header/footer).
7. [x] Audit again 1366×768 · 844×390 · 740×330 · 667×375 (prep r1 + late, popups, card, battle, result, match details, run end) → screenshots → critique.
8. [ ] build-plan step 6 note (Thai, +0.1) "แนวตั้งพักไว้ — เกมเล่นแนวนอนเท่านั้น" · setup → gate → merge → publish game (stop point: tell the user) → close-out.
