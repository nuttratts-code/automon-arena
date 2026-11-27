# GPT UX/UI spec for the shop/prep screen (owner paste, set 303, 27 Nov) — English digest

Source: owner pasted a ChatGPT spec built from two GPT pictures (1672×941: transparent UI picture + forest-scene picture; both live only in the owner's ChatGPT library, not in the repo). Owner E1 (set 303): §2 colours + §3 light/shadow used for the UI in r46. F1: unit foot shadows / base rings stay from the hub (Decisions: characters from the hub). §1 layout, §4 scene tree, §5 UX = reference for ทำจริง (ui-work) only.
⚠ Conflict: §4 proposes a 2D scene (Node2D, Marker2D, AnimatedSprite2D, PointLight2D); our arena is pixel sprites in a lit 3D set (art-style, r38) — do not follow §4's scene part.

## §1 Layout (reference 1600×900, top-left origin)
| Part | Position · size |
|---|---|
| Shop plate (incl. Lv tab) | x 64, y 16 · 1520×272 |
| Lock / reroll column | ~276 wide · buttons 78–84 tall, cost under the reroll text |
| 5 shop cards | 224×182 each · gap 12 · name + price on top, stats left, creature centre-low |
| Lv + odds | Lv.1 above the shop on the left · odds top-right (dot + number) |
| Small icon strip | x 960, y 286 · 360×42 |
| Field | y 290–710 |
| Round / gold / hearts | x 24, y 714 · 448×158 |
| Bench 6 | from x 508, y 740 · 120×120 each · gap 8 · empty = "+" |
| Fight | x 1300, y 736 · 280×130 |
Bottom line of info / bench / Fight ≈ y 872. Test 1280×720 and 1920×1080 (long names, prices, Thai reroll text).

## §2 Colours (read from the PNG unless marked suggested)
| Use | Colour |
|---|---|
| Shop plate | #0D1A21 |
| Info plate | #091D2B |
| Bench socket | #1A262E → #19242C |
| Gold edge lit | #E3A942 |
| Gold edge shade (suggested) | #6F5129 |
| Fight | #12648A → #0E8EB3 (+ thin cyan top edge) |
| Card backs in the picture, L→R | #1C7669 · #512D07 · #5D4280 · #876B27 · #7B3151 |
| Text / gold / hearts (suggested) | #F5F0DF / #FFD56A / #F58998 |
Brightest cyan only on Fight; dimmer gold on secondary buttons and bench. Card colour must mean one thing (tribe) — the picture's two Bhameleon cards differ, ours follow the tribe.

## §3 Light and shadow
| Where | How · values |
|---|---|
| Shop + info frames | cut corners 10–16 px · lit gold 1–2 px top-left · dark inner edge 2–3 px bottom-right |
| Panel drop shadow | #070D12 at 40–55 % · 4–6 px down · 6–10 px blur |
| Card back | dark behind the name · oval light under the feet in the card colour 20–35 %, 65–80 % of the card wide |
| Foot shadow (field) | oval 60–80 % of the unit wide, 15–22 % tall, 30–45 % — NOT used (F1, hub shadows) |
| Base ring (field) | mint / dull-blue 2–3 px, brighter when selected — NOT used (F1) |
| Fight | dark blue top, lighter mid → bottom, short cyan top edge · hover +10–15 % · pressed: icon + text down 2 px |

## §4 Scene / assets (ทำจริง reference; 2D scene part conflicts, see top)
Scenes: BattleHUD (CanvasLayer → full-rect Control), ShopCard (Button, reused ×5), BenchSlot (Control, reused ×6). Art to prepare: frames without text, card backs per colour, socket frame, button face per state, icon set; text stays as Label. Stretchable frames = StyleBoxTexture 9-slice 12–16 px covering the cut corners; Lv tab and odds strip as separate pieces. Pixel crispness: canvas_items stretch, Nearest filter only on pixel sprites/icons, whole-pixel positions. Thai fonts: Noto Sans Thai or IBM Plex Sans Thai · names 20–22 px, text 22–24, Fight 34–38 (at 1600×900); mouse_filter Ignore on decoration.

## §5 UX behaviour (ทำจริง checklist)
Buy: hover/focus edge on affordable cards; gold + destination update together; reason shown next to the card when no gold / no room. Lock: icon + text change clearly; reroll always shows its price. Move: dragged unit follows the mouse, valid drop = cyan/mint frame, bad drop returns home; click-then-click as a second way. Fight: normal/hover/focus/pressed/disabled; no double press after start. Keyboard: visible focus frame, order shop buttons → cards → bench → Fight. First build = one playable round (1 card + 1 socket + Fight), then scale to 5 + 6.
