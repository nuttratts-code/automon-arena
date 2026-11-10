# UI test notes — set 187 (10 Nov 2026)
The user tests the game UI (published game v131) and reports issues one by one. Claude only RECORDS them here (no code).

**Set 189 C1 (user, 10 Nov): web UI is frozen — every UI item here (not only animations) is built in Godot, not on the web page.** This file is now the Godot UI list (plan: claude/plan-godot-migration.md step P4/P5). Exception: a bug that makes the game unplayable or crash is still fixed on the web page (skill find-cause; merge gate HARD RULE 3).

**Animation rule (user A3, set 187):** UI animations/transitions are NOT built on the web page. Record them as specs only (Type = `anim-spec · Godot`); the next chat skips them. They are used when the game moves to Godot after MVP1 (build-plan V1.48).

Carried over to Godot (from set 183/185, skipped on the web set 189): shop card details over เริ่มสู้ on 667×375 / 740×330 · battle log line 2-line clamp check.

| # | Page / screen | User's words (Thai, verbatim) | What it means (Claude) | Type | Status |
|---|---|---|---|---|---|
