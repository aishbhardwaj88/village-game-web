/**
 * Diegetic wayfinding (docs/BACKLOG.md A-2c): painted direction signposts at lane junctions and a painted village notice board
 * at the chowk. Every destination, arrow side, compass word and distance is computed from PLACES (src/freeRoam.js, the one
 * placement list the map and Visit-place menu also read), so moving a place re-labels the signs by itself. Only the posts'
 * own x,z are written here. Signboard rule (CLAUDE.md 7, FINAL 25 Oct): Hindi on top, bold and larger; English below, not
 * bold, smaller but legible (src/signPaint.js); both in the same dark paint on a pale board.
 *
 * Draw cost: one material (wood grain, boards and notice share the atlas), one merged mesh (2 calls with shadow). Colliders are explicit boxes.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PLACES } from './freeRoam.js';
import { drawBilingual, hiFont, enFont } from './signPaint.js';

const CELL_W = 1024;
const CELL_H = 256;
const COLS = 2;
const ROWS = 20; // rows 0-15: 32 direction-board cells; rows 16-19: notice board (col 0) and wood grain (col 1)
const BOARD_ROWS = 16;
const BOARD_W = 1.5;
const BOARD_H = BOARD_W * (CELL_H / CELL_W);
const INK = '#4a1c1c';
const PAPER = '#efe4c8';

/**
 * Signposts. `ry` is the way the boards face (their normal is (sin ry, cos ry)); `to` lists PLACES ids top to bottom.
 * Positions sit beside the lane, clear of the carriageway.
 */
const SIGNPOSTS = [
  { id: 'house_gate', x: -54.5, z: 49.5, ry: Math.PI, to: ['school', 'bazaar', 'temple', 'teastall'] },
  { id: 'temple_fork', x: -12, z: 58.5, ry: -Math.PI / 2, to: ['temple', 'canal', 'house', 'baagh', 'field'] },
  { id: 'east_gali', x: -2.6, z: 76.7, ry: -Math.PI / 2, to: ['highway', 'health', 'haveli', 'gurukul'] },
  { id: 'east_far_a', x: 35, z: 73.5, ry: -Math.PI / 2, to: ['tvhouse', 'chemist', 'manihari', 'sabzi', 'johad'] },
  { id: 'east_far_b', x: 75, z: 73.5, ry: -Math.PI / 2, to: ['masjid', 'jain', 'maidan', 'highway'] },
  { id: 'school_lane', x: -41.5, z: 98, ry: Math.PI, to: ['school', 'anganwadi', 'gurudwara', 'mela', 'cane'] },
  { id: 'west_gali', x: -82.5, z: 41, ry: Math.PI, to: ['pond', 'dairy', 'jalebi', 'gaushala'] },
  // Lane head: the west gali ends at (-84,21) with jalebi 26 m and gaushala 69 m beyond it; faces south for walkers arriving up the lane.
  { id: 'west_gali_head', x: -82.3, z: 24, ry: 0, to: ['jalebi', 'gaushala'] },
];

const NOTICE = { x: -49.2, z: 8.5, ry: -Math.PI / 2 };
const NOTICE_LIST = ['school', 'bazaar', 'post', 'temple', 'canal', 'field', 'highway', 'mandi'];

const byId = (id) => PLACES.find((p) => p.id === id);

function compass(dx, dz) {
  const a = (Math.atan2(dx, -dz) * 180) / Math.PI; // 0 = north (-z), 90 = east
  const names = [['N', 'उत्तर'], ['NE', 'उत्तर-पूर्व'], ['E', 'पूर्व'], ['SE', 'दक्षिण-पूर्व'], ['S', 'दक्षिण'], ['SW', 'दक्षिण-पश्चिम'], ['W', 'पश्चिम'], ['NW', 'उत्तर-पश्चिम']];
  return names[Math.round((((a % 360) + 360) % 360) / 45) % 8];
}

function drawArrow(ctx, cx, cy, dir) {
  // dir: 1 = points right, -1 = left, 0 = straight ahead (up)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(dir === 0 ? -Math.PI / 2 : dir === -1 ? Math.PI : 0);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-70, -22);
  ctx.lineTo(10, -22);
  ctx.lineTo(10, -58);
  ctx.lineTo(80, 0);
  ctx.lineTo(10, 58);
  ctx.lineTo(10, 22);
  ctx.lineTo(-70, 22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBoardCell(ctx, ox, oy, post, place) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(ox, oy, CELL_W, CELL_H);
  // faint hand-painted weathering so the board is not a flat fill
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(110,80,40,${0.015 + Math.random() * 0.03})`;
    ctx.fillRect(ox + Math.random() * CELL_W, oy + Math.random() * CELL_H, 30 + Math.random() * 90, 2 + Math.random() * 6);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.strokeRect(ox + 8, oy + 8, CELL_W - 16, CELL_H - 16);

  const dx = place.x - post.x;
  const dz = place.z - post.z;
  const dist = Math.hypot(dx, dz);
  const fx = Math.sin(post.ry);
  const fz = Math.cos(post.ry);
  const vx = -fx; // viewer looks against the board's normal
  const vz = -fz;
  const side = dx * -vz + dz * vx; // viewer's right = (-vz, vx)
  const ahead = dx * vx + dz * vz;
  const dir = Math.abs(side) < Math.abs(ahead) * 0.45 && ahead > 0 ? 0 : side >= 0 ? 1 : -1;

  const arrowOnRight = dir !== -1;
  const arrowX = ox + (arrowOnRight ? CELL_W - 110 : 110);
  drawArrow(ctx, arrowX, oy + CELL_H / 2, dir);
  const textX = ox + (arrowOnRight ? 50 : 215);
  // Place name: Hindi bold on top, English below (src/signPaint.js); the distance sits under them in the same ink.
  const textW = 700;
  drawBilingual(ctx, place.hi, place.en, { x: textX, y: oy + 14, w: textW, h: 176, fg: INK, align: 'left', fillFraction: 0.98 });
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.font = enFont(38);
  ctx.fillText(`${Math.round(dist / 5) * 5} m`, textX, oy + 232);
}

function cellGeometry(w, h, cell) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  const col = cell % COLS;
  const row = Math.floor(cell / COLS);
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (col + uv.getX(i)) / COLS, 1 - (row + 1 - uv.getY(i)) / ROWS);
  }
  return g;
}

function drawNotice(ctx, ox, oy) {
  const W = CELL_W;
  const H = CELL_W;
  ctx.fillStyle = PAPER;
  ctx.fillRect(ox, oy, W, H);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(110,80,40,${0.015 + Math.random() * 0.03})`;
    ctx.fillRect(ox + Math.random() * W, oy + Math.random() * H, 40 + Math.random() * 120, 2 + Math.random() * 7);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 12;
  ctx.strokeRect(ox + 10, oy + 10, W - 20, H - 20);
  drawBilingual(ctx, 'गाँव की सूचना', 'Village Notice Board', { x: ox + W / 2, y: oy + 24, w: W - 140, h: 140, fg: INK });
  ctx.fillRect(ox + 70, oy + 172, W - 140, 5);
  NOTICE_LIST.map(byId).filter(Boolean).forEach((p, i) => {
    const y = oy + 232 + i * 98;
    const [cEn, cHi] = compass(p.x - NOTICE.x, p.z - NOTICE.z);
    const dist = Math.round(Math.hypot(p.x - NOTICE.x, p.z - NOTICE.z) / 5) * 5;
    // each row: Hindi place name bold on top, English below (src/signPaint.js), compass + distance on the right
    ctx.fillStyle = INK;
    drawBilingual(ctx, p.hi, p.en, { x: ox + 60, y: y - 52, w: W * 0.58, h: 96, fg: INK, align: 'left', fillFraction: 1 });
    ctx.textAlign = 'right';
    ctx.font = hiFont(32);
    ctx.fillText(cHi, ox + W - 60, y - 8);
    ctx.font = enFont(40);
    ctx.fillText(`${cEn}  ${dist} m`, ox + W - 60, y + 40);
  });
}

/** Remap a geometry's 0-1 UVs into a pixel rectangle of the shared atlas. */
function regionUV(g, x, y, w, h, atlasW, atlasH) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * w) / atlasW, 1 - (y + (1 - uv.getY(i)) * h) / atlasH);
  return g;
}

function drawWoodGrain(ctx, x, y, w, h) {
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 700; i++) {
    const shade = Math.random() < 0.5 ? '40,25,12' : '190,150,100';
    ctx.fillStyle = `rgba(${shade},${0.05 + Math.random() * 0.12})`;
    ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 1 + Math.random() * 3, 60 + Math.random() * 260);
  }
}

export async function createWayfinding() {
  try {
    await document.fonts.load('700 40px "Noto Sans Devanagari"');
    await document.fonts.ready;
  } catch { /* fall back to the system font */ }

  const group = new THREE.Group();
  group.name = 'wayfinding';

  const AW = CELL_W * COLS;
  const AH = CELL_H * ROWS;
  const atlas = document.createElement('canvas');
  atlas.width = AW;
  atlas.height = AH;
  const actx = atlas.getContext('2d');
  const woodRect = [CELL_W, CELL_H * BOARD_ROWS, CELL_W, CELL_H * 2];
  drawWoodGrain(actx, ...woodRect);
  const noticeRect = [0, CELL_H * BOARD_ROWS, CELL_W, CELL_W];
  drawNotice(actx, noticeRect[0], noticeRect[1]);
  const woodUV = (g) => regionUV(g, ...woodRect, AW, AH);

  const atlasTex = new THREE.CanvasTexture(atlas);
  atlasTex.colorSpace = THREE.SRGBColorSpace;
  atlasTex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: atlasTex, roughness: 0.9 });
  mat.name = 'wayfinding'; // validator check 5 samples this name so the post colliders are checked against real geometry

  // Every post merges into ONE mesh (one draw call, +1 in the shadow pass): the hero-zone view sits at the 150-call ceiling.
  const allGeos = [];
  const allColliders = [];
  const addPost = (name, geos, x, z, colliders) => {
    allGeos.push(...geos.map((g) => (g.index ? g.toNonIndexed() : g)));
    allColliders.push(...colliders);
  };
  const colliderRect = (x, z, w, d) => ({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

  let cell = 0;
  for (const post of SIGNPOSTS) {
    const places = post.to.map(byId).filter(Boolean);
    if (!places.length) continue;
    const postH = 3.1;
    const m = new THREE.Matrix4().makeRotationY(post.ry).setPosition(post.x, 0, post.z);
    const geos = [];
    const pole = new THREE.BoxGeometry(0.14, postH, 0.14);
    pole.translate(0, postH / 2, 0);
    geos.push(woodUV(pole).applyMatrix4(m));
    const cap = new THREE.BoxGeometry(0.22, 0.06, 0.22);
    cap.translate(0, postH + 0.03, 0);
    geos.push(woodUV(cap).applyMatrix4(m));
    places.forEach((place, i) => {
      if (cell >= COLS * BOARD_ROWS) return;
      drawBoardCell(actx, (cell % COLS) * CELL_W, Math.floor(cell / COLS) * CELL_H, post, place);
      const y = postH - 0.28 - i * (BOARD_H + 0.07);
      const slab = new THREE.BoxGeometry(BOARD_W + 0.06, BOARD_H + 0.06, 0.05);
      slab.translate(0, y, 0.1);
      geos.push(woodUV(slab).applyMatrix4(m));
      const face = cellGeometry(BOARD_W, BOARD_H, cell);
      face.translate(0, y, 0.13);
      geos.push(face.applyMatrix4(m));
      cell += 1;
    });
    addPost(`wayfinding_${post.id}`, geos, post.x, post.z, [colliderRect(post.x, post.z, 0.3, 0.3)]);
  }

  // Chowk notice board: a framed, roofed board on two legs.
  {
    const bw = 1.7;
    const m = new THREE.Matrix4().makeRotationY(NOTICE.ry).setPosition(NOTICE.x, 0, NOTICE.z);
    const geos = [];
    const face = regionUV(new THREE.PlaneGeometry(bw, bw), ...noticeRect, AW, AH);
    face.translate(0, 1.9, 0.045);
    geos.push(face.applyMatrix4(m));
    const wood = (g, x, y, z) => { g.translate(x, y, z); geos.push(woodUV(g).applyMatrix4(m)); };
    wood(new THREE.BoxGeometry(bw + 0.12, bw + 0.12, 0.07), 0, 1.9, 0);
    wood(new THREE.BoxGeometry(0.12, 1.2, 0.12), -bw / 2 + 0.1, 0.6, 0);
    wood(new THREE.BoxGeometry(0.12, 1.2, 0.12), bw / 2 - 0.1, 0.6, 0);
    wood(new THREE.BoxGeometry(bw + 0.4, 0.07, 0.34), 0, 1.9 + bw / 2 + 0.14, 0.1);
    addPost('wayfinding_notice', geos, NOTICE.x, NOTICE.z, [colliderRect(NOTICE.x, NOTICE.z, 0.4, bw)]);
  }
  const mesh = new THREE.Mesh(mergeGeometries(allGeos, false), mat);
  mesh.name = 'wayfinding_signs';
  mesh.castShadow = false; // thin/small prop: its shadow pass cost a call at the hero-zone ceiling
  mesh.receiveShadow = true;
  mesh.userData.colliderBoxes = allColliders;
  group.add(mesh);
  atlasTex.needsUpdate = true;
  return group;
}
