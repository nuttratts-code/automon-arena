# set 216 R1: battle sample — top = two team HP bars meeting at a clock plate (B2 new) · bottom = one speed button that cycles
import sys, os
g = sys.argv[1]

def sub(path, pairs):
    p = os.path.join(g, path)
    t = open(p, encoding="utf-8").read()
    for a, b in pairs:
        a = a.replace("    ", "\t"); b = b.replace("    ", "\t")
        assert a in t, (path, a[:70])
        t = t.replace(a, b, 1)
    open(p, "w", encoding="utf-8", newline="\n").write(t)

OLD_HUD = """    hud.custom_minimum_size.y = 36
    hud.add_theme_constant_override("separation", 10)
    title = TH.label("", 15, "ink", "display")
    title.name = "Title"
    title.size_flags_vertical = Control.SIZE_SHRINK_CENTER
    hud.add_child(title)
    replay_tag = TH.label(TH.ui_text("watching_replay"), 13, "accent", "body_b")
    replay_tag.name = "ReplayTag"
    replay_tag.size_flags_vertical = Control.SIZE_SHRINK_CENTER
    hud.add_child(replay_tag)
    var sp := Control.new()
    sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    hud.add_child(sp)
    clock = TH.label(TH.ui_text("t_sec", {"t": "0.0"}), 15, "ink", "mono")
    clock.name = "Clock"
    clock.size_flags_vertical = Control.SIZE_SHRINK_CENTER
    hud.add_child(clock)
"""
NEW_HUD = """    hud.custom_minimum_size.y = 40
    hud.add_theme_constant_override("separation", 10)
    title = TH.label("", 13, "ink", "body_b")
    title.name = "Title"
    replay_tag = TH.label(TH.ui_text("watching_replay"), 13, "accent", "body_b")
    replay_tag.name = "ReplayTag"
    hud.add_child(_team_bar(0, TH.label("ทีมคุณ", 13, "ink", "body_b"), replay_tag))
    var cp := PanelContainer.new()
    cp.name = "ClockPlate"
    var cs := TH.box(Color(TH.c("panel"), 0.9), TH.c("line"), 6, 1, 10, 3)
    TH.ledge(cs, false)
    cp.add_theme_stylebox_override("panel", cs)
    cp.size_flags_vertical = Control.SIZE_SHRINK_CENTER
    clock = TH.label(TH.ui_text("t_sec", {"t": "0.0"}), 15, "ink", "mono")
    clock.name = "Clock"
    clock.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    clock.custom_minimum_size.x = 64
    cp.add_child(clock)
    hud.add_child(cp)
    hud.add_child(_team_bar(1, title, null))
"""

NEW_FUNCS = """
# SAMPLE set 216: team HP bar (you = left, fills from the clock outward; foe = right) — total HP of the living side
var _tb_bar := [null, null]
var _tb_num := [null, null]
func _team_bar(side: int, name_l: Label, extra_l: Variant) -> Control:
    var v := VBoxContainer.new()
    v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    v.add_theme_constant_override("separation", 2)
    var row := HBoxContainer.new()
    row.add_theme_constant_override("separation", 8)
    var num := TH.label("", 13, "mute", "mono")
    var sp := Control.new()
    sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    if side == 0:
        row.add_child(name_l)
        if extra_l != null:
            row.add_child(extra_l)
        row.add_child(sp)
        row.add_child(num)
    else:
        row.add_child(num)
        name_l.clip_text = true
        name_l.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
        name_l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
        name_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
        row.add_child(name_l)
    v.add_child(row)
    var pb := ProgressBar.new()
    pb.show_percentage = false
    pb.custom_minimum_size.y = 12
    pb.max_value = 1.0
    pb.step = 0.0
    pb.value = 1.0
    pb.fill_mode = ProgressBar.FILL_END_TO_BEGIN if side == 0 else ProgressBar.FILL_BEGIN_TO_END
    var bg := TH.box(Color(TH.c("bg"), 0.8), TH.c("line"), 3, 1, 0, 0)
    var fg := TH.box(TH.c("ok" if side == 0 else "bad"), Color(0, 0, 0, 0), 3, 0, 0, 0)
    pb.add_theme_stylebox_override("background", bg)
    pb.add_theme_stylebox_override("fill", fg)
    v.add_child(pb)
    _tb_bar[side] = pb
    _tb_num[side] = num
    return v

func _process(_d: float) -> void:
    if not visible or view == null or _tb_bar[0] == null:
        return
    var hp := [0.0, 0.0]
    var mx := [0.0, 0.0]
    for u in view.units.values():
        hp[int(u["side"])] += maxf(0.0, float(u["hp"]))
        mx[int(u["side"])] += float(u["maxHp"])
    for s in 2:
        (_tb_bar[s] as ProgressBar).value = hp[s] / mx[s] if mx[s] > 0.0 else 0.0
        (_tb_num[s] as Label).text = "%s/%s" % [fmt_n(hp[s]), fmt_n(mx[s])]

func _cycle_speed() -> void:
    var i := SPEEDS.find(int(app.speed))
    speed_changed.emit(SPEEDS[(i + 1) % SPEEDS.size()])

func _slide_dummy() -> void:
    pass
"""

OLD_SPEED = """    for sp in SPEEDS:
        var b := Button.new()
        b.name = "Speed%d" % sp
        b.text = "%d×" % sp
        b.toggle_mode = true
        b.custom_minimum_size = Vector2(44, 44)
        b.pressed.connect(func() -> void: speed_changed.emit(sp))
        h.add_child(b)
        speed_btns[sp] = b
"""
NEW_SPEED = """    var sb := Button.new()
    sb.name = "SpeedCycle"
    sb.text = "เร็ว 1×"
    sb.custom_minimum_size = Vector2(72, 44)
    sb.tooltip_text = "แตะเพื่อเปลี่ยนความเร็ว 1× → 2× → 4× → 8× → 16×"
    sb.pressed.connect(_cycle_speed)
    h.add_child(sb)
    speed_btns[0] = sb
"""

sub("scripts/ui/battle.gd", [
    (OLD_HUD, NEW_HUD),
    (OLD_SPEED, NEW_SPEED),
    ("""    for sp in speed_btns:
        speed_btns[sp].set_pressed_no_signal(sp == v)
""", """    if speed_btns.has(0):
        (speed_btns[0] as Button).text = "เร็ว %d×" % v
"""),
    ("func _rune_btn(nm: String) -> Button:", NEW_FUNCS + "\nfunc _rune_btn(nm: String) -> Button:"),
])
print("ok battle")
