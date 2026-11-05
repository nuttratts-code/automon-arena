# Set 98 — how other games end long fights ("sandstorm") · info only, nothing changed

Ours (combat-rules C, sandstorm): starts at 180 s, every 1 s fixed damage to every living unit, 10 then ×1.5 each tick (10, 15, 22, 34 … ~10,000 by tick 18), armor blocks it, does not count as "hit".

| Game | Starts | What it does | Ramp | Blocked by shield/armor |
|---|---|---|---|---|
| The Bazaar ("Sandstorm") | ~30 s (one item starts it at 7 s) | damage to both players every tick | grows over time (exact ramp not confirmed by sources) | not confirmed |
| Backpack Battles ("Fatigue") | nightfall ~17 s, then every 1 s | damage to both players | linear: 1, 2, 3 … (+1 per hit); some items add extra fatigue hits | wiki says normal damage rules |
| TFT ("Overtime", patch 13.22) | 30 s | no direct damage: every 1 s all units +10% damage, +10% attack speed, −10% healing/shield received (cap −70%), −10% CC duration (cap −70%) | stacking per second | n/a (it weakens heal/shield instead) |

Takeaways for us:
1. Others start at 17–30 s; ours at 180 s (fights are longer by design, so not directly comparable).
2. Linear (Backpack) gives a readable countdown; ours is exponential = a few ticks then everyone dies at once.
3. TFT attacks the cause of stalls (healing/shields) instead of adding damage. Our stall source is armor/heal stacking (e.g. HL tribe), which armor-blockable storm only fixes once numbers explode.

Possible options (not chosen — user decides):
- A. Keep as is.
- B. Add a TFT-style part: during storm, healing and armor gained −X% per tick (number = ask user).
- C. Make storm damage ignore armor (stormPierce true — already a rule switch) or start earlier.

Sources: pcgamesn.com/the-bazaar/mak-new-hero-season-1 · backpackbattles.wiki.gg/wiki/Fatigue_(demo) · backpackbattles.wiki.gg/wiki/Game_Mechanics · leagueoflegends.com TFT patch 13.22 notes
