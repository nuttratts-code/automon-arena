"""Owner-turn counter for prompt-rules.sh (set 288; replaces the set 254 per-session-id file).

Why: the desktop app moves a long chat to a NEW session id (resume/compact copies the whole
transcript into a new file), so a counter keyed on session_id restarted at 1 mid-chat
(chat a9625fc9, 23 Nov: 04893301 -> 9d39bdc3 -> a9625fc9, warning never shown).
Now: count the owner's real messages in the transcript the hook names (it carries the copied
history). Background notices (<task-notification>), skill bodies (isMeta), compact summaries
and tool results are not owner turns.

Context size (set 292, owner: long chats burn tokens — every call re-sends the whole chat):
also report the chat's size in k tokens = input + cache read + cache write of the LAST main-chat
assistant call (sidechain/subagent calls skipped). 0 = unknown / new chat.

stdin = the UserPromptSubmit hook JSON. stdout = "<n> <ctxk>" or "bg <n> <ctxk>" (current prompt
is a background notice; n = owner turns so far) or nothing on any error / missing transcript.
Never raises.
"""
import json
import re
import sys

REMINDER = re.compile(r"<system-reminder>.*?</system-reminder>", re.S)


def text_of(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        if any(isinstance(b, dict) and b.get("type") == "tool_result" for b in content):
            return ""
        return "\n".join(b.get("text") or "" for b in content if isinstance(b, dict) and b.get("type") == "text")
    return ""


BACKGROUND_HEADS = ("<task-notification>", "<cross-session-message", "Another Claude session sent a message")


def is_background(text):
    """Automatic inputs that are not the owner typing: background notices and messages from other chats."""
    return text.lstrip().startswith(BACKGROUND_HEADS)


def owner_text(d):
    """Return the owner's own words for a transcript line, or None if it is not an owner turn."""
    if d.get("type") != "user" or d.get("isSidechain") or d.get("isMeta") or d.get("isCompactSummary"):
        return None
    kind = (d.get("origin") or {}).get("kind")
    if kind not in (None, "human"):
        return None  # task-notification and other automatic inputs
    words = REMINDER.sub("", text_of((d.get("message") or {}).get("content"))).strip()
    if not words or is_background(words) or words.startswith("<local-command") or words.startswith("<command-"):
        return None
    return words


def main():
    hook = json.loads(sys.stdin.buffer.read().decode("utf-8", "replace") or "{}")
    prompt = REMINDER.sub("", str(hook.get("prompt") or "")).strip()
    path = hook.get("transcript_path") or ""
    turns, last, ctx = 0, None, 0
    if not path:
        return  # no transcript = no reliable count; the hook then says "unavailable"
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for line in f:
                if '"assistant"' in line and '"usage"' in line:
                    try:
                        d = json.loads(line)
                    except ValueError:
                        continue
                    u = (d.get("message") or {}).get("usage") or {}
                    if d.get("type") == "assistant" and u and not d.get("isSidechain"):
                        ctx = (u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0)
                               + u.get("cache_creation_input_tokens", 0))
                    continue
                if '"user"' not in line:
                    continue
                try:
                    w = owner_text(json.loads(line))
                except ValueError:
                    continue
                if w is not None:
                    turns, last = turns + 1, w
    except FileNotFoundError:
        pass  # first prompt of a brand-new chat: transcript not written yet
    if is_background(prompt):
        print("bg %d %d" % (turns, ctx // 1000))
        return
    # The current prompt may or may not be in the transcript yet when the hook runs.
    if not (last is not None and prompt and (last == prompt or last.endswith(prompt))):
        turns += 1
    print("%d %d" % (turns, ctx // 1000))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
