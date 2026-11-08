# workflow · replies, choices and buttons

V1.0 · 8 Nov 2026 (set 139: moved out of CLAUDE.md, content unchanged — user rule 8 Nov set 136). Open before asking the user to pick between options, or before guiding the user through a tool.

## Replies
- Work the user does in tools (Balance Room, game page): name the tool, one step at a time, wait for "done".
- "Why / how should" questions = short answer, change nothing until told.
- Characters as ID+name, e.g. PL-3 (name). Rules: C- combat · T- tribe · S- shop.

## Choice labels (user rule 8 Nov, set 136)
- When the user must pick, label each question/topic with a capital letter A, B, C… and its options A1, A2, A3… (B1, B2…), so the user can answer e.g. "A2 B1". Never use other ad-hoc labels (F1, Q1, ก/ข) for choices. Review files under claude/ follow the same labels.

## Buttons (user rule 8 Nov, set 136)
- Explain everything in normal chat text first (questions A, B… with options A1, A2… fully described in the text), then call AskUserQuestion: question text = letter + a one-line summary of the key point (e.g. "A PT-3 cooldown cut has no cap"), option label = "A1", "A2"… + a few words, description = the option's key point in one short line (in Thai) — enough to answer without scrolling back; never paste the full explanation.
- Max 4 questions × 2–4 options per call; more → several calls in a row.
- If the user closes the buttons or sends a message instead of answering, answer that message, then open the unanswered buttons again — repeat until every question is answered.
