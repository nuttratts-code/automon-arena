# workflow · code setup: build, test, docs (git repo)

V1.27 · 27 Oct 2026 · rewritten for the GitHub repo (was: fetch code from the Project / published pages). Section numbers kept for references. V1.26: Balance Room template split into fragments + GitHub Action. V1.27 (set D): tests split into topic files, see section 2.

## 1. Get the code
- The source of truth is the git repo (`src/**`, `claude/**`). Clone/pull it; nothing is extracted from published pages any more.
- Layout: `src/core` (pure deterministic battle/shop/bot logic) · `src/lab` (measure/analyze tools; the Balance Room page = small shell `balance.template.html` + fragments in `src/lab/balance/{css,js}/` and `body.html` — see its README.md, open only the fragment you need) · `src/game` · `src/tests` · `src/tools` · `claude/` docs.
- Setup check: `cd src && node tools/bootstrap.mjs setup` → builds the 3 pages and runs all tests (expect ✅ build + all tests pass). package.json is at the repo root (`"type":"module"`).
- Built pages (`src/game.html`, `balance.html`, `system-check.html`) are git-ignored build output. The published artifacts are built from these.
- **`bootstrap.mjs gate` (31 Oct):** merge/publish gate = build + tests + ui_smoke on built pages (no balance measure, ~4 min). Cloud container: auto `pip install playwright` if missing; ui_smoke uses /opt/pw-browsers/chromium (CHROMIUM_PATH overrides); needs an absolute dir (the command handles it). Test `build: ทุกไฟล์ใน core/…` fails fast when a core file is missing from CORE in build.mjs.
- Other tools used on demand: `tests/ui_smoke.py` + `lab/measure.mjs` (full check, section 9) · `lab/formula.mjs` (tuning) · `tools/csv.mjs` `tools/apply-tune.mjs` `tools/apply-config.mjs` · `lab/try-skill.mjs` `lab/power.mjs` `lab/cost.mjs`.
- Proving "old code = new code" (measure.md): `git worktree add ../old <commit>` (or `git stash`/checkout into another folder) instead of extracting old pages.

## 2. Tests and build
- `node tests/run.js` · `node build.mjs` (run inside `src/`) → system-check.html, balance.html, game.html.
- Test layout (set D): shared helpers `tests/helpers.js` (mk, dummy, u, fight, eq, ok…; no tests inside) · topic files `tests/t-{combat,skills,skill-targets,tribe,shop,bots,save,validate}.js`, each exporting one `TESTS_*` array · `tests/mechanics.js` joins them into `TESTS` + `runTests` + `matchStats` (run.js and the check page use it). Add a new test to the file of its topic; a new test file must also be added to the `TESTS` list in `build.mjs` (before `mechanics.js`) and to the import list in `mechanics.js`. Top-level names must stay unique across all bundled files (build.mjs checks).
- Templates may contain `<!--@include path-->` (path relative to `src/`): build.mjs pastes that file exactly as it is (fragment must end with a newline). To prove a refactor changed nothing: build before and after, `sha256sum` the 3 built pages — they must be identical.
- GitHub Action `.github/workflows/tests.yml` runs `node tools/bootstrap.mjs setup` (build + tests) on every push. It does not run ui_smoke / measure (those stay local, `bootstrap.mjs final`). Check the result on the repo's Actions tab before merging to main.
- Character-values-only change: edit `src/core/characters.js` (via `tools/apply-config.mjs` / apply-tune), then normal build + tests. No page patching is needed any more.
- Edit templates with a script: find the insertion point by text at the start of a line (e.g. `'\n.tname {'`), not text in the middle of a line.
- New tests that validate a single character use `skErr(c)` (ignores errors about the number of characters per tribe).

## 5. Git and docs
- Work on a branch (`claude/<topic>` for Claude, `jules/<topic>` for Jules); never commit straight to `main` without the user's OK. Commit once per task set (message = what + why).
- Docs live in `claude/` (git-tracked). Edit them in place with Edit; never retype whole files.
- characters.csv: `node src/tools/csv.mjs` regenerates it from `src/core/characters.js` (output → `claude/characters.csv`).
- Publishing artifacts (game / balance room / check) still uses the Artifact tool — see publish.md. Pushing code to git does not publish anything.
- Delete temporary files (measure .json, trial scripts) when the task set ends.
