# Ripple check — fix one spot, find every linked spot (set 186 A1)

Why: the same fact lives in several places (code · Thai rule doc · tests · ui_smoke · Balance Room · check page · runlog viewer · handoff). Sets 175 (stale doc header on check page), 183 (old rune name in a test) and 184 (doc said rune rerolls use leftover gold, the game never did) fixed one copy and left the others — found later, cost extra sets.

## When
Every commit that changes behaviour, a value, a name, a text the player sees, a save/run format, a rule id or a doc decision. Not needed for pure typo fixes inside one file or for Relay/handoff lines.

## How (before the commit)
1. **List what changed:** each id, name, Thai text, number, function/field name, rule id the diff touches (`git diff --stat` + the changed lines).
2. **Grep each one across the repo,** skipping `claude/archive/` and built `*.html`:
   `grep -rnF '<term>' src claude .claude CLAUDE.md --exclude-dir=archive --exclude=*.html | grep -v 'review-'`
   Grep the OLD spelling too (renames). Thai text: grep a short unique part.
3. **Walk the map below** for the area you touched, even when grep finds nothing (behaviour copies use different words).
4. **Each hit: fix it, or say why not** (old review file, retired test `ID@n`, intentionally different).
5. **Record it in the commit message:** `ripple: <term> → checked code/doc/tests/ui_smoke/balance/check · fixed: <files> · left: <file — why>`. The Relay line of the set gets `ripple ✓`.

## Map — what usually moves together
| You change | Also check |
|---|---|
| Rune (id, name, text, effect, when it pays) | src/core/runes.js / runrunes.js / stage.js / stage-user.js · claude/shop-merge-rules.md rune section · src/game/labels.js + run/js (texts, `◆n`, cards) · Balance Room stage tab (src/lab/balance) · src/tests/t-*.js + src/tests/ui_smoke.py (names!) · src/lab/runecheck.js · check.template.html |
| Character / kit | src/core/characters.js · claude/characters.csv (tools/csv.mjs) · combat-rules (skill text) · retired kit test `ID@n` · botteams/botdata (botgen) · Balance Room chars tab · art map src/game/art.js |
| Tribe | src/core/rules.js / rules-user.js · claude/tribe-rules.md · labels.js (tribe shapes/names) · Balance Room tribes tab · tests |
| Shop / gold / reroll / round order | src/core/shop.js · src/core/bot.js (bot uses the same rule) · claude/shop-merge-rules.md · run/js 40-draw-details.js (shown costs) · lab/econ*.mjs · src/tests/t-shop.js |
| Combat rule | src/core/battle.js · claude/combat-rules.md (id C-…) · bossrun/boss.js if bosses use it · power.js · tests |
| Save / run state / run code | src/core/save.js (version + migrate old saves) · runlog.js + lab/runlog* (old journals replay) · runcode.mjs · ARUN1 reader (lab/humanstats.js) |
| Player-visible text / layout | every screen size in ui-work 4b · ui_smoke selectors/texts · labels.js |
| Doc rule / version | doc header `Vx.y` · handoff "Doc versions" line · any page that cites the version (check page subtitle, set 175) |
| A workflow rule | CLAUDE.md · the topic file · every skill that repeats it (grep a key phrase in .claude/skills) · relay.md / handoff wording |

Add a row whenever a missed spot is found later (weekly review step "missed ripples").
