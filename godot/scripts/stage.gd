# src/core/stage.js port — only what the run code uses (set 195, plan step 6b): runeKind · runeActive · bossRoundK ·
# enemyMultAt · bossMults · bossAt · boss2Default · bossRuleById. Built-in tables (RUNE_EFF, RUNE_SPEC, BOSS_RULES …) and
# stageDefaults() come from game.json (modules.stage · derived.stage), so cleanStage/stageBase are not ported (Balance Room side).
# Check: tests/test_stage.gd vs golden stage.jsonl (src/lab/golden-stage.mjs). A change in stage.js must be made here too.
extends RefCounted

const R := preload("res://scripts/rules.gd")
const JM := preload("res://scripts/jsmath.gd")

static func M() -> Dictionary:
	return R.mod("stage")

# stageDefaults() (= runboss RUN_STAGE)
static func defaults() -> Dictionary:
	return R.game()["derived"]["stage"]

static func boss2_default() -> Dictionary:
	return defaults()["boss2"]

static func rune_kind(eff: Variant) -> String:
	if not (eff is String):
		return ""
	if eff == "skill":
		return "skill"
	if M()["RUNE_EFF"].has(eff):
		return "stat"
	if M()["RUNE_SPEC"].has(eff):
		return "special"
	return ""

# JS !!x && x.on && !x.del (callers only test truthiness)
static func _truthy(v: Variant) -> bool:
	if v == null:
		return false
	if v is bool:
		return v
	if v is int or v is float:
		return float(v) != 0.0 and not is_nan(float(v))
	if v is String:
		return v != ""
	return true

static func rune_active(x: Variant) -> bool:
	return x is Dictionary and _truthy(x.get("on")) and not _truthy(x.get("del"))

# boss rounds → k (1 = first boss) · 0 = no boss
static func boss_round_k(round: Variant, S: Dictionary) -> float:
	var r := R.js_i32(round)
	var e := maxi(1, R.js_i32(S.get("bossEvery")))
	var late := maxi(0, R.js_i32(S.get("bossLateFrom")))
	var el := maxi(1, R.js_i32(S.get("bossEveryLate")))
	if r < 1 or r > R.js_i32(S.get("lastStage")):
		return 0.0
	var k := 0
	for i in range(1, r + 1):
		if (i % e == 0) if i <= late else ((i - late) % el == 0):
			k += 1
	var hit: bool = (r % e == 0) if r <= late else ((r - late) % el == 0)
	return float(k) if hit else 0.0

static func enemy_mult_at(st: Dictionary, stage: float) -> float:
	return JM.js_pow(1.0 + float(st["growPct"]) / 100.0, maxf(0.0, stage - float(st["growFrom"]) + 1.0))

static func boss_mults(b: Variant, k: float, extra_pct: float = 0.0, g2: Variant = null) -> Dictionary:
	if g2 == null:
		g2 = boss2_default()
	if b == null or (b is Dictionary and _truthy(b.get("dummy"))):  # training dummy does not grow
		return {"hp": 1.0, "atk": 1.0}
	var n := maxf(0.0, k - 1.0)
	var x := JM.js_pow(1.0 + extra_pct / 100.0, maxf(0.0, k - 2.0))
	return {"hp": JM.js_pow(float(g2["g"]), n) * x, "atk": (1.0 + float(g2["a"]) * n) * x}

static func boss_at(b: Dictionary, k: float, extra_pct: float = 0.0, g2: Variant = null) -> Dictionary:
	var mm := boss_mults(b, k, extra_pct, g2)
	var m: float = mm["hp"]
	var ma: float = mm["atk"]
	var hp := float(b["hp"])
	return {"hp": R.js_round(hp * m), "barHp": R.js_round(hp * m / float(b["bars"])), "atk": R.js_round(float(b["atk"]) * ma),
		"armor": R.js_round(float(b["armor"]) * m), "dps": float(b["atk"]) * ma * float(b["multi"]) / (float(b["cdMs"]) / 1000.0)}

# BOSS_RULES.find(z => z[0] === id) or null
static func boss_rule_def(id: Variant) -> Variant:
	for q in M()["BOSS_RULES"]:
		if q[0] == id:
			return q
	return null
