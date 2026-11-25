import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fieldMaterial, paint } from './landFields.js';
import { createWaterMaterial } from '../water.js';
import { PATCH_LOOKS, roadClearance, toWorld, pondSqueeze } from './mapObjectsPlan.js';
import { yieldToMain } from './lateBuild.js';

/**
 * Ground and water of the map objects layer:
 *   ground  every painted patch (cricket pitch, kabaddi court, parkings, drying ground, play patches, plots, potter's
 *           yard, tempo stand, cane centre, market ground), the earth bunds of the field channels, the pond banks and
 *           the wet mud beds under the water. ONE mesh on shops-land's field shader (the library 'ground' photo set with
 *           real normal and roughness maps, soil tint, grass / rut painter): one draw call.
 *   water   ponds, temple tank, field channels, tubewell hauz, trough, the pipe's falling water: ONE mesh on the
 *           game's shared village water (src/water.js): one draw call.
 * The game's ground is flat and cannot be dug (as for shops-land's canal), so every pond and tank is built UP: the
 * bank is a raised earthen bund, the water sits just above the ground inside it.
 */
const PATCH_Y = 0.019;
const WATER_Y = 0.11;      // pond surface, inside a bund whose crest is BANK_Y
const BANK_Y = 0.42;

function polyGeometry(ring, y) {
  const pts = ring.map(([x, z]) => new THREE.Vector2(x, z));
  if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
  const tris = THREE.ShapeUtils.triangulateShape(pts, []);
  const pos = [], uv = [], nor = [], idx = [];
  pts.forEach((p) => { pos.push(p.x, y, p.y); uv.push(p.x / 5, p.y / 5); nor.push(0, 1, 0); });
  for (const t of tris) idx.push(t[0], t[2], t[1]);
  return geo(pos, nor, uv, idx);
}
function geo(pos, nor, uv, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
/** A strip of quads across a profile: `prof(t)` -> [[offset, y], ...] (offsets along `side`), `path` = points. */
function profileStrip(path, profile, heightScale = () => 1) {
  const pos = [], uv = [], idx = [];
  const n = profile.length;
  path.forEach(({ p, side }, i) => {
    const s = heightScale(p[0], p[1]);
    for (const [off, y] of profile) {
      const x = p[0] + side[0] * off, z = p[1] + side[1] * off;
      pos.push(x, y * s, z); uv.push(x / 5, z / 5);
    }
    if (i > 0) for (let k = 0; k + 1 < n; k++) { const a = (i - 1) * n + k, b = i * n + k; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // make sure the strip faces up (winding depends on the side direction)
  const nrm = g.attributes.normal;
  let up = 0; for (let i = 0; i < nrm.count; i++) up += nrm.getY(i);
  if (up < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
  return g;
}
const circlePath = (cx, cz, segs = 48) => Array.from({ length: segs + 1 }, (_, i) => { const a = (i / segs) * Math.PI * 2; return { p: [cx, cz], side: [Math.cos(a), Math.sin(a)] }; });
const meanR = (ring, cx, cz) => ring.reduce((t, p) => t + Math.hypot(p[0] - cx, p[1] - cz), 0) / ring.length;

/** water: a disc of rings (depth 1 in the middle, 0 at the shore), y fixed */
function waterDisc(cx, cz, r, y, segs = 40, rings = 6, wobble = 0) {
  const pos = [cx, y, cz], dep = [1], idx = [];
  for (let k = 1; k <= rings; k++) for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2, f = k / rings, rr = r * f * (1 + wobble * Math.sin(a * 3 + cx) * f);
    pos.push(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr); dep.push(Math.pow(1 - f, 0.7));
  }
  for (let i = 0; i < segs; i++) idx.push(0, 1 + ((i + 1) % segs), 1 + i);
  for (let k = 1; k < rings; k++) { const a0 = 1 + (k - 1) * segs, b0 = 1 + k * segs; for (let i = 0; i < segs; i++) { const i1 = (i + 1) % segs; idx.push(a0 + i, a0 + i1, b0 + i, a0 + i1, b0 + i1, b0 + i); } }
  return waterGeo(pos, dep, idx);
}
function waterGeo(pos, dep, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('depth', new THREE.Float32BufferAttribute(dep, 1));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(idx);
  return g;
}
/** a flat water rectangle (local w x d at (x, z) turned ry), depth 1 in the middle -> `edge` at the rim */
function waterRect(x, z, ry, w, d, y, nx = 6, nz = 6, edge = 0) {
  const pos = [], dep = [], idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const lx = -w / 2 + (w * i) / nx, lz = -d / 2 + (d * j) / nz;
    const [wx, wz] = toWorld(x, z, ry, lx, lz);
    pos.push(wx, y, wz);
    const m = Math.min(1, 2 * Math.min(w / 2 - Math.abs(lx), d / 2 - Math.abs(lz)) / Math.min(w, d) * 2.2);
    dep.push(edge + (1 - edge) * m);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + nx + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  return waterGeo(pos, dep, idx);
}

/**
 * plan -> { ground: Mesh, water: Mesh, heightFns: [(x,z)=>y], colliders: [box], report }
 */
export async function buildGroundAndWater(plan, roads) {
  const ground = [], water = [], heightFns = [], solid = [], report = { patches: 0, ponds: 0, channels: 0, groundTris: 0, waterTris: 0 };
  const look = (l) => ({ soil: l.soil, color: l.color, spacing: l.spacing || 0, cover: l.cover });
  let sliceT = performance.now(); // 26 Nov: patches/channels/ponds/designs each scanned in one task; yield every ~8 ms

  // 1. painted patches (on top of the open ground, under the roads)
  for (const p of plan.patches) {
    if (performance.now() - sliceT > 8) { await yieldToMain(); sliceT = performance.now(); }
    const l = PATCH_LOOKS[p.kind === 'playcorner' ? 'play' : p.kind];
    if (!l || !p.ring) continue;
    const g = polyGeometry(p.ring, PATCH_Y);
    const along = p.w >= p.d ? [Math.cos(p.ry), -Math.sin(p.ry)] : [Math.sin(p.ry), Math.cos(p.ry)];
    paint(g, look(l), Math.atan2(along[1], along[0])); // ruts / rows run along the long side
    ground.push(g); report.patches++;
  }

  // 2. field channels: wet mud bed + earth bunds both sides, water ribbon between
  for (const c of plan.channels) {
    if (performance.now() - sliceT > 8) { await yieldToMain(); sliceT = performance.now(); }
    const L = Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1]);
    if (L < 1) continue;
    const u = [(c.b[0] - c.a[0]) / L, (c.b[1] - c.a[1]) / L], side = [-u[1], u[0]];
    const hw = Math.min(0.45, (c.width || 1) * 0.42);
    const steps = Math.max(2, Math.ceil(L / 3));
    const path = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * L, wob = Math.sin(t * 0.35 + c.a[0]) * 0.08; // a hand-dug channel never runs ruler-straight
      path.push({ p: [c.a[0] + u[0] * t + side[0] * wob, c.a[1] + u[1] * t + side[1] * wob], side });
    }
    const bundProfile = (s) => [[s * (hw - 0.02), 0.03], [s * (hw + 0.12), 0.15], [s * (hw + 0.32), 0.16], [s * (hw + 0.6), 0.0]];
    for (const s of [-1, 1]) { const g = profileStrip(path, bundProfile(s)); paint(g, { soil: 0x8a7254, color: 0x6a7a3a, spacing: 0, cover: 0.3 }, 0); ground.push(g); }
    const bed = profileStrip(path, [[-hw, 0.03], [0, 0.022], [hw, 0.03]]);
    paint(bed, { soil: 0x5a4a36, color: 0x4a5a2a, spacing: 0, cover: 0.08 }, 0);
    ground.push(bed);
    // the water: a ribbon along the same wobbling path
    const pos = [], dep = [], idx = [];
    path.forEach(({ p }, i) => {
      for (const [k, f] of [[-1, 0], [0, 1], [1, 0]].map(([k, d]) => [k, d])) { pos.push(p[0] + side[0] * k * hw * 0.92, 0.075, p[1] + side[1] * k * hw * 0.92); dep.push(f * 0.55 + 0.1); }
      if (i > 0) for (let k = 0; k < 2; k++) { const a = (i - 1) * 3 + k, b = i * 3 + k; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    });
    water.push(waterGeo(pos, dep, idx));
    report.channels++;
  }

  // 3. ponds: raised earthen bund round the water, wet mud bed under it, water just above the ground
  for (const p of plan.ponds) {
    if (performance.now() - sliceT > 8) { await yieldToMain(); sliceT = performance.now(); }
    if (!p.water) continue;
    const rw = meanR(p.water, p.x, p.z), rb = p.bank ? meanR(p.bank, p.x, p.z) : rw + 1.6;
    const crest = rw + (rb - rw) * 0.42;
    // where a gali runs past, the bund flattens into it rather than rising out of the road (2 ponds touch a gali)
    const flat = (x, z) => Math.max(0, Math.min(1, (roadClearance(roads, x, z) - 0.1) / 1.4));
    const path = circlePath(p.x, p.z, 56);
    const clay = p.kind === 'Clay pit pond';
    const inner = profileStrip(path, [[rw - 0.9, 0.02], [rw, WATER_Y + 0.01], [crest, BANK_Y]], (x, z) => 1);
    const outer = profileStrip(path.map((q) => ({ ...q })), [[crest, BANK_Y], [rb, 0.0]]);
    // S7 fixes: where a gali runs inside the drawn bank, the bank ends at the gali edge and the water a 0.6 m lip short
    // of it (src/kit/mapObjectsPlan.js pondSqueeze); the rest of the pond keeps its drawn size
    const sq = pondSqueeze(roads, p);
    const squeeze = (g) => {
      if (!sq.touched) return g;
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) {
        const dx = P.getX(i) - p.x, dz = P.getZ(i) - p.z, a = Math.atan2(dz, dx), r = Math.hypot(dx, dz), r2 = sq.map(r, a);
        if (r > 1e-6) P.setXYZ(i, p.x + (dx / r) * r2, P.getY(i), p.z + (dz / r) * r2);
      }
      P.needsUpdate = true;
      return g;
    };
    squeeze(inner); squeeze(outer);
    // flatten near roads (outer bank vertices)
    for (const g of [inner, outer]) {
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) P.setY(i, P.getY(i) * flat(P.getX(i), P.getZ(i)) + (1 - flat(P.getX(i), P.getZ(i))) * Math.min(P.getY(i), PATCH_Y));
      g.computeVertexNormals();
    }
    paint(inner, { soil: clay ? 0x7a5236 : 0x5e4c38, color: 0x56602c, spacing: 0, cover: 0.12 }, 0);
    paint(outer, { soil: clay ? 0x9a6a48 : 0x8a7454, color: 0x6e7e3a, spacing: 0, cover: clay ? 0.25 : 0.62 }, 0);
    const bed = polyGeometry(Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * Math.PI * 2, rr = sq.map(rw - 0.85, a); return [p.x + Math.cos(a) * rr, p.z + Math.sin(a) * rr]; }), 0.018);
    paint(bed, { soil: clay ? 0x6a4630 : 0x4a3e2e, color: 0x3e4a26, spacing: 0, cover: 0.2 }, 0);
    ground.push(inner, outer, bed);
    water.push(squeeze(waterDisc(p.x, p.z, rw + 0.05, WATER_Y, 48, 7, 0.0)));
    const cx = p.x, cz = p.z;
    heightFns.push((x, z) => {
      const d = sq.touched ? sq.inv(Math.hypot(x - cx, z - cz), Math.atan2(z - cz, x - cx)) : Math.hypot(x - cx, z - cz);
      if (d > rb || d < rw) return 0;
      const y = d < crest ? WATER_Y + (BANK_Y - WATER_Y) * (d - rw) / (crest - rw) : BANK_Y * (rb - d) / (rb - crest);
      return y * flat(x, z);
    });
    // the water is solid (the player stops at the edge, like the canal): 1.5 m cells inside rw - 0.4
    const R = rw - 0.4;
    for (let gx = -R; gx < R; gx += 1.5) for (let gz = -R; gz < R; gz += 1.5) {
      if (sq.touched) { // squeezed pond: a cell is water only if all four corners are inside the built water, 0.4 m in
        const ins = [[gx, gz], [gx + 1.5, gz], [gx, gz + 1.5], [gx + 1.5, gz + 1.5]].every(([a, b]) => sq.inv(Math.hypot(a, b), Math.atan2(b, a)) <= R + 0.8);
        const nearIn = sq.inv(Math.hypot(gx + 0.75, gz + 0.75), Math.atan2(gz + 0.75, gx + 0.75)) <= R;
        if (ins && nearIn) solid.push({ minX: cx + gx, maxX: cx + gx + 1.5, minZ: cz + gz, maxZ: cz + gz + 1.5 });
        continue;
      }
      const ex = Math.max(Math.abs(gx), Math.abs(gx + 1.5)), ez = Math.max(Math.abs(gz), Math.abs(gz + 1.5));
      if (Math.hypot(Math.min(Math.abs(gx), Math.abs(gx + 1.5)), Math.min(Math.abs(gz), Math.abs(gz + 1.5))) > R) continue;
      if (Math.hypot(ex, ez) > R + 0.8) continue;
      solid.push({ minX: cx + gx, maxX: cx + gx + 1.5, minZ: cz + gz, maxZ: cz + gz + 1.5 });
    }
    report.ponds++;
  }

  // 4. temple tank: water surface and mud floor in the 8 x 8 kund (the stone is a batch design)
  for (const t of plan.tanks) {
    const I = t.inner / 2;
    const ring = [[-I, -I], [I, -I], [I, I], [-I, I]].map(([a, b]) => toWorld(t.x, t.z, t.ry, a, b));
    const bed = polyGeometry(ring, 0.02);
    paint(bed, { soil: 0x4a4232, color: 0x3e4a26, spacing: 0, cover: 0.15 }, 0);
    ground.push(bed);
    water.push(waterRect(t.x, t.z, t.ry, t.inner - 0.02, t.inner - 0.02, 0.09, 8, 8, 0.35));
    const O = t.outer / 2, step = (O - 0.5 - I) / 3, c = Math.cos(t.ry), s = Math.sin(t.ry);
    heightFns.push((x, z) => {
      const dx = x - t.x, dz = z - t.z, lx = dx * c - dz * s, lz = dx * s + dz * c, m = Math.max(Math.abs(lx), Math.abs(lz));
      if (m >= O - 0.5 && m <= O + 0.04) return 0.66;
      if (m >= I && m < O - 0.5) return 0.15 + Math.min(2, Math.floor((m - I) / step)) * 0.15;
      if (lz > O && lz < O + 1.05 && Math.abs(lx) < 1.2) return 0.6 - Math.floor((lz - O) / 0.3 + 0.0001) * 0.2;
      return 0;
    });
    // the kund water is solid
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const lx0 = -I + 0.3 + i * (2 * I - 0.6) / 4, lz0 = -I + 0.3 + j * (2 * I - 0.6) / 4, cell = (2 * I - 0.6) / 4;
      const pts = [[lx0, lz0], [lx0 + cell, lz0], [lx0, lz0 + cell], [lx0 + cell, lz0 + cell]].map(([a, b]) => toWorld(t.x, t.z, t.ry, a, b));
      solid.push({ minX: Math.min(...pts.map((q) => q[0])), maxX: Math.max(...pts.map((q) => q[0])), minZ: Math.min(...pts.map((q) => q[1])), maxZ: Math.max(...pts.map((q) => q[1])) });
    }
  }

  // 5. tubewell hauz water and the falling water from the pipe; trough water
  for (const d of plan.designs) {
    if (performance.now() - sliceT > 8) { await yieldToMain(); sliceT = performance.now(); }
    if (d.kind === 'tubewell') {
      const [hx, hz] = toWorld(d.x, d.z, d.ry, 2.25, 0);
      water.push(waterRect(hx, hz, d.ry, 1.06, 0.96, 0.46, 2, 2, 0.6));
      // falling water: a thin vertical sheet from the pipe mouth to the surface, four faces
      const [fx, fz] = toWorld(d.x, d.z, d.ry, 2.22, 0);
      const box = new THREE.BoxGeometry(0.08, 0.4, 0.1).translate(0, 0.66, 0).rotateY(d.ry).translate(fx, 0, fz);
      box.deleteAttribute('uv');
      box.setAttribute('depth', new THREE.Float32BufferAttribute(new Float32Array(box.attributes.position.count).fill(0.25), 1));
      water.push(box);
    } else if (d.kind === 'trough') water.push(waterRect(d.x, d.z, d.ry, (d.w || 3.2) - 0.26, (d.d || 0.9) - 0.26, 0.44, 4, 2, 0.6));
  }

  const out = { heightFns, colliders: solid, report };
  if (ground.length) {
    const g = mergeGeometries(ground);
    const m = new THREE.Mesh(g, fieldMaterial());
    m.name = 's7_mapobjects_ground';
    m.receiveShadow = true;
    m.userData.noAutoCollider = true;
    m.userData.groundLevel = true;
    out.ground = m;
    report.groundTris = g.index.count / 3;
  }
  if (water.length) {
    const g = mergeGeometries(water.map((x) => { for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'depth'].includes(k)) x.deleteAttribute(k); return x; }));
    const m = new THREE.Mesh(g, createWaterMaterial({ shallow: 0x7a7848, deep: 0x3e4a30, scale: 1.2, opacity: 0.94 }));
    m.name = 's7_mapobjects_water';
    m.receiveShadow = true;
    m.userData.noAutoCollider = true;
    out.water = m;
    report.waterTris = (g.index ? g.index.count : g.attributes.position.count) / 3;
  }
  return out;
}
