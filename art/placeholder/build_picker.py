import sys, os, json, base64
root, chars_json, out = sys.argv[1], sys.argv[2], sys.argv[3]
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
chars = json.load(open(chars_json))
tpl = open(os.path.join(os.path.dirname(__file__),'tpl.html'), encoding='utf-8').read()
payload = json.dumps({'img':img,'pick':{k:v.split() for k,v in PICK.items()},'chars':chars,'scenes':SCENES}, ensure_ascii=False)
open(out,'w',encoding='utf-8').write(tpl.replace('/*DATA*/null', payload))
print('tiles', len(img), 'bytes', os.path.getsize(out))
print('\n'.join(sorted(os.path.relpath(p,T) for p in used)), file=open(out+'.files.txt','w'))
