# src/core/runboss.js port — bosses inside the run (set 195, plan step 6b): runBossAt · runBossTeam · runBossOpts ·
# runBossChar · dummyScore · runBossById · bossExtraOf. RUN_STAGE / DUMMY_BOSS come from game.json (modules.runboss).
# Check: tests/test_stage.gd vs golden stage.jsonl. A change in runboss.js must be made here too.
extends RefCounted

const R := preload("res://scripts/rules.gd")
const S := preload("res://scripts/stage.gd")
const B := preload("res://scripts/boss.gd")
const Rng := preload("res://scripts/rng.gd")

const DUMMY_ID := "DUMMY"

static func RUN_STAGE() -> Dictionary:
	return R.mod("runboss")["RUN_STAGE"]

static func DUMMY_BOSS() -> Dictionary:
	return R.mod("runboss")["DUMMY_BOSS"]

static func is_dummy(b: Variant) -> bool:
	return b is Dictionary and b.get("id") == DUMMY_ID

static func _stage(stage: Variant) -> Dictionary:
	return RUN_STAGE() if stage == null else stage

# run state {round, seed} → {boss, k} or null · the last round = the training dummy · same seed + round → same pick
static func run_boss_at(st: Dictionary, stage: Variant = null) -> Variant:
	var sg := _stage(stage)
	var set: Dictionary = sg["settings"]
	var round := R.js_i32(st.get("round"))
	if round >= 1 and round == R.js_i32(set.get("lastStage")):
		return {"boss": DUMMY_BOSS(), "k": 1.0}
	var k := S.boss_round_k(round, set)
	if k == 0.0:
		return null
	var list := []
	for b in sg["bosses"]:
		if S._truthy(b.get("on")):
			list.append(b)
	if list.is_empty():
		return null
	var seed := Rng.u32(int(st.get("seed", 0.0)) if R.is_num(st.get("seed")) else 0)
	var rng := Rng.new((seed ^ 0x5B0551E5 ^ Rng.imul(round + 1, 0x2C1B3C6D)) & Rng.M32)
	return {"boss": list[rng.int_below(list.size())], "k": k}

static func run_boss_opts(b: Variant, stage: Variant = null) -> Dictionary:
	if is_dummy(b):
		return {"stopMs": float(maxi(1, R.js_i32(_stage(stage)["settings"].get("dummySec"))) * 1000)}
	return {}

# damage the player side put into the dummy → whole number
static func dummy_score(res: Variant) -> float:
	var n := 0.0
	if res is Dictionary and res.get("units") is Array:
		for u in res["units"]:
			if R.js_seq(u.get("side"), 0.0):
				n += R.js_or0(u.get("dealt"))
	return R.js_round(n)

static func run_boss_by_id(id: Variant, stage: Variant = null) -> Variant:
	if id == DUMMY_ID:
		return DUMMY_BOSS()
	for b in _stage(stage)["bosses"]:
		if R.js_seq(b.get("id"), id):
			return b
	return null

static func boss_extra_of(extra: bool, stage: Variant = null) -> float:
	return float(R.js_i32(_stage(stage)["settings"].get("bossExtraPct"))) if extra else 0.0

static func _g2(sg: Dictionary) -> Variant:  # stage.boss2 || undefined
	var g: Variant = sg.get("boss2")
	return g if g is Dictionary else null

static func run_boss_team(b: Dictionary, k: float, stage: Variant = null, extra: bool = false) -> Array:
	var sg := _stage(stage)
	return [B.boss_unit(b, k, boss_extra_of(extra, sg), _g2(sg))]

# boss as a character card for the battle view / unit panels
static func run_boss_char(b: Dictionary, k: float, stage: Variant = null, extra: bool = false) -> Dictionary:
	var sg := _stage(stage)
	var at := S.boss_at(b, k, boss_extra_of(extra, sg), _g2(sg))
	var b3 := func(v: Variant) -> Array: return [v, v, v]
	return {"id": b["id"], "name": "%s (บอส)" % R.js_str(b.get("name")), "tribe": b.get("tribe"), "extraTribes": [], "rarity": "ตำนาน", "price": 0.0, "rowHint": "หน้า",
		"hp": b3.call(at["hp"]), "atk": b3.call(at["atk"]), "cdMs": b3.call(b.get("cdMs")), "multi": b3.call(b.get("multi")),
		"burn": b3.call(R.js_or0(b.get("burn"))), "shock": b3.call(R.js_or0(b.get("shock"))), "armorHit": b3.call(0.0), "healHit": b3.call(0.0), "skills": []}
