# src/core/shop.js port — so far only the result helpers + loseGuard that runrunes.gd needs (set 195, step 6c).
# The rest of shop.js (newRun, buy/sell/merge/move, startRound, endMatch…) comes in plan step 6d. A change in shop.js must be made here too.
extends RefCounted

static func fail(msg: String) -> Dictionary:
	return {"ok": false, "msg": msg}

static func done(msgs: Array = []) -> Dictionary:
	return {"ok": true, "msgs": msgs}

# G1 second chance: hearts would hit 0 (once per run) → 1 heart back + a legend rune pick
static func lose_guard(st: Dictionary, msgs: Array = []) -> bool:
	if float(st.get("hearts", 0.0)) > 0.0 or _truthy(st.get("sc")):
		return false
	st["hearts"] = 1.0
	st["sc"] = 1.0
	msgs.append("โอกาสสุดท้าย! ได้หัวใจคืน 1 ดวง + เลือกรูนตำนานฟรี 1 อัน (ครั้งเดียวต่อ run)")
	return true

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
