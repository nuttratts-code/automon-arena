# workflow · publish and test the pages

V1.26 · 26 Oct 2026 (translated to English; 3: publish sequence confirmed again) · split from workflow.md V1.21 (content kept, section numbers kept for references)

## 3. Publish (never force · always update the existing link)
- Publish with the existing url. The first publish is refused with a diff (this counts as having seen the latest page) → check that the diff contains only intended edits and nothing from others.
- The 2nd publish is refused as "identical content". Then do an Artifact `read` of the url (no path) and publish the same file a 3rd time → it goes through (add a label such as "ชุด 12" · if the diff contains others' changes, merge first). Confirmed 26 Oct (ชุด 37).
- Do not read the whole HTML page.
- After publishing: commit + push the source to the repo branch (setup.md section 5) so git always matches the published pages.

## 4. Test the pages
- `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 -I tests/ui_smoke.py <html folder> <image folder>` (blocks non-file: requests) · ~2–3 minutes (normally run through `node tools/bootstrap.mjs final`, section 9)
- Build again before every run (the system-check page counts tests from the built mechanics.js)
- Do not click the analyze button in the Balance Room (only check it is clickable · real measuring uses section 6)
- **Page cannot be tested** (playwright/browser unusable in that round) = do not publish, tell the user the cause (V1.25)
- The html folder must contain game.html · balance.html · system-check.html
- Pass = check X/X complete · FAILS [] · ERRORS [] · max board ≥ 3 (both screen sizes)
- (V1.13) A ~70 s match can make ui_smoke inside `bootstrap final` (which runs alongside the 24,000 measure) time out · if final says ui_smoke failed but there is no FAILS, run it alone with the command above; passing alone = pass

## 9. Two-level checks (V1.7 · saves time, final result checked the same)
- **Level 1, during work** (every code edit · V1.11 user chose a): `node tools/bootstrap.mjs test <word in test name> [more words…]` runs only tests whose name contains the word (a few seconds · e.g. `test "ชุด 17"` or `test มัลติฮิต เกราะ`) · new tests must have "ชุด N" in the name so they are easy to select · **do not run the full suite while editing** · the full suite runs once at the end of the task set (level 2 or before publishing mechanics) · tests that may hang (safety cut-off / endless loop) must not run before a guard exists; prefix with `timeout 20` · measure balance only when the user allows (section 12), 12,000 matches, seed 4242 (section 6) · ui_smoke not yet run = do not publish
- **Level 2, before publishing** (once per task set): `node tools/bootstrap.mjs final` (V1.8 · builds, then runs **tests + ui_smoke + the 24,000 balance measure in parallel**, prints a short summary · tested 23 Oct: ~2.5 min total, tests 96/96, ui_smoke passed on both screen sizes FAILS [] ERRORS [], escaped units 0) · near the edge → `node tools/bootstrap.mjs measure 48000` · failing = do not publish, tell the user immediately
  - Publishing mechanics only (character values unchanged, section 12): use `node build.mjs` + `node tools/bootstrap.mjs test` (no word = full suite) + ui_smoke (section 4) once at the end, no measuring
- **9.1 Saving time (V1.23 · user chose a+b on 25 Oct)**
  - a. **Every problem (bug, failing test, wrong page, stutter, slowness, etc.): do not edit code before the real cause is known** (V1.25: running tests/scripts to collect evidence is allowed · never guess-fix and then run tests to see if they pass) · confirm the cause with evidence (reproduce it, read the related code, read the error message, or measure), then fix · tell the user the cause with short evidence · smoothness/speed problems: measure in a browser emulating a 4× slowed phone (frame time + Layout/Paint/script split), measure before/after with the same script, report the numbers side by side · ชุด 30.4 guessed wrong on the first round, the biggest time loss
  - b. While editing use fast tests only · **run ui_smoke once after everything is done** (finish small jobs/cleanup first) · if code is edited after ui_smoke passed = it must run again (existing rule: never publish without testing the page), so do not edit anything after the run unless necessary
- **9.2 An existing test breaks because of values the user tuned** (V1.25): evidence is needed before changing the test = the code diff against the published pages differs only in core/characters.js / imported rule values + the broken test cites character values directly · then change the test to not depend on values (read from data / check the mechanism) and tell the user · no evidence = treat it as a bug, follow 9.1a
- While `final` runs, use the wait to update docs and handoff.md (do not touch the code being checked)
- Level 1 results are for decisions along the way only, **never counted as a pass** · always report the number of matches used
- Unchanged: pass range ±6 points · same seed set · measure all 3 levels · validate saved data at load · keep the calculation core separate from the screens
- bootstrap commands work when the files are local: setup uses 4 files (section 1) · final/measure also need tests/ui_smoke.py and lab/measure.mjs
- Times that bootstrap reports are parallel-run times (each is slower than alone, e.g. tests 44 s alone → ~108 s in parallel) · the slowest (balance measure ~2.5 min) sets the total
