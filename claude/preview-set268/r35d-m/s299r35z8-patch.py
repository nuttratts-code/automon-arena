# set 299 r35z8 (after s299r35z7): skill text brighter white + Thai WORD wrap
# wrap = Godot TextServer word breaks (ICU, Thai dictionary) → never cut inside a Thai word;
# a single word wider than the line still falls back to the old per-character wrap (_wrapch299).
# env S299WB=1 prints the word segments of one test sentence (check that the Thai dictionary is there).
import sys
p = sys.argv[1] if len(sys.argv) > 1 else r"D:\GitHub\automon-scratch\g286\scripts\ui\s286_team.gd"
s = open(p, encoding="utf-8").read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:70])
    s = s.replace(a, b)

rep('func _wrap299(t: String, fs: int, maxw: float) -> Array:   # Thai has no spaces',
'''func _wrap299(t: String, fs: int, maxw: float) -> Array:   # s299 r35z8: word wrap (ICU word breaks know Thai words)
	var f: Font = TH.font("body")
	var ts := TextServerManager.get_primary_interface()
	var br: PackedInt32Array = ts.string_get_word_breaks(t, "th")
	if OS.get_environment("S299WB") == "1" and not _wb299:
		_wb299 = true
		var segs := []
		for k in range(0, br.size(), 2): segs.append(t.substr(br[k], br[k + 1] - br[k]))
		print("S299WB server=%s segs=%s" % [ts.get_name(), " | ".join(segs)])
	var toks := []   # each token = the gap before a word + the word
	var prev := 0
	for k in range(0, br.size(), 2):
		toks.append(t.substr(prev, br[k + 1] - prev))
		prev = br[k + 1]
	if prev < t.length(): toks.append(t.substr(prev))
	var out := []
	var cur := ""
	for tk in toks:
		var cand: String = cur + tk
		if cur == "" or f.get_string_size(cand, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x <= maxw:
			cur = cand
		else:
			out.append(cur.strip_edges(false, true))
			cur = String(tk).strip_edges(true, false)
		if f.get_string_size(cur, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x > maxw:   # one word longer than the line
			var parts := _wrapch299(cur, fs, maxw)
			for q in parts.size() - 1: out.append(parts[q])
			cur = parts[parts.size() - 1]
	if cur.strip_edges() != "": out.append(cur.strip_edges(false, true))
	return out

func _wrapch299(t: String, fs: int, maxw: float) -> Array:   # Thai has no spaces''')
rep('var _dump299 := false\n', 'var _dump299 := false\nvar _wb299 := false\n')
rep('String(lines[i]), skfs, ink)', 'String(lines[i]), skfs, Color(1, 1, 1, 1))   # s299 r35z8: skill text full white')
open(p, "w", encoding="utf-8").write(s)
print("ok")

# r35z8b: ICU does not know game words (คูลดาวน์ → คู|ลดา|วน์) and breaks around symbols ("+ / 10", ") ").
# Keep game words whole, never break after + − ( / or before ) / % ,
s = open(p, encoding="utf-8").read()
rep('''	var toks := []   # each token = the gap before a word + the word
	var prev := 0
	for k in range(0, br.size(), 2):
		toks.append(t.substr(prev, br[k + 1] - prev))
		prev = br[k + 1]''',
'''	var nob := {}   # break positions not allowed
	for w in WORDS299:
		var at := t.find(w)
		while at >= 0:
			for q in range(at + 1, at + w.length()): nob[q] = true
			at = t.find(w, at + 1)
	for q in range(1, t.length()):
		if "+−-(/".contains(t.substr(q - 1, 1)) or ")/%,".contains(t.substr(q, 1)) or t.substr(q - 1, 1).is_valid_int() and t.substr(q, 1).is_valid_int(): nob[q] = true
	var toks := []   # each token = the gap before a word + the word
	var prev := 0
	for k in range(0, br.size(), 2):
		var e := br[k + 1]
		if nob.has(e) or e == prev: continue
		toks.append(t.substr(prev, e - prev))
		prev = e''')
rep('var _wb299 := false\n', 'var _wb299 := false\nconst WORDS299 := ["คูลดาวน์", "ดาเมจ", "มัลติฮิต", "ฮิต", "เกราะ", "ชนิด", "เดียวกัน"]   # game words ICU may split\n')
open(p, "w", encoding="utf-8").write(s)
print("ok b")

# r35z8c: never start a line with "·" or ")" (the gap before a word belongs to the next token)
s = open(p, encoding="utf-8").read()
rep('''		if nob.has(e) or e == prev: continue''', '''		if nob.has(e) or e == prev: continue
		var nx := t.substr(e).strip_edges(true, false)
		if nx.begins_with("·") or nx.begins_with(")"): continue''')
open(p, "w", encoding="utf-8").write(s)
print("ok c")
