---
name: daily-brief
description: Daily brief (สรุปประจำวัน / วันนี้มีอะไรรอ / งานค้าง / รอตัดสินใจ): first chat of each day — hook prints "🌅 DAILY" once a day → run after the Relay, before chat-start step 6. Lists what waits for the owner's decision, what the owner must do, what Claude can do next, deadlines. Read-only.
---
# Daily brief (set 250, owner: "เรียกในแชทแรกของทุกวัน แจ้งว่ามีอะไรรอตัดสินใจหรือรอทำอยู่")

> Rules: CLAUDE.md + claude/workflow/relay.md win if anything differs. Read-only: no edits, no pushes in this skill.

**Trigger:** the hook line `🌅 DAILY: first chat today` (stamp `.git/automon-daily`, one per day per PC; cloud sessions print it every session — run it there only if the owner asks). The owner may also say "สรุปประจำวัน" any time.

## 1. Gather (grep / sed on origin/main only, never whole files; ≈ 3k tokens)
- `claude/handoff.md`: every Relay entry's **Next:** part · the "Parked" line · "Open decisions" · "Pending bundle" (งานรอรวม) · "User-side todo".
- `claude/reviews.md`: rows marked `open` (skip parked / ideas / Godot) with their age from the file date (the hook already prints those > 7 days).
- WIP branches named in the Relay: `git log -1 --format='%h %cr' origin/<branch>` (how old the last step is).
- CI: only if main got a code commit since the last Relay note of a green run → skill `ci-check`.
- Dates: weeks left to MVP1.5 (31 Dec 2026) · from 10 Dec: the set 250 T2 itch.io warning (handoff Pending) · Friday → "รีวิวสัปดาห์วันนี้" · first chat of a month → weekly-review §9 monthly rule test.

## 2. Show (Thai, after the 3-line header; ≤ 5 lines per group, oldest first, each line = what · where · age)
- 🟥 **รอคุณตัดสินใจ** — open reviews, open decisions, sample rounds waiting for the owner's OK.
- 🟧 **คุณต้องทำเอง** — user-side todo (play/paste, uploads, account settings like repo Private).
- 🟦 **Claude ทำต่อได้** — WIP branches + their next step, งานรอรวม (say "3 queued → do now" when it is).
- ⏰ **กำหนดเวลา** — weeks left, warnings, today's review reminders.
Empty group → leave it out. No list of finished work.

## 3. Then
Continue chat-start step 6: the owner picks what to do today from the list (A/B buttons, claude/workflow/replies.md). Nothing is done from the list without that pick.
