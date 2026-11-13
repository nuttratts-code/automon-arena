---
name: brainstorm
description: Expert-panel brainstorm (ระดมสมอง / ประชุมผู้เชี่ยวชาญ / ถกกัน / หาวิธีที่ดีที่สุด / เคล็ดลับ): research once, 4–5 simulated experts answer alone, then argue, then a moderator summary with a decision table and A1/A2 options. Calling it = the owner's OK for subagents. Not bugs (find-cause) or numbers (balance-import).
---
# Brainstorm — expert panel (set 164)

> Rules: claude/review-2026-11-09-brainstorm-skill.md (sources) — they win if anything differs (description trimmed set 219 A1).

Why this shape (sources in claude/review-2026-11-09-brainstorm-skill.md): people/agents who think alone first give more and less-anchored ideas than an open group (Nominal Group / Delphi); a debate round between model instances fixes errors (multiagent debate) but can converge on a confident WRONG answer, so a skeptic and a minority report are mandatory; a pre-mortem ("it already failed — why?") finds more risks than "what could go wrong?"; multi-agent runs cost many times a normal chat, so size is chosen up front.

## 0. Ask up front (ONE AskUserQuestion round, rule A1)
Explain in Thai first, then buttons (replies.md). Skip a question the user already answered.
- **A — size:** A1 lite = 3 experts, 1 round, no extra web (cheap) · A2 standard = 4–5 experts, 2 rounds (recommended) · A3 deep = 5 experts, 2 rounds, each expert may search the web.
- **B — goal:** B1 pick ONE best method · B2 list of tips/ideas ranked · B3 compare options the user already has.
- **C — anything fixed?** (budget, deadline, must keep X) — free text via "Other".
Then run to the end without stopping (only HARD RULE stops apply).

## 1. Frame (main agent, short)
- Restate the question in 1 line + what a "great result" means for us (success criteria).
- **Fit pack ≤ 15 lines:** grep only the relevant docs (CLAUDE.md Scope/Decisions, build-plan, the rule id the topic touches). Always include: MVP1 offline scope · original, never copy Batomon · owner is no-code · token budget · HARD RULE 6 (numbers = user decides). Conflict with a decided rule → note it for the summary (conflict check).

## 2. Evidence pack (main agent, ONCE — experts share it, saves tokens)
- WebSearch `standard` 3–6 queries in ONE turn; `extended` only if results are thin/old (A3 or niche topic).
- Source tiers: **T1** official docs, peer-reviewed papers, primary talks/postmortems (e.g. GDC Vault, company engineering blogs) · **T2** established industry/press, books by known practitioners · **T3** blogs/forums/aggregators = ideas only, never a sole proof.
- Each fact: 1 line + URL + tier + year. Numbers seen only in T3 or summaries → mark "unverified". Never invent a source.
- ≤ 40 lines. Write it to the scratchpad; experts get it inline in their prompt.

## 3. Panel (4–5, tailored to the topic)
Pick roles so views clash. Always include:
1. **Domain expert(s)** ×1–2 for the topic (e.g. auto-battler systems designer, mobile UX designer, economy designer, technical lead).
2. **Player / user advocate** — new player or the no-code owner, whichever the topic serves.
3. **Skeptic / red team** — runs the pre-mortem: "6 months later this failed — why?"
4. **Cost & scope realist** — MVP1, effort, token cost, maintenance by a no-code owner.
5. (standard/deep) **Wildcard** — an outside field (board games, psychology, another genre) for unusual ideas.
Each gets a name tag + 1-line bias ("cares most about…"). Simulated experts = same model: say so in the report; diversity comes from role, bias and evidence, not real expertise.

## 4. Round 1 — alone, in parallel (anti-anchoring)
Spawn all experts in ONE message with the Agent tool, `subagent_type: general-purpose`, `model: sonnet` (deep: inherit), `run_in_background: false` is fine. They must NOT see each other. Prompt template:

```
You are <ROLE> (<bias>). Panel brainstorm for Automon Arena, an original offline creature auto-battler (MVP1) built by a no-code owner with Claude as coder.
QUESTION: <q>   SUCCESS = <criteria>   GOAL: <B1/B2/B3>
FIT PACK: <lines>   EVIDENCE PACK: <lines>
<deep only: you may run up to 2 WebSearch (standard) for your angle; cite URL+tier.>
Answer alone, ≤ 350 words, English, this format:
1. Top 3 proposals (each: what · why it fits us · pros · cons · effort S/M/L)
2. Biggest risk you see (pre-mortem style) and how to prevent it
3. Evidence: which pack lines (or your new URLs) support you; mark guesses as guesses
4. Confidence 1–5 + what would change your mind
Do not edit files. Do not agree just to be polite.
```

## 5. Round 2 — debate (standard/deep only, max 1 extra round)
- Moderator makes an anonymous digest of all Round-1 answers (≤ 25 lines, "Expert A/B/C…", no roles → judge ideas, not status).
- Continue each expert with SendMessage (same agent keeps its context = cheaper): "Here are the others' ideas. (1) Attack the strongest idea that is not yours — one concrete flaw. (2) Name one idea from others you would adopt. (3) Change your top pick ONLY if given a reason; say which reason. ≤ 200 words."
- Stop after this round even without agreement — disagreement is reported, not forced away (debates drift to confident wrong consensus).

## 6. Moderator synthesis (main agent)
- Score each surviving idea: **Impact · Fit to us · Effort · Risk · Evidence strength (T1/T2/T3/guess)**, 1–5 each, in one table.
- Separate: **consensus** · **open disagreement** (both sides, 1 line each) · **minority report** (the best idea most experts rejected, and why it might still be right).
- Recommendation: 2–3 options A1/A2/(A3) + the recommended one + side effects/clashes with current docs.
- Next step mapped to our skills: rule → `rule-change` · UI → `ui-work` · numbers → `balance-import` · process → edit only after A/B approval.

## 7. Output
- File: `claude/review-YYYY-MM-DD-brainstorm-<slug>.md` (English): question · panel · evidence pack with URLs · round-1 key points per expert · debate highlights · score table · consensus / disagreement / minority · recommendation · sources. Docs-only → push to main; add one line to the Relay (open decision).
- Chat (Thai, 3-line header ①②③): then the meeting summary in ≤ 20 lines — what the panel recommends, top pros/cons, the main disagreement, the minority view, cost used (experts × rounds). Then explain the A/B choices in text and call AskUserQuestion.
- Change nothing in the game, rules or process until the user picks.
