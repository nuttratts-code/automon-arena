# set 307 card frames j (owner A1/B1/C1): the shop card frame uses card_frame_<rarity token>.png (S307j-frames.py) and the
# sample shop can show one card per rarity (S307RAR = "id/id/id/id/id", sample only). Usage: python s307frame-patch.py <g286>
import sys, os, shutil
g = sys.argv[1]
def patch(rel, pairs):
    p = os.path.join(g, rel)
    if not os.path.exists(p + ".s307frame"): shutil.copy(p, p + ".s307frame")
    s = open(p, encoding="utf-8", newline="").read()
    for old, new in pairs:
        if new in s: continue
        assert old in s, (rel, old[:60]); s = s.replace(old, new, 1)
    open(p, "w", encoding="utf-8", newline="").write(s); print(rel, "ok")
patch("scripts/ui/r43.gd", [
 ('static func _card(ci: Control, tex: Texture2D, nm: String, price: int, cols: Array, ts: Array, pl: Array, cant: bool, owned: bool) -> void:\n',
  'const RAR307 := {"ธรรมดา": "mute", "ไม่ธรรมดา": "r-unc", "หายาก": "r-rare", "หายากมาก": "r-epic", "ตำนาน": "r-legend"}   # set 307 j\n\n'
  'static func _card(ci: Control, tex: Texture2D, nm: String, price: int, cols: Array, ts: Array, pl: Array, cant: bool, owned: bool, rar: String = "") -> void:\n'),
 ('\t_nine(ci, _tex("card_frame"), r, 30.0, 0.21, Color(1, 1, 1, fa))   # r49: frame + strip over the creature\n',
  '\t_nine(ci, _tex("card_frame_" + str(RAR307[rar]) if RAR307.has(rar) else "card_frame"), r, 30.0, 0.21, Color(1, 1, 1, fa))   # r49: frame + strip over the creature · set 307 j: frame colour = rarity (owner A1)\n'),
 ('_card(vc, tex, str(c["name"]), int(float(c["price"])), cols, ts, pl, cant, owned))',
  '_card(vc, tex, str(c["name"]), int(float(c["price"])), cols, ts, pl, cant, owned, str(c.get("rarity", ""))))'),
])
patch("scripts/ui/prep.gd", [
 ('func render() -> void:\n',
  'func render() -> void:\n'
  '\tif OS.get_environment("S307RAR") != "":   # set 307 j (owner C1, sample only): one shop card per rarity\n'
  '\t\tvar ids307 := OS.get_environment("S307RAR").split("/")\n'
  '\t\tfor i307 in mini(ids307.size(), (P()["shop"] as Array).size()): P()["shop"][i307]["id"] = ids307[i307]\n'),
])
