# src/core/validate.js port (set 195, plan step 6a). Security ③ (HARD RULE 9): every team/config from outside
# (save, pasted code, Balance Room) goes through these before use. Same checks, same order, same error text as JS.
# A change in validate.js must be made here too.
extends RefCounted

const R := preload("res://scripts/rules.gd")

static var _id_re: RegEx

static func _rules(rules: Dictionary) -> Dictionary:
	return R.RULES() if rules.is_empty() else rules

static func is_lv3(a: Variant) -> bool:
	if not (a is Array) or a.size() != 3:
		return false
	for v in a:
		if not R.is_num(v) or v < 0:
			return false
	return true

static func team_perm_keys() -> Array:
	return R.mod("validate")["TEAM_PERM_KEYS"]

static func _n(x: Variant) -> String:
	return R.js_num(float(x))

static func validate_config(chars: Variant, rules: Dictionary = {}) -> Dictionary:
	var rl := _rules(rules)
	var M := R.mod("rules")
	var TRIBES: Array = M["TRIBES"]
	var RARITIES: Array = M["RARITIES"]
	var errors := []
	var warnings := []
	if not (chars is Array) or chars.is_empty():
		return {"ok": false, "errors": ["ไม่มีรายชื่อตัวละคร"], "warnings": warnings}
	if _id_re == null:
		_id_re = RegEx.create_from_string("^[A-Z]{2}-[0-9]{1,3}\\z")
	var seen := {}
	for c in chars:
		var cd: Dictionary = c if c is Dictionary else {}
		var good_id: bool = c is Dictionary and cd.get("id") is String
		var who: String = cd["id"] if good_id else "(ไม่มี ID)"
		if not good_id or _id_re.search(cd["id"]) == null:
			errors.append("%s: ID ผิดรูปแบบ" % who)
			continue
		if seen.has(cd["id"]):
			errors.append("%s: ID ซ้ำ" % who)
		seen[cd["id"]] = true
		var nm: Variant = cd.get("name")
		if not (nm is String) or nm.strip_edges() == "":
			errors.append("%s: ไม่มีชื่อ" % who)
		elif nm.length() > int(M["NAME_MAX"]) or _bad_name(nm):
			errors.append("%s: ชื่อยาวเกิน %s ตัวอักษร หรือมีอักขระต้องห้าม" % [who, _n(M["NAME_MAX"])])
		if not M["ROW_HINTS"].has(cd.get("rowHint")):
			errors.append("%s: แถวแนะนำผิด" % who)
		if not TRIBES.has(cd.get("tribe")):
			errors.append("%s: เผ่าหลัก \"%s\" ไม่มีในเกม" % [who, R.js_str_of(cd, "tribe")])
		var ex: Variant = cd.get("extraTribes")
		if not (ex is Array):
			errors.append("%s: เผ่าเพิ่มต้องเป็นรายการ" % who)
		else:
			for t in ex:
				if not TRIBES.has(t):
					errors.append("%s: เผ่าเพิ่ม \"%s\" ไม่มีในเกม" % [who, R.js_str(t)])
				if R.js_seq(t, cd.get("tribe")):
					errors.append("%s: เผ่าเพิ่มซ้ำกับเผ่าหลัก" % who)
		if ex is Array and ex.size() > 1:
			errors.append("%s: เผ่าเพิ่มได้ 1 เผ่า" % who)
		if not RARITIES.has(cd.get("rarity")):
			errors.append("%s: ความหายากผิด" % who)
		elif rl.get("shop") is Dictionary and rl["shop"].get("prices") is Dictionary and not R.js_seq(cd.get("price"), rl["shop"]["prices"].get(cd["rarity"])):
			errors.append("%s: ราคา %s ไม่ตรงกับความหายาก%s (%s)" % [who, R.js_str_of(cd, "price"), cd["rarity"], R.js_str_of(rl["shop"]["prices"], cd["rarity"])])
		for k in ["hp", "atk", "burn", "shock"]:
			if not is_lv3(cd.get(k)):
				errors.append("%s: %s ต้องมีค่า Lv1/2/3 เป็นตัวเลข ≥ 0" % [who, k])
		if cd.get("armorHit") != null and not is_lv3(cd["armorHit"]):
			errors.append("%s: เกราะ/ฮิต ต้องมีค่า Lv1/2/3 เป็นตัวเลข ≥ 0" % who)
		if cd.get("healHit") != null and not is_lv3(cd["healHit"]):
			errors.append("%s: ฟื้น/ฮิต ต้องมีค่า Lv1/2/3 เป็นตัวเลข ≥ 0" % who)
		if cd.get("armor") != null:
			errors.append("%s: ช่องเกราะเริ่มเอาออกแล้ว ใช้สกิล \"เริ่มแมตช์ → ได้เกราะ\" แทน" % who)
		if is_lv3(cd.get("hp")) and cd["hp"].any(func(v): return v <= 0):
			errors.append("%s: HP ต้องมากกว่า 0" % who)
		if not is_lv3(cd.get("cdMs")) or cd["cdMs"].any(func(v): return v <= 0):
			errors.append("%s: คูลดาวน์ต้องมีค่า Lv1/2/3 มากกว่า 0" % who)
		var mu: Variant = cd.get("multi")
		if not (mu is Array) or mu.size() != 3 or not mu.all(func(m): return R.is_int(m) and m >= 1 and m <= 10):
			errors.append("%s: มัลติฮิตต้องมีค่า Lv1/2/3 เป็นจำนวนเต็ม 1–10" % who)
		var sks: Variant = cd.get("skills")
		if not (sks is Array):
			errors.append("%s: รายการสกิลผิดรูปแบบ" % who)
		elif sks.size() > 6:
			errors.append("%s: สกิลเกิน 6 อัน" % who)
		else:
			for k in sks.size():
				check_skill(cd, sks[k], k, errors, rl)
	# summon: target exists, is not itself, has no summon of its own
	var by_id := {}
	for c in chars:
		if c is Dictionary and c.get("id") is String:
			by_id[c["id"]] = c
	for c in chars:
		if not (c is Dictionary) or not (c.get("skills") is Array):
			continue
		for k in c["skills"].size():
			var s: Variant = c["skills"][k]
			if not (s is Dictionary) or s.get("do") != "summon":
				continue
			var who := "%s สกิล %d" % [R.js_str_of(c, "id"), k + 1]
			var t: Variant = by_id[s["summon"]] if s.get("summon") is String and by_id.has(s["summon"]) else null
			if t == null:
				errors.append("%s: ต้องระบุตัวละครที่จะเรียก (ID ที่มีในเกม)" % who)
			elif R.js_seq(t["id"], c.get("id")):
				errors.append("%s: เรียกตัวเองไม่ได้" % who)
			elif t.get("skills") is Array and t["skills"].any(func(x): return x is Dictionary and x.get("do") == "summon"):
				errors.append("%s: %s มีสกิลเรียกตัวอยู่แล้ว เรียกต่อกันไม่ได้" % [who, t["id"]])
	# shop odds by shop level + round → shop level table
	if rl.get("shop") is Dictionary:
		var LO: Variant = rl["shop"].get("levelOdds")
		if not (LO is Array) or LO.is_empty() or not R.js_seq(float(LO.size()), rl["shop"].get("levels")):
			errors.append("ร้านค้า: ตารางโอกาสตามระดับร้านผิด")
		else:
			for i in LO.size():
				var o: Variant = LO[i]
				if not (o is Dictionary) or RARITIES.any(func(r): return not R.is_num(o.get(r)) or o[r] < 0):
					errors.append("ร้านค้า: ระดับร้าน %d มีโอกาสผิด" % (i + 1))
				elif not RARITIES.any(func(r): return o[r] > 0):
					errors.append("ร้านค้า: ระดับร้าน %d โอกาสรวมเป็น 0" % (i + 1))
		var RL: Variant = rl["shop"].get("roundLevels")
		if not (RL is Array) or RL.is_empty():
			errors.append("ร้านค้า: ตารางระดับร้านตามรอบผิด")
		else:
			var lo_n: float = float(LO.size()) if LO is Array else 0.0
			for i in RL.size():
				var v: Variant = RL[i]
				if not R.is_int(v) or v < 1 or v > lo_n:
					errors.append("ร้านค้า: รอบ %d ระดับร้านผิด (ต้องเป็น 1–%s)" % [i + 1, _n(lo_n) if LO is Array else "?"])
	# rune card odds by round
	var RO: Variant = rl.get("runeOdds")
	var ror: Variant = rl.get("runeOddsRounds")
	if RO is Array and (not R.is_int(ror) or ror < 1 or ror > RO.size()):
		errors.append("รูน: จำนวนรอบในตารางต้องเป็น 1–%d" % RO.size())
	if not (RO is Array) or RO.is_empty():
		errors.append("รูน: ตารางโอกาสการ์ดตามรอบผิด")
	else:
		var K := ["common", "rare", "legend"]
		for i in RO.size():
			var o: Variant = RO[i]
			if not (o is Dictionary) or K.any(func(k): return not R.is_num(o.get(k)) or o[k] < 0):
				errors.append("รูน: รอบ %d มีโอกาสผิด" % (i + 1))
			elif not K.any(func(k): return o[k] > 0):
				errors.append("รูน: รอบ %d โอกาสรวมเป็น 0" % (i + 1))
	# each tribe needs ≥ minPerTribe characters (extra tribes count)
	for t in TRIBES:
		var n := 0
		for c in chars:
			if c is Dictionary and (R.js_seq(c.get("tribe"), t) or (c.get("extraTribes") is Array and c["extraTribes"].has(t))):
				n += 1
		if n < rl["minPerTribe"]:
			errors.append("เผ่า%s: มี %d ตัว ต้องอย่างน้อย %s" % [t, n, _n(rl["minPerTribe"])])
	return {"ok": errors.is_empty(), "errors": errors, "warnings": warnings}

# /[\u0000-\u001f\u007f<>]/
static func _bad_name(s: String) -> bool:
	for ch in s:
		var c := ch.unicode_at(0)
		if c < 0x20 or c == 0x7f or ch == "<" or ch == ">":
			return true
	return false

static func check_skill(c: Dictionary, s0: Variant, k: int, errors: Array, rules: Dictionary) -> void:
	var M := R.mod("rules")
	var who := "%s สกิล %d" % [R.js_str_of(c, "id"), k + 1]
	# JS: !s || typeof s !== 'object' (an Array is an object with none of these keys)
	if not (s0 is Dictionary or s0 is Array):
		errors.append("%s: ผิดรูปแบบ" % who)
		return
	var s: Dictionary = s0 if s0 is Dictionary else {}
	var SPEC: Dictionary = M["SKILL_SPEC"]
	var DO_INFO: Dictionary = M["DO_INFO"]
	var by_when: Variant = SPEC[s["when"]] if s.get("when") is String and SPEC.has(s["when"]) else null
	if by_when == null:
		errors.append("%s: เงื่อนไข \"%s\" ไม่รู้จัก" % [who, R.js_str_of(s, "when").left(20)])
		return
	var tos: Variant = by_when[s["do"]] if s.get("do") is String and by_when.has(s["do"]) else null
	if tos == null:
		errors.append("%s: เงื่อนไข \"%s\" ใช้คู่กับผล \"%s\" ไม่ได้" % [who, s["when"], R.js_str_of(s, "do").left(20)])
		return
	var info: Dictionary = DO_INFO[s["do"]]
	if not tos.has(s.get("to")):
		errors.append("%s: ผล \"%s\" ใช้กับเป้า \"%s\" ไม่ได้" % [who, s["do"], R.js_str_of(s, "to").left(20)])
	if not is_lv3(s.get("v")):
		errors.append("%s: ค่าสกิลต้องมี Lv1/2/3" % who)
	if s.get("tags") != null and (not (s["tags"] is Array) or not _same_json(R.clean_tags(s["tags"]), s["tags"])):
		errors.append("%s: แท็กผิดรูปแบบ (ไม่เกิน 3 แท็ก แท็กละไม่เกิน 12 ตัวอักษร ไม่ซ้ำ)" % who)
	if s.get("cap") != null:
		errors.append("%s: เพดานครั้ง/แมตช์เอาออกจากเกมแล้ว (combat-rules V1.6)" % who)
	if s.get("chance") != null and (not R.is_num(s["chance"]) or s["chance"] <= 0 or s["chance"] > 100):
		errors.append("%s: โอกาสต้องอยู่ระหว่าง 1–100%%" % who)
	if info.get("of"):
		var o: Variant = s.get("of")
		if not (o is Dictionary) or not M["OF_STATS"].has(o.get("stat")) or not M["OF_WHO"].has(o.get("who")) or o.size() != 2:
			errors.append("%s: ต้องเลือก \"คิดจากค่า\" และ \"ของใคร\" ให้ถูกต้อง" % who)
		elif o["who"] == "ctx" and not M["CTX_WHEN"].get(s["when"]):
			errors.append("%s: เงื่อนไข \"%s\" ไม่มีเป้าหมาย/ผู้ตี ให้ใช้เป็น \"ของใคร\"" % [who, s["when"]])
	elif s.get("of") != null:
		errors.append("%s: ช่อง \"คิดจากค่า\" ใช้ได้เฉพาะผลแบบ %% ของ" % who)
	if s.get("to") == "allyAt":
		var a: Variant = s.get("at")
		if not (a is Dictionary) or not M["AT_ROWS"].has(a.get("row")) or not M["AT_LANES"].has(a.get("lane")) or a.size() != 2:
			errors.append("%s: เพื่อนตามตำแหน่ง ต้องเลือกแถวและเลน" % who)
	elif s.get("at") != null:
		errors.append("%s: ช่องตำแหน่งใช้ได้เฉพาะ \"เพื่อนตามตำแหน่ง\"" % who)
	if s.get("sameTribe") != null and (not (s["sameTribe"] is bool and s["sameTribe"]) or not R.same_tribe_ok(s)):
		errors.append("%s: \"เฉพาะเผ่าเดียวกัน\" ใช้ได้กับผู้รับฝ่ายเรา (ไม่รวมตัวเอง เพื่อนเผ่าเดียวกัน ตัวถัดไปที่ซื้อ และแบ่งเกราะ)" % who)
	if s.get("skipSameId") != null and (not (s["skipSameId"] is bool and s["skipSameId"]) or not R.skip_same_id_ok(s)):
		errors.append("%s: \"ไม่ให้ผลกับตัวอื่นที่ ID เดียวกัน\" ใช้ได้กับผู้รับฝ่ายเรา (ไม่รวมตัวเอง ตัวถัดไปที่ซื้อ และแบ่งเกราะ)" % who)
	if s.get("cdGrow") != null and (not R.is_int(s["cdGrow"]) or s["cdGrow"] < 1 or s["cdGrow"] > rules["cdGrowMax"] or s.get("cd") == null):
		errors.append("%s: คูลดาวน์สกิลเพิ่มต่อครั้ง ต้องเป็นจำนวนเต็ม 1–%s%% และต้องตั้งคูลดาวน์สกิลก่อน" % [who, _n(rules["cdGrowMax"])])
	if s.get("summon") != null and s.get("do") != "summon":
		errors.append("%s: ช่องตัวที่เรียกใช้ได้เฉพาะสกิลเรียกตัวมาสู้แทน" % who)
	if s.get("perm") != null:
		if not (s["perm"] is bool and s["perm"]):
			errors.append("%s: ช่องถาวรต้องเป็น true" % who)
		elif info.get("shop"):
			errors.append("%s: สกิลร้านค้าเป็นถาวรอยู่แล้ว ไม่ต้องติ๊กถาวร" % who)
		elif not info.get("perm"):
			errors.append("%s: ผล \"%s\" ตั้งเป็นถาวรไม่ได้ (ผลที่ใส่ศัตรู หรือผลเฉพาะชุด/ตอนล้ม)" % [who, s["do"]])
	if s.get("n") != null:
		errors.append("%s: \"ทุก N ชุด\" เอาออกแล้ว ใช้คูลดาวน์สกิลแทน" % who)
	if s.get("cd") != null and (not R.is_int(s["cd"]) or s["cd"] < 100 or s["cd"] > rules["skillCdMaxMs"]):
		errors.append("%s: คูลดาวน์สกิลต้องอยู่ระหว่าง 0.1–%s วิ" % [who, R.js_num(rules["skillCdMaxMs"] / 1000.0)])
	var lv: Variant = s.get("lv")
	if lv != null and (not (lv is Array) or lv.is_empty() or lv.size() > 3 or _uniq(lv) != lv.size() \
			or not lv.all(func(x): return R.is_int(x) and x >= 1 and x <= rules["maxLevel"])):
		errors.append("%s: เลเวลที่ใช้ได้ผิดรูปแบบ" % who)
	var heal: Array = rules["healTribes"] if rules.get("healTribes") is Array else []
	if info.get("heal"):
		var ts := [c.get("tribe")]
		var ex: Variant = c.get("extraTribes")
		if ex is Array:
			ts.append_array(ex)
		elif ex is String:
			for ch in ex:  # JS spreads a string into characters
				ts.append(ch)
		if not ts.any(func(t): return heal.has(t)):
			errors.append("%s: สกิลฟื้น HP ใช้ได้เฉพาะเผ่า%s" % [who, " และ ".join(heal)])

static func _uniq(a: Array) -> int:
	var d := {}
	for x in a:
		d[float(x) if R.is_num(x) else x] = true
	return d.size()

static func _same_json(a: Array, b: Array) -> bool:
	if a.size() != b.size():
		return false
	for i in a.size():
		if not R.js_seq(a[i], b[i]):
			return false
	return true

# One side's team · entries = [{ id, level, row, lane, perm }]
static func validate_team(entries: Variant, char_map: Dictionary, rules: Dictionary = {}) -> Dictionary:
	var rl := _rules(rules)
	var errors := []
	if not (entries is Array):
		return {"ok": false, "errors": ["ทีมต้องเป็นรายการ"]}
	if entries.size() > rl["maxBoard"]:
		errors.append("บนบอร์ดมีได้ไม่เกิน %s ตัว" % _n(rl["maxBoard"]))
	var slots := {}
	var keys := team_perm_keys()
	var caps: Dictionary = rl["permCaps"]
	for i in entries.size():
		var e: Variant = entries[i]
		var at := "ตัวที่ %d" % (i + 1)
		if not (e is Dictionary):
			errors.append("%s: ข้อมูลผิดรูปแบบ" % at)
			continue
		for k in e:
			if not ["id", "level", "row", "lane", "perm"].has(k):
				errors.append("%s: มีช่องแปลกปลอม \"%s\"" % [at, k])
		if not (e.get("id") is String) or not char_map.has(e["id"]):
			errors.append("%s: ไม่มีตัวละคร \"%s\"" % [at, R.js_str_of(e, "id").left(20)])
		if not R.is_int(e.get("level")) or e["level"] < 1 or e["level"] > rl["maxLevel"]:
			errors.append("%s: เลเวลต้องเป็น 1–%s" % [at, _n(rl["maxLevel"])])
		if not R.is_int(e.get("row")) or e["row"] < 0 or e["row"] >= rl["rows"]:
			errors.append("%s: แถวผิด" % at)
		if not R.is_int(e.get("lane")) or e["lane"] < 0 or e["lane"] >= rl["lanes"]:
			errors.append("%s: เลนผิด" % at)
		var key := "%s:%s" % [R.js_str_of(e, "row"), R.js_str_of(e, "lane")]
		if slots.has(key):
			errors.append("%s: ช่องซ้ำกับตัวอื่น" % at)
		slots[key] = true
		if e.get("perm") != null:
			var p: Variant = e["perm"]
			if not (p is Dictionary):
				errors.append("%s: ค่าถาวรผิดรูปแบบ" % at)
				continue
			for k in p:
				var v: Variant = p[k]
				if not keys.has(k):
					errors.append("%s: ค่าถาวร \"%s\" ไม่รู้จัก" % [at, k])
					continue
				if not R.is_num(v) or v < 0:
					errors.append("%s: ค่าถาวร %s ต้องเป็นตัวเลข ≥ 0" % [at, k])
					continue
				if caps.has(k) and v > caps[k]:
					errors.append("%s: ค่าถาวร %s = %s เกินเพดาน %s" % [at, k, _n(v), R.js_str(caps[k])])
				if not caps.has(k) and v > rl["permSanityMax"]:
					errors.append("%s: ค่าถาวร %s สูงผิดปกติ" % [at, k])
				if k == "multi" and not R.is_int(v):
					errors.append("%s: มัลติฮิตถาวรต้องเป็นจำนวนเต็ม" % at)
	return {"ok": errors.is_empty(), "errors": errors}
