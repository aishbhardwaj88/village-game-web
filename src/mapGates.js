/**
 * The 1 Nov map's gateway furniture (docs/layout/village-plan-positions-2026-11-01.json `rules`): a "To the city" board at each
 * end of the highway (the world edge), and a pair of low posts at the mouth of every back lane (walking and cycles only).
 * Positions come from the map's own polylines at the shared MAP_SHIFT, so a map change moves them. Painted text follows the
 * signboard rule (src/signPaint.js: Hindi bold on top, English below). One wood material, one merged mesh, explicit colliders.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MAP_SHIFT } from './mapPlan.js';
import { drawBilingual } from './signPaint.js';
import MAP from '../docs/layout/village-plan-positions-2026-11-01.json';
import { isNewLayout, getRoads } from './layout/layout.js';
import { nearestRoad } from './layout/layoutCore.js';

// 25 Nov, her order (roads empty): ~22 gate posts and both highway boards stood 0 to 0.2 m inside ring_road / highway (their old-plan spots).
// Each is nudged straight away from the nearest road until it clears the band and its drawn apron by ROAD_MARGIN; if that takes more than
// MAX_NUDGE it is dropped (a constant, so reversible: set GATES_KEEP_OLD_SPOTS true to restore every old spot).
const GATES_KEEP_OLD_SPOTS = false;
const ROAD_MARGIN = 0.9; // m from the flat road band to the item's edge (0.3 m past the drawn edge wander and scuffed apron start)
const MAX_NUDGE = 6;
/** Returns { x, z } moved clear of the road (item radius r), or null when it cannot be moved legally. */
export function clearOfRoad(x, z, r) {
  if (GATES_KEEP_OLD_SPOTS || !isNewLayout()) return { x, z };
  const roads = getRoads();
  let px = x, pz = z;
  for (let it = 0; it < 6; it++) {
    const n = nearestRoad(roads, px, pz);
    if (!n || n.edge >= r + ROAD_MARGIN) return Math.hypot(px - x, pz - z) <= MAX_NUDGE ? { x: px, z: pz } : null;
    let dx = px - n.qx, dz = pz - n.qz, d = Math.hypot(dx, dz);
    if (d < 1e-3) { dx = -n.uz; dz = n.ux; d = 1; }
    const k = (r + ROAD_MARGIN - n.edge + 0.05) / d;
    px += dx * k; pz += dz * k;
  }
  return null;
}

const INK = '#4a1c1c';
const PAPER = '#efe4c8';
const BOARD_W = 3.0;
const BOARD_H = 0.9;
const POST_H = 3.0;

const shifted = ([x, z]) => ({ x: x + MAP_SHIFT.x, z: z + MAP_SHIFT.z });

/** The two highway ends: { x, z, ry } beside the carriageway, board facing back along the road toward the village. */
export function highwayEndBoards() {
  const { centreline, width_m: w } = MAP.roads.highway;
  const first = shifted(centreline[0]), second = shifted(centreline[1]);
  const last = shifted(centreline[centreline.length - 1]), prev = shifted(centreline[centreline.length - 2]);
  const at = (end, inner) => {
    const dx = inner.x - end.x, dz = inner.z - end.z, len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len; // unit vector pointing into the village
    const off = w / 2 + 1.6;
    // stand north of the road (-z), a few metres in from the edge; the face normal is the inward direction
    return { x: end.x + ux * 6, z: end.z + uz * 6 - off, ry: Math.atan2(ux, uz) };
  };
  return [at(first, second), at(last, prev)];
}

/** Back-lane mouths: both ends of every back lane, a post either side of the lane, { x, z } in world metres. */
export function backLanePosts() {
  const posts = [];
  for (const l of MAP.lanes_and_tracks) {
    if (l.type !== 'back lane') continue;
    const c = l.centreline.map(shifted);
    for (const [end, inner] of [[c[0], c[1]], [c[c.length - 1], c[c.length - 2]]]) {
      const dx = inner.x - end.x, dz = inner.z - end.z, len = Math.hypot(dx, dz);
      const nx = -dz / len, nz = dx / len; // lane's side
      const half = l.width_m / 2 + 0.25;
      posts.push({ x: end.x + nx * half, z: end.z + nz * half }, { x: end.x - nx * half, z: end.z - nz * half });
    }
  }
  return posts;
}

function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#7a5a3a';
  g.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '40,25,12' : '190,150,100'},${0.05 + Math.random() * 0.12})`;
    g.fillRect(Math.random() * 128, Math.random() * 512, 1 + Math.random() * 3, 40 + Math.random() * 200);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export async function createMapGates() {
  try { await document.fonts.load('700 40px "Noto Sans Devanagari"'); await document.fonts.ready; } catch { /* system font */ }
  const group = new THREE.Group();
  group.name = 'map_gates';
  const colliders = [];
  const box = (x, z, w, d) => ({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

  // --- wood parts, one material ---
  const wood = [];
  const add = (g, m) => { wood.push((g.index ? g.toNonIndexed() : g).applyMatrix4(m)); };
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.95 });
  woodMat.name = 'map_gates_wood';

  // "To the city" boards
  const bc = document.createElement('canvas');
  bc.width = 1536; bc.height = 460;
  const bg = bc.getContext('2d');
  bg.fillStyle = PAPER;
  bg.fillRect(0, 0, bc.width, bc.height);
  for (let i = 0; i < 120; i++) {
    bg.fillStyle = `rgba(110,80,40,${0.015 + Math.random() * 0.03})`;
    bg.fillRect(Math.random() * bc.width, Math.random() * bc.height, 40 + Math.random() * 140, 2 + Math.random() * 7);
  }
  bg.strokeStyle = INK; bg.lineWidth = 14;
  bg.strokeRect(14, 14, bc.width - 28, bc.height - 28);
  drawBilingual(bg, 'शहर की ओर', 'To the city', { x: bc.width / 2, y: 40, w: bc.width - 160, h: bc.height - 80, fg: INK });
  const faceTex = new THREE.CanvasTexture(bc);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.anisotropy = 8;
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.9 });
  faceMat.name = 'map_gates_board';
  const faces = [];

  for (const p0 of highwayEndBoards()) {
    const p = { ...p0, ...(clearOfRoad(p0.x, p0.z, BOARD_W / 2) || { dropped: true }) };
    if (p.dropped) continue; // removed 25 Nov: stood on road, her order
    const m = new THREE.Matrix4().makeRotationY(p.ry).setPosition(p.x, 0, p.z);
    const leg = (dx) => { const g = new THREE.BoxGeometry(0.16, POST_H, 0.16); g.translate(dx, POST_H / 2, 0); add(g, m); };
    leg(-BOARD_W / 2 + 0.1); leg(BOARD_W / 2 - 0.1);
    const slab = new THREE.BoxGeometry(BOARD_W + 0.2, BOARD_H + 0.2, 0.07);
    slab.translate(0, POST_H - 0.7, 0);
    add(slab, m);
    const face = new THREE.PlaneGeometry(BOARD_W, BOARD_H);
    face.translate(0, POST_H - 0.7, 0.045);
    faces.push(face.applyMatrix4(m));
    colliders.push(box(p.x, p.z, BOARD_W * Math.abs(Math.cos(p.ry)) + 0.3 * Math.abs(Math.sin(p.ry)) + 0.2, BOARD_W * Math.abs(Math.sin(p.ry)) + 0.3 * Math.abs(Math.cos(p.ry)) + 0.2));
  }

  // back-lane mouth posts: a short squared post with a chamfer-free cap, varied height
  backLanePosts().forEach((p0, i) => {
    const p = clearOfRoad(p0.x, p0.z, 0.12);
    if (!p) return; // removed 25 Nov: stood on road, her order
    const h = 0.95 + ((i * 37) % 11) / 100;
    const g = new THREE.BoxGeometry(0.14, h, 0.14);
    g.translate(0, h / 2, 0);
    add(g, new THREE.Matrix4().makeRotationY(((i * 53) % 17) / 40).setPosition(p.x, 0, p.z));
    colliders.push(box(p.x, p.z, 0.2, 0.2));
  });

  const woodMesh = new THREE.Mesh(mergeGeometries(wood, false), woodMat);
  woodMesh.name = 'map_gates_wood';
  woodMesh.castShadow = false;
  woodMesh.receiveShadow = true;
  woodMesh.userData.colliderBoxes = colliders;
  group.add(woodMesh);
  const faceMesh = new THREE.Mesh(mergeGeometries(faces, false), faceMat);
  faceMesh.name = 'map_gates_faces';
  faceMesh.receiveShadow = true;
  group.add(faceMesh);
  return group;
}
