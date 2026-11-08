#!/bin/bash
# Set 158 B1: at chat start, fetch and print the Relay block of origin/main so Claude
# sees it every chat (skill chat-start continues from here). Read-only: never edits or pushes.
# Never fails the session: every step falls back quietly.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
src=$(cat 2>/dev/null | grep -o '"source"[^,}]*' | grep -o '[a-z]*"$' | tr -d '"')
case "$src" in resume|compact) exit 0;; esac
timeout 20 git fetch -q origin main 2>/dev/null
ref=origin/main; git rev-parse -q --verify "$ref" >/dev/null || ref=HEAD
echo "=== chat-start hook: Relay block from $ref:claude/handoff.md (run skill chat-start next) ==="
git show "$ref:claude/handoff.md" 2>/dev/null | awk '/^## Relay/{p=1} p&&/^## /&&!/^## Relay/{exit} p'
echo "=== current branch: $(git branch --show-current 2>/dev/null) ==="
exit 0
