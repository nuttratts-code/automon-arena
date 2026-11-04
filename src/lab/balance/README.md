# lab/balance — fragments of the Balance Room page

`lab/balance.template.html` is a small shell. `node build.mjs` pastes each `<!--@include path-->` marker with the fragment file, then inserts the shared core at `/*__CORE__*/`, and writes `balance.html`.

- Fragments are pasted **exactly as they are** (no added blank lines), so every fragment must end with a newline. Include order = order of the markers in the shell, not the file names.
- All JS fragments end up in ONE script: top-level names must stay unique across fragments and the core (build checks this). Fragments are not modules: no `import`/`export`.
- Split on 28 Oct 2026 with zero behaviour change: the built `balance.html` was byte-identical to the one built from the old 320 KB template.

| Fragment | Content |
|---|---|
| `css/10…60-*.css` | styles, in cascade order (later files may override earlier ones) |
| `body.html` | page markup |
| `js/00-setup` `10-state` | aliases, constants, edited-values state |
| `js/20-char-form` `21-tribe-form` `22-stage-form` | character / tribe forms · rune / boss / stage-mode settings tab (data in core/stage.js, saved as config/main.stage) |
| `js/30-tabs-overview` `31-steps` | tabs, overview, 4-step flow |
| `js/40-sim-skill` `41-sim-board` | skill simulation, simulation team board |
| `js/50-match-analysis` `51-match-units` `52-battle-view` `53-match-wire` | match analysis tab (`mx*`, `renderMatch`, `mxUnitBody`), per-unit tabs, battle view · 50 + 51 (and `css/55-match.css` + `60-units.css`) are ALSO included in the game page (set 84 "ดูรายละเอียดแมตช์") → keep them free of Balance-Room-only top-level code; that wiring lives in 53 |
| `js/60-saved-teams` `61-analyze` `62-analyze-boss` `63-analyze-run` | saved teams, analysis (ดูผล) · VS บอส + rune analysis (set 80) · รันจริง: whole runs played by the human-like bot (set 86, `runPlayStats` in lab/analyze.js) |
| `js/70-persist` `71-ideas-library` | data saved for Claude, page state, skill ideas / library |
| `js/99-start` | page start |
