import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANCHORS, localPt } from './anchors.js';
import { requestColliderRebuild } from './collision.js';
import { getTiledMaterial, texturedBox } from './materials.js';
import { STATIC_COLLIDERS, staticBoxesNear, circleHitsAnyBox } from './collision.js';
import { addHandPumps } from './handPumps.js';
import { addPots, flushMerged } from './pots.js';
import { batchLateGroup } from './placeBatch.js';

/**
 * Life scenes, second set (docs/PARALLEL.md section D): mosquito net over a charpai in an angan, rangoli at doorways,
 * children's games (hopscotch, marbles, a rolling tyre), kids at a hand pump, a TV watched from the ground.
 *
 * Every site is found at run time: once the static colliders exist, each scene searches outward from a preferred anchor for ground that is
 * at least CLEAR metres from any collider, so a map change only needs the anchor ids edited. Nothing here is solid (no colliders added);
 * the 3 m clearance is what keeps the player from standing inside a bed or a TV.
 * Cost: per scene 2-3 small merged meshes (textured wood / jute / metal sets, vertex-tinted per piece), one shared decal mesh per scene
 * (procedural canvas atlas, 1 call), ONE shared InstancedMesh for every person. Hand pump + pots are the existing merged models.
 * People are capsule placeholders, as in src/bazaarLife.js.
 */
const CLEAR = 3;
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---- decal atlas (procedural, 1024x768): 4 rangoli | hopscotch + marble ring | TV picture ----
const ATLAS_W = 1024, ATLAS_H = 768;
const uvRect = (x, y, w, h) => [x / ATLAS_W, 1 - (y + h) / ATLAS_H, (x + w) / ATLAS_W, 1 - y / ATLAS_H];
const UV_RANGOLI = [0, 1, 2, 3].map((i) => uvRect(i * 256, 0, 256, 256));
const UV_HOPSCOTCH = uvRect(0, 256, 768, 256);
const UV_RING = uvRect(768, 256, 256, 256);
const UV_TV = uvRect(0, 512, 256, 256);

function drawRangoli(g, cx, cy, R, kind, pal) {
  g.save(); g.translate(cx, cy);
  const petals = (n, r0, r1, w, col) => {
    g.fillStyle = col;
    for (let i = 0; i < n; i++) { g.save(); g.rotate((i / n) * Math.PI * 2); g.beginPath(); g.moveTo(0, r0); g.quadraticCurveTo(w, (r0 + r1) / 2, 0, r1); g.quadraticCurveTo(-w, (r0 + r1) / 2, 0, r0); g.fill(); g.restore(); }
  };
  const dots = (n, r, rr, col) => { g.fillStyle = col; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, rr, 0, 7); g.fill(); } };
  const ring = (r, lw, col) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); };
  if (kind === 0) { // lotus
    ring(R * 0.97, 5, pal[3]); petals(16, R * 0.5, R * 0.95, R * 0.14, pal[0]); petals(8, R * 0.3, R * 0.7, R * 0.16, pal[1]);
    dots(16, R * 0.88, 3.5, pal[2]); g.fillStyle = pal[2]; g.beginPath(); g.arc(0, 0, R * 0.16, 0, 7); g.fill();
  } else if (kind === 1) { // star and squares
    g.fillStyle = pal[0];
    for (let k = 0; k < 2; k++) { g.save(); g.rotate(k * Math.PI / 4); g.fillRect(-R * 0.6, -R * 0.6, R * 1.2, R * 1.2); g.restore(); }
    g.fillStyle = pal[1];
    for (let k = 0; k < 2; k++) { g.save(); g.rotate(k * Math.PI / 4); g.fillRect(-R * 0.42, -R * 0.42, R * 0.84, R * 0.84); g.restore(); }
    petals(8, R * 0.08, R * 0.4, R * 0.1, pal[2]); dots(8, R * 0.78, 4, pal[3]);
  } else if (kind === 2) { // dotted diya wheel
    ring(R * 0.92, 4, pal[0]); ring(R * 0.7, 4, pal[1]);
    for (let r = 0; r < 4; r++) dots(10 + r * 4, R * (0.2 + r * 0.17), 4.5, pal[r % 4]);
    petals(12, R * 0.72, R * 0.97, R * 0.06, pal[2]);
  } else { // border swirl
    for (let k = 0; k < 4; k++) { g.save(); g.rotate(k * Math.PI / 2); petals(3, R * 0.15, R * 0.8, R * 0.2, pal[k % 3]); g.restore(); }
    ring(R * 0.9, 5, pal[3]); dots(24, R * 0.9, 3, pal[1]);
  }
  g.restore();
}

let atlasTex = null;
function getAtlas() {
  if (atlasTex) return atlasTex;
  const c = document.createElement('canvas'); c.width = ATLAS_W; c.height = ATLAS_H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, ATLAS_W, ATLAS_H);
  const pals = [['#e8941c', '#c8304a', '#f4efe2', '#4a8a3c'], ['#d9368a', '#f2c230', '#f4efe2', '#2f6fb0'], ['#f4efe2', '#e0662a', '#c8304a', '#f2c230'], ['#3d8a5a', '#f4efe2', '#d9368a', '#e8941c']];
  for (let i = 0; i < 4; i++) drawRangoli(g, i * 256 + 128, 128, 118, i, pals[i]);
  // hopscotch: chalk grid, 1-2-1-2-1-2-3 (no numerals needed)
  g.strokeStyle = 'rgba(244,240,230,0.9)'; g.lineWidth = 7; g.lineJoin = 'round';
  const cy = 256 + 128;
  // single vs double cells along the strip
  const bw = 88, bh = 88;
  const layout = [[1, 0], [2, 0], [1, 0], [2, 0], [1, 0], [2, 0], [3, 0]];
  let x = 14;
  layout.forEach(([n]) => {
    if (n === 1) { g.strokeRect(x, cy - bh / 2, bw, bh); x += bw; }
    else { for (let k = 0; k < n; k++) g.strokeRect(x + k * bw * 0.78, cy - bh / 2 + (n === 2 ? 0 : 0), bw * 0.78, bh); x += bw * 0.78 * n; }
  });
  // marble ring (scratched circle in dust)
  g.strokeStyle = 'rgba(236,228,210,0.8)'; g.lineWidth = 6;
  g.beginPath(); g.arc(768 + 128, 256 + 128, 108, 0, 7); g.stroke();
  g.strokeStyle = 'rgba(236,228,210,0.35)'; g.lineWidth = 3; g.beginPath(); g.arc(768 + 128, 256 + 128, 100, 0.3, 5.5); g.stroke();
  // TV picture: a cricket ground, grey cabinet glass
  g.fillStyle = '#20262a'; g.fillRect(0, 512, 256, 256);
  g.fillStyle = '#4f8a52'; g.fillRect(14, 526, 228, 228);
  g.fillStyle = '#7cab6d'; for (let i = 0; i < 6; i++) g.fillRect(14 + i * 38, 526, 19, 228);
  g.fillStyle = '#d8c690'; g.fillRect(114, 590, 28, 100);
  g.fillStyle = '#f0f0ea'; for (const [px, py] of [[90, 600], [170, 620], [130, 570], [60, 660]]) { g.beginPath(); g.arc(px, py, 7, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(14, 526); g.lineTo(120, 526); g.lineTo(14, 640); g.fill();
  // powder grain on all decals
  const img = g.getImageData(0, 0, 1024, 512), d = img.data;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 0) { const n = (Math.random() - 0.5) * 36; d[i] = Math.max(0, Math.min(255, d[i] + n)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n)); if (i / 4 % 7 === 0 && d[i + 3] > 200) d[i + 3] = 150; } }
  g.putImageData(img, 0, 0);
  atlasTex = new THREE.CanvasTexture(c);
  atlasTex.colorSpace = THREE.SRGBColorSpace;
  atlasTex.anisotropy = 8;
  return atlasTex;
}

let decalMat = null;
const getDecalMat = () => decalMat || (decalMat = new THREE.MeshStandardMaterial({
  map: getAtlas(), transparent: true, depthWrite: false, roughness: 1, metalness: 0, vertexColors: true,
  polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
}));

/** Flat quad (lying on the ground, or standing if vertical) with an atlas rect, a size, a yaw and a tint. */
function decalQuad(uv, w, d, x, y, z, yaw, tint, vertical = false) {
  const geo = new THREE.PlaneGeometry(w, d);
  if (!vertical) geo.rotateX(-Math.PI / 2);
  geo.rotateY(yaw); geo.translate(x, y, z);
  const t = geo.attributes.uv;
  for (let i = 0; i < t.count; i++) t.setXY(i, uv[0] + t.getX(i) * (uv[2] - uv[0]), uv[1] + t.getY(i) * (uv[3] - uv[1]));
  const col = new Float32Array(geo.attributes.position.count * 3);
  const c = new THREE.Color(tint);
  for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// ---- merged-geometry helper: pieces are placed in a site's local frame (x right, z front), then turned onto the world ----
class Batch {
  constructor() { this.by = new Map(); }
  add(matKey, mat, geo) { if (!this.by.has(matKey)) this.by.set(matKey, { mat, list: [] }); this.by.get(matKey).list.push(geo); }
  box(site, set, w, h, d, lx, ly, lz, yaw, tint, tile = 1) {
    const geo = texturedBox(w, h, d, set, { tileSize: tile, tint }).geometry;
    this.addTo(site, geo, lx, ly, lz, yaw, set);
  }
  addTo(site, geo, lx, ly, lz, yaw, set) {
    geo.rotateY(yaw); geo.translate(lx, ly, lz); geo.rotateY(site.ry); geo.translate(site.x, 0, site.z);
    this.add(set, getTiledMaterial(set, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }), geo);
  }
  tinted(site, set, geo, lx, ly, lz, yaw, tint) { // any non-box geometry (sphere, torus), tinted per piece
    const n = geo.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color(tint);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.addTo(site, geo.index ? geo.toNonIndexed() : geo, lx, ly, lz, yaw, set);
  }
  flush(group, name) {
    let n = 0;
    for (const { mat, list } of this.by.values()) {
      const norm = list.map((g) => { const x = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) x.deleteAttribute(k); return x; });
      const m = new THREE.Mesh(mergeGeometries(norm), mat);
      m.name = `${name}_${n++}`; m.castShadow = true; m.receiveShadow = true; group.add(m);
    }
  }
}

// ---- people: one shared capsule InstancedMesh ----
const NPC_H = 1.7, NPC_R = 0.32;
const SKIN_TINTS = [0x4a6a8a, 0xa06a4a, 0x6a4a8a, 0x8a8a4a, 0x7a3a3a, 0x3a6a5a, 0x9a7a4a, 0x5a7a8a, 0xb08a5a, 0x8a5a6a];
const people = [];
/** kid/adult capsule; `h` = standing height in metres, `sit` squashes it to a seated figure. */
function person(site, lx, lz, h, yaw, i, opts = {}) {
  const w = localToWorld(site, lx, lz);
  const p = { x: w.x, z: w.z, h, yaw: yaw + site.ry, r: h < 1.4 ? 0.2 : 0.3, tint: SKIN_TINTS[(i * 3 + people.length) % SKIN_TINTS.length], ...opts };
  people.push(p);
  return p;
}
function localToWorld(site, lx, lz) { const s = Math.sin(site.ry), c = Math.cos(site.ry); return { x: site.x + lx * c + lz * s, z: site.z - lx * s + lz * c }; }

// ---- clear-ground search ----
const freeAt = (x, z, r) => !circleHitsAnyBox({ x, z }, r, staticBoxesNear(x, z, r + 1));
const taken = [];
function findSite(anchorId, lx, lz, ry, spread = 30) {
  const a = ANCHORS[anchorId]; if (!a) return null;
  const base = localPt(anchorId, lx, lz);
  for (let ring = 0; ring <= spread; ring += 2) {
    const n = ring === 0 ? 1 : Math.ceil(ring * 1.6);
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2 + ring * 0.7;
      const x = base.x + Math.cos(ang) * ring, z = base.z + Math.sin(ang) * ring;
      if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < 12)) continue;
      if (freeAt(x, z, CLEAR + 0.5)) { const s = { x, z, ry }; taken.push(s); return s; }
    }
  }
  return null;
}

// ---- the scenes ----
function buildNet(site, group) {
  const b = new Batch();
  const W = 2.0, D = 1.05, LEG = 0.42;
  // charpai: four turned legs, side rails, jute-strung bed
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(site, 'wood', 0.09, LEG, 0.09, sx * (W / 2 - 0.05), LEG / 2, sz * (D / 2 - 0.05), 0, 0xb09070, 0.5);
  for (const sz of [-1, 1]) b.box(site, 'wood', W, 0.07, 0.07, 0, LEG, sz * (D / 2 - 0.05), 0, 0xa88a68, 0.5);
  for (const sx of [-1, 1]) b.box(site, 'wood', 0.07, 0.07, D, sx * (W / 2 - 0.05), LEG, 0, 0, 0xa88a68, 0.5);
  b.box(site, 'jute', W - 0.1, 0.03, D - 0.1, 0, LEG + 0.01, 0, 0, 0xd8c8a4, 0.4);
  // folded cotton dari + pillow
  b.box(site, 'jute', 1.5, 0.05, 0.9, 0.12, LEG + 0.05, 0, 0.03, 0xc87858, 0.5);
  b.box(site, 'jute', 0.4, 0.09, 0.32, -0.78, LEG + 0.1, 0, 0.1, 0xe0d4b8, 0.4);
  // four bamboo net poles lashed to the legs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(site, 'wood', 0.035, 1.55, 0.035, sx * (W / 2 + 0.06), 0.78, sz * (D / 2 + 0.06), 0, 0xb8a060, 0.3);
  // water matka on a stand and a hand fan on the floor beside
  b.box(site, 'wood', 0.5, 0.3, 0.5, 1.9, 0.15, -0.9, 0.4, 0x9a7a58, 0.5);
  b.flush(group, 'net_bed');

  // the net: tapered box, fine woven alpha, open at the foot of the bed
  const nW = W + 0.35, nD = D + 0.35, nH = 1.5;
  const geo = new THREE.BoxGeometry(nW, nH, nD, 1, 1, 1);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * 0.55); p.setZ(i, p.getZ(i) * 0.55); }
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 8, uv.getY(i) * 5);
  geo.translate(0, nH / 2 + 0.02, 0); geo.rotateY(site.ry); geo.translate(site.x, 0, site.z);
  geo.computeVertexNormals();
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = 'rgba(236,236,228,0.16)'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(250,250,244,0.75)'; g.lineWidth = 3; g.strokeRect(0, 0, 64, 64);
  g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke();
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const net = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1, color: 0xf2f0e6 }));
  net.name = 'net_cloth'; net.receiveShadow = true; group.add(net);
  // someone asleep under it, lying along the bed
  person(site, 0.1, 0, 1.7, Math.PI / 2, 1, { lying: true, tint: 0x7a6a9a });
}

function buildGame(site, group) {
  const b = new Batch();
  const decals = [];
  decals.push(decalQuad(UV_HOPSCOTCH, 4.2, 1.4, 0, 0.035, 2.2, 0.05, 0xfffffa));
  decals.push(decalQuad(UV_RING, 1.9, 1.9, -1.4, 0.035, -0.8, 0, 0xfffffa));
  decals.forEach((d) => { d.rotateY(site.ry); }); // placed in local frame, then turned and moved
  decals.forEach((d) => d.translate(site.x, 0, site.z));
  // marbles in the ring, a thrown stone on hopscotch; tyre handled below
  const MARBLES = [0xd8483a, 0x3a78c8, 0xe8b830, 0x4aa868, 0xf0f0e8, 0x9a48c0, 0xe87a30];
  MARBLES.forEach((col, i) => b.tinted(site, 'metal', new THREE.SphereGeometry(0.014, 6, 4), -1.4 + (rnd(i) - 0.5) * 0.6, 0.016, -0.8 + (rnd(i + 9) - 0.5) * 0.6, 0, col));
  b.tinted(site, 'metal', new THREE.CylinderGeometry(0.03, 0.035, 0.012, 7), -0.55, 0.01, 2.15, 0.3, 0x8a8478);
  // three kids crouched round the marble ring
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + 0.4, r = 1.15;
    person(site, -1.4 + Math.cos(a) * r, -0.8 + Math.sin(a) * r, 1.05, -a + Math.PI / 2, 2 + k, { crouch: true });
  }
  // a child hopping the hopscotch (one-legged lean animated)
  person(site, 0.7, 2.2, 1.15, -Math.PI / 2, 7, { hop: true });
  // the tyre roller: kid + tyre travel one lane
  const tyre = new THREE.TorusGeometry(0.27, 0.07, 8, 16);
  tyre.rotateY(Math.PI / 2); tyre.translate(0, 0.34, 0);
  const tn = tyre.attributes.position.count, tc = new Float32Array(tn * 3); tc.fill(0.55);
  tyre.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  const tyreMat = getTiledMaterial('metal', { repeatX: 3, repeatY: 3, roughness: 1, tint: '#2a2a2a', vertexColors: true });
  const tyreMesh = new THREE.Mesh(tyre, tyreMat); tyreMesh.name = 'tyre'; tyreMesh.castShadow = true;
  group.add(tyreMesh);
  const kid = person(site, 0, 0, 1.2, 0, 11, { tyre: tyreMesh, lane: { z: -2.6, x0: -2.2, x1: 2.4 } });
  b.flush(group, 'game_bits');
  const dm = new THREE.Mesh(mergeGeometries(decals.map((d) => d.toNonIndexed ? d : d)), getDecalMat());
  dm.name = 'game_decals'; dm.renderOrder = 2; dm.receiveShadow = false; group.add(dm);
  kid.site = site;
}

function buildPump(site, group) {
  const sink = new Map();
  const pl = (lx, lz) => localToWorld(site, lx, lz);
  const pp = pl(0, 0);
  const root = new THREE.Group(); // geometry baked in world coords below, so the group stays at the origin
  const type = ['mark2', 'old', 'cracked'][Math.floor(rnd(site.x) * 3)];
  const potsAt = [[-0.9, 1.5, 'ghada'], [-1.4, 2.4, 'matka'], [-2.0, 3.2, 'surahi'], [0.9, 0.5, 'ghada']];
  Promise.all([
    addHandPumps(root, [{ type, x: pp.x, y: 0, z: pp.z, ry: site.ry + 0.4, s: 0.95, tint: 0xffffff }], 'lsc2_pump', sink),
    addPots(root, potsAt.map(([lx, lz, t], i) => { const q = pl(lx, lz); return { type: t, x: q.x, y: 0, z: q.z, ry: rnd(i + site.z) * 6.28, s: 0.85 + rnd(i) * 0.15, lean: 0.04, tint: [0xe6e2da, 0xeee0d2, 0xe0c8b0][i % 3] }; }), 'lsc2_pots', sink),
  ]).then(() => { flushMerged(group, sink, 'lsc2_pump_props', true); });
  // the pumper, plus a queue of three with pots at their feet
  person(site, -0.6, -0.1, 1.2, Math.PI / 2 + 0.2, 4, { pump: true });
  person(site, -0.9, 1.0, 1.1, 0, 5, {}); person(site, -1.5, 1.9, 1.0, 0.2, 6, {}); person(site, -2.1, 2.7, 1.15, -0.1, 8, {});
  void root;
}

function buildTV(site, group) {
  const b = new Batch();
  // a doorway: frame posts + lintel + step in plaster-washed wood, dark room behind, TV on a low table inside
  b.box(site, 'wood', 0.18, 2.2, 0.2, -0.75, 1.1, 0, 0, 0x8a6a48, 0.6);
  b.box(site, 'wood', 0.18, 2.2, 0.2, 0.75, 1.1, 0, 0, 0x8a6a48, 0.6);
  b.box(site, 'wood', 1.8, 0.2, 0.22, 0, 2.3, 0, 0, 0x7a5a3a, 0.6);
  b.box(site, 'plaster', 3.4, 2.4, 0.24, -2.55, 1.2, 0.0, 0, 0xd8cdb4, 1); // wall left
  b.box(site, 'plaster', 3.4, 2.4, 0.24, 2.55, 1.2, 0.0, 0, 0xd8cdb4, 1); // wall right
  b.box(site, 'plaster', 1.8, 0.16, 0.24, 0, 2.52, 0, 0, 0xd8cdb4, 1);
  b.box(site, 'plaster', 1.5, 2.2, 0.1, 0, 1.1, -0.9, 0, 0x6a5e50, 1); // dim back wall of the room
  b.box(site, 'concrete', 1.7, 0.1, 0.5, 0, 0.05, 0.35, 0, 0xb4aea0, 1); // threshold step
  b.box(site, 'wood', 0.8, 0.45, 0.5, 0, 0.3, -0.35, 0, 0x7a5a3a, 0.6); // low table
  b.box(site, 'metal', 0.62, 0.5, 0.45, 0, 0.78, -0.35, 0, 0x5a5650, 0.6); // set cabinet
  b.box(site, 'wood', 0.05, 0.3, 0.05, -0.1, 1.17, -0.4, 0.5, 0x3a3a3a, 0.2); // rabbit-ear aerial
  b.box(site, 'wood', 0.05, 0.3, 0.05, 0.1, 1.17, -0.4, -0.5, 0x3a3a3a, 0.2);
  b.box(site, 'wood', 1.6, 0.03, 1.1, 0, 0.02, 2.0, 0.04, 0xa89878, 0.8); // dari on the ground, edge
  b.flush(group, 'tv_doorway');
  const sc = localToWorld(site, 0, -0.35 + 0.235);
  const screen = decalQuad(UV_TV, 0.46, 0.34, 0, 0, 0, site.ry, 0xffffff, true);
  screen.translate(sc.x, 0.8, sc.z);
  const sm = new THREE.Mesh(screen, getDecalMat()); sm.name = 'tv_screen'; sm.renderOrder = 3; group.add(sm);
  // four viewers on the ground facing the set, kids in front
  person(site, -0.9, 2.1, 0.95, Math.PI, 1, { sit: true });
  person(site, 0.1, 2.5, 0.8, Math.PI, 2, { sit: true });
  person(site, 1.0, 1.9, 0.85, Math.PI + 0.1, 3, { sit: true });
  person(site, -0.2, 1.4, 0.55, Math.PI, 4, { sit: true, kid: true });
}

/** Rangoli at doorways: scan outward-in along each place's front axis, first collider = the wall, rangoli goes just outside it. */
function buildRangoli(group) {
  const ids = ['house', 'tvhouse', 'haveli', 'post', 'ration', 'chakki', 'dairy', 'anganwadi', 'health', 'tubewell', 'teastall', 'store', 'halwai', 'chaupal', 'panchayat', 'gurukul'];
  const quads = [];
  let n = 0;
  for (const id of ids) {
    if (n >= 10 || !ANCHORS[id]) continue;
    for (const lx of [0, 2.4, -2.4]) {
      let hit = null;
      for (let lz = 16; lz > -3; lz -= 0.4) {
        const q = localPt(id, lx, lz);
        if (circleHitsAnyBox(q, 0.55, staticBoxesNear(q.x, q.z, 1.5))) { hit = lz; break; }
      }
      if (hit == null || hit > 15) continue;
      const q = localPt(id, lx, hit + 1.0);
      if (!freeAt(q.x, q.z, 0.5)) continue;
      const k = n++;
      const size = 0.95 + rnd(k + 3) * 0.55;
      const tint = new THREE.Color().setHSL(0.02 + rnd(k) * 0.1, 0.1 + rnd(k + 1) * 0.15, 0.85 + rnd(k + 2) * 0.12);
      quads.push(decalQuad(UV_RANGOLI[k % 4], size, size, q.x, 0.032 + (k % 3) * 0.002, q.z, rnd(k + 5) * 6.28, tint));
      break;
    }
  }
  if (!quads.length) return 0;
  const mesh = new THREE.Mesh(mergeGeometries(quads), getDecalMat());
  mesh.name = 'rangoli'; mesh.renderOrder = 2; mesh.receiveShadow = false; group.add(mesh);
  return quads.length;
}

export function createLifeScenes2(scene) {
  const group = new THREE.Group(); group.name = 'life_scenes_2';
  scene.add(group);
  batchLateGroup(group, group.name); // code-built tiled meshes join the shared per-material batches (src/placeBatch.js)
  const geo = new THREE.CapsuleGeometry(NPC_R, NPC_H - NPC_R * 2, 4, 8);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  let mesh = null, built = false, elapsed = 0, frames = 0;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

  function build() {
    const scenes = [
      ['net', 'house', 6, 14, 0.3, buildNet], ['game', 'anganwadi', 0, 12, -0.4, buildGame],
      ['pump', 'chakki', 0, 12, 1.2, buildPump], ['tv', 'tvhouse', 5, 12, 0.1, buildTV],
    ];
    const placed = {};
    for (const [name, anchor, lx, lz, ry, fn] of scenes) {
      const site = findSite(anchor, lx, lz, ry + (ANCHORS[anchor].ry || 0)) || findSite('chaupal', lx, lz, ry);
      if (!site) { console.warn('life scenes 2: no clear ground for', name); continue; }
      fn(site, group); placed[name] = site;
    }
    const rg = buildRangoli(group);
    mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, people.length));
    mesh.name = 'life_scenes_2_people'; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    people.forEach((p, i) => { mesh.setColorAt(i, _c.setHex(p.tint)); });
    group.add(mesh);
    group.userData.placed = placed; group.userData.rangoli = rg;
    if (typeof window !== 'undefined') window.__lifeScenes2 = { placed, rangoli: rg, people: people.length };
  }

  function animate(dt) {
    elapsed += dt;
    people.forEach((p, i) => {
      const sc = p.h / NPC_H;
      let y = p.h / 2, lean = 0, ox = 0, oz = 0, yaw = p.yaw, sy = sc, sxz = sc * (p.r / NPC_R);
      if (p.sit) { sy = sc * 0.62; y = p.h * 0.31; }
      if (p.crouch) { sy = sc * 0.72; y = p.h * 0.36; lean = Math.sin(elapsed * 1.3 + i) * 0.12; }
      if (p.pump) { const ph = Math.sin(elapsed * 3.2); lean = ph * 0.22; y = p.h / 2 + Math.max(0, ph) * 0.05; }
      if (p.hop) { y = p.h / 2 + Math.abs(Math.sin(elapsed * 3.4)) * 0.22; lean = 0.06; }
      if (p.lying) { y = 0.42 + 0.25; lean = 0; }
      if (p.tyre) {
        const L = p.lane, span = L.x1 - L.x0, t = (elapsed * 1.5) % (2 * (span + 1.2));
        const fwd = t < span + 0.6; const u = fwd ? Math.min(t, span) : Math.min(2 * span + 1.2 - t, span);
        const lx = L.x0 + u, dir = fwd ? 1 : -1;
        const w = localToWorld(p.site, lx, L.z), tw = localToWorld(p.site, lx + dir * 0.6, L.z);
        p.x = w.x; p.z = w.z; yaw = Math.atan2(tw.x - w.x, tw.z - w.z);
        p.tyre.position.set(tw.x, 0, tw.z); p.tyre.rotation.set(0, yaw, 0);
        p.tyre.rotation.order = 'YXZ'; p.tyre.rotation.x = -(elapsed * 1.5 / 0.34) * dir; p.tyre.rotation.y = yaw;
        lean = 0.12;
      }
      _p.set(p.x + ox, y, p.z + oz);
      if (p.lying) { _e.set(0, yaw, Math.PI / 2, 'YXZ'); _s.set(sc * 0.75, sc, sc * 0.75); }
      else { _e.set(lean, yaw, 0, 'YXZ'); _s.set(sxz, sy, sxz); }
      _q.setFromEuler(_e); _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  // Driven from the scene's render callback (chained) so main.js needs only the one call.
  const prev = scene.onBeforeRender;
  let last = 0;
  scene.onBeforeRender = function (...args) {
    if (prev) prev.apply(this, args);
    frames++;
    if (!built && frames > 30 && STATIC_COLLIDERS.length > 0) { built = true; build(); requestColliderRebuild(); }
    const now = performance.now() / 1000;
    const dt = Math.min(0.1, last ? now - last : 0); last = now;
    if (mesh) animate(dt);
  };
  return { group };
}
