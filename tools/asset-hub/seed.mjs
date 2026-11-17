// Seed / refresh art/hub/hub.json (set 240, owner D1): every character from src/core/characters.js +
// the stills / cut-outs / idle sheets already in art/library/pictures/sprites/ as rounds (pointing at the library, no copies).
// Safe to re-run: existing items, rounds, notes and shadows are kept; only missing ones are added.
// Run: node tools/asset-hub/seed.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { emptyHub, validateHub } from './server.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const HUB_FILE = path.join(ROOT, 'art', 'hub', 'hub.json');
const SPRITES = path.join(ROOT, 'art', 'library', 'pictures', 'sprites');
const LIC = 'AI placeholder - UNVERIFIED';

const TRIBE_EN = { 'เหล็กกล้า': 'steel', 'เพลิงเผา': 'fire', 'สายฟ้า': 'storm', 'วายุ': 'wind', 'ภูติ': 'spirit', 'อสูร': 'demon' };
const TRIBE_LOOK = {
  steel: 'boxy plate armour, broad shoulders, shield-like plates, rivets',
  fire: 'shapes pointing upward, horns, flame crests',
  storm: 'diamond shapes, zigzag spikes, lean and fast',
  wind: 'round flowing shapes, cloak-like membranes, wings, feathers',
  spirit: 'floating, runes, magic rings, hexagon patterns',
  demon: 'pentagon-shaped heavy body, curved horns, thick spikes, glowing eyes',
};
// species the owner already chose (claude/art-style.md §6, sets 227–228)
const SPECIES = {
  'HL-1': 'young iron-shell crab brawler',
  'WY-1': 'young small hawk',
  'WN-1': 'young demon boar fighter',
  'PT-1': 'young glowing night moth',
  'PL-1': 'young ember lynx with tufted fire ears',
  'SF-1': 'young storm beetle with a forked lightning-rod horn',
};
const RARITY_EN = { 'ธรรมดา': 'common', 'ไม่ธรรมดา': 'uncommon', 'หายาก': 'rare', 'หายากมาก': 'epic', 'ตำนาน': 'legendary' };

function starterPrompt() {
  const md = fs.readFileSync(path.join(ROOT, 'claude', 'art-style.md'), 'utf8');
  const m = /```\nYou are helping me paint ORIGINAL creatures[\s\S]*?```/.exec(md);
  return m ? m[0].replace(/^```\n/, '').replace(/\n```$/, '') : '';
}

function form1Prompt(id, tribe, rarity) {
  const bg = tribe === 'wind' ? 'magenta #FF00FF' : 'pure green #00FF00';
  if (id === 'WN-1') return [
    'FORM 1. Character: WN-1 — young demon boar fighter (common: simple, few ornaments)',
    'Tribe: demon — make the demon identity obvious: short thick curved horns, ridge of short dark spikes, cracked oxblood-red plates on shoulders/forehead with ember-orange veins, small pentagon rune on the shoulder plate',
    'Face: confident and a little cheeky — not scary',
    'Effect spots: glowing ember eyes + ember veins in the horn cracks',
    'Pose: ready stance, feet planted',
    'Background: pure green #00FF00',
  ].join('\n');
  return [
    `FORM 1. Character: ${id} — ${SPECIES[id]} (${rarity}: simple, few ornaments)`,
    `Tribe: ${tribe} — make the ${tribe} identity obvious: ${TRIBE_LOOK[tribe]}`,
    `Fantasy features: [2-3 magical features in ${tribe} colours]`,
    'Face: confident — not scary',
    'Effect spots: [1-2 spots]',
    `Pose: ready stance, ${tribe === 'spirit' ? 'hovering' : 'feet planted'}`,
    `Background: ${bg}`,
  ].join('\n');
}

// library file name → round fields
function roundFromFile(f) {
  const m = /^([A-Z]{2}-\d)_(.+)$/.exec(f);
  if (!m) return null;
  const [, id, rest] = m;
  const date = (/(\d{4}-\d{2}-\d{2})/.exec(rest) || [])[1] || '';
  const base = { id: 'r' + Buffer.from(f).toString('base64url').slice(-10), file: 'lib/pictures/sprites/' + f, orig: f, t: date ? date + 'T00:00:00.000Z' : '', by: 'owner', note: '', star: false, archived: false, licence: LIC, form: 1 };
  let sh;
  if ((sh = /^idle(\d+)_sheet_(\d+)x(\d+)_(\d+)x(\d+)_/.exec(rest))) {
    const n = Number(sh[1]);
    const ms = n >= 32 ? 91 : /_g\.png$|_s2\.png$/.test(rest) ? 250 : 190;
    return { item: id, r: { ...base, slot: 'frames', move: 'idle', by: 'claude', meta: { cols: +sh[2], rows: +sh[3], fw: +sh[4], fh: +sh[5], n, ms } } };
  }
  if (/^still2?_(gemini|veo)_|^still_paint_gemini_/.test(rest)) return { item: id, r: { ...base, slot: 'still', tool: rest.includes('veo') ? 'Veo frame' : 'Gemini' } };
  if (/^still2?_px|^still_paint_cut_/.test(rest)) return { item: id, r: { ...base, slot: 'cut', by: 'claude' } };
  if (/\.pxo$/.test(rest)) return { item: id, r: { ...base, slot: 'file', move: 'idle', note: 'Pixelorama save' } };
  return null; // apng previews are duplicates of the sheets
}

// the final picks recorded in claude/idle-picks.csv
const STAR = new Set([
  'HL-1_idle8_sheet_8x1_96x81_2026-11-14_v2.png', 'PL-1_idle8_sheet_8x1_140x103_2026-11-14_g.png',
  'SF-1_idle8_sheet_8x1_142x124_2026-11-14_g.png', 'WY-1_idle8_sheet_8x1_93x90_2026-11-14.png',
  'WN-1_idle32_sheet_32x1_236x153_2026-11-15.png', 'WN-1_still_paint_gemini_2026-11-15.jpg', 'WN-1_still_paint_cut_1014x704_2026-11-15.png',
  'HL-1_still_gemini_2026-11-14.jpg', 'PL-1_still2_veo_2026-11-14.jpg', 'SF-1_still2_gemini_2026-11-14.jpg',
  'WY-1_still_px_none', 'PT-1_still_gemini_2026-11-14.jpg',
]);

async function main() {
  const { ROWS } = await import(pathToFileURL(path.join(ROOT, 'src', 'core', 'characters.js')).href);
  const hub = fs.existsSync(HUB_FILE) ? JSON.parse(fs.readFileSync(HUB_FILE, 'utf8')) : emptyHub();
  if (!hub.settings.starter) hub.settings.starter = starterPrompt();
  let added = 0, rounds = 0;
  for (const row of ROWS) {
    const [id, name, tribeTh, tribe2Th, rarityTh] = row;
    if (!hub.items[id]) {
      const tribe = TRIBE_EN[tribeTh] || 'steel';
      const it = { id, kind: 'character', name, tribe, tribe2: TRIBE_EN[tribe2Th] || '', rarity: RARITY_EN[rarityTh] || rarityTh, prompts: [], rounds: [], notes: '', inGame: false, shadow: null };
      if (SPECIES[id]) it.prompts.push({ id: 'p1', t: new Date().toISOString(), by: 'claude', form: 1, text: form1Prompt(id, tribe, it.rarity) });
      hub.items[id] = it; added++;
    }
  }
  for (const f of fs.readdirSync(SPRITES).sort()) {
    const x = roundFromFile(f);
    if (!x || !hub.items[x.item]) continue;
    const it = hub.items[x.item];
    if (it.rounds.some((r) => r.file === x.r.file)) continue;
    if (STAR.has(f)) { x.r.star = true; x.r.library = x.r.file; }
    it.rounds.push(x.r); rounds++;
  }
  const err = validateHub(hub);
  if (err.length) throw new Error(err.join('\n'));
  hub.rev = (hub.rev || 0) + 1;
  fs.mkdirSync(path.dirname(HUB_FILE), { recursive: true });
  fs.writeFileSync(HUB_FILE, JSON.stringify(hub, null, 1) + '\n');
  console.log(`seed: +${added} items, +${rounds} rounds → ${path.relative(ROOT, HUB_FILE)}`);
}

main();
