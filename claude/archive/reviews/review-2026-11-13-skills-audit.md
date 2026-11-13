# Skills + rule docs audit — usage, skipped rules, overlaps (13 Nov 2026, set 219)

Status = owner picked A1 B1 D2 E1 F1 G1 H1 I2 (13 Nov) — all applied set 219. D: after the D2 research the owner chose "ship them in the released game" (risk accepted, conditions in security.md part 2). DECIDED.
Evidence = git history (1,152 commits since 25 Oct) + Relay archives. Claude cannot read old chats: "used" = a commit/Relay line names it; "not shown" ≠ proven unused.

## 1. Usage of the 21 skills
| Group | Skills | Evidence |
| --- | --- | --- |
| Heavy (every set) | close-out · chat-start · ui-work · ui-preview · ui-patterns | close-out 70 commit mentions · ui-* 17 each, edited 5–15× |
| Used this week | merge-code · find-cause (set 214) · port-parity (sets 195–215 "Godot tests n/n") · asset-3d · art-look (sets 201, 214) · brainstorm | |
| Dormant since the web game froze (set 189, 10 Nov) | publish-pages (last publish set 188) · sim-play (web page only) · measure-balance (last measure set 167, 9 Nov) · balance-import (last import set 177) | not wrong — they wake up when values / Balance Room change |
| Never run yet | godot-play (draft, needs the set 208 MCP addon) · godot-release (itch.io waits for the 3D work) · ci-check (PC only) | |

- Cost: the 21 skill descriptions are loaded into EVERY chat = 12.8 KB (~3–4k tokens); longest: ui-patterns 977 · asset-3d 967 · brainstorm 808 · art-look 771 · weekly-review 744 characters (long Thai keyword lists).

### A. Skill descriptions cost every chat
- A1 (rec): shorten every description to ≤ 400 characters (keep the Thai trigger words that people really type, drop repeats); dormant skills get "(dormant: web game frozen set 189)" in the CLAUDE.md topic table. Saves ~2k tokens per chat.
- A2: leave as is.

## 2. Rules skipped (work vs rule)
### B. ui-preview steps 5/5b (design-critique + "AI-made tell" count every round) — not recorded in sets 216/217 (28 rounds)
- Evidence: original Relay 216/217 lines (archive/relay/relay-2026-11-13-sets216-217.md) and both notes.md files carry no critique / tell result per round (217 notes: 1 mention). Most 217 rounds were camera numbers, stone placement, fog — a UI critique has nothing to say there, so the step was dropped silently.
- B1 (rec): steps 5/5b run only on rounds that change SCREEN UI (panels, text, icons, layout); arena/scene look rounds use the art-look §1 checklist once per phase; notes.md records `critique ✓` / `tells n` when it ran.
- B2: keep it every round and record it every round.

### C. Code merge set 214 — Relay has no `review ✓` / `ripple ✓` (merge-code 1c/1e)
- One miss (sets 212/213/215 have them). Ripple is now checked on the merge commit (set 218 E1). No new rule — noted only. If it happens again → merge-code check.

### D. HARD RULE 9 ② vs set 217 placeholder AI assets
- Evidence: set 217 sample branch holds Gemini pictures + Hunyuan3D models; Relay: "PROVENANCE: rock_cliff_hy row (Hunyuan licence UNVERIFIED)". HARD RULE 9 ②: no outside asset without source + licence + credit + owner OK. CLAUDE.md Scope still says placeholder art = DCSS CC0 tiles (2D only). The owner said (14 Nov) all of it is placeholder — but no rule says where unverified pieces may live.
- D1 (rec): rule text: unverified-licence assets may live ONLY on a `SAMPLE — NO MERGE` branch, with an art/PROVENANCE.csv row marked UNVERIFIED; before ทำจริง each one is verified or replaced. Scope line gets "3D placeholders: owner's AI pieces, sample branch only".
- D2: verify the Hunyuan3D / Gemini terms now (web research, then decide).
- D3: no change.

## 3. Overlaps and conflicts between skills / rules
### E. art-look vs ui-preview vs asset-3d — three runbooks for the arena look
- Evidence: set 217 (20+ rounds on the arena look) ran under ui-preview + asset-3d; art-look was never invoked although its description says "any task that changes how the battle scene LOOKS". ui-preview §8 (3.6 KB: arena camera, far layers, fog) is battle-scene look content living in a screen-sample skill. Result: art-style §8 (camera angle A, 7 Nov) was not checked during samples → conflicts found only later ("decide at ทำจริง").
- E1 (rec): move ui-preview §8 into art-look as "Look samples"; art-look says "sample rounds use ui-preview steps 1–6c (mechanics)"; ui-preview description says "screens/menus; arena look → art-look". asset-3d stays for making props.
- E2: leave; just add a cross-link line in each.

### F. Godot binary / editor setup written in 3 skills
- ui-work 4e · ui-preview 2 · asset-3d each explain where Godot_v4.7.2 lives and how to run it (PC vs cloud) → already drift (set 216 trap only in ui-preview).
- F1 (rec): one section in claude/workflow/gdscript.md "Running Godot (cloud / owner PC)"; the 3 skills point to it.
- F2: leave.

### G. "Ask everything up front, then run to the end" vs sample loops
- CLAUDE.md Decisions (set 150 A1) lists when Claude may stop mid-task; sample loops (ui-preview, look samples) stop every round by design but are not on that list → a strict reading says they break the rule.
- G1 (rec): add "a sample loop round (ui-preview / art-look samples)" to the allowed-stop list.
- G2: leave.

## 4. Docs nobody points to
### H. Orphan / finished files still in claude/
- claude/plan-set196.md — all steps ticked (7a–7f done set 202); close-out rule says a finished plan moves to claude/archive/.
- claude/match-tabs-spec.md — "DONE 26 Oct", no doc links to it.
- claude/art-credits-mockup.md — credits for claude/mockup-ui-assets.html (Oct mockup, not in the game); no doc links to it.
- claude/pending.md is balance-only but its name clashes with the handoff "Pending bundle (งานรอรวม)".
- H1 (rec): move the 3 files to claude/archive/ (fix links in godot/README.md + plan-godot-migration.md) · pending.md title line says "balance pending only — the งานรอรวม list lives in handoff".
- H2: leave.

### I. instructions.md says "1 หน้า" but is 17 KB
- I1 (rec): rewrite to a real 1 page (~6 KB): rules + "where to look"; history lines → git.
- I2: keep the full copy, just drop "1 หน้า" from the title.

## D2 result — licence research (13 Nov 2026, web search; not legal advice)
- **Gemini images (sky, far hills, ground tile, grass, plaza/stone source pictures):** Google's Gemini terms say Google does not claim ownership of generated content, but outputs are not exclusive (others may get similar ones) and the user is responsible for their use. Commercial use: no explicit ban, no explicit grant, no IP indemnity (secondary sources read it as allowed). Purely AI-made images may get no copyright protection (US) → others could copy them freely. The invisible SynthID watermark must not be removed to hide the origin. Sources: ai.google.dev/gemini-api/terms-archive/terms_11_20_25 · terms.law/ai-output-rights/gemini · licenseorg.com/guide/ai-content/google-gemini-image.
- **Hunyuan3D models (stones, plaza, fallen slab, cliff rock):** the open-model licences (Tencent Hunyuan 3D 2.0 / 2.1 Community License) do NOT apply in the EU, UK and South Korea (use there = unlicensed); 2.0 adds extra commercial terms above a monthly-active-user limit; outputs may not be used to train other AI models. The terms of the hosted site the owner used (3d.hunyuan.tencent.com) were NOT found publicly → still UNVERIFIED. itch.io sells worldwide, EU/UK included. Sources: huggingface.co/tencent/Hunyuan3D-2/blob/main/LICENSE · scancode-licensedb.aboutcode.org/tencent-hunyuan-3d-2.0-cla.html · gitserver.onethingai.com/ai-models/Hunyuan3D-2.1/raw/branch/main/LICENSE.
- **Options now:**
  - Dα (rec): both stay placeholder on the SAMPLE — NO MERGE branch only; PROVENANCE rows get the findings above; Hunyuan pieces never ship (EU/UK gap + unknown site terms) unless the owner reads the site's own terms while logged in and they allow it; Gemini pieces may ship only after the owner's explicit OK, keeping SynthID. security.md part 2 gets this as a rule.
  - Dβ: replace all AI pieces with CC0 / own Blender work before ทำจริง (no AI art in the game at all).
  - Dγ: owner checks the Hunyuan site terms first (screenshot to Claude), then decide.

