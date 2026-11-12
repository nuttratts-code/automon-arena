# UI pattern library — what similar games do, what to copy as an idea, what to avoid

V1.1 · 12 Nov 2026 (set 210: §1b screens actually seen — 3 owner screenshots + 6 found by Claude; DO 19–24 added) · V1.0 · 12 Nov 2026 (set 210, user order: research the UX/UI of games close to ours, focus Final Fantasy Resonance · Auto Chess · TFT, so designs stop looking AI-made and look professional). Runbook: skill `ui-patterns`. Open this file before any design sample (ui-preview) or UI build (ui-work) for the Godot game.

**Legal line (CLAUDE.md scope):** this file records layout ideas and principles only. Never copy another game's names, art, icons, frames, fonts, texts or exact screen. A pattern used by 3+ games (shop row at the bottom, cost colours, star ranks) is a genre convention and is safe as an idea; a look owned by one game is not.

**Evidence marks:** [S] = read in a source this session (list at the bottom) · [K] = Claude's memory of the game, not re-checked this session — confirm on a screenshot/video before relying on it · [R] = review opinion (one writer). Final Fantasy Resonance came out 22 Oct 2026, after Claude's training data: everything about it is [S]/[R] from reviews only; Claude has never seen its screens. The owner's own screenshots beat every line here.

---

## 1. Per-game notes

### Teamfight Tactics (Riot) — layout reference for prep/shop
- **Level + XP + shop odds sit together, next to the Buy-XP button** [S]. Riot added the level bar because players could not see how XP, level and odds connect — they "had to learn it from a friend or a guide". Rule: things that affect each other sit together. (We already did this in set 207 P4: odds line, tap = shop popup.)
- **Moving a habit button costs 3–5 games of mis-taps** [S] (Riot swapped Buy XP / Refresh once and promised no more swaps). Rule: fix button places early; never move reroll / fight / lock after the owner has learned them without a strong reason.
- **"Tough choices, not tough execution"** [S, GDC 2020]: Riot cut board juggling (unit cap, auto-merge) so the hard part is deciding, not dragging. Rule: any step that is only finger work (make room, re-sort, confirm twice) is a design bug.
- **Trait tracker on the left edge, tiers as bronze → silver → gold → prismatic, each trait its own colour** [S, fan case study]. Count shown as "have / next step" [K].
- **Item bench moved to a left toolbar for visibility and cleaner clicks** [S, designer portfolio].
- **Docked unit-info panel fits phones; PC players wanted it optional** [S, dev tracker]. Rule: on a phone, info goes to a fixed dock, not a floating tooltip under the finger.
- Shop card = art + name + cost + trait icons, frame colour = cost tier; a card that completes a star-up glows [K]. Star rank shown above the unit's health bar; health bar segmented, mana bar under it [K]. Mobile shop is a drawer that opens over the board [K].
- Weak spot [R]: best-looking UI of the genre but hides information from new players.

### Auto Chess (Drodo / Dragonest) — what a cramped phone port looks like
- Reviews: "some options are simply too small on mobile", frustrating on small screens [S]; the weakest interface of the three big ones [S].
- Shop is a full-screen popup of 5 cards that covers the board [K] → player cannot see their team while buying. Underlords' "PC mode" was liked precisely because the board stays visible while buying [S].
- Rule: never cover the board with the shop; never shrink a PC layout onto a phone — re-lay it out.

### Dota Underlords (Valve) — the clarity reference
- Praised as the most fluid/intuitive and best for newcomers; "gives the key information needed while buying units" [S].
- Valve ran a design pass for "more legible, tappable/clickable, visually balanced" on both PC and mobile [S] and split **screen size** from **input type** (big/small layout chosen separately from touch/mouse) [S]. Rule for our Godot port: layout picks by screen shape, hit sizes by input — two switches, not one.
- Shop cards show alliance icons and mark units you already own [K] (we have: yellowish = owned, ribbon = star-up, set 207 P9).

### Super Auto Pets — proof that less UI reads as more confident
- Reviewer: far easier to parse than TFT/Underlords [S]. Why: only two stats (attack, health), one price, a handful of buttons, abilities in a tooltip, all thinking happens in the shop phase [S].
- Weak spot: rules hidden in wording ("until end of battle" vs permanent) [S]. Rule: a rule that changes a decision must be visible on the card, not only learnt by losing.

### Hearthstone (Battlegrounds) — physicality and "UI is game design"
- Team chose a **physical, tactile UI** over the flat style that was fashionable, and it made objects feel valuable [S, GDC 2015].
- "If the UI is too complicated, the design is too complicated" [S]; the board is capped at 7 because 7 fit, instead of shrinking units [S]. Rule: when a screen does not fit, cut content before cutting size. (Matches our bench = 5.)
- Buy/sell by dragging to a character, golden frame for a triple, tavern tier as stars [K].

### Backpack Battles · The Bazaar — tooltip lessons
- Tooltips cut off by the frame; tooltips covering the cards the player wants to tap; dev had to add tooltip settings; fewer tooltips "felt less cluttered" but new players then miss them [S, player comments]. Overlapping UI elements reported [S].
- Cooldown-heavy boards need a lot of reading [S]. Rule: one tooltip at a time, never over the thing being dragged/tapped, always inside the screen, shortest wording first with detail on demand.

### Final Fantasy Resonance (Square Enix, HD-2D, turn-based) — look reference, NOT layout reference
- Not an auto-battler. Useful for: how flat sprites sit in a lit 3D scene (our art-look), battle HUD, menu feel.
- Battle HUD [S]: turn-order timeline in the top-left corner; each enemy has an HP bar with a second (stagger) bar directly under it; command menu for a party of 4; battle speed slow/medium/fast. Field: minimap top-right with a ring that turns red and pulses when a fight is close [S] — a warning carried by one small animated element, no text.
- Big attacks play a short cutscene over the battlefield; limit bursts animated in the sprite style [S]. Heavy effects cost frame rate on handhelds [S] — relevant to phones.
- **The split verdict is the lesson** [R]: art praised as the best HD-2D so far, while reviewers called menus plain, the battle UI the weak part, and said clunky menus turned the game's best system into "admin". One preview found the UI smooth. Beautiful scene + average chrome = reviewers notice the chrome.
- **Portraits not cohesive** [S]: one character's portrait looked out of place next to the rest and distracted every time it appeared. Rule: one mismatched asset breaks the set — relevant to our mix of CC0 tiles, generated art and owner art.
- Other HD-2D games (Octopath line) [S, weak sources]: plain readable type for menus/commands, ornate lettering only on title/chapter cards; with 8 party members the worry is turn-order and status readability.

---

## 1b. Screens actually seen (12 Nov 2026) — these lines beat the [K] lines in §1

Owner screenshots [O] · found by Claude [C] (interfaceingame.com 4K captures; MobyGames; a fan wiki).

**FF Resonance — battle [O]**
- Turn order = one thin line across the top with small diamond nodes; ally portraits sit above the line, enemy markers (red, lettered A/B) hang below it; the current actor gets a large diamond emblem at the far left. The same letter A/B is repeated as a small tag beside each enemy's bars → the line and the scene are linked by one tiny mark, no lead lines.
- Command list top-right: 6 rows, icon + label, selected row brighter + a diamond cursor outside the box; disabled row greyed, not hidden; the acting character's portrait peeks out behind the list header.
- Party cards bottom-right: name top-left, HP/MP label left + number right-aligned + a thin bar under each; the active card is lifted a few px and gets the diamond mark. Nothing else changes.
- Enemy bars: thin HP bar, second thin bar directly under; state as one small capital word under the bars.
- Active unit = bright outline around the sprite, not a UI arrow.
- Style: cool teal-slate translucent panels, 1-px light border, square corners, plain white sans text. Scene is dark and warm (lantern points, vignette) → **UI is cool, scene is warm: temperature separates them.** One shape motif (diamond) used for emblem, nodes, cursor and active mark.
- Flaws visible: the tooltip covers the next menu row; bars are too thin for a phone.

**FF Resonance — equipment menu [C]**
- Title in thin serif capitals with a hairline rule; everything else plain sans. Portrait in an arched frame with the pixel sprite under it. Rows = icon · label · right-aligned number.
- Why reviewers called it plain: ~35 near-identical row strips at the same weight in 4 columns — a clean system with a flat hierarchy. Lesson: consistency without emphasis reads as "admin".

**TFT mobile — shop open / prep [C]**
- The shop drawer opens at the TOP and covers the enemy half; the player's own board and bench stay visible. Cards: art, 2 trait rows on the left of the art, coloured footer with name + cost, frame colour = cost tier.
- Round thumb buttons in the bottom corners: Buy XP bottom-left (level ring around it, XP count above), gold bottom-right with Refresh just above it. Odds strip sits under the shop on the right. Items = 2-wide column on the left edge.
- Shop closed: traits down the left edge (hexagon icon, name, "2/4"; active = coloured, inactive = grey), stage plate top-centre with timer bar, scoreboard down the right edge (round portrait + HP). **Unit cap ("4/5") is written on the board floor, not in a UI box.** Bench is a stone ledge of the arena.

**TFT PC [O]**
- Same map of the screen, shop at the bottom because a mouse reaches it: Refresh / Buy XP stacked at the shop's left, gold on a tab above the shop centre, everything hugging the edges, board clear. Dark navy panels, thin gold trim, hexagon motif.

**Auto Chess mobile — shop [O]**
- Shop = dark band across the middle with no cards: 3D units stand in a row, 2 round race/class icons, name (text colour = rarity), coin + price (**price turns red when unaffordable**). Lock on the left edge, reroll + price on the right edge, odds strip (coloured chess pieces + %) under the band with the level. Round buttons in the bottom corners (XP left, close right).
- Flaws visible: the big "BATTLE / Round 2" title shows through the shop band (two layers fighting); the band hides the middle of the board; icons and names are tiny.

**Dota Underlords mobile — shop / combat [C]**
- Shop = light veil over the enemy half, units as 3D figures, cost in a coin badge, alliance icons as coloured square tiles under each unit, and **under those, pips showing how many of that alliance the player already has** (the consequence of buying, shown before buying); stars under units already owned. Odds list on the left edge. Unit cap "8/8" on the floor. Combat: small round title top-centre, duel list left, own/enemy leader portraits in the bottom corners.
- Caution: its glowing blue-violet round buttons and purple haze were its 2019 identity; today that palette is on the AI-tell list (§4).

**Super Auto Pets — shop [C]**
- 4 resource chips top-left; team row above shop row on the same ground; 2 stat badges under every pet in the same order; 3 very large bottom buttons, each with its icon inside (die, snowflake, arrow). **Frozen = the item is drawn inside a block of ice** (state shown as material, not a badge). Tooltip = a speech card beside the pet with a pointer, never over it: name, tier coin, bold trigger → effect. One thick dark outline on every object and button = one hand.

**What all of them share (safe genre conventions)**
1. UI lives on the edges; the centre is the board.
2. Shop covers the enemy half (or sits below the board on PC), never the player's own units.
3. Traits/tribes on the left edge as icon + "have/next".
4. Money actions under the thumbs (bottom corners on phones).
5. Cost tier = frame or text colour; trait icons on the shop item itself.
6. Odds strip touching the shop.
7. One shape motif per game (FF diamond · TFT hexagon · Auto Chess round/chess piece · SAP thick-outline rounded block). **Ours is not chosen yet (§6) and must not be the diamond or the hexagon.**

---

## 2. DO — patterns worth using (idea level)

Layout
1. Board stays visible in every prep action (shop, bench, unit info). Popups cover at most the side that is not being dragged to.
2. Group by cause and effect: level · XP · odds · reroll together; gold next to what spends it; tribe count next to its next step ("3/4").
3. Fixed places for habit buttons (reroll, lock, fight). Same place at every screen size.
4. Phone: info in a docked panel; tap = show, tap elsewhere = hide. No hover-only information.
5. One clear main action per screen (fight). Everything else is quieter in size and colour.

Information
6. Colour carries exactly one meaning per screen. Cost tier colour ≠ tribe colour ≠ state colour (owned / star-up / locked). Add a shape or mark as the second signal (already our tribe rule in art-style §3).
7. Numbers the player compares sit in the same spot on every card, same size, right-aligned or centred consistently.
8. Show the consequence, not the rule: "buying this makes a 2★" beats a glow that needs explaining; "3/4" beats a bar.
9. Two-level text: a 2–5 word line on the card, full rule on tap.
10. Cut content before shrinking it (Hearthstone's 7 minions).

Feel
11. Material, not flat boxes: the UI should look like it is made of something from the game's world (wood, stone, metal, cloth, paper) with one consistent light direction — the same top-left light as the sprites (art-style §5).
12. Every tap answers within ~100 ms with a small physical move (press-in, snap, slide); big juice only on rare events (star-up, legend, boss kill). Feedback after structure is stable, not before.
13. Motion uses ease-out; springs only for things that would bounce in the real world (a dropped unit, a coin).
14. Warnings by one small animated element (pulse, colour shift), not a text banner (FF Resonance minimap ring).

Craft
15. A written system before pixels: spacing unit (4/8 px), 2 fonts max (one display with character, one plain for numbers/body), 3–4 text sizes with clear steps (≥ 1.25×), one icon style (same stroke/outline weight, same pixel density as the sprites).
16. Pixel-art consistency: UI art at the same pixel size as the sprites, integer scaling only, no smooth-scaled pixel icons next to crisp ones, no vector icons mixed with pixel icons.
17. Check every screen with the game running behind it, at phone size, late-game state (ui.md phone audit).
18. One set of art = one hand. A new asset that looks different from its neighbours is redone or removed.

Seen on screens (§1b)
19. One shape motif, used for cursor, active mark, nodes and emblem. Pick ours once; use it everywhere small.
20. UI colour temperature opposite to the scene's (warm scene → cool UI, or the reverse), so panels never need heavy shadows to stand out.
21. Active/selected = a small lift, an outline on the sprite, the motif mark. Not a new colour block.
22. State as material or as a price colour: frozen in ice, unaffordable price in red, disabled row greyed in place.
23. Counts that belong to the board are written on the board (unit cap on the floor); the bench is furniture of the arena where the layout allows.
24. A link between a list and the scene is one repeated tiny mark (letter/number tag), not a line.

## 3. DON'T — genre failures

1. Shop/popup that hides the board (Auto Chess mobile).
2. PC layout shrunk onto a phone; tap targets under 44 px for main actions (ui.md floor is 24).
3. Tooltip under the finger, clipped by the frame, or covering the next tap target (Bazaar/Backpack comments).
4. Decision-changing rules that live only in the wiki or in fine print (SAP "until end of battle", TFT odds before the level bar).
5. Moving habit buttons between versions.
6. Finger work with no decision in it (manual juggling, double confirms on cheap reversible actions).
7. Beautiful scene with default-looking menus on top (FF Resonance reviews).
8. Assets from different hands side by side (FF Resonance portraits).
9. Effects heavy enough to drop frames on a phone.
10. Everything the same size and weight — when all is emphasised, nothing is.
11. Many identical rows at one weight (FF Resonance menu) — pick what the eye lands on first in every panel.
12. A big title or banner left visible under an open panel (Auto Chess "BATTLE" under the shop).
13. Bars thinner than ~6 px on a phone.

## 4. "Looks AI-made" tells — and the fix

A tell is a default nobody overrode. One or two is coincidence; six or more reads as generated [S]. Before showing a sample, count them.

| Tell | Fix for this game |
|---|---|
| Purple/violet or cyan-on-dark gradient palette | Palette taken from the arena art (art-style: warm high-fantasy, rich not neon) |
| Dark panel + glowing neon accents | Light comes from the scene; UI accents are flat pigment colours |
| Glass/blur panels everywhere | Blur only where a layer truly sits over the 3D scene; otherwise a solid material. **Audit: set 207 P2 "glass panels".** |
| Gradient text | Solid colour text with a 1-px dark outline or drop on busy ground |
| Rounded card with a thick coloured stripe on one side | Full frame in the tier colour, or a corner mark; no side stripe |
| Very large corner radius; same radius on everything | Small radius or cut/pixel corners; radius differs by role (card vs chip vs button) |
| Hairline border + wide soft shadow together | Pick one: hard pixel edge (ours) |
| Identical card grid, icon tile above a heading | Vary by role; icon beside the label |
| Nested boxes in boxes | Flatten: spacing, dividers, type weight |
| Equal spacing everywhere | Tight inside a group, wide between groups |
| One default sans font (Inter-like) for everything; flat size steps | One display face with character + one plain face; ≥ 1.25× steps |
| Emoji as icons | Drawn icons in the game's pixel style. **Audit: any emoji left in game screens.** |
| Bounce/elastic on everything; fade-up on every element; hover zoom | Ease-out; motion only where it explains something |
| Pill button with "→" | Button shaped like a game object; label is a verb |
| Tiny uppercase label above every section ("eyebrow"), 01/02/03 markers | Remove; let layout show structure |
| Cream/beige "safe" background | Ground colour chosen from the scene |
| Buzzwords, filler subtitles, every label explained twice | Short Thai verbs the owner approved; no helper text unless a tester got stuck |
| Centered everything, perfect symmetry | Layout follows the hand: thumbs at the bottom corners, eyes on the board |
| Rough "placeholder" mascot/illustration | Ship nothing rather than a weak drawing |

Why it happens: a model falls back to the most common pattern when nobody decides. So the cure is a decision made **before** drawing and written down — see §5.

## 5. Pre-design check (the skill runs this)

1. **Name the screen's one job** and its one main action.
2. **Pick 2 references by name** from §1 for this screen (one for layout, one for feel) and say what idea is taken and what is deliberately different.
3. **Write the three decisions that are not defaults** for this sample (e.g. material = carved stone tabs; corners = 2-px cut; reroll = a physical dice object). No three decisions → not ready to draw.
4. Draw / build.
5. **Tell count** against §4 on the screenshot; list each tell found; ≥ 3 → fix before showing the owner.
6. **Genre check** against §3 (board visible, tap sizes, tooltip place, fixed buttons).
7. Show the owner with one line: references used · three decisions · tells left and why.

## 6. Open points for the owner (not decided)
- Glass panels (set 207 P2) and any emoji in game screens are on the tell list — keep, restyle or replace? Decide inside set 208's sample rounds.
- Display font: none chosen yet; needs a Thai-capable face with a licence (HARD RULE 9 part 2).
- UI material: which world material the frames are made of (links to art-look target sheet, Gate 1).
- Our shape motif (DO 19) — not diamond, not hexagon; should come from the game's own world.
- UI temperature (DO 20) — depends on the arena's light (art-look Gate 1).
- Still unseen: Hearthstone Battlegrounds tavern, Backpack Battles, The Bazaar board, an HD-2D shop/menu on a phone. §1 lines for those stay [K]/[S-text].
- Image sources (12 Nov 2026): https://interfaceingame.com/games/teamfight-tactics-mobile/ · https://interfaceingame.com/games/dota-underlords-mobile/ · MobyGames Super Auto Pets screenshot · a fan wiki capture of the FF Resonance equipment screen (via image search). No image is stored in the repo.

## Sources (read 12 Nov 2026)
- Riot, TFT Interface Update (level bar, button swap): https://teamfighttactics.leagueoflegends.com/en-gb/news/game-updates/tft-interface-update/
- Pocket Tactics, GDC 2020: three design lessons from TFT: https://www.pockettactics.com/teamfight-tactics-design
- TFT UI case study (fan, Behance — search summary only, page blocked): https://www.behance.net/gallery/133371555/Teamfight-Tactics-UI-Design
- TFT item bench update (designer portfolio, search summary): https://ilariacogo.myportfolio.com/tft-itembench-update
- TFT dev replies on the info panel (search summary): https://devtrackers.gg/teamfight-tactics/p/f1f557f2-please-allow-us-to-move-the-champion-information-panel
- Inven Global, Underlords UI "less like a mobile port": https://www.invenglobal.com/articles/8439/valve-has-changed-dota-underlords-ui-to-look-less-like-a-mobile-port
- Underlords patch notes (legible/tappable pass; screen size vs input): https://dotaunderlords.fandom.com/wiki/August_15,_2019_Patch
- Pocket Gamer, Auto Chess PC vs mobile (search summary): https://www.pocketgamer.com/auto-chess/the-best-place-to-play-auto-chess-pc-vs-mobile
- Upcomer, TFT vs Underlords (search summary): https://upcomer.com/teamfight-tactics-vs-dota-underlords-which-one-is-better
- Indie Hell Zone, Super Auto Pets: https://indiehellzone.com/2021/10/26/super-auto-pets/
- League of Gamemakers, core design lessons of Hearthstone (search summary): https://www.leagueofgamemakers.com/the-heart-of-hearthstone-core-design-lessons/
- The Bazaar / Backpack Battles player comments and reviews (search summary): https://www.pcgamer.com/games/card-games/after-its-disastrous-launch-last-year-im-here-to-tell-you-that-2025s-most-promising-auto-battler-finally-lives-up-to-its-potential · https://playwithfurcifer.itch.io/backpack-battles/comments
- FF Resonance: Noisy Pixel review https://noisypixel.net/final-fantasy-resonance-review/ · Twisted Voxel review https://twistedvoxel.com/final-fantasy-resonance-review/ · UnGeek preview https://www.ungeek.ph/2026/09/final-fantasy-resonance-first-impressions-breaking-the-hd-2d-limits/ · Final Weapon and Absolute Geeks reviews (menu/battle-UI criticism — search summary only, pages did not load): https://finalweapon.net/2026/10/20/final-fantasy-resonance-review/ · https://www.absolutegeeks.com/games/gaming-reviews/final-fantasy-resonance-review-brilliant-battles-painfully-predictable-story/
- AI-design tells: Impeccable "visible tells of AI design" https://924b8765.impeccable-2rv.pages.dev/slop · other catalogues (search summary): https://github.com/Laith0003/ux-skill/wiki/How-to-detect-AI-slop-in-your-design · https://www.saasui.design/blog/saas-ui-looks-ai-generated
- Indie game UI basics (search summary): https://bugnet.io/blog/ui-design-basics-for-indie-developers · https://bootcamp.uxdesign.cc/7-obvious-beginner-mistakes-with-your-games-hud-from-a-ui-ux-art-director-d852e255184a
