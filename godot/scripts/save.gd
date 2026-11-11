# src/core/save.js port (set 195 step 6f) — run save, run stats, run history, replays, play record, run code (ARUN1).
# Pure data, no screen. Text out = JS JSON.stringify bytes (js_json) so a Godot save / code reads the same in the JS tools.
# Check: tests/test_save.gd vs golden save.jsonl (src/lab/golden-save.mjs) + the ARUN1 round trip into the Balance Room reader
# (node lab/golden-save.mjs check). A change in save.js must be made here too.
# Security ③: every text from outside (user:// save, history, replays, a pasted code) goes through read_* / parse_run_code:
# JSON parse inside a check (never load() / str_to_var), length caps, then every field checked before use.
# parse_run_code returns {"error": reason} where JS throws.
extends RefCounted

const R := preload("res://scripts/rules.gd")
const SH := preload("res://scripts/shop.gd")
const RR := preload("res://scripts/runrunes.gd")
const RL := preload("res://scripts/runlog.gd")
const T := preload("res://scripts/team.gd")
const P := preload("res://scripts/power.gd")
const V := preload("res://scripts/validate.gd")
const Rng := preload("res://scripts/rng.gd")

const SAVE_VERSION := 3.0
const SAVE_MAX_CHARS := 200000
const HISTORY_MAX := 20
const REPLAY_VERSION := 1.0
const REPLAY_MAX := 40
const REPLAY_D_LEGACY := {"ปกติ": 100.0, "ยาก": 113.0, "นรก": 131.0, "ง่าย": 100.0, "กลาง": 100.0}
const PLAY_VERSION := 3.0
const RUN_CODE_TAG := "ARUN1"
const RUN_CODE_MAX := 900000
const RUN_CODE_HIST := 3
const RUN_CODE_RUNS := 2

static func _rules(rules: Dictionary) -> Dictionary:
	return R.RULES() if rules.is_empty() else rules

# ---------- JS text helpers ----------
# JS string .length = UTF-16 units (a character above U+FFFF counts 2)
static func js_len(s: String) -> int:
	var n := s.length()
	for i in s.length():
		if s.unicode_at(i) > 0xFFFF:
			n += 1
	return n

static func _json_str(s: String) -> String:
	var out := PackedStringArray(["\""])
	for i in s.length():
		var c := s.unicode_at(i)
		match c:
			0x22: out.append("\\\"")
			0x5C: out.append("\\\\")
			0x08: out.append("\\b")
			0x0C: out.append("\\f")
			0x0A: out.append("\\n")
			0x0D: out.append("\\r")
			0x09: out.append("\\t")
			_:
				out.append("\\u%04x" % c if c < 0x20 else String.chr(c))
	out.append("\"")
	return "".join(out)

# JSON.stringify for JSON values (Dictionary keeps insertion order like a JS object with text keys)
static func js_json(v: Variant) -> String:
	if v == null:
		return "null"
	if v is bool:
		return "true" if v else "false"
	if v is int or v is float:
		return R.js_num(float(v)) if is_finite(float(v)) else "null"
	if v is String:
		return _json_str(v)
	if v is Array:
		var parts := PackedStringArray()
		for x in v:
			parts.append(js_json(x))
		return "[" + ",".join(parts) + "]"
	if v is Dictionary:
		var parts := PackedStringArray()
		for k in v:
			parts.append(_json_str(RL._key(k)) + ":" + js_json(v[k]))
		return "{" + ",".join(parts) + "}"
	return "null"

# JSON.parse inside try → {ok, v}
static func js_parse(text: String) -> Dictionary:
	var j := JSON.new()
	if j.parse(text) != OK:
		return {"ok": false, "v": null}
	return {"ok": true, "v": j.data}

# JS ToNumber for a comparison with a number (the side that may be anything)
static func _to_num(x: Variant) -> float:
	if x == null:
		return 0.0
	if x is bool:
		return 1.0 if x else 0.0
	if x is int or x is float:
		return float(x)
	if x is String:
		var t := RL.js_trim(x)
		if t == "":
			return 0.0
		return t.to_float() if t.is_valid_float() else NAN
	if x is Array:
		return _to_num(R.js_str(x))
	return NAN

# ---------- data hash (FNV-1a 32 bits over the UTF-16 units of the JSON text) ----------
static func data_hash(chars: Array, rules: Dictionary = {}) -> String:
	var rl := _rules(rules)
	var tb := {}
	var tbs: Dictionary = rl["tribeBonus"] if rl.get("tribeBonus") is Dictionary else {}
	for t in tbs:
		var o := {}
		for k in tbs[t]:
			var v: Variant = tbs[t][k]
			if v is Array and v.all(func(x): return R.js_seq(x, 0.0)):
				continue
			o[k] = v
		tb[t] = o
	var src := {"c": chars}
	for pair in [["shop", "shop"], ["caps", "permCaps"]]:
		if rl.has(pair[1]):
			src[pair[0]] = rl[pair[1]]
	src["tb"] = tb
	src["v"] = SAVE_VERSION
	var s := js_json(src)
	var h := 0x811c9dc5
	for i in s.length():
		var c := s.unicode_at(i)
		if c > 0xFFFF:
			h = Rng.imul(h ^ (0xD800 + ((c - 0x10000) >> 10)), 0x01000193)
			h = Rng.imul(h ^ (0xDC00 + ((c - 0x10000) & 0x3FF)), 0x01000193)
		else:
			h = Rng.imul(h ^ c, 0x01000193)
	return "%08x" % h

static func sv_obj(x: Variant) -> bool:
	return x is Dictionary

static func sv_int_in(x: Variant, lo: float, hi: float) -> bool:
	return R.is_int(x) and float(x) >= lo and float(x) <= hi

static func sv_own(o: Variant, k: Variant) -> bool:
	return o is Dictionary and o.has(RL._key(k))

static func sv_only_keys(o: Dictionary, keys: Array) -> bool:
	for k in o:
		if not keys.has(k):
			return false
	return true

static func _has_all(o: Dictionary, keys: Array) -> bool:
	for k in keys:
		if not o.has(k):
			return false
	return true

static func check_unit(u: Variant, cm: Dictionary, rules: Dictionary, at: String, errors: Array) -> void:
	if u == null:
		return
	if not sv_obj(u) or not sv_only_keys(u, ["uid", "id", "level", "perm", "paid"]):
		errors.append("%s: ตัวละครผิดรูปแบบ" % at)
		return
	var id_ok: bool = u.get("id") is String and cm.has(u["id"])
	if not id_ok:
		errors.append("%s: ไม่มีตัวละคร" % at)
	if not sv_int_in(u.get("uid"), 1, 1e9):
		errors.append("%s: uid ผิด" % at)
	if not sv_int_in(u.get("level"), 1, rules["maxLevel"]):
		errors.append("%s: เลเวลผิด" % at)
	if not sv_int_in(u.get("paid"), 0, 1e6):
		errors.append("%s: ราคาที่จ่ายผิด" % at)
	if not sv_obj(u.get("perm")):
		errors.append("%s: ค่าถาวรผิดรูปแบบ" % at)
		return
	if id_ok and sv_int_in(u.get("level"), 1, rules["maxLevel"]):
		var r := V.validate_team([{"id": u["id"], "level": u["level"], "row": 0.0, "lane": 0.0, "perm": u["perm"]}], cm, rules)
		for e in r["errors"]:
			errors.append("%s: %s" % [at, e])

const _ST_KEYS := ["v", "op", "seed", "n", "round", "gold", "wins", "hearts", "lastWon", "over", "shop", "bench", "board", "uid", "charges", "rn", "bw", "bk", "extra", "ls", "ws", "sc", "fp"]
# one side's run state (the shape of new_run in shop.gd)
static func validate_run_state(st: Variant, cm: Dictionary, rules: Dictionary = {}, opts: Dictionary = {}) -> Dictionary:
	var rl := _rules(rules)
	var S: Dictionary = rl["shop"]
	var errors := []
	if not sv_obj(st):
		return {"ok": false, "errors": ["สถานะผิดรูปแบบ"]}
	if not sv_only_keys(st, _ST_KEYS) or not _has_all(st, _ST_KEYS):
		return {"ok": false, "errors": ["ช่องสถานะไม่ครบหรือมีช่องแปลกปลอม"]}
	var W: float = S["winsToFinish"]
	if not R.js_seq(st["v"], 11.0):
		errors.append("เวอร์ชันสถานะไม่รู้จัก")
	if not (st["op"] is bool):
		errors.append("สถานะรอบร้านผิด")
	if not sv_int_in(st["seed"], 0, 4294967295.0):
		errors.append("เมล็ดสุ่มผิด")
	if not sv_int_in(st["n"], 0, 1e9):
		errors.append("ตัวนับสุ่มผิด")
	if not sv_int_in(st["round"], 0, 1000):
		errors.append("รอบผิด")
	if not sv_int_in(st["gold"], 0, 100000):
		errors.append("เงินผิด")
	if not sv_int_in(st["wins"], 0, 1000) or (not SH._truthy(st["extra"]) and float(st["wins"]) > W):
		errors.append("จำนวนชนะผิด")
	if not sv_int_in(st["bw"], 0, 1000) or not sv_int_in(st["bk"], 0, 1000) or float(st["bw"]) > _to_num(st["wins"]) or float(st["bk"]) > _to_num(st["wins"]):
		errors.append("ตัวนับบอสผิด")
	if not sv_int_in(st["ls"], 0, 1000):
		errors.append("ตัวนับแพ้ติดผิด")
	if not sv_int_in(st["ws"], 0, 1000):
		errors.append("ตัวนับชนะติดผิด")
	if not sv_int_in(st["fp"], 0, 1e9):
		errors.append("พลังทีมล็อกศัตรูผิด")
	if not R.js_seq(st["sc"], 0.0) and not R.js_seq(st["sc"], 1.0):
		errors.append("โอกาสสุดท้ายผิด")
	if not (st["extra"] is bool) or (st["extra"] and _to_num(st["wins"]) < W):
		errors.append("แมตช์พิเศษผิด")
	if not sv_int_in(st["hearts"], 0, S["hearts"]):
		errors.append("หัวใจผิด")
	if not (st["lastWon"] is bool) or not (st["over"] is bool):
		errors.append("ค่าจริง/เท็จผิด")
	if not sv_int_in(st["uid"], 1, 1e9):
		errors.append("uid ผิด")
	var shop: Variant = st["shop"]
	if not (shop is Array) or shop.size() < S["slots"] or shop.size() > float(S["slots"]) + 3.0:
		errors.append("ร้านผิด")
	else:
		for i in shop.size():
			var s: Variant = shop[i]
			if not sv_obj(s) or not sv_only_keys(s, ["id", "locked"]) or not (s.get("locked") is bool) \
					or not (s.has("id") and (s["id"] == null or (s["id"] is String and cm.has(s["id"])))):
				errors.append("ร้านช่อง %d ผิด" % (i + 1))
	var bench: Variant = st["bench"]
	if not (bench is Array) or bench.size() != S["bench"]:
		errors.append("ม้านั่งผิด")
	else:
		for i in bench.size():
			check_unit(bench[i], cm, rl, "ม้านั่ง %d" % (i + 1), errors)
	var board: Variant = st["board"]
	var board_ok: bool = board is Array and board.size() == rl["rows"]
	if board_ok:
		for r in board:
			if not (r is Array and r.size() == rl["lanes"]):
				board_ok = false
	if not board_ok:
		errors.append("บอร์ดผิด")
	else:
		for row in board.size():
			for lane in board[row].size():
				check_unit(board[row][lane], cm, rl, "บอร์ด %d/%d" % [row + 1, lane + 1], errors)
	errors.append_array(RR.rn_validate(st["rn"], rl))
	if not errors.is_empty():
		return {"ok": false, "errors": errors}
	var uids := {}
	var dup := false
	var over_counter := false
	for x in SH.all_units(st):
		var uid := float(x["u"]["uid"])
		if uids.has(uid):
			dup = true
		uids[uid] = true
		if uid >= float(st["uid"]):
			over_counter = true
	if dup:
		errors.append("uid ซ้ำ")
	if over_counter:
		errors.append("uid เกินตัวนับ")
	# waiting charges (SF-7…): one per character id + skill · ≤ board + bench slots · no repeats · real id / skill · owner still in the team
	var ch: Variant = st["charges"]
	var ch_keys := {}
	var ch_bad: bool = not (ch is Array)
	if not ch_bad:
		for x in ch:
			ch_keys["%s#%s" % [R.js_str_of(x, "id"), R.js_str_of(x, "si")] if sv_obj(x) else "?"] = true
		ch_bad = ch.size() > float(rl["maxBoard"]) + float(S["bench"]) or ch_keys.size() != ch.size()
	if ch_bad:
		errors.append("ประจุผิด")
	else:
		for x in ch:
			if not sv_obj(x) or not sv_only_keys(x, ["id", "uid", "si"]) or not (x.get("id") is String) or not cm.has(x["id"]) or not sv_int_in(x.get("uid"), 1, 1e9) \
					or not sv_int_in(x.get("si"), 0, 5) or int(x["si"]) >= cm[x["id"]]["skills"].size() or not SH._truthy(cm[x["id"]]["skills"][int(x["si"])]) \
					or SH.charge_owner(st, x) == null:
				errors.append("ประจุผิด")
	if not SH._truthy(opts.get("bot")):
		var want: bool = float(st["hearts"]) <= 0.0 or (not st["extra"] and float(st["wins"]) >= W)
		if st["over"] != want:
			errors.append("สถานะจบ run ไม่ตรง")
	return {"ok": errors.is_empty(), "errors": errors}

# ---------- run stats (player side 0) ----------
static func new_stats() -> Dictionary:
	return {"matches": 0.0, "w": 0.0, "l": 0.0, "d": 0.0, "timeMs": 0.0, "streak": 0.0, "best": 0.0, "dmg": {}}

# burn credit by share (battle.js burnShares) · uid keys are floats (JSON numbers)
static func _bs_see(share: Dictionary, k: String, d: Dictionary) -> void:
	if k == "burn":
		var to := float(d["to"])
		var m: Dictionary = share.get(to, {})
		share[to] = m
		var before: float = float(d["total"]) - float(d["amount"])
		var tot := 0.0
		for v in m.values():
			tot += v
		if tot > 0.0:
			for s in m.keys():
				m[s] = m[s] * before / tot if before > 0.0 else 0.0
		var key := float(d["from"]) if d.get("from") != null else -1.0
		m[key] = m.get(key, 0.0) + float(d["amount"])
	elif k == "cleanse" and not R.js_seq(d.get("what"), "pct"):
		share.erase(float(d["to"]))
	elif k == "down":
		share.erase(float(d["who"]))

static func _bs_split(share: Dictionary, uid: float) -> Array:
	var m: Variant = share.get(uid)
	var tot := 0.0
	if m != null:
		for v in m.values():
			tot += v
	if not (tot > 0.0):
		return [[-1.0, 1.0]]
	var out := []
	for s in m:
		if m[s] > 0.0:
			out.append([s, m[s] / tot])
	return out

static func add_match_stats(stats: Dictionary, result: Dictionary) -> Dictionary:
	var w: Variant = result.get("winner")
	stats["matches"] += 1.0
	stats["timeMs"] += maxf(0.0, floorf(R.js_or0(result.get("timeMs"))))
	if R.js_seq(w, 1.0):
		stats["l"] += 1.0
		stats["streak"] = 0.0
	else:
		if R.js_seq(w, 0.0):
			stats["w"] += 1.0
		else:
			stats["d"] += 1.0
		stats["streak"] += 1.0
		stats["best"] = maxf(stats["best"], stats["streak"])
	var owner := {}
	var add := {}
	var share := {}
	var credit := func(uid: Variant, v: float) -> void:
		if uid != null and owner.has(float(uid)) and v > 0.0:
			var id: String = owner[float(uid)]
			add[id] = add.get(id, 0.0) + v
	var evs: Array = result["events"] if result.get("events") is Array else []
	for e in evs:
		var k: String = e["k"]
		if k == "start":
			for u in e["units"]:
				if R.js_seq(u["side"], 0.0):
					owner[float(u["uid"])] = u["id"]
		elif k == "summon" and e.get("unit") is Dictionary and R.js_seq(e["unit"].get("side"), 0.0):
			owner[float(e["unit"]["uid"])] = e["unit"]["id"]
		elif k == "burn" or k == "cleanse" or k == "down":
			_bs_see(share, k, e)
		elif k == "dmg" and float(e["amount"]) > 0.0:
			if R.js_seq(e.get("why"), "burn"):
				for sf in _bs_split(share, float(e["to"])):
					credit.call(sf[0], float(e["amount"]) * sf[1])
			else:
				credit.call(e.get("from"), floorf(float(e["amount"])))
	for id in add:
		stats["dmg"][id] = R.js_or0(stats["dmg"].get(id)) + floorf(add[id] + 1e-9)
	return stats

static func top_damage(stats: Dictionary) -> Variant:
	var best: Variant = null
	for id in stats["dmg"]:
		var v: float = stats["dmg"][id]
		if best == null or v > best["v"]:
			best = {"id": id, "v": v}
	return best

static func validate_stats(s: Variant, cm: Dictionary) -> bool:
	if not sv_obj(s) or not sv_only_keys(s, ["matches", "w", "l", "d", "timeMs", "streak", "best", "dmg"]):
		return false
	for k in ["matches", "w", "l", "d", "streak", "best"]:
		if not sv_int_in(s.get(k), 0, 10000):
			return false
	if not sv_int_in(s.get("timeMs"), 0, 1e9) or float(s["w"]) + float(s["l"]) + float(s["d"]) != float(s["matches"]) or not sv_obj(s.get("dmg")) or s["dmg"].size() > 100:
		return false
	for id in s["dmg"]:
		if not cm.has(id) or not sv_int_in(s["dmg"][id], 0, 1e12):
			return false
	return true

# a v9 run (before the locked enemy / flag tribes) → v10 · fp = the board power now
static func _board_shape_ok(st: Dictionary) -> bool:
	if not (st.get("board") is Array):
		return false
	for r in st["board"]:
		if not (r is Array):
			return false
		for u in r:
			if u != null and not (u is Dictionary and u.get("perm") is Dictionary and u.has("id") and u.has("level")):
				return false
	return true

static func _up_v9(st: Variant, cm: Dictionary, rules: Dictionary) -> void:
	if not sv_obj(st) or not R.js_seq(st.get("v"), 9.0) or not sv_obj(st.get("rn")) or st.has("fp") or st["rn"].has("ft"):
		return
	var fp := 0.0
	if _board_shape_ok(st):  # JS: try … catch → 0 (a broken board fails validate_run_state anyway)
		var team: Variant = T.build_team(SH.team_entries(st), cm, rules)
		if team is Array:
			fp = R.js_round(P.team_power(team, rules))
	st["v"] = 10.0
	st["fp"] = fp
	st["rn"]["ft"] = {}

# a v10 run (before op) → v11 · op false = resume runs start_round like the old build did
static func _up_v10(st: Variant) -> void:
	if not sv_obj(st) or not R.js_seq(st.get("v"), 10.0) or st.has("op"):
		return
	st["v"] = 11.0
	st["op"] = false

# save: {sv, data, P, B, stats, startedAt}
static func make_save(PL: Dictionary, B: Dictionary, stats: Dictionary, started_at: float, hash: String) -> String:
	return js_json({"sv": SAVE_VERSION, "data": hash, "P": PL, "B": B, "stats": stats, "startedAt": started_at})

# → {status: 'ok' | 'none' | 'data' | 'bad', save?, errors?} · parse inside a check · every field checked before use
static func read_save(text: Variant, cm: Dictionary, rules: Dictionary, hash: String) -> Dictionary:
	if text == null or R.js_seq(text, ""):
		return {"status": "none"}
	if not (text is String) or js_len(text) > SAVE_MAX_CHARS:
		return {"status": "bad", "errors": ["เซฟยาวผิดปกติ"]}
	var p := js_parse(text)
	if not p["ok"]:
		return {"status": "bad", "errors": ["เซฟอ่านไม่ได้"]}
	var o: Variant = p["v"]
	if not sv_obj(o) or not sv_only_keys(o, ["sv", "data", "P", "B", "stats", "startedAt"]):
		return {"status": "bad", "errors": ["เซฟผิดรูปแบบ"]}
	if not R.js_seq(o.get("sv"), SAVE_VERSION):
		return {"status": "data", "errors": ["เวอร์ชันเซฟไม่ตรง"]}
	if sv_obj(o.get("P")) and (R.js_seq(o["P"].get("v"), 3.0) or R.js_seq(o["P"].get("v"), 4.0)):
		return {"status": "data", "errors": ["เซฟเวอร์ชันเก่า (ก่อนรูน set 94 / มีร้านรูน set 94)"]}
	if not R.js_seq(o.get("data"), hash):
		return {"status": "data", "errors": ["ค่าตัวละคร/กฎเปลี่ยนแล้ว"]}
	for k in ["P", "B"]:
		_up_v9(o.get(k), cm, rules)
		_up_v10(o.get(k))
	var a := validate_run_state(o.get("P"), cm, rules)
	var b := validate_run_state(o.get("B"), cm, rules, {"bot": true})
	var errors := []
	for e in a["errors"]:
		errors.append("ผู้เล่น: " + e)
	for e in b["errors"]:
		errors.append("บอท: " + e)
	if not validate_stats(o.get("stats"), cm):
		errors.append("สถิติผิด")
	if not sv_int_in(o.get("startedAt"), 0, 1e15):
		errors.append("เวลาเริ่มผิด")
	if o.get("P") is Dictionary and SH._truthy(o["P"].get("over")):
		errors.append("run ที่จบแล้วไม่ควรอยู่ในเซฟ")
	if o.get("B") is Dictionary and SH._truthy(o["B"].get("over")):
		errors.append("บอท: สถานะจบ run ไม่ตรง")
	if not errors.is_empty():
		return {"status": "bad", "errors": errors.slice(0, 5)}
	return {"status": "ok", "save": o}

# ---------- run history: [{at, won, wins, hearts, rounds, team: [{id, level}], top, topDmg, matches}] ----------
static func history_entry(PL: Dictionary, stats: Dictionary, at: float) -> Dictionary:
	var t: Variant = top_damage(stats)
	var team := []
	for x in SH.board_units(PL):
		team.append({"id": x["u"]["id"], "level": x["u"]["level"]})
	return {"at": at, "won": float(PL["wins"]) >= float(R.RULES()["shop"]["winsToFinish"]), "wins": PL["wins"], "hearts": PL["hearts"], "rounds": PL["round"], "matches": stats["matches"],
		"team": team, "top": t["id"] if t != null else null, "topDmg": t["v"] if t != null else 0.0}

const _H_KEYS := ["at", "won", "wins", "hearts", "rounds", "team", "top", "topDmg", "matches"]
static func _hist_ok(h: Variant, rl: Dictionary) -> bool:
	if not sv_obj(h) or not sv_only_keys(h, _H_KEYS):
		return false
	if not (sv_int_in(h.get("at"), 0, 1e15) and h.get("won") is bool and sv_int_in(h.get("wins"), 0, 1000) and sv_int_in(h.get("rounds"), 0, 1000)
			and float(h["wins"]) <= float(h["rounds"]) and sv_int_in(h.get("hearts"), 0, 50) and sv_int_in(h.get("matches"), 0, 1000)
			and (h.has("top") and (h["top"] == null or RL.rx_ok("^[A-Z]{2}-\\d{1,2}\\z", h["top"]))) and sv_int_in(h.get("topDmg"), 0, 1e12)
			and h.get("team") is Array and h["team"].size() <= rl["maxBoard"]):
		return false
	for u in h["team"]:
		if not (sv_obj(u) and sv_only_keys(u, ["id", "level"]) and RL.rx_ok("^[A-Z]{2}-\\d{1,2}\\z", u.get("id")) and sv_int_in(u.get("level"), 1, rl["maxLevel"])):
			return false
	return true

# text from storage → only the entries that pass the check (ids no longer in the game are kept) · bad entries dropped
static func read_history(text: Variant, rules: Dictionary = {}) -> Array:
	var rl := _rules(rules)
	if not (text is String) or text == "" or js_len(text) > 50000:
		return []
	var p := js_parse(text)
	if not p["ok"] or not (p["v"] is Array):
		return []
	return p["v"].slice(0, HISTORY_MAX).filter(func(h): return _hist_ok(h, rl))

static func push_history(list: Array, entry: Dictionary) -> Array:
	var out := [entry]
	out.append_array(list)
	return out.slice(0, HISTORY_MAX)

# ---------- replays after a fight: both teams (+ perm) + result per match, re-simulated when watched ----------
static func replay_pct(d: Variant) -> float:
	if R.is_num(d):
		return float(d)
	return REPLAY_D_LEGACY.get(d, 100.0) if d is String else 100.0

static func _pct_ok(d: Variant) -> bool:
	return (R.is_int(d) and float(d) >= 10.0 and float(d) <= 1000.0) or (d is String and REPLAY_D_LEGACY.has(d))

static func replay_entry(round: Variant, team_a: Variant, team_b: Variant, result: Dictionary, runes: Array = [], streak: Variant = 0.0, d: Variant = null, foe_runes: Variant = [], foe_streak: Variant = 0.0) -> Dictionary:
	var x := {"r": round, "a": team_a.duplicate(true), "b": team_b.duplicate(true), "w": result.get("winner"), "t": floorf(float(result["timeMs"]))}
	if runes.size() > 0:
		x["n"] = runes.duplicate(true)
		x["g"] = float(R.js_i32(streak))
	if SH._truthy(d) and not R.js_seq(d, 100.0) and team_b is Array:
		x["d"] = d
	if foe_runes is Array and foe_runes.size() > 0 and team_b is Array:
		x["fn"] = foe_runes.duplicate(true)
		if SH._truthy(foe_streak):
			x["fs"] = float(R.js_i32(foe_streak))
	return x

static func make_replays(run_seed: Variant, hash: String, list: Array) -> String:
	return js_json({"rv": REPLAY_VERSION, "data": hash, "run": run_seed, "list": list.slice(maxi(0, list.size() - REPLAY_MAX))})

static func check_replay(x: Variant, cm: Dictionary, rules: Dictionary = {}) -> bool:
	var rl := _rules(rules)
	if not sv_obj(x) or not sv_only_keys(x, ["r", "a", "b", "w", "t", "n", "g", "d", "fn", "fs"]) or not _has_all(x, ["r", "a", "b", "w", "t"]):
		return false
	if x.has("n") and not RR.rn_compact_ok(x["n"], rl):
		return false
	if x.has("g") and not sv_int_in(x["g"], 0, 10000):
		return false
	if x.has("d") and not _pct_ok(x["d"]):
		return false
	if x.has("fn") and not RR.rn_compact_ok(x["fn"], rl):
		return false
	if x.has("fs") and not sv_int_in(x["fs"], 0, 99):
		return false
	if not sv_int_in(x["r"], 1, 1000) or not (x["w"] == null or R.js_seq(x["w"], 0.0) or R.js_seq(x["w"], 1.0)) or not sv_int_in(x["t"], 0, 1e7):
		return false
	return V.validate_team(x["a"], cm, rl)["ok"] and (is_boss_foe(x["b"]) or V.validate_team(x["b"], cm, rl)["ok"])

# enemy side of a boss round = {boss: id, k} (+ x: 1 = met in extra matches) · shape only
static func is_boss_foe(b: Variant) -> bool:
	return sv_obj(b) and sv_only_keys(b, ["boss", "k", "x"]) and RL.rx_ok("^[A-Za-z0-9_-]{1,16}\\z", b.get("boss")) and sv_int_in(b.get("k"), 1, 100) \
		and (not b.has("x") or R.js_seq(b["x"], 1.0))

# → {status: 'ok' | 'none' | 'data' | 'other' | 'bad', list} · other = another run's (dropped quietly)
static func read_replays(text: Variant, cm: Dictionary, rules: Dictionary, hash: String, run_seed: Variant) -> Dictionary:
	if text == null or R.js_seq(text, ""):
		return {"status": "none", "list": []}
	if not (text is String) or js_len(text) > SAVE_MAX_CHARS:
		return {"status": "bad", "list": []}
	var p := js_parse(text)
	if not p["ok"]:
		return {"status": "bad", "list": []}
	var o: Variant = p["v"]
	if not sv_obj(o) or not sv_only_keys(o, ["rv", "data", "run", "list"]) or not (o.get("list") is Array) or o["list"].size() > REPLAY_MAX:
		return {"status": "bad", "list": []}
	if not R.js_seq(o.get("rv"), REPLAY_VERSION) or not R.js_seq(o.get("data"), hash):
		return {"status": "data", "list": []}
	if not R.js_seq(o.get("run"), run_seed):
		return {"status": "other", "list": []}
	for x in o["list"]:
		if not check_replay(x, cm, rules):
			return {"status": "bad", "list": []}
	return {"status": "ok", "list": o["list"]}

# ---------- play record: one row per match for the game's db (no player identity) ----------
static func play_team(t: Array) -> Array:
	return t.map(func(e): return {"id": e["id"], "level": e["level"], "row": e["row"], "lane": e["lane"], "perm": float(e["perm"].size()) if SH._truthy(e.get("perm")) else 0.0})

static func play_record(o: Dictionary, rules: Dictionary = {}) -> Dictionary:
	var rl := _rules(rules)
	var result: Dictionary = o["result"]
	var boss: Variant = o.get("boss")
	var foe: Variant = o.get("foe")
	var bossed := SH._truthy(boss)
	var w: Variant = result.get("winner")
	var bo: Variant = null
	if bossed:
		bo = {"boss": boss["boss"], "k": boss["k"]}
		if SH._truthy(boss.get("x")):
			bo["x"] = 1.0
	return {
		"v": PLAY_VERSION, "at": floorf(float(o["at"])), "data": o["hash"], "run": float(Rng.u32(int(float(o["runSeed"])))), "round": o["round"], "winsBefore": o["winsBefore"], "heartsBefore": o["heartsBefore"],
		"res": "w" if R.js_seq(w, 0.0) else "l" if R.js_seq(w, 1.0) else "d",
		"timeMs": floorf(float(result["timeMs"])), "storm": float(result["timeMs"]) > float(rl["stormStartMs"]), "aborted": result["aborted"] if SH._truthy(result.get("aborted")) else null,
		"team": play_team(o["teamA"]), "foe": [] if bossed else play_team(o["teamB"]), "foeSrc": "boss" if bossed else "set" if SH._truthy(foe) else "live",
		"foeStage": foe["stage"] if SH._truthy(foe) and not bossed else null, "foeSpan": foe["span"] if SH._truthy(foe) and not bossed else null,
		"boss": bo, "runes": (o.get("runes", []) as Array).map(func(x): return x.get("id")).slice(0, 80), "diff": o.get("diff"),
	}

const _PR_KEYS := ["v", "at", "data", "run", "round", "winsBefore", "heartsBefore", "res", "timeMs", "storm", "aborted", "team", "foe", "foeSrc", "foeStage", "foeSpan", "boss", "runes", "diff"]
static func _pr_team(t: Variant, cm: Dictionary, rl: Dictionary) -> bool:
	if not (t is Array) or t.size() > rl["maxBoard"]:
		return false
	for u in t:
		if not (sv_obj(u) and sv_only_keys(u, ["id", "level", "row", "lane", "perm"]) and u.get("id") is String and cm.has(u["id"]) and sv_int_in(u.get("level"), 1, rl["maxLevel"])
				and sv_int_in(u.get("row"), 0, float(rl["rows"]) - 1.0) and sv_int_in(u.get("lane"), 0, float(rl["lanes"]) - 1.0) and sv_int_in(u.get("perm"), 0, 100)):
			return false
	return true

static func check_play_record(x: Variant, cm: Dictionary, rules: Dictionary = {}) -> bool:
	var rl := _rules(rules)
	if not sv_obj(x) or not sv_only_keys(x, _PR_KEYS) or not _has_all(x, _PR_KEYS):
		return false
	if not (R.js_seq(x["v"], PLAY_VERSION) and sv_int_in(x["at"], 0, 1e15) and RL.rx_ok("^[0-9a-f]{8}\\z", x["data"]) and sv_int_in(x["run"], 0, 4294967295.0)
			and sv_int_in(x["round"], 1, 1000) and sv_int_in(x["winsBefore"], 0, 1000) and float(x["winsBefore"]) < _to_num(x["round"]) and sv_int_in(x["heartsBefore"], 0, 50)
			and (R.js_seq(x["res"], "w") or R.js_seq(x["res"], "l") or R.js_seq(x["res"], "d"))
			and sv_int_in(x["timeMs"], 0, 1e7) and x["storm"] is bool and (x["aborted"] == null or R.js_seq(x["aborted"], "hits") or R.js_seq(x["aborted"], "effects"))
			and _pr_team(x["team"], cm, rl) and _pr_team(x["foe"], cm, rl) and (R.js_seq(x["foeSrc"], "set") or R.js_seq(x["foeSrc"], "live") or R.js_seq(x["foeSrc"], "boss"))):
		return false
	if R.js_seq(x["foeSrc"], "boss"):
		if not (is_boss_foe(x["boss"]) and x["foe"].size() == 0):
			return false
	elif x["boss"] != null:
		return false
	if not (x["runes"] is Array and x["runes"].size() <= 80 and x["runes"].all(func(id): return RL.rx_ok("^[A-Z]{1,2}\\d{1,3}\\z", id)) and (x["diff"] == null or _pct_ok(x["diff"]))):
		return false
	if not R.js_seq(x["foeSrc"], "set"):
		return x["foeStage"] == null and x["foeSpan"] == null
	return sv_int_in(x["foeStage"], 0, 100) and sv_int_in(x["foeSpan"], 0, 10)

# ---------- run code (ARUN1): replays of the current + previous run, journals, latest history, optional name ----------
static func make_run_code(replay_texts: Array, history_text: Variant, page_hash: String, at: float, rules: Dictionary = {}, log_texts: Array = [], name: Variant = "") -> Variant:
	var runs := []
	for t in replay_texts.slice(0, RUN_CODE_RUNS):
		if t is String and js_len(t) <= SAVE_MAX_CHARS:
			var p := js_parse(t)
			if p["ok"] and sv_obj(p["v"]) and p["v"].get("list") is Array and p["v"]["list"].size() > 0:
				runs.append(p["v"])
	var h := read_history(history_text, rules).slice(0, RUN_CODE_HIST)
	var logs := []
	for t in log_texts.slice(0, RUN_CODE_RUNS):
		if t is String and js_len(t) <= 400000:
			var p := js_parse(t)
			if p["ok"] and SH._truthy(p["v"]) and R.js_seq(RL.rl_check(p["v"]), true) and p["v"]["ev"].size() > 0:
				logs.append(p["v"])
	if runs.is_empty() and h.is_empty() and logs.is_empty():
		return null
	var nm := RL.rl_name(name)
	var body := {"v": 2.0, "at": floorf(at), "page": page_hash, "runs": runs, "h": h, "logs": logs}
	if nm != "":
		body["nm"] = nm
	return RUN_CODE_TAG + " " + js_json(body)

static func _err(msg: String) -> Dictionary:
	return {"error": msg}

# text → {at, page, runs: [{data, run, list}], hist, logs, nm} or {error} · every match through check_replay, history through read_history
static func parse_run_code(text: Variant, cm: Dictionary, rules: Dictionary = {}) -> Dictionary:
	var t := RL.js_trim(text if text is String else R.js_str(text))
	if js_len(t) > RUN_CODE_MAX:
		return _err("code too long")
	if not t.begins_with(RUN_CODE_TAG + " "):
		return _err("not a run code (missing " + RUN_CODE_TAG + ")")
	var p := js_parse(t.substr(RUN_CODE_TAG.length() + 1))
	if not p["ok"]:
		return _err("code is not valid (cut off while copying?)")
	var o: Variant = p["v"]
	if not sv_obj(o) or not sv_only_keys(o, ["v", "at", "page", "runs", "h", "logs", "nm"]) or not (R.js_seq(o.get("v"), 1.0) or R.js_seq(o.get("v"), 2.0)):
		return _err("bad code body")
	if o.has("nm") and (not (o["nm"] is String) or o["nm"] == "" or RL.rl_name(o["nm"]) != o["nm"]):
		return _err("bad player name")
	var logs: Variant = o.get("logs") if R.js_seq(o["v"], 2.0) else []
	if not (logs is Array) or logs.size() > RUN_CODE_RUNS:
		return _err("bad logs")
	for i in logs.size():
		var c: Variant = RL.rl_check(logs[i])
		if not R.js_seq(c, true):
			return _err("bad run journal %d: %s" % [i + 1, c])
	if not sv_int_in(o.get("at"), 0, 1e15) or not RL.rx_ok("^[0-9a-f]{8}\\z", o.get("page")):
		return _err("bad header")
	if not (o.get("h") is Array) or o["h"].size() > RUN_CODE_HIST:
		return _err("bad history")
	var hist := read_history(js_json(o["h"]), rules)
	if hist.size() != o["h"].size():
		return _err("bad history entry")
	if not (o.get("runs") is Array) or o["runs"].size() > RUN_CODE_RUNS:
		return _err("bad runs")
	var runs := []
	for k in o["runs"].size():
		var rp: Variant = o["runs"][k]
		if not sv_obj(rp) or not sv_only_keys(rp, ["rv", "data", "run", "list"]) or not R.js_seq(rp.get("rv"), REPLAY_VERSION) or not (rp.get("list") is Array) or rp["list"].size() > REPLAY_MAX:
			return _err("bad replays")
		if not RL.rx_ok("^[0-9a-f]{8}\\z", rp.get("data")) or not sv_int_in(rp.get("run"), 0, 4294967295.0):
			return _err("bad replays header")
		for i in rp["list"].size():
			if not check_replay(rp["list"][i], cm, rules):
				return _err("bad match #%d in run %d" % [i + 1, k + 1])
		runs.append({"data": rp["data"], "run": rp["run"], "list": rp["list"]})
	return {"at": o["at"], "page": o["page"], "runs": runs, "hist": hist, "logs": logs, "nm": o["nm"] if o.has("nm") else ""}

# ---------- storage (user:// only) ----------
# Text in / out only: the caller passes what it reads to read_save / read_history / read_replays (JSON parse + checks).
# Never load() / ResourceLoader / str_to_var on a player file (HARD RULE 9 ③). A file bigger than max_bytes is not read.
const STORE_MAX_BYTES := 4 * 1000000

static func _store_path_ok(path: String) -> bool:
	return path.begins_with("user://") and not path.contains("..") and path.get_extension() == "json"

static func store_text(path: String, text: String) -> bool:
	if not _store_path_ok(path) or text.to_utf8_buffer().size() > STORE_MAX_BYTES:
		return false
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(text)
	f.close()
	return true

# → the text, or null (no file / not allowed / too big / not UTF-8)
static func load_text(path: String, max_bytes: int = STORE_MAX_BYTES) -> Variant:
	if not _store_path_ok(path) or not FileAccess.file_exists(path):
		return null
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null or f.get_length() > max_bytes:
		return null
	var b := f.get_buffer(f.get_length())
	f.close()
	var s := b.get_string_from_utf8()
	return s if s != "" or b.is_empty() else null
