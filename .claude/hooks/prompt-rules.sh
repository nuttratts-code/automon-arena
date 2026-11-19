#!/bin/bash
# Set 254 (owner: "hook อ่านกฎก่อนเสมอ"): on EVERY owner message, print a short rule digest + the turn number of this chat,
# so the rules are read before acting (set 253 ran ~25 turns past HARD RULE 1 because nothing counted turns).
# Counter = one small file per session id inside the git dir (never committed). Read-only otherwise. Never fails the prompt.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
in=$(cat 2>/dev/null)
sid=$(printf '%s' "$in" | grep -o '"session_id"[^,}]*' | head -1 | grep -o '[A-Za-z0-9_-]*"$' | tr -d '"')
gd=$(git rev-parse --git-common-dir 2>/dev/null) || gd=""
n=1
if [ -n "$sid" ] && [ -n "$gd" ]; then
  f="$gd/claude-turns-$sid"
  n=$(( $(cat "$f" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$f" 2>/dev/null
  find "$gd" -maxdepth 1 -name 'claude-turns-*' -mtime +7 -delete 2>/dev/null
fi
echo "=== rules check (hook, set 254) · owner turn $n of this chat ==="
echo "- Reply in Thai: 3-line header (ทำแล้ว/พบ · ต้องตัดสินใจ · ไม่แน่ใจ). Conflict check vs docs before acting. Ask everything up front (A/B + AskUserQuestion)."
echo "- Open the CLAUDE.md topic-table skill for this task BEFORE working (UI → ui-work · bug → find-cause · values → balance-import · code → merge-code)."
echo "- HARD 3 gate before main · 5 cause before fix · 6 values need AMCFG1+cfgdiff · 8 ripple line · 9 security + secret grep."
if [ "$n" -ge 15 ] 2>/dev/null; then
  echo "⚠ HARD RULE 1: turn $n ≥ 15 → finish the current step only, push, then run skill close-out and tell the owner in Thai to open a new chat. Do NOT start new work here."
elif [ "$n" -ge 12 ] 2>/dev/null; then
  echo "- HARD RULE 1: turn $n — close-out due at 15; warn the owner in Thai before taking a new task."
fi
exit 0
