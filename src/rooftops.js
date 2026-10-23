/**
 * Rooftop clutter on the abadi rows: Sintex-style water tanks on a small concrete plinth, old aluminium TV antennas, dish
 * antennas, solar panels and loose brick stacks. Sites come from scenery.js abadiRoofSites (one or two per house box, picked
 * deterministically); the village is cut into streamed cells and each cell merges everything it holds into one mesh per shared
 * texture (metal / concrete / brick), so a cell costs three draws at most and nothing is built far from the player.
 * Every fitting is textured from the shared CC0 sets with a baked tint, and size, yaw, lean and tint vary per site.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getTiledMaterial, bakeFlatTintColors } from './materials.js';

const CELL = 36;

export function roofCells(sites) {
  const cells = new Map();
  for (const s of sites) {
    const key = `${Math.floor(s.x / CELL)}_${Math.floor(s.z / CELL)}`;
    if (!cells.has(key)) cells.set(key, { id: `roof_${key}`, x: (Math.floor(s.x / CELL) + 0.5) * CELL, z: (Math.floor(s.z / CELL) + 0.5) * CELL, sites: [] });
    cells.get(key).sites.push(s);
  }
  return [...cells.values()];
}

const TILE = 1.2;
function prep(geometry, tint, tw, th) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * tw / TILE, uv.getY(i) * th / TILE);
  geometry.setAttribute('uv2', new THREE.BufferAttribute(uv.array.slice(), 2));
  bakeFlatTintColors(geometry, tint);
  return geometry;
}
const box = (w, h, d, tint, m) => {
  const g = new THREE.BoxGeometry(w, h, d);
  prep(g, tint, Math.max(w, d), h);
  return g.applyMatrix4(m);
};
const cyl = (rt, rb, h, tint, m, seg = 14) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  prep(g, tint, Math.PI * (rt + rb), h);
  return g.applyMatrix4(m);
};

const PLASTIC = ['#2b3a4a', '#1f2b36', '#3a4650', '#2a2f33', '#46535c']; // black / slate-blue Sintex plastics
const ALU = ['#c9cdd0', '#b8bdc1', '#d4d6d6', '#a9aeb2'];
const DISH = ['#e3e1da', '#cfcdc6', '#b9bdc1', '#e7ddd0'];
const PANEL = ['#27384f', '#1f2f45', '#2f3f55'];
const BRICKS = ['#c98f6d', '#bf8260', '#d19a78'];

export function createRoofCell(cell) {
  const parts = { metal: [], concrete: [], brick: [] };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const at = (x, y, z, rx = 0, ry = 0, rz = 0) => m.compose(p.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), one).clone();
  // local frame: origin at the site, rotated by the site yaw; compose child-in-site then site-in-world
  const siteM = new THREE.Matrix4();
  const local = (s, x, y, z, rx = 0, ry = 0, rz = 0) => siteM.clone().multiply(at(x, y, z, rx, ry, rz));

  for (const s of cell.sites) {
    const r = (n) => (((s.pick * 2654435761 + n * 40503) >>> 0) % 1000) / 1000; // deterministic 0..1 per site and slot
    const pickOf = (list, n) => list[Math.floor(r(n) * list.length) % list.length];
    siteM.compose(p.set(s.x, s.y, s.z), q.setFromEuler(e.set(0, s.yaw + (r(1) - 0.5) * 0.5, 0)), one);
    if (s.kind === 'tank') {
      const rad = 0.42 + r(2) * 0.18, h = 0.85 + r(3) * 0.35, base = 0.28;
      parts.concrete.push(box(rad * 2.5, base, rad * 2.5, '#b9b4aa', local(s, 0, base / 2, 0)));
      parts.metal.push(cyl(rad, rad * 1.04, h, pickOf(PLASTIC, 4), local(s, 0, base + h / 2, 0), 18));
      parts.metal.push(cyl(rad * 0.97, rad * 0.97, 0.04, '#171c20', local(s, 0, base + h + 0.02, 0), 18)); // lid
      parts.metal.push(cyl(rad * 0.3, rad * 0.3, 0.07, '#20262b', local(s, rad * 0.25, base + h + 0.07, 0.1), 10)); // hatch
      parts.metal.push(cyl(0.025, 0.025, 0.7, '#6f7478', local(s, rad + 0.02, base + 0.45, 0), 8)); // down pipe
    } else if (s.kind === 'antenna') {
      const mast = 2.0 + r(2) * 1.3, lean = (r(3) - 0.5) * 0.08, al = pickOf(ALU, 4);
      parts.metal.push(cyl(0.022, 0.025, mast, al, local(s, 0, mast / 2, 0, lean, 0, -lean), 8));
      parts.metal.push(box(0.5, 0.4, 0.5, '#8a8e91', local(s, 0, 0.2, 0))); // mounting block
      const rows = 3 + Math.floor(r(5) * 3);
      for (let i = 0; i < rows; i++) {
        const y = mast - 0.15 - i * 0.28, len = 1.1 - i * 0.12 + r(6 + i) * 0.1;
        parts.metal.push(box(0.012, 0.012, len, al, local(s, 0, y, 0, 0, 0, 0)));
        parts.metal.push(box(0.012, 0.012, len * 0.82, al, local(s, 0.14, y - 0.1, 0)));
      }
      parts.metal.push(box(0.012, 0.012, 1.0, al, local(s, 0, mast * 0.55, 0, 0, Math.PI / 2, 0))); // lower cross-boom
      parts.metal.push(cyl(0.01, 0.01, 1.6, '#4b4f52', local(s, 0.9, 0.7, 0.4, 0, 0, 0.4), 6)); // guy wire
    } else if (s.kind === 'dish') {
      const d = 0.34 + r(2) * 0.16, mast = 0.9 + r(3) * 0.8;
      parts.metal.push(cyl(0.03, 0.035, mast, '#8c9093', local(s, 0, mast / 2, 0), 8));
      const g = new THREE.SphereGeometry(d, 14, 8, 0, Math.PI * 2, 0, 0.9);
      prep(g, pickOf(DISH, 4), d * 2, d * 2);
      g.rotateX(-Math.PI / 2 + 0.55).applyMatrix4(local(s, 0, mast + d * 0.1, 0, 0, 0, 0));
      parts.metal.push(g);
      parts.metal.push(cyl(0.012, 0.012, d * 1.1, '#2a2d30', local(s, 0, mast + d * 0.55, d * 0.38, 0.55, 0, 0), 6)); // LNB arm
    } else if (s.kind === 'solar') {
      const w = 1.0 + r(2) * 0.5, l = 1.5 + r(3) * 0.5, tilt = 0.45 + r(4) * 0.15;
      parts.metal.push(box(w, 0.05, l, pickOf(PANEL, 5), local(s, 0, 0.55, 0, -tilt, 0, 0)));
      parts.metal.push(box(w + 0.06, 0.04, 0.05, '#aeb2b5', local(s, 0, 0.55 + Math.sin(tilt) * l / 2, -Math.cos(tilt) * l / 2 + 0.0, -tilt, 0, 0)));
      for (const sx of [-w * 0.42, w * 0.42]) parts.metal.push(box(0.04, 0.55, 0.04, '#7b7f82', local(s, sx, 0.27, l * 0.28)));
    } else { // brick stack
      const bw = 0.7 + r(2) * 0.3, rows = 3 + Math.floor(r(3) * 5);
      for (let i = 0; i < rows; i++) {
        const sh = (r(10 + i) - 0.5) * 0.05;
        parts.brick.push(box(bw, 0.1, 0.45, pickOf(BRICKS, 20 + i), local(s, sh, 0.05 + i * 0.1, sh, 0, (r(30 + i) - 0.5) * 0.08, 0)));
      }
    }
  }

  const group = new THREE.Group();
  group.name = cell.id;
  const mats = {
    metal: getTiledMaterial('metal', { vertexColors: true, roughness: 0.8 }),
    concrete: getTiledMaterial('concrete', { vertexColors: true }),
    brick: getTiledMaterial('brick', { vertexColors: true }),
  };
  for (const [name, list] of Object.entries(parts)) {
    if (!list.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(list, false), mats[name]);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData.mergedStatic = true;
    mesh.name = `roof_${name}`;
    group.add(mesh);
  }
  return group;
}
