# src/core/botteams.js port — run parts (set 195, plan step 6e): simRun (one bot run = the player is a bot), foeSide, pickFoe,
# pickBotTeam, foe power helpers, botRounds, roundCell, tribeList, teamTribe. Team generation (genBotTeams / gatherBotPool /
# validateBotTeams) stays in JS (Balance Room + lab tools); the bot teams ship inside data/game.json (botdata.BOT_TEAMS).
# Check: tests/test_bot.gd vs golden (c) runs.jsonl (200 runs: every match + final state). A change in botteams.js must be made here too.
extends RefCounted

const R := preload("res://scripts/rules.gd")
const SH := preload("res://scripts/shop.gd")
const BOT := preload("res://scripts/bot.gd")
const T := preload("res://scripts/team.gd")
const P := preload("res://scripts/power.gd")
const RN := preload("res://scripts/runes.gd")
const RR := preload("res://scripts/runrunes.gd")
const RB := preload("res://scripts/runboss.gd")
const Battle := preload("res://scripts/battle.gd")
const Rng := preload("res://scripts/rng.gd")
const JM := preload("res://scripts/jsmath.gd")

const FOE_PICK := {"win": 3, "near": 4}

static func BOT_TIERS() -> Array:
	return R.mod("botteams")["BOT_TIERS"]

static func BOT_TOP() -> int:
	return int(R.mod("botteams")["BOT_TOP"])

static func BOT_TEAMS() -> Dictionary:
	return R.mod("botdata")["BOT_TEAMS"]

static func _rules(rules: Dictionary) -> Dictionary:
	return R.RULES() if rules.is_empty() else rules

static func _stage(stage: Variant) -> Dictionary:
	return RB.RUN_STAGE() if stage == null else stage

static func _setting(s: Dictionary, k: String, d: float) -> float:  # s.k ?? d
	return float(s[k]) if s.get(k) != null else d

static func bot_rounds(rules: Dictionary = {}, stage: Variant = null) -> float:
	var S: Dictionary = _rules(rules)["shop"]
	return maxf(S["winsToFinish"] + S["hearts"] - 1.0, float(R.js_i32(_stage(stage)["settings"].get("lastStage"))) - 1.0)

static func round_cell(round: Variant, n: float) -> int:
	return int(maxf(1.0, minf(n, float(R.js_i32(round))))) - 1

static func tribe_list(chars: Array) -> Array:
	var out := []
	for c in chars:
		if not out.has(c["tribe"]):
			out.append(c["tribe"])
	return out

# main tribe of a team = most units (extra tribes count) · tie → pref if tied, else the first in list order
static func team_tribe(team: Array, cm: Dictionary, pref: Variant = null) -> Variant:
	var n := {}
	for e in team:
		var c: Dictionary = cm[e["id"]]
		var ts := [c["tribe"]]
		ts.append_array(c["extraTribes"])
		for t in ts:
			n[t] = float(n.get(t, 0.0)) + 1.0
	var top := -INF
	for t in n:
		top = maxf(top, n[t])
	if pref != null and n.get(pref) == top:
		return pref
	for t in n:
		if n[t] == top:
			return t
	return null

# one bot run (the player is a bot) · opponent(P) → entries / {team, rn, s, pct} / null (= spare live bot B)
# on_match(info) per match · opts: focus, foeFocus, extra (keep playing extra matches until round ≥ extra), runes, detail
static func sim_run(chars: Array, rules: Dictionary, seed: Variant, opponent: Variant, on_match: Variant, stage: Variant = null, opts: Dictionary = {}) -> Dictionary:
	var rl := _rules(rules)
	var sg := _stage(stage)
	var cm := T.make_char_map(chars)
	var RU := SH._truthy(opts.get("runes"))
	var s32 := Rng.u32(int(float(seed)))
	var PL := SH.new_run(chars, float(s32), rl)
	var B := SH.new_run(chars, float((s32 ^ 0xA5A5A5A5) & Rng.M32), rl)
	var focus: Variant = opts.get("focus") if SH._truthy(opts.get("focus")) else null
	var foe_focus: Variant = opts.get("foeFocus") if SH._truthy(opts.get("foeFocus")) else null
	for guard in 220:
		if SH._truthy(PL.get("over")):
			break
		SH.start_round(PL, chars, rl)
		SH.start_round(B, chars, rl)
		BOT.bot_shop(PL, chars, rl, {"focus": focus})
		if RU:
			BOT.bot_place_runes(PL, cm, rl)
		var rb: Variant = RB.run_boss_at(PL, sg)
		var preset: Variant = null
		if rb == null and opponent is Callable:
			preset = opponent.call(PL)
		if preset == null and rb == null:
			BOT.bot_shop(B, chars, rl, {"focus": foe_focus})
			if RU:
				BOT.bot_place_runes(B, cm, rl)
		var mine := SH.team_entries(PL)
		var my_rn := RR.rn_compact(PL) if RU else []
		var ws := float(R.js_i32(PL.get("ws")))
		var foe: Variant = null
		if rb == null:
			if preset != null:
				foe = {"team": preset} if preset is Array else preset
			else:
				foe = {"team": SH.team_entries(B), "rn": RR.rn_compact(B) if RU else [], "s": float(R.js_i32(B.get("ws")))}
		var me := RN.equip_runes(T.build_team(mine, cm, rl), RR.rn_from_compact(my_rn, sg), {"winStreak": ws})
		var fs: Dictionary
		if rb != null:
			fs = {"units": RB.run_boss_team(rb["boss"], rb["k"], sg, SH._truthy(PL.get("extra"))), "opts": RB.run_boss_opts(rb["boss"], sg)}
		else:
			fs = foe_side(foe, cm, rl, sg, PL["round"])
		var so := {"rules": rl}
		if SH._truthy(opts.get("detail")):
			so["log"] = true
			so["detail"] = true
		else:
			so["log"] = false
		if me["tribeExtra"].size() > 0:
			so["tribeExtra"] = me["tribeExtra"]
		so.merge(fs["opts"], true)
		var res := Battle.simulate(me["units"], fs["units"], so)
		var wins: float = PL["wins"]
		var round: float = PL["round"]
		var gold: float = PL["gold"]
		var hearts: float = PL["hearts"]
		var won: bool = not R.js_seq(res["winner"], 1.0)
		var ex: bool = SH._truthy(PL.get("extra"))
		var perm: Array = res["perm"] if res.get("perm") is Array else []
		var em := SH.end_match(PL, won, chars, rl, perm.filter(func(g): return float(g["side"]) == 0.0), rb != null)
		if RU and em.get("second") == true and not SH._truthy(PL.get("over")):
			BOT.bot_take_rune(PL, "sc", cm)
		if preset == null and rb == null:
			SH.end_match(B, R.js_seq(res["winner"], 1.0), chars, rl, perm.filter(func(g): return float(g["side"]) == 1.0))
			B["over"] = false
			B["hearts"] = rl["shop"]["hearts"]
			B["lastWon"] = PL["lastWon"]
			if RU and R.js_seq(res["winner"], 1.0):
				BOT.bot_take_rune(B, "win", cm)
		if R.js_or0(opts.get("extra")) != 0.0 and SH._truthy(PL.get("over")) and float(PL["hearts"]) > 0.0 and float(PL["round"]) < float(opts["extra"]):
			SH.continue_extra(PL)
		if RU and won and not SH._truthy(PL.get("over")):
			BOT.bot_take_rune(PL, "boss" if rb != null else "win", cm)
		if on_match is Callable:
			var mo := {"rules": rl, "log": false}
			if me["tribeExtra"].size() > 0:
				mo["tribeExtra"] = me["tribeExtra"]
			on_match.call({"stage": wins, "round": round, "gold": gold, "hearts": hearts, "extra": ex, "second": em.get("second") == true, "team": mine,
				"rn": my_rn, "ws": ws, "foe": foe["team"] if foe != null else null, "foeRn": (foe["rn"] if foe.get("rn") != null else []) if foe != null else [],
				"res": res, "winner": res["winner"], "timeMs": res["timeMs"], "aborted": res["aborted"] if SH._truthy(res.get("aborted")) else null,
				"boss": rb["boss"]["id"] if rb != null else null, "k": rb["k"] if rb != null else 0.0, "units": me["units"], "opts": mo, "fs": fs})
	return PL

# enemy bot side for simulate: team × pct × extra-round growth, then its runes · tribe flags → opts.tribeExtraB
static func foe_side(foe: Dictionary, cm: Dictionary, rules: Dictionary = {}, stage: Variant = null, round: Variant = 0.0) -> Dictionary:
	var rl := _rules(rules)
	var pct: Variant = foe["pct"] if R.js_or0(foe.get("pct")) != 0.0 else 100.0
	var units := RR.rn_foe_scale(T.build_team(foe["team"], cm, rl), pct, stage, round)
	var e := RN.equip_runes(units, RR.rn_from_compact(foe["rn"] if foe.get("rn") != null else [], stage), {"winStreak": float(R.js_i32(foe.get("s")))})
	return {"units": e["units"], "opts": {"tribeExtraB": e["tribeExtra"]} if e["tribeExtra"].size() > 0 else {}}

static func _clone_pick(t: Dictionary, k: int, round: Variant) -> Dictionary:
	return {"tier": t["tier"], "stage": float(k), "span": 0.0, "round": round, "team": t["team"].duplicate(true), "rn": t["rn"].duplicate(true), "s": t["s"]}

static func pick_bot_team(data: Dictionary, round: Variant, seed: Variant, tier: Variant = null) -> Dictionary:
	var k := round_cell(round, data["rounds"].size())
	var all: Array = data["rounds"][k]
	var ti := BOT_TIERS().find(tier)
	var list := all if ti < 0 else all.filter(func(t): return t["tier"] == tier)
	var salt := 0 if ti < 0 else Rng.imul(ti + 1, 0x165667B1)
	var i := Rng.new((Rng.u32(int(float(seed))) ^ Rng.imul(R.js_i32(round) + 1, 0x27D4EB2F) ^ salt) & Rng.M32).int_below(list.size())
	return _clone_pick(list[i], k, float(k + 1))

static func foe_want_pct(extra: bool, stage: Variant = null) -> float:
	return 100.0 + (maxf(0.0, float(R.js_i32(_stage(stage)["settings"].get("foeExtraPct")))) if extra else 0.0)

static func foe_floor_pct(ls: Variant, stage: Variant = null) -> float:
	var s: Dictionary = _stage(stage)["settings"]
	var fl := _setting(s, "foeFloor", 100.0)
	var k := float(R.js_i32(ls)) - _setting(s, "foeFloorLs", 2.0) + 1.0
	return maxf(0.0, maxf(minf(fl, _setting(s, "foeFloorMin", 40.0)), fl - _setting(s, "foeFloorStep", 20.0) * k) if k > 0.0 else fl)

static func foe_ws_pct(ws: Variant, stage: Variant = null) -> float:
	var s: Dictionary = _stage(stage)["settings"]
	var k := float(R.js_i32(ws)) - _setting(s, "foeWsFrom", 2.0) + 1.0
	return 100.0 + (maxf(0.0, _setting(s, "foeWsStep", 10.0)) * k if k > 0.0 else 0.0)

# the enemy = the real bot team closest in power to the player's (set 119 / 127 / 128 / 141 / 185)
static func pick_foe(data: Dictionary, my_units: Variant, round: Variant, seed: Variant, extra: bool = false, stage: Variant = null, rules: Dictionary = {}, ls: Variant = 0.0, ws: Variant = 0.0) -> Dictionary:
	var sg := _stage(stage)
	var rl := _rules(rules)
	var n: int = data["rounds"].size()
	var k := round_cell(round, n)
	var want := foe_want_pct(extra, sg)
	var pp: float = maxf(0.0, float(my_units)) if (my_units is float or my_units is int) else P.team_power(my_units, rl)
	var top_tier: String = BOT_TIERS()[BOT_TOP()]
	var pws := []
	for t in data["rounds"][k]:
		if t["tier"] != top_tier:
			pws.append(float(t["pw"]))
	pws = R.sort_cmp(pws, func(a, b): return a - b)
	var med: float = pws[pws.size() >> 1] if pws.size() > 0 else 0.0
	if not (pp > 0.0):
		pp = med
	var floor_ := med * foe_floor_pct(ls, sg) / 100.0
	var s: Dictionary = sg["settings"]
	var base := _setting(s, "foeBaseExtra", 120.0) if extra else _setting(s, "foeBase", 100.0)
	var wsp := foe_ws_pct(ws, sg)
	var target := maxf(pp * base / 100.0, floor_) * wsp / 100.0
	var s32 := Rng.u32(int(float(seed)))
	var tail := {"pct": want, "want": want, "wsp": wsp, "power": R.js_round(pp), "floor": R.js_round(floor_)}
	if R.js_i32(round) == 1 and not extra:
		var r1: Array = data["rounds"][k].filter(func(t): return t["tier"] != top_tier)
		if r1.size() > 0:
			var t: Dictionary = r1[Rng.new((s32 ^ Rng.imul(2, 0x27D4EB2F) ^ 0x7E57F0E5) & Rng.M32).int_below(r1.size())]
			var o := _clone_pick(t, k, t["round"])
			o.merge(tail)
			return o
	var cand := []
	for i in range(maxi(0, k - FOE_PICK["win"]), mini(n - 1, k + FOE_PICK["win"]) + 1):
		var row: Array = data["rounds"][i]
		for j in row.size():
			cand.append({"t": row[j], "d": float(absi(i - k)), "j": float(j)})
	var gap := func(x) -> float: return absf(JM.js_log(float(x["t"]["pw"]) / target)) if target > 0.0 else float(x["t"]["pw"])
	for c in cand:
		c["g"] = gap.call(c)
	cand = R.sort_cmp(cand, func(a, b):
		if a["g"] != b["g"]: return a["g"] - b["g"]
		if a["d"] != b["d"]: return a["d"] - b["d"]
		return a["j"] - b["j"])
	var near := cand.slice(0, FOE_PICK["near"])
	var t: Dictionary = near[Rng.new((s32 ^ Rng.imul(R.js_i32(round) + 1, 0x27D4EB2F) ^ 0x7E57F0E5) & Rng.M32).int_below(near.size())]["t"]
	var o := _clone_pick(t, k, t["round"])
	o.merge(tail)
	return o
