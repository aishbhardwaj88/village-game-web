import * as THREE from 'three';
import { Parts } from './landInstancing.js';
import { landMaterial } from './landMaterials.js';
import { getLayout } from '../layout/layout.js';
import { placeBoardsMesh } from '../placeBoards.js';

/**
 * WEST RAILWAY (26 Nov, final map only). Everything the approved map lists under new_rail_bed, new_rail, new_rail_crossing,
 * new_platform, new_boom, new_signal, "Railway station building", "Platform shelter" and "Ticket window and waiting hall",
 * read from the packed map (src/layout/mapData.json via getLayout().objects), never moved.
 *
 * Streams like every other site: registerRailway(zoneManager) adds 4 zones (the 660 m line cut at z = -165, 0, 165), each one a
 * Group of merged meshes, one per library material by name (ground, wood, metal, concrete, plaster), UVs in metres, tint by
 * vertex colour. The station, platform, shelter, hall, crossings, barriers and signals are built in the zone that holds them.
 * Nothing is built before Play: the nearest zone is ~214 m from the spawn (604, 27) and the zones only build near the player.
 * Rails, sleepers, ballast and crossing planks have no collider (walkable); station, hall, shelter posts, benches, barrier
 * posts and signal posts are solid.
 */
const BED_X = 392, LINE_Z0 = -330, LINE_Z1 = 330, CHUNK = 165;
const TILES = { ground: 2, wood: 1, metal: 1, concrete: 1, plaster: 1.5 };
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const tintJ = (hex, k, a, b) => { const c = new THREE.Color(hex); const l = 1 + (hash(a, b) - 0.5) * 2 * k; return c.multiplyScalar(l).getHex(); };
const objs = (prefix) => getLayout().objects.filter((o) => o.prefix === prefix);

/** one wall of a building with real openings: piers, lintels and sills as separate slabs, frames, bars and doors set into it.
 *  axis 'z': wall runs along z at x = face (outward = dir, +1 east / -1 west). openings: { c, w, h, sill, kind: 'door'|'window'|'ticket' } */
function wallRun(P, cols, { face, dir, z0, z1, h, base, thick = 0.32, openings, tint }) {
  const xm = face - dir * thick / 2; // slab centre (wall sits inside the footprint)
  const ops = [...openings].sort((a, b) => a.c - b.c);
  let cur = z0;
  const slab = (za, zb, y0, y1) => { if (zb - za > 0.01 && y1 - y0 > 0.01) P.box('plaster', xm, (y0 + y1) / 2, (za + zb) / 2, thick, y1 - y0, zb - za, { color: tint }); };
  for (const o of ops) {
    const za = o.c - o.w / 2, zb = o.c + o.w / 2, top = o.sill + o.h;
    slab(cur, za, base, h); // pier up to this opening
    slab(za, zb, base, o.sill); // sill block
    slab(za, zb, top, h); // lintel
    cur = zb;
    const xin = face - dir * (thick - 0.12); // recessed plane, 0.2 m back from the face
    const fx = face - dir * 0.05;
    // timber / steel frame proud of the face
    const fc = o.kind === 'door' ? 0x5d4630 : 0x30403f;
    P.box(o.kind === 'door' ? 'wood' : 'metal', fx, o.sill + o.h / 2, za - 0.04, 0.1, o.h + 0.08, 0.08, { color: fc });
    P.box(o.kind === 'door' ? 'wood' : 'metal', fx, o.sill + o.h / 2, zb + 0.04, 0.1, o.h + 0.08, 0.08, { color: fc });
    P.box(o.kind === 'door' ? 'wood' : 'metal', fx, top + 0.04, o.c, 0.1, 0.08, o.w + 0.16, { color: fc });
    if (o.kind === 'door') {
      P.box('wood', xin, o.sill + o.h / 2, o.c, 0.07, o.h - 0.04, o.w - 0.06, { color: tintJ(0x6a4a30, 0.08, o.c, face) });
      for (const hy of [o.sill + 0.35, o.sill + o.h - 0.35]) P.box('metal', xin + dir * 0.06, hy, za + 0.05, 0.05, 0.12, 0.05, { color: 0x2a2a2a }); // hinges
      P.box('metal', xin + dir * 0.07, o.sill + o.h * 0.48, zb - 0.14, 0.05, 0.05, 0.16, { color: 0x3a3a3a }); // handle
      for (let k = 1; k < 3; k++) P.box('wood', xin + dir * 0.04, o.sill + o.h / 2, za + (o.w * k) / 3, 0.02, o.h - 0.3, 0.04, { color: 0x4a3622 }); // panel ribs
    } else {
      P.box('plaster', xin - dir * 0.2, o.sill + o.h / 2, o.c, 0.04, o.h, o.w, { color: 0x2a2622 }); // dark room behind the grille
      const bars = o.kind === 'ticket' ? 9 : 5;
      for (let k = 0; k < bars; k++) P.box('metal', fx - dir * 0.04, o.sill + o.h / 2, za + (o.w * (k + 0.5)) / bars, 0.04, o.h, 0.03, { color: 0x252b2b }); // iron grille
      P.box('metal', fx - dir * 0.04, o.sill + o.h * 0.5, o.c, 0.04, 0.03, o.w, { color: 0x252b2b });
      P.box('concrete', face + dir * 0.08, o.sill - 0.04, o.c, 0.3, 0.08, o.w + 0.3, { color: 0xc8c2b4 }); // projecting sill
      if (o.kind === 'ticket') P.box('wood', face + dir * 0.14, o.sill + 0.02, o.c, 0.3, 0.05, o.w + 0.1, { color: 0x6a4a30 }); // counter shelf
    }
  }
  slab(cur, z1, base, h);
}

function building(P, cols, { x0, x1, z0, z1, h, east, west, tint, roofTint = 0xbab5a8 }) {
  const t = 0.32, base = 0.3;
  P.box('concrete', (x0 + x1) / 2, base / 2, (z0 + z1) / 2, x1 - x0 + 0.2, base, z1 - z0 + 0.2, { color: 0xb2ac9e }); // plinth
  wallRun(P, cols, { face: x1, dir: 1, z0, z1, h, base, openings: east, tint });
  wallRun(P, cols, { face: x0, dir: -1, z0, z1, h, base, openings: west, tint });
  for (const [zz, s] of [[z0, 1], [z1, -1]]) P.box('plaster', (x0 + x1) / 2, (base + h) / 2, zz + s * t / 2, x1 - x0, h - base, t, { color: tint }); // end walls
  P.box('concrete', (x0 + x1) / 2, h + 0.15, (z0 + z1) / 2, x1 - x0 + 0.9, 0.3, z1 - z0 + 0.9, { color: roofTint }); // roof slab with overhang
  const pc = 0xaaa498; // parapet
  P.box('concrete', (x0 + x1) / 2, h + 0.55, z0 - 0.4, x1 - x0 + 0.9, 0.5, 0.15, { color: pc });
  P.box('concrete', (x0 + x1) / 2, h + 0.55, z1 + 0.4, x1 - x0 + 0.9, 0.5, 0.15, { color: pc });
  P.box('concrete', x0 - 0.4, h + 0.55, (z0 + z1) / 2, 0.15, 0.5, z1 - z0 + 0.9, { color: pc });
  P.box('concrete', x1 + 0.4, h + 0.55, (z0 + z1) / 2, 0.15, 0.5, z1 - z0 + 0.9, { color: pc });
  P.box('plaster', (x0 + x1) / 2, 0.06, (z0 + z1) / 2, x1 - x0 - 0.5, 0.1, z1 - z0 - 0.5, { color: 0x3a342c }); // floor inside
}

function bench(P, x, z, len = 1.8, alongZ = true) {
  const sx = alongZ ? 0.5 : len, sz = alongZ ? len : 0.5, y0 = 0.22;
  P.box('wood', x, y0 + 0.43, z, sx, 0.06, sz, { color: tintJ(0x7a5a3a, 0.1, x, z) });
  P.box('wood', x + (alongZ ? 0.22 : 0), y0 + 0.75, z + (alongZ ? 0 : 0.22), alongZ ? 0.05 : len, 0.3, alongZ ? len : 0.05, { color: 0x6a4a30 });
  for (const s of [-1, 1]) P.box('metal', x, y0 + 0.2, z + (alongZ ? s * (len / 2 - 0.1) : 0), alongZ ? 0.4 : 0.05, 0.4, alongZ ? 0.05 : 0.4, { color: 0x2f3535 });
}

function boom(P, o, sol) {
  const r = o.rect, cx = r.cx, [za, zb] = [o.rings[0][0][1], o.rings[0][2][1]].sort((a, b) => a - b);
  const crossing = /highway/.test(o.name) ? -124.5 : -19;
  const pz = Math.abs(za - crossing) > Math.abs(zb - crossing) ? za : zb, sd = Math.sign(crossing - pz) || 1;
  const pivotZ = pz + sd * 0.15;
  P.box('concrete', cx, 0.55, pivotZ, 0.28, 1.1, 0.28, { color: 0xe4e0d4 }); // post
  const a = 1.05, th = sd > 0 ? -a : Math.PI + a, py = 1.1; // arm raised ~60 degrees (the idle position), so the road stays open
  for (let i = 0; i < 7; i++) {
    const t = 0.25 + i * 0.5, M = new THREE.Matrix4().compose(new THREE.Vector3(cx, py + Math.sin(a) * t, pivotZ + sd * Math.cos(a) * t), new THREE.Quaternion().setFromEuler(new THREE.Euler(th, 0, 0)), new THREE.Vector3(1, 1, 1));
    P.box('wood', 0, 0, 0, 0.1, 0.1, 0.5, { color: i % 2 ? 0xe8e4da : 0xc0392b, matrix: M });
  }
  P.box('metal', cx, py - 0.1, pivotZ - sd * 0.25, 0.3, 0.3, 0.3, { color: 0x3a3a3a }); // counterweight
  sol.push({ minX: cx - 0.16, maxX: cx + 0.16, minZ: pivotZ - 0.16, maxZ: pivotZ + 0.16 });
}

function signal(P, o, sol) {
  const r = o.rect, f = r.front, x = r.cx, z = r.cz;
  P.box('metal', x, 2, z, 0.18, 4, 0.18, { color: 0x3a3a3a }); // mast
  P.box('metal', x + f[0] * 0.2, 3.5, z + f[1] * 0.2, f[0] ? 0.3 : 0.5, 1.15, f[0] ? 0.5 : 0.3, { color: 0x252525 }); // lamp case
  [[3.85, 0xb03020], [3.5, 0xc89a20], [3.15, 0x2f7d4b]].forEach(([y, c]) => P.box('metal', x + f[0] * 0.37, y, z + f[1] * 0.37, f[0] ? 0.05 : 0.22, 0.22, f[0] ? 0.22 : 0.05, { color: c }));
  P.box('concrete', x, 0.15, z, 0.5, 0.3, 0.5, { color: 0xb8b2a4 }); // footing
  sol.push({ minX: x - 0.25, maxX: x + 0.25, minZ: z - 0.25, maxZ: z + 0.25 });
}

function track(P, za, zb, crossings) {
  const L = zb - za, zc = (za + zb) / 2;
  P.box('ground', BED_X, 0.03, zc, 4.4, 0.06, L, { color: 0x8f877b, skip: ['ny'] }); // ballast shoulders
  P.box('ground', BED_X, 0.06, zc, 3.8, 0.1, L, { color: 0x9a948a, skip: ['ny'] }); // ballast top
  for (let z = za + 0.325, k = 0; z < zb; z += 0.65, k++) {
    if (crossings.some(([a, b]) => z > a - 0.1 && z < b + 0.1)) continue; // planked over
    const j = hash(z, 7);
    P.box('wood', BED_X + (j - 0.5) * 0.04, 0.1, z, 3.2 + (hash(z, 3) - 0.5) * 0.06, 0.12, 0.26, { color: tintJ(0x5a4f45, 0.12, z, 1), ry: (hash(z, 9) - 0.5) * 0.02, skip: ['ny'] });
  }
  for (const x of [391.3, 392.7]) {
    P.box('metal', x, 0.175, zc, 0.14, 0.03, L, { color: 0x6a625a, skip: ['ny'] }); // foot
    P.box('metal', x, 0.24, zc, 0.04, 0.1, L, { color: 0x6a625a, skip: ['ny', 'py'] }); // web
    P.box('metal', x, 0.31, zc, 0.075, 0.04, L, { color: 0x9a9690, skip: ['ny'] }); // head
  }
}

function planks(P, o) {
  const [za, zb] = [o.rings[0][0][1], o.rings[0][2][1]].sort((a, b) => a - b);
  for (let z = za + 0.16; z < zb - 0.05; z += 0.32) P.box('wood', o.cx, 0.056, z, o.rect.w, 0.11, 0.3, { color: tintJ(0xb9ad98, 0.1, z, o.cx), skip: ['ny'] });
}

function buildChunk(za, zb) {
  const P = new Parts(TILES), sol = [], boards = [];
  const inZ = (o) => o.cz >= za && o.cz < zb;
  const crossings = objs('new_rail_crossing').map((o) => [o.rings[0][0][1], o.rings[0][2][1]].sort((a, b) => a - b));
  track(P, za, zb, crossings);
  for (const o of objs('new_rail_crossing')) if (inZ(o)) planks(P, o);
  for (const o of objs('new_boom')) if (inZ(o)) boom(P, o, sol);
  for (const o of objs('new_signal')) if (inZ(o)) signal(P, o, sol);
  for (const o of objs('new_platform')) if (inZ(o)) {
    const [x0, x1] = [o.rings[0][0][0], o.rings[0][1][0]].sort((a, b) => a - b), [z0, z1] = [o.rings[0][0][1], o.rings[0][2][1]].sort((a, b) => a - b);
    P.box('concrete', (x0 + x1) / 2, 0.11, (z0 + z1) / 2, x1 - x0, 0.22, z1 - z0, { color: 0xcfc5ad, skip: ['ny'] });
    P.box('concrete', x0 + 0.2, 0.225, (z0 + z1) / 2, 0.4, 0.01, z1 - z0, { color: 0xd8b84a }); // safety edge strip
  }
  for (const o of objs('new_Railway platform shelter')) if (inZ(o)) {
    const [x0, x1] = [o.rings[0][0][0], o.rings[0][1][0]].sort((a, b) => a - b), [z0, z1] = [o.rings[0][0][1], o.rings[0][2][1]].sort((a, b) => a - b);
    const nb = 5;
    for (let i = 0; i < nb; i++) for (const x of [x0 + 0.2, x1 - 0.2]) {
      const z = z0 + 0.2 + (i * (z1 - z0 - 0.4)) / (nb - 1);
      P.box('metal', x, 0.22 + 1.5, z, 0.12, 3.0, 0.12, { color: 0x34403f });
      sol.push({ minX: x - 0.1, maxX: x + 0.1, minZ: z - 0.1, maxZ: z + 0.1 });
    }
    const rm = new THREE.Matrix4().compose(new THREE.Vector3((x0 + x1) / 2, 3.28, (z0 + z1) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.05)), new THREE.Vector3(1, 1, 1));
    P.box('metal', 0, 0, 0, x1 - x0 + 0.6, 0.07, z1 - z0 + 0.6, { color: 0x8a8e8c, matrix: rm });
    for (const zz of [z0 + 2.5, (z0 + z1) / 2, z1 - 2.5]) { bench(P, x1 - 0.65, zz); sol.push({ minX: x1 - 0.95, maxX: x1 - 0.3, minZ: zz - 0.95, maxZ: zz + 0.95 }); }
  }
  // 25 Nov (review rule 2): the station and waiting hall FRONT THE ROAD (east, where gali_n9 / gali_n11 end at them), so the entrance, ticket window and name board are on the east face; the platform (west) side keeps a door and windows
  for (const o of objs('new_Railway station')) if (inZ(o)) {
    const [x0, x1] = [o.rings[0][0][0], o.rings[0][1][0]].sort((a, b) => a - b), [z0, z1] = [o.rings[0][0][1], o.rings[0][2][1]].sort((a, b) => a - b), zm = (z0 + z1) / 2;
    building(P, null, {
      x0, x1, z0, z1, h: o.h, tint: 0xd9b98a,
      east: [{ c: zm, w: 1.3, h: 2.4, sill: 0.3, kind: 'door' }, { c: zm - 7, w: 1.2, h: 1.3, sill: 1.1, kind: 'window' }, { c: zm - 5.2, w: 1.0, h: 1.2, sill: 1.1, kind: 'ticket' }, { c: zm + 5.2, w: 1.2, h: 1.3, sill: 1.1, kind: 'window' }, { c: zm + 7, w: 1.2, h: 1.3, sill: 1.1, kind: 'window' }],
      west: [{ c: zm, w: 1.3, h: 2.4, sill: 0.3, kind: 'door' }, ...[-6.5, -3.8, 3.8, 6.5].map((d) => ({ c: zm + d, w: 1.2, h: 1.3, sill: 1.1, kind: 'window' }))],
    });
    sol.push({ minX: x0 - 0.1, maxX: x1 + 0.1, minZ: z0 - 0.1, maxZ: z1 + 0.1 });
    // 25 Nov, her answer: one station name only, the 'Amrai Khera railway station' post board from the map (src/kit/mapSigns.js); the 'Halt' wall board is removed
  }
  for (const o of objs('new_Ticket window and waiting hall')) if (inZ(o)) {
    const [x0, x1] = [o.rings[0][0][0], o.rings[0][1][0]].sort((a, b) => a - b), [z0, z1] = [o.rings[0][0][1], o.rings[0][2][1]].sort((a, b) => a - b), zm = (z0 + z1) / 2;
    building(P, null, {
      x0, x1, z0, z1, h: o.h, tint: 0xc9b99a, roofTint: 0xb4afa2,
      east: [{ c: zm, w: 1.2, h: 2.3, sill: 0.3, kind: 'door' }, { c: zm - 2.3, w: 1.0, h: 1.2, sill: 1.0, kind: 'ticket' }, { c: zm + 2.3, w: 1.1, h: 1.2, sill: 1.0, kind: 'window' }],
      west: [{ c: zm, w: 1.2, h: 2.3, sill: 0.3, kind: 'door' }, { c: zm - 2.3, w: 1.1, h: 1.2, sill: 1.0, kind: 'window' }, { c: zm + 2.3, w: 1.1, h: 1.2, sill: 1.0, kind: 'window' }],
    });
    sol.push({ minX: x0 - 0.1, maxX: x1 + 0.1, minZ: z0 - 0.1, maxZ: z1 + 0.1 });
  }
  const group = new THREE.Group();
  group.name = `railway_${za}_${zb}`;
  const geos = P.build();
  let first = true;
  for (const mat of Object.keys(geos)) {
    const m = new THREE.Mesh(geos[mat], landMaterial(mat));
    m.name = `${group.name}_${mat}`; m.receiveShadow = true; m.castShadow = mat !== 'ground'; m.userData.noAutoCollider = true;
    if (first && sol.length) { m.userData.colliderBoxes = sol; first = false; }
    group.add(m);
  }
  if (boards.length) group.add(placeBoardsMesh(boards, group.name + '_boards'));
  return group;
}

/** Streams the 660 m line as 4 zones. Called once from src/main.js after the zone manager exists (new layout only). */
export function registerRailway(zoneManager) {
  for (let za = LINE_Z0; za < LINE_Z1; za += CHUNK) {
    const zb = za + CHUNK, zc = (za + zb) / 2;
    zoneManager.register(`railway_${za}`, { x: BED_X, z: zc, buildRadius: 150, teardownRadius: 190, build: () => buildChunk(za, zb) });
  }
}
export { buildChunk };
