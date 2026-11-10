# Battle simulator — exact port of src/core/battle.js simulate() (set 194, plan P2 steps 5c–5d).
# Same input (units + opts) = same result as JS, bit for bit (checked against golden (b), tests/test_battle.gd).
# Port rules (plan-set194 "Port traps"):
#  - every game number is float (= JS double); uids / step indexes / hashing are int
#  - fighters, skills, ctx, queue items are Dictionaries; identity checks use is_same() (Dictionary == compares contents)
#  - JS truthiness via _t(); "undefined > 0" style reads via _n() (missing = 0)
#  - every sort goes through rules.gd sort_cmp (JS sort is stable, Godot sort_custom is not)
#  - a key JS would write as undefined (dropped by JSON) is left out here too
# A change in src/core/battle.js must be made here too (battle.js carries the note).
extends RefCounted

const R_ := preload("res://scripts/rules.gd")
const Rng := preload("res://scripts/rng.gd")

const PRE := {"extraHit": 1, "spread": 1, "retarget": 1, "splitAll": 1}
const ARMOR_PCT := {"dmgPctArmor": 1, "burnPctArmor": 1}
const SRC_KINDS := {"armor": 1, "heal": 1, "buff": 1, "atkUp": 1, "perm": 1, "maxhp": 1, "cleanse": 1, "steal": 1, "cdCut": 1, "cdPct": 1, "reflectDebuff": 1, "revive": 1}
const RAND_N := {"allyRandom": 1, "allyRandom2": 2}
const AT_ROWS := ["front", "mid", "back"]

static func simulate(team_a: Array, team_b: Array, opts: Dictionary = {}) -> Dictionary:
	return new()._run(team_a, team_b, opts)

# ---------- JS behaviour helpers ----------
static func _t(v: Variant) -> bool:
	if v == null:
		return false
	match typeof(v):
		TYPE_BOOL: return v
		TYPE_INT: return v != 0
		TYPE_FLOAT: return v != 0.0 and not is_nan(v)
		TYPE_STRING: return v != ""
	return true

static func _n(d: Dictionary, k: String) -> float:
	var v: Variant = d.get(k)
	if v == null:
		return 0.0
	if v is bool:
		return 1.0 if v else 0.0
	return float(v)

static func armor_snap_skill(s: Dictionary) -> bool:
	if ARMOR_PCT.has(s.get("do")):
		return true
	var of: Variant = s.get("of")
	return of is Dictionary and of.get("stat") == "armor" and of.get("who") == "self"

static func _db_zero() -> Dictionary:
	return {"cd": 1.0, "armor": 0.0, "heal": 0.0, "burnT": 0.0, "shockT": 0.0, "dmgT": 0.0, "maxHp": 0.0}

static func _amp(p: Variant) -> float:
	return maxf(0.0, 1.0 + (float(p) if _t(p) else 0.0) / 100.0)

static func _by_front(a: Dictionary, b: Dictionary) -> float:
	return a.row - b.row if a.row != b.row else a.lane - b.lane

static func _by_hp(a: Dictionary, b: Dictionary) -> float:
	var d: float = a.hp - b.hp
	return d if d != 0.0 else _by_front(a, b)

static func _by_hp_pct(a: Dictionary, b: Dictionary) -> float:
	var d: float = a.hp / a.maxHp - b.hp / b.maxHp
	return d if d != 0.0 else _by_front(a, b)

static func _sort(arr: Array, cmp: Callable) -> Array:
	return R_.sort_cmp(arr, cmp)

static func _at(arr: Variant, i: int) -> Variant:
	return arr[i] if arr is Array and i >= 0 and i < arr.size() else null

# ---------- state ----------
var R: Dictionary
var DO: Dictionary
var opts: Dictionary
var log_on := true
var detail_on := false
var live_on := false
var events: Array = []
var t := 0.0
var mute_log := false
var d_cur: Variant = null
var d_from: Variant = null
var rule_tag: Variant = null
var live_last := {}
var share := {}  # burnShares: uid -> {from uid (or -1): amount}
var F: Array = []
var rngs: Array = []
var steps: Array = []
var revive_left: Array = []
var stand_mode := false
var BOSS: Variant = null
var BR := {}
var ovl := {"burn": 0.0, "shock": 0.0}
var shell_hits := 0.0
var shell_until := -1.0
var resist_worn := 0.0
var ph_idx := 0
var bars_gone := 0.0
var barT := 0.0
var moveT := 0.0
var enrageT := 0.0
var growT := 0.0
var auraT := 0.0
var shockT := 0.0
var silT := 0.0
var frzT := 0.0
var vanT := 0.0
var curseT := 0.0
var stunT := 0.0
var drainT := 0.0
var cdpT := 0.0
var shieldT := 0.0
var cleanT := 0.0
var mendT := 0.0
var curse_q: Variant = null
var plates := -1.0
var plateT := 0.0
var shell := -1.0
var shellT := 0.0
var rage := 0.0
var chain_n := 0.0
var storm_at := 0.0
var TICKSK := false
var Q := {"A": [], "D": [], "L": [], "S": [], "H": []}
var stage := "pre"
var restore_q: Array = []
var sub_hit := false
var hit_rules: Variant = null
var refl_q: Array = []
var rev_q: Array = []
var ini_stats := {}
var gains := {}
var eff_n := 0
var hit_n := 0
var aborted: Variant = null
var burn_dmg_on: Array = [0.0, 0.0]

# ---------- log ----------
func _bshare_see(k: String, d: Dictionary) -> void:
	if k == "burn":
		var to: int = d.to
		var m: Dictionary = share.get(to, {})
		share[to] = m
		var before: float = d.total - d.amount
		var tot := 0.0
		for v in m.values():
			tot += v
		if tot > 0.0:
			for s in m.keys():
				m[s] = m[s] * before / tot if before > 0.0 else 0.0
		var key: int = d.from if d.from != null else -1
		m[key] = m.get(key, 0.0) + d.amount
	elif k == "cleanse" and d.get("what") != "pct":
		share.erase(d.to)
	elif k == "down":
		share.erase(d.who)

func _bshare_split(uid: int) -> Array:
	var m: Variant = share.get(uid)
	var tot := 0.0
	if m != null:
		for v in m.values():
			tot += v
	if not (tot > 0.0):
		return [[-1, 1.0]]
	var out := []
	for s in m:
		if m[s] > 0.0:
			out.append([s, m[s] / tot])
	return out

func _log(k: String, d: Dictionary) -> void:
	if mute_log and k != "perm":
		return
	if k == "burn" or k == "cleanse" or k == "down":
		_bshare_see(k, d)
	if not log_on:
		return
	if detail_on and rule_tag != null and k != "proc" and k != "set" and k != "perm" and not d.has("r"):
		d = d.duplicate()
		d["r"] = rule_tag
	var e := {"t": t, "k": k}
	e.merge(d)
	if detail_on and d_cur != null and SRC_KINDS.has(k) and not d.has("d"):
		if not d.has("from"):
			e["from"] = d_from
		e["d"] = d_cur.duplicate()
	events.append(e)

func _snap_stats(f: Dictionary) -> Dictionary:
	return {"atk": _atk_of(f), "maxHp": f.maxHp, "multi": f.multi + f.multiBonus, "burnHit": f.burnHit, "shockHit": f.shockHit, "armorHit": f.armorHit,
		"healHit": f.healHit if _t(f.healHit) else 0.0, "cdMs": f.cdMs, "cdMult": f.cdMult, "hitAmp": f.hitAmp, "burnAmp": f.burnAmp, "shockAmp": f.shockAmp,
		"healAmp": f.healAmp, "armorAmp": f.armorAmp, "cdAmp": f.cdAmp, "healToAtk": f.healToAtk, "burnTaken": f.burnTaken, "shockTaken": f.shockTaken, "dmgTaken": f.dmgTakenAmp}

func _live_stat() -> void:
	for f in F:
		var now := _snap_stats(f)
		now["cd"] = _eff_cd(f)
		var old: Variant = live_last.get(f.uid)
		var ch := {}
		var any := false
		for k in now:
			if old == null or old[k] != now[k]:
				ch[k] = now[k]
				any = true
		if any:
			live_last[f.uid] = now
			events.append({"t": t, "k": "stat", "to": f.uid, "s": ch})

func _shell_off() -> bool:
	return BR.has("shellBreak") and t < shell_until

func _by_rule(id: String, fn: Callable) -> void:
	var o: Variant = rule_tag
	rule_tag = id
	fn.call()
	rule_tag = o

# ---------- fighters ----------
func _num(u: Dictionary, k: String) -> float:
	return _n(u, k)

func _mk_fighter(u: Dictionary, side: int) -> Dictionary:
	var skills := []
	var src_sk: Array = u.skills if u.get("skills") is Array else []
	for s0 in src_sk:
		var s: Dictionary = s0.duplicate()
		s["uses"] = 0.0
		s["cdLeft"] = _n(s0, "cd") if _t(s0.get("cd")) else 0.0
		skills.append(s)
	var tribes := [u.get("tribe")]
	if u.get("extraTribes") is Array:
		tribes.append_array(u.extraTribes)
	var boss := _t(u.get("boss"))
	var move := _t(u.get("move"))
	var slots: Variant = u.get("slots")
	return {"side": side, "id": u.get("id"), "name": u.get("name"), "row": u.get("row"), "lane": u.get("lane"), "level": u.get("level"),
		"hp": u.maxHp, "maxHp": u.maxHp, "atk": u.atk, "atkBonus": 0.0, "armor": 0.0, "startArmor": u.get("startArmor"),
		"burnHit": u.get("burnHit"), "shockHit": u.get("shockHit"), "armorHit": _num(u, "armorHit"), "healHit": _num(u, "healHit"), "multi": u.get("multi"), "multiBonus": 0.0,
		"cdMs": u.get("cdMs"), "cdMult": 1.0, "cdLeft": 0.0, "stunLeft": 0.0,
		"burn": 0.0, "shock": 0.0, "noDecay": 0.0, "noDecayPerm": false, "down": false, "sets": 0.0, "lowFired": false, "lastHitBy": null,
		"armorAmp": _num(u, "armorAmp"), "cdAmp": _num(u, "cdAmp"), "shockAmp": _num(u, "shockAmp"), "burnNoDecay": _t(u.get("burnNoDecay")), "frozen": 0.0,
		"shareArmor": _num(u, "shareArmor"), "shareTo": (u.shareTo.duplicate() if u.get("shareTo") is Dictionary else {}), "healToAtk": _num(u, "healToAtk"), "cdStart": _num(u, "cdStart"),
		"healAmp": _num(u, "healAmp"), "hitAmp": _num(u, "hitAmp"), "burnAmp": _num(u, "burnAmp"), "burnTaken": 0.0, "shockTaken": 0.0, "dmgTakenAmp": 0.0,
		"skills": skills, "dealt": 0.0, "taken": 0.0,
		"tribes": tribes, "tb": {}, "restoreLeft": 0.0, "restoreAmt": 0.0,
		"reflDebuff": [],
		"taunt": _t(u.get("taunt")), "avoidLeft": _num(u, "avoidLeft"), "downDmgPct": _num(u, "downDmgPct"), "bossDmgPct": _num(u, "bossDmgPct"),
		"lastStandDmg": _num(u, "lastStandDmg"), "lastStandCd": _num(u, "lastStandCd"), "shareTribePct": _num(u, "shareTribePct"), "shareTribeN": _num(u, "shareTribeN"),
		"linkSlot": u.get("linkSlot") if _t(u.get("linkSlot")) else null, "linkPct": _num(u, "linkPct"), "silenceUntil": 0.0, "avoidedAt": -1.0, "avoidedBy": null,
		"boss": boss, "bars": _num(u, "bars"), "barHp": _num(u, "barHp"), "db": _db_zero() if boss else null, "move": move, "moveSec": _num(u, "moveSec"),
		"cells": ([slots[0]] if move else slots.duplicate()) if boss else null, "slots": slots.duplicate() if boss else null, "phases": u.get("phases") if _t(u.get("phases")) else null,
		# fields JS adds later (undefined there): same falsy start value
		"uid": -1, "noHitUntil": 0.0, "weakUntil": 0.0, "barBreak": false, "armorTick": null, "burst": 0.0, "armorBaseHp": 0.0,
		"hitAmpT": 0.0, "shockAmpT": 0.0, "summoned": false, "replaced": false, "cd0": 0.0}

func _rng(side: int) -> Variant:
	return rngs[side]

func _team_hash(side: int) -> int:
	var h := 2166136261
	for f in F:
		if f.side == side:
			var s: String = _js_str(f.id) + _js_str(f.level) + _js_str(f.row) + _js_str(f.lane)
			for i in s.length():
				h = (Rng.imul(h ^ s.unicode_at(i), 16777619) + 1) & Rng.M32
	return h

static func _js_str(v: Variant) -> String:
	if v == null:
		return "undefined"
	if v is float and v == floorf(v) and absf(v) < 1e15:
		return str(int(v))
	return str(v)

# ---------- helpers ----------
func _up(f: Dictionary) -> bool:
	return not f.down and (stand_mode or (f.hp > 0.0 and not f.barBreak))

func _enemies(f: Dictionary) -> Array:
	return F.filter(func(x): return x.side != f.side and _up(x))

func _allies(f: Dictionary) -> Array:
	return F.filter(func(x): return x.side == f.side and _up(x))

func _pick_n(list: Array, n: float, side: int) -> Array:
	var r: Variant = _rng(side)
	var l := list.duplicate()
	var out := []
	while l.size() > 0 and out.size() < n:
		out.append(l.pop_at(int(floorf(r.next() * l.size()))))
	return out

func _in_lane(f: Dictionary, lane: Variant) -> bool:
	if f.cells != null:
		for i in f.cells:
			if float(int(i) & 1) == float(lane):
				return true
		return false
	return f.lane == lane

func _in_row(f: Dictionary, row: Variant) -> bool:
	if f.cells != null:
		for i in f.cells:
			if float(int(i) >> 1) == float(row):
				return true
		return false
	return f.row == row

func _hittable(f: Dictionary) -> bool:
	return not (f.boss and f.noHitUntil > t)

func _foes(f: Dictionary) -> Array:
	return _enemies(f).filter(func(x): return _hittable(x))

func _alone(f: Dictionary) -> bool:
	return _allies(f).size() == 1

func _side_down(side: int) -> bool:
	for x in F:
		if x.side == side and x.down:
			return true
	return false

func _hit_amp_of(f: Dictionary) -> float:
	return f.hitAmp + (f.downDmgPct if _t(f.downDmgPct) and _side_down(f.side) else 0.0) + (f.lastStandDmg if _t(f.lastStandDmg) and _alone(f) else 0.0)

func _cd_extra(f: Dictionary) -> float:
	var m := 1.0
	if _t(f.lastStandCd) and _alone(f):
		m *= maxf(0.1, 1.0 - f.lastStandCd / 100.0)
	if BOSS != null:
		if f.boss and BR.has("fastAtk"):
			m *= maxf(0.1, 1.0 - BR.fastAtk.v / 100.0)
		if not f.boss and BR.has("cdSlow"):
			m *= 1.0 + BR.cdSlow.v / 100.0
	return m

func _ot_k() -> float:
	return floorf((t - storm_at) / R.stormIntervalMs) if t > storm_at else 0.0

func _ot_tot(k: float) -> float:
	var P := maxf(1.0, R_.js_round(R.stormStepMs / R.stormIntervalMs))
	return minf(k, P) * R.stormPct1 + minf(maxf(k - P, 0.0), P) * R.stormPct2 + maxf(k - 2.0 * P, 0.0) * R.stormPct3

func _ot_up() -> float:
	return _ot_tot(_ot_k())

func _ot_cut() -> float:
	return minf(100.0, _ot_tot(_ot_k()))

func _eff_cd(f: Dictionary) -> float:
	return maxf(R.minCooldownMs, R_.js_round(f.cdMs * f.cdMult * _cd_extra(f)))

func _atk_of(f: Dictionary) -> float:
	var a: float = f.atk + f.atkBonus
	if BOSS == null or not f.boss:
		return a
	return R_.up_mul(a, (1.0 + BR.atkUp.v / 100.0 if BR.has("atkUp") else 1.0) * (2.0 if BR.has("desperate") else 1.0) * (1.0 + rage * BR.rage.v2 / 100.0 if BR.has("rage") and rage > 0.0 else 1.0))

func _silenced(f: Dictionary) -> bool:
	return BOSS != null and not f.boss and ((BR.has("backSilence") and f.row == 2.0 and t <= BR.backSilence.v * 1000.0) or f.silenceUntil > t)

func _boss_cap() -> float:
	return minf(minf(BOSS.maxHp, (BOSS.bars - bars_gone) * BOSS.barHp), ceilf(maxf(0.0, BOSS.hp) / BOSS.barHp) * BOSS.barHp)

func _boss_heal(v: float) -> void:
	v = floorf(v)
	if not (v > 0.0) or not _up(BOSS):
		return
	var h := minf(v, _boss_cap() - BOSS.hp)
	if h > 0.0:
		BOSS.hp += h
		_log("heal", {"to": BOSS.uid, "amount": h})

func _normal_target(f: Dictionary) -> Variant:
	var es := _foes(f)
	if BOSS != null and f.boss:
		if BR.has("hunter"):
			var s := _sort(es, _by_hp)
			return s[0] if s.size() > 0 else null
		if BR.has("backStrike"):
			var bk := _sort(es.filter(func(e): return e.row == 2.0), _by_front)
			if bk.size() > 0:
				return bk[0]
	var pull := _sort(es.filter(func(e): return e.taunt), _by_front)
	if pull.size() > 0:
		return pull[0]
	var same := _sort(es.filter(func(e): return _in_lane(e, f.lane)), _by_front)
	if same.size() > 0:
		return same[0]
	es = _sort(es, _by_front)
	return es[0] if es.size() > 0 else null

func _back_target(f: Dictionary) -> Variant:
	for e in _foes(f).filter(func(e): return _in_row(e, 2)):
		if _in_lane(e, f.lane):
			return e
	return null

func _lowest_enemy(f: Dictionary) -> Variant:
	var s := _sort(_foes(f), _by_hp)
	return s[0] if s.size() > 0 else null

static func _shares_tribe(x: Dictionary, u: Dictionary) -> bool:
	for tr in x.tribes:
		if u.tribes.has(tr):
			return true
	return false

static func _at_match(at: Dictionary, my_row: float, my_lane: float, row: float, lane: float) -> bool:
	return R_.at_match(at, my_row, my_lane, row, lane)

func _skill_targets_of(u: Dictionary, s: Dictionary, ctx: Dictionary) -> Array:
	if s.get("to") == "self" and _t(s.get("perm")) and u.down and is_same(ctx.get("downed"), u):
		return [u]
	if RAND_N.has(s.get("to")) and (_t(s.get("sameTribe")) or _t(s.get("skipSameId"))):
		var pool := _allies(u).filter(func(x): return not is_same(x, u))
		if _t(s.get("sameTribe")):
			pool = pool.filter(func(x): return _shares_tribe(x, u))
		if _t(s.get("skipSameId")):
			pool = pool.filter(func(x): return x.id != u.id)
		return _pick_n(pool, RAND_N[s.to], u.side)
	var r: Array
	if s.get("to") == "allyAt":
		r = _sort(_allies(u).filter(func(x): return not is_same(x, u) and _at_match(s.at, u.row, u.lane, x.row, x.lane)), _by_front) if _t(s.get("at")) else []
	else:
		r = _targets_of(u, s.get("to"), ctx)
	if _t(s.get("sameTribe")):
		r = r.filter(func(x): return is_same(x, u) or _shares_tribe(x, u))
	if _t(s.get("skipSameId")):
		r = r.filter(func(x): return is_same(x, u) or x.id != u.id)
	return r

func _targets_of(f: Dictionary, to: Variant, ctx: Dictionary) -> Array:
	var al := _allies(f)
	var others := al.filter(func(x): return not is_same(x, f))
	match to:
		"self": return [f] if _up(f) else []
		"target":
			var x: Variant = ctx.get("target")
			return [x] if x != null and not x.down else []
		"attacker":
			var x: Variant = ctx.get("attacker")
			return [x] if x != null and not x.down else []
		"enemyFront":
			var x: Variant = _normal_target(f)
			return [x] if x != null else []
		"enemyBackRow":
			var x: Variant = _back_target(f)
			return [x] if x != null else []
		"enemyLane": return _sort(_foes(f).filter(func(e): return _in_lane(e, f.lane)), _by_front)
		"enemyFrontRow": return _sort(_foes(f).filter(func(e): return _in_row(e, 0)), _by_front)
		"enemyMidRow": return _foes(f).filter(func(e): return _in_lane(e, f.lane) and _in_row(e, 1))
		"lowestHp":
			var x: Variant = _lowest_enemy(f)
			return [x] if x != null else []
		"enemyRandom": return _pick_n(_foes(f), 1, f.side)
		"allEnemies": return _foes(f)
		"frontAlly": return others.filter(func(x): return x.lane == f.lane and x.row == f.row - 1.0)
		"backAlly": return others.filter(func(x): return x.lane == f.lane and x.row == f.row + 1.0)
		"frontBackAlly": return others.filter(func(x): return x.lane == f.lane and absf(x.row - f.row) == 1.0)
		"frontLaneAlly": return others.filter(func(x): return x.lane == f.lane and x.row == 0.0)
		"backLaneAlly": return _sort(others.filter(func(x): return x.lane == f.lane and x.row > f.row), _by_front).slice(0, 1)
		"frontRowAllies": return others.filter(func(x): return x.row == 0.0)
		"backRowAllies": return others.filter(func(x): return x.row == 2.0)
		"allyLowest": return _sort(al, _by_hp_pct).slice(0, 1)
		"allyRandom": return _pick_n(others, 1, f.side)
		"allyRandom2": return _pick_n(others, 2, f.side)
		"tribeAllies": return others.filter(func(x): return _shares_tribe(x, f))
		"allAllies": return al
	return []

# ---------- queue ----------
func _enqueue(u: Dictionary, s: Dictionary, ctx: Dictionary) -> void:
	var ph: float = DO[s["do"]].phase
	var c := ctx
	if stage == "damage" and armor_snap_skill(s):
		c = ctx.duplicate()
		c["armorSnap"] = u.armorTick if u.armorTick != null else u.armor
	var item := {"u": u, "s": s, "ctx": c}
	if ph == 0.0:
		(Q.L if stage == "damage" else Q.A).append(item)
	elif ph == 1.0:
		Q.D.append(item)
	elif ph == 3.0:
		Q.H.append(item)
	else:
		Q.S.append(item)

static func _usable(s: Dictionary) -> bool:
	return not (_n(s, "cd") > 0.0 and s.cdLeft > 0.0)

func _fire(u: Dictionary, s: Dictionary, when: String) -> void:
	s.uses += 1.0
	if _n(s, "cd") > 0.0:
		if _n(s, "cdGrow") > 0.0:
			s["cdNow"] = minf(3600000.0, R_.js_round((s.cdNow if _t(s.get("cdNow")) else float(s.cd)) * (1.0 + s.cdGrow / 100.0)))
		s.cdLeft = s.cdNow if _t(s.get("cdNow")) else float(s.cd)
	var d := {"who": u.uid, "what": s["do"], "when": when}
	if s.has("idx"):
		d["si"] = s.idx
	_log("proc", d)

func _trigger(u: Dictionary, when: String, ctx: Dictionary, filter: Variant = null) -> void:
	if BOSS != null and when != "passive" and when != "matchStart" and _silenced(u):
		return
	for s in u.skills:
		if s.get("when") != when or not _usable(s) or (filter != null and not filter.call(s)):
			continue
		var dd: String = s["do"]
		if dd == "allyStrike" and _t(ctx.get("carried")):
			continue
		if dd == "revive" or dd == "reviveAlly" or dd == "summon":
			continue
		if s.get("chance") != null and s.chance < 100.0 and _rng(u.side).next() * 100.0 >= s.chance:
			continue
		_fire(u, s, when)
		if PRE.has(dd):
			_apply_pre(u, s, ctx)
			continue
		if dd == "allyStrike":
			_carry_hit(u, s, ctx)
			continue
		_enqueue(u, s, ctx)

func _apply_pre(u: Dictionary, s: Dictionary, plan: Dictionary) -> void:
	match s["do"]:
		"extraHit": plan.hits += s.value
		"spread": plan["spread"] = true
		"splitAll": plan["split"] = true
		"retarget":
			var xs := _targets_of(u, s.get("to"), plan)
			if xs.size() > 0 and xs[0] != null:
				plan["target"] = xs[0]

# ---------- damage ----------
func _rule_dmg(target: Dictionary, amount: float, src: Variant, why: String) -> float:
	var rr: Variant = [] if detail_on else null
	hit_rules = null
	if target.boss:
		if not _hittable(target) and why != "burn" and why != "storm":
			return _block(target, src, why, "vanish" if BOSS.noHitUntil > t and BR.has("vanish") else "untargetable")
		if src != null and not src.boss:
			if BR.has("frontOnly") and src.row != 0.0:
				return _block(target, src, why, "frontOnly")
			if BR.has("backOnly") and src.row != 2.0:
				return _block(target, src, why, "backOnly")
			if BR.has("minHit") and amount < BR.minHit.v:
				return _block(target, src, why, "minHit")
			if _t(src.bossDmgPct):
				amount *= 1.0 + src.bossDmgPct / 100.0
			if BR.has("tribeWeak") and src.tribes.has(BR.tribeWeak.tribe):
				amount *= 1.0 + BR.tribeWeak.v / 100.0
				if rr != null: rr.append("tribeWeak")
			if BR.has("tribeResist") and src.tribes.has(BR.tribeResist.tribe):
				var rv := maxf(0.0, BR.tribeResist.v - resist_worn)
				if rv > 0.0:
					amount *= 1.0 - rv / 100.0
					if rr != null: rr.append("tribeResist")
					if BR.has("resistWear") and why == "hit":
						resist_worn += BR.resistWear.v
			if BR.has("shellBreak") and why == "hit" and t >= shell_until:
				shell_hits += 1.0
				if shell_hits >= BR.shellBreak.v:
					shell_hits = 0.0
					shell_until = t + BR.shellBreak.v2 * 1000.0
					if detail_on:
						_log("shellBreak", {"who": target.uid, "until": shell_until})
			if BR.has("plating") and why == "hit" and plates > 0.0:
				amount *= maxf(0.0, 1.0 - plates * BR.plating.v2 / 100.0)
				if rr != null: rr.append("plating")
			if BR.has("galeGuard") and (why == "hit" or why == "skill" or why == "downSkill") and amount < BOSS.barHp * BR.galeGuard.v / 100.0:
				amount *= maxf(0.0, 1.0 - BR.galeGuard.v2 / 100.0)
				if rr != null: rr.append("galeGuard")
		if BR.has("flameShell") and shell > 0.0 and why != "execute":
			amount *= maxf(0.0, 1.0 - shell * BR.flameShell.v2 / 100.0)
			if rr != null: rr.append("flameShell")
			if src != null and not src.boss and why == "hit":
				shell -= 1.0
				if detail_on:
					_log("flameShell", {"who": target.uid, "left": shell})
		if BR.has("desperate"):
			amount *= 1.0 + BR.desperate.v / 100.0
			if rr != null: rr.append("desperate")
		if BR.has("weakSpot") and target.weakUntil > t:
			amount *= 1.0 + BR.weakSpot.v / 100.0
			if rr != null: rr.append("weakSpot")
		if BR.has("hitCap") and amount > BOSS.barHp * BR.hitCap.v / 100.0:
			amount = BOSS.barHp * BR.hitCap.v / 100.0
			if rr != null: rr.append("hitCap")
	else:
		if rr != null and src != null and src.boss and why == "hit":
			for id in ["atkUp", "desperate", "aoe", "pierce"]:
				if BR.has(id):
					rr.append(id)
		if BR.has("frontBreak") and target.row == 0.0:
			amount *= 1.0 + BR.frontBreak.v / 100.0
			if rr != null: rr.append("frontBreak")
	if rr != null and rr.size() > 0:
		hit_rules = rr
	return floorf(amount)

func _block(target: Dictionary, src: Variant, why: String, id: String) -> float:
	if detail_on:
		_log("ruleBlock", {"to": target.uid, "from": src.uid if src != null else null, "why": why, "rule": id})
	return 0.0

func _hurt(target: Dictionary, amount: float, src: Variant, pierce: bool, why: String, det: Variant = null) -> float:
	amount = floorf(amount)
	if BOSS != null:
		amount = _rule_dmg(target, amount, src, why)
	if why != "link" and why != "burn" and storm_at < t:
		var o := _ot_up()
		if o > 0.0:
			amount = R_.up_mul(amount, 1.0 + o / 100.0)
	if amount <= 0.0 or target.down or target.barBreak:
		return 0.0
	if target.linkPct > 0.0 and why != "link":
		var p: Variant = null
		for x in F:
			if x.side == target.side and not is_same(x, target) and x.row == target.linkSlot[0] and x.lane == target.linkSlot[1]:
				p = x
				break
		if p != null and _up(p):
			var sh := floorf(amount * target.linkPct / 100.0)
			if sh > 0.0:
				_hurt(p, sh, src, pierce, "link", det)
				amount -= sh
				if amount <= 0.0:
					return 0.0
	if target.avoidLeft > 0.0 and (why == "hit" or why == "shock") and (amount if pierce else maxf(0.0, amount - target.armor)) >= target.hp:
		target.avoidLeft -= 1.0
		target.avoidedAt = t
		target.avoidedBy = src
		_log("avoid", {"to": target.uid, "from": src.uid if src != null else null})
		return 0.0
	var absorbed := 0.0
	if not pierce and target.armor > 0.0:
		var before: float = target.armor
		absorbed = minf(before, amount)
		target.armor = before - absorbed
		if target.armor == 0.0:
			if target.restoreLeft > 0.0:
				target.restoreLeft -= 1.0
				restore_q.append(target)
			_trigger(target, "armorBreak", {"amount": before, "attacker": src if src != null and src.side != target.side else null})
	var loss := amount - absorbed
	if target.boss and target.bars > 1.0 and loss > 0.0:
		var left: float = target.hp - (minf(target.bars, ceilf(target.hp / target.barHp)) - 1.0) * target.barHp
		if loss > left:
			loss = maxf(0.0, left)
			amount = absorbed + loss
	var was_above: bool = target.hp * 2.0 >= target.maxHp
	target.hp -= loss
	if target.boss and target.bars > 1.0 and loss > 0.0 and target.hp > 0.0 and target.hp <= (target.bars - 1.0) * target.barHp and fmod(target.hp, target.barHp) == 0.0:
		target.barBreak = true
	target.taken += amount
	if src != null:
		src.dealt += amount
	if BOSS != null and target.boss and amount > 0.0:
		if BR.has("lifesteal"):
			var v: float = amount * BR.lifesteal.v / 100.0
			_by_rule("lifesteal", func(): _boss_heal(v))
		if BR.has("thorns") and src != null and not src.boss and why == "hit" and _up(src):
			Q.D.append({"u": target, "s": {"do": "dmg", "to": "attacker", "value": BR.thorns.v, "why": "reflect", "r": "thorns"}, "ctx": {"attacker": src}})
		if src != null and not src.boss and why == "hit":
			if BR.has("rage") and rage < BR.rage.v3 and amount >= BOSS.barHp * BR.rage.v / 100.0:
				rage += 1.0
				if detail_on:
					_log("rage", {"who": target.uid, "stacks": rage})
			if BR.has("staticChain") and _up(src):
				chain_n += 1.0
				if chain_n >= BR.staticChain.v:
					chain_n = 0.0
					Q.S.append({"u": target, "s": {"do": "shock", "to": "attacker", "value": BR.staticChain.v2, "why": "chain", "r": "staticChain"}, "ctx": {"attacker": src}})
		if BR.has("reflect") and not _shell_off() and src != null and not src.boss and why != "reflect" and _up(src):
			Q.D.append({"u": target, "s": {"do": "dmg", "to": "attacker", "value": floorf(amount * BR.reflect.v / 100.0), "why": "reflect", "r": "reflect"}, "ctx": {"attacker": src}})
	target.lastHitBy = src if src != null and src.side != target.side else null
	var ev := {"to": target.uid, "from": src.uid if src != null else null, "amount": amount, "absorbed": absorbed, "why": why}
	if sub_hit and why == "hit":
		ev["sub"] = 1
	if detail_on:
		var dd: Dictionary = d_cur.duplicate() if d_cur != null else {}
		if det != null:
			dd.merge(det, true)
		if target.hp < 0.0:
			dd["over"] = minf(loss, -target.hp)
		if hit_rules != null:
			ev["rr"] = hit_rules
		ev["d"] = dd
	_log("dmg", ev)
	if not target.lowFired and was_above and target.hp > 0.0 and target.hp * 100.0 < target.maxHp * R.lowHpPct:
		target.lowFired = true
		_trigger(target, "lowHp", {"attacker": src if src != null and src.side != target.side else null})
	return absorbed

func _add_armor(f: Dictionary, v: float, why: Variant) -> void:
	v = R_.up_mul(v, _amp(f.armorAmp))
	if BOSS != null and not f.boss:
		if BR.has("noArmor") and not _shell_off():
			return
		if BR.has("armorCut") and not _shell_off():
			v = floorf(v * maxf(0.0, 1.0 - BR.armorCut.v / 100.0))
	if why != "share":
		var o := _ot_cut()
		if o > 0.0:
			v = floorf(v * maxf(0.0, 1.0 - o / 100.0))
	if not (v > 0.0 and _up(f)):
		return
	f.armor += v
	if detail_on and BOSS != null and not f.boss and BR.has("armorCut") and not _shell_off():
		_log("armor", {"to": f.uid, "amount": v, "why": why, "rr": ["armorCut"]})
	else:
		_log("armor", {"to": f.uid, "amount": v, "why": why})
	if why != "share":
		if f.shareArmor > 0.0:
			for x in _allies(f):
				if not is_same(x, f):
					_add_armor(x, v * f.shareArmor / 100.0, "share")
		for to in f.shareTo:
			var pct: float = f.shareTo[to]
			if pct > 0.0:
				for x in _targets_of(f, to, {}):
					if not is_same(x, f):
						_add_armor(x, v * pct / 100.0, "share")
		if f.shareTribePct > 0.0:
			for x in _pick_n(_allies(f).filter(func(x): return not is_same(x, f) and _shares_tribe(x, f)), f.shareTribeN, f.side):
				_add_armor(x, v * f.shareTribePct / 100.0, "share")

func _add_status(f: Dictionary, kind: String, v: float, why: Variant, src: Variant, credit: Variant = null) -> void:
	if kind == "burn" and src != null and src.side != f.side and _t(src.burnAmp):
		v *= _amp(src.burnAmp)
	v = floorf(v)
	if v <= 0.0 or f.down:
		return
	var by: Variant = src if src != null else credit
	if why == "chain" and f.armor > 0.0:
		var a := minf(f.armor, v)
		f.armor -= a
		v -= a
		_log("chainAbsorb", {"to": f.uid, "amount": a})
		if v <= 0.0:
			return
	var imm: Variant = null
	if BOSS != null and f.boss:
		imm = BR.get("burnImmune") if kind == "burn" else (BR.get("shockImmune") if kind == "shock" else null)
	if imm != null:
		var kept := floorf(v * maxf(0.0, 1.0 - imm.v / 100.0))
		var ov: Variant = BR.get("burnOverload") if kind == "burn" else BR.get("shockOverload")
		if ov != null:
			ovl[kind] += v - kept
			v = kept
			if ovl[kind] >= ov.v:
				v += ovl[kind]
				if detail_on:
					_log("overload", {"who": f.uid, "kind": kind, "amount": ovl[kind]})
				ovl[kind] = 0.0
		else:
			v = kept
		if v <= 0.0:
			if detail_on:
				_log("ruleBlock", {"to": f.uid, "from": by.uid if by != null else null, "why": kind, "rule": imm.id})
			return
	f[kind] += v
	var ev := {"to": f.uid, "amount": v, "total": f[kind], "why": why, "from": by.uid if by != null else null}
	if imm != null and detail_on:
		ev["rr"] = [imm.id]
	_log(kind, ev)
	if kind == "shock" and BOSS != null and f.boss and BR.has("plating") and plates > 0.0:
		plates -= 1.0
		if detail_on:
			_log("plating", {"who": f.uid, "left": plates})
	if kind == "burn" and src != null and src.burnNoDecay:
		f.noDecayPerm = true
	if why != "reflect" and src != null and src.side != f.side:
		_reflect_back(f, src, kind, v)

func _reflect_back(f: Dictionary, src: Dictionary, kind: String, v: float) -> void:
	if f.reflDebuff.is_empty() or not _up(src):
		return
	var p := 0.0
	var by := []
	for r in f.reflDebuff:
		if _up(r.by):
			p += r.pct
			by.append({"u": r.by, "si": r.si})
	var cap: Variant = R.get("reflectDebuffMaxPct")
	p = minf(100.0 if cap == null else float(cap), p)
	if not (p > 0.0):
		return
	if kind == "cdSlowPct":
		refl_q.append({"src": src, "from": f, "kind": kind, "amount": v * p / 100.0, "by": by})
	else:
		var n := floorf(v * p / 100.0)
		if n > 0.0:
			refl_q.append({"src": src, "from": f, "kind": kind, "amount": n, "by": by})

func _flush_revive() -> void:
	var list := rev_q
	rev_q = []
	for it in list:
		var u: Dictionary = it.u
		var s: Dictionary = it.s
		if not _up(u):
			continue
		var pool := F.filter(func(x): return x.side == u.side and x.down and not x.summoned and not x.replaced and (not _t(s.get("sameTribe")) or _shares_tribe(x, u)))
		for x in _pick_n(pool, it.v, u.side):
			x.down = false
			x.lastHitBy = null
			_revive_unit(x, R.reviveAllyHpPct, "ally", u, s)

func _flush_refl() -> void:
	while refl_q.size() > 0:
		var list := refl_q
		refl_q = []
		for it in list:
			var src: Dictionary = it.src
			if src.down:
				continue
			var g: Dictionary = it.by[0]
			var ev := {"to": src.uid, "from": g.u.uid, "kind": it.kind, "amount": it.amount}
			if detail_on:
				ev["ally"] = it.from.uid
				ev["si"] = g.si
			_log("reflectDebuff", ev)
			if it.kind == "cdSlowPct":
				src.cdMult *= 1.0 + it.amount / 100.0
				if src.db != null:
					src.db.cd *= 1.0 + it.amount / 100.0
				_buff(src, "cdSlowPct", it.amount)
			else:
				_add_status(src, it.kind, it.amount, "reflect", null, g.u)

func _cut_cd(f: Dictionary, ms: float) -> void:
	if _up(f):
		ms = R_.up_mul(ms, 1.0 + f.cdAmp / 100.0)
		f.cdLeft = maxf(0.0, f.cdLeft - ms)
		_log("cdCut", {"to": f.uid, "ms": ms})

func _heal(f: Dictionary, v: float, src: Variant, why: Variant = null) -> void:
	v = R_.up_mul(v, _amp(f.healAmp))
	if BOSS != null and not f.boss and BR.has("healCut"):
		v = floorf(v * maxf(0.0, 1.0 - BR.healCut.v / 100.0))
	var o := _ot_cut()
	if o > 0.0:
		v = floorf(v * maxf(0.0, 1.0 - o / 100.0))
	if not _up(f) or v <= 0.0:
		return
	var h := minf(v, (_boss_cap() if BOSS != null and f.boss else float(f.maxHp)) - f.hp)
	if h > 0.0:
		f.hp += h
		var ev := {"to": f.uid, "amount": h}
		if detail_on:
			if _t(why):
				ev["why"] = why
			if BOSS != null and not f.boss and BR.has("healCut"):
				ev["rr"] = ["healCut"]
		_log("heal", ev)
		if src != null and src.healToAtk > 0.0 and _up(src):
			var a := R_.up_gain(h, src.healToAtk)
			if a > 0.0:
				src.atkBonus += a
				_log("atkUp", {"to": src.uid, "amount": a})
		if BOSS != null and not f.boss and BR.has("rage") and rage > 0.0:
			rage -= 1.0
			if detail_on:
				_log("rage", {"who": BOSS.uid, "stacks": rage})

func _buff(x: Dictionary, what: String, amount: float) -> void:
	_log("buff", {"to": x.uid, "what": what, "amount": amount})

func _stat_note(x: Dictionary, what: String, amount: float) -> void:
	if detail_on:
		_log("buff", {"to": x.uid, "what": what, "amount": amount, "dx": 1})

func _stat(st: String, f: Dictionary, me: Dictionary, ctx: Dictionary) -> float:
	match st:
		"atk": return _atk_of(f)
		"armor": return ctx.armorSnap if is_same(f, me) and ctx.get("armorSnap") != null else float(f.armor)
		"maxHp": return f.maxHp
		"hp": return maxf(0.0, f.hp)
		"hpLost": return maxf(0.0, f.maxHp - maxf(0.0, f.hp))
		"burn": return f.burn
		"shock": return f.shock
		"healHit": return f.healHit if _t(f.healHit) else 0.0
	return 0.0

const STATS := {"atk": 1, "armor": 1, "maxHp": 1, "hp": 1, "hpLost": 1, "burn": 1, "shock": 1, "healHit": 1}

func _of_val(u: Dictionary, s: Dictionary, x: Variant, ctx: Dictionary) -> float:
	var of: Variant = s.get("of")
	var st: Variant = of.get("stat") if of is Dictionary else null
	if not STATS.has(st):
		return 0.0
	var who: Variant = of.get("who")
	var one := func(f: Variant) -> float: return _stat(st, f, u, ctx) if f != null else 0.0
	if who == "self": return one.call(u)
	if who == "each": return one.call(x)
	if who == "ctx": return one.call(ctx.get("target") if ctx.get("target") != null else ctx.get("attacker"))
	var list: Variant = null
	if who == "allEnemies": list = _enemies(u)
	elif who == "allAllies": list = _allies(u)
	elif who == "laneEnemies": list = _enemies(u).filter(func(f): return _in_lane(f, u.lane))
	elif who == "rowEnemies": list = _enemies(u).filter(func(f): return _in_row(f, u.row))
	elif who == "laneAllies": list = _allies(u).filter(func(f): return f.lane == u.lane)
	elif who == "rowAllies": list = _allies(u).filter(func(f): return f.row == u.row)
	if list == null:
		return 0.0
	var a := 0.0
	for f in list:
		a += one.call(f)
	return a

func _perm_rec(u: Dictionary, s: Dictionary, x: Variant, amount: float, key: Variant = "__default") -> void:
	if key is String and key == "__default":
		key = DO[s["do"]].get("perm")
	amount = floorf(amount)
	if not _t(s.get("perm")) or not _t(key) or not (amount > 0.0) or x == null or x.side != u.side or x.summoned:
		return
	var k := "%d:%s:%s:%s:%s" % [x.side, _js_str(x.row), _js_str(x.lane), str(x.id), key]
	var g: Dictionary = gains.get(k, {"side": x.side, "row": x.row, "lane": x.lane, "id": x.id, "key": key, "amount": 0.0})
	g.amount += amount
	gains[k] = g
	_log("perm", {"to": x.uid, "key": key, "amount": amount})

# ---------- apply ----------
func _apply(it: Dictionary) -> void:
	var u: Dictionary = it.u
	if not (u.down and is_same(it.ctx.get("downed"), u) and _t(it.s.get("perm")) and it.s.get("to") == "self"):
		_apply_d(it)
		return
	var keep := u.duplicate()
	mute_log = true
	_apply_d(it)
	mute_log = false
	for k in keep:
		u[k] = keep[k]

func _apply_d(it: Dictionary) -> void:
	if not detail_on:
		_apply0(it.u, it.s, it.ctx)
		return
	var s: Dictionary = it.s
	var prev: Variant = d_cur
	var prev_from: Variant = d_from
	var nd := {"si": s.get("idx"), "what": s["do"]}
	if _t(s.get("src")):
		nd["src"] = s.src
	if s.get("why") == "tribe":
		nd["src"] = "tribe"
	d_cur = nd
	d_from = it.u.uid
	var prev_tag: Variant = rule_tag
	rule_tag = s.get("r") if _t(s.get("r")) else null
	_apply0(it.u, it.s, it.ctx)
	d_cur = prev
	d_from = prev_from
	rule_tag = prev_tag

func _apply0(u: Dictionary, s: Dictionary, ctx: Dictionary) -> void:
	var v: float = _n(s, "value") if s.get("value") != null else 0.0
	var why: Variant = s.get("why") if _t(s.get("why")) else u.id
	var dwhy: String = s.get("why") if _t(s.get("why")) else ("downSkill" if _t(ctx.get("downed")) else "skill")
	var dd: String = s["do"]
	match dd:
		"armor":
			for x in _skill_targets_of(u, s, ctx):
				_add_armor(x, v, why)
				_perm_rec(u, s, x, v)
		"armorPct":
			for x in _skill_targets_of(u, s, ctx):
				_add_armor(x, x.maxHp * v / 100.0, why)
				_perm_rec(u, s, x, x.maxHp * v / 100.0)
		"heal":
			for x in _skill_targets_of(u, s, ctx):
				_heal(x, v, u, why)
				_perm_rec(u, s, x, v)
		"healPct":
			for x in _skill_targets_of(u, s, ctx):
				_heal(x, x.maxHp * v / 100.0, u)
				_perm_rec(u, s, x, x.maxHp * v / 100.0)
		"lifesteal":
			if _n(ctx, "dealt") > 0.0:
				_heal(u, ctx.dealt * v / 100.0, u)
				_perm_rec(u, s, u, ctx.dealt * v / 100.0)
		"dmgPctArmor":
			for x in _skill_targets_of(u, s, ctx):
				_hurt(x, (ctx.armorSnap if ctx.get("armorSnap") != null else float(u.armor)) * v / 100.0, u, false, dwhy)
		"dmgPctEnemyBurn":
			var sum := 0.0
			for e in _enemies(u):
				sum += e.burn
			for x in _skill_targets_of(u, s, ctx):
				_hurt(x, sum * v / 100.0, u, false, dwhy)
		"execute":
			for x in _skill_targets_of(u, s, ctx):
				if _up(x):
					_hurt(x, x.hp, u, true, "execute")
		"selfKo":
			if _up(u):
				_hurt(u, u.hp, null, true, "execute")
		"burnPctArmor":
			for x in _skill_targets_of(u, s, ctx):
				_add_status(x, "burn", (ctx.armorSnap if ctx.get("armorSnap") != null else float(u.armor)) * v / 100.0, why, u)
		"maxHpCut":
			for x in _skill_targets_of(u, s, ctx):
				if _up(x):
					var cut := floorf(x.maxHp * v / 100.0)
					if cut <= 0.0:
						continue
					var was: float = x.maxHp
					x.maxHp = maxf(1.0, x.maxHp - cut)
					x.hp = minf(x.hp, x.maxHp)
					if x.db != null:
						x.db.maxHp += was - x.maxHp
					_log("maxhp", {"to": x.uid, "amount": cut, "maxHp": x.maxHp, "hp": x.hp})
		"cleanse":
			for x in _skill_targets_of(u, s, ctx):
				if _up(x):
					x.burn = 0.0
					x.shock = 0.0
					x.noDecay = 0.0
					x.noDecayPerm = false
					x.stunLeft = 0.0
					if x.frozen > 0.0:
						x.cdLeft = maxf(0.0, x.cdLeft - x.frozen)
						x.frozen = 0.0
					_log("cleanse", {"to": x.uid})
		"cleansePct":
			for x in _skill_targets_of(u, s, ctx):
				if _up(x) and (x.burn > 0.0 or x.shock > 0.0):
					var b := floorf(x.burn * v / 100.0)
					var k := floorf(x.shock * v / 100.0)
					if b <= 0.0 and k <= 0.0:
						continue
					x.burn -= b
					x.shock -= k
					if x.burn == 0.0:
						x.noDecay = 0.0
						x.noDecayPerm = false
					_log("cleanse", {"to": x.uid, "what": "pct", "burn": x.burn, "shock": x.shock, "cut": [b, k]})
		"reviveDowned":
			if _up(u):
				rev_q.append({"u": u, "v": v, "s": s})
		"reflectDebuff":
			for x in _skill_targets_of(u, s, ctx):
				x.reflDebuff.append({"by": u, "pct": v, "si": s.get("idx")})
				_buff(x, "reflectDebuff", v)
		"eatAllyBurn":
			var sum := 0.0
			for x in _allies(u):
				if x.burn > 0.0:
					sum += x.burn
					x.burn = 0.0
					x.noDecay = 0.0
					x.noDecayPerm = false
					_log("cleanse", {"to": x.uid, "what": "burn"})
			var a := R_.up_gain(sum, v)
			if a > 0.0:
				u.atkBonus += a
				_log("atkUp", {"to": u.uid, "amount": a})
				_perm_rec(u, s, u, a)
		"stealShock":
			for x in _skill_targets_of(u, s, ctx):
				if _up(x) and x.shock > 0.0:
					var n := floorf(x.shock * v / 100.0)
					if n <= 0.0:
						continue
					x.shock -= n
					u.shockHit += n
					_log("steal", {"to": x.uid, "from": u.uid, "amount": n, "total": x.shock})
					_buff(u, "shockHitUp", n)
					_perm_rec(u, s, u, n)
		"shareArmor":
			var to: Variant = null if s.get("to") == "self" or s.get("to") == "allAllies" else s.get("to")
			if _t(to):
				u.shareTo[to] = (u.shareTo[to] if _t(u.shareTo.get(to)) else 0.0) + v
			else:
				u.shareArmor += v
			_perm_rec(u, s, u, v, ("share_" + str(to)) if _t(to) else "shareArmor")
		"dmgOf":
			for x in _skill_targets_of(u, s, ctx):
				_hurt(x, _of_val(u, s, x, ctx) * v / 100.0, u, false, dwhy)
		"burnOf", "shockOf":
			for x in _skill_targets_of(u, s, ctx):
				_add_status(x, "burn" if dd == "burnOf" else "shock", _of_val(u, s, x, ctx) * v / 100.0, why, u)
		"atkOf":
			for x in _skill_targets_of(u, s, ctx):
				var a := R_.up_gain(_of_val(u, s, x, ctx), v)
				if a > 0.0:
					x.atkBonus += a
					_log("atkUp", {"to": x.uid, "amount": a})
					_perm_rec(u, s, x, a)
		"hpOf":
			for x in _skill_targets_of(u, s, ctx):
				var a := R_.up_gain(_of_val(u, s, x, ctx), v)
				if a > 0.0:
					x.maxHp += a
					x.hp += a
					_buff(x, "hpUp", a)
					_perm_rec(u, s, x, a)
		"burnHitOf", "shockHitOf", "armorHitOf":
			var field: String = {"burnHitOf": "burnHit", "shockHitOf": "shockHit", "armorHitOf": "armorHit"}[dd]
			for x in _skill_targets_of(u, s, ctx):
				var a := R_.up_gain(_of_val(u, s, x, ctx), v)
				if a > 0.0:
					x[field] += a
					_buff(x, field + "Up", a)
					_perm_rec(u, s, x, a)
		"armorOf":
			for x in _skill_targets_of(u, s, ctx):
				var a := _of_val(u, s, x, ctx) * v / 100.0
				_add_armor(x, a, why)
				_perm_rec(u, s, x, a)
		"healOf":
			var of: Variant = s.get("of")
			var once: Variant = null if of is Dictionary and of.get("who") == "each" else _of_val(u, s, null, ctx)
			for x in _skill_targets_of(u, s, ctx):
				var a: float = (once if once != null else _of_val(u, s, x, ctx)) * v / 100.0
				_heal(x, a, u)
				_perm_rec(u, s, x, a)
		"healToAtk":
			u.healToAtk += v
			_stat_note(u, "healToAtk", v)
			_perm_rec(u, s, u, v)
		"dmg":
			for x in _skill_targets_of(u, s, ctx):
				_hurt(x, v, u, false, dwhy)
		"dmgPctAtk":
			for x in _skill_targets_of(u, s, ctx):
				_hurt(x, _atk_of(u) * v / 100.0, u, false, dwhy)
		"armorBreakDmg":
			if _n(ctx, "amount") > 0.0:
				for x in _skill_targets_of(u, s, ctx):
					_hurt(x, ctx.amount * v / 100.0, u, false, "armorBreak")
		"reflect":
			if _n(ctx, "taken") > 0.0:
				for x in _skill_targets_of(u, s, ctx):
					_hurt(x, ctx.taken * v / 100.0, u, false, "reflect")
		"reflectOf":
			for x in _skill_targets_of(u, s, ctx):
				_hurt(x, _of_val(u, s, x, ctx) * v / 100.0, u, false, "reflect")
		"counter", "counterMulti":
			for x in _skill_targets_of(u, s, ctx):
				var n: float = v if dd == "counter" else u.multi + u.multiBonus
				var i := 0.0
				while i < n and _up(x):
					_hurt(x, _atk_of(u), u, false, "counter", {"atk": u.atk, "bonus": u.atkBonus} if detail_on else null)
					if x.shock > 0.0 and _up(x):
						_hurt(x, x.shock * _amp(u.shockAmp) * _amp(x.shockTaken), u, true, "shock",
							{"shock": x.shock, "amp": u.shockAmp, "tribeAmp": u.shockAmpT if _t(u.shockAmpT) else 0.0, "takenAmp": x.shockTaken} if detail_on else null)
					i += 1.0
		"burn", "shock":
			for x in _skill_targets_of(u, s, ctx):
				_add_status(x, dd, v, why, u)
		"freeze":
			for x in _skill_targets_of(u, s, ctx):
				if _up(x):
					x.cdLeft += v
					x.frozen += v
					_buff(x, "freeze", v)
		"cdSlowPct":
			for x in _skill_targets_of(u, s, ctx):
				if _up(x):
					x.cdMult *= 1.0 + v / 100.0
					if x.db != null:
						x.db.cd *= 1.0 + v / 100.0
					_buff(x, "cdSlowPct", v)
					if x.side != u.side:
						_reflect_back(x, u, "cdSlowPct", v)
		"stun":
			for x in _skill_targets_of(u, s, ctx):
				if _up(x):
					var vv := floorf(v * s.bossPct / 100.0) if s.get("bossPct") != null and x.boss else v
					if vv > 0.0:
						x.stunLeft = maxf(x.stunLeft, vv)
						_buff(x, "stun", vv)
		"noDecay":
			for x in _skill_targets_of(u, s, ctx):
				if _up(x):
					x.noDecay += v
		"spreadBurn":
			if _n(ctx, "burn") > 0.0:
				for x in _skill_targets_of(u, s, ctx):
					_add_status(x, "burn", ctx.burn * v / 100.0, why, u)
		"moveShock":
			if _n(ctx, "shock") > 0.0:
				for x in _skill_targets_of(u, s, ctx):
					_add_status(x, "shock", ctx.shock * v / 100.0, why, u)
		"cdCut":
			for x in _skill_targets_of(u, s, ctx):
				_cut_cd(x, v)
				_perm_rec(u, s, x, v)
		"cdPct":
			for x in _skill_targets_of(u, s, ctx):
				x.cdMult *= maxf(0.05, 1.0 - (v * (1.0 + x.cdAmp / 100.0)) / 100.0)
				_log("cdPct", {"to": x.uid, "pct": v})
				_perm_rec(u, s, x, v)
		"atkUp":
			for x in _skill_targets_of(u, s, ctx):
				x.atkBonus += v
				_log("atkUp", {"to": x.uid, "amount": v})
				_perm_rec(u, s, x, v)
		"atkPct":
			for x in _skill_targets_of(u, s, ctx):
				var a := R_.up_gain(_atk_of(x), v)
				x.atkBonus += a
				_log("atkUp", {"to": x.uid, "amount": a})
				_perm_rec(u, s, x, a)
		"hpUp":
			for x in _skill_targets_of(u, s, ctx):
				x.maxHp += v
				x.hp += v
				_buff(x, "hpUp", v)
				_perm_rec(u, s, x, v)
		"multiUp", "burnHitUp", "shockHitUp", "armorHitUp":
			var field: String = {"multiUp": "multiBonus", "burnHitUp": "burnHit", "shockHitUp": "shockHit", "armorHitUp": "armorHit"}[dd]
			for x in _skill_targets_of(u, s, ctx):
				x[field] += v
				_buff(x, dd, v)
				_perm_rec(u, s, x, v)
		"burnNoDecay":
			for x in _skill_targets_of(u, s, ctx):
				x.burnNoDecay = true
				_perm_rec(u, s, x, 1.0)
		"armorAmp", "cdAmp", "shockAmp", "healAmp", "hitAmp", "burnAmp":
			for x in _skill_targets_of(u, s, ctx):
				x[dd] += v
				_stat_note(x, dd, v)
				_perm_rec(u, s, x, v)
		"hpPct":
			for x in _skill_targets_of(u, s, ctx):
				var a := R_.up_gain(x.maxHp, v)
				x.maxHp += a
				x.hp += a
				_buff(x, "hpUp", a)
				_perm_rec(u, s, x, v)
		"healHitUp":
			for x in _skill_targets_of(u, s, ctx):
				x.healHit = (x.healHit if _t(x.healHit) else 0.0) + v
				_buff(x, "healHitUp", v)
				_perm_rec(u, s, x, v)
		"armorHitPct", "burnHitPct", "shockHitPct":
			var field: String = {"armorHitPct": "armorHit", "burnHitPct": "burnHit", "shockHitPct": "shockHit"}[dd]
			for x in _skill_targets_of(u, s, ctx):
				var a := R_.up_gain(x[field], v)
				x[field] += a
				_buff(x, field + "Up", a)
				_perm_rec(u, s, x, v)
		"cdMsDown":
			for x in _skill_targets_of(u, s, ctx):
				x.cdMs = maxf(0.0, x.cdMs - v)
				_buff(x, "cdMsDown", v)
				_perm_rec(u, s, x, v)
		"burnTakenUp", "shockTakenUp", "dmgTakenUp":
			var field: String = {"burnTakenUp": "burnTaken", "shockTakenUp": "shockTaken", "dmgTakenUp": "dmgTakenAmp"}[dd]
			var dbk: String = {"burnTakenUp": "burnT", "shockTakenUp": "shockT", "dmgTakenUp": "dmgT"}[dd]
			for x in _skill_targets_of(u, s, ctx):
				if _up(x):
					x[field] += v
					if x.db != null:
						x.db[dbk] += v
					_buff(x, dd, v)
		"armorGainCut", "healCut":
			var field: String = "armorAmp" if dd == "armorGainCut" else "healAmp"
			var dbk: String = "armor" if dd == "armorGainCut" else "heal"
			for x in _skill_targets_of(u, s, ctx):
				if _up(x):
					x[field] -= v
					if x.db != null:
						x.db[dbk] += v
					_buff(x, dd, v)

# ---------- hits ----------
func _strike(a: Dictionary, tg: Dictionary, n: float, first: bool, carried: bool, pw: Variant) -> void:
	var atk0: float = maxf(1.0, floorf(_atk_of(a) / n)) if n > 1.0 else _atk_of(a)
	var atkP: float = maxf(1.0, floorf(atk0 * pw / 100.0)) if pw != null and pw != 100.0 else atk0
	var ha := _hit_amp_of(a)
	var atk: float = R_.up_mul(atkP, _amp(ha) * _amp(tg.dmgTakenAmp)) if _t(ha) or _t(tg.dmgTakenAmp) else atkP
	var absorbed := _hurt(tg, atk, a, BOSS != null and a.boss and BR.has("pierce"), "hit",
		{"atk": a.atk, "bonus": a.atkBonus, "n": n, "amp": ha, "tribeAmp": a.hitAmpT if _t(a.hitAmpT) else 0.0, "takenAmp": tg.dmgTakenAmp, "carried": 1 if carried else 0} if detail_on else null)
	if tg.avoidedAt == t and is_same(tg.avoidedBy, a):
		return
	var taken := atk
	if tg.shock > 0.0 and _up(tg):
		var sd := R_.up_mul(tg.shock, _amp(a.shockAmp) * _amp(tg.shockTaken))
		_hurt(tg, sd, a, true, "shock", {"shock": tg.shock, "amp": a.shockAmp, "tribeAmp": a.shockAmpT if _t(a.shockAmpT) else 0.0, "takenAmp": tg.shockTaken} if detail_on else null)
		taken += maxf(0.0, sd)
	if first:
		if a.tb.get("burn") != null and fmod(a.sets, a.tb.burn[1]) == 0.0:
			Q.S.append({"u": a, "s": {"do": "burn", "to": "target", "value": a.tb.burn[0], "why": "tribe"}, "ctx": {"target": tg}})
		if a.tb.get("shock") != null and fmod(a.sets, a.tb.shock[1]) == 0.0:
			Q.S.append({"u": a, "s": {"do": "shock", "to": "target", "value": a.tb.shock[0], "why": "tribe"}, "ctx": {"target": tg}})
	if floorf(a.burnHit / n) > 0.0:
		Q.S.append({"u": a, "s": {"do": "burn", "to": "target", "value": floorf(a.burnHit / n)}, "ctx": {"target": tg}})
	if floorf(a.shockHit / n) > 0.0:
		Q.S.append({"u": a, "s": {"do": "shock", "to": "target", "value": floorf(a.shockHit / n)}, "ctx": {"target": tg}})
	if floorf(a.armorHit / n) > 0.0:
		Q.L.append({"u": a, "s": {"do": "armor", "to": "self", "value": floorf(a.armorHit / n), "why": "armorHit"}, "ctx": {}})
	var hh: float = a.healHit if _t(a.healHit) else 0.0
	if floorf(hh / n) > 0.0:
		Q.H.append({"u": a, "s": {"do": "heal", "to": "self", "value": floorf(hh / n), "why": "healHit"}, "ctx": {}})
	if BOSS != null and a.boss and BR.has("execute") and _up(tg) and tg.hp > 0.0 and tg.hp * 100.0 < tg.maxHp * BR.execute.v:
		_by_rule("execute", func(): _hurt(tg, tg.hp, a, true, "execute"))
	_trigger(a, "hit", {"target": tg, "dealt": taken, "carried": true} if carried else {"target": tg, "dealt": taken})
	_trigger(tg, "hitTaken", {"attacker": a, "amount": absorbed, "taken": taken})

func _carry_hit(u: Dictionary, s: Dictionary, ctx: Dictionary) -> void:
	var tg: Variant = ctx.get("target")
	if tg == null:
		return
	stand_mode = true
	var xs := _skill_targets_of(u, s, ctx)
	stand_mode = false
	for x in xs:
		var i := 0.0
		while i < s.value:
			if aborted != null or not _up(tg) or x.down:
				return
			hit_n += 1
			if hit_n > R.hitCapPerMatch:
				aborted = "hits"
				return
			_log("carry", {"who": x.uid, "by": u.uid, "target": tg.uid})
			_strike(x, tg, 1.0, false, true, s.get("pow"))
			i += 1.0

func _drain(list: Array) -> void:
	var i := 0
	while i < list.size():
		eff_n += 1
		if eff_n > R.effectCapPerMatch:
			if aborted == null:
				aborted = "effects"
			break
		_apply(list[i])
		i += 1
	list.clear()

func _s_tier(it: Dictionary) -> float:
	var i: Variant = DO.get(it.s["do"])
	if i == null:
		return 2.0
	if i.get("side") == "foe" or (i.get("side") == "foeSelf" and it.s.get("to") != "self"):
		var of: Variant = it.s.get("of")
		return 0.5 if of is Dictionary and (of.get("stat") == "burn" or of.get("stat") == "shock") else 0.0
	return 1.0 if it.s["do"] == "cleanse" or it.s["do"] == "cleansePct" else 2.0

func _h_key(it: Dictionary) -> float:
	var si: Variant = it.s.get("idx")
	return (it.u.row * 2.0 + it.u.lane) * 64.0 + (63.0 if si == null else float(si))

func _drain_sorted(list: Array, key: Callable) -> void:
	while list.size() > 0 and aborted == null:
		var batch := []
		for i in list.size():
			batch.append([key.call(list[i]), i, list[i]])
		list.clear()
		batch = _sort(batch, func(a, b): return a[0] - b[0] if a[0] != b[0] else float(a[1] - b[1]))
		for x in batch:
			eff_n += 1
			if eff_n > R.effectCapPerMatch:
				if aborted == null:
					aborted = "effects"
				break
			_apply(x[2])
	list.clear()

func _drain_s() -> void:
	_drain_sorted(Q.S, _s_tier)

func _drain_h() -> void:
	_drain_sorted(Q.H, _h_key)

func _drain_all() -> void:
	_drain(Q.A)
	_drain(Q.D)
	_drain(Q.L)
	_restore_armor()
	_drain_s()
	_flush_refl()
	_drain_h()
	_flush_refl()
	_flush_revive()

func _restore_armor() -> void:
	while restore_q.size() > 0:
		var f: Dictionary = restore_q.pop_front()
		_add_armor(f, f.restoreAmt, "tribe")

# ---------- boss ----------
func _enter_phase(i: int) -> void:
	ph_idx = i
	var p: Variant = _at(BOSS.phases, i)
	if not _t(p):
		p = {"rules": [], "fx": [], "spot": ""}
	BR = R_.rule_map(p)
	if BR.has("plating") and plates < 0.0:
		plates = BR.plating.v
		plateT = t
	if BR.has("flameShell") and shell < 0.0:
		shell = BR.flameShell.v
		shellT = t
	var fx := R_.fx_map(p)
	if fx.get("armorBar") != null:
		_by_rule("armorBar", func(): _add_armor(BOSS, BOSS.barHp * fx.armorBar / 100.0, "boss"))
	if fx.has("cleanse"):
		BOSS.burn = 0.0
		BOSS.shock = 0.0
		BOSS.noDecay = 0.0
		BOSS.noDecayPerm = false
		_by_rule("cleanse", func(): _log("cleanse", {"to": BOSS.uid}))
	if _t(fx.get("untargetable")):
		BOSS.noHitUntil = maxf(BOSS.noHitUntil if _t(BOSS.noHitUntil) else 0.0, t + fx.untargetable * 1000.0)
	if _t(fx.get("stunAll")):
		var o: Variant = rule_tag
		rule_tag = "stunAll"
		for x in _enemies(BOSS):
			x.stunLeft = maxf(x.stunLeft, fx.stunAll * 1000.0)
			_buff(x, "stun", fx.stunAll * 1000.0)
		rule_tag = o
	if _t(p.get("stats")):
		for k in p.stats:
			BOSS[k] = p.stats[k]
	var spot_ok := false
	if _t(p.get("spot")):
		var c: Variant = R_.spot_cells(p.spot)
		if c != null:
			spot_ok = true
			BOSS.slots = c.slots
			BOSS.cells = c.cells
			BOSS.move = c.move
			BOSS.row = float(int(c.cells[0]) >> 1)
			BOSS.lane = float(int(c.cells[0]) & 1)
	if BR.has("rowSwap"):
		for x in F:
			if not x.boss:
				if x.row == 0.0:
					x.row = 2.0
				elif x.row == 2.0:
					x.row = 0.0
	if BR.has("earlyStorm"):
		storm_at = minf(storm_at, t)
	if BR.has("tribeOff"):
		for x in F:
			if not x.boss:
				x.tb = {}
	barT = t; enrageT = t; growT = t; auraT = t; shockT = t; silT = t; frzT = t; vanT = t; curseT = t; stunT = t; drainT = t; cdpT = t; shieldT = t; cleanT = t; mendT = t
	var ids := []
	for r in p.rules:
		ids.append(r.id)
	var ev := {"who": BOSS.uid, "i": i, "rules": ids}
	if detail_on:
		ev["rd"] = p.rules.map(func(r): return r.duplicate())
		ev["fx"] = (p.fx if _t(p.get("fx")) else []).map(func(f): return f.duplicate())
	if _t(p.get("stats")) and p.stats.size() > 0:
		ev["stats"] = p.stats.duplicate()
	if spot_ok:
		ev["cells"] = BOSS.cells.duplicate()
	_log("phase", ev)

func _boss_bar_cleanse() -> void:
	var b: Dictionary = BOSS
	var d: Dictionary = b.db
	b.burn = 0.0; b.shock = 0.0; b.noDecay = 0.0; b.noDecayPerm = false; b.stunLeft = 0.0
	if b.frozen > 0.0:
		b.cdLeft = maxf(0.0, b.cdLeft - b.frozen)
		b.frozen = 0.0
	b.cdMult /= d.cd
	b.armorAmp += d.armor
	b.healAmp += d.heal
	b.burnTaken -= d.burnT
	b.shockTaken -= d.shockT
	b.dmgTakenAmp -= d.dmgT
	if d.maxHp > 0.0:
		b.maxHp += d.maxHp
		_log("maxhp", {"to": b.uid, "amount": -d.maxHp, "maxHp": b.maxHp, "hp": b.hp})
	b.db = _db_zero()
	_log("cleanse", {"to": b.uid, "what": "bar"})

func _boss_bars() -> void:
	if BOSS == null or BOSS.down:
		return
	BOSS.barBreak = false
	var gone := maxf(0.0, minf(BOSS.bars, BOSS.bars - ceilf(maxf(0.0, BOSS.hp) / BOSS.barHp)))
	var changed := false
	while bars_gone < gone and bars_gone < BOSS.bars:
		bars_gone += 1.0
		barT = t
		changed = true
		_log("bar", {"who": BOSS.uid, "gone": bars_gone, "left": BOSS.bars - bars_gone})
		var ctx := {"downed": BOSS, "burn": BOSS.burn, "shock": BOSS.shock, "attacker": BOSS.lastHitBy}
		_boss_bar_cleanse()
		if BR.has("barBlast"):
			var o: Variant = rule_tag
			rule_tag = "barBlast"
			for x in _enemies(BOSS):
				_hurt(x, BR.barBlast.v, BOSS, false, "skill")
			rule_tag = o
		for x in F.filter(func(x): return not x.boss and _up(x)):
			_trigger(x, "enemyDown", ctx)
		if BOSS.lastHitBy != null and _up(BOSS.lastHitBy):
			_trigger(BOSS.lastHitBy, "kill", ctx)
	var i := R_.phase_index_at(BOSS.phases, bars_gone)
	if i != ph_idx:
		_enter_phase(i)
		changed = true
	if changed:
		_drain_all()

func _move_boss() -> void:
	var next_l := _pick_n(BOSS.slots.filter(func(i): return i != BOSS.cells[0]), 1, BOSS.side)
	if next_l.is_empty():
		return
	var nx: float = next_l[0]
	BOSS.cells = [nx]
	BOSS.row = float(int(nx) >> 1)
	BOSS.lane = float(int(nx) & 1)
	if BR.has("weakSpot"):
		BOSS.weakUntil = t + R.bossTimers.weakSpotMs
	_log("bossMove", {"who": BOSS.uid, "slot": nx})

func _boss_tick() -> void:
	if not _up(BOSS):
		return
	var TM: Dictionary = R.bossTimers
	rule_tag = "enrage"
	if BR.has("enrage") and t - enrageT >= TM.enrageMs:
		enrageT = t
		var a := R_.up_gain(BOSS.atk, BR.enrage.v)
		if a > 0.0:
			BOSS.atkBonus += a
			_log("atkUp", {"to": BOSS.uid, "amount": a})
	rule_tag = "regen"
	if BR.has("regen") and fmod(t, 1000.0) == 0.0:
		_boss_heal(BOSS.barHp * BR.regen.v / 100.0)
	rule_tag = "armorGrow"
	if BR.has("armorGrow") and t - growT >= TM.armorGrowMs:
		growT = t
		_add_armor(BOSS, BR.armorGrow.v, "boss")
	rule_tag = "burnAura"
	if BR.has("burnAura") and t - auraT >= TM.burnAuraMs:
		auraT = t
		for x in _enemies(BOSS):
			_add_status(x, "burn", BR.burnAura.v, "boss", BOSS)
	rule_tag = "shockAura"
	if BR.has("shockAura") and t - shockT >= TM.shockAuraMs:
		shockT = t
		for x in _pick_n(_enemies(BOSS), 1, BOSS.side):
			_add_status(x, "shock", BR.shockAura.v, "boss", BOSS)
	rule_tag = "randomSilence"
	if BR.has("randomSilence") and t - silT >= BR.randomSilence.v * 1000.0:
		silT = t
		for x in _pick_n(_enemies(BOSS), 1, BOSS.side):
			x.silenceUntil = t + BR.randomSilence.v2 * 1000.0
			_buff(x, "silence", BR.randomSilence.v2 * 1000.0)
	rule_tag = "freezeRow"
	if BR.has("freezeRow") and t - frzT >= BR.freezeRow.v * 1000.0:
		frzT = t
		var row := floorf(_rng(BOSS.side).next() * 3.0)
		var ms: float = BR.freezeRow.v2 * 1000.0
		for x in _enemies(BOSS).filter(func(e): return e.row == row):
			x.cdLeft += ms
			x.frozen += ms
			_buff(x, "freeze", ms)
	rule_tag = "stunPulse"
	if BR.has("stunPulse") and t - stunT >= BR.stunPulse.v * 1000.0:
		stunT = t
		var ms: float = BR.stunPulse.v2 * 1000.0
		for x in _pick_n(_enemies(BOSS), 1, BOSS.side):
			x.stunLeft = maxf(x.stunLeft, ms)
			_buff(x, "stun", ms)
	rule_tag = "atkDrain"
	if BR.has("atkDrain") and t - drainT >= BR.atkDrain.v * 1000.0:
		drainT = t
		for x in _enemies(BOSS):
			var d := minf(BR.atkDrain.v2, maxf(0.0, x.hitAmp + 90.0))
			if d > 0.0:
				x.hitAmp -= d
				_buff(x, "atkDrain", d)
	rule_tag = "cdPulse"
	if BR.has("cdPulse") and t - cdpT >= BR.cdPulse.v * 1000.0:
		cdpT = t
		var ms: float = BR.cdPulse.v2 * 1000.0
		for x in _enemies(BOSS):
			x.cdLeft += ms
			x.frozen += ms
			_buff(x, "freeze", ms)
	rule_tag = "shieldPulse"
	if BR.has("shieldPulse") and t - shieldT >= BR.shieldPulse.v * 1000.0:
		shieldT = t
		_add_armor(BOSS, BOSS.barHp * BR.shieldPulse.v2 / 100.0, "boss")
	rule_tag = "cleansePulse"
	if BR.has("cleansePulse") and t - cleanT >= BR.cleansePulse.v * 1000.0:
		cleanT = t
		if _t(BOSS.burn) or _t(BOSS.shock):
			BOSS.burn = 0.0; BOSS.shock = 0.0; BOSS.noDecay = 0.0; BOSS.noDecayPerm = false
			_log("cleanse", {"to": BOSS.uid})
	rule_tag = "vanish"
	if BR.has("vanish") and t - vanT >= BR.vanish.v * 1000.0:
		vanT = t
		BOSS.noHitUntil = t + BR.vanish.v2 * 1000.0
		_log("vanish", {"who": BOSS.uid, "ms": BR.vanish.v2 * 1000.0})
	rule_tag = "dpsCheck"
	if BR.has("dpsCheck") and t - barT >= BR.dpsCheck.v * 1000.0:
		barT = t
		var top := _boss_cap()
		if BOSS.hp < top:
			BOSS.hp = top
			_log("barRefill", {"who": BOSS.uid, "hp": top})
	rule_tag = "curse"
	if BR.has("curse"):
		if curse_q != null and t >= curse_q.until:
			if _up(curse_q.u) and BOSS.taken - curse_q.base < BOSS.barHp * BR.curse.v2 / 100.0:
				_log("curse", {"to": curse_q.u.uid, "done": 0})
				_hurt(curse_q.u, curse_q.u.hp, BOSS, true, "execute")
			curse_q = null
			curseT = t
		if curse_q == null and t - curseT >= BR.curse.v * 1000.0:
			var xs := _pick_n(_enemies(BOSS), 1, BOSS.side)
			if xs.size() > 0:
				curse_q = {"u": xs[0], "until": t + TM.curseWindowMs, "base": BOSS.taken}
				_log("curse", {"to": xs[0].uid, "ms": TM.curseWindowMs})
	rule_tag = "plating"
	if BR.has("plating") and t - plateT >= BR.plating.v3 * 1000.0:
		plateT = t
		if plates < BR.plating.v:
			plates += 1.0
			if detail_on:
				_log("plating", {"who": BOSS.uid, "left": plates})
	rule_tag = "flameShell"
	if BR.has("flameShell") and t - shellT >= BR.flameShell.v3 * 1000.0:
		shellT = t
		if shell < BR.flameShell.v:
			shell = BR.flameShell.v
			if detail_on:
				_log("flameShell", {"who": BOSS.uid, "left": shell})
	rule_tag = "mendPulse"
	if BR.has("mendPulse") and t - mendT >= BR.mendPulse.v * 1000.0:
		mendT = t
		if not (BOSS.burn > 0.0):
			_boss_heal(BOSS.barHp * BR.mendPulse.v2 / 100.0)
		elif detail_on:
			_log("ruleBlock", {"to": BOSS.uid, "why": "heal", "rule": "mendPulse"})
	rule_tag = null
	if BOSS.move and BOSS.slots.size() > 1 and t - moveT >= BOSS.moveSec * 1000.0:
		moveT = t
		_move_boss()

# ---------- downs ----------
func _chance_ok(f: Dictionary, s: Dictionary) -> bool:
	return s.get("chance") == null or s.chance >= 100.0 or _rng(f.side).next() * 100.0 < s.chance

func _resolve_downs() -> void:
	for guard in 50:
		var fallen := F.filter(func(f): return not f.down and f.hp <= 0.0)
		if fallen.is_empty():
			return
		stage = "down"
		var summons := []
		for f in fallen:
			if _t(f.tb.get("blast")):
				var x: Variant = _normal_target(f)
				if x != null:
					Q.D.append({"u": f, "s": {"do": "dmg", "to": "enemyFront", "value": floorf(_atk_of(f) * f.tb.blast / 100.0), "why": "downSkill", "src": "blast"}, "ctx": {}})
		for f in fallen:
			var ctx := {"downed": f, "burn": f.burn, "shock": f.shock, "attacker": f.lastHitBy}
			_trigger(f, "selfDown", ctx)
			for x in F.filter(func(x): return x.side == f.side and not is_same(x, f) and _up(x)):
				_trigger(x, "allyDown", ctx)
			for x in F.filter(func(x): return x.side != f.side and _up(x)):
				_trigger(x, "enemyDown", ctx)
			if f.lastHitBy != null and _up(f.lastHitBy):
				_trigger(f.lastHitBy, "kill", ctx)
			if BOSS != null and not f.boss and BR.has("feedOnDown"):
				_by_rule("feedOnDown", func(): _boss_heal(BOSS.barHp * BR.feedOnDown.v / 100.0))
			if BOSS != null and not f.boss and BR.has("downAtk") and _up(BOSS):
				var o: Variant = rule_tag
				rule_tag = "downAtk"
				var a := R_.up_gain(BOSS.atk, BR.downAtk.v)
				if a > 0.0:
					BOSS.atkBonus += a
					_log("atkUp", {"to": BOSS.uid, "amount": a})
				rule_tag = o
			var no_rev: bool = BOSS != null and not f.boss and BR.has("noRevive")
			var rv: Variant = null
			if not no_rev:
				for s in f.skills:
					if s["do"] == "revive" and s.get("when") == "selfDown" and _usable(s) and (not _t(s.get("lim")) or s.uses < s.lim) and _chance_ok(f, s):
						rv = s
						break
			if rv != null:
				_fire(f, rv, "selfDown")
				_revive_unit(f, rv.value, "skill", f, rv)
				continue
			var healer: Variant = null
			var ra: Variant = null
			if not no_rev:
				for x in F:
					if is_same(x, f) or x.side != f.side or not _up(x):
						continue
					ra = null
					for s in x.skills:
						if s["do"] == "reviveAlly" and s.get("when") == "allyDown" and s.uses < s.value and _usable(s) and _chance_ok(x, s):
							ra = s
							break
					if ra != null:
						healer = x
						break
			if ra != null:
				_fire(healer, ra, "allyDown")
				_revive_unit(f, R.reviveAllyHpPct, "ally", healer, ra)
				continue
			if not no_rev and revive_left[f.side] > 0.0:
				var x: Dictionary = _tb(f.side, "อสูร")
				revive_left[f.side] -= 1.0
				_revive_unit(f, x.b.revivePct[x.idx], "tribe")
				continue
			f.down = true
			f.hp = 0.0
			f.burn = 0.0; f.shock = 0.0; f.armor = 0.0; f.noDecay = 0.0; f.noDecayPerm = false
			f.cdLeft = INF
			_log("down", {"who": f.uid})
			var sm: Variant = null
			for s in f.skills:
				if s["do"] == "summon" and s.get("when") == "selfDown" and _t(s.get("unit")) and _usable(s) and _chance_ok(f, s):
					sm = s
					break
			if sm != null:
				_fire(f, sm, "selfDown")
				f.replaced = true
				summons.append([f, sm])
		for pair in summons:
			var f: Dictionary = pair[0]
			var sm: Dictionary = pair[1]
			var n := _mk_fighter(sm.unit, f.side)
			n.uid = F.size()
			n.summoned = true
			F.append(n)
			n.cdLeft = _eff_cd(n)
			if detail_on:
				ini_stats[n.uid] = _snap_stats(n)
			var ev := {"who": n.uid, "from": f.uid, "unit": {"uid": n.uid, "side": n.side, "id": n.id, "name": n.name, "level": n.level, "row": n.row, "lane": n.lane, "hp": n.hp, "maxHp": n.maxHp, "armor": n.armor}}
			if detail_on:
				ev["d"] = {"si": sm.get("idx"), "what": sm["do"]}
			_log("summon", ev)
			_trigger(n, "passive", {})
		_drain_all()

func _revive_unit(f: Dictionary, pct: float, why: String, giver: Variant = null, s: Variant = null) -> void:
	f.hp = maxf(1.0, floorf(f.maxHp * pct / 100.0))
	f.burn = 0.0; f.shock = 0.0; f.armor = 0.0; f.noDecay = 0.0; f.noDecayPerm = false
	f.cdLeft = _eff_cd(f)
	var ev := {"who": f.uid, "hp": f.hp, "why": why}
	if detail_on and giver != null:
		ev["from"] = giver.uid
		ev["d"] = {"si": s.get("idx"), "what": s["do"]}
	_log("revive", ev)

# ---------- tribes ----------
func _tb(side: int, tr: String) -> Variant:
	return {"idx": steps[side][tr], "b": R.tribeBonus[tr]} if steps[side].has(tr) else null

func _tbv(side: int, tr: String, k: String) -> float:
	var x: Variant = _tb(side, tr)
	if x == null or not _t(x.b.get(k)):
		return 0.0
	var v: Variant = _at(x.b[k], x.idx)
	return float(v) if _t(v) else 0.0

func _step_idx(n: float) -> int:
	var c := 0
	for x in R.tribeSteps:
		if n >= x:
			c += 1
	return c - 1

# ---------- simulate ----------
func _run(team_a: Array, team_b: Array, o: Dictionary) -> Dictionary:
	opts = o
	R = o.rules if o.get("rules") is Dictionary else R_.RULES()
	DO = R_.DO_INFO()
	log_on = o.get("log") != false
	detail_on = log_on and _t(o.get("detail"))
	live_on = log_on and _t(o.get("live"))
	storm_at = R.stormStartMs

	var side := 0
	for team in [team_a, team_b]:
		for u in team:
			F.append(_mk_fighter(u, side))
		side += 1
	F = _sort(F, func(a, b):
		if a.side != b.side: return float(a.side - b.side)
		return _by_front(a, b))
	for i in F.size():
		F[i].uid = i

	var th := [_team_hash(0), _team_hash(1)]
	var base: int = (int(o.seed) & Rng.M32) if _t(o.get("seed")) else ((th[0] + th[1]) & Rng.M32)
	for sd in 2:
		rngs.append(Rng.new((Rng.imul(base ^ th[sd], 2654435761) + 1) & Rng.M32))

	var tribe_on := []
	for sd in 2:
		var off: Variant = o.get("tribesOff")
		tribe_on.append(R.get("tribesOn") != false and not (_t(off) and _t(_at(off, sd))))
	var t_extra := [{}, {}]
	for bi in 2:
		var list: Variant = o.get("tribeExtra" if bi == 0 else "tribeExtraB")
		var box: Dictionary = t_extra[bi]
		if list is Array:
			for x in list:
				if _t(x) and _n(x, "count") > 0.0:
					var old: Variant = box.get(x.tribe)
					box[x.tribe] = {"count": (old.count if old != null else 0.0) + x.count,
						"maxTier": maxf(old.maxTier if old != null else 0.0, float(x.maxTier) if _t(x.get("maxTier")) else 6.0)}
	for sd in 2:
		var out := {}
		steps.append(out)
		if not tribe_on[sd]:
			continue
		var counts := {}
		var seen := {}
		for f in F:
			if f.side == sd and not seen.has(f.id):
				seen[f.id] = true
				for tr in f.tribes:
					counts[tr] = counts.get(tr, 0.0) + 1.0
		for tr in counts:
			var n: float = counts[tr]
			var idx := _step_idx(n)
			var e: Variant = t_extra[sd].get(tr)
			if e != null:
				idx = maxi(idx, int(minf(_step_idx(n + e.count), e.maxTier - 1.0)))
			var only: Variant = _at(o.get("tribeOnly"), sd) if _t(o.get("tribeOnly")) else null
			if idx >= 0 and _t(R.get("tribeBonus")) and _t(R.tribeBonus.get(tr)) and (not _t(only) or only == tr):
				out[tr] = idx
	for sd in 2:
		var x: Variant = _tb(sd, "อสูร")
		revive_left.append(float(x.b.revives[x.idx]) if x != null else 0.0)

	for f in F:
		if f.boss:
			BOSS = f
			break
	for f in F:
		for s in f.skills:
			if s.get("when") == "tick":
				TICKSK = true

	# ---------- match start ----------
	for f in F:
		f.armor = f.startArmor
	for f in F:
		var st: Variant = _tb(f.side, "เหล็กกล้า")
		var p: float = float(st.b.hpPct[st.idx]) if st != null and _t(st.b.get("hpPct")) else 0.0
		if p > 0.0:
			f.armorBaseHp = f.maxHp
			f.maxHp = R_.up_mul(f.maxHp, 1.0 + p / 100.0)
			f.hp = f.maxHp
	burn_dmg_on = [_tbv(1, "เพลิงเผา", "burnDmgPct"), _tbv(0, "เพลิงเผา", "burnDmgPct")]
	if detail_on:
		for f in F:
			ini_stats[f.uid] = _snap_stats(f)
	var tribes_ev := []
	for sd in 2:
		var d := {}
		for k in steps[sd]:
			d[k] = R.tribeSteps[steps[sd][k]]
		tribes_ev.append(d)
	var units_ev := []
	for f in F:
		var ue := {"uid": f.uid, "side": f.side, "id": f.id, "name": f.name, "level": f.level, "row": f.row, "lane": f.lane, "hp": f.hp, "maxHp": f.maxHp, "armor": f.armor}
		if f.cells != null:
			ue["cells"] = f.cells.duplicate()
		if f.boss and f.bars > 1.0:
			ue["bars"] = f.bars
			ue["barHp"] = f.barHp
		units_ev.append(ue)
	_log("start", {"tribes": tribes_ev, "units": units_ev})
	for f in F:
		var steel: Variant = _tb(f.side, "เหล็กกล้า")
		var fire: Variant = _tb(f.side, "เพลิงเผา")
		var bolt: Variant = _tb(f.side, "สายฟ้า")
		var wind: Variant = _tb(f.side, "วายุ")
		var spirit: Variant = _tb(f.side, "ภูติ")
		if steel != null:
			var amt := R_.up_gain(f.armorBaseHp if _t(f.armorBaseHp) else float(f.maxHp), steel.b.armorPct[steel.idx])
			_add_armor(f, amt, "tribe")
			if _t(steel.b.restore[steel.idx]):
				f.restoreLeft = float(steel.b.restore[steel.idx])
				f.restoreAmt = amt
		if fire != null:
			f.tb["burn"] = [fire.b.burn[fire.idx], fire.b.every[fire.idx]]
		if bolt != null:
			f.tb["shock"] = [bolt.b.shock[bolt.idx], bolt.b.every[bolt.idx]]
		if wind != null:
			f.tb["hit"] = [wind.b.extraHit[wind.idx], wind.b.every[wind.idx]]
		if spirit != null:
			f.cdMult *= 1.0 - spirit.b.cdPct[spirit.idx] / 100.0
			var ss: Variant = _at(spirit.b.get("startSets") if spirit.b.get("startSets") is Array else [], spirit.idx)
			var n := minf(R.startSetsMax, maxf(1.0 if _t(_at(spirit.b.get("instantFirst"), spirit.idx)) else 0.0, floorf(float(ss) if _t(ss) else 0.0)))
			f.tb["instant"] = n > 0.0
			f.burst = maxf(0.0, n - 1.0)
		if wind != null and _t(wind.b.get("dmgPct")):
			var v: Variant = _at(wind.b.dmgPct, wind.idx)
			f.hitAmpT = float(v) if _t(v) else 0.0
			f.hitAmp += f.hitAmpT
		if bolt != null and _t(bolt.b.get("shockDmgPct")):
			var v: Variant = _at(bolt.b.shockDmgPct, bolt.idx)
			f.shockAmpT = float(v) if _t(v) else 0.0
			f.shockAmp += f.shockAmpT
		var fiend: Variant = _tb(f.side, "อสูร")
		if fiend != null:
			f.tb["blast"] = fiend.b.blastPct[fiend.idx]
	stage = "start"
	if BOSS != null:
		_enter_phase(0)
	for f in F:
		_trigger(f, "passive", {})
	_drain_all()
	for f in F:
		var fb := _tbv(1 - f.side, "เพลิงเผา", "startBurn")
		var sb := _tbv(1 - f.side, "สายฟ้า", "startShock")
		if fb > 0.0:
			_add_status(f, "burn", fb, "tribe", null)
		if sb > 0.0:
			_add_status(f, "shock", sb, "tribe", null)
	for f in F:
		f.cd0 = _eff_cd(f)
		f.cdLeft = f.cd0
	for f in F:
		_trigger(f, "matchStart", {})
	_drain_all()
	for f in F:
		f.cdLeft = maxf(0.0, (0.0 if _t(f.tb.get("instant")) else _eff_cd(f)) + (f.cdLeft - f.cd0) - f.cdStart)
	_resolve_downs()
	if BOSS != null:
		_boss_bars()
	if _t(o.get("startOnly")):
		return {"units": F.map(func(f): return {"side": f.side, "row": f.row, "lane": f.lane, "st": _snap_stats(f)})}

	if live_on:
		_live_stat()
	var res: Variant = _end_check()
	if res != null:
		return res

	# ---------- tick loop ----------
	while true:
		t += R.tickMs
		if BOSS != null:
			BOSS.barBreak = false
		var cd_tick: float = R.tickMs * (1.0 + _ot_up() / 100.0)
		for f in F:
			if _up(f):
				if f.stunLeft > 0.0:
					f.stunLeft = maxf(0.0, f.stunLeft - R.tickMs)
				else:
					f.cdLeft -= cd_tick
				for s in f.skills:
					if s.cdLeft > 0.0:
						s.cdLeft -= R.tickMs

		stage = "damage"
		if fmod(t, R.burnIntervalMs) == 0.0:
			for f in F.filter(func(f): return _up(f) and f.burn > 0.0):
				var b_amt := R_.up_mul(f.burn, _amp(f.burnTaken + burn_dmg_on[f.side]) * (1.0 + _ot_up() / 100.0))
				if b_amt > 0.0:
					for pr in _bshare_split(f.uid):
						if pr[0] >= 0:
							F[pr[0]].dealt += b_amt * pr[1]
				_hurt(f, b_amt, null, false, "burn", {"burn": f.burn, "takenAmp": f.burnTaken, "tribeAmp": burn_dmg_on[f.side]} if detail_on else null)
				if f.noDecayPerm:
					continue
				if f.noDecay > 0.0:
					f.noDecay -= 1.0
				else:
					f.burn = maxf(0.0, f.burn - R.burnDecay)
					_log("burnLeft", {"to": f.uid, "total": f.burn})
		if t > storm_at and fmod(t - storm_at, R.stormIntervalMs) == 0.0:
			var k := _ot_k()
			var up2 := _ot_tot(k)
			var cut := minf(100.0, up2)
			_log("overtime", {"n": k, "dmg": up2, "speed": up2, "heal": cut, "armor": cut})

		stage = "pre"
		if BOSS != null:
			_boss_tick()
		if TICKSK:
			for f in F:
				if _up(f):
					_trigger(f, "tick", {})
		var plans := []
		for a in F.filter(func(f): return _up(f) and f.cdLeft <= 0.0):
			a.sets += 1.0
			var plan := {"a": a, "target": _normal_target(a), "hits": a.multi + a.multiBonus + (BR.multiUp.v if BOSS != null and a.boss and BR.has("multiUp") else 0.0), "spread": false, "landed": 0.0}
			_trigger(a, "set", plan, func(s): return PRE.has(s["do"]))
			if a.tb.get("hit") != null and fmod(a.sets, a.tb.hit[1]) == 0.0:
				plan.hits += a.tb.hit[0]
			if plan.spread is bool and plan.spread:
				plan.spread = _sort(_enemies(a), _by_hp)
			_log("set", {"who": a.uid, "target": plan.target.uid if plan.target != null else null, "hits": plan.hits, "n": a.sets, "atk": _atk_of(a)})
			_trigger(a, "set", {"target": plan.target}, func(s): return not PRE.has(s["do"]))
			plans.append(plan)

		_drain(Q.A)

		for q in [Q.D, Q.S]:
			for it in q:
				if armor_snap_skill(it.s) and it.ctx.get("armorSnap") == null:
					var c: Dictionary = it.ctx.duplicate()
					c["armorSnap"] = it.u.armor
					it.ctx = c
		for f in F:
			f.armorTick = f.armor
		stage = "damage"
		for p in plans:
			if aborted != null:
				break
			var a: Dictionary = p.a
			var h := 0.0
			while h < p.hits:
				hit_n += 1
				if hit_n > R.hitCapPerMatch:
					aborted = "hits"
					break
				var tgs: Array
				var aoe_pow: Variant = BR.aoe.v if BOSS != null and a.boss and BR.has("aoe") else null
				if _t(aoe_pow):
					tgs = _sort(_foes(a), _by_front)
				elif _t(p.get("split")):
					tgs = _sort(_enemies(a), _by_front)
				else:
					var tg: Variant = p.target
					if p.spread is Array:
						var live: Array = p.spread.filter(func(x): return _up(x))
						tg = live[int(fmod(h, live.size()))] if live.size() > 0 else null
					tgs = [tg] if tg != null and _up(tg) else []
				if tgs.is_empty():
					break
				var n: float = 1.0 if _t(aoe_pow) else float(tgs.size())
				p.landed += 1.0
				for j in tgs.size():
					sub_hit = j > 0
					if _up(tgs[j]):
						_strike(a, tgs[j], n, p.landed == 1.0 and j == 0, false, aoe_pow)
				sub_hit = false
				h += 1.0
			if p.landed >= 3.0:
				_trigger(a, "hits3", {"target": p.target})
		for f in F:
			f.armorTick = null
		_drain(Q.D)
		for p in plans:
			p.a.cdLeft = _eff_cd(p.a)
			p.a.frozen = 0.0
			if p.a.burst > 0.0:
				p.a.burst -= 1.0
				p.a.cdLeft = 0.0
		_drain(Q.L)
		_drain(Q.A)
		_restore_armor()
		stage = "status"
		_drain_s()
		_flush_refl()
		_drain_h()
		_flush_refl()
		_flush_revive()
		_resolve_downs()
		if BOSS != null:
			_boss_bars()
		if live_on:
			_live_stat()
		res = _end_check()
		if res != null:
			return res
	return {}

func _finish(winner: Variant) -> Dictionary:
	_log("end", {"winner": winner, "aborted": aborted} if aborted != null else {"winner": winner})
	var units := []
	for f in F:
		var ue := {"uid": f.uid, "side": f.side, "id": f.id, "hp": maxf(0.0, f.hp), "maxHp": f.maxHp, "down": f.down, "dealt": f.dealt, "taken": f.taken}
		if detail_on:
			ue["ini"] = ini_stats.get(f.uid)
			ue["fin"] = _snap_stats(f)
		units.append(ue)
	var out := {"winner": winner, "timeMs": t, "events": events, "perm": gains.values(), "units": units}
	if aborted != null:
		out["aborted"] = aborted
	return out

func _end_check() -> Variant:
	if aborted != null:
		return _finish(null)
	var a := false
	var b := false
	for f in F:
		if not f.down:
			if f.side == 0: a = true
			else: b = true
	if not a and not b:
		return _finish(null)
	if not b:
		return _finish(0)
	if not a:
		return _finish(1)
	if _n(opts, "stopMs") > 0.0 and t >= opts.stopMs:
		return _finish(0)
	if t >= R.hardStopMs:
		return _finish(null)
	return null
