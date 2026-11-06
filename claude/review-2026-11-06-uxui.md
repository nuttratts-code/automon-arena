# UX/UI review — game page + Balance Room (6 Nov 2026, set 113, main 414d755)

Status: report only. **No code changed.** Method: built pages from main, screenshots via Playwright
(game 1366×768 + phone landscape 844×390 · Balance Room 1100×900 + phone 390×844), states: name screen,
prep, buy popup, team placed, tribe popup, fight, result; Balance Room pick / edit / result. Framework:
design-critique (first impression, usability, hierarchy, consistency, accessibility).
The user also adds their own dislikes; both lists are merged before any work.

## Game page

**First impression:** clean and calm, readable Thai font, but the board is mostly empty beige boxes and the
units are small inside them; the eye goes to the dark "เริ่มสู้" button (correct) and then nowhere in particular.
It reads like a tool/form more than a game.

| # | Finding | Sev | Recommendation |
|---|---|---|---|
| G1 | Board layout jumps between prep (my 3×2 fills the full width, cells ~430×200 px) and fight (6 columns, my side shrinks to half). Units move and resize at the moment the fight starts → hard to follow "who is where". | 🔴 | Keep one layout: both sides always visible at fight size, enemy side shown as dimmed "?" during prep (or fixed-size cells centred). |
| G2 | Unit shapes (~90 px) sit in huge empty cells; empty cells and empty bench dominate the screen. | 🟡 | Smaller cells / bigger units; empty cells lighter, with a faint "+" or row hint only while dragging. |
| G3 | Fight dock: big empty panel, ticker text small; nothing shows damage/skills happening on the board in a still frame. | 🟡 | Shrink the dock in fight; float damage numbers / skill name over units (if not already animated). |
| G4 | HUD: all chips look the same (round, hearts, wins, gold, tribe, rune bag). Gold and hearts are the key numbers but have equal weight; "ศัตรู 100%" is tiny grey text. | 🟡 | Give gold + hearts icons and bigger weight; group "run info" left, "my team" (tribe, rune) middle, "enemy %" as a chip with icon. |
| G5 | Many labels 0.7–0.8 rem grey-on-beige (column headers "ทีมคุณ · หลัง", shop card "HL-1 · ธรรมดา", tribe line, vertical "ม้านั่ง"). Contrast likely below WCAG AA (4.5:1); hard to read on phone. | 🟡 | Raise small text to ≥ 0.85 rem and darken grey; horizontal bench label. |
| G6 | Name screen on PC: thin card at the top, the rest of the screen blank; no game title/visual → weak first impression. | 🟢 | Centred title screen: game name, short tagline, name box, start button. |
| G7 | Shop: sold slots keep full-size "ขายแล้ว" boxes; reroll + shop level squeezed in a narrow column on the left. | 🟢 | Sold slot = faint outline only; reroll as a clear button with the cost chip. |
| G8 | Unit popup: stat grid uneven (คูลดาวน์ value wraps, columns not aligned), "ไม่มีสกิล" plain line, term help collapsed below. | 🟢 | 2-column aligned stat table; skill block as a card; Lv tabs keep. |
| G9 | "เริ่ม run ใหม่" sits next to "?" in the HUD (has a tap-again confirm — OK) | 🟢 | Move into a ⋯ menu, or keep as is. |

**What works:** drag/tap flow is simple · price turns red when unaffordable · "มีแล้ว 1" badge on shop cards ·
tribe popup with progress bars is clear · result card is short with 3 clear actions · speed buttons.

## Balance Room

**First impression:** well organised (3 steps, tribe × rarity grid is excellent). Weak spots are density and
empty states.

| # | Finding | Sev | Recommendation |
|---|---|---|---|
| B1 | Result step before analysing: 4 empty "–" boxes, empty tables, opponent/rune buttons with no selected state visible; the "วิเคราะห์" button is small on the left. | 🟡 | One big "วิเคราะห์" call-to-action + short "ยังไม่มีผล" empty state; show the selected opponent/rune button as filled. |
| B2 | Phone: header text + tabs + bottom step bar take ~30 % of the height; top tab row "รูน / บอส" is cut at the edge. | 🟡 | Collapse the intro text on phone; tabs scroll with a fade or wrap. |
| B3 | Edit form: median values in red + ⚠ (e.g. HP 225 vs 100) read as errors, not as reference. | 🟢 | Neutral grey "ค่ากลาง" + arrow ↑/↓ only when far off. |
| B4 | Long grey helper lines everywhere (instructions in one paragraph). | 🟢 | Short one-liners + "อ่านเพิ่ม" folds. |
| B5 | Game page is warm beige, Balance Room cool grey/teal → feels like two products. | 🟢 | Optional: share colour tokens (only if the user wants). |

**What works:** tribe × rarity grid · sticky step bar + save button · skill sentence preview ("ทุกฮิตที่โดน → …") with a worked example.

## Pick list (user chooses; recommendation first)
- **U1 (rec.) Game board one layout** (G1 + G2): same cell size and positions in prep and fight, bigger units.
- **U2 HUD + readability** (G4 + G5): clear gold/hearts, bigger darker small text.
- **U3 Fight feel** (G3): smaller dock, floating damage/skill text.
- **U4 Title/name screen** (G6) + shop/popup polish (G7 G8 G9).
- **U5 Balance Room** (B1–B4).
- Mockup first (like set 97 layout v3) is recommended for U1 before coding.
