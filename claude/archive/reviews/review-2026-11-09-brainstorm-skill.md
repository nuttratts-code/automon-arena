# Review 2026-11-09 — brainstorm skill design (set 164, docs only)
User asked: a skill that researches reliable sources, then 4–5 simulated experts (separate subagents) debate a topic and a meeting summary comes back. Skill: .claude/skills/brainstorm/SKILL.md.

## Evidence used for the design
| Finding | Source | Tier | Design choice |
|---|---|---|---|
| Groups whose members first work alone beat open brainstorming; production blocking explains most of the loss (Diehl & Stroebe 1987); NGT/Delphi = silent/anonymous rounds | https://en.wikipedia.org/wiki/Nominal_group_technique · https://pmc.ncbi.nlm.nih.gov/articles/PMC4909789 | T1/T2 (exact effect sizes unsettled per CASRAI) | Round 1 alone + parallel; anonymous digest in round 2 |
| Multiagent debate improves reasoning/factuality, but is costly, long debates overwhelm models, and debates can converge confidently on a WRONG answer | https://arxiv.org/abs/2305.14325 (Du et al., ICML 2024) | T1 | Max 1 debate round · mandatory skeptic · minority report · keep disagreement visible |
| Pre-mortem (assume it failed, list why) — Klein, HBR 2007; prospective hindsight (Mitchell, Russo & Pennington 1989) ~30% better at finding reasons (figure unverified) | https://en.wikipedia.org/wiki/Pre-mortem | T2 | Skeptic runs a pre-mortem; every expert names a biggest risk |
| Multi-agent research: lead + parallel subagents beat a single agent (+90% internal eval) but use ~15× chat tokens; worth it only for high-value tasks; lead Opus + Sonnet workers | https://www.anthropic.com/engineering/multi-agent-research-system | T1 | Size chosen up front (lite/standard/deep) · shared evidence pack done once · experts on Sonnet by default |

## Choices Claude added beyond the request (user may strip any)
1. Ask size/goal up front (lite 3 / standard 4–5 / deep with web per expert).
2. Shared evidence pack with source tiers T1–T3, "unverified" marks, no invented sources.
3. Fit pack from our docs (MVP1, originality, no-code owner, HARD RULE 6) so ideas fit Automon Arena.
4. Anti-groupthink: alone first, anonymous digest, skeptic + pre-mortem, minority report.
5. Score table (impact · fit · effort · risk · evidence) + A1/A2 options mapped to our skills.
6. Honest limit: simulated experts are one model, not real expertise.
