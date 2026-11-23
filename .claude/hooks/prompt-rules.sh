#!/bin/bash
# Set 254 (owner: "hook อ่านกฎก่อนเสมอ"): on EVERY owner message, print a short rule digest + the turn number of this chat,
# so the rules are read before acting (set 253 ran ~25 turns past HARD RULE 1 because nothing counted turns).
# Counter (set 288): count the owner's messages in the transcript the hook names (turn-count.py).
# The old per-session-id file (set 254) restarted at 1 whenever the app moved the chat to a new session id.
# Background <task-notification> prompts are not owner turns. Read-only. Never fails the prompt.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
in=$(cat 2>/dev/null)
py=$(command -v python || command -v python3)
r=$(printf '%s' "$in" | "$py" -I .claude/hooks/turn-count.py 2>/dev/null)
gd=$(git rev-parse --git-common-dir 2>/dev/null) && find "$gd" -maxdepth 1 -name 'claude-turns-*' -delete 2>/dev/null
case "$r" in
  bg\ *) echo "=== rules check (hook) · background notice, NOT an owner turn (owner turns so far: ${r#bg }) ==="; exit 0 ;;
  ''|*[!0-9]*) n=0; echo "=== rules check (hook) · owner turn count unavailable — count the owner's messages yourself (HARD RULE 1) ===" ;;
  *) n=$r; echo "=== rules check (hook, set 288) · owner turn $n of this chat ===" ;;
esac
echo "- Reply in Thai: 3-line header (ทำแล้ว/พบ · ต้องตัดสินใจ · ไม่แน่ใจ). Conflict check vs docs before acting. Ask everything up front (A/B + AskUserQuestion)."
echo "- Open the CLAUDE.md topic-table skill for this task BEFORE working (UI → ui-work · bug → find-cause · values → balance-import · code → merge-code)."
echo "- HARD 3 gate before main · 5 cause before fix · 6 values need AMCFG1+cfgdiff · 8 ripple line · 9 security + secret grep."
if [ "$n" -ge 15 ] 2>/dev/null; then
  echo "⚠ HARD RULE 1: turn $n ≥ 15 → finish the current step only, push, then run skill close-out and tell the owner in Thai to open a new chat. Do NOT start new work here."
elif [ "$n" -ge 12 ] 2>/dev/null; then
  echo "- HARD RULE 1: turn $n — close-out due at 15; warn the owner in Thai before taking a new task."
fi
exit 0
