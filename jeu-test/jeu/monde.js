/* Jeu test — monde : collisions, limites de jeu et chemins dans la maquette.
   Même principe que le Combat du site : cases de 25 cm, murs en tranches de 10 cm.
   Fichier sans dépendance (marche dans le navigateur et dans Node pour les tests). */
(function (root) {
  'use strict';
  const C = 0.25, SL = 0.1, NS = 128, NF = 8, NC = 4, STEP = 0.42, RAD = 0.25;
  const LV_Z = [0, 3.4, 7.0], LV_NAME = ['Rez-de-chaussée', 'Étage', 'Toiture'];

  /* Fabrique la grille à partir de triangles (listes de Float32Array x,y,z…). bb = [x0,y0,x1,y1] de la zone utile. */
  function raster(soups, bb) {
    const W = { C, SL, NS, NF, NC, STEP, RAD, LV_Z, LV_NAME };
    const x0 = bb[0], y0 = bb[1], x1 = bb[2], y1 = bb[3];
    const nx = Math.ceil((x1 - x0) / C), ny = Math.ceil((y1 - y0) / C), N = nx * ny;
    const wall = new Uint32Array(N * 4), floor = new Float32Array(N * NF).fill(NaN), ceil = new Float32Array(N * NC).fill(NaN);
    const addF = (c, z) => { const o = c * NF; for (let k = 0; k < NF; k++) { const v = floor[o + k]; if (v !== v) { floor[o + k] = z; return; } if (Math.abs(v - z) < 0.08) { if (z > v) floor[o + k] = z; return; } } };
    const addC = (c, z) => { const o = c * NC; for (let k = 0; k < NC; k++) { const v = ceil[o + k]; if (v !== v) { ceil[o + k] = z; return; } if (Math.abs(v - z) < 0.08) { if (z < v) ceil[o + k] = z; return; } } };
    for (const p of soups) {
      for (let t = 0; t < p.length; t += 9) {
        const ax = p[t], ay = p[t + 1], az = p[t + 2], e1x = p[t + 3] - ax, e1y = p[t + 4] - ay, e1z = p[t + 5] - az, e2x = p[t + 6] - ax, e2y = p[t + 7] - ay, e2z = p[t + 8] - az;
        const nxn = e1y * e2z - e1z * e2y, nyn = e1z * e2x - e1x * e2z, nzn = e1x * e2y - e1y * e2x, len = Math.hypot(nxn, nyn, nzn);
        if (len < 1e-9) continue;
        const nz = nzn / len, vert = Math.abs(nz) < 0.45;
        const L = Math.max(Math.hypot(e1x, e1y, e1z), Math.hypot(e2x, e2y, e2z), Math.hypot(e2x - e1x, e2y - e1y, e2z - e1z)), s = Math.max(1, Math.ceil(L / (vert ? 0.09 : 0.18)));
        for (let i = 0; i <= s; i++) for (let j = 0; j <= s - i; j++) {
          const a = i / s, b = j / s, x = ax + e1x * a + e2x * b, y = ay + e1y * a + e2y * b, z = az + e1z * a + e2z * b;
          const cx = Math.floor((x - x0) / C), cy = Math.floor((y - y0) / C);
          if (cx < 0 || cy < 0 || cx >= nx || cy >= ny) continue;
          const c = cy * nx + cx;
          if (vert) { const sl = Math.floor(z / SL); if (sl >= 0 && sl < NS) wall[c * 4 + (sl >> 5)] |= (1 << (sl & 31)); }
          else if (nz > 0) addF(c, z); else addC(c, z);
        }
      }
    }
    Object.assign(W, { x0, y0, nx, ny, N, wall, floor, ceil, doors: [], stairs: [] });
    return W;
  }
  /* boîte d'une porte -> objet porte */
  function door(i, id, b) {
    const wx = b[3] - b[0], wy = b[4] - b[1];
    const ok = (b[5] - b[2] > 1.5) && wx <= 4.5 && wy <= 4.5 && Math.max(wx, wy) >= 0.6;
    return { i, id, ax: b[0], ay: b[1], az: b[2], bx: b[3], by: b[4], bz: b[5], x: (b[0] + b[3]) / 2, y: (b[1] + b[4]) / 2, alongY: wx < wy, w: Math.max(wx, wy), ok, open: false };
  }
  /* Fichier compact : en-tête JSON + murs (Uint32) + sols et plafonds (Int16, en cm). */
  function pack(W, extra) {
    const head = Buffer.from(JSON.stringify(Object.assign({ x0: W.x0, y0: W.y0, nx: W.nx, ny: W.ny, doors: W.doors.map(d => [d.i, d.id, d.ax, d.ay, d.az, d.bx, d.by, d.bz].map(v => Math.round(v * 1000) / 1000)), stairs: W.stairs }, extra || {})), 'utf8');
    const q = a => { const o = new Int16Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] !== a[i] ? -32768 : Math.round(a[i] * 100); return o; };
    const pad = (4 - (head.length % 4)) % 4, f = q(W.floor), c = q(W.ceil);
    const out = Buffer.alloc(8 + head.length + pad + W.wall.byteLength + f.byteLength + c.byteLength);
    out.writeUInt32LE(0x314e4f4d, 0); out.writeUInt32LE(head.length, 4); head.copy(out, 8); let o = 8 + head.length + pad;
    Buffer.from(W.wall.buffer, W.wall.byteOffset, W.wall.byteLength).copy(out, o); o += W.wall.byteLength;
    Buffer.from(f.buffer).copy(out, o); o += f.byteLength; Buffer.from(c.buffer).copy(out, o);
    return out;
  }
  function unpack(buf) {
    const dv = new DataView(buf); if (dv.getUint32(0, true) !== 0x314e4f4d) throw new Error('Fichier du monde illisible');
    const hl = dv.getUint32(4, true), H = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
    let o = 8 + hl + ((4 - (hl % 4)) % 4); const N = H.nx * H.ny;
    const W = { C, SL, NS, NF, NC, STEP, RAD, LV_Z, LV_NAME, x0: H.x0, y0: H.y0, nx: H.nx, ny: H.ny, N, head: H };
    W.wall = new Uint32Array(buf.slice(o, o + N * 16)); o += N * 16;
    const dq = (n) => { const a = new Int16Array(buf.slice(o, o + n * 2)); o += n * 2; const f = new Float32Array(n); for (let i = 0; i < n; i++) f[i] = a[i] === -32768 ? NaN : a[i] / 100; return f; };
    W.floor = dq(N * NF); W.ceil = dq(N * NC);
    W.doors = H.doors.map(d => door(d[0], d[1], d.slice(2))); W.stairs = H.stairs || [];
    api(W); return W;
  }

  function api(W) {
    const { x0, y0, nx, ny, N, wall, floor, ceil } = W;
    W.wall0 = wall.slice();
    const cell = W.cell = (x, y) => { const cx = Math.floor((x - x0) / C), cy = Math.floor((y - y0) / C); return cx < 0 || cy < 0 || cx >= nx || cy >= ny ? -1 : cy * nx + cx; };
    W.xy = c => [x0 + ((c % nx) + .5) * C, y0 + (Math.floor(c / nx) + .5) * C];
    const wallAny = W.wallAny = (c, s0, s1) => {
      const o = c * 4; if (s0 < 0) s0 = 0; if (s1 >= NS) s1 = NS - 1; if (s1 < s0) return false;
      for (let w = s0 >> 5; w <= (s1 >> 5); w++) { const a = w === (s0 >> 5) ? (s0 & 31) : 0, b = w === (s1 >> 5) ? (s1 & 31) : 31, hi = b === 31 ? -1 : ((1 << (b + 1)) - 1); if (wall[o + w] & (hi & ~((1 << a) - 1))) return true; }
      return false;
    };
    const ground = W.ground = (x, y, z, up) => { if (up === undefined) up = STEP; const c = cell(x, y); let best = -0.02; if (c < 0) return best; const o = c * NF; for (let k = 0; k < NF; k++) { const v = floor[o + k]; if (v !== v) break; if (v <= z + up && v > best) best = v; } return best; };
    const blocked = W.blocked = (x, y, z, r, h0, h1) => {
      if (r === undefined) r = RAD; if (h0 === undefined) h0 = STEP; if (h1 === undefined) h1 = 1.8;
      const s0 = Math.floor((z + h0) / SL), s1 = Math.floor((z + h1) / SL);
      const cx0 = Math.floor((x - r - x0) / C), cx1 = Math.floor((x + r - x0) / C), cy0 = Math.floor((y - r - y0) / C), cy1 = Math.floor((y + r - y0) / C);
      if (cx0 < 0 || cy0 < 0 || cx1 >= nx || cy1 >= ny) return true;
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const ax = x0 + cx * C, ay = y0 + cy * C, qx = Math.max(ax, Math.min(x, ax + C)), qy = Math.max(ay, Math.min(y, ay + C));
        if ((qx - x) * (qx - x) + (qy - y) * (qy - y) > r * r) continue;
        if (wallAny(cy * nx + cx, s0, s1)) return true;
      }
      const c = cell(x, y), o = c * NC; for (let k = 0; k < NC; k++) { const v = ceil[o + k]; if (v !== v) break; if (v > z + 0.6 && v < z + h1) return true; }
      return false;
    };
    /* rayon 3D : distance au premier obstacle (mur, sol, plafond) */
    W.ray = (ox, oy, oz, dx, dy, dz, max) => {
      for (let t = 0.2; t < max; t += 0.08) {
        const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t, c = cell(x, y); if (c < 0 || z < -0.05) return t;
        const sl = Math.floor(z / SL); if (sl >= 0 && sl < NS && (wall[c * 4 + (sl >> 5)] & (1 << (sl & 31)))) return t;
        const fo = c * NF; for (let k = 0; k < NF; k++) { const v = floor[fo + k]; if (v !== v) break; if (Math.abs(z - v) < 0.06) return t; }
        const co = c * NC; for (let k = 0; k < NC; k++) { const v = ceil[co + k]; if (v !== v) break; if (Math.abs(z - v) < 0.06) return t; }
      }
      return max;
    };
    /* vue dégagée entre deux points (à hauteur des yeux) */
    W.los = (ax, ay, az, bx, by, bz) => {
      const d = Math.hypot(bx - ax, by - ay, bz - az), n = Math.ceil(d / 0.1);
      for (let i = 1; i < n; i++) { const f = i / n, x = ax + (bx - ax) * f, y = ay + (by - ay) * f, z = az + (bz - az) * f, c = cell(x, y); if (c < 0) return false; const sl = Math.floor(z / SL); if (sl >= 0 && sl < NS && (wall[c * 4 + (sl >> 5)] & (1 << (sl & 31)))) return false; }
      return true;
    };
    W.level = z => z < 2.9 ? 0 : z < 6.3 ? 1 : 2;   // z = hauteur des pieds + 0,4 m environ (on peut être debout sur un meuble ou en plein saut)

    W.setDoor = (d, open) => {
      if (!d.ok) return; d.open = open;
      const ex = d.alongY ? 0.32 : 0.06, ey = d.alongY ? 0.06 : 0.32, s0 = Math.max(0, Math.floor((d.az - 0.05) / SL)), s1 = Math.min(NS - 1, Math.floor((Math.min(d.bz, d.az + 2.4) - 0.03) / SL));
      for (let cy = Math.floor((d.ay - ey - y0) / C); cy <= Math.floor((d.by + ey - y0) / C); cy++) for (let cx = Math.floor((d.ax - ex - x0) / C); cx <= Math.floor((d.bx + ex - x0) / C); cx++) {
        if (cx < 0 || cy < 0 || cx >= nx || cy >= ny) continue; const c = cy * nx + cx;
        for (let sl = s0; sl <= s1; sl++) { const o = c * 4 + (sl >> 5), bit = 1 << (sl & 31); if (open) wall[o] &= ~bit; else wall[o] = (wall[o] & ~bit) | (W.wall0[o] & bit); }
      }
    };

    /* cases où l'on peut marcher, par niveau */
    W.navLevel = (L, r) => {
      const Z = LV_Z[L], M = new Uint8Array(N), F = new Float32Array(N);
      for (let c = 0; c < N; c++) {
        let v = null; for (let k = 0; k < NF; k++) { const f = floor[c * NF + k]; if (f !== f) break; if (Math.abs(f - Z) < 0.4 && (v === null || f > v)) v = f; }
        if (v === null) continue;
        const x = x0 + ((c % nx) + .5) * C, y = y0 + (Math.floor(c / nx) + .5) * C;
        if (ground(x, y, v) !== v) continue;
        if (!blocked(x, y, v, r || 0.2)) { M[c] = 1; F[c] = v; }
      }
      return { L, Z, M, F };
    };
    /* zones d'un seul tenant */
    W.components = (M) => {
      const id = new Int32Array(N), sizes = [0]; let n = 0; const q = new Int32Array(N);
      for (let s = 0; s < N; s++) {
        if (!M[s] || id[s]) continue; n++; let h = 0, t = 0; q[t++] = s; id[s] = n; let sz = 0;
        while (h < t) { const c = q[h++]; sz++; const cx = c % nx;
          if (cx < nx - 1 && M[c + 1] && !id[c + 1]) { id[c + 1] = n; q[t++] = c + 1; }
          if (cx > 0 && M[c - 1] && !id[c - 1]) { id[c - 1] = n; q[t++] = c - 1; }
          if (c + nx < N && M[c + nx] && !id[c + nx]) { id[c + nx] = n; q[t++] = c + nx; }
          if (c - nx >= 0 && M[c - nx] && !id[c - nx]) { id[c - nx] = n; q[t++] = c - nx; } }
        sizes.push(sz);
      }
      return { id, sizes };
    };
    W.near = (M, x, y, rmax) => {
      const c0 = cell(x, y); if (c0 < 0) return -1; if (M[c0]) return c0; const cx = c0 % nx, cy = Math.floor(c0 / nx);
      for (let r = 1; r <= (rmax || 16); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= nx || Y >= ny) continue; const c = Y * nx + X; if (M[c]) return c; }
      return -1;
    };
    /* A* 8 directions + lissage ; renvoie une liste de cases */
    const gS = new Float32Array(N), from = new Int32Array(N), seen = new Uint32Array(N); let gen = 0;
    const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];
    W.astar = (M, s, t, maxN) => {
      if (s < 0 || t < 0) return null; if (s === t) return [s]; gen++;
      const tx = t % nx, ty = Math.floor(t / nx), hh = c => { const dx = Math.abs(c % nx - tx), dy = Math.abs(Math.floor(c / nx) - ty); return (dx + dy) + (1.4142 - 2) * Math.min(dx, dy); };
      const HF = [], HC = [];
      const push = (c, f) => { let i = HF.length; HF.push(f); HC.push(c); while (i > 0) { const p = (i - 1) >> 1; if (HF[p] <= HF[i]) break; const a = HF[p]; HF[p] = HF[i]; HF[i] = a; const b = HC[p]; HC[p] = HC[i]; HC[i] = b; i = p; } };
      const pop = () => { const top = HC[0], lf = HF.pop(), lc = HC.pop(); if (HF.length) { HF[0] = lf; HC[0] = lc; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < HF.length && HF[l] < HF[m]) m = l; if (r < HF.length && HF[r] < HF[m]) m = r; if (m === i) break; const a = HF[m]; HF[m] = HF[i]; HF[i] = a; const b = HC[m]; HC[m] = HC[i]; HC[i] = b; i = m; } } return top; };
      seen[s] = gen; gS[s] = 0; from[s] = -1; push(s, hh(s)); let n = 0; const lim = maxN || 120000;
      while (HF.length && n < lim) {
        const c = pop(); n++; if (c === t) break; const cx = c % nx;
        for (let k = 0; k < 8; k++) {
          const dx = DX[k], dy = DY[k]; if ((dx > 0 && cx === nx - 1) || (dx < 0 && cx === 0)) continue; const d = c + dx + dy * nx; if (d < 0 || d >= N || !M[d]) continue;
          if (dx && dy && (!M[c + dx] || !M[c + dy * nx])) continue;
          const g = gS[c] + (dx && dy ? 1.4142 : 1); if (seen[d] === gen && gS[d] <= g) continue; seen[d] = gen; gS[d] = g; from[d] = c; push(d, g + hh(d));
        }
      }
      if (seen[t] !== gen) return null;
      const out = []; for (let c = t; c !== -1; c = from[c]) out.push(c); out.reverse();
      const free = (a, b) => { const A = W.xy(a), B = W.xy(b), n2 = Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / 0.12); for (let i = 1; i < n2; i++) { const c = cell(A[0] + (B[0] - A[0]) * i / n2, A[1] + (B[1] - A[1]) * i / n2); if (c < 0 || !M[c]) return false; } return true; };
      const sm = [out[0]]; let i = 0; while (i < out.length - 1) { let j = Math.min(out.length - 1, i + 60); while (j > i + 1 && !free(out[i], out[j])) j--; sm.push(out[j]); i = j; }
      return sm;
    };
    /* distances en cases depuis un point (pour choisir des endroits loin de la sortie) */
    W.dist = (M, s) => {
      const D = new Int32Array(N).fill(-1); if (s < 0) return D; const q = new Int32Array(N); let h = 0, t = 0; q[t++] = s; D[s] = 0;
      while (h < t) { const c = q[h++], cx = c % nx, d = D[c] + 1;
        if (cx < nx - 1 && M[c + 1] && D[c + 1] < 0) { D[c + 1] = d; q[t++] = c + 1; }
        if (cx > 0 && M[c - 1] && D[c - 1] < 0) { D[c - 1] = d; q[t++] = c - 1; }
        if (c + nx < N && M[c + nx] && D[c + nx] < 0) { D[c + nx] = d; q[t++] = c + nx; }
        if (c - nx >= 0 && M[c - nx] && D[c - nx] < 0) { D[c - nx] = d; q[t++] = c - nx; } }
      return D;
    };
  }

  /* Prépare la zone de jeu : portes ouvertes à l'intérieur, fermées vers l'extérieur, une seule zone par niveau,
     liaisons par les escaliers, porte de sortie fermée à clé. */
  function arena(W) {
    const conf = (W.head && W.head.conf) || {};
    const mainOf = l => { const c = W.components(l.M); let b = 0; for (let i = 1; i < c.sizes.length; i++) if (c.sizes[i] > (c.sizes[b] || 0)) b = i; return { c, b }; };
    W.exit = W.doors.find(d => d.id === conf.exitId) || null;
    for (const d of W.doors) W.setDoor(d, d !== W.exit);
    let lv = [0, 1, 2].map(L => W.navLevel(L));
    const main = lv.map(mainOf);
    const inMain = (L, x, y) => { const c = W.cell(x, y); return c >= 0 && main[L].c.id[c] === main[L].b; };
    for (const d of W.doors) {
      if (!d.ok) continue; const L = W.level(d.az + 0.5); d.L = L;
      const side = (s) => { for (const k of [0.75, 1.0, 0.55]) { const x = d.x + (d.alongY ? k * s : 0), y = d.y + (d.alongY ? 0 : k * s); if (inMain(L, x, y)) return true; } return false; };
      d.in1 = side(1); d.in2 = side(-1); d.ext = d.in1 !== d.in2; d.dead = !d.in1 && !d.in2;
      if (d === W.exit) continue;
      if (!(d.in1 && d.in2) && !(conf.openIds || []).includes(d.id)) W.setDoor(d, false);
    }
    lv = [0, 1, 2].map(L => W.navLevel(L));
    lv.forEach(l => { const m = mainOf(l), A = new Uint8Array(W.N); for (let i = 0; i < W.N; i++) if (m.c.id[i] === m.b) A[i] = 1; l.A = A; l.size = m.c.sizes[m.b] || 0; l.all = m.c.sizes; });
    /* limite de jeu : la zone, élargie de 2 cases, mais seulement là où il y a un sol à ce niveau (sinon on tomberait dans un vide : gaine, trémie, bord de dalle) */
    const hasFloor = (c, Z) => { for (let k = 0; k < NF; k++) { const f = W.floor[c * NF + k]; if (f !== f) break; if (f > Z - 0.3 && f < Z + 0.38) return true; } return false; };   // un sol sur lequel on arrive en marchant (pas un rebord plus haut)
    lv.forEach(l => { const B = new Uint8Array(W.N), nx = W.nx; for (let c = 0; c < W.N; c++) if (l.A[c]) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const d = c + dx + dy * nx; if (d >= 0 && d < W.N && (l.L === 0 || l.A[d] || hasFloor(d, l.Z))) B[d] = 1; } } l.B = B; });
    W.lv = lv;
    /* escaliers : on regroupe les volées d'une même cage, puis on relie les niveaux */
    const cores = [];
    for (const s of W.stairs) { const cx = (s[0] + s[3]) / 2, cy = (s[1] + s[4]) / 2; let k = cores.find(c => Math.hypot(c.x - cx, c.y - cy) < 4.5); if (!k) { k = { x: cx, y: cy, n: 0, az: 9, bz: -9, b: [1e9, 1e9, -1e9, -1e9] }; cores.push(k); } k.x = (k.x * k.n + cx) / (k.n + 1); k.y = (k.y * k.n + cy) / (k.n + 1); k.n++; k.az = Math.min(k.az, s[2]); k.bz = Math.max(k.bz, s[5]); k.b = [Math.min(k.b[0], s[0]), Math.min(k.b[1], s[1]), Math.max(k.b[2], s[3]), Math.max(k.b[3], s[4])]; }
    const nearA = (L, x, y, rm) => { const c = W.near(lv[L].A, x, y, rm); if (c < 0) return null; const p = W.xy(c); return [p[0], p[1], lv[L].F[c]]; };
    /* point d'accès : case de la zone de jeu la plus proche de la cage, avec un peu de dégagement autour */
    const access = (L, k, avoid) => { let best = null, bd = 1e9; const A = lv[L].A, r = 7;
      for (let y = k.b[1] - r; y <= k.b[3] + r; y += 0.25) for (let x = k.b[0] - r; x <= k.b[2] + r; x += 0.25) { const c = W.cell(x, y); if (c < 0 || !A[c]) continue;
        let free = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (A[c + dx + dy * W.nx]) free++; if (free < 21) continue;
        if (avoid && Math.hypot(avoid[0] - x, avoid[1] - y) < 3.2) continue;
        const dx = Math.max(k.b[0] - x, 0, x - k.b[2]), dy = Math.max(k.b[1] - y, 0, y - k.b[3]), d = Math.hypot(dx, dy); if (d < bd) { bd = d; const p = W.xy(c); best = [p[0], p[1], lv[L].F[c]]; } }
      return bd < 7 ? best : null; };
    W.links = [];
    for (const k of cores) {
      let mid = null;
      if (k.az < 0.6 && k.bz > 2.6) { const a = access(0, k), b = access(1, k); if (a && b) { W.links.push({ la: 0, lb: 1, a, b }); mid = b; } }
      if (k.bz > 6) { const a = access(1, k, mid), b = access(2, k); if (a && b) W.links.push({ la: 1, lb: 2, a, b }); }
    }
    /* départ : sur la toiture, le plus loin possible de l'accès qui descend */
    const up = W.links.filter(l => l.lb === 2);
    if (up.length) { const D = W.dist(lv[2].A, W.cell(up[0].b[0], up[0].b[1])); let far = -1, fc = -1; for (let c = 0; c < W.N; c++) if (D[c] > far) { far = D[c]; fc = c; }
      /* un peu en retrait du bord */
      let best = fc, bs = -1; for (let c = 0; c < W.N; c++) { if (D[c] < far * 0.82) continue; let free = 0; for (let dy = -6; dy <= 6; dy += 2) for (let dx = -6; dx <= 6; dx += 2) { const d = c + dx + dy * W.nx; if (d >= 0 && d < W.N && lv[2].A[d]) free++; } const sc = free * 1000 + D[c]; if (sc > bs) { bs = sc; best = c; } }
      const p = W.xy(best); W.spawn = [p[0], p[1], lv[2].F[best], 2]; }
    else { const c = lv[1].A.indexOf(1), p = W.xy(c); W.spawn = [p[0], p[1], lv[1].F[c], 1]; }
    W.conf = conf;
    return W;
  }
  /* Ouvre la sortie : la porte s'efface et la zone devant la porte devient accessible. */
  function openExit(W) {
    if (!W.exit) return; W.setDoor(W.exit, true); const z = W.conf.escape; if (!z) return; const l = W.lv[0];
    for (let y = z[1]; y <= z[3]; y += W.C) for (let x = z[0]; x <= z[2]; x += W.C) { const c = W.cell(x, y); if (c >= 0) { l.B[c] = 1; } }
  }

  const Monde = { raster, door, pack, unpack, api, arena, openExit, C, SL, NS, NF, NC, STEP, RAD, LV_Z, LV_NAME };
  if (typeof module !== 'undefined' && module.exports) module.exports = Monde; else root.Monde = Monde;
})(typeof self !== 'undefined' ? self : this);
