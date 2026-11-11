# workflow · code setup: build, test, docs (git repo)

V1.33 · 11 Nov 2026 (set 204: §6 line endings + art/scene ignore) · V1.32 · 11 Nov 2026 (set 203: §6 local PC loop for Godot UI work) · V1.31 · 8 Nov 2026 (set 158: points to skill merge-code) · V1.30 · 8 Nov 2026 (set 153: gate text → CLAUDE.md) · V1.29 · 8 Nov 2026 (set 152: code reaches main by merge after GATE: PASS; CI before publish) · V1.28 · 31 Oct 2026 (CI runs the gate; commit rule matches CLAUDE.md; Jules removed) · rewritten for the GitHub repo (was: fetch code from the Project / published pages). Section numbers kept for references. V1.26: Balance Room template split into fragments + GitHub Action. V1.27 (set D): tests split into topic files, see section 2. · older versions: git log

Step-by-step runbook: skill `.claude/skills/merge-code/SKILL.md` (set 158). This file holds the rules and wins if they differ; when a rule here changes, update the skill in the same commit.

## 1. Get the code
- The source of truth is the git repo (`src/**`, `claude/**`). Clone/pull it; nothing is extracted from published pages any more.
- Layout: `src/core` (pure deterministic battle/shop/bot logic) · `src/lab` (measure/analyze tools; the Balance Room page = small shell `balance.template.html` + fragments in `src/lab/balance/{css,js}/` and `body.html` — see its README.md, open only the fragment you need) · `src/game` · `src/tests` · `src/tools` · `claude/` docs.
- Setup check: `cd src && node tools/bootstrap.mjs setup` → builds the 3 pages and runs all tests (expect ✅ build + all tests pass). package.json is at the repo root (`"type":"module"`).
- Built pages (`src/game.html`, `balance.html`, `system-check.html`) are git-ignored build output. The published artifacts are built from these.
- **`bootstrap.mjs gate`:** rule = CLAUDE.md HARD RULE 3. Mechanics: Cloud container: auto `pip install playwright` if missing; ui_smoke uses /opt/pw-browsers/chromium (CHROMIUM_PATH overrides); needs an absolute dir (the command handles it). Test `build: ทุกไฟล์ใน core/…` fails fast when a core file is missing from CORE in build.mjs.
- Other tools used on demand: `tests/ui_smoke.py` + `lab/measure.mjs` (full check, section 9) · `lab/formula.mjs` (tuning) · `tools/csv.mjs` `tools/apply-tune.mjs` `tools/apply-config.mjs` · `lab/try-skill.mjs` `lab/power.mjs` `lab/cost.mjs`.
- Proving "old code = new code" (measure.md): `git worktree add ../old <commit>` (or `git stash`/checkout into another folder) instead of extracting old pages.

## 2. Tests and build
- `node tests/run.js` · `node build.mjs` (run inside `src/`) → system-check.html, balance.html, game.html.
- Test layout (set D): shared helpers `tests/helpers.js` (mk, dummy, u, fight, eq, ok…; no tests inside) · topic files `tests/t-{combat,skills,skill-targets,tribe,shop,bots,save,validate}.js`, each exporting one `TESTS_*` array · `tests/mechanics.js` joins them into `TESTS` + `runTests` + `matchStats` (run.js and the check page use it). Add a new test to the file of its topic; a new test file must also be added to the `TESTS` list in `build.mjs` (before `mechanics.js`) and to the import list in `mechanics.js`. Top-level names must stay unique across all bundled files (build.mjs checks).
- Templates may contain `<!--@include path-->` (path relative to `src/`): build.mjs pastes that file exactly as it is (fragment must end with a newline). To prove a refactor changed nothing: build before and after, `sha256sum` the 3 built pages — they must be identical.
- GitHub Action `.github/workflows/tests.yml` runs `node tools/bootstrap.mjs gate` (build + tests + ui_smoke on built pages, installs playwright + chromium) on every push (31 Oct; push to main only since set 190) + a separate job `godot` (set 192: golden.mjs → pinned Godot 4.7.2 → headless tests, see godot/README.md). It does not measure balance (`bootstrap.mjs final`, local). CI before publish: publish.md §3.
- Character-values-only change: edit `src/core/characters.js` (via `tools/apply-config.mjs` / apply-tune), then normal build + tests. No page patching is needed any more.
- Edit templates with a script: find the insertion point by text at the start of a line (e.g. `'\n.tname {'`), not text in the middle of a line.
- New tests that validate a single character use `skErr(c)` (ignores errors about the number of characters per tribe).

## 5. Git and docs
- Work on a branch `claude/<topic>`; code reaches `main` only by merging the branch after GATE: PASS (no user OK needed, CLAUDE.md); docs-only commits go straight to main (relay.md). Commit + push after every meaningful step (a usage limit can end the chat any time); message = what + why.
- Docs live in `claude/` (git-tracked). Edit them in place with Edit; never retype whole files.
- characters.csv: `node src/tools/csv.mjs` regenerates it from `src/core/characters.js` (output → `claude/characters.csv`).
- Publishing artifacts (game / balance room / check) still uses the Artifact tool — see publish.md. Pushing code to git does not publish anything.
- Delete temporary files (measure .json, trial scripts) when the task set ends.

## 6. Local PC loop for Godot UI work (set 203 · user A = Claude desktop app, B1 batches per screen, C1 gate on the PC)
Why: Godot UI fixes need many small look-and-feel rounds; on the user's PC Claude edits the files and the user presses F5 in the Godot editor to see them at once (cloud round = ~10–15 min).
- **Setup once (user, Claude guides):** GitHub Desktop → clone `automon-arena` (never a ZIP: it cannot push) · Godot **4.7.2-stable Standard** (same pin as godot/tools/get_godot.sh) → Import `godot/project.godot` from that clone · Claude desktop app → Code tab → the clone folder · Node 22 (same major as CI) + Python 3.11 + git. First chat on the PC: `cd src && node tools/bootstrap.mjs setup` once to prove the tools work.
- **PC gate (set 204, fixed):** bootstrap.mjs uses `python` on Windows (`python3` there is a Microsoft Store stub that prints "Python was not found"), sets the `/opt/pw-browsers` path only when that folder exists (cloud) or the env var is given (CI), installs python playwright on the first gate run, and on Windows points ui_smoke/web_check at the installed Chrome (else Edge) via `CHROMIUM_PATH` — the owner's PC has Smart App Control on, which blocks playwright's own unsigned chromium ("spawn UNKNOWN" / Permission denied; never turn Smart App Control off for this). Skills that type `python3 …` by hand: use `python` on the PC. web_check.py (Godot web) not yet tried on the PC — follow find-cause (HARD RULE 5) if it fails, never skip the gate. Node 24 on the owner's PC works (CI = 22).
- **Line endings (set 204 A1):** `.gitattributes` forces LF on every checkout (Windows `core.autocrlf=true` made CRLF copies and the exportdata byte check failed). After pulling it into an old clone once: `git rm -r -q --cached . && git reset -q --hard HEAD` (commit or stash first). `art/scene/` (local Blender files) is in `.gitignore` (C1).
- **Loop:** user plays → screenshots + numbered notes per screen (B1) → Claude logs them in claude/ui-todo-godot.md under that screen → design questions get 2–3 options first (ui-work skill) → Claude edits on the session branch → user presses F5 → screen done → setup → gate (HARD RULE 3) → merge → push (CI also runs the Godot suite + godot-web).
- **Same rules as cloud:** chat-start (fetch, Relay, 🔒 lock), commit + push after every meaningful step (the PC can be off later), close-out (HARD RULE 1). The cloud chats and the PC share work only through GitHub.
- **Security (HARD RULE 9):** no secrets in the folder or chat; the desktop app asks before running commands — the user allows only commands for this repo; Godot editor changes the user made by accident are discarded with `git restore` after asking.

