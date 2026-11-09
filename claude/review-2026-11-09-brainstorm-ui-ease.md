# Brainstorm — game UI: easier to use / easier to understand (9 Nov 2026)

Panel: 5 simulated experts (same model; diversity from role + bias), size A2 (2 rounds), goal B2 (ranked list), scope C2 (ease first, genre-familiar is fine, still original — never copy Batomon).
Panel roles: A auto-battler UX designer · B new-player advocate · C mobile UX/accessibility · D skeptic/red team · E cost & scope realist.

## Question / success
How to make the game UI easier to use and understand. Success = a new player knows what to do and what happened within minutes, fewer taps, less reading, no new systems, cheap, safe on the 5 tested screen sizes.

## Evidence pack (thin — no auto-battler postmortem found)
- T3 2021 TFT UI: hover highlights unit on board; side panel switches scoreboard/damage tracker by phase (behance.net/gallery/133371555)
- T3 2020 Clash Royale: popups, not full-screen (discover.therookies.co/2020/02/24/game-design-ux-best-practices-detailed-breakdown-of-clash-royale)
- T3 SAP reviews: simple stats attack+health (medium.com/codex/why-super-auto-pets-is-so-good-and-what-is-still-to-come) — reviewer opinion
- T1 2008 Pinelle et al. CHI'08 game usability heuristics (course.ccs.neu.edu/is4300f15/ssl/pinelle-chi08.pdf)
- T2 NN/g usability heuristics applied to video games, consistency (nngroup.com/articles/usability-heuristics-applied-video-games)
- T3 tooltips at decision point, gradual hints (uxdesign.cc/how-to-not-overwhelm-players-c0e1d14c6b4c)

## Fact checked by moderator during the debate
Battle engine already tracks damage per unit: `dealt`/`taken` (src/core/battle.js:94, :860, returned in result `units[]`). A result recap built from this is a UI task, not a core change. (Experts C/D/E/B guessed it might be a core change.)

## Round 1 key points
- A: next-step cue + progressive disclosure; tap-to-highlight everywhere; battle recap.
- B: "do this next" strip + one primary FIGHT button; hide runes/bosses/replay in "More" for first rounds; tap-for-detail card + plain words.
- C: tap-to-inspect card; shape+colour+text redundancy, legend, 44px targets; 3-step first-run hints + recap.
- D: legend + tooltips + wording sweep; progressive power panel; recap. Risk: hiding info, no real-player test.
- E: one-line state strip + first-run hints; power panel hide zeros; combat caption. Rejects layout rework/tutorial overlay.

## Round 2 (debate) highlights
- Zero stats: A attacks hiding (zero = information in unit comparison; remembered toggle = hidden state) → dim instead of hide. C, E, B still like hiding.
- Nudge strip: C attacks a permanent row (vertical budget at 667x375/844x390) → transient overlay or put it in the top bar / on the FIGHT label (B adopted this).
- Recap: D attacks "why" sentences (correlation ≠ cause) → show facts only (who died first, damage dealt/taken). B: newcomers ask "what do I press / what are these shapes" first, recap arrives after the confusion.
- "More" drawer: E rejects (hides features the owner must test on 5 sizes, game looks empty).
- Adopted by 4 of 5: idea "legend + wording sweep + 44px / not-colour-alone" (A, B, C, E adopt it; D's own top pick).

## Score table (1–5, higher = better; Effort 5 = cheapest, Risk 5 = safest)
| # | Idea | Impact | Fit | Effort | Risk | Evidence |
|---|---|---|---|---|---|---|
| 1 | Legend (shape=tribe, border=rarity, stars) + same-word-same-meaning sweep + 44px targets + never colour alone | 4 | 5 | 5 | 5 | T1/T2 (Pinelle, NN/g) |
| 2 | Power panel: dim zero stats (keep all shown) | 4 | 5 | 5 | 4 | T1 Pinelle (visibility); guess |
| 3 | "Do this next" cue inside top bar / on FIGHT label (no new row) + FIGHT as the one primary button + transient hints that vanish after first correct tap | 5 | 4 | 4 | 3 | T3 hints; guess |
| 4 | Post-battle recap, FACTS only from existing units[] (first death, dealt/taken, top 3) | 4 | 4 | 4 | 4 | T3/T1 feedback; data exists |
| 5 | Tap a unit/tribe chip = highlight members | 3 | 4 | 3 | 4 | T3 TFT |
| 6 | Tap-detail card (optional view, not required to buy) | 3 | 3 | 2 | 3 | T3 Clash Royale |
| 7 | "More" drawer hiding runes/bosses/replay early | 3 | 2 | 2 | 2 | guess |

## Consensus
Items 1, 3 (as non-row cue), 4 (facts only). Never add anything without hiding/dimming something; check every change at all 5 sizes (667x375 first).

## Open disagreement
- Zero stats: hide (C, E, B) vs dim (A). Conflict note: build-plan set 26 (user choice) says the power panel shows every value even when 0 → dimming keeps that decision; hiding would reverse it.
- Default to Lv1 vs "starts at the unit's own level" (set 26): changing it would also reverse set 26 → dropped from the proposal.

## Minority report
Item 7 (progressive disclosure, "More" drawer): rejected by E and C-style space worries, but B's observation (≈12 regions on the prep screen) may be right. Only a real new-player test can settle it.

## Missing evidence → cheapest next step (no code)
Three experts asked for a 3-person cold-start test (watch a friend play 3 min, count taps + confusions). This would reorder everything above.

## Recommendation
- Set 1 (S effort): items 1 + 2 (dim) + 3.
- Set 2: items 4 + 5.
- Later/optional: item 6; item 7 only after a cold-start test.
Next skill: `ui-work` (design skill first, shots at 5 sizes, gate). No game numbers touched.

Cost: 5 experts × 2 rounds (≈ 76k tokens each incl. shared context) + 4 searches.
