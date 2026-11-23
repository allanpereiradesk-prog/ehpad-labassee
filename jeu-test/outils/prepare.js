/* Prépare le monde du jeu à partir d'une maquette Blender exportée par Allan BIM.
   Usage : node prepare.js "<dossier de la maquette>" <fichier de sortie jeu_monde.js> [--cartes dossier] */
const fs = require('fs'), vm = require('vm'), zlib = require('zlib'), path = require('path');
const Monde = require('../jeu/monde.js');
const dir = process.argv[2], out = process.argv[3], ci = process.argv.indexOf('--cartes'), maps = ci > 0 ? process.argv[ci + 1] : null;
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(dir, 'donnees.js'), 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(path.join(dir, 'modele.js'), 'utf8'), ctx);
const D = ctx.window.MAQ_DATA, bin = zlib.gunzipSync(Buffer.from(ctx.window.MAQ_MODEL, 'base64'));
const ab = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length);
const vb = D.vcount * 6, a0 = vb + (4 - vb % 4) % 4;
const POS = new Uint16Array(ab, 0, D.vcount * 3), IDX = new Uint32Array(ab, a0 + D.vcount * 4, D.icount);
const lo = D.lo, sc = [0, 1, 2].map(k => (D.hi[k] - D.lo[k]) / 65535);
const V = i => D.vals[i], DISC = ['CVC', 'ARC', 'STR', 'SITE'], cat = e => V(D.el[e][3]) || '';
const soups = [], boxes = new Map(); let bb = [1e9, 1e9, -1e9, -1e9];
const STAIR = /^(Escalier|Volées|Paliers)$/;
const isDoor = e => cat(e) === 'Portes' || /PORTE AUTOMATIQUE/i.test(V(D.el[e][2]) || '');
const CONF = { exitId: 6419862, openIds: [7029171], escape: [-46.5, 46.3, -42.2, 49.0], win: [-47, 45, -43.4, 50] };   // EHPAD La Bassée : sas d'entrée
for (const g of D.groups) {
  if (g.kind === 'E' || g.d === 'SITE' || g.d === 'STR') continue;
  for (const p of g.parts) {
    const e = p[0], c = cat(e), d = DISC[D.el[e][1]];
    if (d === 'CVC' && c !== 'Equipement de génie climatique') continue;
    const n = p[4], f = new Float32Array(n * 3); let b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (let i = 0; i < n; i++) { const v = (g.v0 + IDX[g.i0 + p[3] + i]) * 3; for (let k = 0; k < 3; k++) { const w = lo[k] + POS[v + k] * sc[k]; f[i * 3 + k] = w; if (w < b[k]) b[k] = w; if (w > b[k + 3]) b[k + 3] = w; } }
    if (d === 'ARC') { if (b[0] < bb[0]) bb[0] = b[0]; if (b[1] < bb[1]) bb[1] = b[1]; if (b[3] > bb[2]) bb[2] = b[3]; if (b[4] > bb[3]) bb[3] = b[4]; }
    if (isDoor(e) || STAIR.test(c)) { const k = (STAIR.test(c) ? 'S' : 'P') + e; const q = boxes.get(k); if (!q) boxes.set(k, b); else for (let j = 0; j < 3; j++) { q[j] = Math.min(q[j], b[j]); q[j + 3] = Math.max(q[j + 3], b[j + 3]); } }
    soups.push(f);
  }
}
bb = [Math.floor(bb[0] - 4), Math.floor(bb[1] - 4), Math.ceil(bb[2] + 4), Math.ceil(bb[3] + 4)];
let t = Date.now(); const W = Monde.raster(soups, bb); console.log('grille', W.nx, 'x', W.ny, Date.now() - t, 'ms', 'zone', bb.join(' '));
for (const [k, b] of boxes) { const e = +k.slice(1); if (k[0] === 'P') W.doors.push(Monde.door(e, D.el[e][0], b)); else W.stairs.push(b.map(v => Math.round(v * 100) / 100)); }
const packed = Monde.pack(W, { conf: CONF, rooms: D.rooms });
const gz = zlib.gzipSync(packed, { level: 9 });
fs.writeFileSync(out, 'window.JEU_MONDE="' + gz.toString('base64') + '";\n');
console.log('portes', W.doors.length, 'escaliers', W.stairs.length, 'fichier', (fs.statSync(out).size / 1024).toFixed(0), 'Ko');
if (maps) {
  const W2 = Monde.unpack(packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.length)); Monde.arena(W2);
  console.log('liens', JSON.stringify(W2.links.map(l => [l.la, l.lb, l.a.map(v => +v.toFixed(1)), l.b.map(v => +v.toFixed(1))])));
  console.log('sortie', W2.exit && [W2.exit.x, W2.exit.y, W2.exit.open], 'depart', W2.spawn);
  W2.lv.forEach(l => console.log('niveau', l.L, Math.round(l.size * 0.0625), 'm2', 'autres zones', l.all.filter(s => s > 150).sort((a, b) => b - a).slice(0, 8).join(' ')));
  for (const l of W2.lv) { const o = Buffer.alloc(W2.N); for (let c = 0; c < W2.N; c++) o[c] = l.A[c] ? 2 : (l.M[c] ? 1 : 0); fs.writeFileSync(path.join(maps, 'map' + l.L + '.raw'), o); }
  fs.writeFileSync(path.join(maps, 'mapinfo.json'), JSON.stringify({ nx: W2.nx, ny: W2.ny, x0: W2.x0, y0: W2.y0, doors: W2.doors.filter(d => d.ok).map(d => ({ id: d.id, x: d.x, y: d.y, L: d.L, ext: d.ext, dead: d.dead, open: d.open })), stairs: W2.stairs, rooms: D.rooms, links: W2.links, spawn: W2.spawn }));
}
