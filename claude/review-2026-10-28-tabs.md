# Match tab pattern check (28 Oct 2026, set 44 — report only, nothing changed)
User ask: do all characters follow the same pattern? Tab 1 = my damage first, then to whom · Tab 2 = damage I took first, then from whom · Tab อื่นๆ = heal/armor/skill I gave first, then to whom.

Answer: yes — one shared code path for all 48 characters (src/lab/matchcalc.js + lab/balance/js/51-match-units.js), no per-character branches. Checked by reading code + scanning 400 random matches (all chars, Lv1–3, tribes on). Exceptions found:

- G1 · SF-5 (ฟ้าผ่า) self-KO: shows in its own tab 2 as "ไม่มีเจ้าของ (พายุทราย · ไฟที่ไม่มีผู้ทำ)" — label wrong for this case. Fix: label "ตัวเอง down (สกิล)". Size: tiny (label only).
- G2 · WN-4 (ชาแมน) revive-ally: revive event has no giver (`from`) → not in WN-4's อื่นๆ tab at all; nobody sees "ชุบใส่ใคร". Same for self-revive skills and อสูร tribe revive (no giver, by design). Fix: add `from` to revive log (detail on only) + row in อื่นๆ. Size: small, touches core/battle.js (detail-only, results unchanged).
- G3 · PL-5 (วิหคเพลิง) summon: event has giver but no skill index → not shown in อื่นๆ. Fix: add skill index, show "เรียกตัว X". Size: small.
- G4 · tribe armor with no source (HL tribe bonus): counted as "ให้เกราะ (โบนัสเผ่า)" to itself — by design (V1.3, user A), listed for completeness.
- G5 · non-heal/armor skill effects (buff, steal, cleanse, reflect…) show count only, amount "—" (mixed units). Pattern (amount first → to whom) holds only for heal/armor. Option: show amount per effect type (e.g. "+atk 120"). Size: medium. **User chose C (28 Oct): keep "—", no change. Do not re-propose unless user asks.**
- G6 · tab สเตตัส: final stats only, no "to whom" (not part of the pattern, by design).
- Known decisions, not bugs: shock damage credited to the hitter who pops it (user 28 Oct, keep); burn split by applier share (A7); storm = no owner.
- Stale comment: 51-match-units.js line 125 says อื่นๆ shows received + given; it shows given only since A1.
