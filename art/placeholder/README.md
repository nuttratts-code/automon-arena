# Placeholder pixel art (set 172)

- Source: Dungeon Crawl Stone Soup tiles, https://github.com/crawl/tiles (release folder `releases/Nov-2015`).
- Licence: CC0 1.0 (public domain dedication) — free to use, no credit required. We still credit: "Tiles from Dungeon Crawl Stone Soup (CC0)".
- Excluded: every file listed in that repo's `TILES_UNDER_UNKNOWN_LICENSE.md` (build_picker.py refuses them). Named "unique" monsters are not used.
- Use: game page only (user picks A2 B2 C2, set 172). Balance Room / check keep coloured shapes.
- `tiles-used.txt` = every tile path the picker embeds (3 options per character + scene floors/walls + gold/heart).

## Rebuild the picker page
```
git clone --depth 1 https://github.com/crawl/tiles <dir>/crawl-tiles
node -e "import('./src/core/characters.js').then(m=>console.log(JSON.stringify(m.ROWS.map(r=>r.slice(0,5)))))" > <dir>/chars.json
python3 -I art/placeholder/build_picker.py <dir>/crawl-tiles <dir>/chars.json claude/mockup-placeholder-art.html
```
(build_picker.py reads picker_template.html from its own folder; options per character = PICK table in the script.)

## Next
User picks in the picker → paste `ARTPICK …` code → chosen tiles copied to art/placeholder/tiles/ and embedded in the game build (after set 171 merges).
