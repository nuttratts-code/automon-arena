# Set 61 plan (prepared 31 Oct by 2nd account · user: "prepare only, do in next chat")
User-confirmed requests (Thai originals summarised). Do all in one pass → test → merge (ask user) → publish balance room.

## A. Ideas travel in the "คัดลอกค่าให้ Claude" code (user picked option 3)
- Why: the cloud account cannot read Balance Room db (`ideas` → not found), so ideas never reach Claude.
- Where: `src/lab/balance/js/70-persist.js:93` builds `AMCFG1 {v, config, measured}` → add `ideas: [{id, char, text, status, at, reply?}]` (only open ones: status "รอ Claude" / "ต้องเลือกก่อน"; cap text 1000, max ~50). Ideas list is already live in the page (99-start.js:12 onSnapshot → keep last docs in a variable).
- `src/tools/cfgcode.mjs`: accept + validate `ideas` (strings only, length caps), print them as a list; keep v:1 compatible (ideas optional). Add a test.
- Claude answers ideas in chat (no db write from this account); note the answer in handoff if needed.

## B. Rune-page idea menu works like the character one
- Now: stage idea box (`22-stage-form.js` ~291–320, renderStageIdeaFor / renderStageIdeas) can only add.
- Want: same as character ideas (`71-ideas-library.js:16–71`): list own ideas with ✎ edit (status back to "รอ Claude", editedAt) and delete, show reply/status. Reuse renderIdeas pieces rather than copy.

## C. Copies per run follow rarity (user rule, all runes)
- ธรรมดา 3 · หายาก 2 · ตำนาน 1 (built-in + user-made). Replaces RUNE_MAX_DEFAULT in core/stage.js.
- Changing rarity in the editor sets copies to the new rarity's number. Open point to ask once: may the user still type a different copies number per rune (recommended: yes, field stays editable, yellow if different) or is it locked?
- Update tests (t-validate rune tests expect max values) + docs (backlog "Stage mode" / review-2026-10-29-runes-v2 note).

## D. "+ เพิ่มรูน" follows the active filter
- If หมวด filter (runeTheme) is e.g. เกราะ: new rune keeps the filter (do NOT reset runeTheme/runeQuery as newRune does now, 22-stage-form.js newRune) and starts with that theme's default effect, e.g. armor → 'armor' (เกราะตอนเริ่ม), dmg → 'atk', heal → 'hp', speed → 'cd', burn → 'burn', shock → 'shock', debuff → 'eCd', survive → 'revive', gold → 'gold', tribe → 'addTribe', other → 'atk'. Set the rune's theme '' (auto) so it still shows under the filter. Rarity group view: if user grouped by rarity with no theme filter → current default (atk, common).
- "รูนจากสกิลที่มีอยู่" keeps the filter too.
