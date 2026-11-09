import sys, os, json, base64
root, chars_json, out, extra_json = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
T = os.path.join(root, 'releases/Nov-2015')
bad = set(l.strip().lstrip('- ').split('/')[-1] for l in open(os.path.join(root,'TILES_UNDER_UNKNOWN_LICENSE.md')) if '.png' in l)
idx = {}
for d,_,fs in os.walk(T):
  for f in fs:
    if f.endswith('.png'): idx.setdefault(f[:-4], os.path.join(d,f))
PICK = {
'HL-1':'iron_troll juggernaut orc_warrior','HL-2':'deep_dwarf dwarf ironbrand_convoker','HL-3':'crystal_guardian guardian_golem orb_guardian',
'HL-7':'vault_warden vault_guard hell_knight','HL-4':'ironheart_preserver dwarf iron_imp','HL-5':'firespitter_statue salamander_firebrand fire_giant',
'HL-8':'ushabti obelisk stone_giant','HL-6':'iron_golem titan earth_elemental',
'PL-1':'salamander salamander_mystic crimson_imp','PL-2':'fire_elemental orb_of_fire fire_vortex1','PL-3':'salamander_stormcaller ball_lightning hellion',
'PL-7':'fire_bat caustic_shrike hell_hound','PL-4':'efreet salamander_firebrand orange_demon','PL-5':'fire_vortex2 hellwing sun_demon',
'PL-8':'hell_wizard_100 necromancer deep_elf_sorcerer','PL-6':'balrug brimstone_fiend fire_giant',
'SF-1':'tengu_conjurer deep_elf_conjurer salamander_stormcaller','SF-2':'death_yak yak catoblepas','SF-3':'electric_golem fulminant_prism2 crystal_guardian',
'SF-7':'fulminant_prism1 battlesphere ball_lightning','SF-4':'reaper shadow_wraith executioner','SF-5':'raiju shock_serpent blue_devil',
'SF-8':'ball_lightning maelstrom1 spatial_vortex1','SF-6':'storm_dragon titan golden_dragon',
'WY-1':'tengu_warrior harpy deep_elf_master_archer','WY-2':'air_elemental twister2 insubstantial_wisp','WY-3':'griffon manticore wolf',
'WY-7':'hippogriff harpy caustic_shrike','WY-4':'twister1 maelstrom2 tengu_reaver','WY-5':'spriggan_defender tengu_reaver air_elementalist_statue',
'WY-8':'spriggan_air_mage butterfly ghost_moth','WY-6':'quicksilver_dragon wyvern golden_dragon',
'PT-1':'cherub dryad water_nymph','PT-2':'treant briar_patch thorn_hunter','PT-3':'faun satyr siren',
'PT-7':'daeva apis ghost_moth','PT-4':'deep_elf_high_priest spriggan_druid shining_eye','PT-5':'insubstantial_wisp shining_eye ophan',
'PT-8':'angel ophan cherub','PT-6':'seraph dryad siren',
'WN-1':'gnoll hobgoblin orc_knight','WN-2':'vampire vampire_mosquito necrophage','WN-3':'flesh_golem abomination_large ogre',
'WN-7':'red_devil blood_saint hell_beast','WN-4':'gnoll_shaman deep_troll_shaman orc_priest','WN-5':'eye_of_devastation chaos_spawn1 giant_eyeball',
'WN-8':'tormentor executioner torturous','WN-6':'ancient_lich bone_dragon shadow_fiend',
}
RUNES = {
'T1':'item/gold/10 gozag_bribe_branch zin_donate','T2':'item/gold/25 gozag_potion_petition item/gold/05','T3':'gozag_call_merchant find_stash add_waypoint',
'T4':'recall dispersal cantrip','X8':'ru_sacrifice_health ru_sacrifice_love misc/icons/heart','X2':'gravitas apportation enslavement',
'X3':'monstrous_menagerie hydra_form infusion','T5':'sure_blade long_blades song_of_slaying','T6':'skills/shields stoneskin statue_form',
'T7':'skills/bows skills/throwing portal_projectile','U3':'spells/enchantment/haste haste_other skills/dodging','U5':'spells/fire/sticky_flame flame_tongue throw_flame',
'U6':'blade_hands chain_lightning tukimas_dance','S1':'skills/fighting ru_sacrifice_durability sublimation_of_blood','S2':'skills/armour ozocubus_armour condensation_shield',
'S3':'fireball conjure_flame ring_of_flames','S4':'spells/air/shock static_discharge lightning_bolt','S5':'tornado dazzling_spray magic_dart',
'S6':'regeneration summon_forest elyvilon_heal_other','S7':'skills/unarmed_combat skills/maces_flails ru_power_leap','S8':'berserker_rage skills/axes ru_draw_out_power',
'S9':'swiftness cloud_cone airstrike','X1':'vampiric_draining bolt_of_draining brain_feed','X10':'spells/enchantment/slow freeze ensorcelled_hibernation',
'X11':'corpse_rot mephitic_cloud lees_rapid_deconstruction','D':'polymorph skills/transmutations beastly_appendage','F':'qazlal_elemental_force qazlal_disaster_area olgrebs_toxic_radiance',
'T8':'tso_bless_weapon beogh_gift call_canine_familiar','T9':'orb_of_destruction iskenderuns_mystic_blast searing_ray','T10':'spells/necromancy/deaths_door ru_apocalypse ru_sacrifice_eye',
'T11':'ru_sacrifice_experience dragon_form summon_hydra','T12':'shatter lehudibs_crystal_spear force_lance','X5':'summon_guardian_golem skills/earth_magic petrify',
'U2':'twisted_resurrection animate_dead borgnjors_revivification','X4':'phase_shift disjunction invisibility','U4':'deflect_missiles repel_missiles mass_abjuration',
'X6':'passage_of_golubria shroud_of_golubria cigotuvis_embrace','X7':'spectral_weapon warp_weapon call_imp','U7':'metabolic_englaciation ru_sacrifice_purity skills/staves',
'U8':'dithmenos_shadow_form simulacrum summon_shadow_creatures','X9':'display_map summon_eyeballs darkness',
}
BOSSES = {'B1':'hell_sentinel iron_elemental vault_sentinel','B2':'shadow silent_spectre phantom','B3':'abomination_large3 chaos_spawn3 lurking_horror','B4':'orange_crystal_statue spatial_vortex2 glowing_shapeshifter'}
gidx = {}
for d,_,fs in os.walk(os.path.join(T,'gui')):
  for f in fs:
    if f.endswith('.png'): gidx.setdefault(f[:-4], os.path.join(d,f))
def icon(n):
  if '/' in n:
    p = os.path.join(T, n + '.png')
    if not os.path.exists(p): p = os.path.join(T, 'gui', n + '.png')
  else: p = gidx.get(n)
  if not p or not os.path.exists(p): raise SystemExit('missing icon: '+n)
  if os.path.basename(p)[:-4] in bad: raise SystemExit('unknown-licence icon: '+n)
  used.add(p); return 'data:image/png;base64,'+base64.b64encode(open(p,'rb').read()).decode()
SCENES = [
 ('shop','หน้าร้านค้า',[('pebble_brown0','brick_brown0'),('grass0','brick_brown-vines1')]),
 ('arena','สนามสู้',[('sandstone_floor0','sandstone_wall0'),('lair0','lab-rock0')]),
 ('result','หน้าจบแมตช์ / จบ run',[('marble_floor1','marble_wall1'),('crystal_floor0','crystal_wall_blue')]),
]
UI = {'ทอง':'01','หัวใจ':'heart'}
used = set(); data = {}

def b64(n):
  if n in bad: raise SystemExit('unknown-licence tile: '+n)
  if n not in idx: raise SystemExit('missing tile: '+n)
  used.add(idx[n])
  return 'data:image/png;base64,'+base64.b64encode(open(idx[n],'rb').read()).decode()
img = {}
for k,v in PICK.items():
  for n in v.split(): img[n]=b64(n)
for _,_,opts in SCENES:
  for f,w in opts: img[f]=b64(f); img[w]=b64(w)
gold = os.path.join(T,'item/gold/01.png'); img['_gold']='data:image/png;base64,'+base64.b64encode(open(gold,'rb').read()).decode()
img['heart']=b64('heart')
for k,v in RUNES.items():
  for n in v.split(): img['r:'+n]=icon(n)
for k,v in BOSSES.items():
  for n in v.split(): img[n]=b64(n)
chars = json.load(open(chars_json)); extra = json.load(open(extra_json))
tpl = open(os.path.join(os.path.dirname(__file__),'tpl.html'), encoding='utf-8').read()
payload = json.dumps({'img':img,'pick':{k:v.split() for k,v in PICK.items()},'chars':chars,'scenes':SCENES,'runePick':{k:['r:'+n for n in v.split()] for k,v in RUNES.items()},'bossPick':{k:v.split() for k,v in BOSSES.items()},'runes':extra['runes'],'bosses':extra['bosses']}, ensure_ascii=False)
open(out,'w',encoding='utf-8').write(tpl.replace('/*DATA*/null', payload))
print('tiles', len(img), 'bytes', os.path.getsize(out))
print('\n'.join(sorted(os.path.relpath(p,T) for p in used)), file=open(out+'.files.txt','w'))
