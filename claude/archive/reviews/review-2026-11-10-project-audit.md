# Whole-project audit — 10 Nov 2026 (user request "ตรวจงานทั้งหมด") · report only, nothing changed

Checked at main 01e2dd2: build ok (4 pages) · unit tests 341/341 · ui_smoke NOT run in this chat (last gate: set 179 PASS).
Read: repo layout, build.mjs, bootstrap.mjs, CI yml, hook, handoff, reviews index, build-plan (scope/security/steps), pending, backlog, samples of core + game code. Not read line by line: battle.js, stage.js, Balance Room fragments, the Thai rule docs.
Status = open. Every item needs the user's pick before any edit.

## A. Fix soon (cheap, real risk)
- **A1 Game page has no global error catcher.** `run.template.html` has no `window.onerror` / `unhandledrejection` handler. A JS error mid-run = the screen just stops, the player sees nothing, and we get no report. Add: catch → short Thai message + "copy error" + save kept. (~20 lines + 1 ui_smoke check.)
- **A2 Player name vs "no player identity" rule.** build-plan ความปลอดภัย says play data has no identifying info, but since set 110 the run journal carries the player name `nm` and is sent to the game db (`runlogs/…`). Either update the doc (name is typed by the player, shown to the owner only) or stop sending `nm` to the db. Also tell the player on the name screen that runs are recorded.
- **A3 Public repo holds things that should not be public** (CI yml says the repo is public since 6 Nov; build-plan line 12 still says private): `claude/archive/batomon_analysis_template_test.xlsx` + `Creature_Auto_Battler_Game_Bible 4.xlsx` (analysis of the game we must not copy + the full design), the 2nd account's name in 4 archive/relay files, artifact links in handoff. Decide: make the repo private again (Actions minutes then count) or remove those files (they stay in git history unless rewritten).
- **A4 "Plays offline, loads nothing from the internet" is not true today.** All 4 pages load Google Fonts by link. Works offline with fallback fonts, but text width changes (clipped names found in review-mobile C). Fix when packaging (Capacitor/Godot) or embed the fonts; at least correct the build-plan line.
- **A5 CI runs Node 20, cloud chats run Node 22.** Same code, different engine → a possible source of "passes here, fails in CI". Set both to the same version.

## B. Docs that no longer match reality (stale)
- **B1 reviews.md index is 2 days behind:** 18 review files of 9–10 Nov in claude/ root are not listed; several are already decided (cfgdiff rev50–57, bosskits, bossv2, brainstorm-boss/gamelog/ui-ease, mobile) and should be in archive/reviews/. claude/ root now has 23 review files + 6 mockup files (≈ 900 KB of html/png).
- **B2 handoff State says t-skill-calc F1–F4 print as WAIT** — the code says all four were decided and are real tests (t-skill-calc.js:676). reviews.md row "open (F1–F4 WAIT)" is stale too.
- **B3 handoff "instructions V5.6" vs instructions.md V5.7.**
- **B4 handoff is 10.8 KB (rule: ≤ 1 screen).** Relay bullets are 600–1,500 characters each; it is printed by the hook into every chat. Trim: Relay = result + next only, details → archive.
- **B5 build-plan line 12 still describes the cancelled Jules flow** and the private repo.
- **B6 README.md is one word.** A 10-line README (what it is, how to build/test, where docs are, art credits) costs nothing and matters in a public repo. No LICENSE file either (public repo without licence = others may not reuse; say so on purpose).
- **B7 ~39 old claude/* branches on GitHub** (already known; user-side cleanup).

## C. Code structure (works, but costs tokens and risk every set)
- **C1 Very long lines.** battle.js 160 lines > 200 chars (max 515) · stage.js max 2,256 · labels.js max 1,483 · ui_smoke.py max 682. Every grep/read pulls huge lines, diffs are unreadable, merge conflicts between the 2 accounts get likelier. Do not reformat everything at once; rule: any function touched in a set gets wrapped to ≤ 160.
- **C2 run.template.html = 2,198 lines, 201 KB, CSS + HTML + all game UI code in one file,** while the Balance Room was already split into fragments (`lab/balance/`). Split the game page the same way (css/, body, js/ by screen: shop, battle, popups, run end, db) — the include mechanism already exists in build.mjs. Best done at the start of step 6 polish, before more UI work piles on.
- **C3 Game UI logic is tested only through ui_smoke** (browser, ~4 min, flaky click still unexplained from CI 863). Pure helpers inside the page (drag/drop target `dropAt`, `playerSide`, permText…) could move to a small `game/*.js` module and get fast unit tests.
- **C4 build.mjs bundler is regex-based:** strips `import …;` and `export` before const/function/let/class only. `export { a, b }`, `export default`, or an import with a `;` inside a string would silently break only the built page. The duplicate-name check reads only the first `<script>` block. Either add a test that fails on unsupported export forms, or (later) switch to esbuild. Low urgency — the gate catches most of it.
- **C5 Mixed Thai/English comments in core** (battle.js 241 Thai comment lines). CLAUDE.md wants English for what Claude reads. Translate only when a file is opened anyway (same rule as docs).
- **C6 Test runner is home-made and sequential (~3 min for 341 tests + 3×1,000-match stats).** Fine for now; cheap win = run the match-length stats only in `gate`, not in every `setup`.
- **C7 Lab scripts: 30+ one-off tools in src/lab + 12 in claude/bosstune + bossref.json 2.2 MB in the repo.** Mark which are still used (measure, runerun, econ55, charstat, bossrun, cfgdiff) and move the rest to an `archive/` folder; bossref.json could be regenerated instead of stored.
- **C8 Built pages are ~1.1–1.3 MB each** (runlog viewer 620 KB because it bundles all of CORE incl. botdata 158 KB). Not a problem yet; note for the mobile/packaging step.

## D. Game / plan (MVP1 target 28 Nov — 18 days left, step 6 only)
- **D1 Biggest open gameplay risk is pacing, not polish:** backlog "longer you play, longer you survive" has no solution; set 179 found fights in rounds 1–5 lasting 80–150 s. For a first-time player on a phone that is the first impression. Recommend deciding this before more UI polish (values → HARD RULE 6 path).
- **D2 No first-run help.** The page has term tooltips but no "how to play" (merge 3, tribes, runes, hearts). For friends testing via link (set 177 plan) a 4–5 card intro is inside MVP1 polish scope.
- **D3 No sound and no settings screen** — fine to skip for MVP1, but say so in build-plan so it is a decision, not a gap.
- **D4 Open decisions are piling up** (Relay "Open decisions" = 6 topics; runes C1 C3–C8 without icons; rune names/text drafts since 8 Nov; legend-rune idea unanswered; PL-2/PT-3/SF-7). One 15-minute "decide or drop" round would clear the list.
- **D5 Real-player data loop exists (ARUN1 + stats tab) but has no data yet.** Getting 3–5 friends to play 1 run each this week is worth more than another simulated measurement.
- **D6 Mobile review findings B/C (tap targets < 24 px, 9.6 px text, clipped names)** — check which remain after sets 176/179 and close the file.
- **D7 Godot move after MVP1:** core is deterministic JS with 341 tests — plan to keep the JS core as the reference and port by replaying the same seeds, not by rewriting from the rule docs. Write this down in build-plan before the move starts.

## E. Workflow / rules
- **E1 Process weight is high for a 2-person (user + Claude) project:** CLAUDE.md 13.8 KB loaded every chat + 12 skills + 9 workflow files + handoff 10.8 KB + hook output. Sets 150–179 (30 sets) included ~12 sets about rules/skills/audits themselves. Suggest a freeze: no new rules/skills until MVP1 ships unless a rule failure caused real damage.
- **E2 CLAUDE.md duplicates what skills already say** (gate rule, close-out trigger, relay). Keep in CLAUDE.md only: hard rules in one line each + the topic table; move history tags ("user rule 8 Nov, set 150 B1") out — they are noise for the model.
- **E3 Rule clash seen in this chat:** chat-start says "push the 🔒 lock line to main", cloud sessions are told to push only to their own branch. Works when the user's rule is treated as permission, but should be written explicitly in relay.md ("cloud session: docs-only pushes to main are allowed").
- **E4 Two-account relay** is the source of most process text (lock line, paste-message, publish ownership). If one account can do the work, the relay rules can shrink a lot.
- **E5 Don't:** more brainstorm/expert-panel sets before MVP1 (3 in two days, mostly parked) · more boss tuning tools · new measuring scripts · art-pipeline work (already parked — keep it parked).

## Suggested order (if the user agrees)
1. A1 error catcher + A5 Node version + B1–B5 doc cleanup (one small set, no values).
2. A2/A3 decisions (privacy + public repo).
3. D1 pacing decision → then C2 split of the game page → step 6 polish incl. D2 intro.
4. C1/C5 only as files are touched. E1–E2 at the next weekly review.
