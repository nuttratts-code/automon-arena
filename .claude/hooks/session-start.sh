#!/bin/bash
# Set 158 B1: at chat start, fetch and print the Relay block of origin/main so Claude
# sees it every chat (skill chat-start continues from here). Read-only: never edits or pushes
# (only writes the daily stamp file inside the git dir, set 250).
# Never fails the session: every step falls back quietly.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
src=$(cat 2>/dev/null | grep -o '"source"[^,}]*' | grep -o '[a-z]*"$' | tr -d '"')
case "$src" in resume|compact) exit 0;; esac
timeout 20 git fetch -q origin main 2>/dev/null
ref=origin/main; git rev-parse -q --verify "$ref" >/dev/null || ref=HEAD
echo "=== chat-start hook: Relay block from $ref:claude/handoff.md (run skill chat-start next) ==="
git show "$ref:claude/handoff.md" 2>/dev/null | awk '/^## Relay/{p=1} p&&/^## /&&!/^## Relay/{exit} p'
# Set 250 X1 (weekly review experiment): hygiene warnings that text rules missed twice
# (handoff size · decided reviews left in claude/ · open reviews > 7 days). Read-only.
hs=$(git show "$ref:claude/handoff.md" 2>/dev/null | wc -c)
[ "${hs:-0}" -gt 9000 ] 2>/dev/null && echo "⚠ hygiene: handoff.md = $hs bytes (> 9000) → trim at close-out (archive old Relay/State)"
rv=$(git show "$ref:claude/reviews.md" 2>/dev/null)
dec=$(echo "$rv" | grep -E '^\| review-[^|]*\.md \|' | grep -E '\| decided \|$' | grep -oE 'review-[0-9-]+[a-z0-9-]*\.md' | tr '
' ' ')
[ -n "$dec" ] && echo "⚠ hygiene: decided reviews still in claude/ → git mv to claude/archive/reviews/: $dec"
now=$(date +%s 2>/dev/null)
old=$(echo "$rv" | grep -E '^\| review-[0-9]{4}-[0-9]{2}-[0-9]{2}[^|]*\| .*\| open' | grep -vE 'parked|(Godot)|(ideas)' | grep -oE 'review-[0-9]{4}-[0-9]{2}-[0-9]{2}[a-z0-9-]*' | while read f; do d=$(echo "$f" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}'); t=$(date -d "$d" +%s 2>/dev/null) || continue; a=$(( (now - t) / 86400 )); [ "$a" -gt 7 ] && printf '%s (%sd) ' "${f#review-}" "$a"; done)
[ -n "$old" ] && echo "⚠ hygiene: open reviews waiting > 7 days → remind the owner: $old"
# Set 250 W1: a WIP branch runs its OWN CLAUDE.md/skills/hooks → warn when main has newer rule commits.
br=$(git branch --show-current 2>/dev/null)
if [ -n "$br" ] && [ "$br" != main ]; then
  nb=$(git log --oneline "HEAD..$ref" -- CLAUDE.md .claude claude/workflow 2>/dev/null | wc -l)
  [ "${nb:-0}" -gt 0 ] 2>/dev/null && echo "⚠ rules: branch $br is missing $nb rule commit(s) from main (CLAUDE.md/.claude/claude/workflow) → git merge origin/main first (chat-start step 5)"
fi
# Set 250 daily brief: once per day per PC (stamp in the git dir, never committed) → skill daily-brief.
gd=$(git rev-parse --git-common-dir 2>/dev/null); today=$(date +%F 2>/dev/null)
if [ -n "$gd" ] && [ -n "$today" ] && [ "$(cat "$gd/automon-daily" 2>/dev/null)" != "$today" ]; then
  echo "🌅 DAILY: first chat today ($today) → run skill daily-brief after the Relay, before proposing work"
  echo "$today" > "$gd/automon-daily" 2>/dev/null
fi
echo "=== current branch: $(git branch --show-current 2>/dev/null) ==="
exit 0
