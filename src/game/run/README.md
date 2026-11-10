# game/run — fragments of the game page

`game/run.template.html` is a small shell. `node build.mjs` pastes each `<!--@include path-->` marker with the fragment file (same mechanism as `lab/balance/`, see its README), inserts the shared core, and writes `game.html`.

- Fragments are pasted exactly as they are; every fragment must end with a newline. Include order = marker order in the shell.
- All JS fragments end up in ONE script with the core and the shared Balance Room match fragments (`lab/balance/js/50-match-analysis.js`, `51-match-units.js`, `css/55-match.css`, `60-units.css`): top-level names must stay unique. No `import`/`export`.
- Split on 10 Nov 2026 (set 181) with zero behaviour change: the built `game.html` was byte-identical (sha256 e859fa0d…) to the one built from the old 2,198-line template.

| Fragment | Content |
|---|---|
| `css/10-base.css` | tokens (light/dark), layout, board/bench/shop/dock, battle field, popups, Log screen, match-detail styles |
| `css/20-mockup.css` | set 116 approved mockup layer (HUD chips, tribe cards row, shop cards, battle dock, result card, title screens) + later UI fixes — overrides 10 |
| `body.html` | page markup: app (HUD, field, dock), name/resume/run-end/Log screens, notice/toast/rotate, dialogs |
| `js/00-setup.js` | error bar (set 180), small globals used by the shared match fragments |
| `js/10-state-save.js` | art, run state, save/stats/history, bot teams, run journal, db writes, replays list |
| `js/20-log-screen.js` | owner-only Log screen (set 114) |
| `js/30-screens-popups.js` | screen switching, toast, run code, the shared detail popup |
| `js/40-draw-details.js` | drawing HUD/board/bench/shop, shop level, stat glossary, unit details pane, floating card |
| `js/50-commands-drag.js` | commands through the core, tap/drag, ⋯ menu |
| `js/60-runes-enemy-tribes.js` | runes in the run (offer, bag, wear), enemy mini board, tribes popup + highlight, shape legend |
| `js/70-battle-replay.js` | fight, skill tags, live details, replay, run code copy, field runes, battle log, match details, result card |
| `js/80-runend-name.js` | run-end screen, player name screen |
| `js/99-start.js` | open the game (resume save), pause/continue, `boot()` |
