---
name: ui-patterns
description: Automon Arena design check against the pattern library (ดูเหมือน AI ทำ / ให้ดูมืออาชีพ / อ้างอิงเกมอื่น / TFT / Auto Chess / Final Fantasy Resonance / ควรทำ ไม่ควรทำ / ตรวจดีไซน์) — before any design sample or UI build for the game, pick named references, write three non-default decisions, then count "AI-made" tells and genre failures on the screenshot before the owner sees it. Use inside ui-preview and ui-work for the Godot game screens, and whenever the owner asks why a screen looks generic or asks what similar games do. Not for Balance Room / check / runlog pages (tools, not the game's face). The library claude/ui-patterns.md holds the patterns and wins if anything differs.
---
# UI patterns check (set 210 — user order: research similar games so designs stop looking AI-made)

Library: `claude/ui-patterns.md` (§1 per-game notes · §2 DO · §3 DON'T · §4 AI tells + fixes · §5 this check · §6 open points). Read only the sections the screen needs; never re-research a game that is already in §1.

**Never copy** another game's names, art, icons, frames, fonts, texts or an exact screen (CLAUDE.md scope). Ideas used by 3+ games are genre conventions; a look owned by one game is not.

## Before drawing (sample or real build)
1. Say the screen's one job and its one main action.
2. Pick 2 references from library §1 by name — one for layout, one for feel — and write: the idea taken · what is deliberately different.
3. Write three decisions that are NOT defaults for this screen (material, corner shape, how a key button looks as a game object, type pairing, where the light comes from…). Cannot name three → not ready; ask the owner or look at §2 again.
4. Evidence marks: a [K] or FF Resonance line that the design leans on → ask the owner for a screenshot of that game screen first (one question, in the set's first round).

## After the screenshot, before the owner sees it
5. **Tell count:** walk library §4 on the screenshot; list every tell found. 3 or more → fix first. A tell that stays needs a reason in one line.
6. **Genre check:** library §3 — board visible during shop/bench/info · main tap targets ≥ 44 px · tooltip not under the finger, not clipped, not over the next target · habit buttons in their fixed places · no finger work without a decision.
7. **One hand:** every icon/frame/sprite on the screen at the same pixel size and outline weight; anything from a different hand is named.
8. Report to the owner in Thai, one short block: references used · the three decisions · tells left + why · anything from §6 this screen touches (as A1/A2 if a choice is needed).

## Keeping the library alive
- The owner sends a screenshot or says a game does X differently → fix that line, change [K] to [S: owner screenshot, date], bump the version.
- A new tell the owner points out ("this still looks AI") → add a row to §4 with the fix, same commit.
- New game to study → the owner orders it; one search round, add a §1 block with sources. No silent re-research.
