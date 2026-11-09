# Placeholder pixel art (set 172)

- Source: Dungeon Crawl Stone Soup tiles, https://github.com/crawl/tiles (release folder `releases/Nov-2015`).
- Licence: CC0 1.0 (public domain dedication) — free to use, no credit required. We still credit: "Tiles from Dungeon Crawl Stone Soup (CC0)".
- Excluded: every file listed in that repo's `TILES_UNDER_UNKNOWN_LICENSE.md` (build_picker.py refuses them). Named "unique" monsters are not used.
- Use: game page only (user picks A2 B2 C2, set 172). Balance Room / check keep coloured shapes.
- `tiles-used.txt` = every tile path the picker embeds (3 options per character / boss / rune + scene floors/walls + gold/heart).

## Rebuild the picker page
```
git clone --depth 1 https://github.com/crawl/tiles <dir>/crawl-tiles
node -e "import('./src/core/characters.js').then(m=>console.log(JSON.stringify(m.ROWS.map(r=>r.slice(0,5)))))" > <dir>/chars.json
node -e "import('./src/core/stage.js').then(m=>console.log(JSON.stringify({runes:m.STAGE_RUNES.map(r=>{let t='';try{t=String(m.runeText(r))}catch(e){};return [r.id,r.name,r.rarity,t.replace(/ ?[+−×]?undefined%?/g,'').replace(/\\s+/g,' ').trim()]}),bosses:m.STAGE_BOSSES.map(b=>[b.id,b.name,b.tribe])})))" > <dir>/extra.json
python3 -I art/placeholder/build_picker.py <dir>/crawl-tiles <dir>/chars.json claude/mockup-placeholder-art.html <dir>/extra.json
```
(build_picker.py reads picker_template.html from its own folder; options = PICK (characters), BOSSES, RUNES tables in the script. Rune icons are keyed by rune ID, not name — D1–D6 share key D, F1–F6 share key F, shown with a tribe-colour frame.)

## Next
User picks in the picker → paste `ARTPICK …` code → chosen tiles copied to art/placeholder/tiles/ and embedded in the game build (after set 171 merges).

## In the game (set 172)
- Picks: `picks.txt` (user's ARTPICK code) → `build_art.py` → `tiles/<group>-<key>.png` (committed) + `src/game/art.js` (GAME_ART, generated; never edit by hand).
- Change a pick: edit `picks.txt`, run `python3 -I art/placeholder/build_art.py --copy <crawl-tiles dir>`, rebuild.
- Game page only (src/build.mjs page list, not CORE): `setUnitArt(GAME_ART.unit)` → view.js `unitShape` draws the sprite + a small tribe-shape badge (top-left); rarity ring traces the sprite. Bosses (B1–B4) drawn 1.25×. Floors/walls: shop = prep field, arena = battle field, result = run-end screen. Rune icon on every rune card (D1–D6 / F1–F6 share one icon with a tribe-colour frame). Credit line in the ? legend popup.
