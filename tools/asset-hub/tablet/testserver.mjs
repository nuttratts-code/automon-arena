// Local test harness for hub-tablet.html: serves the page with a mock window.claude (db + assets in memory).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const REPO = process.env.REPO || "D:/GitHub/automon-arena";
const pics = JSON.parse(fs.readFileSync(path.join(DIR, 'pics.json'), 'utf8'));
const byId = Object.fromEntries(pics.pics.map((p) => [p.asset, path.join(REPO, p.srcFile)]));
const up = new Map();
const MOCK = `<script>
(() => {
  const store = { edits: new Map(), palettes: new Map() }; const subs = { edits: [], palettes: [] };
  const snap = (c) => ({ docs: [...store[c]].map(([id, v]) => ({ id, exists: true, data: () => JSON.parse(JSON.stringify(v)) })) });
  const fire = (c) => subs[c].forEach((f) => setTimeout(() => f(snap(c)), 30));
  const coll = (c) => ({ onSnapshot(f) { subs[c].push(f); setTimeout(() => f(snap(c)), 200); return () => {}; },
    async add(d) { const id = Math.random().toString(36).slice(2); store[c].set(id, d); fire(c); return { id }; } });
  const db = { collection: coll, doc(p) { const [c, id] = p.split('/'); return { async set(d) { store[c].set(id, d); fire(c); } }; } };
  const assets = { async upload(b) { const r = await fetch('/_up', { method: 'POST', body: b }); return r.json(); } };
  window.__store = store;
  window.claude = { use: async (n) => (n === 'db' ? db : n === 'assets' ? assets : null) };
})();
</script>`;
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end('<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">' + MOCK + '</head><body>' + fs.readFileSync(path.join(DIR, 'hub-tablet.html'), 'utf8') + '</body></html>'); }
  if (u.pathname === '/pics.json') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(fs.readFileSync(path.join(DIR, 'pics.json'))); }
  if (u.pathname === '/_up' && req.method === 'POST') { const ch = []; req.on('data', (c) => ch.push(c)); req.on('end', () => { const id = crypto.randomBytes(16).toString('hex'); up.set(id, Buffer.concat(ch)); fs.writeFileSync(path.join(DIR, 'last_upload.png'), Buffer.concat(ch)); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id, url: '/_blob/' + id, sizeBytes: 1, contentType: 'image/png' })); }); return; }
  const m = /^\/_blob\/([0-9a-f]{32})$/.exec(u.pathname);
  if (m) { const b = up.get(m[1]) || (byId[m[1]] && fs.readFileSync(byId[m[1]])); if (b) { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(b); } }
  res.writeHead(404); res.end();
}).listen(5199);
