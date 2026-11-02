/**
 * Zero milestone at the village square (docs/PARALLEL.md item 6, her 3 Nov playthrough item 8).
 *
 * A whitewashed plinth-and-pillar marker carrying the village name, with the Indian flag on the SAME flagpole the
 * school uses (createFlagpoleProp in src/props.js, not a second kind). Lime washed over brick and weathered, never
 * clean: earth-brown dirt at the foot, rain streaks running down from every top edge, plaster chipped off at the base
 * corners so the brick shows, a sun-faded ochre cap. Every surface is a library set by name (plaster, brick,
 * concrete); colour and weathering ride in vertex colour so it shares the library materials and costs 4 draw calls
 * plus the flagpole's one.
 *
 * Where: the map's square ('Village square', centre (1.9, 16.5), turn 5 deg in
 * docs/layout/village-plan-positions-2026-11-01.json, ANCHORS.chowk) is mostly the crossing of the main road and the
 * cross road. The marker stands in the open grass on the square's side of that junction (SW quadrant), 3.5 m from the
 * map's square centre, between the peepal chabutra and the main road kerb: seen from the main road both ways and the
 * cross road both ways (name on all four faces), and straight ahead from the opening spawn (604, 27).
 *
 * Board text follows the painted-board rule through src/signPaint.js drawBilingual: Hindi bold on top, English below.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getTiledMaterial, ensureUv2 } from './materials.js';
import { createFlagpoleProp } from './props.js';
import { drawBilingual } from './signPaint.js';
import { MAP_SHIFT } from './mapPlan.js';

/** Square-local position (map metres), turned with the square. World = + MAP_SHIFT. */
export const ZERO_MILESTONE_POS = { x: 2.9 + MAP_SHIFT.x, z: 19.9 + MAP_SHIFT.z, ry: (90 - 5) * Math.PI / 180 };

const HI = 'अमराई खेड़ा';
const EN = 'Amrai Kheda';

// Lime wash: warm off-white, never pure white (the matte shader also caps albedo at 0.9).
const LIME = new THREE.Color(0xd9d3c3);
const OCHRE = new THREE.Color(0xc9a25a); // sun-faded yellow-ochre cap
const DIRT = new THREE.Color(0x8a7558); // earth splash at the foot
const STAIN = new THREE.Color(0x6f6d60); // grey-green rain runoff

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };

/**
 * A segmented box, centred at (cx, cy, cz) in the marker's local frame, with UVs in metres / tile (planar per face,
 * continuous across neighbouring boxes) and weathering baked into vertex colour: a base tint with per-vertex blotch,
 * earth dirt rising from the ground, and rain streaks running down from the box's own top edge.
 */
function weatheredBox(w, h, d, cx, cy, cz, { tile, tint, seg = 0.07, streaks = 1, dirt = 1, seed = 1 }) {
  const g = new THREE.BoxGeometry(w, h, d, Math.max(1, Math.round(w / seg)), Math.max(2, Math.round(h / seg)), Math.max(1, Math.round(d / seg)));
  g.translate(cx, cy, cz);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  const col = new Float32Array(p.count * 3);
  const top = cy + h / 2;
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [u, v] = ay > 0.5 ? [x, z] : ax > 0.5 ? [z, y] : [x, y];
    uv.setXY(i, u / tile + seed * 0.37, v / tile + seed * 0.11);
    c.copy(tint);
    // Uneven lime: coats of different age.
    c.multiplyScalar(0.93 + 0.1 * vnoise((x + z) * 3.1 + y * 2.3 + seed * 7));
    // Earth splash: strong at the foot, a ragged upper edge.
    const edge = 0.22 + 0.3 * vnoise((x - z) * 6 + seed);
    const dirtK = dirt * Math.max(0, 1 - y / edge);
    c.lerp(DIRT, Math.min(0.7, dirtK * 0.9));
    // Rain streaks: columns hanging from this box's top edge, varied length and strength, only on vertical faces.
    if (ay < 0.5 && streaks > 0) {
      const along = ax > 0.5 ? z : x;
      const col01 = Math.max(0, vnoise(along * 9 + seed * 3.3) - 0.45) / 0.55;
      const len = 0.25 + 0.9 * vnoise(along * 4.1 + seed * 1.7);
      const fall = Math.max(0, 1 - (top - y) / len);
      c.lerp(STAIN, Math.min(0.55, streaks * col01 * Math.pow(fall, 0.7) * 0.8));
    }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g.index ? g.toNonIndexed() : g;
}

/**
 * Chipped plaster: an irregular patch where the lime has fallen away, as two flat jagged shapes laid a few mm proud
 * of a face: a grey under-coat rim (plaster set) and, inside it, the brick showing through (brick set). `face` is the
 * face's outward axis: 'x+', 'x-', 'z+', 'z-' at coordinate `f`; (u, v) is the patch centre along the face and up.
 * `foot` patches grow up from the ground line instead of floating.
 */
function chip(plaster, brick, r, face, f, u, v, rw, rh, foot = false) {
  // A simple (never self-crossing) jagged polygon: a full ragged ellipse, or for a foot patch the upper half of one
  // closed along the ground line.
  const outline = (scale, jag) => {
    const pts = [];
    const N = foot ? 10 : 15;
    for (let i = 0; i < (foot ? N + 1 : N); i++) {
      const a = (i / N) * (foot ? Math.PI : Math.PI * 2);
      const k = scale * (1 - jag / 2 + r() * jag);
      const y = foot && (i === 0 || i === N) ? 0 : Math.sin(a) * rh * k;
      pts.push(new THREE.Vector2(Math.cos(a) * rw * k, y));
    }
    return new THREE.Shape(pts);
  };
  const place = (geo, lift, tint, tile, seed) => {
    const p = geo.attributes.position;
    const uv = new Float32Array(p.count * 2), col = new Float32Array(p.count * 3), nrm = new Float32Array(p.count * 3);
    const [ax, sgn] = [face[0], face[1] === '+' ? 1 : -1];
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const pu = u + p.getX(i) * sgn * (ax === 'z' ? 1 : -1), pv = v + p.getY(i);
      if (ax === 'z') p.setXYZ(i, pu, pv, f + sgn * lift); else p.setXYZ(i, f + sgn * lift, pv, pu);
      uv[i * 2] = pu / tile + seed; uv[i * 2 + 1] = pv / tile;
      c.copy(tint).multiplyScalar(0.85 + 0.2 * vnoise(pu * 23 + pv * 17 + seed));
      c.lerp(DIRT, Math.max(0, 0.5 - pv * 1.6));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      nrm[i * 3] = ax === 'x' ? sgn : 0; nrm[i * 3 + 2] = ax === 'z' ? sgn : 0;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    // Mirroring u for the z- and x+ faces already turns the +Z shape to face outward on all four sides.
    const g = geo.index ? geo.toNonIndexed() : geo;
    return g;
  };
  plaster.push(place(new THREE.ShapeGeometry(outline(1.3, 0.6)), 0.003, new THREE.Color(0xaaa596), 1.5, 0.3));
  brick.push(place(new THREE.ShapeGeometry(outline(0.95, 0.7)), 0.005, new THREE.Color(0xa07a64), 0.8, r()));
}

function paintBoard(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const r = rng(77);
  // Whitewash a shade fresher than the pillar (the board gets a coat at Independence Day), still not white.
  ctx.fillStyle = '#dcd5c3';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) {
    const v = 200 + Math.floor(r() * 30);
    ctx.fillStyle = `rgba(${v},${v - 4},${v - 14},0.18)`;
    ctx.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 3);
  }
  // Painted border, faded charcoal.
  ctx.strokeStyle = 'rgba(52,48,42,0.85)';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  drawBilingual(ctx, HI, EN, { x: W / 2, y: 24, w: W - 52, h: H - 48, fg: '#2c2924', fillFraction: 0.86 });
  // Weathering over the paint: runoff streaks from the top, flaked spots, dust at the bottom edge.
  for (let i = 0; i < 14; i++) {
    const x = r() * W, len = H * (0.2 + r() * 0.6), w = 3 + r() * 10;
    const gr = ctx.createLinearGradient(0, 0, 0, len);
    gr.addColorStop(0, 'rgba(110,106,92,0.28)');
    gr.addColorStop(1, 'rgba(110,106,92,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(x, 0, w, len);
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(225,219,203,0.85)' : 'rgba(150,128,104,0.5)';
    ctx.beginPath();
    ctx.ellipse(r() * W, r() * H, 1 + r() * 5, 1 + r() * 3, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const dust = ctx.createLinearGradient(0, H * 0.7, 0, H);
  dust.addColorStop(0, 'rgba(140,118,88,0)');
  dust.addColorStop(1, 'rgba(140,118,88,0.3)');
  ctx.fillStyle = dust;
  ctx.fillRect(0, H * 0.7, W, H * 0.3);
}

export function createZeroMilestone(pos = ZERO_MILESTONE_POS) {
  const group = new THREE.Group();
  group.name = 'zero_milestone';
  const r = rng(4021);

  const plaster = [], brick = [], concrete = [];
  // Footing: a rough cement apron, slightly wider than the plinth, worn and dusty.
  concrete.push(weatheredBox(3.3, 0.08, 2.3, 0, 0.04, 0, { tile: 1.5, tint: new THREE.Color(0xaaa391), seg: 0.3, streaks: 0, dirt: 0.35, seed: 2 }));
  // Two-step plinth and the pillar, lime over brick.
  const s1 = { w: 3.0, h: 0.3, d: 2.0, y: 0.08 };
  const s2 = { w: 2.3, h: 0.26, d: 1.45, y: s1.y + s1.h };
  const deck = s2.y + s2.h;
  plaster.push(weatheredBox(s1.w, s1.h, s1.d, 0, s1.y + s1.h / 2, 0, { tile: 1.5, tint: LIME.clone().multiplyScalar(0.96), seg: 0.15, streaks: 0.7, dirt: 1.2, seed: 3 }));
  plaster.push(weatheredBox(s2.w, s2.h, s2.d, 0, s2.y + s2.h / 2, 0, { tile: 1.5, tint: LIME, seg: 0.14, streaks: 0.8, dirt: 0.6, seed: 5 }));
  const P = { w: 0.8, h: 1.6, x: -0.5 };
  plaster.push(weatheredBox(P.w, P.h, P.w, P.x, deck + P.h / 2, 0, { tile: 1.5, tint: LIME, seg: 0.08, streaks: 1, dirt: 0.4, seed: 7 }));
  // Cap: a projecting ochre band and a low pyramid, the milestone's painted top.
  const capY = deck + P.h;
  plaster.push(weatheredBox(0.92, 0.1, 0.92, P.x, capY + 0.045, 0, { tile: 1.5, tint: OCHRE.clone().lerp(LIME, 0.15), seg: 0.06, streaks: 0.6, dirt: 0, seed: 9 }));
  const pyr = new THREE.ConeGeometry(0.62, 0.3, 4, 3).rotateY(Math.PI / 4).translate(P.x, capY + 0.1 + 0.15, 0).toNonIndexed();
  {
    const pp = pyr.attributes.position, pc = new Float32Array(pp.count * 3), c = new THREE.Color();
    for (let i = 0; i < pp.count; i++) {
      c.copy(OCHRE).multiplyScalar(0.9 + 0.12 * vnoise(pp.getX(i) * 11 + pp.getZ(i) * 7) - 0.08 * (pp.getY(i) - capY));
      pc[i * 3] = c.r; pc[i * 3 + 1] = c.g; pc[i * 3 + 2] = c.b;
    }
    pyr.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    const uv = pyr.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.4, uv.getY(i) * 0.2);
    plaster.push(pyr);
  }
  // Chipped base: plaster gone at the step corners and along the bottom of the lower step, brick showing.
  const hw1 = s1.w / 2, hd1 = s1.d / 2, hw2 = s2.w / 2, hd2 = s2.d / 2;
  // Foot of the lower step (bumped by cycles and carts, splashed every monsoon), the lower-step corners, a couple on
  // the upper step and one low on the pillar.
  chip(plaster, brick, r, 'z+', hd1, -hw1 + 0.32, s1.y, 0.3, 0.17, true);
  chip(plaster, brick, r, 'z+', hd1, 0.55, s1.y, 0.18, 0.11, true);
  chip(plaster, brick, r, 'x+', hw1, 0.6, s1.y, 0.26, 0.15, true);
  chip(plaster, brick, r, 'x+', hw1, -hd1 + 0.2, s1.y + 0.17, 0.12, 0.08);
  chip(plaster, brick, r, 'z-', -hd1, 0.9, s1.y, 0.34, 0.18, true);
  chip(plaster, brick, r, 'z-', -hd1, -1.05, s1.y + 0.18, 0.13, 0.07);
  chip(plaster, brick, r, 'x-', -hw1, -0.35, s1.y, 0.22, 0.14, true);
  chip(plaster, brick, r, 'z+', hd2, hw2 - 0.2, s2.y + 0.13, 0.11, 0.07);
  chip(plaster, brick, r, 'x-', -hw2, 0.4, s2.y + 0.1, 0.1, 0.06);
  chip(plaster, brick, r, 'z+', P.w / 2, P.x + 0.27, deck + 0.12, 0.09, 0.07);

  const merge = (geos, name, mat) => {
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  merge(plaster, 'zero_milestone_lime', getTiledMaterial('plaster', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
  merge(brick, 'zero_milestone_brick', getTiledMaterial('brick', { repeatX: 1, repeatY: 1, roughness: 0.95, vertexColors: true }));
  const conc = merge(concrete, 'zero_milestone_apron', getTiledMaterial('concrete', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
  ensureUv2(conc.geometry);
  conc.castShadow = false;

  // Name board painted on all four faces of the pillar, a few mm proud. One canvas, one material, one draw call;
  // the library plaster normal + roughness maps sit under the paint so it reads as paint on lime, not a sticker.
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 448;
  paintBoard(canvas);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const lime = getTiledMaterial('plaster', { repeatX: 1, repeatY: 1 });
  const boardMat = new THREE.MeshStandardMaterial({ map: tex, normalMap: lime.normalMap, roughnessMap: lime.roughnessMap, roughness: 1, normalScale: new THREE.Vector2(0.8, 0.8) });
  const bw = P.w - 0.06, bh = 0.64;
  const boardY = deck + P.h - 0.2 - bh / 2;
  const boards = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const pg = new THREE.PlaneGeometry(bw, bh);
    pg.translate(0, 0, P.w / 2 + 0.003);
    pg.rotateY(a);
    pg.translate(P.x, boardY, 0);
    boards.push(pg);
  }
  const boardMesh = new THREE.Mesh(mergeGeometries(boards), boardMat);
  boardMesh.name = 'zero_milestone_board';
  boardMesh.receiveShadow = true;
  group.add(boardMesh);
  // The webfont may still be loading at build time: repaint once it is in, so the Devanagari never falls back.
  if (document.fonts) {
    document.fonts.load('700 40px "Noto Sans Devanagari"').then(() => document.fonts.ready).then(() => { paintBoard(canvas); tex.needsUpdate = true; }).catch(() => {});
  }

  // The flag: the village's one flagpole kind, stood on the upper step beside the pillar, flag flying away from it.
  const flag = createFlagpoleProp({ x: 0.62, z: 0.05 });
  flag.position.y = deck;
  flag.rotation.y = Math.PI / 2; // flag flies west across the grass: broadside to the main road and the spawn, not edge-on
  flag.name = 'zero_milestone_flagpole';
  group.add(flag);

  // Collider: the whole plinth footprint (the player cannot climb a 0.66 m plinth; the flagpole carries its own).
  const col = new THREE.Mesh(new THREE.BoxGeometry(s1.w + 0.1, deck, s1.d + 0.1));
  col.position.set(0, deck / 2, 0);
  col.visible = false;
  col.userData.collider = true;
  col.name = 'zero_milestone_collider';
  group.add(col);

  group.position.set(pos.x, 0, pos.z);
  group.rotation.y = pos.ry;
  return group;
}
