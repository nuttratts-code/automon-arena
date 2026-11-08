# Stat budget notes: how many points each stat costs (Automon Arena)

V1.1 · 28 Oct 2026 · translated to English (content unchanged) · paired with combat-rules V1.28 · computed with `node lab/cost.mjs` · older versions: git log

> Every number here is **(ค่าเสนอ)** (proposed): from the base power-point formula, not yet measured against real win rates. Rough estimation aid only; balance measurement (±6) still decides.

## Formula (combat-rules V1.20)
- Base power points = √(total HP × damage per second) · skills not counted
- Damage per second = (ATK + burn/hit × 1.5 + shock/hit × 3) × multihit ÷ cooldown (ค่าเสนอ)
- Total HP = HP + armor/hit × hits per second × 15 s (ค่าเสนอ)
- Total budget (base + skills) at Lv1: common 16 · uncommon 28 · rare 36 · very rare 51 · legendary 74 · Lv2 ×2 · Lv3 ×4

## Approximate price at Lv1 (average over all 48 characters · range = min–max) (ค่าเสนอ)
| Stat change | Budget used | Range |
|---|---|---|
| ATK +1 | 1.2 pts | 0.3–2.7 |
| HP +10 | 0.8 pts | 0.3–1.3 |
| burn/hit +1 | 1.8 pts | 0.4–4.0 |
| shock/hit +1 | 3.4 pts | 0.9–7.5 |
| armor/hit +1 | 0.5 pts | 0.1–1.9 |
| cooldown −0.1 s | 0.3 (common) – 0.9 (legendary) pts | 0.05–1.2 |
| multihit +1 | 7 (common) – 22 (legendary) pts | 3–29 |

## Rough exchange rates (ค่าเสนอ)
- burn/hit 1 ≈ ATK 1.5 ≈ armor/hit 3–4 ≈ HP 20
- shock/hit 1 ≈ burn/hit 2 ≈ ATK 3 ≈ armor/hit 7
- ATK 1 ≈ HP 15 ≈ armor/hit 2–3
- Example: an armor unit giving **armor/hit 5** costs about the same as a burn unit giving **burn/hit 1.5** (not 2)

## Why the ranges are wide (read before use)
- Burn, shock, ATK raise the **hit hard** side · HP, armor raise the **stay alive** side · points multiply the two → a unit that already hits hard gains more points from armor/HP, and vice versa
- armor/hit depends on hits per second: fast / high-multihit units gain more armor per second → more expensive
- Multihit and cooldown multiply everything tied to a hit, so they get pricier the more stats the unit has
- Healing is not in this formula (it is a skill) · all skills use the remaining budget (budget − base points), see the Balance Room "แต้ม / งบ" field

## Proposed next step (not done)
- Measure real exchange rates by simulation (+1 one stat at a time, watch the win-rate change), then correct 1.5 / 3 / 15 → then remove the (ค่าเสนอ) labels
