# UI pattern library — what similar games do, what to copy as an idea, what to avoid

V1.6 · 12 Nov 2026 (owner order: study both Octopath versions — §1d, console original + mobile COTC, 9 screens; O1–O6) · V1.5 · 12 Nov 2026 (owner order "study 4–5 games like ours": §1c — Dota Underlords mobile · FF Resonance · Triangle Strategy · Balatro · Marvel Snap, ~20 screens seen on Game UI Database; DO 25–32; hub H9–H10) · V1.4 · 12 Nov 2026 (owner order: one UI knowledge hub — §0 where to look up other games' screens + how, §7 hub/home screen + result screen patterns, §8 idea mode; skill step "owner says an idea → find 2–3 real-game ideas") · V1.3 · 12 Nov 2026 (set 212: §6 glass / motif / temperature closed by the owner's set 208 picks, built in Godot) · V1.2 · 12 Nov 2026 (set 211: tell fix never changes what the owner picked) · V1.1 · 12 Nov 2026 (set 210: §1b screens actually seen — 3 owner screenshots + 6 found by Claude; DO 19–24 added) · V1.0 · 12 Nov 2026 (set 210, user order: research the UX/UI of games close to ours, focus Final Fantasy Resonance · Auto Chess · TFT, so designs stop looking AI-made and look professional). Runbook: skill `ui-patterns`. Open this file before any design sample (ui-preview) or UI build (ui-work) for the Godot game.

**Legal line (CLAUDE.md scope):** this file records layout ideas and principles only. Never copy another game's names, art, icons, frames, fonts, texts or exact screen. A pattern used by 3+ games (shop row at the bottom, cost colours, star ranks) is a genre convention and is safe as an idea; a look owned by one game is not.

**Evidence marks:** [S] = read in a source this session (list at the bottom) · [K] = Claude's memory of the game, not re-checked this session — confirm on a screenshot/video before relying on it · [R] = review opinion (one writer). Final Fantasy Resonance came out 22 Oct 2026, after Claude's training data: §1 lines are [S]/[R] from reviews; real screens seen on Game UI Database are in §1c (V1.5) and win. The owner's own screenshots beat every line here.

---

## 0. Where to look up other games' screens (reference hubs, checked 12 Nov 2026)

Look here first: Game UI Database for "many games, one screen type", interfaceingame for mobile games it lacks. View only: never store a picture in the repo, never trace, never copy a frame/icon/font (legal line above).

| Hub | What it holds | How Claude reads it | Weight |
|---|---|---|---|
| **interfaceingame.com** | 406 games, every screenshot titled + tagged (Menu 6347 · In game 5366 · Overlay 3021 · Stats 2021 · Progress 1400 · Inventory 1284 · Store 729 · Lobby 217). `/games/` filters: Platform → Mobile (34 games), Genre, Theme. Clips too. | Built-in browser. URL patterns `/games/<slug>/` (title list) and `/screenshots/<slug>-<screen-title>/` (one shot, e.g. `brawl-stars-main-menu`, `teamfight-tactics-mobile-main-menu`, `dota-underlords-mobile-game-summary`). **Trap:** the first capture after a page load is black — wait 3 s, then `zoom` the region 0,40–800,500 twice; the second one shows the image. WebFetch sees only titles/tags, no images. Some slugs 404 (marvel-snap, afk-arena, hearthstone shot pages) → open the game page and use the link. | Best for real shipped mobile screens |
| **gameuidatabase.com** (Game UI Database 2.0, Edd Coates) — **main hub** (owner pick 12 Nov 2026) | Largest, updated daily: 1,995 games · 79,532 screens · 2,566 videos (homepage, 12 Nov 2026). Screen categories: Title & System menus (title, mode & screen select, load/save, loading, settings), Modals & overlays (popups, tutorial, character intro, feature unlocked), Game states (rewards & experience, pause, change party, world map), Stats & resources (inventory, equipping, buying & trading home/browse/confirm), HUD (vitals, rank & position, enemy health, notifications, timer, objectives, minimap). Search box takes games, filters, #hex colours and text inside images. Game tags: platform, genre, look (e.g. "3D Stylized", "Retro", "Flat 2.0"). Free, no login for browsing. | WebFetch gets 403 → **built-in browser works**: `get_page_text` on a game page (`gameData.php?id=N`) lists every screen title by category (cheap); `zoom` to view a screen (first capture after load can be blank → capture again). **Final Fantasy Resonance = id 2598, ~70 screens** (title, party/class change, 4 rewards, inventory, equip, shop home/browse/confirm, world map, battle HUD, targeting, tutorials) — the screens §1 never had. | Best for "how do 20 games solve screen X"; first stop |
| YouTube gameplay / GDC Vault talks | Flow, motion, timing, what happens after a tap | Search by game + screen; read transcripts only when the owner sends a link (youtube-transcriber skill) | Motion/flow questions |
| Mobbin | Real app screens (not games) | Only for plain patterns: settings, lists, forms, onboarding | Low for game look |
| Dribbble · Behance · ArtStation · Pinterest | Concept shots, mostly never shipped | Ideas for material/ornament only; a concept is not proof a layout works (Behance blocked WebFetch before) | Low |
| The Spriters Resource and other ripped-asset sites | Ripped game art | **Never** — no licence (HARD RULE 9 part 2) | — |

**Which games to look up for which screen** (start here, add more only if the owner asks):
- Prep / shop / bench / board: TFT mobile · Dota Underlords mobile · Super Auto Pets · Auto Chess (§1, §1b). Not on Game UI Database (checked 12 Nov 2026): Auto Chess, Chess Rush, TFT, Hearthstone Battlegrounds, Octopath Traveler II → interfaceingame or owner screenshots.
- Hub / home / lobby, mode picker, result: Brawl Stars · TFT mobile · Clash Royale · Underlords (§7).
- Look / material / HD-2D feel: FF Resonance (§1c) · Octopath Traveler + Champions of the Continent (§1d).
- Card / tooltip / item text: Hearthstone · Backpack Battles · The Bazaar · Slay the Spire [K].
- Collection / roster grid: Brawl Stars "Brawlers" · TFT "Little Legends" · Genshin "Character Archive" (titles seen on interfaceingame, pictures not yet seen).

**Game UI Database how-to (V1.5):** the URL search page (`index.php?search=`) hits a bot check — never try to pass it; instead, on any game page, set the value of the header search input by `javascript_tool` and read the `a[href*="gameData.php"]` results (game ids). On a game page every screen is an `a.galleryimage` (title in `data-title`, full image in `href`, size in `data-size`); listing those is cheap. To view, overlay the chosen full images in a 1-column grid (4 columns for portrait phone shots) and `zoom` 0,0–800,600 twice (first capture blank) — 2 landscape or 4 portrait screens per image. Ids found: Underlords mobile 550 · FF Resonance 2598 · Triangle Strategy 1539 · Balatro 1935 · Marvel Snap 1785 · Brawl Stars 465 · Clash Royale 1299 · Hearthstone 628 · Octopath Traveler 741 · Sea of Stars 2196 · Into the Breach 483 · Fire Emblem Three Houses 419 · Octopath COTC (mobile) 1533.

**Evidence for new lines:** a screen Claude actually saw = [C: hub, date]; titles/tags only = [S-text]; memory = [K]. A new game block goes in §1 (prep) or §7 (hub/result) with its source URL in §6 "Image sources".

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

## 1c. Five games like ours, screens seen on Game UI Database [C: gameuidatabase, 12 Nov 2026]

Why these five: Underlords = same genre on a landscape phone · FF Resonance = our look reference (HD-2D) · Triangle Strategy = HD-2D units on a tilted board, closest to our 3D rune plaza · Balatro = pixel art + run loop with shop / reroll between rounds · Marvel Snap = modern premium mobile hub, collection and result. (Not in the database: TFT, Super Auto Pets, Backpack Battles, The Bazaar, Auto Chess — use interfaceingame / §1b for those.)

**Dota Underlords (mobile, id 550)**
- Title/hub: character art centre-right over a painted town; 3 plain word links top-left (rulebook, loadout, pass); FIGHT! = slanted banner bottom-right. Mode select: 2×2 art tiles, right detail panel (mode name, 3 option rows, a red warning box), BEGIN MATCH bottom-right — same corner as FIGHT!.
- Prep: unit info docked on the left as a tall narrow panel (portrait, tier, stat list, SELL with gold value at its foot); round name + timer top-centre; unit cap "3/3" written on the board edge; bench along the bottom; action buttons small, right edge.
- Combat: player list with HP on the left edge (portrait + bar per player); the rest is the board.
- Item pick: 3 cards over a dimmed board, REROLL under them, "SHOW BOARD" toggle, countdown top, both players' level/gold/HP in the bottom corners.
- Result: newspaper sheet ("EIGHTH PLACE" headline) — the result told as a world object; PLAY AGAIN top-right largest.

**Final Fantasy Resonance (id 2598)** — first real screens (until now only reviews)
- Battle: turn timeline = thin line across the top with diamond nodes and small character heads, current actor in a big diamond at the left end. Command menu top-right: translucent dark-teal panel, portrait cut-in strip on its top edge, 6 rows with small icons. Party status bottom-right: 3 slim cards (name, HP/MP numbers + thin bars). Enemy HP = short bar under each enemy + a letter tag. Tips bottom-left in small text. Sprites lit inside the 3D set; UI is thin and translucent so the set reads.
- Party / equipment: full-screen translucent teal over a blurred scene; serif all-caps title with a thin rule ending in a diamond; left list of rows = cropped face strip + class diamond; centre portrait card with level/HP/MP; attribute list with an icon per stat; equipment/abilities lists right; button hints bottom-right. Reviews' "many identical rows" holds: every row the same weight.
- Shop: buy list left (name, coin price, "held" count) over the dimmed shop interior; right side = each party member's face strip with the stat change in red/green numbers (compare while browsing).
- Battle result: rows of label / value / icon on the left (EXP, gold, rank points), bonus callout in orange italic, the field scene visible behind.
- Takeaway for us: FF uses ONE motif (diamond + thin rule) on every small thing — the DO 19 idea; ours stays the cut corner (set 212), never the diamond (line "One shape motif per game"); panels are cool teal over a warm scene — matches DO 20 and our set 212 cool-slate pick.

**Triangle Strategy (id 1539)**
- Battle: tilted diorama board; turn order = row of portrait cards across the bottom centre on a thin timeline, next actor raised; selected unit card bottom-left (portrait, name, class, HP bar, level); terrain info top-right as bare text on a rule; facing/target marks = glowing bracket corners on tiles, no big arrows.
- Battle preparation: left menu column of plain words with diamond cursor, "Begin Battle" at the foot of that column; mission card centre (title, victory condition on a blue header, defeat condition on a red header, weather / wind); 2 resources top-right as icon + number on a rule; the battlefield stays visible behind.
- Roster: unit cards in a 3-wide grid (sprite + level + EXP bar) with a large portrait of the selected unit on the left.

**Balatro (id 1935)** — pixel art, run loop
- One left status column on every screen: round goal + reward, round score, chips × mult as a big blue box × red box, hands / discards, money, ante / round, Run Info and Options buttons. Never moves.
- Shop: one framed panel in the centre; "Next Round" (red) and "Reroll $5" (green) stacked as chunky buttons on its left; dark price tabs ($5) sitting on top of each item; slot counters "0/5", "0/2" at the row corners; deck pile bottom-right with "52/52".
- Scoring: "+8" pops above the card that scored; numbers in a thick pixel font, very large.
- Game over: red tint over the whole table, a stat table panel (best hand, most played), table visible under it.
- Every button = flat pigment colour, dark outline, hard drop shadow, chunky pixel font: one hand everywhere.

**Marvel Snap (id 1785, portrait phone)**
- Hub: centre = big featured art (season content); top bar: settings, 2 currencies, pass chip, missions chip; PLAY = huge, bottom-centre, deck chip on its left, rank number on its right; bottom tab bar of 5, home tab centre and raised, red count badge on the collection tab.
- Collection: 4-wide card grid under a title and a filter chip; tab bar stays.
- Battle: 3 lanes side by side, each with its rule card; enemy cards above, mine below; energy as a big number in a circle bottom-centre; Retreat bottom-left, End Turn bottom-right with "2/6" turn count.
- Result: one word ("VICTORY!") on a slanted banner, nothing else at first.

## 1d. Octopath Traveler — console original + mobile [C: gameuidatabase, 12 Nov 2026]

The HD-2D line our look comes from. Champions of the Continent (COTC, id 1533) is the **HD-2D game built for a landscape phone** — the gap §6 listed.

**Octopath Traveler (2018, id 741, console/PC)**
- Battle: turn order = small heads on a thin line top-left (this turn · next turn); party status = right column of dark translucent strips (name, HP/SP numbers + thin bars, boost pips); one-line message banner top-centre; enemy weakness icons in a row under the enemy. The scene takes ~75 % of the screen.
- Main menu: the world map (parchment) IS the background; dark tab list left (category words, the active one with a small diamond); party column right (sprite, level, HP/SP); play time + money top-right; button hints on a bottom strip.
- Shop: one small dark panel (vendor name, item, price, a one-line description) over the full-colour town — the town is not dimmed; money top-right.
- Victory: large serif "Victory!" top-left; reward rows (money, EXP, JP) each with a "+bonus"; bonus names in gold italic on the right ("Untouched", "Break"…); party cards along the bottom with level-up marks; battlefield visible behind.

**Octopath Traveler: Champions of the Continent (2022, id 1533, mobile landscape)**
- Hub = the town itself: the 4-member party stands in the HD-2D street at night; 2 currencies as plain chips top-centre; minimap top-right; a diamond marker over the door you can enter; along the bottom **9 icon + word buttons** in one row over the scene, 6 of them with a red "!" badge — badge overload (H6 broken in practice).
- Party: parchment map background in a dark leather frame; top bar = back arrow, title, currencies, close ×; left = vertical arrow-shaped dark tabs (party, equipment, skills, status); rows = sprite + stars + level + HP/SP bars; front / back columns ("Not set" slots); page dots at the bottom.
- Battle (phone): turn heads on a line top-left and top-centre; party status = right edge stacked cards (HP/SP numbers, boost pips, the chosen action under each); enemy shield number + weakness "?" icons under the enemy; bottom bar = Target Focus, Settings, **2× speed toggle**, 4 diamond buttons (flee, allies, switch, boost all) and one huge teal **Attack** button bottom-right.
- Exchange shop: parchment panels; left tabs with red "N days remaining" badges; item rows = name, Details button, held count, price, − / + stepper; "Total required" + Trade button bottom-right.
- Reward modal: 3 round emblems with rank + a progress bar each ("Left 90"), one OK button, a thin ornate frame with corner ornaments on black.

**What the HD-2D line teaches us (idea level, not copied)**
- O1. Battle UI lives on the **edges** (turn line top, party column right, actions bottom-right); the middle is the diorama. Same as FF Resonance → this is the HD-2D convention.
- O2. **The world is the menu background** (map parchment, the town at night) instead of a flat panel; panels are dark translucent strips with thin rules. Ours: menus over the rune plaza scene, not over a flat colour.
- O3. On a phone the main battle action becomes **one huge button bottom-right** and the rest shrink to small buttons — matches H1 / DO 5.
- O4. Ornate type only on big words ("Victory!", titles); numbers and lists in plain type (confirms the §1 [S] line, now seen).
- O5. A speed toggle (2×) sits in the battle bar on mobile — worth a thought for our auto-battle (owner decides; it touches battle pacing, ask first).
- O6. Warning: COTC's 9 bottom buttons + 6 red badges is what our offline hub must NOT become (H4, H6).

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

Seen on screens (§1c)
25. **One status column that never moves** across every phase of a run (Balatro): goal, score, money, round, run info, options always in the same strip; only the centre changes between shop / pick / fight. Ours: the prep HUD strip should stay put in battle and result.
26. **Price on the button that spends it** ("Reroll $5") and a price tab on top of every item (Balatro, Underlords) — never a separate cost legend.
27. **Compare at the moment of buying:** while browsing the shop, each owned unit shows the +/− change the item would make, in green/red (FF Resonance shop). Ours: hovering/holding a shop unit lights the tribe count it would change ("3/4 → 4/4") on the board.
28. **Pick-one overlays keep the board one tap away:** 3 choice cards over a dimmed board + a "show board" toggle + the countdown on top (Underlords item pick).
29. **Turn order / timeline as a thin line with small heads** across the top or bottom (FF Resonance top, Triangle Strategy bottom), next actor raised. Information on a line, not in a box.
30. **Terrain / state info as bare text on a thin rule** in a corner (Triangle Strategy "Pavement · Height 6"), no panel behind it — the scene stays the hero.
31. **Mission card before the fight:** title, win condition on one coloured header, lose condition on another, 2 small facts (Triangle Strategy battle preparation). Ours: the stage/boss intro could show "win = … · watch out = …" in this two-header form.
32. **Colour = one meaning, kept for the whole game** (Balatro: blue chips, red mult, gold money on every screen). Pick ours once (gold, HP, tribe) and never reuse those colours for decoration.

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
5. **Tell count** against §4 on the screenshot; list each tell found; ≥ 3 → fix before showing the owner, except anything the owner picked (agreed list / notes.md / docs / Relay) — that one is never changed on Claude's own, ask A1/A2 (set 211 A1).
6. **Genre check** against §3 (board visible, tap sizes, tooltip place, fixed buttons).
7. Show the owner with one line: references used · three decisions · tells left and why.

## 6. Open points for the owner (not decided)
- ~~Glass panels~~ → **closed set 212:** near-solid panels (alpha 0.94, prep.gd GLASS). Emoji in game screens: still to audit.
- Display font: none chosen yet; needs a Thai-capable face with a licence (HARD RULE 9 part 2).
- UI material: which world material the frames are made of (links to art-look target sheet, Gate 1).
- ~~Shape motif (DO 19)~~ → **closed set 212 (owner B1):** cut corners (chamfer, radius ≤ 7, theme.gd box) = the arena floor slabs. Same cut on every box stays a known tell (owner pick).
- ~~UI temperature (DO 20)~~ → **closed set 212 (owner R5-A2):** cool slate panels + steel-blue line + pale blue Fight plate (godot/data/tone.json). Revisit only if art-look Gate 1 changes the arena light.
- FF Resonance screens seen (§1c, V1.5). Still unseen: Hearthstone Battlegrounds tavern, Backpack Battles, The Bazaar board. (HD-2D on a phone: seen, §1d COTC.) §1 lines for those stay [K]/[S-text].
- Image sources (12 Nov 2026): https://interfaceingame.com/games/teamfight-tactics-mobile/ · https://interfaceingame.com/games/dota-underlords-mobile/ · MobyGames Super Auto Pets screenshot · a fan wiki capture of the FF Resonance equipment screen (via image search). No image is stored in the repo.
- Image sources (12 Nov 2026, V1.4): https://interfaceingame.com/screenshots/brawl-stars-main-menu/ · https://interfaceingame.com/screenshots/teamfight-tactics-mobile-main-menu/ · https://interfaceingame.com/screenshots/dota-underlords-mobile-game-summary/ · title/tag lists of clash-royale, brawl-stars, hearthstone, genshin-impact game pages. Not seen yet (page failed to show): Clash Royale main menu, TFT lobby.

## 7. Hub / home screen and result screen (the "game hub")

The hub is the first screen and the one seen most often. Its one job: **start the next run in one tap**, while showing what the player owns and what is next. MVP1 is offline single-player (CLAUDE.md scope), so the genre's shop / season pass / chat / clan slots are NOT ours — never fill those slots with fake buttons to make the screen look full (that is an AI tell, §4 "filler").

### Screens seen [C: interfaceingame, 12 Nov 2026]
- **Brawl Stars main menu (phone, landscape):** centre = the chosen character, big, standing on plain bright ground, with rank + power badges floating over it. Top-left: profile chip + trophy progress. Top-right: 2 currencies + menu button. Left edge: 3 stacked icon buttons (shop, characters, news), each with a red **count** badge. Right edge: 3 (friends, club, chat). Bottom-left: season-pass card with a progress bar "33/100" + badge. Bottom-centre: current mode card (mode, map, time to the next event, info button). Bottom-right: PLAY — the widest, warmest, thickest-outlined object on screen.
- **TFT mobile main menu:** centre-right = the player's mascot, big, over a painted landscape. Thin top bar: avatar + name left; one currency + 4 small icons (profile, collection, bell, settings) right. Left: only 3 large rows, each = round icon + word (Rewards with its level bar under the word, Store, Team planner) — words, not an icon grid. Bottom-left: pass banner card. Bottom-right: round mode button (shows the mode name under it) touching a wide chevron PLAY button. About 6 choices on the whole screen.
- **Underlords game summary (result):** a large paper sheet on the left 2/3: placement title + mode, the commander portrait, the final team as a grid with star ranks, the alliance icons row, then 3 big numbers with labels (rounds won · unit damage · gold earned), then a story strip "scroll to read more". Right side: PLAY AGAIN largest, LEAVE MATCH smaller under it. The 3D board stays visible behind the sheet.
- Titles seen only [S-text]: Clash Royale "Main menu" / "Battle Deck" / "Chest reward" / "Match over"; Brawl Stars "Choose event" (mode picker) / "Victory" / "Collect the rewards"; TFT "Select mode" (27 shots = the mode picker is a big screen of its own); Hearthstone "Dalaran" (hub drawn as a map).

### Hub DO (H-rules, idea level)
- H1. **Play = bottom-right, biggest, warmest colour, a game object** (Brawl, TFT; Clash Royale puts it bottom-centre in portrait [K]). The mode in use sits on or touching Play, so the player sees what they start.
- H2. **Centre = what the player owns, not a menu.** A hero, mascot or team on a stand. Ours: the player's last or favourite team standing on the 3D rune plaza — the hub becomes a display case for the game's own art.
- H3. **Status is thin and on top:** identity top-left, resources top-right, small. Nothing to tap there except settings/profile.
- H4. **Few choices in view (≤ 6), split by hand:** often-used near the thumbs, rare things behind a menu. TFT shows 3 big word rows instead of 9 icons.
- H5. **Progress lives on the button:** a bar + "n/m" on the card that leads there (pass card, rewards row). The hub answers "what is next for me" without a tap.
- H6. **Badges only for something new, as a count,** and they clear when seen. A hub full of red dots = noise.
- H7. **Mode/event card next to Play** with what changes (name, map, a timer when one exists).
- H8. **Word + icon on hub buttons** (TFT rows, Brawl's labelled icons). Icon-only is for the small top bar.
- H9. **Play carries its context on both sides** (Marvel Snap: deck chip left of PLAY, rank number right; Underlords mode select: 2×2 art tiles + detail panel + BEGIN MATCH bottom-right). Ours: team/mode chip beside Start.
- H10. **Bottom tab bar only when there are 4+ real places**; the home tab is centre and raised (Marvel Snap, portrait). Landscape games (Brawl, TFT, Underlords) use left/right word columns instead — that fits our landscape phone.

### Result screen DO
- R1. Placement or win/lose as the biggest line; the final team shown as it ended (stars); 3 numbers max, each with a label; story/details below a fold.
- R2. **Play again = biggest button, where Play was** (top-right on Underlords; keep ours on the same hand as the hub's Play). Leave = smaller, under it.
- R3. The scene stays visible behind the result sheet (the sheet is paper/stone of the world, not a dark overlay).

### Hub DON'T
- No empty shop/pass/social slots in an offline game. No "coming soon" buttons.
- No icon grid of 9+ equal tiles (§4 identical grid tell).
- No full-screen modal popups on launch stacking before the hub (daily reward, news…) — one at most, skippable.
- No moving Play between versions (§3.5).

## 8. Idea mode — when the owner says what they want changed

The owner describes a change ("ปุ่มนี้ดูจืด", "อยากให้หน้าแรกน่าเล่นขึ้น", "ช่องร้านค้าอ่านยาก"). Claude:
1. Names the screen and the problem in one line (what job is failing: reading, finding, tapping, feeling).
2. Looks in this file first (§1, §1b, §2, §7). Only if nothing fits: one look-up round in §0 hubs (2–4 games from the "which games" list), noted with [C]/[S-text].
3. Offers **2–3 ideas, each from a named real game**: what that game does · how it would look in ours (our cut-corner slate panels, pixel sprites, Thai labels) · what we deliberately do differently · cost (small / medium / big). Recommend one. Label A1/A2/A3 (replies.md), then the buttons.
4. Checks each idea against §3 DON'T, §4 tells and MVP1 scope before offering it; an idea that needs a system outside MVP1 is named as such, not offered as a pick.
5. After the owner picks: the normal path (ui-preview sample, or ui-work build). New facts learned go into §1/§7 the same commit.

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
