/**
 * Painted milestone stones on the east approach (docs/BACKLOG.md A-2c): from the east gali towards the highway and mandi.
 * Whitewashed stone with a yellow-ochre painted head, as on Indian roads. Hindi on top (bold, larger), English below (not bold,
 * smaller but legible; src/signPaint.js), same dark paint. Distances are computed from PLACES at build time, so a moved highway/mandi re-labels the stones;
 * only the route start (the east gali signpost) and the stone spacing are written here.
 * One shared material and atlas; each stone is one merged mesh, streamed per stone by the zone manager.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PLACES } from './freeRoam.js';
import { roadAt } from './eastRoad.js';
import { drawBilingual } from './signPaint.js';

const SPACING = [6, 50, 95, 140]; // metres along the east road (src/eastRoad.js), which starts at the east gali's end
// Stones on the highway's own west verge (road strip x 198..212, src/farmSites.js roadGeos): one per direction of travel.
const HIGHWAY_STONES = [
  { x: 196.6, z: -18, ry: Math.PI, to: 'mandi', back: 'chowk' },
  { x: 196.6, z: 82, ry: 0, to: 'mandi', back: 'chowk' },
];
const SIDE = 3.4; // stands this far to the right of the walker, clear of the carriageway
const CELL = 256;
const INK = '#2a1a14';

const byId = (id) => PLACES.find((p) => p.id === id);

let shared = null;
function getShared() {
  if (shared) return shared;
  const COLS = SPACING.length + HIGHWAY_STONES.length + 1; // last cell = stone body grain
  const atlas = document.createElement('canvas');
  atlas.width = CELL * COLS;
  atlas.height = CELL;
  const ctx = atlas.getContext('2d');
  // cell COLS-1: limewash grain with dust at the base-side, used on every non-face surface
  const gx = CELL * (COLS - 1);
  ctx.fillStyle = '#e7e0cd';
  ctx.fillRect(gx, 0, CELL, CELL);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '120,100,70' : '255,250,235'},${0.04 + Math.random() * 0.1})`;
    ctx.fillRect(gx + Math.random() * CELL, Math.random() * CELL, 2 + Math.random() * 10, 2 + Math.random() * 6);
  }
  const tex = new THREE.CanvasTexture(atlas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 });
  mat.name = 'milestone';
  shared = { ctx, tex, mat, COLS, drawn: new Set() };
  return shared;
}

function drawFace(s, cell, rows) {
  if (s.drawn.has(cell)) return;
  s.drawn.add(cell);
  const { ctx } = s;
  const ox = cell * CELL;
  ctx.fillStyle = '#ece5d2'; // whitewashed lower body
  ctx.fillRect(ox, 0, CELL, CELL);
  ctx.fillStyle = '#d9a82e'; // ochre painted head
  ctx.fillRect(ox, 0, CELL, 96);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '110,85,50' : '255,245,220'},${0.03 + Math.random() * 0.09})`;
    ctx.fillRect(ox + Math.random() * CELL, Math.random() * CELL, 2 + Math.random() * 12, 2 + Math.random() * 5);
  }
  ctx.fillStyle = INK;
  ctx.fillRect(ox, 94, CELL, 5); // black band between head and body
  // Two destinations per face: one on the ochre head, one on the whitewashed body. Hindi bold on top, English
  // (with the distance) below, both in the same ink (src/signPaint.js).
  const line = (r, y, h) => drawBilingual(ctx, r.hi, `${r.en} ${r.dist}`, { x: ox + CELL / 2, y, w: CELL - 24, h, fg: INK, fillFraction: 0.98 });
  line(rows[0], 4, 88);
  line(rows[1], 108, 140);
  s.tex.needsUpdate = true;
}

function regionUV(g, cell, cols) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (cell + uv.getX(i)) / cols, uv.getY(i));
  return g;
}

/** Stone positions along START -> highway; ids are stable so each can be its own streamed zone. */
export function milestoneSites() {
  const hw = byId('highway');
  if (!hw) return [];
  const hwSites = HIGHWAY_STONES.map((h, i) => ({ id: `milestone_hw${i}`, cell: SPACING.length + i, x: h.x, z: h.z, ry: h.ry, hw: h }));
  return [...hwSites, ...SPACING.map((d, i) => {
    const { x, z, ux, uz } = roadAt(d);
    return {
      id: `milestone_${i}`,
      cell: i,
      x: x - uz * SIDE, // right of an eastbound walker (+z side)
      z: z + ux * SIDE,
      ry: Math.atan2(-ux, -uz), // face normal points back west along the road, towards the approaching walker
      toHighway: Math.round(Math.max(0, Math.hypot(hw.x - x, hw.z - z)) / 5) * 5,
    };
  })];
}

export function createMilestone(site) {
  const s = getShared();
  const hw = byId('highway');
  const mandi = byId('mandi');
  const mDist = mandi ? Math.round(Math.hypot(mandi.x - site.x, mandi.z - site.z) / 5) * 5 : 0;
  const dist = (p) => `${Math.round(Math.hypot(p.x - site.x, p.z - site.z) / 5) * 5} m`;
  if (site.hw) {
    const to = byId(site.hw.to);
    const back = byId(site.hw.back);
    drawFace(s, site.cell, [
      { hi: to.hi, en: to.en, dist: dist(to) },
      { hi: back.hi, en: 'Chowk', dist: dist(back) },
    ]);
  } else drawFace(s, site.cell, [
    { hi: 'हाईवे', en: 'Highway', dist: `${site.toHighway} m` },
    { hi: mandi ? mandi.hi : 'मंडी', en: 'Mandi', dist: `${mDist} m` },
  ]);
  const cols = s.COLS;
  const grain = cols - 1;
  const W = 0.95;
  const H = 1.45;
  const D = 0.2;
  const m = new THREE.Matrix4().makeRotationY(site.ry).setPosition(site.x, 0, site.z);
  const geos = [];
  const body = new THREE.BoxGeometry(W, H, D);
  body.translate(0, H / 2 - 0.08, 0);
  geos.push(regionUV(body, grain, cols).applyMatrix4(m));
  const head = new THREE.CylinderGeometry(W / 2, W / 2, D, 14, 1, false, -Math.PI / 2, Math.PI);
  head.rotateX(Math.PI / 2);
  head.translate(0, H - 0.08, 0);
  geos.push(regionUV(head, grain, cols).applyMatrix4(m));
  const face = new THREE.PlaneGeometry(W, W);
  face.translate(0, H - 0.08 - W / 2, D / 2 + 0.004);
  geos.push(regionUV(face, site.cell, cols).applyMatrix4(m));
  const base = new THREE.BoxGeometry(W + 0.14, 0.14, D + 0.14);
  base.translate(0, 0.0, 0);
  geos.push(regionUV(base, grain, cols).applyMatrix4(m));
  const mesh = new THREE.Mesh(mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g))), s.mat);
  mesh.name = site.id;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const r = 0.55;
  mesh.userData.colliderBoxes = [{ minX: site.x - r, maxX: site.x + r, minZ: site.z - r, maxZ: site.z + r }];
  const group = new THREE.Group();
  group.name = site.id;
  group.add(mesh);
  return group;
}
