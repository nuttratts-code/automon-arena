# workflow · publish and test the pages

V1.31 · 8 Nov 2026 (set 153: CI rule G1, gate text points to CLAUDE.md) · V1.30 · 8 Nov 2026 (set 152 workflow audit: §3 = Artifact tool procedure, CI check before publish) · V1.29 · 8 Nov 2026 (set 151 review: W1 false-FAIL rerun 9.3 · W10 bug test 9.1a) · V1.28 · 31 Oct 2026 (3 rewritten for the mcp artifact tools + gate first; 9 level 2 = gate) · older versions: git log

## 3. Publish (never force · always update the existing link · never create a new copy)
- **Gate first:** CLAUDE.md HARD RULE 3 (publish gate: latest main, GATE: PASS on that exact commit).
- **Who publishes (set 152, = relay.md "Publish workflow"):** `Artifact read` the Links URL. Header says "writer" → this chat publishes. "not found" / not writer → do not publish; write "publish pending" in the Relay block and give the user the paste-message from relay.md.
- **How (Artifact tool):** publish with `file_path` = the built page (build writes game.html · balance.html · system-check.html into src/) and `url` = the Links URL, `label` = set name. Never create a new artifact (link changes, Balance Room data is lost). A conflict = someone published in between → read the live version, compare, merge, publish again.
- Before publishing, the newest GitHub Actions run on main for a commit that changed code must be green, and no code changed after it (docs-only pushes have no run; set 153 G1; check with the GitHub MCP actions tools).
- Do not read the whole HTML page.
- After publishing: update the Relay block on main (version + time + GATE PASS) so git always matches the published pages.

## 4. Test the pages
- `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 -I tests/ui_smoke.py <html folder> <image folder>` (blocks non-file: requests) · ~2–3 minutes (normally run through `node tools/bootstrap.mjs gate`, section 9)
- Build again before every run (the system-check page counts tests from the built tests/*.js files)
- Do not click the analyze button in the Balance Room (only check it is clickable · real measuring uses section 6)
- **Page cannot be tested** (playwright/browser unusable in that round) = do not publish, tell the user the cause (V1.25)
- The html folder must contain game.html · balance.html · system-check.html
- Pass = check X/X complete · FAILS [] · ERRORS [] · max board ≥ 3 (both screen sizes)
- (V1.13, `final` only) A ~70 s match can make ui_smoke inside `bootstrap final` (which runs alongside the 24,000 measure) time out · if final says ui_smoke failed but there is no FAILS, run it alone with the command above; passing alone = pass

## 9. Two-level checks (V1.7 · saves time, final result checked the same)
- **Level 1, during work** (every code edit · V1.11 user chose a): `node tools/bootstrap.mjs test <word in test name> [more words…]` runs only tests whose name contains the word (a few seconds · e.g. `test "ชุด 17"` or `test มัลติฮิต เกราะ`) · new tests must have "ชุด N" in the name so they are easy to select · **do not run the full suite while editing** · the full suite runs once at the end of the task set (level 2 or before publishing mechanics) · tests that may hang (safety cut-off / endless loop) must not run before a guard exists; prefix with `timeout 20` · measure balance only when the user allows (section 12), 12,000 matches, seed 4242 (section 6) · ui_smoke not yet run = do not publish
- **Level 2, before merge AND publish** (once per task set): `node tools/bootstrap.mjs gate` — full rule in CLAUDE.md HARD RULE 3; CI before publish: §3.
  - Character values or skill mechanics changed and the user allowed measuring (section 12): also run `node tools/bootstrap.mjs final` (tests + ui_smoke + 24,000-match measure in parallel) · near the edge → `node tools/bootstrap.mjs measure 48000`. `final` does not replace `gate` (gate runs tests and ui_smoke one after the other so ui_smoke does not time out).
- **9.1 Saving time (V1.23 · user chose a+b on 25 Oct)**
  - a. **Every problem (bug, failing test, wrong page, stutter, slowness, etc.): do not edit code before the real cause is known** (V1.25: running tests/scripts to collect evidence is allowed · never guess-fix and then run tests to see if they pass) · confirm the cause with evidence (reproduce it, read the related code, read the error message, or measure), then fix · tell the user the cause with short evidence · smoothness/speed problems: measure in a browser emulating a 4× slowed phone (frame time + Layout/Paint/script split), measure before/after with the same script, report the numbers side by side · ชุด 30.4 guessed wrong on the first round, the biggest time loss
  - b. While editing use fast tests only · **run ui_smoke once after everything is done** (finish small jobs/cleanup first) · if code is edited after ui_smoke passed = it must run again (existing rule: never publish without testing the page), so do not edit anything after the run unless necessary
  - a2. **Every bug the user reports (review W10, set 151 — ≥ 7 user-found bugs in 2 weeks):** add a test that fails before the fix and passes after, in the same commit; the Relay line names the test.
- **9.3 Gate false FAIL (review W1, set 151):** GATE: FAIL where every count passes (n/n) but a ui_smoke summary line (FAILS / ERRORS / max board) is missing → re-run the gate ONCE (unit tests skip automatically). Second FAIL → stop and tell the user. Each such rerun goes in the Relay line as `false-FAIL rerun`; the gate saves the full ui_smoke output to `<tmp>/automon-shots/ui_smoke-last.txt` — read it to find the cause, fix the cause in its own set.
- **9.2 An existing test breaks because of values the user tuned** (V1.25): evidence is needed before changing the test = the code diff against the published pages differs only in core/characters.js / imported rule values + the broken test cites character values directly · then change the test to not depend on values (read from data / check the mechanism) and tell the user · no evidence = treat it as a bug, follow 9.1a
- While `final` runs, use the wait to update docs and handoff.md (do not touch the code being checked)
- Level 1 results are for decisions along the way only, **never counted as a pass** · always report the number of matches used
- Unchanged: pass range ±6 points · same seed set · measure all 3 levels · validate saved data at load · keep the calculation core separate from the screens
- bootstrap commands work when the files are local: setup uses 4 files (section 1) · final/measure also need tests/ui_smoke.py and lab/measure.mjs
- Times that bootstrap reports are parallel-run times (each is slower than alone, e.g. tests 44 s alone → ~108 s in parallel) · the slowest (balance measure ~2.5 min) sets the total
