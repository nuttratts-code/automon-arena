# Automon Arena

Original creature auto-battler for the browser (Thai UI). Single-player / offline MVP: buy and merge creatures in a shop, line up a team on a 3 × 2 board, and watch it fight bot teams and bosses.

- `src/core/` — game rules and battle engine (plain JavaScript, deterministic from a seed)
- `src/game/` — the game page · `src/lab/` — the Balance Room (tuning tool) and measuring scripts · `src/tests/` — unit tests + browser smoke test
- `claude/` — design docs (Thai rule docs), work log and reviews · `art/placeholder/` — temporary art

## Build and test
```
cd src
node tools/bootstrap.mjs setup   # build the 4 pages + unit tests (~3 min)
node tools/bootstrap.mjs gate    # + browser smoke test on the built pages (needs python playwright + chromium)
```
Built pages: `src/game.html`, `src/balance.html`, `src/system-check.html`, `src/runlog.html` (not committed).

## Credits and licence
- Placeholder pixel art: tiles from Dungeon Crawl Stone Soup (CC0) — see `art/placeholder/README.md`.
- No licence is granted for the code, design docs or game data: all rights reserved by the owner.
